"use client"

import { Heading, Text } from "@modules/common/components/ui"

import InteractiveLink from "@modules/common/components/interactive-link"
import { useCopy } from "@lib/use-copy"

const EmptyCartMessage = () => {
  const t = useCopy()
  return (
    // py-48 was 192px top and bottom — on a phone that pushed the message
    // into a sea of white with nothing else on screen.
    <div
      className="py-20 small:py-32 px-2 flex flex-col justify-center items-start"
      data-testid="empty-cart-message"
    >
      <Heading
        level="h1"
        className="flex flex-row text-3xl-regular gap-x-2 items-baseline"
      >
        {t.cartEmpty}
      </Heading>
      <Text className="text-base-regular mt-4 mb-6 max-w-[32rem]">
        {t.cartEmptyBlurb}
      </Text>
      <div className="flex flex-col gap-y-3">
        <InteractiveLink href="/store">{t.cartEmptyShop}</InteractiveLink>
        <InteractiveLink href="/collections/new-arrivals">
          {t.cartEmptySee}
        </InteractiveLink>
      </div>
    </div>
  )
}

export default EmptyCartMessage
