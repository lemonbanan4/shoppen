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
import {
  createPromotionsWorkflow,
  deletePromotionsWorkflow,
} from "@medusajs/medusa/core-flows";

const HOODIE_HANDLES = [
  "aeon-horizon-heavyweight-hoodie",
  "aeon-beyond-the-horizon-heavyweight-hoodie",
  "aeon-beyond-the-horizon-hoodie",
];
const SWEATPANTS_HANDLES = [
  "aeon-heavyweight-sweatpants",
  "aeon-beyond-the-horizon-heavyweight-sweatpants",
  "aeon-beyond-the-horizon-sweatpants",
];

// Standard fashion bundle: 10 EUR, 100 SEK (~10 EUR), and 10 USD (~10 EUR)
// Up to 10 sets per order to allow customers to buy multiple sets (e.g., for themselves & friends)
// while protecting against wholesale abuse.
const MAX_BUNDLE_QUANTITY_PER_CART = 10;

const CURRENCY_CONFIGS = [
  {
    code: "AEON-BUNDLE-EUR",
    currency_code: "eur",
    value: 10,
    label: "10 EUR",
    is_tax_inclusive: true,
  },
  {
    code: "AEON-BUNDLE-SEK",
    currency_code: "sek",
    value: 100,
    label: "100 SEK",
    is_tax_inclusive: true,
  },
  {
    code: "AEON-BUNDLE-USD",
    currency_code: "usd",
    value: 10,
    label: "10 USD",
    is_tax_inclusive: false,
  },
];

export default async function createBundlePromotion({
  container,
}: {
  container: MedusaContainer;
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  logger.info("Locating bundle products by handle...");

  // 1. Locate the Hoodie and Sweatpants by handles (resilient against title renames)
  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "title", "handle", "deleted_at"],
    filters: {
      handle: {
        $in: [...HOODIE_HANDLES, ...SWEATPANTS_HANDLES],
      },
    },
  });

  const activeProducts = products.filter((p: any) => !p.deleted_at);
  const hoodie = activeProducts.find((p: any) =>
    HOODIE_HANDLES.includes(p.handle)
  );
  const sweatpants = activeProducts.find((p: any) =>
    SWEATPANTS_HANDLES.includes(p.handle)
  );

  if (!hoodie) {
    throw new Error(
      `Could not find active Hoodie product with handles [${HOODIE_HANDLES.join(", ")}].`
    );
  }
  if (!sweatpants) {
    throw new Error(
      `Could not find active Sweatpants product with handles [${SWEATPANTS_HANDLES.join(", ")}].`
    );
  }

  logger.info(`Found Buy Product: ${hoodie.title} (${hoodie.id})`);
  logger.info(`Found Target Product: ${sweatpants.title} (${sweatpants.id})`);

  // 2. Clean up legacy single-currency bundle code if present (AEON-BUNDLE-10)
  const legacyCodes = ["AEON-BUNDLE-10"];
  const targetCodes = CURRENCY_CONFIGS.map((c) => c.code);

  const { data: existingPromos } = await query.graph({
    entity: "promotion",
    fields: ["id", "code"],
    filters: {
      code: {
        $in: [...legacyCodes, ...targetCodes],
      },
    },
  });

  if (existingPromos.length > 0) {
    logger.info(
      `Removing ${existingPromos.length} existing bundle promotion(s) for clean recreation: ${existingPromos.map((p: any) => p.code).join(", ")}`
    );
    await deletePromotionsWorkflow(container).run({
      input: { ids: existingPromos.map((p: any) => p.id) },
    });
  }

  // 3. Create the multi-currency Buy X Get Y promotions
  const promotionsData = CURRENCY_CONFIGS.map((cfg) => ({
    code: cfg.code,
    type: PromotionType.BUYGET,
    status: PromotionStatus.ACTIVE,
    is_automatic: true,
    is_tax_inclusive: cfg.is_tax_inclusive,
    application_method: {
      type: ApplicationMethodType.FIXED,
      target_type: ApplicationMethodTargetType.ITEMS,
      allocation: ApplicationMethodAllocation.EACH,
      value: cfg.value,
      currency_code: cfg.currency_code,
      buy_rules_min_quantity: 1,
      apply_to_quantity: 1,
      max_quantity: MAX_BUNDLE_QUANTITY_PER_CART,
      buy_rules: [
        {
          attribute: "items.product.id",
          operator: PromotionRuleOperator.IN,
          values: [hoodie.id],
        },
      ],
      target_rules: [
        {
          attribute: "items.product.id",
          operator: PromotionRuleOperator.IN,
          values: [sweatpants.id],
        },
      ],
    },
  }));

  logger.info(`Creating ${promotionsData.length} multi-currency bundle promotions...`);

  const { result: createdPromotions } = await createPromotionsWorkflow(container).run({
    input: {
      promotionsData,
    },
  });

  console.log("\n=======================================================");
  console.log("🎉 SUCCESS: Multi-Currency Bundle Promotions Created!");
  console.log("=======================================================");
  console.log(`Buy Product:      ${hoodie.title} (${hoodie.id})`);
  console.log(`Target Product:   ${sweatpants.title} (${sweatpants.id})`);
  console.log(`Max per Cart:     ${MAX_BUNDLE_QUANTITY_PER_CART} sets (standard fashion quantity cap)`);
  console.log("-------------------------------------------------------");

  for (const promo of createdPromotions) {
    const appMethod = promo.application_method;
    console.log(
      `• [${appMethod?.currency_code?.toUpperCase()}]: Code '${promo.code}' (ID: ${promo.id}) -> ${appMethod?.value} ${appMethod?.currency_code?.toUpperCase()} off per pair (Max ${appMethod?.max_quantity} items)`
    );
  }
  console.log("=======================================================\n");

  logger.info("All bundle promotions created successfully.");
}
