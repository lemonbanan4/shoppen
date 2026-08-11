import { MedusaContainer } from "@medusajs/framework";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import {
  createRegionsWorkflow,
  createShippingOptionsWorkflow,
  createTaxRegionsWorkflow,
} from "@medusajs/medusa/core-flows";

/**
 * Let the rest of the world buy.
 *
 * Solkast sells in English on a .com and the middleware sends any unmatched
 * visitor to /us, which looks like it works — the storefront renders, prices
 * show in USD, items add to the cart. Checkout is where it fails: Medusa
 * builds the shipping-country dropdown from the region's own country list,
 * and the United States region contains exactly one country. A shopper in
 * Canada, Japan or Brazil reaches the address step and finds nowhere to ship.
 *
 * Thirty-three countries could complete an order before this script. The
 * shop was not "selling to all", it was quietly refusing everyone outside
 * Europe and the US at the last step.
 *
 * Rates are deliberately higher than the EU zone: these parcels leave the EU
 * and cross a customs border, and a flat 12 USD would be sold below cost.
 * There is no free-shipping threshold here for the same reason.
 *
 * Idempotent: safe to re-run.
 *
 *   npx medusa exec ./src/scripts/add-rest-of-world-region.ts
 */

const REGION_NAME = "Rest of World";

// Markets Printful ships to reliably and where an English storefront has a
// plausible customer. Deliberately not "every ISO code" — a country listed
// but undeliverable is worse than one that is absent, because the customer
// only discovers it after paying.
const COUNTRIES = [
  "ca", "mx", "br", "ar", "cl", "co", "pe", "uy",           // Americas
  "au", "nz",                                                // Oceania
  "jp", "kr", "sg", "hk", "tw", "my", "th", "ph", "id", "vn", "in",  // Asia
  "ae", "sa", "il", "tr", "qa", "kw",                        // Middle East
  "za", "ma", "eg", "ke", "ng",                              // Africa
  "ua", "rs", "md", "ge", "am", "al", "mk", "ba", "me",      // wider Europe
];

export default async function addRestOfWorldRegion({
  container,
}: {
  container: MedusaContainer;
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const fulfillment = container.resolve(Modules.FULFILLMENT);

  // ——— Never steal a country another region already owns ———
  const { data: regions } = await query.graph({
    entity: "region",
    fields: ["id", "name", "currency_code", "countries.iso_2"],
  });
  const existing = regions.find((r) => r.name === REGION_NAME);
  const claimed = new Set<string>();
  for (const r of regions) {
    if (r.name === REGION_NAME) continue;
    for (const c of r.countries || []) {
      if ((c as any)?.iso_2) claimed.add((c as any).iso_2);
    }
  }
  const countries = COUNTRIES.filter((c) => !claimed.has(c));
  const skipped = COUNTRIES.filter((c) => claimed.has(c));
  if (skipped.length) {
    logger.info(`Leaving ${skipped.join(",")} with their existing region.`);
  }

  let regionId = existing?.id;
  if (existing) {
    logger.info(`"${REGION_NAME}" already exists.`);
  } else {
    const { result } = await createRegionsWorkflow(container).run({
      input: {
        regions: [{
          name: REGION_NAME,
          currency_code: "usd",
          countries,
          payment_providers: ["pp_stripe_stripe"],
        }],
      },
    });
    regionId = result[0].id;
    logger.info(`Created "${REGION_NAME}" with ${countries.length} countries.`);
  }

  // ——— Tax regions ———
  // Medusa resolves tax per country. Without one the cart throws at the
  // totals step rather than degrading, so this is not optional.
  const { data: taxRegions } = await query.graph({
    entity: "tax_region",
    fields: ["id", "country_code"],
  });
  const haveTax = new Set(taxRegions.map((t: any) => t.country_code));
  const missing = countries.filter((c) => !haveTax.has(c));
  for (const country_code of missing) {
    try {
      await createTaxRegionsWorkflow(container).run({
        input: [{ country_code, provider_id: "tp_system" }],
      });
    } catch (e) {
      logger.warn(`Tax region ${country_code}: ${(e as Error).message}`);
    }
  }
  logger.info(missing.length
    ? `Created ${missing.length} tax region(s).`
    : "All tax regions already present.");

  // ——— Service zone ———
  // Shipping options hang off a geo zone. A country in the region but not in
  // a zone reaches checkout and is offered no shipping method at all, which
  // is the same dead end this script exists to remove.
  const { data: sets } = await query.graph({
    entity: "fulfillment_set",
    fields: ["id", "service_zones.id", "service_zones.name"],
  });
  const set = sets[0];
  if (!set) {
    logger.error("No fulfillment set — run the initial seed first.");
    return;
  }
  let zone = (set.service_zones || []).find((z: any) => z.name === REGION_NAME);
  if (!zone) {
    const created = await fulfillment.createServiceZones({
      fulfillment_set_id: set.id,
      name: REGION_NAME,
      geo_zones: countries.map((country_code) => ({
        type: "country" as const, country_code,
      })),
    });
    zone = Array.isArray(created) ? created[0] : created;
    logger.info(`Created service zone "${REGION_NAME}".`);
  }

  // ——— Shipping options ———
  const { data: profiles } = await query.graph({
    entity: "shipping_profile", fields: ["id"],
  });
  const { data: existingOptions } = await query.graph({
    entity: "shipping_option", fields: ["id", "name"],
  });
  const have = new Set(existingOptions.map((o: any) => o.name));

  const options = [
    { name: "International Standard", amount: 15 },
    { name: "International Express", amount: 29 },
  ].filter((o) => !have.has(o.name));

  for (const o of options) {
    await createShippingOptionsWorkflow(container).run({
      input: [{
        name: o.name,
        service_zone_id: zone!.id,
        shipping_profile_id: profiles[0]!.id,
        provider_id: "manual_manual",
        price_type: "flat" as const,
        type: { label: o.name, description: o.name, code: "standard" },
        prices: [{ currency_code: "usd", amount: o.amount }],
        rules: [
          { attribute: "enabled_in_store", value: "true", operator: "eq" },
          { attribute: "is_return", value: "false", operator: "eq" },
        ],
      }],
    });
    logger.info(`Created "${o.name}" at ${o.amount} USD.`);
  }

  logger.info("Done.");
}
