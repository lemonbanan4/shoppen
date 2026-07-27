import { MedusaContainer } from "@medusajs/framework";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

/**
 * One-off: deletes the three orphaned demo-seed product options that still
 * surface in the store filter sidebar in production ("Shoe size", "Waist",
 * "Size" — their products are long deleted, so the filters can never match).
 *
 * Deliberately deletes by explicit id: the option→product relation is not
 * traversable via query.graph in this Medusa version, and two attempts at
 * programmatic orphan detection wrongly classified live options as orphans.
 *
 *   npx medusa exec ./src/scripts/remove-dead-seed-filter-options.ts
 */
const DEAD_OPTION_IDS = [
  "opt_01KXPPQ80B2ZG5DRCTEKZTW00Y", // Size (demo seed)
  "opt_01KXPPQ80CNANCGQXM9TT4DRXJ", // Waist (demo seed)
  "opt_01KXPPQ80G8FGP6VXKK68WJWCV", // Shoe size (demo seed)
];

export default async function removeDeadSeedFilterOptions({
  container,
}: {
  container: MedusaContainer;
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const productModuleService = container.resolve(Modules.PRODUCT);

  const existing = await productModuleService.listProductOptions({
    id: DEAD_OPTION_IDS,
  });
  if (!existing.length) {
    logger.info("None of the dead seed options exist here. Nothing to do.");
    return;
  }
  logger.info(
    `Deleting ${existing.length} option(s): ${existing
      .map((o) => `${o.title} (${o.id})`)
      .join(", ")}`
  );
  await productModuleService.deleteProductOptions(existing.map((o) => o.id));
  logger.info("Done.");
}
