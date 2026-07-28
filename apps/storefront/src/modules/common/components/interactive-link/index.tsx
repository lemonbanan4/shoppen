import { ArrowUpRightMini } from "@medusajs/icons"
import { Text } from "@modules/common/components/ui"
import LocalizedClientLink from "../localized-client-link"
type InteractiveLinkProps = {
  href: string
  children?: React.ReactNode
  onClick?: () => void
}

const InteractiveLink = ({
  href,
  children,
  onClick,
  ...props
}: InteractiveLinkProps) => {
  return (
    <LocalizedClientLink
      className="flex gap-x-1 items-center group"
      href={href}
      onClick={onClick}
      {...props}
    >
      {/* Brand rust, not Medusa's default --fg-interactive blue: this is the
          only blue link on an otherwise black-and-rust site, and on the empty
          cart and 404 pages it read as unstyled rather than deliberate. */}
      <Text className="text-brand group-hover:text-brand-dark transition-colors">
        {children}
      </Text>
      <ArrowUpRightMini
        className="group-hover:rotate-45 ease-in-out duration-150 text-brand"
        color="currentColor"
      />
    </LocalizedClientLink>
  )
}

export default InteractiveLink
