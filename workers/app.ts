import { Hono } from 'hono'
import { SignJWT, importPKCS8 } from 'jose'

const APPLE_MUSIC_BASE_URL = 'https://api.music.apple.com'
type Bindings = {
  APPLE_TEAM_ID: string
  APPLE_KEY_ID: string
  APPLE_SECRET_KEY: string
}

interface AppleMusicSong {
  id: string
  attributes: {
    name: string
    artistName: string
    artwork: {
      url: string
    }
    durationInMillis: number
    url: string
  }
}

interface Song {
  id: string
  name: string
  artistName: string
  artworkUrl: string
  durationInMillis: number
  url: string
}

interface PlaylistResponse {
  playlist: Song[]
  totalDuration: number
}

const generateJwt = async (env: Bindings): Promise<string> => {
  const key = atob(env.APPLE_SECRET_KEY)

  const privateKey = await importPKCS8(key, 'ES256')

  return await new SignJWT({})
    .setProtectedHeader({
      alg: 'ES256',
      kid: env.APPLE_KEY_ID,
    })
    .setIssuedAt()
    .setIssuer(env.APPLE_TEAM_ID)
    .setExpirationTime('1d')
    .sign(privateKey)
}

const fetchAppleMusicApi = async (endpoint: string, env: Bindings): Promise<ReturnType<typeof JSON.parse>> => {
  const jwt = await generateJwt(env)
  const response = await fetch(`${APPLE_MUSIC_BASE_URL}${endpoint}`, {
    headers: {
      Authorization: `Bearer ${jwt}`,
    },
  })

  if (!response.ok) {
    throw new Error(`Apple Music API request failed: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

const generatePlaylistWithTargetDuration = (data: AppleMusicSong[], targetDuration: number, currentDuration: number, ignoreIds: Set<string>): Song[] => {
  const playlist: Song[] = []
  for (const song of data) {
    const attr = song.attributes
    const id = song.id
    if (ignoreIds.has(id)) {
      continue
    }
    const duration = attr.durationInMillis / 1000
    const currDuration = currentDuration + duration
    if (currDuration > targetDuration + 1) {
      continue
    }
    playlist.push({
      id,
      name: attr.name,
      artistName: attr.artistName,
      artworkUrl: attr.artwork.url,
      durationInMillis: attr.durationInMillis,
      url: attr.url,
    })
    if (currDuration > targetDuration - 1 && currDuration < targetDuration + 1) {
      break
    }
    const result = generatePlaylistWithTargetDuration(data, targetDuration, currDuration, new Set([...ignoreIds, id].slice(0, Math.floor(data.length / 3))))
    if (result.length > 0) {
      playlist.push(...result)
      break
    } else {
      playlist.pop()
    }
  }
  return playlist
}

const generatePlaylist = (data: AppleMusicSong[], targetDuration: number): PlaylistResponse => {
  // shuffle
  for (let i = data.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[data[i], data[j]] = [data[j], data[i]]
  }
  const playlist = generatePlaylistWithTargetDuration(data, targetDuration, 0, new Set())
  return {
    playlist,
    totalDuration: playlist.reduce((acc, song) => acc + song.durationInMillis, 0),
  }
}

const app = new Hono<{ Bindings: Bindings }>()

app.get('/api/generate/:duration/:referencePlaylistId?', async (c) => {
  const { duration, referencePlaylistId } = c.req.param()
  const country = c.req.query('country') ?? 'US'
  const genre = c.req.query('genre') ?? ''

  if (!duration || isNaN(Number(duration))) {
    return c.json({ error: 'Invalid duration' }, 400)
  }

  try {
    let songs: AppleMusicSong[] = []
    if (referencePlaylistId) {
      const playlistData: {
        next: string | null
        data: AppleMusicSong[]
      } = await fetchAppleMusicApi(`/v1/catalog/${country}/playlists/${referencePlaylistId}/tracks?limit=100`, c.env)
      songs = playlistData.data
      if (playlistData.next) {
        let i = 1
        while (playlistData.next && i < 100) {
          const nextData: {
            next: string | null
            data: AppleMusicSong[]
          } = await fetchAppleMusicApi(playlistData.next.replace(APPLE_MUSIC_BASE_URL, ''), c.env)
          songs.push(...nextData.data)
          playlistData.next = nextData.next
          i++
        }
      }
    } else {
      const latestData: {
        results: {
          songs: [{
            data: AppleMusicSong[]
          }]
        }
      } = await fetchAppleMusicApi(`/v1/catalog/${country}/charts?types=songs&limit=200&genre=${genre}`, c.env)
      songs = latestData.results.songs[0].data
    }

    return c.json(generatePlaylist(songs, Number(duration)))
  } catch (error) {
    console.error('Error generating playlist:', error)
    return c.json({ error: 'Failed to generate playlist' }, 500)
  }
})

app.get('/api/storefronts', async (c) => {
  try {
    const storefrontsData: {
      data: { id: string; attributes: { name: string } }[]
    } = await fetchAppleMusicApi('/v1/storefronts', c.env)
    const storefronts = storefrontsData.data.reduce((acc, storefront) => {
      acc[storefront.id] = storefront.attributes.name
      return acc
    }, {} as Record<string, string>)
    return c.json(storefronts)
  } catch (error) {
    return c.json({ error: 'Failed to fetch storefronts' }, 500)
  }
})

app.get('/api/genres', async (c) => {
  const country = c.req.query('country') ?? 'US'
  try {
    const genresData: {
      data: { id: string; attributes: { name: string } }[]
    } = await fetchAppleMusicApi(`/v1/catalog/${country}/genres`, c.env)
    const genres = genresData.data.reduce((acc, genre) => {
      acc[genre.id] = genre.attributes.name
      return acc
    }, {} as Record<string, string>)
    return c.json(genres)
  } catch (error) {
    return c.json({ error: 'Failed to fetch genres' }, 500)
  }
})

export default app
