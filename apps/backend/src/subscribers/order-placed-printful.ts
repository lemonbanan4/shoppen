import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { getOrderDetailWorkflow } from "@medusajs/medusa/core-flows";
import { PrintfulClient } from "../lib/printful-client";
import { channelNameForOrder } from "../lib/brand-sender";

export default async function orderPlacedPrintfulHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);

  // Which shop sold this decides which Printful store fulfils it. Each brand
  // has its own store holding its own sync variants, so sending a Solkast
  // order to Ångerköp's store submits ids that store has never seen.
  const channel = await channelNameForOrder(container, data.id);
  const client = PrintfulClient.forChannelName(channel);
  if (!client) {
    return;
  }

  try {
    const query = container.resolve(ContainerRegistrationKeys.QUERY);

    const { result: order } = await getOrderDetailWorkflow(container).run({
      input: {
        order_id: data.id,
        fields: [
          "id",
          "display_id",
          "email",
          "metadata",
          "items.*",
          "shipping_address.*",
        ],
      },
    });

    const variantIds = (order.items || [])
      .map((item: any) => item.variant_id)
      .filter(Boolean);
    if (!variantIds.length) {
      return;
    }

    const { data: variants } = await query.graph({
      entity: "variant",
      fields: ["id", "metadata", "product.metadata"],
      filters: { id: variantIds },
    });
    const variantById = new Map(variants.map((v: any) => [v.id, v]));

    const lineItems = (order.items || [])
      .map((item: any) => {
        const variant = variantById.get(item.variant_id);
        const printfulVariantId = variant?.metadata?.printful_variant_id;
        const fulfillment = variant?.product?.metadata?.fulfillment;
        if (!printfulVariantId || fulfillment !== "printful") {
          return null;
        }
        return {
          sync_variant_id: Number(printfulVariantId),
          quantity: item.quantity,
        };
      })
      .filter(Boolean) as { sync_variant_id: number; quantity: number }[];

    if (!lineItems.length) {
      return;
    }

    const addr = order.shipping_address;
    if (!addr) {
      logger.error(
        `Printful: order ${order.display_id} has POD items but no shipping address — submit manually.`
      );
      return;
    }

    const autoConfirm = process.env.PRINTFUL_AUTO_PRODUCTION === "true";
    const { id: printfulOrderId } = await client.createOrder(
      {
        external_id: order.id,
        recipient: {
          name: `${addr.first_name || ""} ${addr.last_name || ""}`.trim(),
          email: order.email || "",
          phone: addr.phone || "",
          address1: addr.address_1 || "",
          address2: addr.address_2 || "",
          city: addr.city || "",
          state_code: addr.province || "",
          country_code: (addr.country_code || "").toUpperCase(),
          zip: addr.postal_code || "",
        },
        items: lineItems,
      },
      autoConfirm
    );

    logger.info(
      `Printful: order #${order.display_id} submitted (${lineItems.length} item(s), Printful order ${printfulOrderId}${
        autoConfirm ? ", sent to production" : " as draft"
      }).`
    );

    // Keep a pointer on the Medusa order for support lookups. Order-level
    // metadata updates are not merged by the order module (only line-item
    // metadata is), so an order containing both Printify and Printful items
    // would have one subscriber's write clobber the other's unless we merge
    // the existing metadata ourselves before writing.
    try {
      const orderModuleService = container.resolve(Modules.ORDER);
      await orderModuleService.updateOrders([
        {
          id: order.id,
          metadata: {
            ...(order.metadata || {}),
            printful_order_id: printfulOrderId,
          },
        },
      ]);
    } catch (metaErr: any) {
      logger.warn(
        `Printful: could not store printful_order_id on order ${order.display_id}: ${metaErr.message}`
      );
    }
  } catch (e: any) {
    logger.error(`Printful: failed to submit order ${data.id}: ${e.message}`);
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
};
