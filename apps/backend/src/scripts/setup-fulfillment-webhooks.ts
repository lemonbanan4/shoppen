import { MedusaContainer } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { PrintifyClient } from "../lib/printify-client";
import { PrintfulClient } from "../lib/printful-client";

/**
 * Registers shipment webhooks with Printify and Printful so shipped orders
 * get their tracking number stored on the Medusa order and the customer gets
 * a "your order shipped" email.
 *
 *   npx medusa exec ./src/scripts/setup-fulfillment-webhooks.ts
 *
 * Requires BACKEND_PUBLIC_URL (the publicly reachable URL of this backend,
 * e.g. the Railway domain) plus PRINTIFY_WEBHOOK_TOKEN and/or
 * PRINTFUL_WEBHOOK_TOKEN — any random secret string; it gates the webhook
 * endpoints against unrelated callers. Safe to re-run.
 */
export default async function setupFulfillmentWebhooks({
  container,
}: {
  container: MedusaContainer;
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);

  const backendUrl = (process.env.BACKEND_PUBLIC_URL || "").replace(/\/$/, "");
  if (!backendUrl) {
    logger.error(
      "BACKEND_PUBLIC_URL is not set — set it to this backend's public URL (e.g. https://your-backend.up.railway.app) and rerun."
    );
    return;
  }
  if (backendUrl.includes("localhost")) {
    logger.error(
      "BACKEND_PUBLIC_URL points at localhost — suppliers can't reach that. Use the deployed backend URL."
    );
    return;
  }

  // ——— Printify ———
  const printify = PrintifyClient.fromEnv();
  const printifyToken = process.env.PRINTIFY_WEBHOOK_TOKEN;
  if (printify && printifyToken) {
    const url = `${backendUrl}/hooks/printify?token=${printifyToken}`;
    const topic = "order:shipment:created";
    const shopId = await printify.resolveShopId();
    const existing = await printify.listWebhooks(shopId);
    const already = existing.find((w) => w.topic === topic && w.url === url);
    if (already) {
      logger.info(`Printify: "${topic}" webhook already registered.`);
    } else {
      await printify.createWebhook(shopId, topic, url);
      logger.info(`Printify: registered "${topic}" webhook.`);
    }
  } else {
    logger.warn(
      "Printify: skipped (needs PRINTIFY_API_TOKEN + PRINTIFY_WEBHOOK_TOKEN)."
    );
  }

  // ——— Printful ———
  const printful = PrintfulClient.fromEnv();
  const printfulToken = process.env.PRINTFUL_WEBHOOK_TOKEN;
  if (printful && printfulToken) {
    const url = `${backendUrl}/hooks/printful?token=${printfulToken}`;
    const types = ["package_shipped"];
    const current = await printful.getWebhookConfig().catch(() => null);
    if (
      current?.url === url &&
      types.every((t) => current.types?.includes(t))
    ) {
      logger.info("Printful: webhook config already registered.");
    } else {
      await printful.setWebhookConfig(url, types);
      logger.info('Printful: registered "package_shipped" webhook.');
    }
  } else {
    logger.warn(
      "Printful: skipped (needs PRINTFUL_API_TOKEN + PRINTFUL_WEBHOOK_TOKEN)."
    );
  }

  logger.info("Done.");
}
