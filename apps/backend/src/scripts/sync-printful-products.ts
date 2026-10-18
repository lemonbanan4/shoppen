import { MedusaContainer } from "@medusajs/framework";
import {
  ContainerRegistrationKeys,
  ProductStatus,
} from "@medusajs/framework/utils";
import fs from "fs";
import path from "path";
import {
  createCollectionsWorkflow,
  createProductCategoriesWorkflow,
  createProductVariantsWorkflow,
  createProductsWorkflow,
  deleteCollectionsWorkflow,
  deleteProductCategoriesWorkflow,
  deleteProductsWorkflow,
  deleteProductVariantsWorkflow,
  updateProductsWorkflow,
} from "@medusajs/medusa/core-flows";
import {
  PrintfulClient,
  PrintfulSyncProductDetail,
  PrintfulSyncVariant,
} from "../lib/printful-client";
import { convertToStorePrices, fetchExchangeRates, STORE_CURRENCIES } from "../lib/pricing";
import { displayTitle, toHandle } from "../lib/product-naming";
import createBundlePromotion from "./create-bundle-promotion";

/**
 * Syncs the Printful catalog (embroidery pieces) into this store.
 *
 *   npx medusa exec ./src/scripts/sync-printful-products.ts
 *
 * Safe to re-run: previously synced products are replaced with the latest
 * Printful data. Requires PRINTFUL_API_TOKEN in apps/backend/.env.
 *
 * Unlike Printify, Printful quotes each variant's retail price in its own
 * currency already (no single shop-wide currency), so that variant's own
 * currency is used as the FX source for converting into every other store
 * currency, then rounded to a psychological ("charm") .99 price unless
 * PRINTFUL_PSYCHOLOGICAL_ROUNDING=false.
 */

// The Printful store this run is syncing. Stamped onto every product so the
// pruning pass can tell "not in this store's catalogue any more" apart from
// "belongs to a different store entirely".
const PRINTFUL_STORE_ID = process.env.PRINTFUL_STORE_ID || "";

const MAX_IMAGES = 6;

// Homepage rail placement: the newest two capsules read as "New Arrivals",
// the first capsule plus the core brand line as "Bestsellers" (a launch-order
// proxy — this store has no sales history yet to base it on for real).
const NEW_ARRIVALS_TITLES = new Set([
  "AEON // HEAVYWEIGHT BEANIE",
  "AEON // MIND MATRIX HEAVYWEIGHT TEE",
  "AEON // HORIZON HEAVYWEIGHT TEE",
  "AEON // CHROMED HEAVYWEIGHT ZIP-UP",
  "ORKAR INTE Tee",
  "VARNING: Impulsköp Tee",
  "CAN'T EVEN Tee",
  "LAGOM DELULU Tee",
  "DET LÖSER SIG Tee",
  "UTBRÄND MEN MYSIG Tee",
]);

// Mugs are the sub-200 kr entry tier rather than part of the tee drop, so
// they sit on the second homepage rail with the hoodie.
const BESTSELLER_TITLES = new Set([
  "AEON // HORIZON HEAVYWEIGHT HOODIE",
  "AEON // HEAVYWEIGHT SWEATPANTS",
  "AEON // DISTRESSED CAP",
  "AEON // HEAVYWEIGHT CANVAS TOTE",
  "ORKAR INTE Mugg",
  "UTBRÄND MEN MYSIG Mugg",
  "VARNING: Impulsköp Mugg",
]);

// Garment sizes as Printful writes them in variant names.
const SIZE_TOKEN = /^(XXS|XS|S|M|L|XL|[2-5]XL|One Size|OS)$/i;

const titleCase = (id: string) =>
  id
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

/**
 * Printful only populates `sync_variant.options` for products with real
 * catalog option metadata (apparel size/color). Simpler products — mugs,
 * stickers, etc. — report an empty array, which would otherwise leave the
 * Medusa product with zero options (rejected by createProductsWorkflow, which
 * requires at least one). Fall back to parsing the variant's own display
 * name ("{Product} / {Color} / {Size}") in that case.
 */
// Print-configuration options Printful attaches to sync variants (embroidery
// type, thread colors per placement, ...). These describe how the design is
// produced, not a choice the shopper makes — never surface them as options.
const isPrintConfigOption = (id: string) =>
  id === "embroidery_type" ||
  id.includes("thread_colors") ||
  id.startsWith("stitch") ||
  id.startsWith("lifelike") ||
  id === "notes";

const deriveVariantOptions = (v: PrintfulSyncVariant): Record<string, string> => {
  const optionValues: Record<string, string> = {};
  for (const opt of v.options || []) {
    if (isPrintConfigOption(opt.id)) {
      continue;
    }
    if (opt.value === undefined || opt.value === null || opt.value === "") {
      continue;
    }
    if (Array.isArray(opt.value) && opt.value.length === 0) {
      continue;
    }
    optionValues[titleCase(opt.id)] = String(opt.value);
  }
  if (Object.keys(optionValues).length > 0) {
    return optionValues;
  }

  // 1. Check blank's catalog name parentheses, e.g. "... (Black / S)" or "... (Black)"
  const catalogParen = v.product?.name?.match(/\(([^)]+)\)$/);
  if (catalogParen) {
    const rawParts = catalogParen[1]
      .split(/\s+\/\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (rawParts.length === 2) {
      optionValues["Color"] = rawParts[0];
      optionValues["Size"] =
        rawParts[1].toLowerCase() === "one size" ? "One Size" : rawParts[1];
      return optionValues;
    } else if (rawParts.length === 1) {
      const token = rawParts[0];
      if (SIZE_TOKEN.test(token)) {
        optionValues["Size"] =
          token.toLowerCase() === "one size" ? "One Size" : token;
      } else {
        optionValues["Color"] = token;
        optionValues["Size"] = "One Size";
      }
      return optionValues;
    }
  }

  // 2. Split on " / " (space-slash-space) to avoid splitting brand double slashes like "AEON // TITLE"
  const parts = v.name.split(/\s+\/\s+/).map((s) => s.trim());
  if (parts.length >= 2) {
    const trailing = parts.slice(1);
    if (trailing.length === 2) {
      optionValues["Color"] = trailing[0];
      optionValues["Size"] =
        trailing[1].toLowerCase() === "one size" ? "One Size" : trailing[1];
    } else if (trailing.length === 1) {
      optionValues[SIZE_TOKEN.test(trailing[0]) ? "Size" : "Color"] =
        trailing[0];
    }
  } else {
    optionValues["Size"] = "One Size";
  }

  if (Object.keys(optionValues).length === 0) {
    optionValues["Variant"] = v.name;
  }
  return optionValues;
};

// Storefront department for a product, inferred from its name. Everything
// also stays in Print on Demand; this keeps the Apparel/Accessories category
// pages populated now that the demo catalog is gone.
const classifyDepartment = (name: string): string => {
  const n = name.toLowerCase();
  if (/\b(cap|hat|beanie)\b/.test(n)) return "accessories";
  if (/\b(tote|bag|backpack)\b/.test(n)) return "accessories";
  // "mugg" is the Swedish spelling used by the svenska capsule.
  if (/\b(mug|mugg|cup|poster|bottle|blanket)\b/.test(n)) return "home-goods";
  return "apparel";
};

// Fit, from the blank's own catalog title (Printful is explicit: "Unisex
// ...", "Women's ...", "Men's ..."), falling back to garment type for the
// cut-and-sew women's pieces whose titles omit it.
const WOMENS_PATTERN =
  /\bwomen'?s?\b|\bsports bra\b|\bcrop top\b|\bleggings\b|\bbodycon\b|\bskater dress\b/;
const MENS_PATTERN = /\bmen'?s?\b|\bboard shorts\b|\bswim trunks\b/;

const classifyFit = (
  productName: string,
  catalogTitle: string | undefined
): "womens" | "mens" | "unisex" => {
  // The blank's own catalog title is authoritative and decides alone —
  // Printful always states the cut ("Unisex Organic Cotton Creator 2.0").
  // The product name is only consulted when the title is silent, because
  // our own titles are prose and collide: "UTBRÄND MEN MYSIG" ("burnt out
  // but cosy") matched \bmen\b and filed a unisex tee under Men's.
  const title = (catalogTitle ?? "").toLowerCase();
  if (WOMENS_PATTERN.test(title)) return "womens";
  if (MENS_PATTERN.test(title)) return "mens";

  // Fall back to the product name only for cut-and-sew pieces whose catalog
  // titles omit the cut, and only on garment-type words — never on a bare
  // "men"/"women", which is where the prose collision happens.
  const name = productName.toLowerCase();
  if (/\bsports bra\b|\bcrop top\b|\bleggings\b|\bbodycon\b|\bskater dress\b/.test(name)) {
    return "womens";
  }
  if (/\bboard shorts\b|\bswim trunks\b/.test(name)) return "mens";
  return "unisex";
};

const FIT_CATEGORIES: { handle: string; name: string; description: string }[] = [
  { handle: "womens", name: "Women's", description: "Cut for a women's fit." },
  { handle: "mens", name: "Men's", description: "Cut for a men's fit." },
  {
    handle: "unisex",
    name: "Unisex",
    description: "Straight, oversized cuts made to fit everyone.",
  },
];

/**
 * Our own opening line per product, replacing Printful's.
 *
 * Printful's intro is written to sell a blank to anyone — "Whether you're
 * drinking your morning coffee, evening tea, or something in between" — which
 * on a Swedish deadpan storefront is the one place the brand voice drops out.
 * The spec bullets underneath are left alone on purpose: they are factual,
 * they are in English (so a non-Swedish buyer still gets material, weight and
 * care), and hand-writing them here would let them drift from the real blank.
 *
 * Keyed by product name. Anything not listed keeps Printful's intro, so a new
 * product still syncs sensibly before someone writes copy for it.
 */
const PRODUCT_LEADS: Record<string, string> = {
  "AEON // HEAVYWEIGHT BEANIE":
    "Heavyweight ribbed knit beanie engineered for cold-weather insulation. Finished with precision high-density cyber-sigilism embroidery.",
  "AEON // DISTRESSED CAP":
    "Heavyweight vintage-washed cotton twill cap featuring distressed brim detailing and precision tonal embroidery.",
  "AEON // HORIZON HEAVYWEIGHT HOODIE":
    "Heavyweight 400 GSM organic cotton fleece hoodie engineered with an oversized architectural drape and high-definition DTG artwork.",
  "AEON // CHROMED HEAVYWEIGHT ZIP-UP":
    "Heavyweight brushed fleece zip-up hoodie featuring double-layer hood construction, custom chrome hardware, and high-definition DTG cyber-sigilism graphics.",
  "AEON // HEAVYWEIGHT SWEATPANTS":
    "Oversized 400 GSM organic cotton sweatpants featuring deep welt pockets, elasticated cuffs, and relaxed streetwear fit.",
  "AEON // HORIZON HEAVYWEIGHT TEE":
    "Ultra-heavyweight 240 GSM organic cotton oversized high-neck tee featuring front and back high-density DTG graphics.",
  "AEON // MIND MATRIX HEAVYWEIGHT TEE":
    "Ultra-heavyweight 240 GSM organic cotton oversized tee with precision high-definition cyber-sigilism DTG artwork.",
  "AEON // HEAVYWEIGHT CANVAS TOTE":
    "Heavyweight 100% organic cotton canvas tote engineered with reinforced stress points and durable shoulder straps.",
  "ORKAR INTE Tee":
    "För dagar då duschen är ett projekt. Tung ekologisk bomull som tål att bäras tre dagar i rad — vilket är ungefär vad som kommer att hända.",
  "VARNING: Impulsköp Tee":
    "En varningsetikett för dig som redan lagt varan i kundvagnen kl 02:47. Gult på svart, syns tvärs över rummet — precis som en varning ska.",
  "LAGOM DELULU Tee":
    "Exakt rätt mängd osund optimism. Mätaren står stilla i mitten, för svensk måttfullhet gäller även när man lurar sig själv.",
  "CAN'T EVEN Tee":
    "Ingen översättning behövs. Två ord som sköter hela dagens kommunikation åt dig.",
  "DET LÖSER SIG Tee":
    "Sveriges mest använda plan. Parentesen längst ner är den ärliga delen.",
  "UTBRÄND MEN MYSIG Tee":
    "Trasig, men i mjukt tyg. Första ordet skriker, andra viskar — ungefär som veckan du precis haft.",
  "ORKAR INTE Hoodie":
    "Samma rad, tyngre plagg. Mid-weight hoodie i ekologisk bomull för dagar då även t-shirten kändes ambitiös.",
  "ORKAR INTE Mugg":
    "För morgonen då kaffet är enda anledningen att gå upp. Trycket håller längre än din motivation.",
  "UTBRÄND MEN MYSIG Mugg":
    "Till teet du dricker under filten. Erkänner läget utan att göra någon stor grej av det.",
  "VARNING: Impulsköp Mugg":
    "Ställ den på skrivbordet som en påminnelse. Den kommer inte hjälpa, men den är åtminstone ärlig.",
};

/**
 * Product copy from the blank's catalog description. Printful writes these
 * as a short intro paragraph followed by bullet-point specs; keep the intro
 * and the material/weight/fit bullets, drop sourcing boilerplate that reads
 * oddly on a storefront.
 */
const buildDescription = (
  productName: string,
  catalogDescription: string | undefined
): string => {
  const lead = PRODUCT_LEADS[productName];
  if (!catalogDescription) return lead ?? "";
  const [intro, ...rest] = catalogDescription.split("\n•");
  const bullets = rest
    .map((b) => b.trim().replace(/\s+/g, " "))
    .filter(
      (b) =>
        b &&
        !/blank product|sourced from|the sizes correspond|important:/i.test(b)
    )
    .slice(0, 8);

  return [lead ?? intro.trim().replace(/\s+/g, " "), ...bullets.map((b) => `• ${b}`)]
    .join("\n")
    .trim();
};

// Condensed, render-ready size table stored on the product for the PDP.
export type SizeGuide = {
  unit: string;
  sizes: string[];
  rows: { label: string; values: Record<string, string> }[];
};

const condenseSizeGuide = (
  raw: Awaited<ReturnType<PrintfulClient["getProductSizes"]>>
): SizeGuide | null => {
  if (!raw?.size_tables?.length) return null;
  const table =
    raw.size_tables.find((t) => t.type === "product_measure") ||
    raw.size_tables[0];
  const sizes = raw.available_sizes || [];
  const rows = (table.measurements || [])
    .map((m) => {
      const values: Record<string, string> = {};
      for (const v of m.values || []) {
        if (!v.size) continue;
        values[v.size] =
          v.value ?? [v.min_value, v.max_value].filter(Boolean).join("–");
      }
      return { label: m.type_label, values };
    })
    .filter((r) => Object.keys(r.values).length);
  if (!rows.length) return null;
  return { unit: table.unit || "cm", sizes, rows };
};

/**
 * Readable product URL: /products/explorers-club-oversized-tee rather than
 * /products/printful-451903742. The words in a URL are a ranking signal and
 * the link is visible whenever someone shares a product, so the id-based
 * handle was costing us on both.
 *
 * Printful names can be long ("... unisex organic oversized high neck
 * t-shirt"), so cut to ~60 characters on a word boundary. Handles must be
 * unique, so `taken` carries the slugs already assigned in this run and a
 * collision falls back to appending the Printful id.
 */

const toMedusaProduct = (
  detail: PrintfulSyncProductDetail,
  ctx: {
    categoryId: string;
    categoryIdByHandle: Map<string, string>;
    sizeGuideByCatalogId: Map<number, SizeGuide | null>;
    catalogInfoById: Map<number, { title: string; description: string } | null>;
    newArrivalsCollectionId: string;
    bestsellersCollectionId: string;
    aeonCollectionId?: string;
    salesChannelId: string;
    shippingProfileId: string;
    exchangeRatesByCurrency: Map<string, Record<string, number>>;
    psychologicalRounding: boolean;
    takenHandles: Set<string>;
  }
) => {
  const { sync_product: p, sync_variants: variants } = detail;
  const name = displayTitle(p.name);

  // Prefer each variant's generated mockup (the design actually applied to
  // the garment) over `product.image`, which is just the blank catalog photo.
  // API-created products expose it as a "preview" file; dashboard-created
  // ones only carry a (non-visible) "mockup" file, which is equally usable.
  const candidateImages = [
    (p as any).thumbnail_url,
    ...variants.map(
      (v) =>
        v.files?.find((f) => f.type === "preview")?.preview_url ||
        v.files?.find((f) => f.type === "mockup")?.preview_url ||
        v.product?.image
    ),
  ].filter((url): url is string => Boolean(url));

  const images = candidateImages
    .filter((url, idx, arr) => arr.indexOf(url) === idx)
    .slice(0, MAX_IMAGES);

  const variantOptions = variants.map((v) => deriveVariantOptions(v));

  const optionTitles = new Map<string, Set<string>>();
  for (const optionValues of variantOptions) {
    for (const [title, value] of Object.entries(optionValues)) {
      if (!optionTitles.has(title)) optionTitles.set(title, new Set());
      optionTitles.get(title)!.add(value);
    }
  }
  const options = [...optionTitles.entries()].map(([title, values]) => ({
    title,
    values: [...values],
  }));

  return {
    title: name,
    handle: toHandle(name, p.id, ctx.takenHandles),
    description: buildDescription(
      name,
      variants[0]?.product?.product_id
        ? ctx.catalogInfoById.get(variants[0].product.product_id)?.description
        : undefined
    ),
    status: ProductStatus.PUBLISHED,
    category_ids: [
      ctx.categoryId,
      ...(ctx.categoryIdByHandle.has(classifyDepartment(name))
        ? [ctx.categoryIdByHandle.get(classifyDepartment(name))!]
        : []),
      ...(NEW_ARRIVALS_TITLES.has(name) && ctx.categoryIdByHandle.has("new-arrivals")
        ? [ctx.categoryIdByHandle.get("new-arrivals")!]
        : []),
      ...(BESTSELLER_TITLES.has(name) && ctx.categoryIdByHandle.has("bestsellers")
        ? [ctx.categoryIdByHandle.get("bestsellers")!]
        : []),
      ...(() => {
        // Fit categories describe how a garment is cut; a mug or a poster
        // has no fit, and filing one under "Unisex" makes that page lie.
        if (classifyDepartment(name) !== "apparel") return [];
        const fit = classifyFit(
          name,
          variants[0]?.product?.product_id
            ? ctx.catalogInfoById.get(variants[0].product.product_id)?.title
            : undefined
        );
        const id = ctx.categoryIdByHandle.get(fit);
        return id ? [id] : [];
      })(),
    ],
    collection_id:
      ctx.aeonCollectionId ||
      (BESTSELLER_TITLES.has(name) || !NEW_ARRIVALS_TITLES.has(name)
        ? ctx.bestsellersCollectionId
        : ctx.newArrivalsCollectionId),
    shipping_profile_id: ctx.shippingProfileId,
    thumbnail: images[0] || (p as any).thumbnail_url || null,
    images: images.map((url) => ({ url })),
    options,
    metadata: {
      printful_product_id: p.id,
      // Which Printful store this came from. The pruning pass below deletes
      // any Printful product it does not see upstream, so without this a
      // second store's products would be wiped every time this store synced.
      printful_store_id: PRINTFUL_STORE_ID,
      fulfillment: "printful",
      ...(() => {
        const catalogId = variants[0]?.product?.product_id;
        const guide = catalogId
          ? ctx.sizeGuideByCatalogId.get(catalogId)
          : null;
        return guide ? { size_guide: JSON.stringify(guide) } : {};
      })(),
    },
    variants: variants.map((v: PrintfulSyncVariant, i: number) => {
      const optionValues = variantOptions[i];

      const sourceCurrency = (v.currency || "usd").toLowerCase();
      const exchangeRates = ctx.exchangeRatesByCurrency.get(sourceCurrency)!;
      const sourceAmount = parseFloat(v.retail_price);

      return {
        title: v.name,
        sku: v.sku || undefined,
        options: optionValues,
        manage_inventory: false,
        metadata: { printful_variant_id: v.id },
        prices: convertToStorePrices(
          sourceAmount,
          exchangeRates,
          ctx.psychologicalRounding
        ),
      };
    }),
    sales_channels: [{ id: ctx.salesChannelId }],
  };
};

// ——— Types for the existence-check helpers ———
type ExistingProduct = {
  id: string;
  title?: string;
  handle?: string;
  metadata?: Record<string, unknown> | null;
  options?: { id: string; title: string; values?: { value: string }[] }[];
  variants?: { id: string; metadata?: Record<string, unknown> | null }[];
};
type DesiredOption = { title: string; values: string[] };

/**
 * Does the live product already declare exactly the same options (by set
 * equality) as the desired input? Compared as sets so ordering never matters.
 */
function sameOptions(existing: ExistingProduct, desired: DesiredOption[]): boolean {
  const norm = (title: string, values: string[]) =>
    `${title}:${[...values].sort().join("|")}`;
  const a = new Set(
    (existing.options || []).map((o) =>
      norm(o.title as string, (o.values || []).map((v) => v.value))
    )
  );
  const b = new Set(desired.map((o) => norm(o.title, o.values)));
  return a.size === b.size && [...b].every((x) => a.has(x));
}

/**
 * Add variants that are missing from an existing product. Variants are matched
 * on printful_variant_id stored in their metadata; unrecognised ones (variants
 * that existed in Medusa but no longer exist in Printful) are removed.
 * Variants that already exist are left entirely untouched — their title,
 * options, and prices are preserved as the user may have edited them.
 */
async function addMissingVariants(
  container: MedusaContainer,
  existing: ExistingProduct,
  desired: any[],
  logger: any
): Promise<void> {
  const liveByPrintfulId = new Map(
    (existing.variants || []).map((v) => [
      String((v.metadata as Record<string, unknown> | null)?.printful_variant_id),
      v,
    ])
  );

  const toCreate: any[] = [];
  const matched = new Set<string>();

  for (const d of desired) {
    const key = String(d.metadata?.printful_variant_id);
    const live = liveByPrintfulId.get(key);
    if (live) {
      matched.add(live.id);
    } else {
      toCreate.push(d);
    }
  }

  // Variants no longer in Printful should be removed.
  const toDelete = (existing.variants || [])
    .filter((v) => !matched.has(v.id))
    .map((v) => v.id);

  if (toCreate.length) {
    await createProductVariantsWorkflow(container).run({
      input: {
        product_variants: toCreate.map((v) => ({
          ...v,
          product_id: existing.id,
        })) as never,
      },
    });
  }
  if (toDelete.length) {
    await deleteProductVariantsWorkflow(container).run({
      input: { ids: toDelete },
    });
  }
  if (toCreate.length || toDelete.length) {
    logger.info(
      `      variants: ${matched.size} kept, ${toCreate.length} added, ${
        toDelete.length
      } removed`
    );
  }
}

export default async function syncPrintfulProducts({
  container,
}: {
  container: MedusaContainer;
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  try {
    const { Client } = require("pg");
    if (process.env.DATABASE_URL) {
      const client = new Client({ connectionString: process.env.DATABASE_URL });
      await client.connect();
      await client.query(
        "UPDATE product SET handle = handle || '-del-' || substring(id, 6, 8) WHERE deleted_at IS NOT NULL AND handle NOT LIKE '%-del-%'"
      );
      await client.end();
    }
  } catch (err: any) {
    logger.warn(`Could not prune deleted product handles in postgres: ${err.message}`);
  }

  const client = PrintfulClient.fromEnv();
  if (!client) {
    logger.error(
      "PRINTFUL_API_TOKEN is not set. Create a private token in Printful (Stores → your store → API) and add it to apps/backend/.env, then rerun."
    );
    return;
  }

  logger.info("Fetching product list from Printful...");
  const summaries: { id: number }[] = [];
  let offset = 0;
  const limit = 50;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const res = await client.getProducts(offset, limit);
    summaries.push(...res.products);
    offset += res.products.length;
    if (!res.products.length || offset >= res.total) break;
  }
  logger.info(`Fetched ${summaries.length} products from Printful.`);

  if (!summaries.length) {
    logger.warn(
      "Nothing to sync — create some synced products in Printful first, then rerun."
    );
    return;
  }

  const details: PrintfulSyncProductDetail[] = [];
  for (const s of summaries) {
    details.push(await client.getProduct(s.id));
  }

  // Size tables per catalog product, fetched once per distinct blank.
  const sizeGuideByCatalogId = new Map<number, SizeGuide | null>();
  const catalogIds = new Set(
    details
      .map((d) => d.sync_variants[0]?.product?.product_id)
      .filter((id): id is number => Boolean(id))
  );
  const catalogInfoById = new Map<
    number,
    { title: string; description: string } | null
  >();
  for (const catalogId of catalogIds) {
    sizeGuideByCatalogId.set(
      catalogId,
      condenseSizeGuide(await client.getProductSizes(catalogId))
    );
    const info = await client.getCatalogProduct(catalogId);
    catalogInfoById.set(
      catalogId,
      info ? { title: info.title, description: info.description } : null
    );
  }
  logger.info(
    `Fetched size guides for ${
      [...sizeGuideByCatalogId.values()].filter(Boolean).length
    }/${catalogIds.size} blank(s).`
  );

  const psychologicalRounding =
    process.env.PRINTFUL_PSYCHOLOGICAL_ROUNDING !== "false";
  logger.info(
    `Psychological (.99) rounding: ${psychologicalRounding ? "on" : "off"}`
  );

  // Each Printful variant quotes its own currency, so fetch FX rates once per
  // distinct source currency encountered rather than assuming a single one.
  const sourceCurrencies = new Set(
    details.flatMap((d) =>
      d.sync_variants.map((v) => (v.currency || "usd").toLowerCase())
    )
  );
  const exchangeRatesByCurrency = new Map<string, Record<string, number>>();
  for (const currency of sourceCurrencies) {
    exchangeRatesByCurrency.set(
      currency,
      await fetchExchangeRates(currency, STORE_CURRENCIES, logger)
    );
  }

  // ——— Infra lookups ———
  // Named, not positional. This used to take salesChannels[0], which is only
  // correct while exactly one channel exists — adding a second brand's
  // channel could silently publish this store's products onto it, depending
  // on row order.
  const SALES_CHANNEL_NAME =
    process.env.PRINTFUL_SALES_CHANNEL || "Default Sales Channel";
  const { data: allSalesChannels } = await query.graph({
    entity: "sales_channel",
    fields: ["id", "name"],
  });
  const salesChannels = allSalesChannels.filter(
    (c) => c.name === SALES_CHANNEL_NAME
  );
  if (!salesChannels.length) {
    throw new Error(
      `No sales channel named "${SALES_CHANNEL_NAME}". Available: ${allSalesChannels
        .map((c) => c.name)
        .join(", ")}`
    );
  }
  const { data: shippingProfiles } = await query.graph({
    entity: "shipping_profile",
    fields: ["id"],
  });

  const { data: existingCategories } = await query.graph({
    entity: "product_category",
    fields: ["id", "handle"],
    filters: { handle: "print-on-demand" },
  });
  let categoryId = existingCategories[0]?.id;
  if (!categoryId) {
    const { result } = await createProductCategoriesWorkflow(container).run({
      input: {
        product_categories: [
          {
            name: "Print on Demand",
            handle: "print-on-demand",
            description: "Made for you when you order.",
            is_active: true,
          },
        ],
      },
    });
    categoryId = result[0].id;
  }

  // Department categories (from the original seed) plus fit categories,
  // which are created here so a new store gets them without a manual step.
  const fitHandles = FIT_CATEGORIES.map((f) => f.handle);
  const { data: existingFitCategories } = await query.graph({
    entity: "product_category",
    fields: ["id", "handle"],
    filters: { handle: fitHandles },
  });
  const missingFits = FIT_CATEGORIES.filter(
    (f) => !existingFitCategories.some((c) => c.handle === f.handle)
  );
  if (missingFits.length) {
    await createProductCategoriesWorkflow(container).run({
      input: {
        product_categories: missingFits.map((f) => ({
          name: f.name,
          handle: f.handle,
          description: f.description,
          is_active: true,
        })),
      },
    });
    logger.info(
      `Created fit categories: ${missingFits.map((f) => f.name).join(", ")}`
    );
  }

  const { data: departmentCategories } = await query.graph({
    entity: "product_category",
    fields: ["id", "handle"],
    filters: {
      handle: [
        "apparel",
        "accessories",
        "home-goods",
        "new-arrivals",
        "bestsellers",
        ...fitHandles,
      ],
    },
  });
  const categoryIdByHandle = new Map(
    departmentCategories.map((c) => [c.handle as string, c.id])
  );

  const { data: existingCollections } = await query.graph({
    entity: "product_collection",
    fields: ["id", "handle"],
    filters: { handle: ["new-arrivals", "bestsellers", "aeon-capsule"] },
  });
  let newArrivalsCollectionId = existingCollections.find(
    (c) => c.handle === "new-arrivals"
  )?.id;
  let bestsellersCollectionId = existingCollections.find(
    (c) => c.handle === "bestsellers"
  )?.id;
  const aeonCollectionId = existingCollections.find(
    (c) => c.handle === "aeon-capsule"
  )?.id;
  if (!newArrivalsCollectionId || !bestsellersCollectionId) {
    const { result } = await createCollectionsWorkflow(container).run({
      input: {
        collections: [
          ...(newArrivalsCollectionId
            ? []
            : [{ title: "New Arrivals", handle: "new-arrivals" }]),
          ...(bestsellersCollectionId
            ? []
            : [{ title: "Bestsellers", handle: "bestsellers" }]),
        ],
      },
    });
    for (const c of result) {
      if (c.handle === "new-arrivals") newArrivalsCollectionId = c.id;
      if (c.handle === "bestsellers") bestsellersCollectionId = c.id;
    }
  }

  // ——— Reconcile products with Printful ———
  // Matched on metadata.printful_product_id (stable across renames).
  // Existing products keep their title, description, and prices — only
  // completely new products are created and missing variants are added.
  // Products deleted upstream in Printful (orphans) are still pruned.
  const liveIds = new Set(details.map((d) => d.sync_product.id));
  const { data: allProducts } = await query.graph({
    entity: "product",
    fields: [
      "id", "title", "handle", "metadata",
      "options.id", "options.title", "options.values.value",
      "variants.id", "variants.title", "variants.metadata",
    ],
  });
  // Scoped to this Printful store. Products carrying a different
  // printful_store_id belong to another brand's catalogue and must survive
  // this run untouched — without this they read as orphans and get deleted.
  // Products predating the stamp have no store id; they are this store's,
  // since it was the only one synced before the field existed.
  const printfulProducts = allProducts.filter((p) => {
    const meta = p.metadata as Record<string, unknown> | null;
    if (meta?.fulfillment !== "printful") return false;
    const owner = meta?.printful_store_id;
    return !owner || String(owner) === PRINTFUL_STORE_ID;
  });
  const existingByPrintfulId = new Map(
    printfulProducts
      .filter((p) => (p.metadata as any)?.printful_product_id)
      .map((p) => [String((p.metadata as any).printful_product_id), p])
  );
  const orphans = printfulProducts.filter(
    (p) => !liveIds.has(Number((p.metadata as any)?.printful_product_id))
  );

  if (orphans.length) {
    logger.info(
      `Pruning ${orphans.length} product(s) no longer in Printful: ${orphans
        .map((p) => p.title)
        .join(", ")}`
    );
    await deleteProductsWorkflow(container).run({
      input: { ids: orphans.map((p) => p.id) },
    });
  }

  // Handles are needed for toMedusaProduct (for new products).
  const { data: handleRows } = await query.graph({
    entity: "product",
    fields: ["handle", "deleted_at"],
  });
  const takenHandles = new Set<string>(
    handleRows
      .filter((r: any) => !r.deleted_at)
      .map((r: any) => r.handle)
      .filter(Boolean) as string[]
  );

  const ctx = {
    categoryId,
    sizeGuideByCatalogId,
    catalogInfoById,
    categoryIdByHandle,
    newArrivalsCollectionId: newArrivalsCollectionId!,
    bestsellersCollectionId: bestsellersCollectionId!,
    aeonCollectionId,
    salesChannelId: salesChannels[0].id,
    shippingProfileId: shippingProfiles[0].id,
    exchangeRatesByCurrency,
    psychologicalRounding,
    takenHandles,
  };

  let created = 0;
  let skipped = 0;
  let variantPatched = 0;
  for (const detail of details) {
    const existing = existingByPrintfulId.get(String(detail.sync_product.id)) as ExistingProduct | undefined;
    try {
      if (!existing) {
        // Brand-new product — create it in full.
        await createProductsWorkflow(container).run({
          input: { products: [toMedusaProduct(detail, ctx)] },
        });
        created++;
        logger.info(`  + ${detail.sync_product.name}`);
      } else {
        const desired = toMedusaProduct(detail, ctx);
        const nameChanged = existing.title !== desired.title;
        const optionsChanged = !sameOptions(existing, desired.options);

        if (nameChanged || optionsChanged) {
          logger.info(
            `  ↻ ${detail.sync_product.name} — ${
              nameChanged ? "name changed" : "options changed"
            }, rebuilding`
          );
          if (existing.handle) takenHandles.delete(existing.handle as string);
          await deleteProductsWorkflow(container).run({
            input: { ids: [existing.id] },
          });
          try {
            const { Client } = require("pg");
            if (process.env.DATABASE_URL) {
              const client = new Client({ connectionString: process.env.DATABASE_URL });
              await client.connect();
              await client.query(
                "UPDATE product SET handle = handle || '-del-' || substring(id, 6, 8) WHERE deleted_at IS NOT NULL AND handle NOT LIKE '%-del-%'"
              );
              await client.end();
            }
          } catch (e: any) {
            logger.warn(`Could not rename deleted product handle: ${e.message}`);
          }
          await createProductsWorkflow(container).run({
            input: { products: [desired] },
          });
          variantPatched++;
          continue;
        }

        const variantsBefore = (existing.variants || []).length;
        await addMissingVariants(container, existing, desired.variants, logger);

        await updateProductsWorkflow(container).run({
          input: {
            selector: { id: existing.id },
            update: {
              collection_id: desired.collection_id,
              thumbnail: desired.thumbnail,
            },
          },
        });

        if (process.env.DATABASE_URL && desired.category_ids?.length) {
          try {
            const { Client } = require("pg");
            const client = new Client({ connectionString: process.env.DATABASE_URL });
            await client.connect();
            for (const catId of desired.category_ids) {
              await client.query(
                "INSERT INTO product_category_product (product_id, product_category_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
                [existing.id, catId]
              );
            }
            await client.end();
          } catch (e: any) {
            logger.warn(`Could not update category links: ${e.message}`);
          }
        }

        const hadChanges =
          (existing.variants || []).length !== variantsBefore;
        if (hadChanges) {
          variantPatched++;
          logger.info(`  ~ ${detail.sync_product.name} (variants patched)`);
        } else {
          skipped++;
          logger.info(`  = ${detail.sync_product.name} (updated metadata/categories)`);
        }
      }
    } catch (e: any) {
      logger.error(`  ✗ ${detail.sync_product.name}: ${e.message}`);
    }
  }

  logger.info(
    `Done. ${created} new, ${variantPatched} variant-patched, ${skipped} unchanged out of ${details.length} Printful products.`
  );

  // ——— Re-apply generated mockup images ———
  // Syncing recreates products, which resets their images to Printful's
  // single default view; without this step every sync silently regressed the
  // storefront until apply-printful-mockups.ts was run by hand.
  const manifestCandidates = [
    process.env.MOCKUP_MANIFEST,
    path.resolve(process.cwd(), "mockups.json"),
    path.resolve(__dirname, "../../mockups.json"),
    path.resolve(process.cwd(), "apps/backend/mockups.json"),
    // Where generate-printful-mockups.py actually writes. Without this the
    // generator and the sync keep separate copies, and a targeted
    // regeneration silently leaves the sync applying stale image URLs.
    path.resolve(__dirname, "../../../../scripts/mockups.json"),
    path.resolve(process.cwd(), "../../scripts/mockups.json"),
  ].filter(Boolean) as string[];
  const manifestPath = manifestCandidates.find((p) => fs.existsSync(p));
  if (!manifestPath) {
    logger.warn(
      "No mockup manifest found — product images are Printful defaults until scripts/generate-printful-mockups.py runs."
    );
  } else {
    const manifest: Record<string, { name: string; images: string[] }> =
      JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    const { data: syncedProducts } = await query.graph({
      entity: "product",
      fields: ["id", "metadata"],
    });
    const productByPrintfulId = new Map(
      syncedProducts
        .filter((p) => (p.metadata as any)?.printful_product_id)
        .map((p) => [String((p.metadata as any).printful_product_id), p.id])
    );
    let applied = 0;
    for (const [printfulId, entry] of Object.entries(manifest)) {
      const productId = productByPrintfulId.get(String(printfulId));
      if (!productId || !entry.images?.length) continue;
      await updateProductsWorkflow(container).run({
        input: {
          selector: { id: productId },
          update: {
            thumbnail: entry.images[0],
            images: entry.images.map((url) => ({ url })),
          },
        },
      });
      applied++;
    }
    logger.info(`Applied generated mockups to ${applied} product(s).`);
  }

  // ——— Drop managed categories that ended up empty ———
  // The sync creates fit and department categories up front; with a small
  // capsule catalogue several stay empty, and nav/footer render them as
  // dead links. Delete any managed category with no products — the next
  // sync recreates it the moment a product actually needs it.
  const MANAGED_CATEGORY_HANDLES = [
    "womens",
    "mens",
    "unisex",
    "apparel",
    "accessories",
    "home-goods",
  ];
  const { data: managedCats } = await query.graph({
    entity: "product_category",
    fields: ["id", "name", "handle", "products.id"],
    filters: { handle: MANAGED_CATEGORY_HANDLES },
  });
  const emptyCats = managedCats.filter((c) => !(c.products || []).length);
  if (emptyCats.length) {
    logger.info(
      `Dropping ${emptyCats.length} empty categor(ies): ${emptyCats
        .map((c) => c.name)
        .join(", ")}`
    );
    await deleteProductCategoriesWorkflow(container).run({
      input: emptyCats.map((c) => c.id),
    });
  }

  // ——— Drop empty storefront entries left over from the demo seed ———
  // Nav and footer render categories/collections from data; an empty
  // "Essentials" collection or "Home" category is a dead page a customer can
  // land on.
  const { data: essentials } = await query.graph({
    entity: "product_collection",
    fields: ["id", "products.id"],
    filters: { handle: "essentials" },
  });
  if (essentials[0] && !(essentials[0].products || []).length) {
    await deleteCollectionsWorkflow(container).run({
      input: { ids: [essentials[0].id] },
    });
    logger.info('Removed empty "Essentials" collection.');
  }
  const { data: homeGoods } = await query.graph({
    entity: "product_category",
    fields: ["id", "products.id"],
    filters: { handle: "home-goods" },
  });
  if (homeGoods[0] && !(homeGoods[0].products || []).length) {
    await deleteProductCategoriesWorkflow(container).run({
      input: [homeGoods[0].id],
    });
    logger.info('Removed empty "Home" category.');
  }

  // ——— Update Bundle Promotions ———
  try {
    logger.info("Updating bundle promotions for active products...");
    await createBundlePromotion({ container });
    logger.info("Bundle promotions successfully updated.");
  } catch (err: any) {
    logger.warn(`Could not update bundle promotions: ${err.message}`);
  }
}
