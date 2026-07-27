"use client"

import { getProductPrice } from "@lib/util/get-product-price"
import { MagnifyingGlass, XMark } from "@medusajs/icons"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Image from "next/image"
import { useParams, useRouter } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"

const BACKEND_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

type SearchModalProps = {
  regionMap: Record<string, string>
}

export default function SearchModal({ regionMap }: SearchModalProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<HttpTypes.StoreProduct[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const router = useRouter()
  const params = useParams()
  const countryCode = (params?.countryCode as string) || "dk"
  const regionId = regionMap[countryCode]

  const close = useCallback(() => {
    setOpen(false)
    setQuery("")
    setResults([])
    setSearched(false)
  }, [])

  useEffect(() => {
    if (open) {
      inputRef.current?.focus()
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [open])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        close()
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setOpen(true)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [close])

  useEffect(() => {
    if (!open) {
      return
    }
    if (!query || query.trim().length < 2) {
      setResults([])
      setSearched(false)
      return
    }

    const timeout = setTimeout(async () => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      setLoading(true)
      try {
        const search = new URLSearchParams({
          q: query.trim(),
          limit: "8",
          fields: "id,title,handle,thumbnail,*variants.calculated_price",
        })
        if (regionId) {
          search.set("region_id", regionId)
        }
        const res = await fetch(
          `${BACKEND_URL}/store/products?${search.toString()}`,
          {
            headers: { "x-publishable-api-key": PUBLISHABLE_KEY },
            signal: controller.signal,
          }
        )
        const data = await res.json()
        setResults(data.products || [])
        setSearched(true)
      } catch (e: any) {
        if (e?.name !== "AbortError") {
          setResults([])
          setSearched(true)
        }
      } finally {
        setLoading(false)
      }
    }, 250)

    return () => clearTimeout(timeout)
  }, [query, open, regionId])

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      router.push(`/${countryCode}/store?q=${encodeURIComponent(query.trim())}`)
      close()
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        // -m-2 p-2 keeps the visual size while giving the icon a ~40px
        // touch area; a bare 16px icon is far below the usable minimum.
        className="flex items-center gap-x-1.5 hover:text-ui-fg-base transition-colors -m-2 p-2"
        aria-label="Search products"
        data-testid="nav-search-button"
      >
        <MagnifyingGlass className="w-4 h-4" />
        <span className="hidden small:inline">Search</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-[75]">
          <div
            className="absolute inset-0 bg-neutral-950/40 backdrop-blur-sm"
            onClick={close}
          />
          <div className="absolute inset-x-0 top-0 flex justify-center px-4 pt-4 small:pt-20">
            <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden">
              <form
                onSubmit={submit}
                className="flex items-center gap-x-3 px-5 py-4 border-b border-neutral-100"
              >
                <MagnifyingGlass className="w-5 h-5 text-neutral-400 shrink-0" />
                <input
                  ref={inputRef}
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search for products…"
                  className="flex-1 text-base outline-none placeholder:text-neutral-400 bg-transparent"
                  data-testid="search-input"
                />
                <button
                  type="button"
                  onClick={close}
                  className="text-neutral-400 hover:text-neutral-900 transition-colors"
                  aria-label="Close search"
                >
                  <XMark className="w-5 h-5" />
                </button>
              </form>

              <div className="max-h-[65vh] overflow-y-auto">
                {loading && results.length === 0 && (
                  <p className="px-5 py-8 text-sm text-neutral-400 text-center">
                    Searching…
                  </p>
                )}

                {!loading && searched && results.length === 0 && (
                  <p className="px-5 py-8 text-sm text-neutral-400 text-center">
                    Nothing found for “{query}”
                  </p>
                )}

                {/* A compact row per result rather than a card grid: in a
                    type-ahead the name and price are what you scan, and a
                    4/5 card pushed both out of view behind a ~400px image. */}
                {results.length > 0 && (
                  <ul className="py-2">
                    {results.map((product) => {
                      const { cheapestPrice } = getProductPrice({ product })
                      return (
                        <li key={product.id}>
                          <LocalizedClientLink
                            href={`/products/${product.handle}`}
                            onClick={close}
                            className="flex items-center gap-x-4 px-5 py-3 hover:bg-neutral-50 transition-colors"
                          >
                            <div className="relative h-14 w-14 shrink-0 rounded-md overflow-hidden bg-neutral-100">
                              {product.thumbnail && (
                                <Image
                                  src={product.thumbnail}
                                  alt={product.title}
                                  fill
                                  sizes="56px"
                                  className="object-cover object-center"
                                />
                              )}
                            </div>
                            <p className="flex-1 min-w-0 truncate text-sm text-neutral-900">
                              {product.title}
                            </p>
                            {cheapestPrice && (
                              <p className="shrink-0 text-sm text-neutral-500">
                                {cheapestPrice.calculated_price}
                              </p>
                            )}
                          </LocalizedClientLink>
                        </li>
                      )
                    })}
                  </ul>
                )}

                {!searched && !loading && (
                  <p className="px-5 py-8 text-sm text-neutral-400 text-center">
                    Start typing to search the store
                  </p>
                )}
              </div>

              {results.length > 0 && (
                <button
                  onClick={submit}
                  className="w-full border-t border-neutral-100 px-5 py-3 text-sm text-neutral-600 hover:bg-neutral-50 transition-colors text-center"
                >
                  View all results for “{query}”
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
