import React from "react"

import { IconProps } from "types/icon"

// The Solkast monogram — a hand-drawn geometric "S", not a font glyph.
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
        d="M 128 46 C 128 46, 62 42, 62 78 C 62 108, 138 96, 138 130 C 138 158, 92 158, 68 142"
        stroke={color}
        strokeWidth="14"
        strokeLinecap="round"
      />
    </svg>
  )
}

export default LogoMark
