/**
 * Minimal Printful REST API (v1) client (https://developers.printful.com).
 * Token: Printful dashboard → Stores → your store → API → Private token.
 */

const BASE_URL = "https://api.printful.com";

export type PrintfulSyncVariantOption = { id: string; value: unknown };

export type PrintfulFile = {
  id: number;
  type: string;
  url: string;
  preview_url: string;
  thumbnail_url: string;
};

export type PrintfulSyncVariant = {
  id: number;
  external_id: string;
  sync_product_id: number;
  name: string;
  synced: boolean;
  variant_id: number;
  retail_price: string;
  currency: string;
  sku?: string;
  product: {
    variant_id: number;
    product_id: number;
    image: string;
    name: string;
  };
  files: PrintfulFile[];
  options: PrintfulSyncVariantOption[];
  /** Present on apparel; absent on single-variant goods like totes and caps. */
  size?: string;
  color?: string;
};

export type PrintfulSyncProductSummary = {
  id: number;
  external_id: string;
  name: string;
  variants: number;
  synced: number;
};

export type PrintfulSyncProductDetail = {
  sync_product: {
    id: number;
    external_id: string;
    name: string;
    variants: number;
    synced: number;
  };
  sync_variants: PrintfulSyncVariant[];
};

export type PrintfulAddress = {
  name: string;
  email?: string;
  phone?: string;
  address1: string;
  address2?: string;
  city: string;
  state_code?: string;
  country_code: string;
  zip: string;
};

export type PrintfulOrderPayload = {
  external_id: string;
  recipient: PrintfulAddress;
  items: { sync_variant_id: number; quantity: number }[];
};

export type PrintfulShipment = {
  id: number;
  carrier: string;
  service: string;
  tracking_number: string;
  tracking_url: string;
  shipped_at: number;
};

export type PrintfulOrder = {
  id: number;
  external_id: string;
  status: string;
  shipments?: PrintfulShipment[];
};

export type PrintfulWebhookConfig = {
  url: string;
  types: string[];
};

export class PrintfulClient {
  private token: string;
  private storeId?: string;

  constructor(token: string, storeId?: string) {
    this.token = token;
    this.storeId = storeId;
  }

  static fromEnv(): PrintfulClient | null {
    const token = process.env.PRINTFUL_API_TOKEN;
    if (!token) return null;
    return new PrintfulClient(token, process.env.PRINTFUL_STORE_ID || undefined);
  }

  private async request<T>(
    path: string,
    method: "GET" | "POST" | "PUT" = "GET",
    body?: unknown
  ): Promise<{ result: T; paging?: { offset: number; limit: number; total: number } }> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.token}`,
      "Content-Type": "application/json",
    };
    if (this.storeId) {
      headers["X-PF-Store-Id"] = this.storeId;
    }
    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(
        `Printful ${method} ${path} failed (${res.status}): ${text.slice(0, 400)}`
      );
    }
    return await res.json();
  }

  async getProducts(
    offset = 0,
    limit = 50
  ): Promise<{ products: PrintfulSyncProductSummary[]; total: number }> {
    const { result, paging } = await this.request<PrintfulSyncProductSummary[]>(
      `/store/products?offset=${offset}&limit=${limit}`
    );
    return { products: result, total: paging?.total ?? result.length };
  }

  async getProduct(id: number): Promise<PrintfulSyncProductDetail> {
    const { result } = await this.request<PrintfulSyncProductDetail>(
      `/store/products/${id}`
    );
    return result;
  }

  /**
   * Catalog blank details — description copy, product type and title.
   * Returns null rather than failing the sync when unavailable.
   */
  async getCatalogProduct(catalogProductId: number): Promise<{
    id: number;
    title: string;
    type: string;
    description: string;
    brand?: string | null;
    model?: string | null;
  } | null> {
    try {
      const { result } = await this.request<any>(
        `/products/${catalogProductId}`
      );
      return result?.product ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Size tables for a catalog product (garment measurements per size).
   * Returns null when the product has none rather than failing the sync.
   */
  async getProductSizes(catalogProductId: number): Promise<{
    available_sizes?: string[];
    size_tables?: {
      type: string;
      unit: string;
      measurements: {
        type_label: string;
        values: { size: string; value?: string; min_value?: string; max_value?: string }[];
      }[];
    }[];
  } | null> {
    try {
      const { result } = await this.request<any>(
        `/products/${catalogProductId}/sizes?unit=cm`
      );
      return result;
    } catch {
      return null;
    }
  }

  async createOrder(
    payload: PrintfulOrderPayload,
    confirm = false
  ): Promise<{ id: number }> {
    const { result } = await this.request<{ id: number }>(
      `/orders${confirm ? "?confirm=true" : ""}`,
      "POST",
      payload
    );
    return result;
  }

  async confirmOrder(orderId: number): Promise<unknown> {
    const { result } = await this.request(`/orders/${orderId}/confirm`, "POST");
    return result;
  }

  async getOrder(orderId: number): Promise<PrintfulOrder> {
    const { result } = await this.request<PrintfulOrder>(`/orders/${orderId}`);
    return result;
  }

  async getWebhookConfig(): Promise<PrintfulWebhookConfig> {
    const { result } = await this.request<PrintfulWebhookConfig>("/webhooks");
    return result;
  }

  /** Replaces the store's entire webhook configuration. */
  async setWebhookConfig(
    url: string,
    types: string[]
  ): Promise<PrintfulWebhookConfig> {
    const { result } = await this.request<PrintfulWebhookConfig>(
      "/webhooks",
      "POST",
      { url, types }
    );
    return result;
  }
}
