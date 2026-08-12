import { MedusaContainer } from "@medusajs/framework";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { createTaxRegionsWorkflow } from "@medusajs/medusa/core-flows";

/**
 * Union OSS scaffolding: destination-country VAT, switched off until it is legal
 * to switch it on.
 *
 * Under OSS a B2C sale is taxed at the rate of the customer's own country, so
 * the shop needs a rate per member state rather than one rate for "Europe".
 * That is what this builds. It runs at 0% by default: collecting VAT without a
 * registration number is worse than collecting none, because there is nowhere
 * to remit it and the customer has been charged anyway.
 *
 * Two things worth knowing about the setup this sits on:
 *
 * The goods are not imported. Printful manufactures and dispatches EU orders
 * from its EU facility — a Stockholm quote returns 3-4 days and Berlin 4 days,
 * both at EUR 4.46, which is not a transatlantic route. So these are intra-EU
 * distance sales, which is Union OSS. IOSS covers goods imported under EUR 150
 * and does not apply here; Non-Union OSS covers services and does not either.
 *
 * The "Europe" region is not the EU. It holds 31 countries, five of which sit
 * outside EU VAT entirely — ch, gb, is, li, no. Those are exports: zero-rated
 * here, with the customer meeting their own import charges on arrival. Charging
 * them EU VAT would be simply wrong, and lumping them in is the easiest mistake
 * to make when a region is treated as a tax jurisdiction.
 *
 * Prices stay as displayed. The rates are applied tax-INCLUSIVE via a
 * PricePreference, so a EUR 45 tee stays EUR 45 in every country and the VAT is
 * divided out of it — 19% in Germany, 25% in Denmark. Net margin therefore
 * varies slightly by country, which is normal for EU B2C and the reason a
 * single displayed price is legal.
 *
 *   npx medusa exec ./src/scripts/setup-eu-vat.ts          # rates at 0
 *   npx medusa exec ./src/scripts/setup-eu-vat.ts live     # apply real rates
 *   npx medusa exec ./src/scripts/setup-eu-vat.ts report   # show current state
 */

/**
 * Standard VAT rates, for the day the registration comes through.
 *
 * VERIFY THESE BEFORE RUNNING `live`. Member states move their standard rate
 * with little ceremony — Finland went to 25.5% in 2024, Slovakia to 23% in
 * 2025 — and a stale table charges the wrong tax rather than failing loudly.
 * They live in one place here so correcting one is a one-line edit.
 */
const EU_RATES: Record<string, number> = {
  at: 20, be: 21, bg: 20, cy: 19, cz: 21, de: 19, dk: 25, ee: 22,
  es: 21, fi: 25.5, fr: 20, gr: 24, hr: 25, hu: 27, ie: 23, it: 22,
  lt: 21, lu: 17, lv: 21, mt: 18, nl: 21, pl: 23, pt: 23, ro: 21,
  se: 25, si: 22, sk: 23,
};

/** In the Europe region, outside EU VAT. Exports — zero-rated, never OSS. */
const NON_EU = ["ch", "gb", "is", "li", "no"];

export default async function setupEuVat({
  container,
  args,
}: {
  container: MedusaContainer;
  args: string[];
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const tax = container.resolve(Modules.TAX);
  const pricing = container.resolve(Modules.PRICING);
  const mode = (args?.[0] || "zero").toLowerCase();

  const { data: regions } = await query.graph({
    entity: "region",
    fields: ["id", "name", "currency_code", "countries.iso_2"],
  });

  // ——— Which countries do we actually sell to, and under which region ———
  const covered = new Set<string>();
  for (const r of regions as any[]) {
    for (const c of r.countries || []) if (c?.iso_2) covered.add(c.iso_2);
  }
  const euTargets = Object.keys(EU_RATES).filter((c) => covered.has(c));
  const nonEuTargets = NON_EU.filter((c) => covered.has(c));

  if (mode === "report") {
    const { data: trs } = await query.graph({
      entity: "tax_region",
      fields: ["id", "country_code"],
    });
    logger.info("Country      rate   note");
    for (const t of (trs as any[]).sort((a, b) =>
      a.country_code.localeCompare(b.country_code)
    )) {
      const rates = await tax.listTaxRates({ tax_region_id: t.id });
      const def = (rates as any[]).find((r) => r.is_default);
      const note = NON_EU.includes(t.country_code)
        ? "outside EU VAT (export)"
        : EU_RATES[t.country_code] !== undefined
        ? `EU — standard ${EU_RATES[t.country_code]}%`
        : "";
      logger.info(
        `  ${t.country_code}      ${def ? `${def.rate}%` : "—"}    ${note}`
      );
    }
    return;
  }

  // ——— Tax regions and their default rate ———
  const { data: existingTr } = await query.graph({
    entity: "tax_region",
    fields: ["id", "country_code"],
  });
  const byCountry = new Map(
    (existingTr as any[]).map((t) => [t.country_code, t])
  );

  const apply = async (country: string, rate: number, label: string) => {
    let tr = byCountry.get(country);
    if (!tr) {
      try {
        await createTaxRegionsWorkflow(container).run({
          input: [{ country_code: country, provider_id: "tp_system" }],
        });
        const { data: again } = await query.graph({
          entity: "tax_region",
          fields: ["id", "country_code"],
          filters: { country_code: country },
        });
        tr = (again as any[])[0];
      } catch (e) {
        logger.warn(`  ${country}: could not create tax region — ${(e as Error).message}`);
        return;
      }
    }
    if (!tr) return;

    const rates = await tax.listTaxRates({ tax_region_id: tr.id });
    const def = (rates as any[]).find((r) => r.is_default);
    if (def) {
      if (Number(def.rate) !== rate) {
        await tax.updateTaxRates(def.id, { rate });
        logger.info(`  ${country}: ${def.rate}% -> ${rate}%  (${label})`);
      }
    } else {
      await tax.createTaxRates([
        {
          tax_region_id: tr.id,
          name: label,
          code: `${country.toUpperCase()}-VAT`,
          rate,
          is_default: true,
        },
      ]);
      logger.info(`  ${country}: created at ${rate}%  (${label})`);
    }
  };

  logger.info(
    mode === "live"
      ? "Applying real EU rates — a registration number must already exist."
      : "Creating rates at 0%. Nothing is charged until this is run with `live`."
  );

  for (const c of euTargets) {
    await apply(c, mode === "live" ? EU_RATES[c] : 0, "VAT");
  }
  for (const c of nonEuTargets) {
    // Always zero: outside EU VAT whatever mode this runs in.
    await apply(c, 0, "Export — outside EU VAT");
  }

  // ——— Inclusivity, so the displayed price is the price paid ———
  for (const r of regions as any[]) {
    const sellsInEu = (r.countries || []).some((c: any) =>
      EU_RATES[c?.iso_2] !== undefined
    );
    if (!sellsInEu) continue;
    const prefs = await pricing.listPricePreferences({
      attribute: "region_id",
      value: r.id,
    });
    if (prefs.length) {
      await pricing.updatePricePreferences([
        { id: prefs[0].id, is_tax_inclusive: true } as any,
      ]);
    } else {
      await pricing.createPricePreferences([
        { attribute: "region_id", value: r.id, is_tax_inclusive: true } as any,
      ]);
    }
    logger.info(`  ${r.name}: prices marked tax-inclusive`);
  }

  logger.info(
    `Done. ${euTargets.length} EU countries, ${nonEuTargets.length} zero-rated ` +
      `exports. Run \`report\` to see the table.`
  );
}
