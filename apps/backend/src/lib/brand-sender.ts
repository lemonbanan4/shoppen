import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import type { MedusaContainer } from "@medusajs/framework";

/**
 * Which brand an email should appear to come from.
 *
 * One backend serves two storefronts, and the Resend provider was configured
 * with a single RESEND_FROM_EMAIL. Every email from either shop therefore went
 * out as "Ångerköp <hej@angerkop.se>" — so a Solkast customer's order
 * confirmation would arrive from a brand they have never heard of, in Swedish.
 * That is the kind of email that gets reported as fraud rather than ignored.
 *
 * Resolved from the order's sales channel because that is the only thing on an
 * order that records which storefront it came from. Falls back to the
 * configured default rather than guessing: a confirmation from the wrong brand
 * is bad, and no confirmation at all is worse.
 */

const DEFAULT_FROM = "Ångerköp <hej@angerkop.se>";

/** Sales channel name -> env var holding that brand's sender. */
const SENDER_ENV: Record<string, string> = {
  solkast: "RESEND_FROM_SOLKAST",
};

/** Sales channel name -> env var holding that brand's storefront origin. */
const STOREFRONT_ENV: Record<string, string> = {
  solkast: "STOREFRONT_URL_SOLKAST",
};

export function senderForChannelName(name?: string | null): string {
  const fallback = process.env.RESEND_FROM_EMAIL || DEFAULT_FROM;
  if (!name) return fallback;
  const envKey = SENDER_ENV[name.trim().toLowerCase()];
  if (!envKey) return fallback;
  return process.env[envKey] || fallback;
}

export function storefrontForChannelName(name?: string | null): string {
  const fallback = (process.env.STOREFRONT_URL || "").replace(/\/$/, "");
  if (!name) return fallback;
  const envKey = STOREFRONT_ENV[name.trim().toLowerCase()];
  if (!envKey) return fallback;
  return (process.env[envKey] || fallback).replace(/\/$/, "");
}

/**
 * Look up an order's sales channel and return the address to send as.
 *
 * Never throws. An email that goes out under the default brand still reaches
 * the customer; one that throws inside a subscriber does not go out at all.
 */
export async function senderForOrder(
  container: MedusaContainer,
  orderId: string
): Promise<string> {
  try {
    const query = container.resolve(ContainerRegistrationKeys.QUERY);
    const { data } = await query.graph({
      entity: "order",
      fields: ["id", "sales_channel.name"],
      filters: { id: orderId },
    });
    const name = (data?.[0] as { sales_channel?: { name?: string } } | undefined)
      ?.sales_channel?.name;
    return senderForChannelName(name);
  } catch {
    return senderForChannelName(null);
  }
}

/**
 * The sales channel behind an order, for callers that need both the sender
 * and the storefront a link should point at.
 */
export async function channelNameForOrder(
  container: MedusaContainer,
  orderId: string
): Promise<string | null> {
  try {
    const query = container.resolve(ContainerRegistrationKeys.QUERY);
    const { data } = await query.graph({
      entity: "order",
      fields: ["id", "sales_channel.name"],
      filters: { id: orderId },
    });
    return (
      (data?.[0] as { sales_channel?: { name?: string } } | undefined)
        ?.sales_channel?.name ?? null
    );
  } catch {
    return null;
  }
}
