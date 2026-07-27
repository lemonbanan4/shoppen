import { MedusaContainer } from "@medusajs/framework";
import {
  ContainerRegistrationKeys,
  ProductStatus,
} from "@medusajs/framework/utils";
import {
  createProductCategoriesWorkflow,
  createProductsWorkflow,
  deleteProductsWorkflow,
} from "@medusajs/medusa/core-flows";
import { PrintifyClient, PrintifyProduct } from "../lib/printify-client";
import {
  STORE_CURRENCIES,
  convertToStorePrices,
  fetchExchangeRates,
} from "../lib/pricing";

/**
 * Syncs the Printify catalog into this store.
 *
 *   npx medusa exec ./src/scripts/sync-printify-products.ts
 *
 * Safe to re-run: previously synced products are replaced with the latest
 * Printify data. Requires PRINTIFY_API_TOKEN in apps/backend/.env.
 *
 * Prices set in Printify ("Edit price") are assumed to be in
 * PRINTIFY_PRICE_CURRENCY (defaults to "usd" — Printify's default shop
 * currency). That price is used as-is for that currency, and converted at
 * the current market rate for every other currency the store sells in
 * (only "eur" today), rather than copying the raw number across currencies.
 *
 * Converted prices are then rounded to the nearest psychological ("charm")
 * price ending in .99 — e.g. a converted €36.997 becomes €36.99, not some
 * odd FX-driven fraction. Set PRINTIFY_PSYCHOLOGICAL_ROUNDING=false to keep
 * exact converted amounts instead.
 */

const stripHtml = (html: string) =>
  (html || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const MAX_IMAGES = 6;

const toMedusaProduct = (
  p: PrintifyProduct,
  ctx: {
    categoryId: string;
    salesChannelId: string;
    shippingProfileId: string;
    shopId: number;
    exchangeRates: Record<string, number>;
    psychologicalRounding: boolean;
  }
) => {
  const valueTitle = new Map<number, { option: string; title: string }>();
  for (const option of p.options) {
    for (const value of option.values) {
      valueTitle.set(value.id, { option: option.name, title: value.title });
    }
  }

  const enabledVariants = p.variants.filter((v) => v.is_enabled);
  const usedValueIds = new Set(enabledVariants.flatMap((v) => v.options));

  const options = p.options
    .map((option) => ({
      title: option.name,
      values: option.values
        .filter((v) => usedValueIds.has(v.id))
        .map((v) => v.title),
    }))
    .filter((o) => o.values.length > 0);

  const images = [...p.images]
    .sort((a, b) => Number(b.is_default) - Number(a.is_default))
    .map((i) => i.src)
    .filter((src, idx, arr) => arr.indexOf(src) === idx)
    .slice(0, MAX_IMAGES);

  return {
    title: p.title,
    handle: `printify-${p.id}`,
    description: stripHtml(p.description),
    status: ProductStatus.PUBLISHED,
    category_ids: [ctx.categoryId],
    shipping_profile_id: ctx.shippingProfileId,
    images: images.map((url) => ({ url })),
    options,
    metadata: {
      printify_product_id: p.id,
      printify_shop_id: ctx.shopId,
      fulfillment: "printify",
    },
    variants: enabledVariants.map((v) => {
      const optionValues: Record<string, string> = {};
      for (const valueId of v.options) {
        const entry = valueTitle.get(valueId);
        if (entry) {
          optionValues[entry.option] = entry.title;
        }
      }
      const sourceAmount = v.price / 100;
      return {
        title: v.title,
        sku: v.sku || undefined,
        options: optionValues,
        manage_inventory: false,
        metadata: { printify_variant_id: v.id },
        prices: convertToStorePrices(
          sourceAmount,
          ctx.exchangeRates,
          ctx.psychologicalRounding
        ),
      };
    }),
    sales_channels: [{ id: ctx.salesChannelId }],
  };
};

export default async function syncPrintifyProducts({
  container,
}: {
  container: MedusaContainer;
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  const client = PrintifyClient.fromEnv();
  if (!client) {
    logger.error(
      "PRINTIFY_API_TOKEN is not set. Create a token in Printify (My Profile → Connections) and add it to apps/backend/.env, then rerun."
    );
    return;
  }

  const shopId = await client.resolveShopId();
  logger.info(`Syncing products from Printify shop ${shopId}...`);

  const products: PrintifyProduct[] = [];
  let page = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const res = await client.getProducts(shopId, page);
    products.push(...res.data);
    if (page >= res.last_page) break;
    page++;
  }
  logger.info(`Fetched ${products.length} products from Printify.`);

  if (!products.length) {
    logger.warn(
      "Nothing to sync — design some products in Printify first, then rerun."
    );
    return;
  }

  const sourceCurrency = (
    process.env.PRINTIFY_PRICE_CURRENCY || "usd"
  ).toLowerCase();
  const exchangeRates = await fetchExchangeRates(
    sourceCurrency,
    STORE_CURRENCIES,
    logger
  );
  const psychologicalRounding =
    process.env.PRINTIFY_PSYCHOLOGICAL_ROUNDING !== "false";
  logger.info(
    `Psychological (.99) rounding: ${psychologicalRounding ? "on" : "off"}`
  );

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

  // ——— Replace previously synced versions of these products ———
  const handles = products.map((p) => `printify-${p.id}`);
  const { data: existing } = await query.graph({
    entity: "product",
    fields: ["id", "handle"],
    filters: { handle: handles },
  });
  if (existing.length) {
    logger.info(`Replacing ${existing.length} previously synced products...`);
    await deleteProductsWorkflow(container).run({
      input: { ids: existing.map((p) => p.id) },
    });
  }

  // ——— Prune products deleted upstream ———
  // A product removed in Printify just stops appearing in the list above, so
  // without this it lingers in the store: published and purchasable but
  // impossible to fulfil (mirrors the same guard in the Printful sync).
  const liveHandles = new Set(handles);
  const { data: allProducts } = await query.graph({
    entity: "product",
    fields: ["id", "title", "handle", "metadata"],
  });
  const orphans = allProducts.filter(
    (p) =>
      (p.metadata as any)?.fulfillment === "printify" &&
      !liveHandles.has(p.handle as string)
  );
  if (orphans.length) {
    logger.info(
      `Pruning ${orphans.length} product(s) no longer in Printify: ${orphans
        .map((p) => p.title)
        .join(", ")}`
    );
    await deleteProductsWorkflow(container).run({
      input: { ids: orphans.map((p) => p.id) },
    });
  }

  const ctx = {
    categoryId,
    salesChannelId: salesChannels[0].id,
    shippingProfileId: shippingProfiles[0].id,
    shopId,
    exchangeRates,
    psychologicalRounding,
  };

  let created = 0;
  for (const product of products) {
    try {
      await createProductsWorkflow(container).run({
        input: { products: [toMedusaProduct(product, ctx)] },
      });
      created++;
      logger.info(`  ✓ ${product.title}`);
    } catch (e: any) {
      logger.error(`  ✗ ${product.title}: ${e.message}`);
    }
  }

  logger.info(
    `Done. ${created}/${products.length} Printify products synced into the store (category: Print on Demand).`
  );
}
