import {
  defineMiddlewares,
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http";

/**
 * Refuse the manual payment provider on the storefront API.
 *
 * `pp_system_default` completes an order without charging anything. Taking it
 * off each region stops the storefront from *offering* it, but that is only
 * half the door: Medusa's store route reads provider_id straight out of the
 * request body and never checks it against the cart's region —
 *
 *     const { provider_id, data } = req.body        // no region check
 *
 * — so after the region change a manual session could still be created by
 * calling the API directly. The publishable key needed to do that is public
 * by design; it is printed in the storefront bundle. Region config is a
 * merchandising control, not an authorisation boundary, so the block belongs
 * on the route.
 *
 * Admin routes are untouched. A manual payment is a legitimate thing for a
 * shop owner to record — a bank transfer, a market stall, a replacement — and
 * that path is already behind admin auth.
 */

const MANUAL_PROVIDER = "pp_system_default";

function rejectManualPayment(
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) {
  const providerId = (req.body as { provider_id?: unknown } | undefined)
    ?.provider_id;

  if (typeof providerId === "string" && providerId === MANUAL_PROVIDER) {
    res.status(400).json({
      type: "not_allowed",
      message: "That payment method is not available.",
    });
    return;
  }

  next();
}

export default defineMiddlewares({
  routes: [
    {
      // Matches the payment-collection id segment; the session route is the
      // only place a storefront names a provider.
      matcher: "/store/payment-collections/*/payment-sessions",
      method: "POST",
      middlewares: [rejectManualPayment],
    },
  ],
});
