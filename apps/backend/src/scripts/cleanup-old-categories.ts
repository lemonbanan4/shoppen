import { MedusaContainer } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { deleteProductCategoriesWorkflow } from "@medusajs/medusa/core-flows";

export default async function cleanupOldCategories({
  container,
}: {
  container: MedusaContainer;
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  const { data: categories } = await query.graph({
    entity: "product_category",
    fields: ["id", "handle"],
    filters: { handle: ["shirts", "sweatshirts", "pants", "merch"] },
  });

  if (categories.length) {
    await deleteProductCategoriesWorkflow(container).run({
      input: categories.map((c) => c.id),
    });
    logger.info(`Deleted ${categories.length} old categories.`);
  } else {
    logger.info("No old categories found.");
  }
}
