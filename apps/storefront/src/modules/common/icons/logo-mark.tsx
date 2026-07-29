import React from "react"

import { IconProps } from "types/icon"

// The Ångerköp mark: Å, drawn as paths rather than set as text so it renders
// identically everywhere without depending on a loaded font.
//
// It replaces an inherited 12-point sunburst that literalised "sol" — correct
// for Solkast, meaningless for a brand called "regret purchase". A single
// heavy letterform also survives the sizes a mark actually appears at: a 16px
// nav icon, a favicon, a 40px avatar circle.
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
      {/* The ring, sitting above the apex */}
      <circle cx="100" cy="32" r="16" stroke={color} strokeWidth="14" />
      {/* Left and right strokes */}
      <path
        d="M 100 70 L 44 176"
        stroke={color}
        strokeWidth="26"
        strokeLinecap="round"
      />
      <path
        d="M 100 70 L 156 176"
        stroke={color}
        strokeWidth="26"
        strokeLinecap="round"
      />
      {/* Crossbar */}
      <path
        d="M 66 140 L 134 140"
        stroke={color}
        strokeWidth="24"
        strokeLinecap="round"
      />
    </svg>
  )
}

export default LogoMark
