"use client"

import { useOptimistic, useTransition } from "react"
import ItemsTemplate from "./items"
import Summary from "./summary"
import EmptyCartMessage from "../components/empty-cart-message"
import SignInPrompt from "../components/sign-in-prompt"
import Divider from "@modules/common/components/divider"
import { HttpTypes } from "@medusajs/types"
import { deleteLineItem, updateLineItem } from "@lib/data/cart"
import { toast } from "sonner"

type CartAction =
  | { type: "delete"; lineId: string }
  | { type: "update_quantity"; lineId: string; quantity: number }

const CartTemplate = ({
  cart,
  customer,
}: {
  cart: HttpTypes.StoreCart | null
  customer: HttpTypes.StoreCustomer | null
}) => {
  const [, startTransition] = useTransition()

  const [optimisticCart, setOptimisticCart] = useOptimistic(
    cart,
    (currentCart: HttpTypes.StoreCart | null, action: CartAction) => {
      if (!currentCart) return null

      let newItems = [...(currentCart.items || [])]

      if (action.type === "delete") {
        newItems = newItems.filter((i) => i.id !== action.lineId)
      } else if (action.type === "update_quantity") {
        newItems = newItems.map((item) => {
          if (item.id === action.lineId) {
            const unitPrice = Number(item.unit_price ?? 0)
            const newTotal = unitPrice * action.quantity
            return {
              ...item,
              quantity: action.quantity,
              total: newTotal,
              subtotal: newTotal,
            }
          }
          return item
        })
      }

      const newSubtotal = newItems.reduce((acc, item) => {
        return (
          acc +
          Number(
            item.total ??
              item.subtotal ??
              Number(item.unit_price ?? 0) * item.quantity
          )
        )
      }, 0)

      return {
        ...currentCart,
        items: newItems,
        subtotal: newSubtotal,
        total: newSubtotal,
        item_subtotal: newSubtotal,
        item_total: newSubtotal,
      }
    }
  )

  const handleDeleteItem = (lineId: string) => {
    startTransition(async () => {
      setOptimisticCart({ type: "delete", lineId })
      try {
        await deleteLineItem(lineId)
      } catch (err: any) {
        toast.error("Failed to remove item", {
          description: err?.message || "Please try again.",
        })
      }
    })
  }

  const handleUpdateQuantity = (lineId: string, quantity: number) => {
    startTransition(async () => {
      setOptimisticCart({ type: "update_quantity", lineId, quantity })
      try {
        await updateLineItem({ lineId, quantity })
      } catch (err: any) {
        toast.error("Failed to update quantity", {
          description: err?.message || "Please try again.",
        })
      }
    })
  }

  return (
    <div className="py-12">
      <div className="content-container" data-testid="cart-container">
        {optimisticCart?.items?.length ? (
          <div className="grid grid-cols-1 small:grid-cols-[1fr_360px] gap-x-40">
            <div className="flex flex-col bg-white text-neutral-950 py-6 px-6 sm:px-8 gap-y-6 rounded-2xl border border-brand/60 shadow-[0_0_35px_-2px_rgba(217,162,27,0.45)]">
              {!customer && (
                <>
                  <SignInPrompt />
                  <Divider />
                </>
              )}
              <ItemsTemplate
                cart={optimisticCart}
                onDelete={handleDeleteItem}
                onUpdateQuantity={handleUpdateQuantity}
              />
            </div>
            <div className="relative">
              <div className="flex flex-col gap-y-8 sticky top-12">
                {optimisticCart && optimisticCart.region && (
                  <>
                    <div className="bg-white text-neutral-950 py-6 px-6 sm:px-8 rounded-2xl border border-brand/60 shadow-[0_0_35px_-2px_rgba(217,162,27,0.45)]">
                      <Summary cart={optimisticCart} />
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div>
            <EmptyCartMessage />
          </div>
        )}
      </div>
    </div>
  )
}

export default CartTemplate
