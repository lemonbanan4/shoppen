import { MedusaContainer } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { deleteProductsWorkflow } from "@medusajs/medusa/core-flows";

/**
 * Removes Printify-fulfilled products from the store.
 *
 * Printify is a Solkast-era fulfilment path. Ångerköp's catalogue is entirely
 * Printful (Stanley/Stella blanks, Swedish capsule), and the one product left
 * behind — an English-named "Coffee Run Hoodie" — was surfacing in the
 * Bestsellers rail and reading as someone else's product.
 *
 * Note this is not self-enforcing: sync-printify-products.ts recreates its
 * products with status PUBLISHED, so re-running that sync brings them back.
 * The durable fix is to stop running it (or unpublish the product in Printify
 * itself). This script is the cleanup, not a guard.
 *
 *   npx medusa exec ./src/scripts/retire-printify-products.ts
 */
export default async function retirePrintifyProducts({
  container,
}: {
  container: MedusaContainer;
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "title", "handle", "metadata"],
  });

  const printify = products.filter(
    (p) => (p.metadata as Record<string, unknown> | null)?.fulfillment === "printify"
  );

  if (!printify.length) {
    logger.info("No Printify-fulfilled products found. Nothing to do.");
    return;
  }

  logger.info(
    `Retiring ${printify.length} Printify product(s): ${printify
      .map((p) => p.title)
      .join(", ")}`
  );

  await deleteProductsWorkflow(container).run({
    input: { ids: printify.map((p) => p.id) },
  });

  logger.info("Done.");
}
