import { MedusaContainer } from "@medusajs/framework";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import {
  createTaxRegionsWorkflow,
  updateRegionsWorkflow,
} from "@medusajs/medusa/core-flows";

/**
 * Widen the Europe region so European visitors are not sent to Sweden.
 *
 * Only eight countries were mapped to a region — se, dk, de, gb, fr, it, es,
 * us — and the middleware falls through to NEXT_PUBLIC_DEFAULT_REGION for
 * everyone else. Measured against production:
 *
 *     NO, FI, NL, JP, AU, CA, BR  ->  /se
 *
 * So a Norwegian or a Dutch visitor to angerkop.se landed on the Swedish
 * storefront, reading Swedish and quoted in SEK. On solkast.com the same
 * visitors fell to /us and were quoted USD for a garment printed and posted
 * inside the EU.
 *
 * Routing alone cannot fix this. Medusa builds the checkout country dropdown
 * from the region's own country list, so a visitor sent to a region that does
 * not contain their country reaches the address step and finds nowhere to
 * ship — the same failure that made Sweden unselectable before it had its
 * own region. The countries have to be *in* the region.
 *
 * Additive and idempotent: nothing is removed, se keeps its own SEK region,
 * and re-running is a no-op.
 *
 *   npx medusa exec ./src/scripts/expand-europe-region.ts
 */

// EU plus the EEA and Switzerland — everywhere Printful's EU facility ships
// to at European rates. `se` is deliberately absent: it has its own SEK
// region and a country may belong to only one.
const EUROPE = [
  "at", "be", "bg", "hr", "cy", "cz", "dk", "ee", "fi", "fr",
  "de", "gr", "hu", "ie", "it", "lv", "lt", "lu", "mt", "nl",
  "pl", "pt", "ro", "sk", "si", "es", "gb", "no", "is", "li", "ch",
];

export default async function expandEuropeRegion({
  container,
}: {
  container: MedusaContainer;
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const fulfillmentModuleService = container.resolve(Modules.FULFILLMENT);

  // ——— Find the EUR region ———
  const { data: regions } = await query.graph({
    entity: "region",
    fields: ["id", "name", "currency_code", "countries.iso_2"],
  });
  const europe = regions.find((r) => r.currency_code === "eur");
  if (!europe) {
    logger.error("No EUR region found — nothing to widen.");
    return;
  }

  const existing = new Set(
    (europe.countries || []).map((c: any) => c?.iso_2).filter(Boolean)
  );

  // A country can only sit in one region, so never claim one that another
  // region already owns — that is how Sweden would silently lose its SEK
  // pricing on a re-run.
  const claimedElsewhere = new Set<string>();
  for (const r of regions) {
    if (r.id === europe.id) continue;
    for (const c of r.countries || []) {
      if ((c as any)?.iso_2) claimedElsewhere.add((c as any).iso_2);
    }
  }

  const toAdd = EUROPE.filter(
    (c) => !existing.has(c) && !claimedElsewhere.has(c)
  );
  const skipped = EUROPE.filter((c) => claimedElsewhere.has(c));

  if (skipped.length) {
    logger.info(`Leaving ${skipped.join(",")} with their own region(s).`);
  }

  if (!toAdd.length) {
    logger.info(`"${europe.name}" already covers every target country.`);
  } else {
    await updateRegionsWorkflow(container).run({
      input: {
        selector: { id: europe.id },
        update: { countries: [...existing, ...toAdd] },
      },
    });
    logger.info(
      `Added ${toAdd.length} countries to "${europe.name}": ${toAdd.join(",")}`
    );
  }

  // ——— Tax regions ———
  // Medusa resolves tax per country, not per region. Without a tax region a
  // cart in that country throws at the totals step rather than degrading, so
  // this is not optional.
  const { data: taxRegions } = await query.graph({
    entity: "tax_region",
    fields: ["id", "country_code"],
  });
  const haveTax = new Set(taxRegions.map((t: any) => t.country_code));
  const missingTax = EUROPE.filter((c) => !haveTax.has(c));

  for (const country_code of missingTax) {
    try {
      await createTaxRegionsWorkflow(container).run({
        input: [{ country_code, provider_id: "tp_system" }],
      });
    } catch (e) {
      logger.warn(`Tax region ${country_code}: ${(e as Error).message}`);
    }
  }
  logger.info(
    missingTax.length
      ? `Created ${missingTax.length} tax region(s): ${missingTax.join(",")}`
      : "All tax regions already present."
  );

  // ——— Service zone ———
  // Shipping options hang off a geo zone. A country in the region but not in
  // the zone reaches checkout and is offered no shipping method at all.
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

  let widened = 0;
  for (const set of fulfillmentSets) {
    for (const zone of set.service_zones || []) {
      const zoneCountries = new Set(
        (zone.geo_zones || []).map((g: any) => g.country_code)
      );
      // The Europe zone is the one already serving the region's countries;
      // matching on membership rather than on a name we do not control.
      const isEuropeZone = [...existing].some((c) => zoneCountries.has(c));
      if (!isEuropeZone) continue;

      const zoneMissing = EUROPE.filter(
        (c) => !zoneCountries.has(c) && !claimedElsewhere.has(c)
      );
      if (!zoneMissing.length) {
        logger.info(`Service zone "${zone.name}" already covers everything.`);
        continue;
      }

      await fulfillmentModuleService.updateServiceZones(zone.id, {
        geo_zones: [
          ...(zone.geo_zones || []).map((g: any) => ({
            type: "country" as const,
            country_code: g.country_code,
          })),
          ...zoneMissing.map((country_code) => ({
            type: "country" as const,
            country_code,
          })),
        ],
      });
      widened++;
      logger.info(
        `Added ${zoneMissing.length} countries to service zone "${zone.name}": ${zoneMissing.join(",")}`
      );
    }
  }

  if (!widened) {
    logger.warn(
      "No service zone was widened — check that the Europe geo zone exists, " +
        "or new countries will have no shipping options at checkout."
    );
  }

  logger.info("Done.");
}
