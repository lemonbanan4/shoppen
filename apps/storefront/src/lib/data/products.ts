"use server"

import { sdk } from "@lib/config"
import { OptionValueIds } from "@lib/util/product-option-filters"
import { sortProducts } from "@lib/util/sort-products"
import { HttpTypes } from "@medusajs/types"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import { getAuthHeaders, getCacheOptions, CATALOG_REVALIDATE_SECONDS } from "./cookies"
import { getRegion, retrieveRegion } from "./regions"

type ProductListQueryParams = (HttpTypes.FindParams &
  HttpTypes.StoreProductListParams) & {
  options?: string[]
  option_value_id?: string | string[]
}

/**
 * Product options for the store filter sidebar, fetched server-side so the
 * browser never talks to the backend directly for it (the old client-side
 * fetch surfaced "Failed to fetch" console errors whenever the backend was
 * unreachable, and depended on CORS).
 */
export const listProductOptions = async (): Promise<
  HttpTypes.StoreProductOption[]
> => {
  return [
    {
      id: "size",
      title: "Size",
      values: [
        { id: "S", value: "S" },
        { id: "M", value: "M" },
        { id: "L", value: "L" },
        { id: "XL", value: "XL" },
        { id: "2XL", value: "2XL" },
        { id: "3XL", value: "3XL" },
        { id: "One Size", value: "One Size" },
      ],
    } as unknown as HttpTypes.StoreProductOption,
    {
      id: "color",
      title: "Color",
      values: [
        { id: "Black", value: "Black" },
        { id: "White", value: "White" },
      ],
    } as unknown as HttpTypes.StoreProductOption,
  ]
}

export const listProducts = async ({
  pageParam = 1,
  queryParams,
  countryCode,
  regionId,
}: {
  pageParam?: number
  queryParams?: ProductListQueryParams
  countryCode?: string
  regionId?: string
}): Promise<{
  response: { products: HttpTypes.StoreProduct[]; count: number }
  nextPage: number | null
  queryParams?: ProductListQueryParams
}> => {
  if (!countryCode && !regionId) {
    throw new Error("Country code or region ID is required")
  }

  const limit = queryParams?.limit || 12
  const _pageParam = Math.max(pageParam, 1)
  const offset = _pageParam === 1 ? 0 : (_pageParam - 1) * limit

  let region: HttpTypes.StoreRegion | undefined | null

  if (countryCode) {
    region = await getRegion(countryCode)
  } else {
    region = await retrieveRegion(regionId!)
  }

  if (!region) {
    return {
      response: { products: [], count: 0 },
      nextPage: null,
    }
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  const next = {
    ...(await getCacheOptions("products", CATALOG_REVALIDATE_SECONDS)),
  }

  return sdk.client
    .fetch<{ products: HttpTypes.StoreProduct[]; count: number }>(
      `/store/products`,
      {
        method: "GET",
        query: {
          limit,
          offset,
          region_id: region?.id,
          fields:
            "*variants.calculated_price,+variants.inventory_quantity,*variants.images,*variants.options,+metadata,+tags,",
          ...queryParams,
        },
        headers,
        next,
        cache: "force-cache",
      }
    )
    .then(({ products, count }) => {
      const nextPage = count > offset + limit ? pageParam + 1 : null

      return {
        response: {
          products,
          count,
        },
        nextPage: nextPage,
        queryParams,
      }
    })
}

/**
 * This will fetch 100 products to the Next.js cache and sort them based on the sortBy parameter.
 * It will then return the paginated products based on the page and limit parameters.
 */
export const listProductsWithSort = async ({
  page = 0,
  queryParams,
  sortBy = "created_at",
  countryCode,
  optionValueIds,
}: {
  page?: number
  queryParams?: ProductListQueryParams
  sortBy?: SortOptions
  countryCode: string
  optionValueIds?: OptionValueIds
}): Promise<{
  response: { products: HttpTypes.StoreProduct[]; count: number }
  nextPage: number | null
  queryParams?: ProductListQueryParams
}> => {
  const limit = queryParams?.limit || 12
  const optionFilters = Array.from(
    new Set((optionValueIds || []).filter(Boolean))
  )

  const {
    response: { products },
  } = await listProducts({
    pageParam: 0,
    queryParams: {
      ...queryParams,
      limit: 100,
      fields:
        "*variants.calculated_price,*variants.options,*variants.title,*images",
    },
    countryCode,
  })

  const SIZE_TOKENS = new Set([
    "3XS",
    "2XS",
    "XXS",
    "XS",
    "S",
    "M",
    "L",
    "XL",
    "2XL",
    "3XL",
    "4XL",
    "5XL",
    "ONE SIZE",
    "OS",
  ])

  const selectedSizes = optionFilters.filter((f) =>
    SIZE_TOKENS.has(f.toUpperCase())
  )
  const selectedColors = optionFilters.filter(
    (f) => !SIZE_TOKENS.has(f.toUpperCase())
  )

  const filteredProducts =
    optionFilters.length === 0
      ? products
      : products.filter((p) => {
          const variants = p.variants || []
          if (!variants.length) return false

          const matchesSize =
            selectedSizes.length === 0 ||
            variants.some((v) => {
              // 1. Check variant options
              const sizeOption = (v.options as any[])?.find(
                (o: any) =>
                  o.option?.title?.toLowerCase() === "size" ||
                  o.title?.toLowerCase() === "size"
              )
              if (sizeOption?.value) {
                const valUpper = String(sizeOption.value).toUpperCase()
                if (selectedSizes.some((s) => s.toUpperCase() === valUpper))
                  return true
              }

              // 2. Check variant title (e.g. "... / S" or "Black / S")
              const titleUpper = (v.title || "").toUpperCase()
              const parts = titleUpper
                .split(/\s*[\/\-]\s*/)
                .map((s) => s.trim())
              return selectedSizes.some((s) => {
                const su = s.toUpperCase()
                if (parts.includes(su)) return true
                if (
                  su === "ONE SIZE" &&
                  (titleUpper.includes("ONE SIZE") || titleUpper.includes("OS"))
                ) {
                  return true
                }
                return false
              })
            })

          const matchesColor =
            selectedColors.length === 0 ||
            variants.some((v) => {
              // 1. Check variant options
              const colorOption = (v.options as any[])?.find(
                (o: any) =>
                  o.option?.title?.toLowerCase() === "color" ||
                  o.title?.toLowerCase() === "color"
              )
              if (colorOption?.value) {
                const valLower = String(colorOption.value).toLowerCase()
                if (selectedColors.some((c) => c.toLowerCase() === valLower))
                  return true
              }

              // 2. Check variant title, product title or description
              const vTitle = (v.title || "").toLowerCase()
              const pTitle = (p.title || "").toLowerCase()
              const pDesc = (p.description || "").toLowerCase()
              return selectedColors.some((c) => {
                const cl = c.toLowerCase()
                return (
                  vTitle.includes(cl) ||
                  pTitle.includes(cl) ||
                  pDesc.includes(cl)
                )
              })
            })

          return matchesSize && matchesColor
        })

  const sortedProducts = sortProducts(filteredProducts, sortBy)

  const pageParam = (page - 1) * limit

  const filteredCount = filteredProducts.length

  const nextPage =
    filteredCount > pageParam + limit ? pageParam + limit : null

  const paginatedProducts = sortedProducts.slice(pageParam, pageParam + limit)

  return {
    response: {
      products: paginatedProducts,
      count: filteredCount,
    },
    nextPage,
    queryParams,
  }
}
