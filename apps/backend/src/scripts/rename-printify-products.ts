import { MedusaContainer } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { PrintifyClient } from "../lib/printify-client";

/**
 * One-off: gives the two same-titled "Unisex Garment-Dyed T-shirt" products
 * distinct, descriptive names. Re-run sync-printify-products.ts after this
 * to pull the new titles into the store.
 */
const RENAMES: { productId: string; title: string }[] = [
  { productId: "6a5c04f59af53053b5027090", title: "Arch Badge Tee" },
  { productId: "6a5cc2ef069266e09d06e625", title: "Sunburst Tee" },
];

export default async function renamePrintifyProducts({
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

  const shopId = await client.resolveShopId();

  for (const { productId, title } of RENAMES) {
    const updated = await client.updateProductTitle(shopId, productId, title);
    logger.info(`Renamed ${productId} -> "${updated.title}"`);
  }

  logger.info("Done. Re-run sync-printify-products.ts to update the store.");
}
