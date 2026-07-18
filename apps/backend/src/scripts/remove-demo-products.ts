import { MedusaContainer } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { deleteProductsWorkflow } from "@medusajs/medusa/core-flows";

/**
 * Removes every product that isn't Printify-fulfilled (handle prefix
 * "printify-"), i.e. the invented demo catalog. Real Printify products are
 * untouched.
 *
 *   npx medusa exec ./src/scripts/remove-demo-products.ts
 */
export default async function removeDemoProducts({
  container,
}: {
  container: MedusaContainer;
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "title", "handle"],
  });

  const demoProducts = products.filter(
    (p) => !p.handle?.startsWith("printify-")
  );

  if (!demoProducts.length) {
    logger.info("No demo products found — nothing to remove.");
    return;
  }

  logger.info(
    `Removing ${demoProducts.length} demo products: ${demoProducts
      .map((p) => p.title)
      .join(", ")}`
  );

  await deleteProductsWorkflow(container).run({
    input: { ids: demoProducts.map((p) => p.id) },
  });

  const remaining = products.length - demoProducts.length;
  logger.info(`Done. ${remaining} real product(s) remain in the catalog.`);
}
