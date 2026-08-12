import { MedusaContainer } from "@medusajs/framework";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { updateRegionsWorkflow } from "@medusajs/medusa/core-flows";

/**
 * Charge Swedish VAT, without changing a single price.
 *
 * A sandbox order to Stockholm completed with tax_total: 0. The tax regions
 * were created so carts would not throw at the totals step, and no rate was
 * ever attached — so every Swedish sale was being made with no VAT accounted
 * for at all. That is not a rounding problem: it is 20% of each order's value
 * that belongs to Skatteverket and was silently being kept as margin.
 *
 * The fix has to be tax-INCLUSIVE, which is the part worth getting right.
 * Swedish and EU consumer law requires the price shown to a consumer to be
 * the price they pay, VAT included. Adding 25% on top would reprice the whole
 * shop overnight — a 499 kr tee becomes 623.75 at checkout, which is both
 * illegal to display the old way and a conversion disaster.
 *
 * So: mark the region tax-inclusive and attach a 25% rate. The customer still
 * pays 499 kr. Medusa now splits it into 399.20 net and 99.80 VAT, which is
 * what the accounts need and what the receipt should show.
 *
 * Scope is Sweden only, deliberately. The Europe region spans 31 countries
 * whose rates differ (19% DE, 20% FR, 25% DK...), the US is sales tax with
 * nexus rules, and Rest of World is outside VAT entirely. Those need their own
 * decisions rather than a number copied across.
 *
 *   npx medusa exec ./src/scripts/set-swedish-vat.ts
 */

const RATE = 25;
const COUNTRY = "se";

export default async function setSwedishVat({
  container,
}: {
  container: MedusaContainer;
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const tax = container.resolve(Modules.TAX);

  // ——— Region must be tax-inclusive, or the rate lands on top of the price ———
  const { data: regions } = await query.graph({
    entity: "region",
    fields: ["id", "name", "currency_code", "is_tax_inclusive", "countries.iso_2"],
  });
  const se = regions.find((r: any) =>
    (r.countries || []).some((c: any) => c?.iso_2 === COUNTRY)
  );
  if (!se) {
    logger.error(`No region contains ${COUNTRY}.`);
    return;
  }
  logger.info(
    `Region "${se.name}" is_tax_inclusive=${(se as any).is_tax_inclusive}`
  );

  if (!(se as any).is_tax_inclusive) {
    await updateRegionsWorkflow(container).run({
      input: { selector: { id: se.id }, update: { is_tax_inclusive: true } },
    });
    logger.info(`Set "${se.name}" to tax-inclusive pricing.`);
  }

  // ——— The rate itself ———
  const { data: taxRegions } = await query.graph({
    entity: "tax_region",
    fields: ["id", "country_code"],
  });
  const region = taxRegions.find((t: any) => t.country_code === COUNTRY);
  if (!region) {
    logger.error(`No tax region for ${COUNTRY}. Run the region setup first.`);
    return;
  }

  const existing = await tax.listTaxRates({ tax_region_id: region.id });
  const def = existing.find((r: any) => r.is_default);

  if (def) {
    if (Number(def.rate) === RATE) {
      logger.info(`Default rate already ${RATE}% — nothing to do.`);
    } else {
      await tax.updateTaxRates(def.id, { rate: RATE });
      logger.info(`Updated default rate ${def.rate}% -> ${RATE}%.`);
    }
  } else {
    await tax.createTaxRates([
      {
        tax_region_id: region.id,
        name: "Moms",
        code: "SE-VAT",
        rate: RATE,
        is_default: true,
      },
    ]);
    logger.info(`Created ${RATE}% default rate ("Moms") for ${COUNTRY}.`);
  }

  const after = await tax.listTaxRates({ tax_region_id: region.id });
  for (const r of after) {
    logger.info(
      `  ${r.code || r.name}: ${r.rate}%${r.is_default ? " (default)" : ""}`
    );
  }
  logger.info(
    "Done. A 499 kr tee should still total 499 kr, now split ~399.20 + 99.80 VAT."
  );
}
