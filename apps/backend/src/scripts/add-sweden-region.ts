import { MedusaContainer } from "@medusajs/framework";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import {
  createRegionsWorkflow,
  createShippingOptionsWorkflow,
  createTaxRegionsWorkflow,
  updateRegionsWorkflow,
  updateStoresWorkflow,
} from "@medusajs/medusa/core-flows";

/**
 * Sweden-first launch: give Swedish shoppers SEK.
 *
 * Sweden sat inside the Europe region, so a Swedish visitor was quoted in
 * EUR — foreign-feeling pricing at the exact moment a TikTok viewer decides
 * whether to trust an unknown shop. Printful already quotes retail prices in
 * SEK natively, so the catalog gains real SEK prices on the next sync once
 * "sek" is in STORE_CURRENCIES (done in the same commit as this script).
 *
 * A country can only belong to one region and one service zone, so this
 * moves `se` out of Europe (region and geo zone) before creating the Sweden
 * region, tax region, service zone and shipping options (69 kr standard,
 * free over 800 kr, 129 kr express).
 *
 * Idempotent: safe to re-run.
 *
 *   npx medusa exec ./src/scripts/add-sweden-region.ts
 */
export default async function addSwedenRegion({
  container,
}: {
  container: MedusaContainer;
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const fulfillmentModuleService = container.resolve(Modules.FULFILLMENT);

  // ——— Store must support SEK before a SEK region can exist ———
  const { data: stores } = await query.graph({
    entity: "store",
    fields: ["id", "supported_currencies.currency_code", "supported_currencies.is_default"],
  });
  const store = stores[0];
  const currencies = (store.supported_currencies || []).map((c: any) => ({
    currency_code: c.currency_code,
    is_default: c.is_default,
  }));
  if (!currencies.some((c: any) => c.currency_code === "sek")) {
    await updateStoresWorkflow(container).run({
      input: {
        selector: { id: store.id },
        update: {
          supported_currencies: [...currencies, { currency_code: "sek" }],
        },
      },
    });
    logger.info("Added SEK to store currencies.");
  }

  // ——— Move `se` out of the Europe region ———
  const { data: regions } = await query.graph({
    entity: "region",
    fields: ["id", "name", "currency_code", "countries.iso_2"],
  });
  const sweden = regions.find((r) =>
    (r.countries || []).some((c: any) => c?.iso_2 === "se")
  );
  let regionId: string | undefined;

  if (sweden && sweden.currency_code === "sek") {
    logger.info(`Sweden region already exists (${sweden.name}).`);
    regionId = sweden.id;
  } else {
    if (sweden) {
      const remaining = (sweden.countries || [])
        .map((c: any) => c?.iso_2)
        .filter((c: string) => c && c !== "se");
      await updateRegionsWorkflow(container).run({
        input: {
          selector: { id: sweden.id },
          update: { countries: remaining },
        },
      });
      logger.info(`Removed se from "${sweden.name}" (${remaining.join(",")}).`);
    }

    const { result } = await createRegionsWorkflow(container).run({
      input: {
        regions: [
          {
            name: "Sweden",
            currency_code: "sek",
            countries: ["se"],
            payment_providers: [
              "pp_system_default",
              ...(process.env.STRIPE_API_KEY ? ["pp_stripe_stripe"] : []),
            ],
          },
        ],
      },
    });
    regionId = result[0].id;
    logger.info(`Created region "Sweden" (${regionId}).`);

    const { data: taxRegions } = await query.graph({
      entity: "tax_region",
      fields: ["id", "country_code"],
      filters: { country_code: "se" },
    });
    if (!taxRegions.length) {
      await createTaxRegionsWorkflow(container).run({
        input: [{ country_code: "se", provider_id: "tp_system" }],
      });
      logger.info("Created Swedish tax region.");
    } else {
      // Already present from the original Europe seed, which taxed each
      // member country individually.
      logger.info("Swedish tax region already exists.");
    }
  }

  // ——— Service zone: move `se` out of the Europe geo zone too ———
  const { data: fulfillmentSets } = await query.graph({
    entity: "fulfillment_set",
    fields: [
      "id",
      "service_zones.id",
      "service_zones.name",
      "service_zones.geo_zones.id",
      "service_zones.geo_zones.country_code",
    ],
  });
  const fulfillmentSet = fulfillmentSets[0];
  if (!fulfillmentSet) {
    logger.error("No fulfillment set found — run the initial seed first.");
    return;
  }

  let swedenZoneId: string | undefined;
  for (const zone of fulfillmentSet.service_zones || []) {
    if (!zone) continue;
    if (zone.name === "Sweden") swedenZoneId = zone.id;
    else {
      const seGeo = (zone.geo_zones || []).find(
        (g: any) => g?.country_code === "se"
      );
      if (seGeo) {
        await fulfillmentModuleService.deleteGeoZones([seGeo.id]);
        logger.info(`Removed se geo zone from "${zone.name}".`);
      }
    }
  }

  if (!swedenZoneId) {
    const created = await fulfillmentModuleService.createServiceZones([
      {
        name: "Sweden",
        fulfillment_set_id: fulfillmentSet.id,
        geo_zones: [{ type: "country", country_code: "se" }],
      },
    ]);
    swedenZoneId = created[0].id;
    logger.info("Created Sweden service zone.");
  }

  const { data: existingOptions } = await query.graph({
    entity: "shipping_option",
    fields: ["id", "name", "service_zone_id"],
    filters: { service_zone_id: swedenZoneId },
  });
  if (existingOptions.length) {
    logger.info(
      `Swedish shipping options already exist (${existingOptions
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
        name: "Standard frakt",
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: swedenZoneId,
        shipping_profile_id: shippingProfiles[0].id,
        type: {
          label: "Standard",
          description: "Levereras inom 3-6 arbetsdagar.",
          code: "standard-se",
        },
        prices: [
          { currency_code: "sek", amount: 69 },
          {
            currency_code: "sek",
            amount: 0,
            rules: [
              { attribute: "item_total", operator: "gte" as const, value: 800 },
            ],
          },
        ],
        rules: baseRules,
      },
      {
        name: "Expressfrakt",
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: swedenZoneId,
        shipping_profile_id: shippingProfiles[0].id,
        type: {
          label: "Express",
          description: "Levereras inom 1-3 arbetsdagar.",
          code: "express-se",
        },
        prices: [{ currency_code: "sek", amount: 129 }],
        rules: baseRules,
      },
    ],
  });
  logger.info(
    "Created Swedish shipping: 69 kr standard (fri frakt över 800 kr), 129 kr express."
  );
}
