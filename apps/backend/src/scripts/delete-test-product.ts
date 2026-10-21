import { MedusaContainer } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import {
  deleteProductsWorkflow,
  deleteShippingOptionsWorkflow,
} from "@medusajs/medusa/core-flows";

export default async function deleteTestProduct({
  container,
}: {
  container: MedusaContainer;
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  logger.info("Looking up test products...");

  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "title", "handle"],
  });

  const testProducts = products.filter(
    (p) =>
      p.handle === "test-order-product" ||
      p.title?.toLowerCase().includes("test purchase piece")
  );

  if (testProducts.length > 0) {
    logger.info(
      `Deleting ${testProducts.length} test product(s): ${testProducts
        .map((p) => `${p.title} (${p.id})`)
        .join(", ")}`
    );
    await deleteProductsWorkflow(container).run({
      input: { ids: testProducts.map((p) => p.id) },
    });
    logger.info("Test product(s) deleted successfully.");
  } else {
    logger.info("No test products found.");
  }

  // Also clean up Free Test Shipping options if any
  const { data: shippingOptions } = await query.graph({
    entity: "shipping_option",
    fields: ["id", "name"],
  });

  const testShipping = shippingOptions.filter(
    (o) => o.name === "Free Test Shipping"
  );

  if (testShipping.length > 0) {
    logger.info(
      `Cleaning up ${testShipping.length} temporary Free Test Shipping option(s)...`
    );
    await deleteShippingOptionsWorkflow(container).run({
      input: { ids: testShipping.map((o) => o.id) },
    });
    logger.info("Temporary test shipping option(s) removed.");
  }
}
