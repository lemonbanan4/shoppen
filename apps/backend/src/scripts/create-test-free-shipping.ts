import { MedusaContainer } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import {
  createShippingOptionsWorkflow,
} from "@medusajs/medusa/core-flows";

export default async function createTestFreeShipping({
  container,
}: {
  container: MedusaContainer;
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  logger.info("Looking up service zones and shipping profiles...");

  const { data: shippingProfiles } = await query.graph({
    entity: "shipping_profile",
    fields: ["id", "name"],
  });
  const defaultProfile =
    shippingProfiles.find((p) => p.name === "Default Shipping Profile") ||
    shippingProfiles[0];

  const { data: serviceZones } = await query.graph({
    entity: "service_zone",
    fields: ["id", "name"],
  });

  logger.info(`Found ${serviceZones.length} service zone(s): ${serviceZones.map(z => z.name).join(", ")}`);

  const { data: existingOptions } = await query.graph({
    entity: "shipping_option",
    fields: ["id", "name", "service_zone_id"],
  });

  const baseRules = [
    { attribute: "enabled_in_store", value: "true", operator: "eq" as const },
    { attribute: "is_return", value: "false", operator: "eq" as const },
  ];

  for (const zone of serviceZones) {
    const hasFree = existingOptions.some(
      (o) => o.service_zone_id === zone.id && (o.name === "Free Delivery" || o.name === "Free Test Shipping")
    );

    if (hasFree) {
      logger.info(`Zone "${zone.name}" already has a Free Shipping option.`);
      continue;
    }

    logger.info(`Adding Free Shipping (0 SEK / 0 EUR / 0 USD) to zone "${zone.name}"...`);

    await createShippingOptionsWorkflow(container).run({
      input: [
        {
          name: "Free Test Shipping",
          price_type: "flat",
          provider_id: "manual_manual",
          service_zone_id: zone.id,
          shipping_profile_id: defaultProfile.id,
          type: {
            label: "Free Test Shipping",
            description: "0 kr test delivery",
            code: "free-test-delivery",
          },
          rules: baseRules,
          prices: [
            { currency_code: "sek", amount: 0 },
            { currency_code: "eur", amount: 0 },
            { currency_code: "usd", amount: 0 },
          ],
        },
      ],
    });
  }

  logger.info("Done: Free shipping options configured across all service zones.");
}
