import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

const STOREFRONT_URL = process.env.STOREFRONT_URL || "http://localhost:8000";

export default async function orderTransferRequestedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string; order_change_id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const notificationModuleService = container.resolve(Modules.NOTIFICATION);

  const {
    data: [orderChange],
  } = await query.graph({
    entity: "order_change",
    fields: [
      "id",
      "order_id",
      "order.display_id",
      "order.email",
      "actions.action",
      "actions.details",
    ],
    filters: { id: data.order_change_id },
  });

  const transferAction = (orderChange?.actions || []).find(
    (action: any) => action?.action === "TRANSFER_CUSTOMER"
  );
  const token = (transferAction?.details as any)?.token;
  const email = (orderChange as any)?.order?.email;

  if (!token || !email) {
    logger.warn(
      `order.transfer_requested: missing token or email for change ${data.order_change_id}, skipping email`
    );
    return;
  }

  await notificationModuleService.createNotifications({
    to: email,
    channel: "email",
    template: "order-transfer-requested",
    data: {
      order: { display_id: (orderChange as any).order.display_id },
      transfer_url: `${STOREFRONT_URL}/order/${orderChange.order_id}/transfer/${token}`,
    },
  });
}

export const config: SubscriberConfig = {
  event: "order.transfer_requested",
};
