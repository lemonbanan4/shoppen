import ItemsTemplate from "./items"
import Summary from "./summary"
import EmptyCartMessage from "../components/empty-cart-message"
import SignInPrompt from "../components/sign-in-prompt"
import Divider from "@modules/common/components/divider"
import { HttpTypes } from "@medusajs/types"

const CartTemplate = ({
  cart,
  customer,
}: {
  cart: HttpTypes.StoreCart | null
  customer: HttpTypes.StoreCustomer | null
}) => {
  return (
    <div className="py-12">
      <div className="content-container" data-testid="cart-container">
        {cart?.items?.length ? (
          <div className="grid grid-cols-1 small:grid-cols-[1fr_360px] gap-x-40">
            {/* text-neutral-950 on both cards, not just bg-white.
              *
              * <body> sets the page-wide default to text-neutral-100 for the
              * dark theme, and a Heading here inherits that unless something
              * closer overrides it. Nothing did: "Already have an account?"
              * and "Cart" rendered at rgb(250,250,250) on a rgb(255,255,255)
              * card — a leftover from the original light-themed Medusa
              * starter, where the ambient colour and the card agreed. The
              * price/quantity labels survived because they already carry
              * their own explicit colour class; the two bare Headings did not. */}
            <div className="flex flex-col bg-white text-neutral-950 py-6 px-6 sm:px-8 gap-y-6 rounded-2xl border border-brand/30 shadow-[0_0_25px_-5px_rgba(217,162,27,0.25)]">
              {!customer && (
                <>
                  <SignInPrompt />
                  <Divider />
                </>
              )}
              <ItemsTemplate cart={cart} />
            </div>
            <div className="relative">
              <div className="flex flex-col gap-y-8 sticky top-12">
                {cart && cart.region && (
                  <>
                    <div className="bg-white text-neutral-950 py-6 px-6 sm:px-8 rounded-2xl border border-brand/30 shadow-[0_0_25px_-5px_rgba(217,162,27,0.25)]">
                      <Summary cart={cart} />
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
