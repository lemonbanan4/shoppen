import { MedusaContainer } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { updateProductsWorkflow } from "@medusajs/medusa/core-flows";

/**
 * The Printify sync flow (unlike sync-printful-products.ts) doesn't assign
 * a homepage collection, so Printify products can go live fully published
 * and priced but stay invisible on New Arrivals/Bestsellers. This assigns
 * any Printify-fulfilled product with no collection yet to Bestsellers.
 * Safe to re-run — only touches products that are still unassigned.
 *
 *   npx medusa exec ./src/scripts/assign-printify-homepage-collection.ts
 */
export default async function assignPrintifyHomepageCollection({
  container,
}: {
  container: MedusaContainer;
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  const { data: newArrivals } = await query.graph({
    entity: "product_collection",
    fields: ["id"],
    filters: { handle: "bestsellers" },
  });
  const newArrivalsCollectionId = newArrivals[0]?.id;
  if (!newArrivalsCollectionId) {
    logger.error('No "new-arrivals" collection found. Nothing to do.');
    return;
  }

  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "title", "metadata", "collection_id"],
  });

  const unassigned = products.filter(
    (p) =>
      (p.metadata as any)?.fulfillment === "printify" && !p.collection_id
  );

  if (!unassigned.length) {
    logger.info("No unassigned Printify products found.");
    return;
  }

  logger.info(
    `Found ${unassigned.length} unassigned Printify product(s): ${unassigned
      .map((p) => `${p.title} (${p.id})`)
      .join(", ")}`
  );
  logger.info(`Target collection (New Arrivals): ${newArrivalsCollectionId}`);

  // Update one at a time (rather than a single bulk selector) so a failure
  // on one product is visible instead of silently affecting the whole batch.
  for (const p of unassigned) {
    try {
      await updateProductsWorkflow(container).run({
        input: {
          selector: { id: p.id },
          update: { collection_id: newArrivalsCollectionId },
        },
      });
      logger.info(`  updated: ${p.title}`);
    } catch (e: any) {
      logger.error(`  FAILED: ${p.title}: ${e.message}`);
    }
  }

  // Re-fetch to confirm the writes actually persisted before declaring success.
  const { data: verify } = await query.graph({
    entity: "product",
    fields: ["id", "title", "collection_id"],
    filters: { id: unassigned.map((p) => p.id) },
  });
  for (const p of verify) {
    const ok = p.collection_id === newArrivalsCollectionId;
    logger.info(`  verify: ${p.title} -> collection_id=${p.collection_id} ${ok ? "OK" : "!! STILL WRONG"}`);
  }
}
