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
  const filteredOptions = (option.values ?? [])
    .map((v) => v.value)
    .filter((v) => !availableValues || availableValues.includes(v))

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
