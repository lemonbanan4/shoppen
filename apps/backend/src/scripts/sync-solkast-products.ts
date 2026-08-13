import fs from "fs";
import path from "path";
import { MedusaContainer } from "@medusajs/framework";
import {
  ContainerRegistrationKeys,
  ProductStatus,
} from "@medusajs/framework/utils";
import {
  createApiKeysWorkflow,
  createCollectionsWorkflow,
  createProductVariantsWorkflow,
  createProductsWorkflow,
  createSalesChannelsWorkflow,
  deleteProductVariantsWorkflow,
  deleteProductsWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
  updateProductVariantsWorkflow,
  updateProductsWorkflow,
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
  // Re-listed on Stone and White. This prints solkast-v2-light-18, one of the
  // "light" set drawn for a pale garment with the wordmark in near-black, and
  // it had been listed on Black and French Navy — wordmark black on black,
  // reading as a misprint rather than a design. Its two siblings from the same
  // set, Late Bloom and City Angel, were always on Stone and White; this one
  // got the dark blank and nothing about the artwork differs.
  //
  // Same failure as French Navy, which RETIRED_COLOURS already filters:
  // artwork keyed against one background, sold on another. A filter could not
  // fix this one, because a sync variant's colour is fixed at creation.
  "455594667": "Rose Sun Tee",
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

  // The rest of the Solstice range. Outerwear because the tracksuit needed a
  // third piece, and accessories because that is where a monogram actually
  // sells — the houses built on one move far more bags and hats than coats,
  // and a duffle has one size, so a bag that does not fit is not a return.
  //
  // Every sheet is tiled at the same 1100px cell, so a sun is the same size on
  // the bandana as on the jacket. Scaling the repeat to each panel instead
  // would have made it a different pattern on every product.
  //
  // The bandana at 299 is the cheapest way into the pattern and the duffle at
  // 1499 the most expensive thing in the shop, which is the spread a monogram
  // wants: the point of entry has to be reachable or the pattern never gets
  // seen on anyone.
  "455595147": "Solstice Zip Hoodie",
  "455595154": "Solstice Baseball Jersey",
  "455595166": "Solstice Bucket Hat",
  "455595175": "Solstice Duffle",
  "455595180": "Solstice Bandana",

  // v5, and the reason they exist: the same sun-ringed-by-molecular-bonds
  // vocabulary as the all-over pattern, at chest scale. The graphic tees and
  // the AOP pieces should read as one range seen at two sizes rather than two
  // unrelated drops.
  //
  // Split by field, not by preference. The dark artwork carries white and
  // silver and goes on Black; the light artwork has its wordmark in near-black
  // and goes on Stone and White. Listing either on the other garment is the
  // Rose Sun failure, which is fixed a few lines above.
  "455595267": "Chemistry of Light Tee",
  "455595274": "From Matter Tee",
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
  // Not a garment at all. These five were the sharpest case for reading the
  // material off the blank: the old constant told anyone buying a paper poster
  // it was heavyweight organic cotton, and had done since the day they were
  // listed. They were missed on the first pass of this table because
  // /store/products pages at 20 by default and the survey was written without
  // an offset — so the products existed, the survey did not see them, and the
  // fallback quietly covered for it.
  1: "Printed to order on heavyweight matte paper.",

  400: "Cut and sewn from recycled polyester, printed before assembly.",
  801: "Cut and sewn from recycled polyester, printed before assembly.",
  717: "Cut and sewn from recycled polyester, printed before assembly.",
  792: "Cut and sewn from recycled polyester, printed before assembly.",

  // Plain polyester, and said so. These three are the accessories in the same
  // range as the recycled garments above, and it would be easy to let the
  // sentence carry across — which is exactly the habit that had paper posters
  // describing themselves as organic cotton.
  //
  // The bandana is the one worth spelling out: Printful lists it as 65%
  // recycled polyester *in the EU* and plain polyester elsewhere. The shop
  // ships from the US, so the recycled claim does not hold for what a customer
  // here actually receives.
  654: "Cut and sewn from polyester, printed before assembly.",
  465: "Cut and sewn from polyester, printed before assembly.",
  630: "Cut and sewn from polyester, printed before assembly.",
  449: "Knitted from organic cotton.",
  491: "Organic cotton twill, embroidered to order.",
  528: "Organic cotton denim.",
  822: "Printed to order on heavyweight organic cotton.",
  823: "Printed to order on heavyweight organic cotton.",
  831: "Printed to order on heavyweight organic cotton.",
};

const MATERIAL_FALLBACK = "Made to order.";

type MockupManifest = Record<string, { name: string; images: string[] }>;

/**
 * Multi-view mockups produced by scripts/generate-printful-mockups.py.
 *
 * Optional by design: a missing manifest means every product falls back to
 * Printful's own per-variant preview, which is what the shop ran on before
 * these existed. It is not an error and must not stop a sync.
 *
 * The path list mirrors apply-printful-mockups.ts because `railway run` does
 * not reliably forward ad-hoc env vars into the command it spawns, so the
 * checked-in file has to be findable from more than one working directory.
 */
function loadMockups(logger: { info: (m: string) => void }): MockupManifest {
  const candidates = [
    process.env.MOCKUP_MANIFEST,
    path.resolve(process.cwd(), "mockups.json"),
    path.resolve(__dirname, "../../mockups.json"),
    path.resolve(process.cwd(), "apps/backend/mockups.json"),
  ].filter(Boolean) as string[];

  const found = candidates.find((p) => fs.existsSync(p));
  if (!found) {
    logger.info("No mockup manifest found — using Printful preview images.");
    return {};
  }
  try {
    const m = JSON.parse(fs.readFileSync(found, "utf8")) as MockupManifest;
    const withImages = Object.values(m).filter((v) => v.images?.length).length;
    logger.info(`Mockup manifest: ${found} (${withImages} product(s) with views)`);
    return m;
  } catch (e: any) {
    // A corrupt manifest should cost the extra angles, not the catalogue.
    logger.info(`Mockup manifest unreadable (${e.message}) — using previews.`);
    return {};
  }
}

type ExistingProduct = {
  id: string;
  title: string;
  options?: { id: string; title: string; values?: { value: string }[] }[];
  variants?: { id: string; title: string; metadata?: Record<string, unknown> | null }[];
};

type DesiredOption = { title: string; values: string[] };

/**
 * Does the live product already declare exactly the options we want?
 *
 * Compared as sets, because neither Printful nor Medusa promises an order and
 * a difference in ordering is not a difference in the product.
 */
function sameOptions(
  existing: ExistingProduct,
  desired: DesiredOption[]
): boolean {
  const norm = (title: string, values: string[]) =>
    `${title}:${[...values].sort().join("|")}`;
  const a = new Set(
    (existing.options || []).map((o) =>
      norm(o.title, (o.values || []).map((v) => v.value))
    )
  );
  const b = new Set(desired.map((o) => norm(o.title, o.values)));
  return a.size === b.size && [...b].every((x) => a.has(x));
}

/**
 * Bring a product's variants in line without touching the ones that are fine.
 *
 * Matched on printful_variant_id rather than title or SKU: the title carries
 * the colour and size and so changes whenever Printful renames a colourway,
 * and a variant whose title changed is still the same variant.
 *
 * Prices go through updateProductVariantsWorkflow with the full price array,
 * which replaces the set for that variant — the currencies a product sells in
 * can shrink as well as grow, and a merge would leave a stale price behind in
 * a region that was closed.
 */
async function reconcileVariants(
  container: MedusaContainer,
  existing: ExistingProduct,
  desired: any[],
  logger: { info: (m: string) => void }
): Promise<void> {
  const liveByPrintfulId = new Map(
    (existing.variants || []).map((v) => [
      String((v.metadata as Record<string, unknown> | null)?.printful_variant_id),
      v,
    ])
  );

  const toUpdate: any[] = [];
  const toCreate: any[] = [];
  const matched = new Set<string>();

  for (const d of desired) {
    const key = String(d.metadata?.printful_variant_id);
    const live = liveByPrintfulId.get(key);
    if (live) {
      matched.add(live.id);
      toUpdate.push({
        id: live.id,
        title: d.title,
        sku: d.sku,
        prices: d.prices,
        metadata: d.metadata,
      });
    } else {
      toCreate.push(d);
    }
  }

  const toDelete = (existing.variants || [])
    .filter((v) => !matched.has(v.id))
    .map((v) => v.id);

  if (toUpdate.length) {
    await updateProductVariantsWorkflow(container).run({
      input: { product_variants: toUpdate as never },
    });
  }
  if (toCreate.length) {
    await createProductVariantsWorkflow(container).run({
      input: {
        product_variants: toCreate.map((v) => ({
          ...v,
          product_id: existing.id,
        })) as never,
      },
    });
  }
  // Deleted last. A product must keep at least one variant to remain
  // purchasable, and removing the old set before adding the new one would
  // leave it briefly unbuyable — the same mistake as deleting the catalogue
  // before rebuilding it, one level down.
  if (toDelete.length) {
    await deleteProductVariantsWorkflow(container).run({
      input: { ids: toDelete },
    });
  }
  if (toCreate.length || toDelete.length) {
    logger.info(
      `      variants: ${toUpdate.length} kept, ${toCreate.length} added, ` +
        `${toDelete.length} removed`
    );
  }
}

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

/**
 * Ranges that get their own collection, matched on the product name.
 *
 * The nav carries Shop all, New arrivals and About, and a note saying the
 * category links come back when the catalogue does. It has: Solstice is seven
 * products — jacket, joggers, zip hoodie, jersey, bucket hat, duffle, bandana
 * — that share one pattern and want to be seen together. Scattered through a
 * 45-product grid they read as seven unrelated things.
 *
 * Assigned here rather than by hand in the admin because this script owns the
 * products. A collection set in the admin survives until the next time a
 * product is rebuilt for an option change, and then quietly does not.
 */
const COLLECTIONS: { title: string; handle: string; match: RegExp }[] = [
  { title: "Solstice", handle: "solstice", match: /^Solstice\b/ },
];

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
  const mockups = loadMockups(logger);

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

  // ——— Collections ———
  // Created if absent, reused if present. Matched on handle rather than title
  // so renaming the display name later does not orphan every product in it.
  const { data: liveCollections } = await query.graph({
    entity: "product_collection",
    fields: ["id", "handle"],
  });
  const collectionIdByHandle = new Map<string, string>(
    liveCollections.map((c) => [c.handle as string, c.id as string])
  );
  for (const c of COLLECTIONS) {
    if (collectionIdByHandle.has(c.handle)) continue;
    const { result } = await createCollectionsWorkflow(container).run({
      input: { collections: [{ title: c.title, handle: c.handle }] },
    });
    const created = Array.isArray(result) ? result[0] : result;
    collectionIdByHandle.set(c.handle, (created as { id: string }).id);
    logger.info(`Created collection "${c.title}".`);
  }

  // ——— Find what this store already has ———
  //
  // This used to delete every synced product up front and recreate all of
  // them. It worked, and it took the shop down while it ran: for the length of
  // the sync there was no catalogue, so every product page revalidating in
  // that window rendered against nothing and returned 500. It also issued a
  // fresh id and a fresh handle each time, so any link anyone had saved died
  // on every run — including the ones in the sitemap that had just been
  // submitted to Google.
  //
  // Now the run reconciles. Products are matched on printful_product_id, which
  // is stable across renames, and the delete of anything no longer curated
  // happens at the end rather than the start.
  //
  // Scoped by printful_store_id so the Ångerköp catalogue is untouched.
  const { data: allProducts } = await query.graph({
    entity: "product",
    fields: [
      "id", "title", "handle", "metadata",
      "options.id", "options.title", "options.values.value",
      "variants.id", "variants.title", "variants.metadata",
    ],
  });
  const mine = allProducts.filter(
    (p) =>
      String((p.metadata as Record<string, unknown> | null)?.printful_store_id) ===
      storeId
  );
  const existingByPrintfulId = new Map(
    mine.map((p) => [
      String((p.metadata as Record<string, unknown> | null)?.printful_product_id),
      p,
    ])
  );
  logger.info(
    `${mine.length} product(s) already synced from this store; reconciling.`
  );

  // ——— Build, then create or update ———
  // Handles must be unique across the whole store, not just this run: an
  // Ångerköp product already owning a slug would otherwise collide.
  const { data: handleRows } = await query.graph({
    entity: "product",
    fields: ["handle"],
  });
  // Products on their way out do not own their handle.
  //
  // Retirement happens at the end of the run, which is right — it is what
  // stops the catalogue disappearing mid-sync. But it means a product being
  // replaced still holds its slug while its replacement is created, so the new
  // one collides and falls back to `<slug>-<printfulId>`. That is exactly what
  // happened re-listing Rose Sun: the clean /rose-sun-tee was freed seconds
  // later by the retirement and nothing was left holding it.
  //
  // Which products are leaving is known before the loop starts, so exclude
  // them here rather than discovering the collision after the fact.
  const retiringHandles = new Set(
    mine
      .filter(
        (p) =>
          !CURATED[
            String(
              (p.metadata as Record<string, unknown> | null)
                ?.printful_product_id
            )
          ]
      )
      .map((p) => p.handle as string)
      .filter(Boolean)
  );
  const takenHandles = new Set<string>(
    (handleRows.map((r) => r.handle).filter(Boolean) as string[]).filter(
      (h) => !retiringHandles.has(h)
    )
  );

  let created = 0;
  let updated = 0;
  let rebuilt = 0;
  const seenPrintfulIds = new Set<string>();
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
    // Generated multi-view mockups win when there are any. Printful's sync API
    // exposes one front view per variant, which is all a plain graphic tee
    // needs and nowhere near enough for a garment printed edge to edge — the
    // whole claim about those is what happens around the back and down the
    // sleeve, and a single front shot is the one angle that cannot show it.
    //
    // Read here rather than applied afterwards by apply-printful-mockups.ts.
    // This sync replaces its products on every run, so anything written after
    // it survives exactly until the next one.
    const images = (
      mockups[String(p.id)]?.images?.length
        ? mockups[String(p.id)].images
        : [
            ...new Set(
              variants
                .map(
                  (v) =>
                    v.files?.find((f) => f.type === "preview")?.preview_url ||
                    v.files?.find((f) => f.type === "mockup")?.preview_url
                )
                .filter(Boolean) as string[]
            ),
          ]
    ).slice(0, MAX_IMAGES);

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
      // null, not undefined: a product dropped from a range has to be moved
      // out of its collection, and undefined would leave it where it was.
      collection_id:
        collectionIdByHandle.get(
          COLLECTIONS.find((c) => c.match.test(name))?.handle ?? ""
        ) ?? null,
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

    seenPrintfulIds.add(String(p.id));
    const existing = existingByPrintfulId.get(String(p.id));

    try {
      if (!existing) {
        await createProductsWorkflow(container).run({
          input: { products: [productInput as never] },
        });
        logger.info(`  + ${name}`);
        created++;
        continue;
      }

      // Options are the one thing that cannot be edited into place safely: a
      // variant may only carry option values its product declares, so a
      // colourway appearing or being retired has to change the product's
      // options before its variants, and Medusa exposes no single atomic way
      // to do that. Rebuilding one product is a second of downtime on one URL;
      // rebuilding all of them was the outage.
      if (!sameOptions(existing, productInput.options)) {
        logger.info(`  ↻ ${name} — options changed, rebuilding this one`);
        await deleteProductsWorkflow(container).run({
          input: { ids: [existing.id] },
        });
        await createProductsWorkflow(container).run({
          input: { products: [productInput as never] },
        });
        rebuilt++;
        continue;
      }

      // Keep the existing handle. It is the product's URL, it is what the
      // sitemap submitted, and regenerating it from the title would break
      // every saved link the moment a product is renamed.
      const { handle: _discard, options: _keep, variants: _v, ...fields } =
        productInput;

      // Reclaim a clean handle if this product is sitting on the collision
      // fallback and the clean one is now free.
      //
      // Narrow on purpose. Handles are otherwise never rewritten, because a
      // handle is the product's URL and rewriting one breaks every saved link.
      // The only form reclaimed is `<slug>-<printfulId>`, which nothing but
      // this script's own collision fallback produces — so this un-does a
      // machine-made ugly URL and cannot touch a deliberate one.
      // Compared against the handle toHandle just computed, not against
      // takenHandles. toHandle registers whatever it returns, so by this point
      // the clean slug is in that set — claimed by this very product — and
      // asking whether it is free answers "no" for the wrong reason.
      const suffix = `-${p.id}`;
      const currentHandle = existing.handle as string;
      const idealHandle = productInput.handle;
      if (currentHandle?.endsWith(suffix) && !idealHandle.endsWith(suffix)) {
        takenHandles.delete(currentHandle);
        (fields as Record<string, unknown>).handle = idealHandle;
        logger.info(`      handle: ${currentHandle} -> ${idealHandle}`);
      }
      await updateProductsWorkflow(container).run({
        input: { products: [{ id: existing.id, ...fields } as never] },
      });
      await reconcileVariants(container, existing, productInput.variants, logger);
      logger.info(`  ✓ ${name}`);
      updated++;
    } catch (e) {
      logger.error(`  ✗ ${name}: ${(e as Error).message}`);
    }
  }

  // ——— Retire what is no longer curated ———
  // Last, not first. Anything still wanted has already been updated in place
  // by this point, so the only products removed here are ones deliberately
  // dropped from CURATED or deleted upstream in Printful.
  const stale = mine.filter(
    (p) =>
      !seenPrintfulIds.has(
        String((p.metadata as Record<string, unknown> | null)?.printful_product_id)
      )
  );
  if (stale.length) {
    logger.info(
      `Retiring ${stale.length} product(s) no longer in the catalogue: ` +
        stale.map((p) => p.title).join(", ")
    );
    await deleteProductsWorkflow(container).run({
      input: { ids: stale.map((p) => p.id) },
    });
  }

  logger.info(
    `Done. ${created} created, ${updated} updated, ${rebuilt} rebuilt, ` +
      `${stale.length} retired — ${details.length} curated on the ` +
      `"${SALES_CHANNEL_NAME}" channel.`
  );
}
