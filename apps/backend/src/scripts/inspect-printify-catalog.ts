import { MedusaContainer } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { PrintifyClient } from "../lib/printify-client";

/**
 * Debug: dumps raw Printify catalog (including cost per variant, which the
 * sync script doesn't currently store) so we can sanity-check margins.
 */
export default async function inspectPrintifyCatalog({
  container,
}: {
  container: MedusaContainer;
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const client = PrintifyClient.fromEnv();
  if (!client) {
    logger.error("PRINTIFY_API_TOKEN not set.");
    return;
  }

  const shopId = await client.resolveShopId();
  const res = await client.getProducts(shopId, 1, 50);

  logger.info(`Total products on Printify (any status): ${res.data.length}`);

  for (const p of res.data as any[]) {
    logger.info(
      `\n=== ${p.title} (id: ${p.id}, visible: ${p.visible}) ===`
    );
    logger.info(`Images: ${p.images?.length ?? 0}`);
    logger.info(`Description length: ${(p.description || "").length} chars`);
    const enabled = (p.variants || []).filter((v: any) => v.is_enabled);
    logger.info(`Variants: ${p.variants?.length ?? 0} total, ${enabled.length} enabled`);
    const sample = enabled.slice(0, 3);
    for (const v of sample) {
      logger.info(
        `  - ${v.title}: cost=${(v.cost / 100).toFixed(2)} price=${(v.price / 100).toFixed(2)} (margin=${(((v.price - v.cost) / v.price) * 100).toFixed(1)}%)`
      );
    }
  }
}
