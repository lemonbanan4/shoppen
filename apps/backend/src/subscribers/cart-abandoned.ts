import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { senderForChannelName, storefrontForChannelName } from "../lib/brand-sender";

export default async function cartAbandonedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const cartModuleService = container.resolve(Modules.CART);
  const notificationModuleService = container.resolve(Modules.NOTIFICATION);

  const { data: carts } = await query.graph({
    entity: "cart",
    fields: [
      "id",
      "email",
      "metadata",
      "completed_at",
      "items.title",
      "items.quantity",
      "region.countries.iso_2",
      "customer.email",
      "sales_channel.name",
    ],
    filters: {
      id: data.id,
    },
  });

  const cart = carts?.[0];
  if (!cart) {
    return;
  }

  if (cart.completed_at) {
    return;
  }

  if (cart.metadata?.abandoned_recovery_sent_at) {
    return;
  }

  const email = cart.email || cart.customer?.email;
  const items = cart.items || [];
  if (!email || !items.length) {
    return;
  }

  const countryCode =
    cart.region?.countries?.[0]?.iso_2?.toLowerCase() || "us";
  const channelName = (cart as { sales_channel?: { name?: string } })
    .sales_channel?.name;

  const fallbackStorefront = (
    process.env.STOREFRONT_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    ""
  ).replace(/\/$/, "");

  const origin = storefrontForChannelName(channelName) || fallbackStorefront;
  if (!origin) {
    logger.warn(
      `cart.abandoned: STOREFRONT_URL not set, cannot send recovery email for cart ${cart.id}`
    );
    return;
  }

  const recoveryUrl = `${origin}/${countryCode}/checkout?cart_id=${cart.id}`;

  try {
    await notificationModuleService.createNotifications({
      to: email,
      channel: "email",
      template: "cart-recovery",
      from: senderForChannelName(channelName),
      data: {
        items: items.map((i: any) => ({
          title: i.title,
          quantity: i.quantity,
        })),
        recovery_url: recoveryUrl,
      },
    });

    await cartModuleService.updateCarts(cart.id, {
      metadata: {
        ...(cart.metadata || {}),
        abandoned_recovery_sent_at: new Date().toISOString(),
      },
    });

    logger.info(
      `[abandoned-cart] Sent recovery email for cart ${cart.id} to ${email}`
    );
  } catch (e: any) {
    logger.error(
      `[abandoned-cart] Failed to send recovery email for cart ${cart.id}: ${e.message}`
    );
  }
}

export const config: SubscriberConfig = {
  event: "cart.abandoned",
};
