import { MedusaContainer } from "@medusajs/framework";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { senderForChannelName, storefrontForChannelName } from "../lib/brand-sender";

/**
 * Emails customers who left items in their cart and never checked out.
 * Runs hourly; finds carts idle for at least 24 hours.
 * Dispatches cart.abandoned event for decoupled subscriber handling.
 */

const IDLE_HOURS = 24;
const MAX_AGE_HOURS = 24 * 7;

export default async function abandonedCartRecoveryJob(
  container: MedusaContainer
) {
  if (!process.env.RESEND_API_KEY && !process.env.EMAIL_API_KEY) {
    return;
  }

  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const eventBus = container.resolve(Modules.EVENT_BUS);

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
      "sales_channel.name",
    ],
    filters: {
      completed_at: null,
      updated_at: { $lt: idleBefore, $gt: tooOldBefore },
    },
  });

  const storefrontUrl = (
    process.env.STOREFRONT_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    ""
  ).replace(/\/$/, "");

  if (!storefrontUrl) {
    logger.warn("Abandoned cart recovery: STOREFRONT_URL is not set, skipping.");
    return;
  }

  let dispatched = 0;
  for (const cart of carts) {
    const email = cart.email || cart.customer?.email;
    const items = cart.items || [];
    if (!email || !items.length) {
      continue;
    }
    if (cart.metadata?.abandoned_recovery_sent_at) {
      continue;
    }

    try {
      await eventBus.emit({
        name: "cart.abandoned",
        data: { id: cart.id },
      });
      dispatched++;
    } catch (e: any) {
      logger.error(
        `Abandoned cart recovery: failed to dispatch cart.abandoned for cart ${cart.id}: ${e.message}`
      );
    }
  }

  if (dispatched) {
    logger.info(`Abandoned cart recovery: dispatched cart.abandoned for ${dispatched} cart(s).`);
  }
}

export const config = {
  name: "abandoned-cart-recovery",
  schedule: "0 * * * *",
};

