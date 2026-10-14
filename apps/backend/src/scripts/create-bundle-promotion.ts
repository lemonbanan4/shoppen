import { MedusaContainer } from "@medusajs/framework";
import {
  ApplicationMethodAllocation,
  ApplicationMethodTargetType,
  ApplicationMethodType,
  ContainerRegistrationKeys,
  PromotionRuleOperator,
  PromotionStatus,
  PromotionType,
} from "@medusajs/framework/utils";
import { createPromotionsWorkflow } from "@medusajs/medusa/core-flows";

const HOODIE_TITLE = "AEON // BEYOND THE HORIZON HEAVYWEIGHT HOODIE";
const SWEATPANTS_TITLE = "AEON // BEYOND THE HORIZON HEAVYWEIGHT SWEATPANTS";
const PROMO_CODE = "AEON-BUNDLE-10";

export default async function createBundlePromotion({
  container,
}: {
  container: MedusaContainer;
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  logger.info("Searching for bundle products in Medusa catalog...");

  // 1. Locate the Hoodie and Sweatpants
  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "title", "handle"],
    filters: {
      title: {
        $in: [
          HOODIE_TITLE,
          SWEATPANTS_TITLE,
          "AEON // BEYOND THE HORIZON HOODIE",
          "AEON // BEYOND THE HORIZON SWEATPANTS",
        ],
      },
    },
  });

  const hoodie = products.find(
    (p: any) =>
      p.title === HOODIE_TITLE ||
      p.title === "AEON // BEYOND THE HORIZON HOODIE" ||
      p.handle.includes("hoodie")
  );

  const sweatpants = products.find(
    (p: any) =>
      p.title === SWEATPANTS_TITLE ||
      p.title === "AEON // BEYOND THE HORIZON SWEATPANTS" ||
      p.handle.includes("sweatpants")
  );

  if (!hoodie) {
    throw new Error(
      `Could not find buy product matching '${HOODIE_TITLE}' in the database.`
    );
  }

  if (!sweatpants) {
    throw new Error(
      `Could not find target product matching '${SWEATPANTS_TITLE}' in the database.`
    );
  }

  logger.info(`Found Buy Product: ${hoodie.title} (${hoodie.id})`);
  logger.info(`Found Target Product: ${sweatpants.title} (${sweatpants.id})`);

  // 2. Check if the promotion already exists
  const { data: existingPromos } = await query.graph({
    entity: "promotion",
    fields: ["id", "code"],
    filters: { code: PROMO_CODE },
  });

  if (existingPromos.length > 0) {
    logger.info(
      `Promotion '${PROMO_CODE}' already exists (ID: ${existingPromos[0].id}). Skipping creation.`
    );
    console.log(
      `\n✅ SUCCESS: Promotion '${PROMO_CODE}' already exists with ID: ${existingPromos[0].id}`
    );
    return;
  }

  // 3. Create the Buy X Get Y bundle promotion with fixed 10 EUR discount
  logger.info(
    `Creating promotion '${PROMO_CODE}' with 10 EUR fixed discount on ${sweatpants.title} when buying at least 1 ${hoodie.title}...`
  );

  const { result } = await createPromotionsWorkflow(container).run({
    input: {
      promotionsData: [
        {
          code: PROMO_CODE,
          type: PromotionType.BUYGET,
          status: PromotionStatus.ACTIVE,
          is_automatic: true,
          application_method: {
            type: ApplicationMethodType.FIXED,
            target_type: ApplicationMethodTargetType.ITEMS,
            allocation: ApplicationMethodAllocation.EACH,
            value: 10,
            currency_code: "eur",
            buy_rules_min_quantity: 1,
            apply_to_quantity: 1,
            max_quantity: 1,
            buy_rules: [
              {
                attribute: "items.product.id",
                operator: PromotionRuleOperator.EQ,
                values: [hoodie.id],
              },
            ],
            target_rules: [
              {
                attribute: "items.product.id",
                operator: PromotionRuleOperator.EQ,
                values: [sweatpants.id],
              },
            ],
          },
        },
      ],
    },
  });

  const createdPromo = result[0];

  console.log("\n=======================================================");
  console.log("🎉 SUCCESS: Bundle Promotion Successfully Created!");
  console.log("=======================================================");
  console.log(`Promotion ID:     ${createdPromo.id}`);
  console.log(`Code:             ${createdPromo.code}`);
  console.log(`Type:             ${createdPromo.type} (Buy X Get Y)`);
  console.log(`Status:           ${createdPromo.status}`);
  console.log(`Automatic:        ${createdPromo.is_automatic ? "Yes" : "No"}`);
  console.log(`Discount Value:   10 EUR (Fixed)`);
  console.log(`Buy Rule:         Require at least 1x '${hoodie.title}' (${hoodie.id})`);
  console.log(`Target Rule:      Apply 10 EUR discount to '${sweatpants.title}' (${sweatpants.id})`);
  console.log("=======================================================\n");

  logger.info(`Promotion '${PROMO_CODE}' created successfully.`);
}
