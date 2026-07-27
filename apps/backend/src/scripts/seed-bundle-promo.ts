import { MedusaContainer } from "@medusajs/framework";
import {
  ContainerRegistrationKeys,
  PromotionStatus,
} from "@medusajs/framework/utils";
import { createPromotionsWorkflow } from "@medusajs/medusa/core-flows";

/**
 * BUNDLE15 — 15% off once the cart reaches two items.
 *
 * Two tees at €45.99 come to €91.98; the discount brings that to €78.18,
 * which still clears the €75 free-shipping threshold. So the offer raises
 * average order value and pays for the shipping subsidy rather than
 * cannibalising it.
 *
 * Idempotent: safe to re-run.
 *
 *   npx medusa exec ./src/scripts/seed-bundle-promo.ts
 */
const CODE = "BUNDLE15";

export default async function seedBundlePromo({
  container,
}: {
  container: MedusaContainer;
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  const { data: existing } = await query.graph({
    entity: "promotion",
    fields: ["id", "code"],
    filters: { code: CODE },
  });
  if (existing.length) {
    logger.info(`${CODE} already exists, skipping.`);
    return;
  }

  await createPromotionsWorkflow(container).run({
    input: {
      promotionsData: [
        {
          code: CODE,
          type: "standard",
          status: PromotionStatus.ACTIVE,
          is_automatic: false,
          application_method: {
            type: "percentage",
            target_type: "order",
            allocation: "across",
            value: 15,
            currency_code: "eur",
          },
          rules: [
            {
              attribute: "item_total",
              operator: "gte",
              values: ["80"],
            },
          ],
        },
      ],
    },
  });

  logger.info(`Created ${CODE}: 15% off carts of €80+ (two pieces).`);
}
