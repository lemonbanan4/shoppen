import { MedusaContainer } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

/**
 * Read-only: reports which database this shell is pointed at and what is in
 * it. Use it to confirm a production DATABASE_URL override actually took
 * effect before running a sync that deletes and recreates products.
 *
 *   npx medusa exec ./src/scripts/check-connection.ts
 */
export default async function checkConnection({
  container,
}: {
  container: MedusaContainer;
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  const host = (process.env.DATABASE_URL || "").replace(/\/\/[^@]*@/, "//***@");
  logger.info(`Connected to: ${host || "(DATABASE_URL not set)"}`);

  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "title", "handle"],
  });

  logger.info(`Products in this database: ${products.length}`);
  for (const p of products.slice(0, 5)) {
    logger.info(`  ${p.title} -> /products/${p.handle}`);
  }

  const idBased = products.filter((p) =>
    /^print(ful|ify)-/.test(p.handle as string)
  ).length;
  logger.info(
    idBased
      ? `${idBased} product(s) still on old id-based URLs — sync not yet run here.`
      : "All products are on slug URLs."
  );
}
