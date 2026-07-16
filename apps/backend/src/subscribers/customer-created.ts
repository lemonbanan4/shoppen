import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

export default async function customerCreatedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const notificationModuleService = container.resolve(Modules.NOTIFICATION);

  const {
    data: [customer],
  } = await query.graph({
    entity: "customer",
    fields: ["id", "email", "first_name"],
    filters: { id: data.id },
  });

  if (!customer?.email) {
    logger.warn(`customer.created: no email on ${data.id}, skipping email`);
    return;
  }

  await notificationModuleService.createNotifications({
    to: customer.email,
    channel: "email",
    template: "customer-welcome",
    data: { customer },
  });
}

export const config: SubscriberConfig = {
  event: "customer.created",
};
