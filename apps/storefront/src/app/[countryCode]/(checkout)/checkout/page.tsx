import { retrieveCart } from "@lib/data/cart"
import { retrieveCustomer } from "@lib/data/customer"
import PaymentWrapper from "@modules/checkout/components/payment-wrapper"
import CheckoutForm from "@modules/checkout/templates/checkout-form"
import CheckoutSummary from "@modules/checkout/templates/checkout-summary"
import CheckoutTracker from "@modules/checkout/components/checkout-tracker"
import { Metadata } from "next"
import { redirect } from "next/navigation"
import { copyFor } from "@lib/copy"

export async function generateMetadata(props: {
  params: Promise<{ countryCode: string }>
}): Promise<Metadata> {
  return { title: copyFor((await props.params).countryCode).checkoutTitle }
}

export default async function Checkout(props: {
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await props.params
  let cart: any = null

  try {
    cart = await retrieveCart()
  } catch {
    redirect(`/${countryCode}/store`)
  }

  if (!cart || !cart.items || cart.items.length === 0) {
    redirect(`/${countryCode}/store`)
  }

  const customer = await retrieveCustomer()

  return (
    <div className="grid grid-cols-1 small:grid-cols-[1fr_416px] content-container gap-x-40 py-12">
      <CheckoutTracker
        cartId={cart.id}
        itemCount={cart.items?.length ?? 0}
      />
      <PaymentWrapper cart={cart}>
        <CheckoutForm cart={cart} customer={customer} />
      </PaymentWrapper>
      <CheckoutSummary cart={cart} />
    </div>
  )
}
