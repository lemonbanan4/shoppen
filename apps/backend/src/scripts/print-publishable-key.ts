import { MedusaContainer } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

/**
 * Prints the store's publishable API key (created automatically by the
 * initial-data-seed migration script). Use it to populate
 * NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY on the storefront.
 *
 *   railway run npx medusa exec ./src/scripts/print-publishable-key.ts
 */
export default async function printPublishableKey({
  container,
}: {
  container: MedusaContainer;
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  const { data: keys } = await query.graph({
    entity: "api_key",
    fields: ["token", "title", "type", "revoked_at"],
    filters: { type: "publishable" },
  });

  const active = keys.filter((k) => !k.revoked_at);
  if (!active.length) {
    logger.error(
      "No active publishable API key found. Has db:migrate run yet?"
    );
    return;
  }

  for (const key of active) {
    logger.info(`PUBLISHABLE_KEY[${key.title}] = ${key.token}`);
  }
}
