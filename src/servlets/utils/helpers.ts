import { FullTrack, Track, TrackModel } from '../../types/Track'
import { FullUser, UserModel } from '../../types/User'
import {
  DEFAULT_IMAGE_URL,
  ExploreInfoType,
  exploreMap,
  USER_NODE_IPFS_GATEWAY,
} from './constants'
import { encodeHashId } from './hashids'

const ENV = process.env

export const getTracks = async (ids: number[]): Promise<TrackModel[]> => {
  const ts = await fetch(`${ENV.API_URL}/v1/full/tracks?ids=${ids.join(',')}`).then(res => res.json())
  if (ts) return ts
  throw new Error(`Failed to get tracks ${ids}`)
}

const userModelToFullUser = (user: UserModel): FullUser => {
  return {
    ...user,
    id: encodeHashId(user.user_id)!,
    cover_photo_legacy: null,
    profile_picture_legacy: null,
  }
}

const trackModelToFullTrack = async (track: TrackModel): Promise<FullTrack> => {
  const user: UserModel = await getUser(track.owner_id)

  const releaseDate = track.release_date ? track.release_date : track.created_at
  const duration = track.track_segments.reduce(
    (acc: number, v) => (acc = acc + v.duration),
    0
  )

  // Map remix_of and stem_of to FullTrack
  const remixOf = track.remix_of
    ? {
        tracks: track.remix_of.tracks.map((t) => ({
          ...t,
          parent_track_id: encodeHashId(t.parent_track_id)!,
          user: userModelToFullUser(user),
        })),
      }
    : null
  const stemOf = { category: null, parent_track_id: null }

  return {
    ...track,
    id: encodeHashId(track.track_id)!,
    user: userModelToFullUser(user),
    artwork: track.artwork,
    release_date: releaseDate,
    duration,
    remix_of: remixOf,
    stem_of: stemOf,
    favorite_count: track.save_count,
    downloadable: track.download.is_downloadable,
    followee_favorites: track.followee_saves,
    user_id: encodeHashId(track.owner_id)!,
  }
}

export const getTrackByHandleAndSlug = async (
  handle: string,
  slug: string
): Promise<Track> => {
  const url = `${ENV.API_URL}/v1/full/resolve?url=/${encodeURIComponent(handle)}/${encodeURIComponent(slug)}`
  const res = await fetch(url)
  const { data: track } = await res.json()
  if (track) return track
  throw new Error(`Failed to get track ${handle}/${slug}`)
}

type CommentData = {
  comment: Comment
  track: FullTrack
  user: FullUser
}

export const getCommentDataById = async (id: string): Promise<CommentData> => {
  const url = `${ENV.API_URL}/v1/full/comments/${id}`
  const res = await fetch(url)
  const { data, related } = await res.json()
  const comment = Array.isArray(data) ? data[0] : data

  if (!comment) throw new Error(`Failed to get comment ${id}`)

  const track = related.tracks.find(
    (t: FullTrack) => t.id === comment.entity_id
  )
  const user = related.users.find((u: FullUser) => u.id === comment.user_id)

  return {
    comment,
    track,
    user,
  }
}

export const getCollectionByHandleAndSlug = async (
  handle: string,
  slug: string
): Promise<any> => {
  const url = `${ENV.API_URL}/v1/full/playlists/by_permalink/${encodeURIComponent(
    handle
  )}/${encodeURIComponent(slug)}`
  const res = await fetch(url)
  const { data: playlist } = await res.json()
  if (playlist) return Array.isArray(playlist) ? playlist[0] : playlist

  return playlist
}

export const getUser = async (id: number): Promise<UserModel> => {
  const u = await fetch(`${ENV.API_URL}/v1/users?ids=${encodeHashId(id)}`)
    .then(res => res.json())
    .then(res => res.data).then(res => res[0])
  if (u && u[0]) return u[0]
  throw new Error(`Failed to get user ${id}`)
}

export const getUsers = async (ids: number[]): Promise<UserModel[]> => {
  const us = await fetch(`${ENV.API_URL}/v1/users?ids=${ids.map(encodeHashId).join(',')}`)
    .then(res => res.json())
    .then(res => res.data)
  if (us) return us
  throw new Error(`Failed to get users: ${ids}`)
}

export const getUserByHandle = async (handle: string): Promise<UserModel> => {
  const u = await fetch(`${ENV.API_URL}/v1/users/handle/${handle}`)
    .then(res => res.json())
    .then(res => res.data)
  if (u) return u
  throw new Error(`Failed to get user ${handle}`)
}

export const getExploreInfo = (type: string): ExploreInfoType => {
  if (!Object.keys(exploreMap).includes(type)) {
    return {
      title: 'Just For You',
      description: `Content curated for you based on your likes, reposts, and follows.
                    Refreshes often so if you like a track, favorite it.`,
      image: DEFAULT_IMAGE_URL,
    }
  }
  return exploreMap[type]
}

/**
 * Fisher-Yates algorithm shuffles an array
 * @param a any array
 */
export const shuffle = (a: any[]) => {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1)) as number
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Optionally redirect certain tracks to 404
const REDIRECT_TRACK_ID_RANGE = [416972, 418372]
export const shouldRedirectTrack = (trackId: number) =>
  trackId >= REDIRECT_TRACK_ID_RANGE[0] && trackId <= REDIRECT_TRACK_ID_RANGE[1]

/**
 * Generate a short base36 hash for a given string.
 * Used to generate short hashes for for queries and urls.
 * @param {string} str
 * @returns {string} hash
 */
export const getHash = (str: string) =>
  Math.abs(
    str.split('').reduce((a, b) => {
      a = (a << 5) - a + b.charCodeAt(0)
      return a & a
    }, 0)
  ).toString(36)
