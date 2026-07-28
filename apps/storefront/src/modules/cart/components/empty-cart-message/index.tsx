import { Heading, Text } from "@modules/common/components/ui"

import InteractiveLink from "@modules/common/components/interactive-link"

const EmptyCartMessage = () => {
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
        Your cart is empty
      </Heading>
      <Text className="text-base-regular mt-4 mb-6 max-w-[32rem]">
        Nothing in here yet. Every piece is printed to order, so take your
        time — have a look at what&apos;s just landed.
      </Text>
      <div className="flex flex-col gap-y-3">
        <InteractiveLink href="/store">Shop all products</InteractiveLink>
        <InteractiveLink href="/collections/new-arrivals">
          See new arrivals
        </InteractiveLink>
      </div>
    </div>
  )
}

export default EmptyCartMessage
