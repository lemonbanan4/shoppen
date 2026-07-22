import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { PrintifyClient } from "../../../lib/printify-client";
import { recordShipment } from "../../../lib/record-shipment";

/**
 * Printify shipment webhook. Registered by setup-fulfillment-webhooks.ts as
 * /hooks/printify?token=PRINTIFY_WEBHOOK_TOKEN.
 *
 * The payload is treated as untrusted: only the order id is read from it, and
 * the order (including its external_id back-reference to the Medusa order and
 * its shipments) is refetched from Printify's API, so a forged request cannot
 * inject tracking data.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const expectedToken = process.env.PRINTIFY_WEBHOOK_TOKEN;
  const client = PrintifyClient.fromEnv();
  if (!expectedToken || !client) {
    res.status(404).json({ message: "Not configured" });
    return;
  }
  if (req.query.token !== expectedToken) {
    res.status(401).json({ message: "Invalid token" });
    return;
  }

  // Always 200 fast — suppliers retry on failure, and our failures are
  // logged, not something a retry from their side would fix.
  res.status(200).json({ received: true });

  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER);
  try {
    const body = req.body as {
      type?: string;
      resource?: { id?: string };
    };
    if (body?.type !== "order:shipment:created" || !body.resource?.id) {
      return;
    }

    const shopId = await client.resolveShopId();
    const order = await client.getOrder(shopId, body.resource.id);
    const medusaOrderId = order.metadata?.shop_order_id
      ? String(order.metadata.shop_order_id)
      : null;
    if (!medusaOrderId) {
      logger.warn(
        `Printify: shipment webhook for order ${body.resource.id} with no external order reference — ignoring.`
      );
      return;
    }

    const shipment = order.shipments?.[order.shipments.length - 1];
    if (!shipment) {
      logger.warn(
        `Printify: shipment event for order ${body.resource.id} but no shipments on the order yet.`
      );
      return;
    }

    await recordShipment(req.scope, medusaOrderId, "printify", {
      carrier: shipment.carrier,
      tracking_number: shipment.number,
      tracking_url: shipment.url,
    });
  } catch (e: any) {
    logger.error(`Printify: shipment webhook processing failed: ${e.message}`);
  }
}
