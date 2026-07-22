type OrderEmailItem = {
  title: string;
  variant_title?: string | null;
  quantity: number;
  total: number;
};

export type OrderPlacedData = {
  order: {
    display_id: number;
    email: string;
    currency_code: string;
    item_subtotal: number;
    shipping_total: number;
    tax_total: number;
    total: number;
    items: OrderEmailItem[];
    shipping_address?: {
      first_name?: string | null;
      last_name?: string | null;
      address_1?: string | null;
      postal_code?: string | null;
      city?: string | null;
      country_code?: string | null;
    } | null;
  };
};

export type CustomerWelcomeData = {
  customer: {
    first_name?: string | null;
    email: string;
  };
};

const money = (amount: number, currency: string) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(Number(amount ?? 0));

const layout = (body: string) => `<!doctype html>
<html>
  <body style="margin:0;padding:0;background-color:#f5f5f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#171717;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f4;padding:32px 16px;">
      <tr><td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
          <tr><td style="padding:0 8px 24px;text-align:center;">
            <span style="font-size:18px;font-weight:600;letter-spacing:0.22em;color:#0a0a0a;">SHOPPEN</span>
          </td></tr>
          <tr><td style="background-color:#ffffff;border-radius:16px;padding:40px;">
            ${body}
          </td></tr>
          <tr><td style="padding:24px 8px;text-align:center;font-size:12px;color:#737373;line-height:1.6;">
            Free shipping on orders over €75 · 30-day returns<br/>
            © ${new Date().getFullYear()} Shoppen. Considered goods for everyday life.
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

const orderPlaced = (data: OrderPlacedData) => {
  const { order } = data;
  const c = order.currency_code;
  const rows = (order.items || [])
    .map(
      (item) => `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f5f5f5;font-size:14px;">
            ${item.title}${
        item.variant_title && item.variant_title !== "One Size"
          ? ` <span style="color:#737373;">· ${item.variant_title}</span>`
          : ""
      }
            <span style="color:#737373;"> × ${item.quantity}</span>
          </td>
          <td align="right" style="padding:10px 0;border-bottom:1px solid #f5f5f5;font-size:14px;white-space:nowrap;">
            ${money(item.total, c)}
          </td>
        </tr>`
    )
    .join("");

  const addr = order.shipping_address;
  const address = addr
    ? `${addr.first_name ?? ""} ${addr.last_name ?? ""}<br/>${
        addr.address_1 ?? ""
      }<br/>${addr.postal_code ?? ""} ${addr.city ?? ""}, ${(
        addr.country_code ?? ""
      ).toUpperCase()}`
    : "";

  return {
    subject: `Order confirmed — #${order.display_id}`,
    html: layout(`
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:600;">Thanks for your order</h1>
      <p style="margin:0 0 28px;font-size:14px;color:#525252;line-height:1.6;">
        Your order <strong>#${order.display_id}</strong> is confirmed. We'll email
        you again as soon as it ships.
      </p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${rows}
        <tr>
          <td style="padding:14px 0 4px;font-size:14px;color:#525252;">Subtotal</td>
          <td align="right" style="padding:14px 0 4px;font-size:14px;">${money(order.item_subtotal, c)}</td>
        </tr>
        <tr>
          <td style="padding:4px 0;font-size:14px;color:#525252;">Shipping</td>
          <td align="right" style="padding:4px 0;font-size:14px;">${money(order.shipping_total, c)}</td>
        </tr>
        <tr>
          <td style="padding:4px 0;font-size:14px;color:#525252;">Taxes</td>
          <td align="right" style="padding:4px 0;font-size:14px;">${money(order.tax_total, c)}</td>
        </tr>
        <tr>
          <td style="padding:12px 0 0;font-size:16px;font-weight:600;border-top:1px solid #e5e5e5;">Total</td>
          <td align="right" style="padding:12px 0 0;font-size:16px;font-weight:600;border-top:1px solid #e5e5e5;">${money(order.total, c)}</td>
        </tr>
      </table>
      ${
        address
          ? `<p style="margin:28px 0 0;font-size:13px;color:#525252;line-height:1.7;"><strong style="color:#171717;">Ships to</strong><br/>${address}</p>`
          : ""
      }
    `),
  };
};

const customerWelcome = (data: CustomerWelcomeData) => {
  const name = data.customer.first_name || "there";
  return {
    subject: "Welcome to Shoppen",
    html: layout(`
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:600;">Hi ${name}, welcome</h1>
      <p style="margin:0 0 20px;font-size:14px;color:#525252;line-height:1.7;">
        Your Shoppen account is ready. You can track orders, save addresses and
        check out faster next time.
      </p>
      <p style="margin:0;font-size:14px;color:#525252;line-height:1.7;">
        As a small welcome: use code <strong style="color:#171717;">WELCOME10</strong>
        for 10% off your first order.
      </p>
    `),
  };
};

export type OrderTransferData = {
  order: { display_id: number };
  transfer_url: string;
};

const orderTransferRequested = (data: OrderTransferData) => {
  return {
    subject: `Confirm the transfer of order #${data.order.display_id}`,
    html: layout(`
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:600;">Order transfer request</h1>
      <p style="margin:0 0 20px;font-size:14px;color:#525252;line-height:1.7;">
        A Shoppen account has asked to connect your order
        <strong>#${data.order.display_id}</strong> to their account. If this was
        you, confirm below. If you don't recognize this request, you can safely
        ignore this email or decline it.
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background-color:#0a0a0a;border-radius:9999px;">
        <a href="${data.transfer_url}" style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:500;color:#ffffff;text-decoration:none;">
          Review transfer request
        </a>
      </td></tr></table>
    `),
  };
};

export type OrderShippedData = {
  order: { display_id: number };
  shipment: {
    carrier?: string | null;
    tracking_number?: string | null;
    tracking_url?: string | null;
  };
};

const orderShipped = (data: OrderShippedData) => {
  const { order, shipment } = data;
  const carrier = shipment.carrier ? shipment.carrier.toUpperCase() : null;
  return {
    subject: `Your order is on its way — #${order.display_id}`,
    html: layout(`
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:600;">Your order has shipped</h1>
      <p style="margin:0 0 20px;font-size:14px;color:#525252;line-height:1.7;">
        Good news — order <strong>#${order.display_id}</strong> is on its way to you.
      </p>
      ${
        shipment.tracking_number
          ? `<p style="margin:0 0 20px;font-size:14px;color:#525252;line-height:1.7;">
              ${carrier ? `Carrier: <strong style="color:#171717;">${carrier}</strong><br/>` : ""}
              Tracking number: <strong style="color:#171717;">${shipment.tracking_number}</strong>
            </p>`
          : ""
      }
      ${
        shipment.tracking_url
          ? `<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background-color:#0a0a0a;border-radius:9999px;">
              <a href="${shipment.tracking_url}" style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:500;color:#ffffff;text-decoration:none;">
                Track your package
              </a>
            </td></tr></table>`
          : ""
      }
    `),
  };
};

export type CartRecoveryData = {
  items: { title: string; quantity: number }[]
  recovery_url: string
}

const cartRecovery = (data: CartRecoveryData) => {
  const rows = data.items
    .map(
      (item) => `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f5f5f5;font-size:14px;">
            ${item.title}
            <span style="color:#737373;"> × ${item.quantity}</span>
          </td>
        </tr>`
    )
    .join("");

  return {
    subject: "You left something behind",
    html: layout(`
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:600;">Still thinking it over?</h1>
      <p style="margin:0 0 24px;font-size:14px;color:#525252;line-height:1.7;">
        Your cart is saved and ready whenever you are.
      </p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${rows}
      </table>
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:28px;"><tr><td style="background-color:#0a0a0a;border-radius:9999px;">
        <a href="${data.recovery_url}" style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:500;color:#ffffff;text-decoration:none;">
          Return to your cart
        </a>
      </td></tr></table>
    `),
  };
};

const TEMPLATES: Record<
  string,
  (data: any) => { subject: string; html: string }
> = {
  "order-placed": orderPlaced,
  "order-shipped": orderShipped,
  "customer-welcome": customerWelcome,
  "order-transfer-requested": orderTransferRequested,
  "cart-recovery": cartRecovery,
};

export const renderEmailTemplate = (
  template: string,
  data: unknown
): { subject: string; html: string } => {
  const renderer = TEMPLATES[template];
  if (!renderer) {
    throw new Error(`Unknown email template: ${template}`);
  }
  return renderer(data);
};
