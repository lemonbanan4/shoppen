"use client"

import repeat from "@lib/util/repeat"
import { HttpTypes } from "@medusajs/types"
import { Heading, Table } from "@modules/common/components/ui"

import Item from "@modules/cart/components/item"
import BundleUpsell from "@modules/cart/components/bundle-upsell"
import SkeletonLineItem from "@modules/skeletons/components/skeleton-line-item"
import { useCopy } from "@lib/use-copy"
import ErrorBoundary, {
  LineItemErrorFallback,
} from "@modules/common/components/error-boundary"

type ItemsTemplateProps = {
  cart?: HttpTypes.StoreCart
  onDelete?: (id: string) => void
  onUpdateQuantity?: (id: string, quantity: number) => void
}

const ItemsTemplate = ({
  cart,
  onDelete,
  onUpdateQuantity,
}: ItemsTemplateProps) => {
  const t = useCopy()
  const items = cart?.items

  return (
    <div>
      <div className="pb-3 flex items-center">
        <Heading className="text-[2rem] leading-[2.75rem]">
          {t.cartPageTitle}
        </Heading>
      </div>
      <BundleUpsell cart={cart} className="mb-4" />
      <Table>
        <Table.Header className="border-t-0">
          <Table.Row className="text-ui-fg-subtle txt-medium-plus">
            <Table.HeaderCell className="!pl-0">{t.colItem}</Table.HeaderCell>
            <Table.HeaderCell></Table.HeaderCell>
            <Table.HeaderCell>{t.colQuantity}</Table.HeaderCell>
            <Table.HeaderCell className="hidden small:table-cell">
              Price
            </Table.HeaderCell>
            <Table.HeaderCell className="!pr-0 text-right">
              Total
            </Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {items
            ? items
                .sort((a, b) => {
                  return (a.created_at ?? "") > (b.created_at ?? "") ? -1 : 1
                })
                .map((item) => {
                  return (
                    <ErrorBoundary
                      key={item.id}
                      fallback={
                        <LineItemErrorFallback
                          item={item}
                          onDelete={onDelete}
                        />
                      }
                    >
                      <Item
                        item={item}
                        currencyCode={cart?.currency_code || "eur"}
                        onDelete={onDelete}
                        onUpdateQuantity={onUpdateQuantity}
                      />
                    </ErrorBoundary>
                  )
                })
            : repeat(5).map((i) => {
                return <SkeletonLineItem key={i} />
              })}
        </Table.Body>
      </Table>
    </div>
  )
}

export default ItemsTemplate
