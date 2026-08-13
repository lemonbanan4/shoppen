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

const bySize = (values: string[]) => {
  const rank = (v: string) => {
    const i = SIZE_ORDER.indexOf(v.trim())
    return i === -1 ? Number.MAX_SAFE_INTEGER : i
  }
  // Only reorder when this actually looks like a size option; a colour list
  // that happened to contain "S" should not be resorted around it.
  if (!values.some((v) => SIZE_ORDER.includes(v.trim()))) return values
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
      <span className="text-sm">{t.selectOption(title)}</span>
      <div
        className="flex flex-wrap gap-2"
        data-testid={dataTestId}
      >
        {filteredOptions.map((v) => {
          return (
            <button
              onClick={() => updateOption(option.id, v)}
              key={v}
              className={clx(
                "border text-small-regular h-10 rounded-lg px-4 min-w-[3rem] transition-all ease-in-out duration-150",
                {
                  "border-neutral-950 bg-neutral-950 text-white": v === current,
                  // text-neutral-950 is not optional here. The unselected
                  // state sets an explicit white background and used to leave
                  // the text colour to inherit — fine on Ångerköp's white
                  // page, invisible on Solkast's dark one, where body text is
                  // near-white and every size button rendered white-on-white.
                  // Selecting one made it readable, because the selected state
                  // does set a colour, which is exactly how it hid: the sizes
                  // appeared once you had already guessed where to click.
                  "border-neutral-200 bg-white text-neutral-950 hover:border-neutral-400":
                    v !== current,
                }
              )}
              disabled={disabled}
              data-testid="option-button"
            >
              {v}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default OptionSelect
