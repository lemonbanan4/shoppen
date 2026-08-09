import { MedusaContainer } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { updateRegionsWorkflow } from "@medusajs/medusa/core-flows";

/**
 * Take the manual payment provider off a region.
 *
 * `pp_system_default` is Medusa's manual provider. The storefront renders it
 * as "Manual Payment — Attention: For testing purposes only", and selecting
 * it completes the order without charging anything. It ships enabled because
 * a fresh install needs *some* provider before Stripe keys exist, and it was
 * still enabled on every region here long after Stripe went live.
 *
 * Scoped by region name and confirmed against the live store's
 * /store/payment-providers before and after, because this is the difference
 * between a shop that takes money and one that gives stock away.
 *
 *   REGIONS="Sweden" npx medusa exec ./src/scripts/set-region-payment-providers.ts
 *
 * REGIONS is a comma-separated list of region names; it defaults to Sweden.
 */

const MANUAL = "pp_system_default";

export default async function setRegionPaymentProviders({
  container,
}: {
  container: MedusaContainer;
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  const targets = (process.env.REGIONS || "Sweden")
    .split(",")
    .map((n) => n.trim().toLowerCase())
    .filter(Boolean);

  const { data: regions } = await query.graph({
    entity: "region",
    fields: ["id", "name", "payment_providers.id", "payment_providers.is_enabled"],
  });

  for (const region of regions) {
    if (!targets.includes(region.name.toLowerCase())) continue;

    const current = (region.payment_providers || [])
      .map((p: any) => p?.id)
      .filter(Boolean) as string[];
    const remaining = current.filter((id) => id !== MANUAL);

    if (current.length === remaining.length) {
      logger.info(`"${region.name}": ${MANUAL} not attached — nothing to do.`);
      continue;
    }

    // Refuse to leave a region with no way to pay at all. Removing the last
    // provider does not fail loudly — checkout simply offers nothing, which
    // looks like a storefront bug rather than a config mistake.
    if (!remaining.length) {
      logger.error(
        `"${region.name}": ${MANUAL} is the only payment provider. ` +
          `Removing it would leave checkout with no payment method. Skipped — ` +
          `attach Stripe to this region first.`
      );
      continue;
    }

    await updateRegionsWorkflow(container).run({
      input: {
        selector: { id: region.id },
        update: { payment_providers: remaining },
      },
    });
    logger.info(
      `"${region.name}": removed ${MANUAL}, now ${remaining.join(", ")}`
    );
  }

  logger.info("Done.");
}
