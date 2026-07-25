import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { getOrderDetailWorkflow } from "@medusajs/medusa/core-flows";
import { PrintifyClient } from "../lib/printify-client";

/**
 * Forwards paid orders containing Printify products to Printify for
 * fulfillment. Orders are created as drafts in Printify so you can review
 * them; set PRINTIFY_AUTO_PRODUCTION=true to send them straight to print.
 */
export default async function orderPlacedPrintifyHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);

  const client = PrintifyClient.fromEnv();
  if (!client) {
    return; // Printify not configured — nothing to do.
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
        const printifyVariantId = variant?.metadata?.printify_variant_id;
        const printifyProductId = variant?.product?.metadata
          ?.printify_product_id as string | undefined;
        const fulfillment = variant?.product?.metadata?.fulfillment;
        if (
          !printifyVariantId ||
          !printifyProductId ||
          fulfillment !== "printify"
        ) {
          return null;
        }
        return {
          product_id: printifyProductId,
          variant_id: Number(printifyVariantId),
          quantity: item.quantity,
        };
      })
      .filter(Boolean) as {
      product_id: string;
      variant_id: number;
      quantity: number;
    }[];

    if (!lineItems.length) {
      return; // No print-on-demand items in this order.
    }

    const addr = order.shipping_address;
    if (!addr) {
      logger.error(
        `Printify: order ${order.display_id} has POD items but no shipping address — submit manually.`
      );
      return;
    }

    const shopId = await client.resolveShopId();
    const { id: printifyOrderId } = await client.createOrder(shopId, {
      external_id: order.id,
      label: `Solkast #${order.display_id}`,
      line_items: lineItems,
      shipping_method: 1,
      send_shipping_notification: false,
      address_to: {
        first_name: addr.first_name || "",
        last_name: addr.last_name || "",
        email: order.email || "",
        phone: addr.phone || "",
        country: (addr.country_code || "").toUpperCase(),
        region: addr.province || "",
        address1: addr.address_1 || "",
        address2: addr.address_2 || "",
        city: addr.city || "",
        zip: addr.postal_code || "",
      },
    });

    logger.info(
      `Printify: order #${order.display_id} submitted (${lineItems.length} item(s), Printify order ${printifyOrderId}).`
    );

    if (process.env.PRINTIFY_AUTO_PRODUCTION === "true") {
      await client.sendToProduction(shopId, printifyOrderId);
      logger.info(
        `Printify: order #${order.display_id} sent to production automatically.`
      );
    }

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
            printify_order_id: printifyOrderId,
            printify_shop_id: shopId,
          },
        },
      ]);
    } catch (metaErr: any) {
      logger.warn(
        `Printify: could not store printify_order_id on order ${order.display_id}: ${metaErr.message}`
      );
    }
  } catch (e: any) {
    // Never let fulfillment forwarding break order processing — log loudly
    // so the order can be submitted manually from the Printify dashboard.
    logger.error(`Printify: failed to submit order ${data.id}: ${e.message}`);
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
};
