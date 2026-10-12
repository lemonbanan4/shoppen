import { HttpTypes } from "@medusajs/types"
import { clx } from "@modules/common/components/ui"
import React from "react"
import { useCopy } from "@lib/use-copy"

type OptionSelectProps = {
  option: HttpTypes.StoreProductOption
  current: string | undefined
  updateOption: (title: string, value: string) => void
  title: string
  disabled: boolean
  /** Values that exist on at least one variant of this product. */
  availableValues?: string[]
  "data-testid"?: string
}

/**
 * Sizes read smallest to largest, whatever order they arrive in.
 *
 * The option values come back in the order Printful happened to list the
 * variants, which for several products is alphabetical: the bomber offered
 * "2XL L M S XL XS". That reads as a bug to anyone picking a size, and is one.
 *
 * Sorted here rather than in the sync because ordering is presentation, and
 * because the sync cannot fix it retroactively — it deliberately leaves an
 * existing product's options alone, since editing them in place is what forces
 * a product to be rebuilt. Doing it at render covers every product, including
 * the three hoodies that have been listed this way since launch.
 *
 * Unknown values keep their original relative order and sort last, so a
 * sizing scheme this does not model is left as it was rather than scrambled —
 * and any non-size option (Colour, Style) passes through untouched.
 */
const SIZE_ORDER = [
  "3XS", "2XS", "XXS", "XS", "S", "M", "L", "XL",
  "2XL", "XXL", "3XL", "XXXL", "4XL", "5XL", "6XL",
  "XS/S", "S/M", "M/L", "L/XL", "XL/2XL",
  "One size", "One Size",
]

const CANONICAL_SIZES: Record<string, string> = {
  "3XS": "3XS",
  "2XS": "2XS",
  "XXS": "XXS",
  "XS": "XS",
  "S": "S",
  "M": "M",
  "L": "L",
  "XL": "XL",
  "2XL": "2XL",
  "XXL": "2XL",
  "3XL": "3XL",
  "XXXL": "3XL",
  "4XL": "4XL",
  "5XL": "5XL",
  "6XL": "6XL",
  "XS/S": "XS/S",
  "S/M": "S/M",
  "M/L": "M/L",
  "L/XL": "L/XL",
  "XL/2XL": "XL/2XL",
  "ONE SIZE": "One Size",
  "ONESIZE": "One Size",
  "OS": "One Size",
}

/**
 * Strips repeated product titles, handles, or catalog slugs down to pure
 * compact size labels like "S", "M", "L", "XL", "2XL".
 */
export const cleanOptionLabel = (val: string): string => {
  if (!val) return val
  const trimmed = val.trim()
  const upper = trimmed.toUpperCase()

  // 1. Direct canonical size match
  if (CANONICAL_SIZES[upper]) {
    return CANONICAL_SIZES[upper]
  }

  // 2. Trailing token after slash (e.g. "AEON // BEYOND THE HORIZON TEE / XL" or "handle/xl")
  if (trimmed.includes("/")) {
    const parts = trimmed.split("/").map((p) => p.trim()).filter(Boolean)
    const last = parts[parts.length - 1]
    if (last && CANONICAL_SIZES[last.toUpperCase()]) {
      return CANONICAL_SIZES[last.toUpperCase()]
    }
  }

  // 3. Trailing token after hyphen/dash (e.g. "aeon-beyond-the-horizon-tee-xl" or "AEON TEE - XL")
  if (trimmed.includes("-")) {
    const parts = trimmed.split("-").map((p) => p.trim()).filter(Boolean)
    const last = parts[parts.length - 1]
    if (last && CANONICAL_SIZES[last.toUpperCase()]) {
      return CANONICAL_SIZES[last.toUpperCase()]
    }
  }

  // 4. Trailing token after underscore (e.g. "aeon_tee_xl")
  if (trimmed.includes("_")) {
    const parts = trimmed.split("_").map((p) => p.trim()).filter(Boolean)
    const last = parts[parts.length - 1]
    if (last && CANONICAL_SIZES[last.toUpperCase()]) {
      return CANONICAL_SIZES[last.toUpperCase()]
    }
  }

  // 5. Trailing token after whitespace (e.g. "AEON TEE XL" or "Size XL")
  if (trimmed.includes(" ")) {
    const parts = trimmed.split(/\s+/).map((p) => p.trim()).filter(Boolean)
    const last = parts[parts.length - 1]
    if (last && CANONICAL_SIZES[last.toUpperCase()]) {
      return CANONICAL_SIZES[last.toUpperCase()]
    }
  }

  // 6. Fallback if slash-separated: take last segment
  if (trimmed.includes("/")) {
    const parts = trimmed.split("/").map((p) => p.trim()).filter(Boolean)
    if (parts.length > 1) {
      return parts[parts.length - 1]
    }
  }

  return trimmed
}

const bySize = (values: string[]) => {
  const rank = (v: string) => {
    const label = cleanOptionLabel(v)
    const i = SIZE_ORDER.indexOf(label)
    return i === -1 ? Number.MAX_SAFE_INTEGER : i
  }
  // Only reorder when this actually looks like a size option
  if (!values.some((v) => SIZE_ORDER.includes(cleanOptionLabel(v)))) return values
  return values
    .map((v, i) => ({ v, i }))
    .sort((a, b) => rank(a.v) - rank(b.v) || a.i - b.i)
    .map((x) => x.v)
}

const OptionSelect: React.FC<OptionSelectProps> = ({
  option,
  current,
  updateOption,
  title,
  "data-testid": dataTestId,
  disabled,
  availableValues,
}) => {
  const t = useCopy()
  const filteredOptions = bySize(
    (option.values ?? [])
      .map((v) => v.value)
      .filter((v) => !availableValues || availableValues.includes(v))
  )

  return (
    <div className="flex flex-col gap-y-3">
      <span className="text-sm font-mono uppercase tracking-wider text-white">
        {t.selectOption(title)}
      </span>
      <div
        className="flex flex-wrap gap-2.5"
        data-testid={dataTestId}
      >
        {filteredOptions.map((v) => {
          const label = cleanOptionLabel(v)
          return (
            <button
              onClick={() => updateOption(option.id, v)}
              key={v}
              className={clx(
                "border text-xs sm:text-sm font-mono font-bold h-11 min-w-[3.25rem] px-4 rounded-md transition-all ease-in-out duration-150 inline-flex items-center justify-center uppercase tracking-wider active:scale-95 select-none",
                {
                  "border-white bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.3)] ring-1 ring-white":
                    v === current,
                  "border-neutral-800 bg-neutral-900/80 text-[#EDEDED] hover:border-neutral-500 hover:text-white hover:bg-neutral-800/80":
                    v !== current,
                }
              )}
              disabled={disabled}
              data-testid="option-button"
            >
              {label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default OptionSelect

