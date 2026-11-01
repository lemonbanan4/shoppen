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
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="w-4 h-4 group-hover:rotate-45 ease-in-out duration-150 text-brand"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M5.22 14.78a.75.75 0 001.06 0l7.22-7.22v5.69a.75.75 0 001.5 0v-7.5a.75.75 0 00-.75-.75h-7.5a.75.75 0 000 1.5h5.69l-7.22 7.22a.75.75 0 000 1.06z"
          clipRule="evenodd"
        />
      </svg>
    </LocalizedClientLink>
  )
}

export default InteractiveLink
