import { MedusaContainer } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { updateRegionsWorkflow } from "@medusajs/medusa/core-flows";

/**
 * Enables the Stripe payment provider on every region, keeping the manual
 * (test) provider available. Run once after setting STRIPE_API_KEY:
 *
 *   npx medusa exec ./src/scripts/enable-stripe.ts
 */
export default async function enableStripe({
  container,
}: {
  container: MedusaContainer;
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  if (!process.env.STRIPE_API_KEY) {
    logger.error(
      "STRIPE_API_KEY is not set. Add it to apps/backend/.env first, then rerun this script."
    );
    return;
  }

  const { data: regions } = await query.graph({
    entity: "region",
    fields: ["id", "name", "payment_providers.id"],
  });

  for (const region of regions) {
    const existing = (region.payment_providers || []).map((p: any) => p.id);
    if (existing.includes("pp_stripe_stripe")) {
      logger.info(`Region "${region.name}" already has Stripe. Skipping.`);
      continue;
    }
    await updateRegionsWorkflow(container).run({
      input: {
        selector: { id: region.id },
        update: {
          payment_providers: [...existing, "pp_stripe_stripe"],
        },
      },
    });
    logger.info(`Enabled Stripe on region "${region.name}".`);
  }

  logger.info(
    "Done. Also set NEXT_PUBLIC_STRIPE_KEY (publishable key) in apps/storefront/.env.local and restart the storefront."
  );
}
