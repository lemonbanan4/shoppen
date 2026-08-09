import { MedusaContainer } from "@medusajs/framework";
import {
  ContainerRegistrationKeys,
  ProductStatus,
} from "@medusajs/framework/utils";
import {
  createApiKeysWorkflow,
  createProductsWorkflow,
  createSalesChannelsWorkflow,
  deleteProductsWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
} from "@medusajs/medusa/core-flows";
import {
  PrintfulClient,
  PrintfulSyncProductDetail,
  PrintfulSyncVariant,
} from "../lib/printful-client";
import {
  STORE_CURRENCIES,
  convertToStorePrices,
  fetchExchangeRates,
} from "../lib/pricing";
import { displayTitle, toHandle } from "../lib/product-naming";

/**
 * Syncs the Solkast catalogue into its own sales channel.
 *
 *   npx medusa exec ./src/scripts/sync-solkast-products.ts
 *
 * Solkast lives in a second Printful store (the Ångerköp split left it as an
 * archive) and must not appear on angerkop.se, so everything here is scoped
 * twice over: products are stamped with this store's id, and published only
 * to the Solkast sales channel. The Ångerköp sync is scoped the same way and
 * will leave these alone.
 *
 * Only the curated twelve are pulled. The archive holds 33, but most are the
 * joke designs the brand is deliberately not built on.
 */

// Curated by hand, not filtered by rule: the distinction between "quiet" and
// "joke" is editorial and there is no field in Printful that encodes it. The
// archive holds 33 products; these are the twelve that fit the brand, plus
// the fourteen new graphic tees.
const CURATED: Record<string, string> = {
  // Graphic tees — Stanley/Stella Blaster 2.0, 499 kr, created from the
  // hosted print files by scripts/create-solkast-products.py.
  "454889326": "Chase the Light Tee",
  "454889327": "Shine Anyway Tee",
  "454889337": "The Light Reveals Tee",
  "454889339": "Made by the Sun Tee",
  "454889346": "Outshine Tee",
  "454889365": "No Permission Tee",
  "454889370": "Solar Tee",
  "454889372": "Elevate Tee",
  "454889375": "Ascend Tee",
  "454889376": "Leave Your Mark Tee",
  "454889399": "Taiyo Tee",
  "454889407": "Rise Above Tee",
  "454889415": "Discipline Builds Freedom Tee",
  "454889419": "Sol Drives Tee",

  // Archive pieces kept from the original Solkast catalogue. The Touching
  // Grass tote used to be here and was deleted upstream in Printful, so it
  // 404s rather than syncing — removed rather than left to warn on every run.
  "452551732": "Defragmenting Hoodie",
  "452525158": "Asphalt Up Hoodie",
  "452525155": "Asphalt Up Sweatshirt",
  "451939140": "Skyline Hoodie",
  "452490041": "Asphalt Up Tee",
  "451936716": "Defragment Tee",
  "452538608": "Touching Grass Tee",
  "452542677": "Touching Grass Hoodie",
  "451913956": "Solkast Beanie",
  "451903997": "Solkast Cap",
  "451903742": "Explorers Club Tee",
};

const SALES_CHANNEL_NAME = "Solkast";
const API_KEY_TITLE = "Solkast Storefront";
const MAX_IMAGES = 6;

export default async function syncSolkastProducts({
  container,
}: {
  container: MedusaContainer;
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  const token = process.env.PRINTFUL_SOLKAST_API_TOKEN;
  const storeId = process.env.PRINTFUL_SOLKAST_STORE_ID;
  if (!token || !storeId) {
    logger.error(
      "PRINTFUL_SOLKAST_API_TOKEN and PRINTFUL_SOLKAST_STORE_ID must both be set."
    );
    return;
  }
  const client = new PrintfulClient(token, storeId);

  // ——— Sales channel ———
  const { data: channels } = await query.graph({
    entity: "sales_channel",
    fields: ["id", "name"],
  });
  let channel: { id: string } | undefined = channels.find(
    (c) => c.name === SALES_CHANNEL_NAME
  );
  if (!channel) {
    const { result } = await createSalesChannelsWorkflow(container).run({
      input: {
        salesChannelsData: [
          {
            name: SALES_CHANNEL_NAME,
            description: "Solkast — solkast.com",
          },
        ],
      },
    });
    channel = result[0];
    logger.info(`Created sales channel "${SALES_CHANNEL_NAME}".`);
  }

  // ——— Publishable key, scoped to that channel ———
  const { data: keys } = await query.graph({
    entity: "api_key",
    fields: ["id", "title", "token"],
  });
  let apiKey: { id: string; token?: string } | undefined = keys.find(
    (k) => k.title === API_KEY_TITLE
  );
  if (!apiKey) {
    const { result } = await createApiKeysWorkflow(container).run({
      input: {
        api_keys: [
          { title: API_KEY_TITLE, type: "publishable", created_by: "system" },
        ],
      },
    });
    apiKey = result[0];
    await linkSalesChannelsToApiKeyWorkflow(container).run({
      input: { id: apiKey!.id, add: [channel!.id] },
    });
    logger.info(`Created publishable key for ${SALES_CHANNEL_NAME}.`);
  }
  logger.info(`Solkast publishable key: ${apiKey!.token}`);

  // ——— Fetch the curated products ———
  const details: PrintfulSyncProductDetail[] = [];
  for (const id of Object.keys(CURATED)) {
    try {
      details.push(await client.getProduct(Number(id)));
    } catch (e) {
      logger.warn(`Skipping ${id} (${CURATED[id]}): ${(e as Error).message}`);
    }
  }
  if (!details.length) {
    logger.error("No Solkast products could be fetched. Nothing to do.");
    return;
  }
  logger.info(
    `Fetched ${details.length}/${Object.keys(CURATED).length} curated Solkast products.`
  );

  const psychologicalRounding =
    process.env.PRINTFUL_PSYCHOLOGICAL_ROUNDING !== "false";
  const ratesByCurrency = new Map<string, Record<string, number>>();
  for (const d of details) {
    for (const v of d.sync_variants) {
      const cur = (v.currency || "usd").toLowerCase();
      if (!ratesByCurrency.has(cur)) {
        ratesByCurrency.set(
          cur,
          await fetchExchangeRates(cur, STORE_CURRENCIES, logger)
        );
      }
    }
  }

  const { data: profiles } = await query.graph({
    entity: "shipping_profile",
    fields: ["id"],
  });

  // ——— Replace this store's previously synced products ———
  // Scoped by printful_store_id so the Ångerköp catalogue is untouched.
  const { data: allProducts } = await query.graph({
    entity: "product",
    fields: ["id", "title", "metadata"],
  });
  const mine = allProducts.filter(
    (p) =>
      String((p.metadata as Record<string, unknown> | null)?.printful_store_id) ===
      storeId
  );
  if (mine.length) {
    logger.info(`Replacing ${mine.length} previously synced Solkast product(s)...`);
    await deleteProductsWorkflow(container).run({
      input: { ids: mine.map((p) => p.id) },
    });
  }

  // ——— Build and create ———
  // Handles must be unique across the whole store, not just this run: an
  // Ångerköp product already owning a slug would otherwise collide.
  const { data: handleRows } = await query.graph({
    entity: "product",
    fields: ["handle"],
  });
  const takenHandles = new Set<string>(
    handleRows.map((r) => r.handle).filter(Boolean) as string[]
  );

  let created = 0;
  for (const detail of details) {
    const p = detail.sync_product;
    const variants = detail.sync_variants;
    if (!variants.length) continue;

    const name = displayTitle(p.name);
    const sizes = [...new Set(variants.map((v) => v.size).filter(Boolean))];
    const colors = [...new Set(variants.map((v) => v.color).filter(Boolean))];

    // Only declare options that actually vary — a beanie with one size and
    // one colour otherwise gets two pointless single-value dropdowns.
    const options: { title: string; values: string[] }[] = [];
    if (sizes.length > 1) options.push({ title: "Size", values: sizes as string[] });
    if (colors.length > 1) options.push({ title: "Color", values: colors as string[] });
    if (!options.length) options.push({ title: "Style", values: ["Standard"] });

    const images = [
      ...new Set(
        variants
          .flatMap((v) => v.files || [])
          .filter((f) => f.type === "preview" && f.preview_url)
          .map((f) => f.preview_url as string)
      ),
    ].slice(0, MAX_IMAGES);

    const productInput = {
      title: name,
      handle: toHandle(name, p.id, takenHandles),
      status: ProductStatus.PUBLISHED,
      description: `${name} — Solkast. Printed to order in the EU on organic cotton.`,
      shipping_profile_id: profiles[0]?.id,
      images: images.map((url) => ({ url })),
      options,
      metadata: {
        printful_product_id: p.id,
        printful_store_id: storeId,
        fulfillment: "printful",
        brand: "solkast",
      },
      variants: variants.map((v: PrintfulSyncVariant) => {
        const optValues: Record<string, string> = {};
        if (sizes.length > 1) optValues["Size"] = v.size as string;
        if (colors.length > 1) optValues["Color"] = v.color as string;
        if (!Object.keys(optValues).length) optValues["Style"] = "Standard";

        const cur = (v.currency || "usd").toLowerCase();
        return {
          title: v.name,
          sku: v.sku || undefined,
          options: optValues,
          manage_inventory: false,
          metadata: { printful_variant_id: v.id },
          prices: convertToStorePrices(
            parseFloat(v.retail_price),
            ratesByCurrency.get(cur)!,
            psychologicalRounding
          ),
        };
      }),
      sales_channels: [{ id: channel!.id }],
    };

    try {
      await createProductsWorkflow(container).run({
        input: { products: [productInput as never] },
      });
      logger.info(`  ✓ ${name}`);
      created++;
    } catch (e) {
      logger.error(`  ✗ ${name}: ${(e as Error).message}`);
    }
  }

  logger.info(
    `Done. ${created}/${details.length} Solkast products on the "${SALES_CHANNEL_NAME}" channel.`
  );
}
