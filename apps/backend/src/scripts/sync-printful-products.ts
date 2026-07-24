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
import {
  PrintfulClient,
  PrintfulSyncProductDetail,
  PrintfulSyncVariant,
} from "../lib/printful-client";
import { convertToStorePrices, fetchExchangeRates, STORE_CURRENCIES } from "../lib/pricing";

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

const titleCase = (id: string) =>
  id
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

const toMedusaProduct = (
  detail: PrintfulSyncProductDetail,
  ctx: {
    categoryId: string;
    salesChannelId: string;
    shippingProfileId: string;
    exchangeRatesByCurrency: Map<string, Record<string, number>>;
    psychologicalRounding: boolean;
  }
) => {
  const { sync_product: p, sync_variants: variants } = detail;

  // Prefer each variant's generated mockup (the design actually applied to
  // the garment) over `product.image`, which is just the blank catalog photo.
  const images = variants
    .map(
      (v) =>
        v.files?.find((f) => f.type === "preview")?.preview_url ||
        v.product?.image
    )
    .filter((url): url is string => Boolean(url))
    .filter((url, idx, arr) => arr.indexOf(url) === idx)
    .slice(0, MAX_IMAGES);

  const optionTitles = new Map<string, Set<string>>();
  for (const v of variants) {
    for (const opt of v.options || []) {
      if (opt.value === undefined || opt.value === null || opt.value === "") {
        continue;
      }
      const title = titleCase(opt.id);
      if (!optionTitles.has(title)) optionTitles.set(title, new Set());
      optionTitles.get(title)!.add(String(opt.value));
    }
  }
  const options = [...optionTitles.entries()].map(([title, values]) => ({
    title,
    values: [...values],
  }));

  return {
    title: p.name,
    handle: `printful-${p.id}`,
    description: "",
    status: ProductStatus.PUBLISHED,
    category_ids: [ctx.categoryId],
    shipping_profile_id: ctx.shippingProfileId,
    images: images.map((url) => ({ url })),
    options,
    metadata: {
      printful_product_id: p.id,
      fulfillment: "printful",
    },
    variants: variants.map((v: PrintfulSyncVariant) => {
      const optionValues: Record<string, string> = {};
      for (const opt of v.options || []) {
        if (opt.value === undefined || opt.value === null || opt.value === "") {
          continue;
        }
        optionValues[titleCase(opt.id)] = String(opt.value);
      }

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

  // ——— Replace previously synced versions of these products ———
  const handles = details.map((d) => `printful-${d.sync_product.id}`);
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
    exchangeRatesByCurrency,
    psychologicalRounding,
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
}
