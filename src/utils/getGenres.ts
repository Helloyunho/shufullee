let cachedGenres: Promise<Record<string, string>> | null = null

export const getGenres = (country: string = 'US'): Promise<Record<string, string>> => {
  if (cachedGenres) {
    return cachedGenres
  }

  cachedGenres = fetch(`/api/genres?country=${country}`)
    .then((response) => {
      if (!response.ok) {
        throw new Error('Failed to fetch genres')
      }
      return response.json()
    })
    .catch((error) => {
      cachedGenres = null
      throw error
    })

  return cachedGenres
}
