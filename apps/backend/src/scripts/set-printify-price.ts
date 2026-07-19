import { MedusaContainer } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { PrintifyClient } from "../lib/printify-client";

/**
 * Sets a Printify product's price so that, after conversion, it displays as
 * a specific target price in a specific store currency — e.g. "make this
 * product read €37.00" rather than guessing what to type into Printify's
 * own (source-currency) price field.
 *
 *   PRINTIFY_PRODUCT_ID=<id> PRINTIFY_TARGET_PRICE=37 PRINTIFY_TARGET_CURRENCY=eur \
 *     npx medusa exec ./src/scripts/set-printify-price.ts
 *
 * Then re-run sync-printify-products.ts to pull the change into the store.
 */
export default async function setPrintifyPrice({
  container,
}: {
  container: MedusaContainer;
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);

  const client = PrintifyClient.fromEnv();
  if (!client) {
    logger.error("PRINTIFY_API_TOKEN is not set.");
    return;
  }

  const productId = process.env.PRINTIFY_PRODUCT_ID;
  const targetPrice = Number(process.env.PRINTIFY_TARGET_PRICE);
  const targetCurrency = (
    process.env.PRINTIFY_TARGET_CURRENCY || "eur"
  ).toLowerCase();
  const sourceCurrency = (
    process.env.PRINTIFY_PRICE_CURRENCY || "usd"
  ).toLowerCase();

  if (!productId || !targetPrice) {
    logger.error(
      "Set PRINTIFY_PRODUCT_ID and PRINTIFY_TARGET_PRICE (optionally PRINTIFY_TARGET_CURRENCY, default eur)."
    );
    return;
  }

  const shopId = await client.resolveShopId();

  let rate = 1;
  if (targetCurrency !== sourceCurrency) {
    const res = await fetch(
      `https://api.frankfurter.dev/v1/latest?base=${sourceCurrency.toUpperCase()}&symbols=${targetCurrency.toUpperCase()}`
    );
    if (!res.ok) {
      throw new Error(`Failed to fetch exchange rate: HTTP ${res.status}`);
    }
    const data = (await res.json()) as { rates: Record<string, number> };
    rate = data.rates[targetCurrency.toUpperCase()];
    if (!rate) {
      throw new Error(`No rate found for ${sourceCurrency}->${targetCurrency}`);
    }
  }

  // targetPrice = sourcePrice * rate  =>  sourcePrice = targetPrice / rate
  const sourcePrice = targetPrice / rate;
  const priceCents = Math.round(sourcePrice * 100);

  logger.info(
    `Target: ${targetPrice} ${targetCurrency.toUpperCase()} → setting Printify price to ${sourcePrice.toFixed(2)} ${sourceCurrency.toUpperCase()} (rate ${rate})`
  );

  const updated = await client.setUniformVariantPrice(
    shopId,
    productId,
    priceCents
  );

  logger.info(
    `Done. "${updated.title}" now priced at ${(priceCents / 100).toFixed(2)} ${sourceCurrency.toUpperCase()} across ${updated.variants.length} variants. Re-run sync-printify-products.ts to update the store.`
  );
}
