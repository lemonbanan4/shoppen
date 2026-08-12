import { MedusaContainer } from "@medusajs/framework";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

/**
 * Make Swedish prices VAT-inclusive, via the mechanism that actually exists.
 *
 * Three earlier attempts put is_tax_inclusive on the region (workflow, then
 * module) and on the price record. All three reported success and changed
 * nothing, because in Medusa 2.17 neither model carries that column.
 *
 * Reading the installed code rather than guessing found the real path:
 *
 *   pricing-module.js       is_calculated_price_tax_inclusive:
 *                             isTaxInclusive(rules, PREFERENCES, currency, region)
 *   models/price-preference.js   is_tax_inclusive: boolean, default false
 *   prepare-line-item-data.js    is_tax_inclusive: !!isTaxInclusive
 *   totals/line-item/index.js    isTaxInclusive = item.is_tax_inclusive
 *
 * So inclusivity is a PricePreference keyed on currency_code or region_id.
 * The calculated price picks it up, the line item inherits it, and the totals
 * calculation divides the tax out of the price instead of adding it on.
 *
 * Keyed on region_id rather than currency_code: SEK is only used by Sweden,
 * but region is the thing that actually maps to a VAT jurisdiction, and a
 * currency-wide rule would silently follow SEK anywhere it turned up later.
 *
 * Restores the 25% rate once the preference is in place. Order matters — with
 * the rate live and the preference missing, a 499 kr tee quotes 623.74 at
 * checkout, which is what happened the first time.
 *
 *   npx medusa exec ./src/scripts/set-price-preference-vat.ts
 */

const COUNTRY = "se";
const RATE = 25;

export default async function setPricePreferenceVat({
  container,
}: {
  container: MedusaContainer;
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const pricing = container.resolve(Modules.PRICING);
  const tax = container.resolve(Modules.TAX);

  const { data: regions } = await query.graph({
    entity: "region",
    fields: ["id", "name", "currency_code", "countries.iso_2"],
  });
  const se = (regions as any[]).find((r) =>
    (r.countries || []).some((c: any) => c?.iso_2 === COUNTRY)
  );
  if (!se) {
    logger.error(`No region contains ${COUNTRY}.`);
    return;
  }

  const existing = await pricing.listPricePreferences({
    attribute: "region_id",
    value: se.id,
  });
  logger.info(
    `Existing preference for region ${se.name}: ` +
      (existing.length
        ? `is_tax_inclusive=${(existing[0] as any).is_tax_inclusive}`
        : "none")
  );

  if (existing.length) {
    // (id, data) — not an array. createPricePreferences takes a list and
    // update does not, which is easy to mirror by eye and does not compile.
    await pricing.updatePricePreferences(existing[0].id, {
      is_tax_inclusive: true,
    } as any);
    logger.info("Updated preference to tax-inclusive.");
  } else {
    await pricing.createPricePreferences([
      {
        attribute: "region_id",
        value: se.id,
        is_tax_inclusive: true,
      } as any,
    ]);
    logger.info(`Created tax-inclusive preference for region ${se.id}.`);
  }

  const after = await pricing.listPricePreferences({
    attribute: "region_id",
    value: se.id,
  });
  logger.info(
    `Now: is_tax_inclusive=${(after[0] as any)?.is_tax_inclusive}`
  );
  if (!(after[0] as any)?.is_tax_inclusive) {
    logger.error("Preference did not stick — leaving the rate at 0.");
    return;
  }

  const { data: taxRegions } = await query.graph({
    entity: "tax_region",
    fields: ["id", "country_code"],
  });
  const tr = (taxRegions as any[]).find((t) => t.country_code === COUNTRY);
  const rates = tr ? await tax.listTaxRates({ tax_region_id: tr.id }) : [];
  for (const r of rates as any[]) {
    await tax.updateTaxRates(r.id, { rate: RATE });
    logger.info(`Set ${r.code || r.name} to ${RATE}%.`);
  }

  logger.info(
    "Done. A 499 kr tee must still total 499 kr, with ~99.80 shown as VAT."
  );
}
