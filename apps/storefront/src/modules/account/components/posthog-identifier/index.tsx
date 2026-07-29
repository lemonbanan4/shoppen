"use client"

import { useEffect } from "react"
import posthog from "posthog-js"

type PostHogIdentifierProps = {
  customerId: string
  email?: string | null
  firstName?: string | null
  lastName?: string | null
}

export default function PostHogIdentifier({
  customerId,
  email,
  firstName,
  lastName,
}: PostHogIdentifierProps) {
  useEffect(() => {
    posthog.identify(customerId, {
      email: email ?? undefined,
      first_name: firstName ?? undefined,
      last_name: lastName ?? undefined,
    })
  }, [customerId])

  return null
}
