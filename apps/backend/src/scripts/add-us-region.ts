import { MedusaContainer } from "@medusajs/framework";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import {
  createRegionsWorkflow,
  createShippingOptionsWorkflow,
  createTaxRegionsWorkflow,
} from "@medusajs/medusa/core-flows";

/**
 * Opens the store to US customers. The catalog has carried USD prices since
 * the first sync and the shipping options already price USD, but the store
 * was seeded with a single Europe region — a US visitor had no country to
 * pick at checkout. Adds the region, its tax region, a US service zone on
 * the existing fulfillment set, and US shipping options ($12 standard, free
 * over $85, $22 express — matching the EU structure).
 *
 * Idempotent: safe to re-run.
 *
 *   npx medusa exec ./src/scripts/add-us-region.ts
 */
export default async function addUsRegion({
  container,
}: {
  container: MedusaContainer;
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const fulfillmentModuleService = container.resolve(Modules.FULFILLMENT);

  const { data: regions } = await query.graph({
    entity: "region",
    fields: ["id", "name", "countries.iso_2"],
  });
  const usRegion = regions.find((r) =>
    (r.countries || []).some((c: any) => c?.iso_2 === "us")
  );

  let regionId = usRegion?.id;
  if (regionId) {
    logger.info(`US region already exists (${usRegion!.name}).`);
  } else {
    const { result } = await createRegionsWorkflow(container).run({
      input: {
        regions: [
          {
            name: "United States",
            currency_code: "usd",
            countries: ["us"],
            payment_providers: [
              "pp_system_default",
              ...(process.env.STRIPE_API_KEY ? ["pp_stripe_stripe"] : []),
            ],
          },
        ],
      },
    });
    regionId = result[0].id;
    logger.info(`Created region "United States" (${regionId}).`);

    await createTaxRegionsWorkflow(container).run({
      input: [{ country_code: "us", provider_id: "tp_system" }],
    });
    logger.info("Created US tax region.");
  }

  const { data: fulfillmentSets } = await query.graph({
    entity: "fulfillment_set",
    fields: ["id", "name", "service_zones.id", "service_zones.name"],
  });
  const fulfillmentSet = fulfillmentSets[0];
  if (!fulfillmentSet) {
    logger.error("No fulfillment set found — run the initial seed first.");
    return;
  }

  let usZoneId: string | undefined = (fulfillmentSet.service_zones || []).find(
    (z: any) => z?.name === "United States"
  )?.id;
  if (usZoneId) {
    logger.info("US service zone already exists.");
  } else {
    const created = await fulfillmentModuleService.createServiceZones([
      {
        name: "United States",
        fulfillment_set_id: fulfillmentSet.id,
        geo_zones: [{ type: "country", country_code: "us" }],
      },
    ]);
    usZoneId = created[0].id;
    logger.info("Created US service zone.");
  }
  if (!usZoneId) {
    logger.error("Could not resolve the US service zone.");
    return;
  }

  const { data: existingOptions } = await query.graph({
    entity: "shipping_option",
    fields: ["id", "name", "service_zone_id"],
    filters: { service_zone_id: usZoneId },
  });
  if (existingOptions.length) {
    logger.info(
      `US shipping options already exist (${existingOptions
        .map((o) => o.name)
        .join(", ")}). Done.`
    );
    return;
  }

  const { data: shippingProfiles } = await query.graph({
    entity: "shipping_profile",
    fields: ["id"],
  });

  const baseRules = [
    { attribute: "enabled_in_store", value: "true", operator: "eq" as const },
    { attribute: "is_return", value: "false", operator: "eq" as const },
  ];

  await createShippingOptionsWorkflow(container).run({
    input: [
      {
        name: "Standard Shipping (US)",
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: usZoneId,
        shipping_profile_id: shippingProfiles[0].id,
        type: {
          label: "Standard",
          description: "Ships in 5-8 business days.",
          code: "standard-us",
        },
        prices: [
          { currency_code: "usd", amount: 12 },
          {
            currency_code: "usd",
            amount: 0,
            rules: [
              { attribute: "item_total", operator: "gte" as const, value: 85 },
            ],
          },
        ],
        rules: baseRules,
      },
      {
        name: "Express Shipping (US)",
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: usZoneId,
        shipping_profile_id: shippingProfiles[0].id,
        type: {
          label: "Express",
          description: "Ships in 2-4 business days.",
          code: "express-us",
        },
        prices: [{ currency_code: "usd", amount: 22 }],
        rules: baseRules,
      },
    ],
  });
  logger.info(
    "Created US shipping options: Standard $12 (free over $85), Express $22. US checkout is live."
  );
}
