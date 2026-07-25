/**
 * Minimal Printify REST API client (https://developers.printify.com).
 * Token: Printify dashboard → My Profile → Connections → API tokens.
 */

const BASE_URL = "https://api.printify.com/v1";

export type PrintifyShop = {
  id: number;
  title: string;
  sales_channel: string;
};

export type PrintifyOptionValue = { id: number; title: string };

export type PrintifyOption = {
  name: string;
  type: string;
  values: PrintifyOptionValue[];
};

export type PrintifyVariant = {
  id: number;
  sku: string;
  title: string;
  price: number; // retail price in cents
  is_enabled: boolean;
  is_available: boolean;
  options: number[]; // option value ids
};

export type PrintifyImage = {
  src: string;
  variant_ids: number[];
  position: string;
  is_default: boolean;
};

export type PrintifyProduct = {
  id: string;
  title: string;
  description: string; // HTML
  tags: string[];
  visible: boolean;
  options: PrintifyOption[];
  variants: PrintifyVariant[];
  images: PrintifyImage[];
};

export type PrintifyAddress = {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  country: string; // ISO2
  region?: string;
  address1: string;
  address2?: string;
  city: string;
  zip: string;
};

export type PrintifyShipment = {
  carrier: string;
  number: string;
  url?: string;
};

export type PrintifyOrder = {
  id: string;
  status: string;
  shipments?: PrintifyShipment[];
  metadata?: {
    order_type?: string;
    shop_order_id?: string | number;
    shop_order_label?: string;
  };
};

export type PrintifyWebhook = {
  id: string;
  topic: string;
  url: string;
};

export type PrintifyOrderPayload = {
  external_id: string;
  label?: string;
  line_items: { product_id: string; variant_id: number; quantity: number }[];
  shipping_method: number;
  send_shipping_notification?: boolean;
  address_to: PrintifyAddress;
};

export class PrintifyClient {
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  static fromEnv(): PrintifyClient | null {
    const token = process.env.PRINTIFY_API_TOKEN;
    return token ? new PrintifyClient(token) : null;
  }

  private async request<T>(
    path: string,
    method: "GET" | "POST" | "PUT" = "GET",
    body?: unknown
  ): Promise<T> {
    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
        "User-Agent": "Solkast-Medusa",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(
        `Printify ${method} ${path} failed (${res.status}): ${text.slice(0, 400)}`
      );
    }
    return (await res.json()) as T;
  }

  async getShops(): Promise<PrintifyShop[]> {
    return this.request<PrintifyShop[]>("/shops.json");
  }

  /** Resolves PRINTIFY_SHOP_ID from env, or falls back to the first shop. */
  async resolveShopId(): Promise<number> {
    if (process.env.PRINTIFY_SHOP_ID) {
      return Number(process.env.PRINTIFY_SHOP_ID);
    }
    const shops = await this.getShops();
    if (!shops.length) {
      throw new Error(
        "No Printify shops found on this account. Create one in Printify first (any channel, e.g. Pop-Up, works)."
      );
    }
    return shops[0].id;
  }

  async getProducts(
    shopId: number,
    page = 1,
    limit = 50
  ): Promise<{ data: PrintifyProduct[]; last_page: number }> {
    return this.request(`/shops/${shopId}/products.json?page=${page}&limit=${limit}`);
  }

  async getProduct(shopId: number, productId: string): Promise<PrintifyProduct> {
    return this.request(`/shops/${shopId}/products/${productId}.json`);
  }

  async updateProductTitle(
    shopId: number,
    productId: string,
    title: string
  ): Promise<PrintifyProduct> {
    return this.request(`/shops/${shopId}/products/${productId}.json`, "PUT", {
      title,
    });
  }

  /**
   * Sets the same retail price (in cents, Printify's shop currency) on every
   * variant of a product. Sends the full variant list on every call since
   * Printify's update endpoint expects each variant you want preserved.
   */
  async setUniformVariantPrice(
    shopId: number,
    productId: string,
    priceCents: number
  ): Promise<PrintifyProduct> {
    const product = await this.getProduct(shopId, productId);
    return this.request(`/shops/${shopId}/products/${productId}.json`, "PUT", {
      variants: product.variants.map((v) => ({
        id: v.id,
        price: priceCents,
        is_enabled: v.is_enabled,
      })),
    });
  }

  async createOrder(
    shopId: number,
    payload: PrintifyOrderPayload
  ): Promise<{ id: string }> {
    return this.request(`/shops/${shopId}/orders.json`, "POST", payload);
  }

  async getOrder(shopId: number, orderId: string): Promise<PrintifyOrder> {
    return this.request(`/shops/${shopId}/orders/${orderId}.json`);
  }

  async listWebhooks(shopId: number): Promise<PrintifyWebhook[]> {
    return this.request(`/shops/${shopId}/webhooks.json`);
  }

  async createWebhook(
    shopId: number,
    topic: string,
    url: string
  ): Promise<PrintifyWebhook> {
    return this.request(`/shops/${shopId}/webhooks.json`, "POST", {
      topic,
      url,
    });
  }

  async sendToProduction(shopId: number, orderId: string): Promise<unknown> {
    return this.request(
      `/shops/${shopId}/orders/${orderId}/send_to_production.json`,
      "POST"
    );
  }
}
