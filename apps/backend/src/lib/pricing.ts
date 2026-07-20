/**
 * Shared currency-conversion + psychological-rounding helpers, used by both
 * the Printify and Printful product syncs so a supplier's price (in
 * whatever currency they quote it) converts consistently into every
 * currency this store sells in.
 */

export const STORE_CURRENCIES = ["usd", "eur"];

type Logger = { warn: (msg: string) => void; info: (msg: string) => void };

/**
 * Live mid-market rates from Frankfurter (ECB reference rates, no API key).
 * Falls back to an approximate hardcoded rate if the request fails, so a
 * network hiccup doesn't block a sync — but always logs which mode was used.
 */
export const fetchExchangeRates = async (
  base: string,
  targets: string[],
  logger: Logger
): Promise<Record<string, number>> => {
  const rates: Record<string, number> = { [base]: 1 };
  const others = targets.filter((c) => c !== base);
  if (!others.length) return rates;

  const FALLBACK_RATES: Record<string, Record<string, number>> = {
    usd: { eur: 0.87 },
    eur: { usd: 1.15 },
  };

  try {
    const symbols = others.map((c) => c.toUpperCase()).join(",");
    const res = await fetch(
      `https://api.frankfurter.dev/v1/latest?base=${base.toUpperCase()}&symbols=${symbols}`
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as { rates: Record<string, number> };
    for (const target of others) {
      const rate = data.rates[target.toUpperCase()];
      if (!rate) throw new Error(`No rate returned for ${target}`);
      rates[target] = rate;
    }
    logger.info(
      `Live FX rates from ${base.toUpperCase()}: ${others
        .map((c) => `${c.toUpperCase()}=${rates[c]}`)
        .join(", ")}`
    );
  } catch (e: any) {
    logger.warn(
      `Could not fetch live exchange rates (${e.message}) — using approximate fallback rates. Re-run the sync later to pick up live rates.`
    );
    for (const target of others) {
      rates[target] = FALLBACK_RATES[base]?.[target] ?? 1;
    }
  }

  return rates;
};

/**
 * Rounds to the nearest charm price ending in .99 (e.g. 42.31 -> 41.99,
 * 37.00 -> 36.99). Uses integer-cents arithmetic to avoid floating-point
 * artifacts from subtracting 0.01 directly.
 */
export const toPsychologicalPrice = (amount: number): number => {
  if (amount < 1) return Math.round(amount * 100) / 100;
  const nearestWholeCents = Math.round(amount) * 100;
  return (nearestWholeCents - 1) / 100;
};

/** Converts a source amount into every store currency, optionally rounded. */
export const convertToStorePrices = (
  sourceAmount: number,
  exchangeRates: Record<string, number>,
  psychologicalRounding: boolean
): { currency_code: string; amount: number }[] =>
  STORE_CURRENCIES.map((currency_code) => {
    const converted = sourceAmount * (exchangeRates[currency_code] ?? 1);
    return {
      currency_code,
      amount: psychologicalRounding
        ? toPsychologicalPrice(converted)
        : Math.round(converted * 100) / 100,
    };
  });
