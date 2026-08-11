import { MedusaContainer } from "@medusajs/framework";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { senderForChannelName, storefrontForChannelName } from "../lib/brand-sender";

/**
 * Emails customers who left items in their cart and never checked out.
 * Runs hourly; sends at most once per cart (tracked via cart metadata).
 *
 * Only fires once RESEND_API_KEY is set — without it, cart-recovery emails
 * would just be written to .medusa/emails/ on every run, which is noise.
 */

const IDLE_HOURS = 3;
const MAX_AGE_HOURS = 24 * 7;

export default async function abandonedCartRecoveryJob(
  container: MedusaContainer
) {
  if (!process.env.RESEND_API_KEY) {
    return;
  }

  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  const now = Date.now();
  const idleBefore = new Date(now - IDLE_HOURS * 60 * 60 * 1000);
  const tooOldBefore = new Date(now - MAX_AGE_HOURS * 60 * 60 * 1000);

  const { data: carts } = await query.graph({
    entity: "cart",
    fields: [
      "id",
      "email",
      "metadata",
      "updated_at",
      "items.title",
      "items.quantity",
      "region.countries.iso_2",
      "customer.email",
      // Which storefront this cart belongs to. Without it the recovery link
      // and the sender both default to one brand, so a Solkast shopper is
      // emailed by Ångerköp and sent to angerkop.se to finish a cart that
      // does not exist there.
      "sales_channel.name",
    ],
    filters: {
      completed_at: null,
      updated_at: { $lt: idleBefore, $gt: tooOldBefore },
    },
  });

  const storefrontUrl = (process.env.STOREFRONT_URL || "").replace(/\/$/, "");
  if (!storefrontUrl) {
    logger.warn("Abandoned cart recovery: STOREFRONT_URL is not set, skipping.");
    return;
  }

  const cartModuleService = container.resolve(Modules.CART);
  const notificationModuleService = container.resolve(Modules.NOTIFICATION);

  let sent = 0;
  for (const cart of carts) {
    const email = cart.email || cart.customer?.email;
    const items = cart.items || [];
    if (!email || !items.length) {
      continue;
    }
    if (cart.metadata?.abandoned_recovery_sent_at) {
      continue;
    }

    const countryCode =
      cart.region?.countries?.[0]?.iso_2?.toLowerCase() || "us";
    const channelName = (cart as { sales_channel?: { name?: string } })
      .sales_channel?.name;
    const origin = storefrontForChannelName(channelName) || storefrontUrl;
    const recoveryUrl = `${origin}/${countryCode}/cart?cart_id=${cart.id}`;

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

      sent++;
    } catch (e: any) {
      logger.error(
        `Abandoned cart recovery: failed to email cart ${cart.id}: ${e.message}`
      );
    }
  }

  if (sent) {
    logger.info(`Abandoned cart recovery: sent ${sent} email(s).`);
  }
}

export const config = {
  name: "abandoned-cart-recovery",
  schedule: "0 * * * *",
};
