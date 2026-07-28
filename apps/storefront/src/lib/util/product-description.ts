/**
 * Printful catalog copy arrives as a short intro paragraph followed by
 * bullet-point specs, joined with newlines by the sync's buildDescription:
 *
 *   Upgrade your wardrobe with this oversized t-shirt…
 *   • 100% organic combed ring-spun cotton
 *   • Fabric weight: 5.9 oz./yd.² (200 g/m²)
 *
 * Rendered whole at the top of the page that put a 15-line spec sheet above
 * the product photo on mobile. Splitting it lets the intro sell the piece up
 * top while the specs live in the details tab, where someone goes looking for
 * fabric weight.
 */
export type SplitDescription = {
  intro: string
  bullets: string[]
}

export const splitDescription = (
  description?: string | null
): SplitDescription => {
  if (!description?.trim()) {
    return { intro: "", bullets: [] }
  }

  const lines = description
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)

  const intro: string[] = []
  const bullets: string[] = []

  for (const line of lines) {
    if (line.startsWith("•")) {
      bullets.push(line.replace(/^•\s*/, ""))
    } else if (bullets.length === 0) {
      // Prose only counts as intro before the first bullet; anything after is
      // a trailing note that belongs with the specs.
      intro.push(line)
    } else {
      bullets.push(line)
    }
  }

  return { intro: intro.join("\n"), bullets }
}
