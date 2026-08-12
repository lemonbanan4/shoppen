import { MedusaContainer } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { updateRegionsWorkflow } from "@medusajs/medusa/core-flows";

/**
 * Stop selling into the EU, reversibly.
 *
 * Selling to EU consumers from a US LLC means Union OSS: a registration in the
 * member state the goods dispatch from, a fiscal representative, and quarterly
 * filings — real money, against EU revenue that does not exist yet. And there
 * is no threshold to hide under: a non-EU seller owes destination VAT from the
 * first sale. So the EU stays shut until the volume justifies the compliance.
 *
 * Empties the Europe region of its countries rather than deleting it. Deleting
 * would take the EUR prices, the shipping options and the service zone with
 * it, and rebuilding all of that later is a project; emptying is one command
 * out and one command back. The region sits dormant with everything intact.
 *
 * Sweden is deliberately untouched. It is Ångerköp's home market and its only
 * one — removing it would end that brand rather than pause a market.
 *
 * Worth being clear about what this does NOT do: Solkast can still take a
 * Swedish order, and that is an EU sale made by a US company. If Solkast is to
 * have no EU exposure at all, the Sweden region also has to be hidden from the
 * Solkast storefront — a storefront filter, not a backend change, since the
 * region has to keep existing for Ångerköp.
 *
 *   npx medusa exec ./src/scripts/pause-eu-selling.ts          # close the EU
 *   npx medusa exec ./src/scripts/pause-eu-selling.ts restore  # reopen it
 */

const EUROPE = "Europe";

// The full country list, kept here so reopening does not depend on anyone
// remembering it. 26 EU member states plus the five non-EU countries that were
// grouped in with them.
const COUNTRIES = [
  "at", "be", "bg", "ch", "cy", "cz", "de", "dk", "ee", "es", "fi", "fr",
  "gb", "gr", "hr", "hu", "ie", "is", "it", "li", "lt", "lu", "lv", "mt",
  "nl", "no", "pl", "pt", "ro", "si", "sk",
];

export default async function pauseEuSelling({
  container,
  args,
}: {
  container: MedusaContainer;
  args: string[];
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const restore = (args?.[0] || "").toLowerCase() === "restore";

  const { data: regions } = await query.graph({
    entity: "region",
    fields: ["id", "name", "currency_code", "countries.iso_2"],
  });
  const europe = (regions as any[]).find((r) => r.name === EUROPE);
  if (!europe) {
    logger.error(`No "${EUROPE}" region found.`);
    return;
  }

  const before = (europe.countries || []).map((c: any) => c.iso_2).filter(Boolean);
  logger.info(`"${EUROPE}" currently serves ${before.length} country(ies).`);

  await updateRegionsWorkflow(container).run({
    input: {
      selector: { id: europe.id },
      update: { countries: restore ? COUNTRIES : [] },
    },
  });

  const { data: after } = await query.graph({
    entity: "region",
    fields: ["id", "name", "countries.iso_2"],
    filters: { id: europe.id },
  });
  const now = ((after as any[])[0]?.countries || [])
    .map((c: any) => c.iso_2)
    .filter(Boolean);

  logger.info(
    restore
      ? `Reopened: "${EUROPE}" serves ${now.length} country(ies) again.`
      : `Closed: "${EUROPE}" serves ${now.length} country(ies). ` +
        `Prices, shipping options and the service zone are untouched.`
  );

  // Show what the shop can still reach, so the result is not taken on trust.
  const { data: fresh } = await query.graph({
    entity: "region",
    fields: ["name", "currency_code", "countries.iso_2"],
  });
  let total = 0;
  for (const r of fresh as any[]) {
    const n = (r.countries || []).length;
    total += n;
    logger.info(`  ${r.name}: ${n} country(ies) [${r.currency_code.toUpperCase()}]`);
  }
  logger.info(`Sellable countries: ${total}`);
}
