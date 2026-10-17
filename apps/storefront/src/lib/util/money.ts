import { isEmpty } from "./isEmpty"

type ConvertToLocaleParams = {
  amount?: number | null
  currency_code?: string | null
  minimumFractionDigits?: number
  maximumFractionDigits?: number
  locale?: string
}

export const convertToLocale = ({
  amount,
  currency_code,
  minimumFractionDigits,
  maximumFractionDigits,
  locale = "en-US",
}: ConvertToLocaleParams) => {
  const safeAmount =
    amount !== null && amount !== undefined && !isNaN(Number(amount))
      ? Number(amount)
      : 0
  const safeCurrency =
    currency_code && !isEmpty(currency_code) ? currency_code.toUpperCase() : "EUR"

  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: safeCurrency,
      minimumFractionDigits,
      maximumFractionDigits,
    }).format(safeAmount)
  } catch {
    return `${safeAmount.toFixed(2)} ${safeCurrency}`
  }
}
