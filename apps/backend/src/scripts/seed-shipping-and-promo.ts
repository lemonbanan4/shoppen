import { MedusaContainer } from "@medusajs/framework";
import { ContainerRegistrationKeys, PromotionStatus } from "@medusajs/framework/utils";
import {
  createPromotionsWorkflow,
  updateShippingOptionsWorkflow,
} from "@medusajs/medusa/core-flows";

/**
 * 1. Standard Shipping: €10 / $12, free once the cart's item total reaches
 *    €75 / $85 — matching the storefront's announcement bar.
 * 2. Express Shipping: €19 / $22 flat.
 * 3. WELCOME10 promotion: 10% off the order.
 */
export default async function seedShippingAndPromo({
  container,
}: {
  container: MedusaContainer;
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  const { data: shippingOptions } = await query.graph({
    entity: "shipping_option",
    fields: ["id", "name"],
  });

  const standard = shippingOptions.find((o) => o.name === "Standard Shipping");
  const express = shippingOptions.find((o) => o.name === "Express Shipping");

  const freeOver = (currency: string, threshold: number) => ({
    currency_code: currency,
    amount: 0,
    rules: [
      {
        attribute: "item_total",
        operator: "gte" as const,
        value: threshold,
      },
    ],
  });

  if (standard) {
    logger.info("Updating Standard Shipping: €10, free over €75...");
    await updateShippingOptionsWorkflow(container).run({
      input: [
        {
          id: standard.id,
          prices: [
            { currency_code: "eur", amount: 10 },
            { currency_code: "usd", amount: 12 },
            freeOver("eur", 75),
            freeOver("usd", 85),
          ],
        },
      ],
    });
  }

  if (express) {
    logger.info("Updating Express Shipping: €19 flat...");
    await updateShippingOptionsWorkflow(container).run({
      input: [
        {
          id: express.id,
          prices: [
            { currency_code: "eur", amount: 19 },
            { currency_code: "usd", amount: 22 },
          ],
        },
      ],
    });
  }

  const { data: existingPromos } = await query.graph({
    entity: "promotion",
    fields: ["id", "code"],
    filters: { code: "WELCOME10" },
  });

  if (existingPromos.length === 0) {
    logger.info("Creating WELCOME10 promotion (10% off order)...");
    await createPromotionsWorkflow(container).run({
      input: {
        promotionsData: [
          {
            code: "WELCOME10",
            type: "standard",
            status: PromotionStatus.ACTIVE,
            is_automatic: false,
            application_method: {
              type: "percentage",
              target_type: "order",
              allocation: "across",
              value: 10,
              currency_code: "eur",
            },
          },
        ],
      },
    });
  } else {
    logger.info("WELCOME10 already exists, skipping.");
  }

  logger.info("Done: shipping rules + promotion seeded.");
}
