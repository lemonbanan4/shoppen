import { MedusaContainer } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { updateProductsWorkflow } from "@medusajs/medusa/core-flows";

/**
 * One-off cleanup: the original generic "premium seed" catalog was assigned
 * to the New Arrivals / Bestsellers collections before the real Printful
 * capsules existed. Now that sync-printful-products.ts assigns those
 * collections itself, strip the generic (non-Printful) products out of them
 * so the homepage rails only surface real, sellable streetwear pieces.
 * Generic products stay published and browsable at /store — just off the
 * homepage rails.
 *
 *   npx medusa exec ./src/scripts/declutter-homepage-collections.ts
 */
export default async function declutterHomepageCollections({
  container,
}: {
  container: MedusaContainer;
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  const { data: collections } = await query.graph({
    entity: "product_collection",
    fields: ["id", "handle"],
    filters: { handle: ["new-arrivals", "bestsellers"] },
  });
  const collectionIds = collections.map((c) => c.id);
  if (!collectionIds.length) {
    logger.warn("No new-arrivals/bestsellers collections found. Nothing to do.");
    return;
  }

  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "title", "metadata", "collection_id"],
    filters: { collection_id: collectionIds },
  });

  const generic = products.filter(
    (p) => (p.metadata as any)?.fulfillment !== "printful"
  );

  if (!generic.length) {
    logger.info("No generic products left in the homepage collections.");
    return;
  }

  await updateProductsWorkflow(container).run({
    input: {
      selector: { id: generic.map((p) => p.id) },
      update: { collection_id: null },
    },
  });

  logger.info(
    `Removed ${generic.length} generic product(s) from homepage collections: ${generic
      .map((p) => p.title)
      .join(", ")}`
  );
}
