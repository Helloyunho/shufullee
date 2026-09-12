import { use } from 'react'
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from '@/components/ui/combobox'
import { getGenres } from '@/utils/getGenres'

export function GenreLoading () {
  return (
    <Combobox disabled id='genre'>
      <ComboboxInput placeholder='Loading...' />
    </Combobox>
  )
}

export function GenreCombobox ({
  value, onChange, country
}: {
  value: {
    value: string
    label: string
  } | null
  onChange: (value: {
    value: string
    label: string
  } | null) => void
  country: string | null | undefined
}) {
  const genres = use(getGenres(country ?? 'US'))

  return (
    <Combobox
      items={Object.entries(genres).map(([key, value]) => ({
        value: key,
        label: value,
      }))}
      value={value}
      onValueChange={onChange}
      id='genre'
    >
      <ComboboxInput placeholder='Select a genre (Optional)' showClear />
      <ComboboxContent>
        <ComboboxEmpty>No genre found.</ComboboxEmpty>
        <ComboboxList>
          {(genre) => (
            <ComboboxItem key={genre.value} value={genre}>
              {genre.label}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}
