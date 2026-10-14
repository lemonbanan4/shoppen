import { MedusaContainer } from "@medusajs/framework";
import {
  ContainerRegistrationKeys,
  PromotionStatus,
} from "@medusajs/framework/utils";
import {
  createPromotionsWorkflow,
  createShippingOptionsWorkflow,
  updateShippingOptionsWorkflow,
} from "@medusajs/medusa/core-flows";

export default async function setupFreeShipping85({
  container,
}: {
  container: MedusaContainer;
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const pgConnection = container.resolve(ContainerRegistrationKeys.PG_CONNECTION);

  logger.info("==================================================");
  logger.info("Setting up 'Free Shipping over 85' in Medusa v2...");
  logger.info("==================================================");

  // 1. Fetch shipping options, profile, and service zone
  const { data: shippingOptions } = await query.graph({
    entity: "shipping_option",
    fields: ["id", "name", "service_zone_id", "shipping_profile_id"],
  });

  const { data: shippingProfiles } = await query.graph({
    entity: "shipping_profile",
    fields: ["id", "name"],
  });
  const defaultProfile = shippingProfiles[0];

  const { data: serviceZones } = await query.graph({
    entity: "service_zone",
    fields: ["id", "name"],
  });
  const defaultZone = serviceZones[0];

  const standard = shippingOptions.find((o) => o.name === "Standard Shipping");

  // A. Configure Standard Shipping conditional price (Amount = 0 when item_total >= 85)
  if (standard) {
    logger.info(`Updating Standard Shipping (${standard.id}) with free shipping over 85 (EUR & USD)...`);
    await updateShippingOptionsWorkflow(container).run({
      input: [
        {
          id: standard.id,
          prices: [
            { currency_code: "eur", amount: 10 },
            { currency_code: "usd", amount: 12 },
            {
              currency_code: "eur",
              amount: 0,
              rules: [
                {
                  attribute: "item_total",
                  operator: "gte" as const,
                  value: 85,
                },
              ],
            },
            {
              currency_code: "usd",
              amount: 0,
              rules: [
                {
                  attribute: "item_total",
                  operator: "gte" as const,
                  value: 85,
                },
              ],
            },
          ],
        },
      ],
    });
    logger.info("Standard Shipping conditional price rules successfully applied.");
  }

  // B. Also create an explicit "Free Shipping (Orders over 85)" shipping option if it doesn't already exist
  const existingFreeOption = shippingOptions.find(
    (o) => o.name === "Free Shipping" || o.name === "Free Shipping (Orders over 85)"
  );

  if (!existingFreeOption && defaultProfile && defaultZone) {
    logger.info("Creating dedicated 'Free Shipping' option in active shipping profile...");
    const { result: createdOptions } = await createShippingOptionsWorkflow(container).run({
      input: [
        {
          name: "Free Shipping",
          price_type: "flat",
          provider_id: "manual_manual",
          service_zone_id: defaultZone.id,
          shipping_profile_id: defaultProfile.id,
          type: {
            label: "Free Shipping",
            description: "Free shipping for orders over 85",
            code: "free-shipping-85",
          },
          rules: [
            { attribute: "enabled_in_store", value: "true", operator: "eq" as const },
            { attribute: "is_return", value: "false", operator: "eq" as const },
          ],
          prices: [
            {
              currency_code: "eur",
              amount: 0,
              rules: [
                { attribute: "item_total", operator: "gte" as const, value: 85 },
              ],
            },
            {
              currency_code: "usd",
              amount: 0,
              rules: [
                { attribute: "item_total", operator: "gte" as const, value: 85 },
              ],
            },
          ],
        },
      ],
    });

    const createdId = createdOptions[0]?.id;
    if (createdId) {
      // Add shipping_option_rule for min item_total = 85
      try {
        await pgConnection("shipping_option_rule").insert({
          id: `sorul_free_85_${Date.now()}`,
          shipping_option_id: createdId,
          attribute: "item_total",
          operator: "gte",
          value: "85",
          created_at: new Date(),
          updated_at: new Date(),
        });
        logger.info("Direct shipping_option_rule item_total >= 85 attached to Free Shipping option.");
      } catch (err: any) {
        logger.warn(`Could not add option-level rule: ${err.message}`);
      }
    }
  } else {
    logger.info("Dedicated Free Shipping option already exists or zone missing.");
  }

  // C. Configure an Automatic Shipping Promotion: 100% off shipping when cart subtotal >= 85
  const PROMO_CODE = "FREESHIP85";
  const { data: existingPromos } = await query.graph({
    entity: "promotion",
    fields: ["id", "code"],
    filters: { code: PROMO_CODE },
  });

  if (existingPromos.length === 0) {
    logger.info(`Creating automatic promotion ${PROMO_CODE} (100% off shipping for orders >= 85)...`);
    await createPromotionsWorkflow(container).run({
      input: {
        promotionsData: [
          {
            code: PROMO_CODE,
            type: "standard",
            status: PromotionStatus.ACTIVE,
            is_automatic: true,
            application_method: {
              type: "percentage",
              target_type: "shipping_methods",
              allocation: "across",
              value: 100,
              currency_code: "eur",
            },
            rules: [
              {
                attribute: "item_total",
                operator: "gte",
                values: ["85"],
              },
            ],
          },
        ],
      },
    });
    logger.info(`Promotion ${PROMO_CODE} created successfully.`);
  } else {
    logger.info(`Promotion ${PROMO_CODE} already exists.`);
  }

  // Verification step:
  const priceRules = await pgConnection("price_rule")
    .where({ attribute: "item_total" })
    .select("*");
  logger.info(`Verified price_rule rows with item_total: ${JSON.stringify(priceRules)}`);

  const { data: finalPromos } = await query.graph({
    entity: "promotion",
    fields: ["id", "code", "is_automatic", "status", "application_method.*", "rules.*"],
  });
  logger.info(`Current active promotions: ${JSON.stringify(finalPromos)}`);

  logger.info("==================================================");
  logger.info("SUCCESS: 'Free Shipping over 85' rule is active!");
  logger.info("==================================================");
}
