import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Adds an email to the store's Resend Audience. No-ops (204) if Resend
 * isn't configured yet, so the storefront form can ship ahead of signup.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const apiKey = process.env.RESEND_API_KEY;
  const audienceId = process.env.RESEND_AUDIENCE_ID;
  if (!apiKey || !audienceId) {
    // Not configured yet — respond success so the form doesn't show an
    // error, but signal to the caller that nothing was actually stored.
    res.status(200).json({ subscribed: false });
    return;
  }

  const email = (req.body as { email?: string })?.email?.trim().toLowerCase();
  if (!email || !EMAIL_RE.test(email)) {
    res.status(400).json({ message: "Enter a valid email address." });
    return;
  }

  const response = await fetch(
    `https://api.resend.com/audiences/${audienceId}/contacts`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, unsubscribed: false }),
    }
  );

  if (!response.ok) {
    // Resend returns 409-ish behavior for duplicates by just upserting, so a
    // failure here is a real error, not "already subscribed".
    const body = await response.text();
    req.scope
      .resolve("logger")
      .error(`Newsletter signup failed for Resend audience: ${body}`);
    res.status(502).json({ message: "Couldn't subscribe right now." });
    return;
  }

  res.status(200).json({ subscribed: true });
}
