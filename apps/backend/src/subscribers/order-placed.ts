import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { getOrderDetailWorkflow } from "@medusajs/medusa/core-flows";
import { senderForOrder } from "../lib/brand-sender";

export default async function orderPlacedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const notificationModuleService = container.resolve(Modules.NOTIFICATION);

  const { result: order } = await getOrderDetailWorkflow(container).run({
    input: {
      order_id: data.id,
      fields: [
        "id",
        "display_id",
        "email",
        "currency_code",
        "summary",
        "total",
        "tax_total",
        "item_subtotal",
        "shipping_total",
        "items.*",
        "items.detail.*",
        "shipping_address.*",
      ],
    },
  });

  if (!order?.email) {
    logger.warn(`order.placed: no email on order ${data.id}, skipping email`);
    return;
  }

  await notificationModuleService.createNotifications({
    to: order.email,
    channel: "email",
    template: "order-placed",
    from: await senderForOrder(container, data.id),
    data: { order },
  });
}

export const config: SubscriberConfig = {
  event: "order.placed",
};
