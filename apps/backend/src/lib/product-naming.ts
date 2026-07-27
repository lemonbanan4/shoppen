/**
 * Shopper-facing names and URLs for products pulled from a print-on-demand
 * supplier. Shared by the Printful and Printify syncs so a product's URL
 * looks the same whoever fulfils it.
 */

const MAX_HANDLE_LENGTH = 60;

/**
 * Readable product URL: /products/explorers-club-tee rather than
 * /products/printful-451903742. The words in a URL are a ranking signal and
 * the link is visible whenever someone shares a product, so an id-based
 * handle was costing us on both.
 *
 * Handles must be unique, so `taken` carries the slugs already assigned in
 * this run and a collision falls back to appending the supplier's id.
 */
export const toHandle = (
  name: string,
  supplierId: string | number,
  taken: Set<string>
) => {
  let base = name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (base.length > MAX_HANDLE_LENGTH) {
    base = base.slice(0, MAX_HANDLE_LENGTH);
    // The cut usually lands mid-word, so drop whatever trails the last
    // separator rather than shipping a handle ending in "...sweatshi".
    const lastSeparator = base.lastIndexOf("-");
    if (lastSeparator > 0) base = base.slice(0, lastSeparator);
  }

  base = base.replace(/-+$/, "") || `product-${supplierId}`;

  const handle = taken.has(base) ? `${base}-${supplierId}` : base;
  taken.add(handle);
  return handle;
};

/**
 * Names for products created from a supplier dashboard, which inherit the
 * blank's catalog name ("Explorers Club Unisex organic oversized high neck
 * t-shirt"). That reads like a supplier SKU on a product card and made for an
 * unwieldy URL. The fit and fabric details it carried are already in the
 * description and the size guide.
 *
 * An explicit map rather than pattern-stripping: there are only a handful,
 * and guessing which words are "the blank" and which are "the design" goes
 * wrong the moment a product is named after a garment. Renaming here rather
 * than upstream also leaves the supplier's own catalog untouched.
 */
const PRODUCT_TITLE_OVERRIDES: Record<string, string> = {
  "Defragment Unisex organic oversized high neck t-shirt": "Defragment Tee",
  "Explorers Club Unisex organic oversized high neck t-shirt":
    "Explorers Club Tee",
  "FlowerBrain Unisex organic oversized high neck t-shirt": "FlowerBrain Tee",
  "Skyline Oversized heavyweight hoodie": "Skyline Hoodie",
  "SOLKAST Embroidered Beanie": "Solkast Embroidered Beanie",
  "SOLKAST Dad hat": "Solkast Dad Hat",
  "Unisex Heavy Blend™ Hooded Sweatshirt": "Coffee Run Hoodie",
};

export const displayTitle = (supplierName: string) =>
  PRODUCT_TITLE_OVERRIDES[supplierName] ?? supplierName;
