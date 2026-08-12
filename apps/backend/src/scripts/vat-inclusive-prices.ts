import { MedusaContainer } from "@medusajs/framework";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

/**
 * Put the 25% Swedish rate inside the price instead of on top of it.
 *
 * Two earlier attempts set is_tax_inclusive on the region, through the
 * workflow and then through the module directly. Both reported success and
 * the field still reads undefined: this Medusa version does not carry that
 * column on the region at all. Tax inclusivity lives on the price record.
 *
 * Meanwhile the shop was quoting 499 kr on the product page and 623.74 at
 * checkout, which is worse than either consistent answer, so this script
 * leads with --revert to make that stop.
 *
 *   npx medusa exec ./src/scripts/vat-inclusive-prices.ts revert
 *       drops the SE rate to 0 — prices consistent again, no VAT accounted
 *
 *   npx medusa exec ./src/scripts/vat-inclusive-prices.ts inspect
 *       dumps what fields a price actually has, so the fix targets something
 *       real rather than a field that quietly does not exist
 *
 *   npx medusa exec ./src/scripts/vat-inclusive-prices.ts apply
 *       marks every SEK price tax-inclusive and restores the 25% rate
 */

const COUNTRY = "se";
const CURRENCY = "sek";
const RATE = 25;

export default async function vatInclusivePrices({
  container,
  args,
}: {
  container: MedusaContainer;
  args: string[];
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const tax = container.resolve(Modules.TAX);
  const mode = (args?.[0] || "inspect").toLowerCase();

  const { data: taxRegions } = await query.graph({
    entity: "tax_region",
    fields: ["id", "country_code"],
  });
  const tr = (taxRegions as any[]).find((t) => t.country_code === COUNTRY);

  if (mode === "revert") {
    const rates = tr ? await tax.listTaxRates({ tax_region_id: tr.id }) : [];
    for (const r of rates as any[]) {
      await tax.updateTaxRates(r.id, { rate: 0 });
      logger.info(`Set ${r.code || r.name} to 0% (was ${r.rate}%).`);
    }
    logger.info("Reverted. Swedish carts total the displayed price again.");
    return;
  }

  if (mode === "inspect") {
    // What does a price actually look like here? Ask, rather than assume a
    // field name — assuming is how the last two attempts failed silently.
    const { data: prices } = await query.graph({
      entity: "price",
      fields: ["id", "amount", "currency_code", "is_tax_inclusive"],
      filters: { currency_code: CURRENCY },
      pagination: { take: 3 },
    } as any);
    logger.info(`Sample ${CURRENCY} prices:`);
    for (const p of (prices as any[]) || []) {
      logger.info(
        `  ${p.id} amount=${p.amount} is_tax_inclusive=${p.is_tax_inclusive}`
      );
    }
    if (!prices?.length) logger.warn("No prices returned for that filter.");
    return;
  }

  if (mode === "apply") {
    const pricing = container.resolve(Modules.PRICING);
    const { data: prices } = await query.graph({
      entity: "price",
      fields: ["id", "amount", "currency_code", "is_tax_inclusive"],
      filters: { currency_code: CURRENCY },
    } as any);
    logger.info(`${prices?.length ?? 0} ${CURRENCY} price(s) to mark inclusive.`);
    let done = 0;
    for (const p of (prices as any[]) || []) {
      if (p.is_tax_inclusive) continue;
      try {
        await (pricing as any).updatePrices([
          { id: p.id, is_tax_inclusive: true },
        ]);
        done++;
      } catch (e) {
        logger.warn(`  ${p.id}: ${(e as Error).message}`);
      }
    }
    logger.info(`Marked ${done} price(s) tax-inclusive.`);

    const rates = tr ? await tax.listTaxRates({ tax_region_id: tr.id }) : [];
    for (const r of rates as any[]) {
      await tax.updateTaxRates(r.id, { rate: RATE });
      logger.info(`Set ${r.code || r.name} to ${RATE}%.`);
    }
    logger.info("Re-check a Stockholm cart: 499 kr in, 499 kr out.");
    return;
  }

  logger.error(`Unknown mode "${mode}". Use revert | inspect | apply.`);
}
