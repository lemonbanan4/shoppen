import { MedusaContainer } from "@medusajs/framework";
import {
  ContainerRegistrationKeys,
  ProductStatus,
} from "@medusajs/framework/utils";
import {
  createCollectionsWorkflow,
  createInventoryLevelsWorkflow,
  createProductCategoriesWorkflow,
  createProductsWorkflow,
  deleteProductsWorkflow,
} from "@medusajs/medusa/core-flows";

const img = (id: string) =>
  `https://images.unsplash.com/photo-${id}?w=1400&q=80&auto=format`;

const APPAREL_SIZES = ["XS", "S", "M", "L", "XL"];

type ProductSeed = {
  title: string;
  handle: string;
  subtitle?: string;
  description: string;
  images: string[];
  category: string;
  collection: string;
  eur: number;
  usd: number;
  sizes?: string[] | null;
};

const PRODUCTS: ProductSeed[] = [
  // ——— Apparel ———
  {
    title: "Essential Tee",
    handle: "essential-tee",
    subtitle: "Organic cotton, relaxed fit",
    description:
      "The foundation of every wardrobe. Cut from 220gsm organic cotton with a relaxed fit, ribbed collar and reinforced shoulder seams. Pre-washed for zero shrinkage.",
    images: [img("1521572163474-6864f9cf17ab"), img("1576871337622-98d48d1cf531")],
    category: "Apparel",
    collection: "Bestsellers",
    eur: 29,
    usd: 35,
    sizes: APPAREL_SIZES,
  },
  {
    title: "Organic Sweatshirt",
    handle: "organic-sweatshirt",
    subtitle: "Brushed fleece, off-white",
    description:
      "A heavyweight crewneck in brushed organic fleece. Dropped shoulders, ribbed hem and cuffs, and a soft hand-feel that only gets better with wear.",
    images: [img("1620799140408-edc6dcb6d633")],
    category: "Apparel",
    collection: "Essentials",
    eur: 69,
    usd: 79,
    sizes: APPAREL_SIZES,
  },
  {
    title: "Heavyweight Hoodie",
    handle: "heavyweight-hoodie",
    subtitle: "480gsm loopback cotton",
    description:
      "Our most-loved layer. 480gsm loopback cotton with a double-lined hood, hidden kangaroo pocket and flatlock seams throughout.",
    images: [img("1556821840-3a63f95609a7")],
    category: "Apparel",
    collection: "New Arrivals",
    eur: 89,
    usd: 99,
    sizes: APPAREL_SIZES,
  },
  {
    title: "Denim Jacket",
    handle: "denim-jacket",
    subtitle: "Washed indigo, unisex",
    description:
      "A timeless trucker silhouette in washed Japanese denim. Softened with wear, structured where it counts. Corozo buttons, chain-stitched hems.",
    images: [img("1551537482-f2075a1d41f2")],
    category: "Apparel",
    collection: "Bestsellers",
    eur: 129,
    usd: 149,
    sizes: APPAREL_SIZES,
  },
  {
    title: "Wool Trench Coat",
    handle: "wool-trench-coat",
    subtitle: "Camel, Italian wool blend",
    description:
      "A full-length trench in a camel Italian wool blend. Storm flap, horn buttons and a clean, tailored drape that works over anything.",
    images: [img("1539533018447-63fcce2678e3")],
    category: "Apparel",
    collection: "New Arrivals",
    eur: 249,
    usd: 279,
    sizes: APPAREL_SIZES,
  },
  {
    title: "Selvedge Denim",
    handle: "selvedge-denim",
    subtitle: "14oz, straight cut",
    description:
      "14oz selvedge denim woven on shuttle looms. A straight, honest cut with a button fly and hidden coin pocket. Raw — they break in with you.",
    images: [img("1541099649105-f69ad21f3246")],
    category: "Apparel",
    collection: "Bestsellers",
    eur: 119,
    usd: 139,
    sizes: ["28", "30", "32", "34", "36"],
  },
  {
    title: "Tailored Trousers",
    handle: "tailored-trousers",
    subtitle: "High waist, relaxed leg",
    description:
      "High-waisted trousers with a softly tapered leg and pressed crease. Cut from a breathable viscose blend that moves with you from desk to dinner.",
    images: [img("1594633312681-425c7b97ccd1")],
    category: "Apparel",
    collection: "New Arrivals",
    eur: 99,
    usd: 115,
    sizes: APPAREL_SIZES,
  },
  {
    title: "Oxford Shirt",
    handle: "oxford-shirt",
    subtitle: "Crisp white, button-down",
    description:
      "The white shirt, done properly. Supima oxford cloth, mother-of-pearl buttons and a collar that holds its line — with or without a tie.",
    images: [img("1598033129183-c4f50c736f10")],
    category: "Apparel",
    collection: "Essentials",
    eur: 89,
    usd: 99,
    sizes: APPAREL_SIZES,
  },
  {
    title: "Chambray Shirt",
    handle: "chambray-shirt",
    subtitle: "Washed blue, garment-dyed",
    description:
      "A garment-dyed chambray shirt with a soft, lived-in feel from day one. Single chest pocket, curved hem, endlessly layerable.",
    images: [img("1596755094514-f87e34085b2c")],
    category: "Apparel",
    collection: "Essentials",
    eur: 79,
    usd: 89,
    sizes: APPAREL_SIZES,
  },
  {
    title: "Alpaca Knit",
    handle: "alpaca-knit",
    subtitle: "Undyed, hand-finished",
    description:
      "A hand-finished knit in undyed baby alpaca. Feather-light, remarkably warm, and naturally hypoallergenic. Made in small batches.",
    images: [img("1434389677669-e08b4cac3105")],
    category: "Apparel",
    collection: "New Arrivals",
    eur: 149,
    usd: 169,
    sizes: APPAREL_SIZES,
  },
  {
    title: "Statement Socks",
    handle: "statement-socks",
    subtitle: "Combed cotton, 3-pack",
    description:
      "Three pairs of combed-cotton socks with just enough personality. Reinforced heel and toe, no slipping, no pilling.",
    images: [img("1586350977771-b3b0abd50c82")],
    category: "Apparel",
    collection: "Essentials",
    eur: 15,
    usd: 18,
    sizes: null,
  },
  {
    title: "Leather Boots",
    handle: "leather-boots",
    subtitle: "Full-grain, Goodyear welt",
    description:
      "Full-grain leather boots on a Goodyear-welted sole — built to be resoled, not replaced. Speed hooks, storm welt, a decade of wear in every pair.",
    images: [img("1608256246200-53e635b5b65f")],
    category: "Apparel",
    collection: "New Arrivals",
    eur: 189,
    usd: 219,
    sizes: ["40", "41", "42", "43", "44", "45"],
  },
  // ——— Accessories ———
  {
    title: "Canvas Tote",
    handle: "canvas-tote",
    subtitle: "18oz waxed canvas",
    description:
      "An everyday carry-all in 18oz waxed canvas with an interior zip pocket and reinforced base. Fits a 16-inch laptop, a lunch and the rest of your day.",
    images: [img("1544816155-12df9643f363")],
    category: "Accessories",
    collection: "Bestsellers",
    eur: 45,
    usd: 52,
    sizes: null,
  },
  {
    title: "Commuter Backpack",
    handle: "commuter-backpack",
    subtitle: "Recycled nylon, 20L",
    description:
      "A 20L commuter pack in water-resistant recycled nylon. Padded laptop sleeve, quick-access top pocket and a back panel that actually breathes.",
    images: [img("1553062407-98eeb64c6a62")],
    category: "Accessories",
    collection: "Bestsellers",
    eur: 95,
    usd: 110,
    sizes: null,
  },
  {
    title: "Minimal Watch",
    handle: "minimal-watch",
    subtitle: "38mm, sapphire glass",
    description:
      "A 38mm quartz watch with a brushed steel case, sapphire crystal and quick-release leather strap. Nothing on the dial that doesn't need to be there.",
    images: [img("1524592094714-0f0654e20314")],
    category: "Accessories",
    collection: "New Arrivals",
    eur: 159,
    usd: 179,
    sizes: null,
  },
  {
    title: "Leather Wallet",
    handle: "leather-wallet",
    subtitle: "Vegetable-tanned, slim",
    description:
      "A slim bifold in vegetable-tanned leather that develops a rich patina over time. Six card slots, one note sleeve, zero bulk.",
    images: [img("1627123424574-724758594e93")],
    category: "Accessories",
    collection: "Essentials",
    eur: 69,
    usd: 79,
    sizes: null,
  },
  {
    title: "Classic Sunglasses",
    handle: "classic-sunglasses",
    subtitle: "Bio-acetate, UV400",
    description:
      "A classic square frame in bio-acetate with scratch-resistant UV400 lenses. Barrel hinges, hand-polished finish, includes a hard case.",
    images: [img("1511499767150-a48a237f0083"), img("1572635196237-14b3f281503f")],
    category: "Accessories",
    collection: "Bestsellers",
    eur: 89,
    usd: 99,
    sizes: null,
  },
  {
    title: "Court Cap",
    handle: "court-cap",
    subtitle: "Brushed cotton twill",
    description:
      "A six-panel cap in brushed cotton twill with an adjustable brass closure. Unstructured crown, pre-curved brim, no loud logos.",
    images: [img("1588850561407-ed78c282e89b")],
    category: "Accessories",
    collection: "Essentials",
    eur: 35,
    usd: 39,
    sizes: null,
  },
  {
    title: "Wireless Headphones",
    handle: "wireless-headphones",
    subtitle: "40h battery, ANC",
    description:
      "Over-ear wireless headphones with active noise cancelling, 40-hour battery life and memory-foam earcups. Folds flat into the included travel case.",
    images: [img("1505740420928-5e560c06d30e")],
    category: "Accessories",
    collection: "Essentials",
    eur: 199,
    usd: 229,
    sizes: null,
  },
  // ——— Home ———
  {
    title: "Scented Candle",
    handle: "scented-candle",
    subtitle: "Cedar & amber, 60h burn",
    description:
      "Hand-poured soy wax with notes of cedar, amber and smoked vanilla. A 60-hour burn in a reusable glass vessel. Cotton wick, phthalate-free.",
    images: [img("1602874801007-bd458bb1b8b6"), img("1603006905003-be475563bc59")],
    category: "Home",
    collection: "New Arrivals",
    eur: 39,
    usd: 45,
    sizes: null,
  },
  {
    title: "Stoneware Mug",
    handle: "stoneware-mug",
    subtitle: "Matte glaze, 350ml",
    description:
      "A 350ml stoneware mug with a matte outer glaze and glossy interior. Thrown in small batches — slight variations are the point.",
    images: [img("1514228742587-6b1558fcca3d"), img("1578500494198-246f612d3b3d")],
    category: "Home",
    collection: "Bestsellers",
    eur: 24,
    usd: 28,
    sizes: null,
  },
  {
    title: "Insulated Bottle",
    handle: "insulated-bottle",
    subtitle: "Forest green, 500ml",
    description:
      "A double-walled steel bottle that keeps drinks cold for 24 hours or hot for 12. Powder-coated grip, leakproof cap, fits every cup holder.",
    images: [img("1602143407151-7111542de6e8")],
    category: "Home",
    collection: "Essentials",
    eur: 35,
    usd: 39,
    sizes: null,
  },
];

export default async function seedPremium({
  container,
}: {
  container: MedusaContainer;
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  // ——— Find existing infra created by the initial seed ———
  const { data: salesChannels } = await query.graph({
    entity: "sales_channel",
    fields: ["id", "name"],
  });
  const defaultSalesChannel = salesChannels[0];

  const { data: shippingProfiles } = await query.graph({
    entity: "shipping_profile",
    fields: ["id"],
  });
  const shippingProfile = shippingProfiles[0];

  const { data: stockLocations } = await query.graph({
    entity: "stock_location",
    fields: ["id"],
  });
  const stockLocation = stockLocations[0];

  if (!defaultSalesChannel || !shippingProfile || !stockLocation) {
    throw new Error(
      "Base seed missing (sales channel / shipping profile / stock location). Run the initial seed first."
    );
  }

  // ——— Remove demo products ———
  const { data: oldProducts } = await query.graph({
    entity: "product",
    fields: ["id", "handle"],
    filters: { handle: ["t-shirt", "sweatshirt", "sweatpants", "shorts"] },
  });
  if (oldProducts.length) {
    logger.info(`Deleting ${oldProducts.length} demo products...`);
    await deleteProductsWorkflow(container).run({
      input: { ids: oldProducts.map((p) => p.id) },
    });
  }

  // ——— Categories ———
  logger.info("Creating categories...");
  const { data: existingCategories } = await query.graph({
    entity: "product_category",
    fields: ["id", "name"],
  });
  const wantedCategories = [
    {
      name: "Apparel",
      handle: "apparel",
      description: "Everyday garments, built to last.",
      is_active: true,
    },
    {
      name: "Accessories",
      handle: "accessories",
      description: "The details that finish the look.",
      is_active: true,
    },
    {
      name: "Home",
      handle: "home-goods",
      description: "Objects for slower mornings.",
      is_active: true,
    },
  ];
  const toCreate = wantedCategories.filter(
    (c) => !existingCategories.some((e) => e.name === c.name)
  );
  if (toCreate.length) {
    await createProductCategoriesWorkflow(container).run({
      input: { product_categories: toCreate },
    });
  }
  const { data: categories } = await query.graph({
    entity: "product_category",
    fields: ["id", "name"],
  });
  const categoryByName = new Map(categories.map((c) => [c.name, c.id]));

  // ——— Collections ———
  logger.info("Creating collections...");
  const { data: existingCollections } = await query.graph({
    entity: "product_collection",
    fields: ["id", "handle"],
  });
  const wantedCollections = [
    { title: "New Arrivals", handle: "new-arrivals" },
    { title: "Bestsellers", handle: "bestsellers" },
    { title: "Essentials", handle: "essentials" },
  ];
  const collectionsToCreate = wantedCollections.filter(
    (c) => !existingCollections.some((e) => e.handle === c.handle)
  );
  if (collectionsToCreate.length) {
    await createCollectionsWorkflow(container).run({
      input: { collections: collectionsToCreate },
    });
  }
  const { data: collections } = await query.graph({
    entity: "product_collection",
    fields: ["id", "title"],
  });
  const collectionByTitle = new Map(collections.map((c) => [c.title, c.id]));

  // ——— Products ———
  const { data: existingProducts } = await query.graph({
    entity: "product",
    fields: ["handle"],
  });
  const existingHandles = new Set(existingProducts.map((p) => p.handle));
  const newProducts = PRODUCTS.filter((p) => !existingHandles.has(p.handle));

  logger.info(`Creating ${newProducts.length} products...`);
  if (newProducts.length) {
    await createProductsWorkflow(container).run({
      input: {
        products: newProducts.map((p) => {
          const sizes = p.sizes ?? ["One Size"];
          return {
            title: p.title,
            handle: p.handle,
            subtitle: p.subtitle,
            description: p.description,
            status: ProductStatus.PUBLISHED,
            category_ids: [categoryByName.get(p.category)!],
            collection_id: collectionByTitle.get(p.collection)!,
            shipping_profile_id: shippingProfile.id,
            weight: 400,
            images: p.images.map((url) => ({ url })),
            options: [{ title: "Size", values: sizes }],
            variants: sizes.map((size) => ({
              title: size,
              sku: `${p.handle.toUpperCase().replace(/-/g, "")}-${size
                .replace(/\s/g, "")
                .toUpperCase()}`,
              options: { Size: size },
              prices: [
                { amount: p.eur, currency_code: "eur" },
                { amount: p.usd, currency_code: "usd" },
              ],
            })),
            sales_channels: [{ id: defaultSalesChannel.id }],
          };
        }),
      },
    });
  }

  // ——— Inventory levels for anything missing one ———
  logger.info("Creating inventory levels...");
  const { data: inventoryItems } = await query.graph({
    entity: "inventory_item",
    fields: ["id", "location_levels.id"],
  });
  const missing = inventoryItems.filter(
    (i) => !i.location_levels || i.location_levels.length === 0
  );
  if (missing.length) {
    await createInventoryLevelsWorkflow(container).run({
      input: {
        inventory_levels: missing.map((item) => ({
          location_id: stockLocation.id,
          stocked_quantity: 250,
          inventory_item_id: item.id,
        })),
      },
    });
  }

  logger.info(
    `Done. ${newProducts.length} products created, ${missing.length} inventory levels added.`
  );
}
