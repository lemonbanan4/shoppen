import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { PrintfulClient } from "../../../lib/printful-client";
import { recordShipment } from "../../../lib/record-shipment";

/**
 * Printful shipment webhook. Registered by setup-fulfillment-webhooks.ts as
 * /hooks/printful?token=PRINTFUL_WEBHOOK_TOKEN.
 *
 * The payload is treated as untrusted: only the order id is read from it, and
 * the order (including its external_id back-reference to the Medusa order and
 * its shipments) is refetched from Printful's API, so a forged request cannot
 * inject tracking data.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const expectedToken = process.env.PRINTFUL_WEBHOOK_TOKEN;
  const client = PrintfulClient.fromEnv();
  if (!expectedToken || !client) {
    res.status(404).json({ message: "Not configured" });
    return;
  }
  if (req.query.token !== expectedToken) {
    res.status(401).json({ message: "Invalid token" });
    return;
  }

  res.status(200).json({ received: true });

  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER);
  try {
    const body = req.body as {
      type?: string;
      data?: { order?: { id?: number } };
    };
    if (body?.type !== "package_shipped" || !body.data?.order?.id) {
      return;
    }

    const order = await client.getOrder(body.data.order.id);
    if (!order.external_id) {
      logger.warn(
        `Printful: shipment webhook for order ${body.data.order.id} with no external order reference — ignoring.`
      );
      return;
    }

    const shipment = order.shipments?.[order.shipments.length - 1];
    if (!shipment) {
      logger.warn(
        `Printful: shipment event for order ${body.data.order.id} but no shipments on the order yet.`
      );
      return;
    }

    await recordShipment(req.scope, order.external_id, "printful", {
      carrier: shipment.carrier,
      tracking_number: shipment.tracking_number,
      tracking_url: shipment.tracking_url,
    });
  } catch (e: any) {
    logger.error(`Printful: shipment webhook processing failed: ${e.message}`);
  }
}
