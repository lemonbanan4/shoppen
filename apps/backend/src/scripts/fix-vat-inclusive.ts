import { MedusaContainer } from "@medusajs/framework";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

/**
 * Make the Swedish 25% rate inclusive rather than additive.
 *
 * Attaching the rate alone pushed a 499 kr tee to 623.74 at checkout: the
 * region was updated through updateRegionsWorkflow with is_tax_inclusive and
 * the totals came back exclusive anyway. Either the workflow dropped the
 * field or the flag does not reach the pricing calculation on its own.
 *
 * So this reports the actual stored state first and then sets it through the
 * region module directly, which is the layer that owns the column. Reporting
 * before and after matters more than usual here — the previous attempt logged
 * a confident success and changed nothing.
 *
 * If the flag is set and totals are still exclusive, the price records carry
 * their own is_tax_inclusive and that is where the fix belongs instead.
 *
 *   npx medusa exec ./src/scripts/fix-vat-inclusive.ts
 */

const COUNTRY = "se";

export default async function fixVatInclusive({
  container,
}: {
  container: MedusaContainer;
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const regionModule = container.resolve(Modules.REGION);

  const { data: regions } = await query.graph({
    entity: "region",
    fields: ["id", "name", "is_tax_inclusive", "automatic_taxes", "countries.iso_2"],
  });

  logger.info("Before:");
  for (const r of regions as any[]) {
    logger.info(
      `  ${r.name}: is_tax_inclusive=${r.is_tax_inclusive} ` +
        `automatic_taxes=${r.automatic_taxes}`
    );
  }

  const se = (regions as any[]).find((r) =>
    (r.countries || []).some((c: any) => c?.iso_2 === COUNTRY)
  );
  if (!se) {
    logger.error(`No region contains ${COUNTRY}.`);
    return;
  }

  // Straight through the module that owns the column, rather than the
  // workflow — the workflow reported success and left the value unset.
  await regionModule.updateRegions(se.id, { is_tax_inclusive: true } as any);

  const { data: after } = await query.graph({
    entity: "region",
    fields: ["id", "name", "is_tax_inclusive"],
    filters: { id: se.id },
  });
  const now = (after as any[])[0];
  logger.info(`After: ${now?.name}: is_tax_inclusive=${now?.is_tax_inclusive}`);

  if (!now?.is_tax_inclusive) {
    logger.error(
      "Flag still not set — the pricing records own it. Prices must be " +
        "updated with is_tax_inclusive instead."
    );
    return;
  }
  logger.info(
    "Set. Re-check a Stockholm cart: a 499 kr tee must total 499 kr, " +
      "with ~99.80 shown as VAT."
  );
}
