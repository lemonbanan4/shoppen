"use client"

import { isManual, isStripeLike } from "@lib/constants"
import { placeOrder } from "@lib/data/cart"
import { HttpTypes } from "@medusajs/types"
import { Button } from "@modules/common/components/ui"
import { useElements, useStripe } from "@stripe/react-stripe-js"
import React, { useState } from "react"
import { toast } from "sonner"
import ErrorMessage from "../error-message"
import { useCopy } from "@lib/use-copy"

function getFriendlyStripeErrorMessage(error: any): string {
  if (!error) return "Payment could not be completed. Please try again."

  const declineCode = error.decline_code?.toLowerCase?.() || ""
  const code = error.code?.toLowerCase?.() || ""

  switch (declineCode || code) {
    case "insufficient_funds":
      return "Your card was declined due to insufficient funds. Please try another card or check your account balance."
    case "incorrect_cvc":
    case "invalid_cvc":
      return "The security code (CVC) is incorrect. Please verify the 3 or 4 digits on the back of your card."
    case "expired_card":
      return "Your card has expired. Please try with an active, unexpired payment card."
    case "incorrect_number":
    case "invalid_number":
      return "The card number is invalid. Please double-check your card details and try again."
    case "card_declined":
    case "generic_decline":
    case "do_not_honor":
      return "Your card was declined by your bank. Please contact your card issuer or use a different payment method."
    case "processing_error":
      return "A temporary processing error occurred while connecting with your bank. Please try again."
    case "lost_card":
    case "stolen_card":
      return "This card cannot be used. Please use a different card."
    case "authentication_required":
    case "payment_intent_authentication_failure":
      return "Card authentication (3D Secure) could not be verified or was canceled. Please try again."
    default:
      return (
        error.message ||
        "Your payment could not be processed. Please check your card information and try again."
      )
  }
}

type PaymentButtonProps = {
  cart: HttpTypes.StoreCart
  "data-testid": string
}

const PaymentButton: React.FC<PaymentButtonProps> = ({
  cart,
  "data-testid": dataTestId,
}) => {
  const t = useCopy()
  const notReady =
    !cart ||
    !cart.shipping_address ||
    !cart.billing_address ||
    !cart.email ||
    (cart.shipping_methods?.length ?? 0) < 1

  const paymentSession = cart.payment_collection?.payment_sessions?.[0]

  switch (true) {
    case isStripeLike(paymentSession?.provider_id):
      return (
        <StripePaymentButton
          notReady={notReady}
          cart={cart}
          data-testid={dataTestId}
        />
      )
    case isManual(paymentSession?.provider_id):
      return (
        <ManualTestPaymentButton notReady={notReady} data-testid={dataTestId} />
      )
    default:
      return <Button disabled>Select a payment method</Button>
  }
}

const StripePaymentButton = ({
  cart,
  notReady,
  "data-testid": dataTestId,
}: {
  cart: HttpTypes.StoreCart
  notReady: boolean
  "data-testid"?: string
}) => {
  const t = useCopy()
  const [submitting, setSubmitting] = useState(false)
  const isSubmittingRef = React.useRef(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const onPaymentCompleted = async () => {
    try {
      await placeOrder()
    } catch (err: any) {
      if (
        err?.message === "NEXT_REDIRECT" ||
        (typeof err?.digest === "string" && err.digest.includes("NEXT_REDIRECT"))
      ) {
        // Next.js redirection in progress — keep submitting state active
        return
      }

      const msg = err?.message || "Failed to finalize order. Please try again."
      setErrorMessage(msg)
      toast.error("Order Completion Failed", { description: msg })
      isSubmittingRef.current = false
      setSubmitting(false)
    }
  }

  const stripe = useStripe()
  const elements = useElements()
  const card = elements?.getElement("card")

  const session = cart.payment_collection?.payment_sessions?.find(
    (s) => s.status === "pending"
  )

  const disabled = !stripe || !elements ? true : false

  const handlePayment = async () => {
    if (isSubmittingRef.current || submitting) {
      return
    }
    isSubmittingRef.current = true
    setSubmitting(true)
    setErrorMessage(null)

    if (!stripe || !elements || !card || !cart) {
      setSubmitting(false)
      isSubmittingRef.current = false
      return
    }

    const clientSecret = session?.data?.client_secret as string | undefined
    if (!clientSecret) {
      const msg = "Payment session expired or missing. Please return to the Payment step to select your payment method."
      setErrorMessage(msg)
      toast.error("Payment Session Missing", { description: msg })
      setSubmitting(false)
      isSubmittingRef.current = false
      return
    }

    try {
      const { error, paymentIntent } = await stripe.confirmCardPayment(
        clientSecret,
        {
          payment_method: {
            card: card,
            billing_details: {
              name:
                cart.billing_address?.first_name +
                " " +
                cart.billing_address?.last_name,
              address: {
                city: cart.billing_address?.city ?? undefined,
                country: cart.billing_address?.country_code ?? undefined,
                line1: cart.billing_address?.address_1 ?? undefined,
                line2: cart.billing_address?.address_2 ?? undefined,
                postal_code: cart.billing_address?.postal_code ?? undefined,
                state: cart.billing_address?.province ?? undefined,
              },
              email: cart.email,
              phone: cart.billing_address?.phone ?? undefined,
            },
          },
        }
      )

      if (error) {
        const pi = error.payment_intent

        if (
          (pi && pi.status === "requires_capture") ||
          (pi && pi.status === "succeeded")
        ) {
          await onPaymentCompleted()
          return
        }

        const friendlyMsg = getFriendlyStripeErrorMessage(error)
        setErrorMessage(friendlyMsg)
        toast.error("Payment Declined", { description: friendlyMsg })
        setSubmitting(false)
        isSubmittingRef.current = false
        return
      }

      if (
        (paymentIntent && paymentIntent.status === "requires_capture") ||
        paymentIntent?.status === "succeeded"
      ) {
        await onPaymentCompleted()
        return
      }

      // If paymentIntent finished without success (e.g. 3DS canceled or requires_payment_method)
      const unconfirmedMsg =
        paymentIntent?.status === "canceled"
          ? "Payment was canceled. Please try again."
          : "Payment authentication was not completed. Please try again or use another card."

      setErrorMessage(unconfirmedMsg)
      toast.error("Payment Incomplete", { description: unconfirmedMsg })
      setSubmitting(false)
      isSubmittingRef.current = false
    } catch (err: any) {
      if (
        err?.message === "NEXT_REDIRECT" ||
        (typeof err?.digest === "string" && err.digest.includes("NEXT_REDIRECT"))
      ) {
        return
      }

      const unexpectedMsg =
        err?.message || "An unexpected error occurred while processing payment."
      setErrorMessage(unexpectedMsg)
      toast.error("Payment Error", { description: unexpectedMsg })
      setSubmitting(false)
      isSubmittingRef.current = false
    }
  }

  return (
    <>
      <Button
        disabled={disabled || notReady || submitting}
        onClick={handlePayment}
        size="large"
        className="w-full"
        isLoading={submitting}
        data-testid={dataTestId}
      >
        {submitting ? "Processing..." : t.placeOrder}
      </Button>

      {errorMessage && (
        <div
          role="alert"
          data-testid="stripe-payment-error-message"
          className="mt-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-2.5 text-xs font-mono animate-in fade-in duration-200"
        >
          <svg
            className="w-4 h-4 shrink-0 mt-0.5 text-rose-500"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <div className="flex-1">
            <p className="font-bold uppercase tracking-wider text-[11px] text-rose-900 mb-0.5">
              Payment Unsuccessful
            </p>
            <p className="leading-relaxed">{errorMessage}</p>
          </div>
        </div>
      )}
    </>
  )
}

const ManualTestPaymentButton = ({ notReady }: { notReady: boolean }) => {
  const t = useCopy()
  const [submitting, setSubmitting] = useState(false)
  const isSubmittingRef = React.useRef(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const onPaymentCompleted = async () => {
    try {
      await placeOrder()
    } catch (err: any) {
      if (
        err?.message === "NEXT_REDIRECT" ||
        (typeof err?.digest === "string" && err.digest.includes("NEXT_REDIRECT"))
      ) {
        return
      }

      const msg = err?.message || "Failed to finalize order. Please try again."
      setErrorMessage(msg)
      toast.error("Order Completion Failed", { description: msg })
      isSubmittingRef.current = false
      setSubmitting(false)
    }
  }

  const handlePayment = () => {
    if (isSubmittingRef.current || submitting) {
      return
    }
    isSubmittingRef.current = true
    setSubmitting(true)
    setErrorMessage(null)

    onPaymentCompleted()
  }

  return (
    <>
      <Button
        disabled={notReady || submitting}
        isLoading={submitting}
        onClick={handlePayment}
        size="large"
        className="w-full"
        data-testid="submit-order-button"
      >
        {submitting ? "Processing..." : t.placeOrder}
      </Button>

      {errorMessage && (
        <div
          role="alert"
          data-testid="manual-payment-error-message"
          className="mt-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-2.5 text-xs font-mono animate-in fade-in duration-200"
        >
          <svg
            className="w-4 h-4 shrink-0 mt-0.5 text-rose-500"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <div className="flex-1">
            <p className="font-bold uppercase tracking-wider text-[11px] text-rose-900 mb-0.5">
              Order Unsuccessful
            </p>
            <p className="leading-relaxed">{errorMessage}</p>
          </div>
        </div>
      )}
    </>
  )
}

export default PaymentButton
