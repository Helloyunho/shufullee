import { useState, Suspense, useCallback } from 'react'
import { LinkIcon, LoaderCircleIcon } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { StorefrontCombobox, StorefrontLoading } from '@/components/storefront'
import { GenreCombobox, GenreLoading } from '@/components/genre'

interface Playlist {
  id: string
  name: string
  artistName: string
  artworkUrl: string
  durationInMillis: number
  url: string
}

interface PlaylistResponse {
  playlist: Playlist[]
  totalDuration: number
}

const APPLE_MUSIC_PLAYLIST_URL_REGEX = /^https:\/\/music\.apple\.com\/[a-z]{2}\/playlist\/[a-zA-Z0-9-]+\/([a-zA-Z0-9.-]+)(?:\?.+)*$/

export function App () {
  const [duration, setDuration] = useState<number>(1800)
  const [country, setCountry] = useState<{
    value: string
    label: string
  } | null>(null)
  const [genre, setGenre] = useState<{
    value: string
    label: string
  } | null>(null)
  const [referencePlaylist, setReferencePlaylist] = useState<string | null>(null)
  const [referencePlaylistInvalid, setReferencePlaylistInvalid] = useState<boolean>(false)
  const [isGenerating, setIsGenerating] = useState<boolean>(false)
  const [playlist, setPlaylist] = useState<PlaylistResponse | null>(null)

  const handleGeneratePlaylist = useCallback(async () => {
    setIsGenerating(true)
    try {
      const queryParams = new URLSearchParams()
      if (country) {
        queryParams.append('country', country.value)
      }
      if (genre) {
        queryParams.append('genre', genre.value)
      }
      const referencePlaylistId = referencePlaylist ? referencePlaylist.match(APPLE_MUSIC_PLAYLIST_URL_REGEX)?.[1] : null
      const resp = await fetch(`/api/generate/${duration}${referencePlaylistId ? '/' + referencePlaylistId : ''}?${queryParams.toString()}`)
      if (!resp.ok) {
        throw new Error('Failed to generate playlist')
      }
      const data: PlaylistResponse = await resp.json()
      setPlaylist(data)
    } catch (error) {
      console.error('Error generating playlist:', error)
    } finally {
      setIsGenerating(false)
    }
  }, [country, genre, duration, referencePlaylist])

  return (
    <div className='p-6 flex flex-col items-center gap-8'>
      <div className='flex flex-col gap-4 items-center'>
        <h1 className='font-extrabold text-6xl'>Shufullee</h1>
        <p className='text-lg text-muted-foreground'>
          Generate a playlist of songs with a specific duration.
        </p>
      </div>
      <div className='w-full max-w-md flex flex-col gap-4'>
        <Field>
          <FieldLabel htmlFor='duration'>Duration (in seconds)</FieldLabel>
          <Input
            id='duration'
            type='number'
            value={duration}
            min={60}
            onChange={(e) => setDuration(Number(e.target.value))}
            onBlur={(e) => {
              const value = Number(e.target.value)
              if (value < 60) {
                setDuration(60)
              }
            }}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor='storefront'>Country (optional)</FieldLabel>
          <Suspense fallback={<StorefrontLoading />}>
            <StorefrontCombobox value={country} onChange={setCountry} />
          </Suspense>
        </Field>
        <Field>
          <FieldLabel htmlFor='genre'>Genre (optional)</FieldLabel>
          <Suspense fallback={<GenreLoading />}>
            <GenreCombobox value={genre} onChange={setGenre} country={country?.value} />
          </Suspense>
        </Field>
        <Field data-invalid={referencePlaylistInvalid}>
          <FieldLabel htmlFor='reference'>Reference Playlist URL (optional)</FieldLabel>
          <Input
            id='reference'
            value={referencePlaylist ?? ''}
            onChange={(e) => setReferencePlaylist(e.target.value)}
            onBlur={(e) => {
              const value = e.target.value.trim()
              if (value && value !== '' && !APPLE_MUSIC_PLAYLIST_URL_REGEX.test(value)) {
                setReferencePlaylistInvalid(true)
              } else {
                setReferencePlaylistInvalid(false)
              }
            }}
            aria-invalid={referencePlaylistInvalid}
          />
          {referencePlaylistInvalid && (
            <FieldError>
              Please enter a valid Apple Music playlist URL.
            </FieldError>
          )}
        </Field>
        <Button
          onClick={handleGeneratePlaylist}
          disabled={isGenerating || referencePlaylistInvalid}
        >
          {isGenerating
            ? <>
                <LoaderCircleIcon className='animate-spin' />
                <span>Generating...</span>
              </>
            : 'Generate Playlist'}
        </Button>
      </div>
      {playlist && (
        <div className='w-full max-w-4xl'>
          <p className='text-sm text-muted-foreground text-center'>Duration: {Math.floor(playlist.totalDuration / 1000)}s</p>
          {playlist.playlist.map((song) => (
            <div className='flex items-center justify-between p-4 hover:bg-accent transition-colors border-b last:border-b-0 first:rounded-t-2xl last:rounded-b-2xl' key={song.id}>
              <div className='flex items-center gap-4'>
                <img src={song.artworkUrl.replace('{w}', '256').replace('{h}', '256')} alt={song.name} className='size-12 rounded' />
                <div>
                  <p className='font-medium'>{song.name}</p>
                  <div className='flex items-center gap-2'>
                    <p className='text-sm text-muted-foreground'>{song.artistName}</p>
                    <p className='text-sm text-muted-foreground'>{Math.floor(song.durationInMillis / 1000)}s</p>
                  </div>
                </div>
              </div>
              <a href={song.url} target='_blank' rel='noopener noreferrer' className={buttonVariants()}>
                <LinkIcon className='size-4' />
              </a>
            </div>
          ))}
        </div>
      )}
      <p className='text-sm text-muted-foreground'>
        Made by <a href='https://helloyunho.xyz' target='_blank' rel='noopener noreferrer' className='text-primary hover:underline'>Helloyunho</a>. <a href='https://github.com/helloyunho/shufullee' target='_blank' rel='noopener noreferrer' className='text-primary hover:underline'>GitHub</a>
      </p>
    </div>
  )
}

export default App
