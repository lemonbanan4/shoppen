import { Metadata } from "next"

import InteractiveLink from "@modules/common/components/interactive-link"

export const metadata: Metadata = {
  title: "404",
  description: "This page doesn't exist — browse the Ångerköp store instead.",
}

export default function NotFound() {
  return (
    <div className="flex flex-col gap-4 items-center justify-center text-center px-6 min-h-[calc(100vh-64px)]">
      <h1 className="text-2xl-semi text-ui-fg-base">Page not found</h1>
      <p className="text-small-regular text-ui-fg-base max-w-md">
        This page doesn&apos;t exist, or it moved. Product links changed
        recently, so an older one may no longer work — everything is still
        here, just at a new address.
      </p>
      {/* Someone who followed a dead product link wants the product, not the
          homepage. Lead with the store so the visit is still salvageable. */}
      <div className="flex flex-col gap-y-3 items-center">
        <InteractiveLink href="/store">Shop all products</InteractiveLink>
        <InteractiveLink href="/collections/new-arrivals">
          See new arrivals
        </InteractiveLink>
        <InteractiveLink href="/">Go to frontpage</InteractiveLink>
      </div>
    </div>
  )
}
