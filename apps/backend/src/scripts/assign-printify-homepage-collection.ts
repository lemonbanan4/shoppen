import { MedusaContainer } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { updateProductsWorkflow } from "@medusajs/medusa/core-flows";

/**
 * The Printify sync flow (unlike sync-printful-products.ts) doesn't assign
 * a homepage collection, so Printify products can go live fully published
 * and priced but stay invisible on New Arrivals/Bestsellers. This assigns
 * any Printify-fulfilled product with no collection yet to New Arrivals.
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
    filters: { handle: "new-arrivals" },
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

  await updateProductsWorkflow(container).run({
    input: {
      selector: { id: unassigned.map((p) => p.id) },
      update: { collection_id: newArrivalsCollectionId },
    },
  });

  logger.info(
    `Assigned ${unassigned.length} Printify product(s) to New Arrivals: ${unassigned
      .map((p) => p.title)
      .join(", ")}`
  );
}
