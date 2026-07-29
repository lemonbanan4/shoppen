import React from "react"

import { IconProps } from "types/icon"

// The Ångerköp sun mark — a 12-point sunburst over three receding bars,
// literalizing "Sol" (sun). The ring is a true cut-out (evenodd), not a
// hardcoded background color, so it reads correctly on any surface.
const LogoMark: React.FC<IconProps> = ({
  size = "20",
  color = "currentColor",
  ...attributes
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...attributes}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M 100 31.5 L 106.6 51.4 L 121.9 37.1 L 119.9 58.1 L 140.4 53.4 L 129.8 71.6 L 150.5 75 L 133.9 87.7 L 150.5 100.4 L 129.8 103.8 L 140.4 122 L 119.9 117.3 L 121.9 138.3 L 106.6 124 L 100 143.9 L 93.4 124 L 78.1 138.3 L 80.1 117.3 L 59.6 122 L 70.2 103.8 L 49.5 100.4 L 66.1 87.7 L 49.5 75 L 70.2 71.6 L 59.6 53.4 L 80.1 58.1 L 78.1 37.1 L 93.4 51.4 Z M 100 66.5 A 21.2 21.2 0 1 0 100 108.9 A 21.2 21.2 0 1 0 100 66.5 Z"
        fill={color}
      />
      <circle cx="100" cy="87.7" r="12" fill={color} />
      <rect x="62.5" y="132.5" width="75" height="10" fill={color} />
      <rect x="72.5" y="149.5" width="55" height="10" fill={color} />
      <rect x="81.5" y="165.5" width="37" height="9" fill={color} />
    </svg>
  )
}

export default LogoMark
