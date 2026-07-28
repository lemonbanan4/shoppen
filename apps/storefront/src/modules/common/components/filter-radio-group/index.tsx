import { EllipseMiniSolid } from "@medusajs/icons"
import { Label, RadioGroup, Text, clx } from "@modules/common/components/ui"
type FilterRadioGroupProps = {
  title: string
  items: {
    value: string
    label: string
  }[]
  value: string
  handleChange: (value: string) => void
  "data-testid"?: string
}

const FilterRadioGroup = ({
  title,
  items,
  value,
  handleChange,
  "data-testid": dataTestId,
}: FilterRadioGroupProps) => {
  return (
    <div className="flex gap-x-3 flex-col gap-y-3">
      <Text className="txt-compact-small-plus text-ui-fg-muted">{title}</Text>
      <RadioGroup data-testid={dataTestId}>
        {items?.map((i) => (
          // A fixed-width slot holds the selected marker, replacing a
          // magic-number negative margin (ml-[-23px]) that hung the bullet in
          // the gutter. Same alignment, but it no longer depends on the
          // marker icon staying exactly 23px wide.
          <div key={i.value} className="flex gap-x-2 items-center">
            <span className="flex h-4 w-4 shrink-0 items-center justify-center">
              {i.value === value && <EllipseMiniSolid />}
            </span>
            <RadioGroup.Item
              checked={i.value === value}
              onChange={() => handleChange(i.value)}
              // sr-only, not hidden: display:none takes the input out of the
              // tab order, so the group could not be operated by keyboard.
              className="sr-only peer"
              id={i.value}
              value={i.value}
            />
            <Label
              htmlFor={i.value}
              className={clx(
                "!txt-compact-small !transform-none text-ui-fg-subtle hover:cursor-pointer py-1 peer-focus-visible:underline peer-focus-visible:text-ui-fg-base",
                {
                  "text-ui-fg-base": i.value === value,
                }
              )}
              data-testid="radio-label"
              data-active={i.value === value}
            >
              {i.label}
            </Label>
          </div>
        ))}
      </RadioGroup>
    </div>
  )
}

export default FilterRadioGroup
