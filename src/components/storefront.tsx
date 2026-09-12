import { use } from 'react'
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from '@/components/ui/combobox'
import { getStorefronts } from '@/utils/getStorefronts'

export function StorefrontLoading () {
  return (
    <Combobox disabled id='storefront'>
      <ComboboxInput placeholder='Loading...' />
    </Combobox>
  )
}

export function StorefrontCombobox ({
  value, onChange
}: {
  value: {
    value: string
    label: string
  } | null
  onChange: (value: {
    value: string
    label: string
  } | null) => void
}) {
  const storefronts = use(getStorefronts())

  return (
    <Combobox
      items={Object.entries(storefronts).map(([key, value]) => ({
        value: key,
        label: value,
      }))}
      value={value}
      onValueChange={onChange}
      id='storefront'
    >
      <ComboboxInput placeholder='Select a country (Default: US)' showClear />
      <ComboboxContent>
        <ComboboxEmpty>No country found.</ComboboxEmpty>
        <ComboboxList>
          {(storefront) => (
            <ComboboxItem key={storefront.value} value={storefront}>
              {storefront.label}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}
