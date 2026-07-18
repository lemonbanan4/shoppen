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
 */

const STORE_CURRENCIES = ["usd", "eur"];

/**
 * Live mid-market rates from Frankfurter (ECB reference rates, no API key).
 * Falls back to an approximate hardcoded rate if the request fails, so a
 * network hiccup doesn't block the whole sync — but always logs which mode
 * was used.
 */
const fetchExchangeRates = async (
  base: string,
  targets: string[],
  logger: { warn: (msg: string) => void; info: (msg: string) => void }
): Promise<Record<string, number>> => {
  const rates: Record<string, number> = { [base]: 1 };
  const others = targets.filter((c) => c !== base);
  if (!others.length) return rates;

  const FALLBACK_RATES: Record<string, Record<string, number>> = {
    usd: { eur: 0.87 },
    eur: { usd: 1.15 },
  };

  try {
    const symbols = others.map((c) => c.toUpperCase()).join(",");
    const res = await fetch(
      `https://api.frankfurter.dev/v1/latest?base=${base.toUpperCase()}&symbols=${symbols}`
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as { rates: Record<string, number> };
    for (const target of others) {
      const rate = data.rates[target.toUpperCase()];
      if (!rate) throw new Error(`No rate returned for ${target}`);
      rates[target] = rate;
    }
    logger.info(
      `Live FX rates from ${base.toUpperCase()}: ${others
        .map((c) => `${c.toUpperCase()}=${rates[c]}`)
        .join(", ")}`
    );
  } catch (e: any) {
    logger.warn(
      `Could not fetch live exchange rates (${e.message}) — using approximate fallback rates. Re-run the sync later to pick up live rates.`
    );
    for (const target of others) {
      rates[target] = FALLBACK_RATES[base]?.[target] ?? 1;
    }
  }

  return rates;
};

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
        prices: STORE_CURRENCIES.map((currency_code) => ({
          currency_code,
          amount:
            Math.round(
              sourceAmount * ctx.exchangeRates[currency_code] * 100
            ) / 100,
        })),
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

  const ctx = {
    categoryId,
    salesChannelId: salesChannels[0].id,
    shippingProfileId: shippingProfiles[0].id,
    shopId,
    exchangeRates,
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
