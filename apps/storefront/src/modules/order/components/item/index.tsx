import { HttpTypes } from "@medusajs/types"
import { Table, Text } from "@modules/common/components/ui"

import { convertToLocale } from "@lib/util/money"
import LineItemOptions from "@modules/common/components/line-item-options"
import LineItemPrice from "@modules/common/components/line-item-price"
import LineItemUnitPrice from "@modules/common/components/line-item-unit-price"
import Thumbnail from "@modules/products/components/thumbnail"

type ItemProps = {
  item: HttpTypes.StoreCartLineItem | HttpTypes.StoreOrderLineItem
  currencyCode: string
}

const Item = ({ item, currencyCode }: ItemProps) => {
  return (
    <Table.Row className="w-full" data-testid="product-row">
      <Table.Cell className="!pl-0 p-4 w-24">
        <div className="flex w-16">
          <Thumbnail thumbnail={item.thumbnail} alt={item.title} size="square" />
        </div>
      </Table.Cell>

      <Table.Cell className="text-left">
        <Text
          className="txt-medium-plus text-ui-fg-base"
          data-testid="product-name"
        >
          {item.product_title}
        </Text>
        <LineItemOptions variant={item.variant} data-testid="product-variant" />
        {item.adjustments && item.adjustments.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {item.adjustments.map((adjustment) => {
              const isBundle =
                adjustment.code?.includes("AEON-BUNDLE") ||
                adjustment.code?.includes("BUNDLE")
              return (
                <span
                  key={adjustment.id}
                  className="inline-flex items-center gap-1.5 text-[11px] font-mono font-medium text-[#00d4ff] bg-[#00d4ff]/10 border border-[#00d4ff]/25 px-2 py-0.5 rounded"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-[#00d4ff]" />
                  {isBundle ? "Bundle Set Discount" : adjustment.code || "Discount"}{" "}
                  (-{convertToLocale({
                    amount: adjustment.amount,
                    currency_code: currencyCode,
                  })})
                </span>
              )
            })}
          </div>
        )}
      </Table.Cell>

      <Table.Cell className="!pr-0">
        <span className="!pr-0 flex flex-col items-end h-full justify-center">
          <span className="flex gap-x-1 ">
            <Text className="text-ui-fg-muted">
              <span data-testid="product-quantity">{item.quantity}</span>x{" "}
            </Text>
            <LineItemUnitPrice
              item={item}
              style="tight"
              currencyCode={currencyCode}
            />
          </span>

          <LineItemPrice
            item={item}
            style="tight"
            currencyCode={currencyCode}
          />
        </span>
      </Table.Cell>
    </Table.Row>
  )
}

export default Item
