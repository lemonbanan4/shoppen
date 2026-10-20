import React from "react"
import Image from "next/image"

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

/** Solkast: White Cyber Sigilism logo mark. */
const SolkastMark: React.FC<IconProps> = ({
  size = "20",
  color,
  className,
  ...attributes
}) => {
  const dim = typeof size === "number" ? size : parseInt(String(size), 10) || 20
  return (
    <Image
      src="/brand/white-cyber-sigilism-logo.png"
      alt="SOLKAST"
      width={dim}
      height={dim}
      className={`object-contain shrink-0 inline-block ${className || ""}`}
      style={{ width: dim, height: dim }}
      {...(attributes as any)}
    />
  )
}

const LogoMark: React.FC<IconProps> = ({
  size = "20",
  color = "currentColor",
  ...attributes
}) => {
  const Mark = isSolkast ? SolkastMark : AngerkopMark
  return <Mark size={size} color={color} {...attributes} />
}

export default LogoMark
