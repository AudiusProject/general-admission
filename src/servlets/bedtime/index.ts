import express from 'express'

import { getCollection, getTrack, getTracks, getUser, getUsers, shouldRedirectTrack } from '../utils/helpers'
import { getCollectionPath, getCoverArt, getTrackPath } from './helpers'
import { BedtimeFormat, GetCollectionResponse, GetTracksResponse, TrackResponse } from './types'

// Error Messages
const DELETED_MESSAGE = 'DELETED'

const getTrackMetadata = async (trackId: number, ownerId: number): Promise<GetTracksResponse> => {
  try {
    if(shouldRedirectTrack(trackId)) return Promise.reject(new Error(DELETED_MESSAGE))
    const track = await getTrack(trackId)
    if (track.is_delete) return Promise.reject(new Error(DELETED_MESSAGE))
    if (track.owner_id !== ownerId) return Promise.reject(new Error('OwnerIds do not match'))
    if (track.is_unlisted) return Promise.reject(new Error('Attempted to embed a hidden track'))

    const user  = await getUser(ownerId)
    const coverArt = getCoverArt(track, user)
    const urlPath = getTrackPath({ ownerHandle: user.handle, title: track.title, id: track.track_id })

    return {
      title: track.title,
      handle: user.handle,
      userName: user.name,
      segments: track.track_segments,
      isVerified: user.is_verified,
      coverArt,
      urlPath,
      gateways: user.creator_node_endpoint,
      id: track.track_id
    }
  } catch (e) {
    const error = `Failed to get track for ID [${trackId}] with error: [${e.message}]`
    console.error(error)
    return Promise.reject(error)
  }
}

const getTracksFromCollection = async (collection: any, ownerUser: any): Promise<TrackResponse[]> => {

  const trackIds: number[] = collection.playlist_contents.track_ids.map((t: {time: number, track: number }) => t.track)
  let tracks = []

  // Fetch tracks if there are IDs
  if (trackIds.length) {
    const unordredTracks = await getTracks(trackIds)

    // reorder tracks - discprov returns tracks out of order
    const unorderedTracksMap = unordredTracks.reduce((acc: any, t: any) => ({ ...acc, [t.track_id]: t }), {})
    tracks = trackIds.map((id: number) => unorderedTracksMap[id])
  }

  // fetch users from tracks
  // only fetch unique IDs that aren't the owner user
  const trackOwnerIds = tracks.map((t: any) => t.owner_id)
  const idsToFetch = new Set(trackOwnerIds.filter((userId: number) => userId !== ownerUser.user_id))
  const users = await getUsers(Array.from(idsToFetch))

  // make a map of all users, including the owner
  const userMap = users.reduce((acc: any, u: any) => ({ ...acc, [u.user_id]: u}), { [ownerUser.user_id]: ownerUser })

  // Create tracks and filter out deletes
  const parsedTracks: TrackResponse[] = tracks.map((t: any) => ({
    title: t.title,
    handle: userMap[t.owner_id].handle,
    userName: userMap[t.owner_id].name,
    segments: t.track_segments,
    urlPath: getTrackPath({ ownerHandle: userMap[t.owner_id].handle, title: t.title, id: t.track_id }),
    id: t.track_id,
    isVerified: userMap[t.owner_id].is_verified,
    gateways: userMap[t.owner_id].creator_node_endpoint
  })).filter((t: any) => !t.is_delete)

  return parsedTracks
}

// We do a bit of parallelization here.
// We first grab the collection and owner user in parallel. Once both are completed, we
// then grab the tracks and cover art in parallel, both of which require the fetched collection and owner user.
const getCollectionMetadata = async (collectionId: number, ownerId: number): Promise<GetCollectionResponse> => {
  try {
    const [collection, ownerUser] = await Promise.all([getCollection(collectionId), getUser(ownerId)])

    if (collection.playlist_owner_id !== ownerUser.user_id) return Promise.reject(new Error('OwnerIds do not match'))
    if (collection.is_delete) return Promise.reject(new Error(DELETED_MESSAGE))

    // Get tracks & covert art in parallel
    const [tracks, coverArt] = await Promise.all([
      getTracksFromCollection(collection, ownerUser),
      getCoverArt(collection, ownerUser)
    ])

    // Create URL path
    const collectionURLPath = getCollectionPath({
      ownerHandle: ownerUser.handle,
      isAlbum: collection.is_album,
      name: collection.playlist_name,
      id: collection.playlist_id
    })

    return {
      name: collection.playlist_name,
      ownerName: ownerUser.name,
      collectionURLPath,
      ownerHandle: ownerUser.handle,
      tracks,
      coverArt,
      isVerified: ownerUser.is_verified,
      id: collection.playlist_id,
      gateways: ownerUser.creator_node_endpoint
    }
  } catch (e) {
    const error = `Failed to get collection for ID [${collectionId}] with error: [${e.message}]`
    console.error(error)
    return Promise.reject(error)
  }
}

export const getBedtimeResponse = async (
  format: BedtimeFormat,
  req: express.Request,
  res: express.Response
) => {
  const { id } = req.params
  if (id === undefined) {
    res.status(500).send(`Error: empty ID`)
    return
  }

  const { ownerId } = req.query
  if (ownerId === undefined) {
    res.status(500).send(`Error: empty OwnerID`)
    return
  }

  try {
    const [parsedId, parsedOwnerId] = [parseInt(id, 10), parseInt(ownerId, 10)]
    let resp = null
    switch (format) {
      case BedtimeFormat.TRACK:
        console.debug(`Embed track: [${id}]`)
        resp = await getTrackMetadata(parsedId, parsedOwnerId)
        break
      case BedtimeFormat.COLLECTION:
        console.debug(`Embed collection: [${id}]`)
        resp = await getCollectionMetadata(parsedId, parsedOwnerId)
        break
      default:
        break
    }
    return res.send(resp)
  } catch (e) {
    if (e.message === DELETED_MESSAGE) {
      res.status(404).send(e)
    } else {
      res.status(500).send(e)
    }
  }
}
