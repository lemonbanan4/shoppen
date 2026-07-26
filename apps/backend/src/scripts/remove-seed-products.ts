import { MedusaContainer } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { deleteProductsWorkflow } from "@medusajs/medusa/core-flows";

/**
 * Removes the demo catalog seeded during early development (Wool Trench
 * Coat, Minimal Watch, ...). Those products have no fulfillment behind
 * them — an order against one would never ship. Real products are marked
 * with metadata.fulfillment ("printful" / "printify") by their sync
 * scripts; anything without that marker is seed data.
 *
 *   npx medusa exec ./src/scripts/remove-seed-products.ts
 */
export default async function removeSeedProducts({
  container,
}: {
  container: MedusaContainer;
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "title", "metadata"],
  });

  const fulfilled = new Set(["printful", "printify"]);
  const targets = products.filter(
    (p) => !fulfilled.has((p.metadata as any)?.fulfillment)
  );

  if (!targets.length) {
    logger.info("No unfulfillable seed products found. Nothing to do.");
    return;
  }

  logger.info(
    `Removing ${targets.length} seed product(s): ${targets
      .map((p) => p.title)
      .join(", ")}`
  );

  await deleteProductsWorkflow(container).run({
    input: { ids: targets.map((p) => p.id) },
  });

  const { data: remaining } = await query.graph({
    entity: "product",
    fields: ["id"],
  });
  logger.info(
    `Done. ${targets.length} removed; ${remaining.length} products remain (all fulfillable).`
  );
}
