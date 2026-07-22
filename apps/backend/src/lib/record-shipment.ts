import { MedusaContainer } from "@medusajs/framework";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

export type ShipmentInfo = {
  carrier?: string | null;
  tracking_number?: string | null;
  tracking_url?: string | null;
};

/**
 * Stores tracking info on a Medusa order (merged into existing metadata) and
 * emails the customer, deduping on the tracking number so webhook retries or
 * repeated events never double-send.
 */
export const recordShipment = async (
  container: MedusaContainer,
  medusaOrderId: string,
  supplier: "printify" | "printful",
  shipment: ShipmentInfo
): Promise<void> => {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  const { data: orders } = await query.graph({
    entity: "order",
    fields: ["id", "display_id", "email", "metadata"],
    filters: { id: medusaOrderId },
  });
  const order = orders[0];
  if (!order) {
    logger.warn(
      `${supplier}: shipment webhook for unknown order ${medusaOrderId} — ignoring.`
    );
    return;
  }

  const trackingKey = `${supplier}_tracking_number`;
  if (
    shipment.tracking_number &&
    order.metadata?.[trackingKey] === shipment.tracking_number
  ) {
    logger.info(
      `${supplier}: shipment for order #${order.display_id} already recorded — skipping.`
    );
    return;
  }

  const orderModuleService = container.resolve(Modules.ORDER);
  await orderModuleService.updateOrders([
    {
      id: order.id,
      metadata: {
        ...(order.metadata || {}),
        [trackingKey]: shipment.tracking_number || null,
        [`${supplier}_tracking_url`]: shipment.tracking_url || null,
        [`${supplier}_carrier`]: shipment.carrier || null,
      },
    },
  ]);

  if (!order.email) {
    logger.warn(
      `${supplier}: order #${order.display_id} shipped but has no email — tracking stored, no email sent.`
    );
    return;
  }

  const notificationModuleService = container.resolve(Modules.NOTIFICATION);
  await notificationModuleService.createNotifications({
    to: order.email,
    channel: "email",
    template: "order-shipped",
    data: {
      order: { display_id: order.display_id },
      shipment,
    },
  });

  logger.info(
    `${supplier}: order #${order.display_id} shipped — tracking stored and customer emailed.`
  );
};
