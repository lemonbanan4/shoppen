import React from "react"

import { IconProps } from "types/icon"
import { isSolkast } from "@lib/brand"

// One mark per brand, drawn as paths rather than set as text so it renders
// identically everywhere without depending on a loaded font.
//
// This file used to hold only the Å. That was right when the repo served one
// shop, and wrong the moment it served two: Solkast was showing Ångerköp's
// initial in its own footer, its checkout header and its favicon — a different
// company's letter, on the two screens where a shopper is deciding whether to
// trust the site with a card.
//
// Both marks are built to survive the sizes a mark actually appears at: a 16px
// checkout icon, a favicon, a 40px avatar circle. That rules out fine detail
// and rewards one heavy shape.

/** Ångerköp: Å. A single letterform, since the name is the joke. */
const AngerkopMark: React.FC<IconProps> = ({ size, color, ...attributes }) => (
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
    <path d="M 100 70 L 44 176" stroke={color} strokeWidth="26" strokeLinecap="round" />
    <path d="M 100 70 L 156 176" stroke={color} strokeWidth="26" strokeLinecap="round" />
    {/* Crossbar */}
    <path d="M 66 140 L 134 140" stroke={color} strokeWidth="24" strokeLinecap="round" />
  </svg>
)

// Eight rays rather than twelve: at 16px, twelve rays close into a smudged
// ring and the mark stops reading as a sun at all.
const RAYS = Array.from({ length: 8 }, (_, i) => (i * 360) / 8)

/** Solkast: a sun. "Sol" is the whole name, and the shop's palette is gold. */
const SolkastMark: React.FC<IconProps> = ({ size, color, ...attributes }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 200 200"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...attributes}
  >
    <circle cx="100" cy="100" r="42" fill={color} />
    {RAYS.map((deg) => (
      <path
        key={deg}
        d="M 100 36 L 100 12"
        stroke={color}
        strokeWidth="20"
        strokeLinecap="round"
        transform={`rotate(${deg} 100 100)`}
      />
    ))}
  </svg>
)

const LogoMark: React.FC<IconProps> = ({
  size = "20",
  color = "currentColor",
  ...attributes
}) => {
  const Mark = isSolkast ? SolkastMark : AngerkopMark
  return <Mark size={size} color={color} {...attributes} />
}

export default LogoMark
