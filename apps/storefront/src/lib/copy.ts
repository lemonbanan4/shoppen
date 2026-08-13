import { isSolkast } from "./brand"

/**
 * UI chrome strings, in the language the visitor is actually shopping in.
 *
 * The rule is narrower than it looks. Swedish is not a property of the brand
 * or of the deployment — Ångerköp serves /se in Swedish and /dk, /de, /gb in
 * English off the same build, and Solkast is English everywhere. So the
 * switch is per-route: Swedish only when Ångerköp is serving the Swedish
 * country code.
 *
 * That condition was previously written inline at each call site, as
 * `!isSolkast && countryCode === "se" ? "Konto" : "Account"`. It was correct
 * in the three places it appeared and simply absent from the rest, which is
 * how a Swedish shop ended up with "Sort by", "Customer care" and "Stay in
 * the loop" in its furniture. Keeping the condition in one place means a new
 * string can only be added to both languages at once.
 *
 * Server components take countryCode from their params; client components
 * call useCopy(), which reads the same value off the route.
 */

export type UiCopy = {
  // ——— Nav ———
  announcement: string
  shopAll: string
  newArrivals: string
  solstice: string
  about: string
  bestsellers: string
  home: string
  menu: string
  account: string
  cart: string
  /** Cart with a count, e.g. "Varukorg (2)". */
  cartWithCount: (n: number) => string

  // ——— Search ———
  search: string
  searchAria: string
  searchPlaceholder: string
  searchClose: string
  searchEmpty: (query: string) => string
  searchViewAll: (query: string) => string

  // ——— Cart dropdown ———
  cartHeading: string
  cartEmpty: string
  cartEmptyBody: string
  cartExplore: string
  cartQuantity: string
  cartSubtotal: string
  cartExcludingTaxes: string
  cartExploreAria: string
  cartGoTo: string

  // ——— Store listing ———
  sortBy: string
  sortLatest: string
  sortPriceAsc: string
  sortPriceDesc: string
  allProducts: string
  resultsFor: (query: string) => string
  storeTitle: string
  storeDescription: string

  // ——— Footer ———
  footerBlurb: string
  footerShop: string
  footerCollections: string
  footerCustomerCare: string
  myAccount: string
  orderHistory: string
  aboutBrand: (brand: string) => string
  customerService: string
  shippingReturns: string
  privacyPolicy: string
  termsOfUse: string
  rightsReserved: string
  /** The one shipping promise for this locale. Never both. */
  shippingNote: string
  paymentMethods: string

  // ——— Product page ———
  tabDetails: string
  tabSizeGuide: string
  tabShipping: string
  measurement: (unit: string) => string
  sizeGuideNote: string
  detailsPending: string
  attrMaterial: string
  attrWeight: string
  attrOrigin: string
  attrType: string
  attrDimensions: string
  shipFastTitle: string
  shipFastBody: string
  shipExchangeTitle: string
  shipExchangeBody: string
  shipReturnTitle: string
  shipReturnBody: string
  selectSize: string
  selectOptions: string
  selectVariant: string
  outOfStock: string
  addToCart: string
  /** "Välj Color" would be worse than not translating at all — the option
   *  titles come from Medusa as English, so they are mapped here too. */
  selectOption: (optionTitle: string) => string
  priceFrom: string

  // ——— Cart & checkout ———
  cartPageTitle: string
  cartPageDescription: string
  checkoutTitle: string
  cartEmptySee: string
  cartEmptyBlurb: string
  cartEmptyShop: string
  haveAccount: string
  signIn: string
  signInBetter: string
  colItem: string
  colPrice: string
  colQuantity: string
  colTotal: string
  totalsSubtotal: string
  totalsShipping: string
  totalsDiscount: string
  totalsTaxes: string
  summary: string
  goToCheckout: string
  inYourCart: string
  contact: string
  shippingAddress: string
  billingAddress: string
  billingSameAsShipping: string
  billingSameNote: string
  continueToDelivery: string
  continueToPayment: string
  edit: string
  firstName: string
  lastName: string
  address: string
  company: string
  postalCode: string
  city: string
  stateProvince: string
  phone: string
  email: string
  emailInvalid: string
  deliveryHeading: string
  shippingMethod: string
  method: string
  pickUp: string
  chooseStore: string
  store: string
  payment: string
  paymentMethod: string
  paymentDetails: string
  /** Only the generic provider names translate; PayPal and iDeal are brands. */
  paymentTitle: (providerId: string, fallback: string) => string
  backToCart: string
  back: string
  giftCard: string
  cardDetails: string
  review: string
  delivery: string
  continueToReview: string
  placeOrder: string
  selectPaymentMethod: string
  addPromoCode: string
  apply: string
  promoApplied: string
  removeDiscount: string
  attention: string
  freeShipUnlock: string
  freeShipUnlocked: string
  freeShipOnly: string
  freeShipAway: string
  viewCart: string
  viewProducts: string

  // ——— Newsletter ———
  newsletterHeading: string
  newsletterButton: string
  newsletterPlaceholder: string
  newsletterSuccess: string
  newsletterError: string
}

const SV: UiCopy = {
  announcement: "Fri frakt över 800 kr — enkel 30 dagars retur",
  shopAll: "Handla allt",
  newArrivals: "Nyheter",
  solstice: "Solstice",
  about: "Om oss",
  bestsellers: "Mest sålda",
  home: "Hem",
  menu: "Meny",
  account: "Konto",
  cart: "Varukorg",
  cartWithCount: (n) => `Varukorg (${n})`,

  search: "Sök",
  searchAria: "Sök produkter",
  searchPlaceholder: "Sök efter produkter…",
  searchClose: "Stäng sökningen",
  searchEmpty: (q) => `Inga träffar för ”${q}”`,
  searchViewAll: (q) => `Visa alla träffar för ”${q}”`,

  cartHeading: "Varukorg",
  cartEmpty: "Din varukorg är tom",
  cartEmptyBody: "Ingen fara. Ångerköpet väntar.",
  cartExplore: "Utforska produkter",
  cartQuantity: "Antal",
  cartSubtotal: "Delsumma",
  cartExcludingTaxes: "(exkl. moms)",
  cartExploreAria: "Gå till alla produkter",
  cartGoTo: "Till varukorgen",

  sortBy: "Sortera efter",
  sortLatest: "Senast inkomna",
  sortPriceAsc: "Pris: lågt till högt",
  sortPriceDesc: "Pris: högt till lågt",
  allProducts: "Alla produkter",
  resultsFor: (q) => `Träffar för ”${q}”`,
  storeTitle: "Butik",
  storeDescription: "Hela sortimentet.",

  footerBlurb:
    "Svenskt streetwear-märke för dig som redan vet hur det slutar. " +
    "Ekologisk bomull, tryckt på beställning i EU. Köp nu, ångra sen.",
  footerShop: "Handla",
  footerCollections: "Kollektioner",
  footerCustomerCare: "Kundservice",
  myAccount: "Mitt konto",
  orderHistory: "Orderhistorik",
  aboutBrand: (brand) => `Om ${brand}`,
  customerService: "Kundtjänst",
  shippingReturns: "Frakt & retur",
  privacyPolicy: "Integritetspolicy",
  termsOfUse: "Användarvillkor",
  rightsReserved: "Alla rättigheter förbehållna.",
  shippingNote: "Fri frakt över 800 kr · 30 dagars retur",
  paymentMethods: "Godkända betalsätt",

  tabDetails: "Detaljer & material",
  tabSizeGuide: "Storleksguide",
  tabShipping: "Frakt & retur",
  measurement: (unit) => `Mått (${unit})`,
  sizeGuideNote:
    "Plaggmått, uppmätta plant. Mellan två storlekar? Ta den större för " +
    "den oversize-passform plagget är gjort för.",
  detailsPending: "Fullständiga detaljer för det här plagget är på väg.",
  attrMaterial: "Material",
  attrWeight: "Vikt",
  attrOrigin: "Tillverkningsland",
  attrType: "Typ",
  attrDimensions: "Mått",
  shipFastTitle: "Skickas från EU",
  shipFastBody:
    "Tryckt på beställning och skickat inom EU. Räkna med 2–7 arbetsdagar " +
    "efter att trycket är klart.",
  shipExchangeTitle: "Enkelt byte",
  shipExchangeBody:
    "Sitter den inte som du tänkt? Hör av dig så byter vi till en ny.",
  shipReturnTitle: "Enkel retur",
  shipReturnBody:
    "Skicka tillbaka plagget inom 30 dagar så får du pengarna tillbaka. " +
    "Inga följdfrågor.",
  selectSize: "Välj storlek",
  selectOptions: "Välj alternativ",
  selectVariant: "Välj variant",
  outOfStock: "Slutsåld",
  addToCart: "Lägg i varukorgen",
  selectOption: (o) =>
    `Välj ${({ Color: "färg", Size: "storlek", Style: "modell" } as Record<string, string>)[o] ?? o.toLowerCase()}`,
  priceFrom: "Från ",

  cartPageTitle: "Varukorg",
  cartPageDescription: "Se din varukorg",
  checkoutTitle: "Kassa",
  cartEmptySee: "Se nyheter",
  cartEmptyBlurb:
    "Inget här än. Allt trycks på beställning, så ta den tid du behöver — ta en titt på det som just landat.",
  cartEmptyShop: "Handla allt",
  haveAccount: "Har du redan ett konto?",
  signIn: "Logga in",
  signInBetter: "Logga in för en smidigare upplevelse.",
  colItem: "Artikel",
  colPrice: "Pris",
  colQuantity: "Antal",
  colTotal: "Totalt",
  totalsSubtotal: "Delsumma (exkl. frakt och moms)",
  totalsShipping: "Frakt",
  totalsDiscount: "Rabatt",
  totalsTaxes: "Moms",
  summary: "Sammanfattning",
  goToCheckout: "Till kassan",
  inYourCart: "I din varukorg",
  contact: "Kontakt",
  shippingAddress: "Leveransadress",
  billingAddress: "Fakturaadress",
  billingSameAsShipping: "Fakturaadress är samma som leveransadress",
  billingSameNote: "Faktura- och leveransadress är desamma.",
  continueToDelivery: "Fortsätt till leverans",
  continueToPayment: "Fortsätt till betalning",
  edit: "Ändra",
  firstName: "Förnamn",
  lastName: "Efternamn",
  address: "Adress",
  company: "Företag",
  postalCode: "Postnummer",
  city: "Ort",
  stateProvince: "Län / region",
  phone: "Telefon",
  email: "E-post",
  emailInvalid: "Ange en giltig e-postadress.",
  deliveryHeading: "Hur vill du få din order levererad?",
  shippingMethod: "Fraktsätt",
  method: "Sätt",
  pickUp: "Hämta din order",
  chooseStore: "Välj ett ombud nära dig",
  store: "Ombud",
  payment: "Betalning",
  paymentMethod: "Betalsätt",
  paymentDetails: "Betaluppgifter",
  paymentTitle: (id, fallback) =>
    ({ pp_stripe_stripe: "Kort", "pp_medusa-payments_default": "Kort",
       pp_system_default: "Manuell betalning" } as Record<string, string>)[id] ?? fallback,
  backToCart: "Tillbaka till varukorgen",
  back: "Tillbaka",
  giftCard: "Presentkort",
  cardDetails: "Fyll i dina kortuppgifter:",
  review: "Granska",
  delivery: "Leverans",
  continueToReview: "Fortsätt till granskning",
  placeOrder: "Slutför köp",
  selectPaymentMethod: "Välj ett betalsätt",
  addPromoCode: "Lägg till rabattkod",
  apply: "Använd",
  promoApplied: "Rabatt tillagd:",
  removeDiscount: "Ta bort rabattkoden från ordern",
  attention: "Observera:",
  freeShipUnlock: "Lås upp fri frakt",
  freeShipUnlocked: "Fri frakt upplåst!",
  freeShipOnly: "Bara ",
  freeShipAway: " kvar",
  viewCart: "Visa varukorg",
  viewProducts: "Visa produkter",

  newsletterHeading: "Håll dig uppdaterad",
  newsletterButton: "Gå med",
  newsletterPlaceholder: "du@exempel.se",
  newsletterSuccess: "Du är med på listan",
  newsletterError: "Kunde inte anmäla dig just nu.",
}

const EN: UiCopy = {
  announcement: "Free shipping on orders over €75 — easy 30-day returns",
  shopAll: "Shop all",
  newArrivals: "New arrivals",
  solstice: "Solstice",
  about: "About",
  bestsellers: "Bestsellers",
  home: "Home",
  menu: "Menu",
  account: "Account",
  cart: "Cart",
  cartWithCount: (n) => `Cart (${n})`,

  search: "Search",
  searchAria: "Search products",
  searchPlaceholder: "Search for products…",
  searchClose: "Close search",
  searchEmpty: (q) => `Nothing found for “${q}”`,
  searchViewAll: (q) => `View all results for “${q}”`,

  cartHeading: "Cart",
  cartEmpty: "Your cart is empty",
  cartEmptyBody: "There is still time to change that.",
  cartExplore: "Explore products",
  cartQuantity: "Quantity",
  cartSubtotal: "Subtotal",
  cartExcludingTaxes: "(excl. taxes)",
  cartExploreAria: "Go to all products page",
  cartGoTo: "Go to cart",

  sortBy: "Sort by",
  sortLatest: "Latest arrivals",
  sortPriceAsc: "Price: low to high",
  sortPriceDesc: "Price: high to low",
  allProducts: "All products",
  resultsFor: (q) => `Results for “${q}”`,
  storeTitle: "Store",
  storeDescription: "Explore all of our products.",

  // No blanket material claim: the range now spans organic cotton and
  // recycled polyester, and the all-over pieces could never have been cotton.
  footerBlurb: isSolkast
    ? "Considered graphics, printed to order. " +
      "No warehouse, no overproduction."
    : "Swedish streetwear for people who already know how it ends. " +
      "Organic cotton, printed to order in the EU. Buy now, regret later.",
  footerShop: "Shop",
  footerCollections: "Collections",
  footerCustomerCare: "Customer care",
  myAccount: "My account",
  orderHistory: "Order history",
  aboutBrand: (brand) => `About ${brand}`,
  customerService: "Customer service",
  shippingReturns: "Shipping & returns",
  privacyPolicy: "Privacy policy",
  termsOfUse: "Terms of use",
  rightsReserved: "All rights reserved.",
  shippingNote: "Free EU shipping over €75 · 30-day returns",
  paymentMethods: "Accepted payment methods",

  tabDetails: "Details & fabric",
  tabSizeGuide: "Size guide",
  tabShipping: "Shipping & returns",
  measurement: (unit) => `Measurement (${unit})`,
  sizeGuideNote:
    "Garment measurements, taken flat. Between sizes? Size up for the " +
    "intended oversized fit.",
  detailsPending: "Full details for this piece are on their way.",
  attrMaterial: "Material",
  attrWeight: "Weight",
  attrOrigin: "Country of origin",
  attrType: "Type",
  attrDimensions: "Dimensions",
  shipFastTitle: "Ships from the EU",
  shipFastBody:
    "Printed to order and shipped within the EU. Expect 2–7 working days " +
    "once printing is done.",
  shipExchangeTitle: "Simple exchanges",
  shipExchangeBody:
    "Is the fit not quite right? Get in touch and we'll exchange it.",
  shipReturnTitle: "Easy returns",
  shipReturnBody:
    "Send it back within 30 days and we'll refund you. No follow-up questions.",
  selectSize: "Select size",
  selectOptions: "Select options",
  selectVariant: "Select variant",
  outOfStock: "Out of stock",
  addToCart: "Add to cart",
  selectOption: (o) => `Select ${o.toLowerCase()}`,
  priceFrom: "From ",

  cartPageTitle: "Cart",
  cartPageDescription: "View your cart",
  checkoutTitle: "Checkout",
  cartEmptySee: "See new arrivals",
  cartEmptyBlurb:
    "Nothing in here yet. Every piece is printed to order, so take your time — have a look at what\u2019s just landed.",
  cartEmptyShop: "Shop all products",
  haveAccount: "Already have an account?",
  signIn: "Sign in",
  signInBetter: "Sign in for a better experience.",
  colItem: "Item",
  colPrice: "Price",
  colQuantity: "Quantity",
  colTotal: "Total",
  totalsSubtotal: "Subtotal (excl. shipping and taxes)",
  totalsShipping: "Shipping",
  totalsDiscount: "Discount",
  totalsTaxes: "Taxes",
  summary: "Summary",
  goToCheckout: "Go to checkout",
  inYourCart: "In your cart",
  contact: "Contact",
  shippingAddress: "Shipping address",
  billingAddress: "Billing address",
  billingSameAsShipping: "Billing address same as shipping address",
  billingSameNote: "Billing and delivery address are the same.",
  continueToDelivery: "Continue to delivery",
  continueToPayment: "Continue to payment",
  edit: "Edit",
  firstName: "First name",
  lastName: "Last name",
  address: "Address",
  company: "Company",
  postalCode: "Postal code",
  city: "City",
  stateProvince: "State / Province",
  phone: "Phone",
  email: "Email",
  emailInvalid: "Enter a valid email address.",
  deliveryHeading: "How would you like your order delivered?",
  shippingMethod: "Shipping method",
  method: "Method",
  pickUp: "Pick up your order",
  chooseStore: "Choose a store near you",
  store: "Store",
  payment: "Payment",
  paymentMethod: "Payment method",
  paymentDetails: "Payment details",
  paymentTitle: (_id, fallback) => fallback,
  backToCart: "Back to shopping cart",
  back: "Back",
  giftCard: "Gift card",
  cardDetails: "Enter your card details:",
  review: "Review",
  delivery: "Delivery",
  continueToReview: "Continue to review",
  placeOrder: "Place order",
  selectPaymentMethod: "Select a payment method",
  addPromoCode: "Add promotion code(s)",
  apply: "Apply",
  promoApplied: "Promotion(s) applied:",
  removeDiscount: "Remove discount code from order",
  attention: "Attention:",
  freeShipUnlock: "Unlock free shipping",
  freeShipUnlocked: "Free shipping unlocked!",
  freeShipOnly: "Only ",
  freeShipAway: " away",
  viewCart: "View cart",
  viewProducts: "View products",

  newsletterHeading: "Stay in the loop",
  newsletterButton: "Join",
  newsletterPlaceholder: "you@example.com",
  newsletterSuccess: "You're on the list",
  newsletterError: "Couldn't subscribe right now.",
}

/**
 * Countries in the backend's Europe region, which prices in EUR and is the
 * only region whose free-shipping threshold is €75.
 *
 * Duplicated from the backend rather than fetched because copyFor is sync and
 * runs in the announcement bar on every render. The cost of that duplication
 * is drift, so the fallback below is the conservative one: a country this list
 * has not heard of gets no threshold claim at all.
 */
const EUR_COUNTRIES = new Set([
  "at", "be", "bg", "ch", "cy", "cz", "de", "dk", "ee", "es", "fi", "fr",
  "gb", "gr", "hr", "hu", "ie", "is", "it", "li", "lt", "lu", "lv", "mt",
  "nl", "no", "pl", "pt", "ro", "si", "sk",
])

/**
 * For server components, which receive countryCode from route params.
 *
 * The two shipping strings are picked by region, not by language, because
 * they quote a number the cart has to honour. Each region carries its own
 * threshold, set as a conditional 0-amount price on its standard shipping
 * option:
 *
 *   Sweden          free over 800 kr
 *   Europe (EUR)    free over €75
 *   United States   free over $85
 *   Rest of World   no free shipping at all
 *
 * That last row is why this is not simply a currency-symbol swap. Rest of
 * World covers 41 countries and its only options are International
 * Standard/Express at a flat 15/29 USD — there is no conditional price to
 * reach. Every one of those visitors was being shown "free shipping on orders
 * over €75": the wrong currency, the wrong number, and a threshold that does
 * not exist. They get a claim the cart can keep instead.
 *
 * A Swede shopping Solkast in English still reads "800 kr", because the
 * threshold follows their cart, not the language it is described in.
 */
export type ShippingRegion = "se" | "eu" | "us" | "world"

/** Which backend region's shipping terms apply to this route. */
export function shippingRegionFor(countryCode?: string): ShippingRegion {
  const cc = countryCode?.toLowerCase()
  if (cc === "se") return "se"
  if (cc === "us") return "us"
  if (cc && EUR_COUNTRIES.has(cc)) return "eu"
  return "world"
}

/**
 * The one shipping claim, in every place that makes it.
 *
 * Exported so the USP bar and the announcement bar cannot drift apart — they
 * already had two separate hand-written ladders, which is how "€75" survived
 * on a dollar storefront.
 */
export const SHIPPING_PROMISE: Record<
  ShippingRegion,
  { announcement: string; note: string; uspTitle: string; uspDetail: string }
> = {
  se: {
    announcement: "Free shipping over 800 kr — easy 30-day returns",
    note: "Free shipping over 800 kr · 30-day returns",
    uspTitle: "Free shipping",
    uspDetail: "On orders over 800 kr",
  },
  eu: {
    announcement: "Free shipping on orders over €75 — easy 30-day returns",
    note: "Free EU shipping over €75 · 30-day returns",
    uspTitle: "Free EU shipping",
    uspDetail: "On orders over €75",
  },
  us: {
    announcement: "Free shipping on orders over $85 — easy 30-day returns",
    note: "Free US shipping over $85 · 30-day returns",
    uspTitle: "Free US shipping",
    uspDetail: "On orders over $85",
  },
  world: {
    announcement: "Worldwide shipping — easy 30-day returns",
    note: "Worldwide shipping · 30-day returns",
    uspTitle: "Worldwide shipping",
    uspDetail: "Flat rate, tracked, 30-day returns.",
  },
}

/**
 * Where an order is actually printed, per region.
 *
 * Printful routes every order to its nearest production facility, which is
 * verifiable rather than assumed: a one-item quote to Los Angeles comes back
 * at 5.37 USD delivered in 4–6 days, and nothing crosses the Atlantic in four
 * days for five dollars. Stockholm quotes 3–4 days from the EU.
 *
 * So "printed to order in the EU" — which the footer, hero, about page and
 * terms all stated as fact — is simply untrue on the US storefront. It also
 * sold the shop short: printed-in-your-own-country is the better claim for a
 * US buyer, and it is the true one.
 *
 * Rest of World names no country on purpose. Routing there depends on the
 * destination and Printful does not commit to an origin, so naming one would
 * be inventing a fact to fill a sentence — the same mistake in the other
 * direction.
 */
export const FULFILMENT: Record<
  ShippingRegion,
  { printedIn: string; shipFastTitle: string; shipFastBody: string }
> = {
  se: {
    printedIn: "printed to order in the EU",
    shipFastTitle: "Ships from the EU",
    shipFastBody:
      "Printed to order and shipped within the EU. Expect 2–7 working days " +
      "once printing is done.",
  },
  eu: {
    printedIn: "printed to order in the EU",
    shipFastTitle: "Ships from the EU",
    shipFastBody:
      "Printed to order and shipped within the EU. Expect 2–7 working days " +
      "once printing is done.",
  },
  us: {
    printedIn: "printed to order in the US",
    shipFastTitle: "Ships from the US",
    shipFastBody:
      "Printed to order at our US facility and shipped domestically. Expect " +
      "3–7 working days once printing is done.",
  },
  world: {
    printedIn: "printed to order",
    shipFastTitle: "Ships worldwide",
    shipFastBody:
      "Printed to order at the facility closest to you, then shipped tracked. " +
      "Expect 7–14 working days once printing is done.",
  },
}

/**
 * The rates the help pages quote, per region.
 *
 * These have to match the shipping options in the backend exactly, because a
 * customer who reads "€10" and is charged $15 at checkout has been misled even
 * if the difference is small. Kept beside SHIPPING_PROMISE so the two cannot
 * be updated independently.
 */
export const SHIPPING_RATES: Record<
  ShippingRegion,
  { intro: string; lines: string[] }
> = {
  se: {
    intro:
      "The short version: fast shipping, free over 800 kr, and 30 days to change your mind.",
    lines: [
      "Standard shipping — 69 kr, free on orders over 800 kr. 2–5 business days.",
      "Express shipping — 129 kr. 1–2 business days.",
    ],
  },
  eu: {
    intro:
      "The short version: fast shipping, free over €75, and 30 days to change your mind.",
    lines: [
      "Standard shipping — €10, free on orders over €75. 2–5 business days within the EU.",
      "Express shipping — €19. 1–2 business days.",
    ],
  },
  us: {
    intro:
      "The short version: fast shipping, free over $85, and 30 days to change your mind.",
    lines: [
      "Standard shipping — $12, free on orders over $85. 3–7 business days.",
      "Express shipping — $22. 2–3 business days.",
    ],
  },
  world: {
    intro:
      "The short version: tracked worldwide shipping, and 30 days to change your mind.",
    lines: [
      "International standard — $15. 7–14 business days, tracked.",
      "International express — $29. 3–6 business days, tracked.",
      "Duties or import taxes may apply on arrival, depending on your country.",
    ],
  },
}

export function copyFor(countryCode?: string): UiCopy {
  const cc = countryCode?.toLowerCase()
  const base = !isSolkast && cc === "se" ? SV : EN

  // Swedish copy already quotes 800 kr throughout.
  if (base === SV) return base

  const region = shippingRegionFor(cc)
  const promise = SHIPPING_PROMISE[region]
  const fulfilment = FULFILMENT[region]

  return {
    ...EN,
    announcement: promise.announcement,
    shippingNote: promise.note,
    footerBlurb: isSolkast
      ? `Considered graphics, ${fulfilment.printedIn}. ` +
        "No warehouse, no overproduction."
      : "Swedish streetwear for people who already know how it ends. " +
        `Organic cotton, ${fulfilment.printedIn}. Buy now, regret later.`,
    shipFastTitle: fulfilment.shipFastTitle,
    shipFastBody: fulfilment.shipFastBody,
  }
}
