let cachedStorefronts: Promise<Record<string, string>> | null = null

export const getStorefronts = (): Promise<Record<string, string>> => {
  if (cachedStorefronts) {
    return cachedStorefronts
  }

  cachedStorefronts = fetch('/api/storefronts')
    .then((response) => {
      if (!response.ok) {
        throw new Error('Failed to fetch storefronts')
      }
      return response.json()
    })
    .catch((error) => {
      cachedStorefronts = null
      throw error
    })

  return cachedStorefronts
}
