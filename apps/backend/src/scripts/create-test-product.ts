import { MedusaContainer } from "@medusajs/framework";
import {
  ContainerRegistrationKeys,
  ProductStatus,
} from "@medusajs/framework/utils";
import {
  createProductsWorkflow,
  deleteProductsWorkflow,
} from "@medusajs/medusa/core-flows";

export default async function createTestProduct({
  container,
}: {
  container: MedusaContainer;
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  logger.info("Looking up sales channel and shipping profile...");

  const { data: salesChannels } = await query.graph({
    entity: "sales_channel",
    fields: ["id", "name"],
  });
  const salesChannel =
    salesChannels.find((c) => c.name === "Default Sales Channel") ||
    salesChannels[0];

  if (!salesChannel) {
    throw new Error("No sales channel found.");
  }

  const { data: shippingProfiles } = await query.graph({
    entity: "shipping_profile",
    fields: ["id", "name"],
  });
  const shippingProfile =
    shippingProfiles.find((p) => p.name === "Default Shipping Profile") ||
    shippingProfiles[0];

  if (!shippingProfile) {
    throw new Error("No shipping profile found.");
  }

  const handle = "test-order-product";

  // Check if test product already exists
  const { data: existing } = await query.graph({
    entity: "product",
    fields: ["id", "handle"],
    filters: { handle },
  });

  if (existing.length > 0) {
    logger.info(`Cleaning up existing test product ${existing[0].id}...`);
    await deleteProductsWorkflow(container).run({
      input: { ids: [existing[0].id] },
    });
  }

  logger.info("Creating active test product (10 SEK / 1 EUR / 1 USD)...");

  const { result } = await createProductsWorkflow(container).run({
    input: {
      products: [
        {
          title: "Test Purchase Piece",
          handle,
          subtitle: "Live Checkout Verification Item",
          description: "Temporary product created to verify live checkout and Stripe payments.",
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          thumbnail:
            "https://res.cloudinary.com/y2pmxwhp/image/upload/v1791977832/aeon-hoodie.jpg",
          images: [
            {
              url: "https://res.cloudinary.com/y2pmxwhp/image/upload/v1791977832/aeon-hoodie.jpg",
            },
          ],
          options: [{ title: "Edition", values: ["Standard"] }],
          variants: [
            {
              title: "Standard",
              sku: "TEST-PURCHASE-01",
              options: { Edition: "Standard" },
              manage_inventory: false,
              prices: [
                { amount: 10, currency_code: "sek" },
                { amount: 1, currency_code: "eur" },
                { amount: 1, currency_code: "usd" },
              ],
            },
          ],
          sales_channels: [{ id: salesChannel.id }],
        },
      ],
    },
  });

  const created = result[0];
  logger.info("==================================================");
  logger.info(`Test product created successfully! ID: ${created.id}`);
  logger.info(`Storefront URL: /products/${handle}`);
  logger.info("==================================================");
}
