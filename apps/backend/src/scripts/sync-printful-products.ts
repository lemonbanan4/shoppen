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
  createProductsWorkflow,
  deleteCollectionsWorkflow,
  deleteProductCategoriesWorkflow,
  deleteProductsWorkflow,
  updateProductsWorkflow,
} from "@medusajs/medusa/core-flows";
import {
  PrintfulClient,
  PrintfulSyncProductDetail,
  PrintfulSyncVariant,
} from "../lib/printful-client";
import { convertToStorePrices, fetchExchangeRates, STORE_CURRENCIES } from "../lib/pricing";
import { displayTitle, toHandle } from "../lib/product-naming";

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

const MAX_IMAGES = 6;

// Homepage rail placement: the newest two capsules read as "New Arrivals",
// the first capsule plus the core brand line as "Bestsellers" (a launch-order
// proxy — this store has no sales history yet to base it on for real).
const NEW_ARRIVALS_TITLES = new Set([
  // The svenska capsule is the whole Ångerköp catalogue at launch, so every
  // tee is a new arrival. The Bestsellers rail carries the Printify hoodie
  // (assigned by assign-printify-homepage-collection.ts) until real sales
  // history exists to order it by.
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

  const parts = v.name.split("/").map((s) => s.trim()).slice(1);
  if (parts.length === 2) {
    optionValues["Color"] = parts[0];
    optionValues["Size"] = parts[1];
  } else if (parts.length === 1) {
    // A single trailing token is either a size ("... / M", one colourway) or
    // a colour ("... / Black", one size) depending on the product, so label
    // it by what it actually looks like rather than assuming.
    optionValues[SIZE_TOKEN.test(parts[0]) ? "Size" : "Color"] = parts[0];
  } else {
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
 * Product copy from the blank's catalog description. Printful writes these
 * as a short intro paragraph followed by bullet-point specs; keep the intro
 * and the material/weight/fit bullets, drop sourcing boilerplate that reads
 * oddly on a storefront.
 */
const buildDescription = (
  productName: string,
  catalogDescription: string | undefined
): string => {
  if (!catalogDescription) return "";
  const [intro, ...rest] = catalogDescription.split("\n•");
  const bullets = rest
    .map((b) => b.trim().replace(/\s+/g, " "))
    .filter(
      (b) =>
        b &&
        !/blank product|sourced from|the sizes correspond|important:/i.test(b)
    )
    .slice(0, 8);

  const lead = intro.trim().replace(/\s+/g, " ");
  return [lead, ...bullets.map((b) => `• ${b}`)].join("\n").trim();
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
  const images = variants
    .map(
      (v) =>
        v.files?.find((f) => f.type === "preview")?.preview_url ||
        v.files?.find((f) => f.type === "mockup")?.preview_url ||
        v.product?.image
    )
    .filter((url): url is string => Boolean(url))
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
      BESTSELLER_TITLES.has(name) || !NEW_ARRIVALS_TITLES.has(name)
        ? ctx.bestsellersCollectionId
        : ctx.newArrivalsCollectionId,
    shipping_profile_id: ctx.shippingProfileId,
    images: images.map((url) => ({ url })),
    options,
    metadata: {
      printful_product_id: p.id,
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

export default async function syncPrintfulProducts({
  container,
}: {
  container: MedusaContainer;
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

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
  const { data: salesChannels } = await query.graph({
    entity: "sales_channel",
    fields: ["id"],
  });
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
      handle: ["apparel", "accessories", "home-goods", ...fitHandles],
    },
  });
  const categoryIdByHandle = new Map(
    departmentCategories.map((c) => [c.handle as string, c.id])
  );

  const { data: existingCollections } = await query.graph({
    entity: "product_collection",
    fields: ["id", "handle"],
    filters: { handle: ["new-arrivals", "bestsellers"] },
  });
  let newArrivalsCollectionId = existingCollections.find(
    (c) => c.handle === "new-arrivals"
  )?.id;
  let bestsellersCollectionId = existingCollections.find(
    (c) => c.handle === "bestsellers"
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

  // ——— Clear out every previously synced Printful product ———
  // Matched on metadata.printful_product_id rather than on the handle: the
  // handle is now a slug derived from the product name, so it changes
  // whenever a product is renamed and can no longer identify anything.
  //
  // This covers two cases at once — products still in Printful (deleted here,
  // recreated below with fresh data) and products deleted upstream, which
  // would otherwise linger in the store: still published, still purchasable,
  // but impossible to fulfil.
  const liveIds = new Set(details.map((d) => d.sync_product.id));
  const { data: allProducts } = await query.graph({
    entity: "product",
    fields: ["id", "title", "handle", "metadata"],
  });
  const printfulProducts = allProducts.filter(
    (p) => (p.metadata as any)?.fulfillment === "printful"
  );
  const stale = printfulProducts.filter((p) =>
    liveIds.has(Number((p.metadata as any)?.printful_product_id))
  );
  const orphans = printfulProducts.filter(
    (p) => !liveIds.has(Number((p.metadata as any)?.printful_product_id))
  );

  if (stale.length) {
    logger.info(`Replacing ${stale.length} previously synced products...`);
    await deleteProductsWorkflow(container).run({
      input: { ids: stale.map((p) => p.id) },
    });
  }
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

  const ctx = {
    categoryId,
    sizeGuideByCatalogId,
    catalogInfoById,
    categoryIdByHandle,
    newArrivalsCollectionId: newArrivalsCollectionId!,
    bestsellersCollectionId: bestsellersCollectionId!,
    salesChannelId: salesChannels[0].id,
    shippingProfileId: shippingProfiles[0].id,
    exchangeRatesByCurrency,
    psychologicalRounding,
    takenHandles: new Set<string>(),
  };

  let created = 0;
  for (const detail of details) {
    try {
      await createProductsWorkflow(container).run({
        input: { products: [toMedusaProduct(detail, ctx)] },
      });
      created++;
      logger.info(`  ✓ ${detail.sync_product.name}`);
    } catch (e: any) {
      logger.error(`  ✗ ${detail.sync_product.name}: ${e.message}`);
    }
  }

  logger.info(
    `Done. ${created}/${details.length} Printful products synced into the store (category: Print on Demand).`
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

}
