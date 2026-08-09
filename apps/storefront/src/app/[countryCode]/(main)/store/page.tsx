import { Metadata } from "next"

import { parseOptionValueIds } from "@lib/util/product-option-filters"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import StoreTemplate from "@modules/store/templates"
import { copyFor } from "@lib/copy"

// A static export cannot see the country code, so the tab title stayed English
// on the Swedish route. generateMetadata gets the same params the page does.
export async function generateMetadata(props: Params): Promise<Metadata> {
  const { countryCode } = await props.params
  const t = copyFor(countryCode)
  return { title: t.storeTitle, description: t.storeDescription }
}

type StorePageSearchParams = Record<string, string | string[] | undefined> & {
  sortBy?: SortOptions
  page?: string
  optionValueIds?: string | string[]
}

type Params = {
  searchParams: Promise<StorePageSearchParams>
  params: Promise<{
    countryCode: string
  }>
}

export default async function StorePage(props: Params) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const { sortBy, page, q } = searchParams
  const optionValueIds = parseOptionValueIds(searchParams)

  return (
    <StoreTemplate
      sortBy={sortBy}
      page={page}
      countryCode={params.countryCode}
      optionValueIds={optionValueIds}
      searchQuery={typeof q === "string" ? q : undefined}
    />
  )
}
