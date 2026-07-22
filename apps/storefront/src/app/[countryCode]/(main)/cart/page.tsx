import { retrieveCart } from "@lib/data/cart"
import { retrieveCustomer } from "@lib/data/customer"
import CartTemplate from "@modules/cart/templates"
import { Metadata } from "next"
import { notFound } from "next/navigation"

export const metadata: Metadata = {
  title: "Cart",
  description: "View your cart",
}

export default async function Cart() {
  // A recovery link (e.g. from an abandoned-cart email) carries a `cart_id`
  // query param — middleware.ts adopts it into the `_medusa_cart_id` cookie
  // (cookies can only be set from middleware/route handlers/actions, not
  // during a page render) and redirects here with the param stripped.
  const cart = await retrieveCart().catch((error) => {
    console.error(error)
    return notFound()
  })

  const customer = await retrieveCustomer()

  return <CartTemplate cart={cart} customer={customer} />
}
