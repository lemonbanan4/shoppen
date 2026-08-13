import { MedusaContainer } from "@medusajs/framework";
import {
  ContainerRegistrationKeys,
  ProductStatus,
} from "@medusajs/framework/utils";
import {
  createApiKeysWorkflow,
  createProductsWorkflow,
  createSalesChannelsWorkflow,
  deleteProductsWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
} from "@medusajs/medusa/core-flows";
import {
  PrintfulClient,
  PrintfulSyncProductDetail,
  PrintfulSyncVariant,
} from "../lib/printful-client";
import {
  STORE_CURRENCIES,
  convertToStorePrices,
  fetchExchangeRates,
} from "../lib/pricing";
import { displayTitle, toHandle } from "../lib/product-naming";

/**
 * Syncs the Solkast catalogue into its own sales channel.
 *
 *   npx medusa exec ./src/scripts/sync-solkast-products.ts
 *
 * Solkast lives in a second Printful store (the Ångerköp split left it as an
 * archive) and must not appear on angerkop.se, so everything here is scoped
 * twice over: products are stamped with this store's id, and published only
 * to the Solkast sales channel. The Ångerköp sync is scoped the same way and
 * will leave these alone.
 *
 * Only the curated twelve are pulled. The archive holds 33, but most are the
 * joke designs the brand is deliberately not built on.
 */

// Curated by hand, not filtered by rule: the distinction between "quiet" and
// "joke" is editorial and there is no field in Printful that encodes it. The
// archive holds 33 products; these are the twelve that fit the brand, plus
// the fourteen new graphic tees.
const CURATED: Record<string, string> = {
  // The launch ten. Colourways come from the rendered mockups rather than the
  // ink measurements — the metric is a decent screen for "will this vanish
  // entirely" and a poor verdict on anything else, having under-called three
  // designs in this set that the composites got right.
  //
  // The previous fourteen are deliberately gone. They were the first pass and
  // several were quiet enough to lose at thumbnail size, which is the size
  // that matters when the traffic arrives from a video.
  "455299292": "From Shadow Tee",
  "455299311": "Solar Crown Tee",
  "455299319": "Rose Sun Tee",
  "455299326": "Total Eclipse Tee",
  "455299329": "Built in Sunlight Tee",
  "455299333": "Driven by Light Tee",
  "455299343": "City Angel Tee",
  "455299390": "Late Bloom Tee",
  "455299399": "Nebula Tee",
  "455299401": "Solkast Mark Tee",

  // Hoodies. Slammer 2.0 carries Black and French Navy only — the blank has
  // no Stone, so the light-garment designs have no hoodie and are not forced
  // onto one.
  "455305623": "From Shadow Hoodie",
  "455305628": "Solar Crown Hoodie",
  "455305637": "Built in Sunlight Hoodie",

  // Prints. The artwork is 2:3, which is exactly poster ratio, so these are
  // the only products in the shop with no fit risk, no underbase and no size
  // chart — and the only ones whose print quality is not a question mark
  // until a sample arrives.
  "455305659": "From Shadow Print",
  "455305665": "Solar Crown Print",
  "455305688": "Total Eclipse Print",
  "455305730": "Nebula Print",
  "455305734": "Built in Sunlight Print",

  // Front logo, back graphic — the streetwear format, and the reason the v3
  // logo marks were worth generating. A second placement costs roughly 5-9
  // USD per unit, hence the 599 tier and hence only three of them: if every
  // piece is front-and-back, none of them is.
  "455308822": "From Shadow Tee — Back Print",
  "455308859": "Solar Crown Tee — Back Print",
  "455308887": "Total Eclipse Tee — Back Print",

  // Sweatshirts, on Raddler 2.0 — the crewneck sibling of the Blaster 2.0 tee,
  // so the range reads as one collection rather than a catalogue. Its front
  // placement is 1800x2400 at 150dpi, identical to the tee, so these reuse the
  // existing printfiles with nothing re-rendered.
  //
  // Only the three designs that already have a tee, a hoodie and a poster.
  // Widening the shop by form rather than by graphic is the point: twenty-one
  // products across three product types was wide on artwork and narrow on
  // everything else, which is backwards for a label selling a short list.
  //
  // 799 sits between the tee at 499 and the hoodie at 899, where a crewneck
  // belongs. The unused sweatshirt already in the Printful store was priced at
  // 949, above the hoodie.
  "455433316": "From Shadow Sweatshirt",
  "455433319": "Solar Crown Sweatshirt",
  "455433329": "Built in Sunlight Sweatshirt",

  // The tote is the only non-garment here and the cheapest way into the brand
  // at 299. Organic denim, one size, one colour, and a 1500x1500 square
  // placement that needed its own printfile rather than a letterboxed garment
  // one.
  "455433340": "Solkast Mark Tote",

  // Embroidered headwear, on organic blanks — the blank matters, because the
  // shop's claim is organic cotton and a conventional-cotton cap beside it
  // undercuts the only thing the brand says about itself.
  //
  // These carry the v3 brush logos already printed on the tees, put through
  // salvage-logo-for-embroidery.py: binarised to a silhouette, every blob
  // smaller than one stitch dropped, hairline gaps closed. The dry-brush
  // speckle is lost, which was never going to sew; the letterforms survive,
  // which are the part that is the brand.
  //
  // A first attempt used a drawn geometric sun instead. It stitched perfectly
  // and was wrong — a weather icon rather than Solkast — which is why the
  // salvage route is worth the extra step.
  //
  // White thread: Printful's embroidery palette holds fifteen colours and the
  // brand gold is not one of them.
  "455458157": "Solkast Cap",
  "455458168": "Solkast Beanie",

  // Colourways. Amber sits on the black cap rather than the light one:
  // Printful's palette holds exactly one amber, #A67843, and against Oyster
  // cream it measures 2.9:1 — under the ~3:1 embroidery needs and visibly
  // washed out. On black it is 4.5:1 and reads warm. The light cap takes black
  // thread instead, at 15.4:1.
  "455459500": "Solkast Cap — Amber",
  "455459505": "Solkast Cap — Oyster",

  // The Mono capsule: one-colour reductions on Heather Grey, the only
  // colourway the range had never used.
  //
  // The reason it went unused was never the colour. Every other design has its
  // background keyed against black or white, so on a mid-tone the garment
  // shows through wherever that field used to be — the same washed-out result
  // French Navy was retired for. A binarised silhouette carries its own
  // contrast and sits on anything: black ink reads 9.7:1 on #b0b0b0.
  //
  // Four rather than six. Structure and Molecule are both molecular diagrams
  // and would have read as one design printed twice; Liberty carries its form
  // in hue rather than luminance, so reducing it left an illegible mass.
  //
  // Full price, not a discount line — a one-colour print on heather is a more
  // expensive-looking garment than a full-colour one, not a cheaper one.
  "455581874": "Tuned Sun Mono Tee",
  "455581907": "Sun Face Mono Tee",
  "455581920": "Statue Dawn Mono Tee",
  "455581943": "Solkast Mono Tee",

  // Mono on fleece. The Slammer front placement is 1875x1875 square rather
  // than the tee's portrait, so these carry their own printfiles fitted to
  // 78% of it — a hoodie has a pouch pocket across the lower third and a
  // tee-sized print runs straight into it.
  //
  // Three, not four: Statue Dawn is the most delicate of the set and the
  // least suited to heavier fleece.
  "455583328": "Tuned Sun Mono Hoodie",
  "455583331": "Sun Face Mono Hoodie",
  "455583334": "Solkast Mono Hoodie",

  // The Solstice kit — the first pieces here that are printed rather than
  // decorated. Everything above is a blank someone else made with artwork
  // placed on a rectangle of it; these are printed on flat fabric which is
  // then cut and sewn, so the pattern crosses seams and runs down a sleeve
  // with nothing left blank.
  //
  // Sold as separates rather than as a set. A tracksuit bought whole is one
  // decision a shopper mostly does not make; either half worn with plain
  // black is the way these actually get worn.
  //
  // 1499 and 999 sit above the hoodie at 899 because the blanks cost 669 and
  // 389 against roughly 250 for fleece — the ladder tracks what the garment
  // costs, not how much artwork is on it.
  "455589012": "Solstice Track Jacket",
  "455589016": "Solstice Joggers",
};

/**
 * Colourways withheld from the shop, whatever Printful still lists.
 *
 * French Navy is wrong for every design currently in the range, and the reason
 * is the keying rather than the garment. Each design has its background
 * removed against the colour it was generated on, so wherever black used to be
 * the garment now shows through. On Black that is invisible and intended; on
 * French Navy the artwork reads navy exactly where it assumed black, which is
 * the washed-out look these prints have on it.
 *
 * Filtered at sync rather than deleted in Printful: the variants stay there,
 * costing nothing, and come back by removing a line here once there is
 * artwork built for a mid-tone garment. Deleting them would mean rebuilding
 * every product to get the colour back.
 */
const RETIRED_COLOURS = new Set(["French Navy"]);

/**
 * What each blank is actually made of, keyed by Printful catalogue product id.
 *
 * This replaced a constant. Every description used to end "Printed to order on
 * heavyweight organic cotton", which was written when the shop sold tees and
 * hoodies and nothing else. It stayed literally true for exactly as long as
 * that was the whole range: a beanie is not heavyweight, a tote is denim, and
 * an all-over-print garment cannot be cotton at all — sublimation ink bonds to
 * polyester and washes off cotton, so there is no version of that product the
 * old sentence describes.
 *
 * A material claim is the kind of copy a customer can hold you to, so an
 * unknown blank gets no claim rather than an inherited one. Adding a product
 * type the shop has not sold before should make the sentence go quiet, not
 * make it lie.
 */
const MATERIALS: Record<number, string> = {
  400: "Cut and sewn from recycled polyester, printed before assembly.",
  801: "Cut and sewn from recycled polyester, printed before assembly.",
  449: "Knitted from organic cotton.",
  491: "Organic cotton twill, embroidered to order.",
  528: "Organic cotton denim.",
  822: "Printed to order on heavyweight organic cotton.",
  823: "Printed to order on heavyweight organic cotton.",
  831: "Printed to order on heavyweight organic cotton.",
};

const MATERIAL_FALLBACK = "Made to order.";

/** The material sentence for a product, from the blank its variants sit on. */
function materialFor(variants: PrintfulSyncVariant[]): string {
  const ids = new Set(
    variants.map((v) => v.product?.product_id).filter(Boolean)
  );
  const claims = new Set(
    [...ids].map((id) => MATERIALS[id as number]).filter(Boolean)
  );
  // One product spanning two blanks with different materials cannot honestly
  // claim either, so it claims neither.
  return claims.size === 1 ? [...claims][0] : MATERIAL_FALLBACK;
}

const SALES_CHANNEL_NAME = "Solkast";
const API_KEY_TITLE = "Solkast Storefront";
const MAX_IMAGES = 6;

export default async function syncSolkastProducts({
  container,
}: {
  container: MedusaContainer;
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  const token = process.env.PRINTFUL_SOLKAST_API_TOKEN;
  const storeId = process.env.PRINTFUL_SOLKAST_STORE_ID;
  if (!token || !storeId) {
    logger.error(
      "PRINTFUL_SOLKAST_API_TOKEN and PRINTFUL_SOLKAST_STORE_ID must both be set."
    );
    return;
  }
  const client = new PrintfulClient(token, storeId);

  // ——— Sales channel ———
  const { data: channels } = await query.graph({
    entity: "sales_channel",
    fields: ["id", "name"],
  });
  let channel: { id: string } | undefined = channels.find(
    (c) => c.name === SALES_CHANNEL_NAME
  );
  if (!channel) {
    const { result } = await createSalesChannelsWorkflow(container).run({
      input: {
        salesChannelsData: [
          {
            name: SALES_CHANNEL_NAME,
            description: "Solkast — solkast.com",
          },
        ],
      },
    });
    channel = result[0];
    logger.info(`Created sales channel "${SALES_CHANNEL_NAME}".`);
  }

  // ——— Publishable key, scoped to that channel ———
  const { data: keys } = await query.graph({
    entity: "api_key",
    fields: ["id", "title", "token"],
  });
  let apiKey: { id: string; token?: string } | undefined = keys.find(
    (k) => k.title === API_KEY_TITLE
  );
  if (!apiKey) {
    const { result } = await createApiKeysWorkflow(container).run({
      input: {
        api_keys: [
          { title: API_KEY_TITLE, type: "publishable", created_by: "system" },
        ],
      },
    });
    apiKey = result[0];
    await linkSalesChannelsToApiKeyWorkflow(container).run({
      input: { id: apiKey!.id, add: [channel!.id] },
    });
    logger.info(`Created publishable key for ${SALES_CHANNEL_NAME}.`);
  }
  logger.info(`Solkast publishable key: ${apiKey!.token}`);

  // ——— Stock location ———
  // Medusa resolves shipping options through cart -> sales channel -> stock
  // location -> fulfilment set -> service zone. A channel with no location
  // breaks that chain silently: products list, prices calculate, the cart
  // accepts an address, and then checkout offers no shipping method at all.
  //
  // This channel shipped without the link and nothing caught it, because the
  // Ångerköp funnel was the one being tested end to end and it runs on the
  // default channel, which the seed had already linked. Solkast could never
  // have taken an order.
  const { data: locations } = await query.graph({
    entity: "stock_location",
    fields: ["id", "name", "sales_channels.id"],
  });
  const location = locations[0];
  if (!location) {
    logger.error("No stock location exists — cannot sell from this channel.");
  } else {
    const linked = (location.sales_channels || []).some(
      (c) => (c as { id?: string } | null)?.id === channel!.id
    );
    if (linked) {
      logger.info(`Sales channel already served by "${location.name}".`);
    } else {
      await linkSalesChannelsToStockLocationWorkflow(container).run({
        input: { id: location.id, add: [channel!.id] },
      });
      logger.info(`Linked "${SALES_CHANNEL_NAME}" to stock location "${location.name}".`);
    }
  }

  // ——— Fetch the curated products ———
  const details: PrintfulSyncProductDetail[] = [];
  for (const id of Object.keys(CURATED)) {
    try {
      details.push(await client.getProduct(Number(id)));
    } catch (e) {
      logger.warn(`Skipping ${id} (${CURATED[id]}): ${(e as Error).message}`);
    }
  }
  if (!details.length) {
    logger.error("No Solkast products could be fetched. Nothing to do.");
    return;
  }
  logger.info(
    `Fetched ${details.length}/${Object.keys(CURATED).length} curated Solkast products.`
  );

  const psychologicalRounding =
    process.env.PRINTFUL_PSYCHOLOGICAL_ROUNDING !== "false";
  const ratesByCurrency = new Map<string, Record<string, number>>();
  for (const d of details) {
    for (const v of d.sync_variants) {
      const cur = (v.currency || "usd").toLowerCase();
      if (!ratesByCurrency.has(cur)) {
        ratesByCurrency.set(
          cur,
          await fetchExchangeRates(cur, STORE_CURRENCIES, logger)
        );
      }
    }
  }

  const { data: profiles } = await query.graph({
    entity: "shipping_profile",
    fields: ["id"],
  });

  // ——— Replace this store's previously synced products ———
  // Scoped by printful_store_id so the Ångerköp catalogue is untouched.
  const { data: allProducts } = await query.graph({
    entity: "product",
    fields: ["id", "title", "metadata"],
  });
  const mine = allProducts.filter(
    (p) =>
      String((p.metadata as Record<string, unknown> | null)?.printful_store_id) ===
      storeId
  );
  if (mine.length) {
    logger.info(`Replacing ${mine.length} previously synced Solkast product(s)...`);
    await deleteProductsWorkflow(container).run({
      input: { ids: mine.map((p) => p.id) },
    });
  }

  // ——— Build and create ———
  // Handles must be unique across the whole store, not just this run: an
  // Ångerköp product already owning a slug would otherwise collide.
  const { data: handleRows } = await query.graph({
    entity: "product",
    fields: ["handle"],
  });
  const takenHandles = new Set<string>(
    handleRows.map((r) => r.handle).filter(Boolean) as string[]
  );

  let created = 0;
  for (const detail of details) {
    const p = detail.sync_product;
    const variants = detail.sync_variants.filter(
      (v) => !RETIRED_COLOURS.has((v.color || "").trim())
    );
    if (!variants.length) continue;

    const name = displayTitle(p.name);
    const sizes = [...new Set(variants.map((v) => v.size).filter(Boolean))];
    const colors = [...new Set(variants.map((v) => v.color).filter(Boolean))];

    // Only declare options that actually vary — a beanie with one size and
    // one colour otherwise gets two pointless single-value dropdowns.
    const options: { title: string; values: string[] }[] = [];
    if (sizes.length > 1) options.push({ title: "Size", values: sizes as string[] });
    if (colors.length > 1) options.push({ title: "Color", values: colors as string[] });
    if (!options.length) options.push({ title: "Style", values: ["Standard"] });

    // One image per variant, preferring the "preview" file and falling back to
    // "mockup".
    //
    // Filtering on "preview" alone is why every one of these products shipped
    // with no picture at all: Printful returns the generated mockup under
    // whichever of the two names suits how the product was made, and products
    // created through the API — which all fourteen of these were — come back
    // carrying "front" and "mockup", never "preview". The filter matched
    // nothing, images was an empty array, and the storefront rendered blank
    // tiles. The Ångerköp sync already falls back this way; this one never got
    // the fix.
    //
    // Taken per variant rather than flattened across all of them so the
    // colourways stay in variant order instead of arriving in whatever order
    // the files happen to be listed.
    const images = [
      ...new Set(
        variants
          .map(
            (v) =>
              v.files?.find((f) => f.type === "preview")?.preview_url ||
              v.files?.find((f) => f.type === "mockup")?.preview_url
          )
          .filter(Boolean) as string[]
      ),
    ].slice(0, MAX_IMAGES);

    if (!images.length) {
      logger.warn(
        `  ! ${name} has no usable mockup — it will render as a blank tile.`
      );
    }

    const productInput = {
      title: name,
      handle: toHandle(name, p.id, takenHandles),
      status: ProductStatus.PUBLISHED,
      // No origin named. A product description is stored once and served to
      // every region, so "in the EU" was being shown to a US shopper whose
      // order prints in the US — and the EU is no longer sold to at all. The
      // region-aware wording lives in the storefront copy layer, which knows
      // the country; this string cannot.
      //
      // The material is read off the blank rather than asserted. It used to be
      // a constant reading "heavyweight organic cotton", which was true of the
      // tees and hoodies the shop started with and stopped being true the
      // moment anything else was added — an all-over-print garment has to be
      // polyester, because sublimation does not bond to cotton.
      description: `${name} — Solkast. ${materialFor(variants)}`,
      shipping_profile_id: profiles[0]?.id,
      images: images.map((url) => ({ url })),
      options,
      metadata: {
        printful_product_id: p.id,
        printful_store_id: storeId,
        fulfillment: "printful",
        brand: "solkast",
      },
      variants: variants.map((v: PrintfulSyncVariant) => {
        const optValues: Record<string, string> = {};
        if (sizes.length > 1) optValues["Size"] = v.size as string;
        if (colors.length > 1) optValues["Color"] = v.color as string;
        if (!Object.keys(optValues).length) optValues["Style"] = "Standard";

        const cur = (v.currency || "usd").toLowerCase();
        return {
          title: v.name,
          sku: v.sku || undefined,
          options: optValues,
          manage_inventory: false,
          metadata: { printful_variant_id: v.id },
          prices: convertToStorePrices(
            parseFloat(v.retail_price),
            ratesByCurrency.get(cur)!,
            psychologicalRounding
          ),
        };
      }),
      sales_channels: [{ id: channel!.id }],
    };

    try {
      await createProductsWorkflow(container).run({
        input: { products: [productInput as never] },
      });
      logger.info(`  ✓ ${name}`);
      created++;
    } catch (e) {
      logger.error(`  ✗ ${name}: ${(e as Error).message}`);
    }
  }

  logger.info(
    `Done. ${created}/${details.length} Solkast products on the "${SALES_CHANNEL_NAME}" channel.`
  );
}
