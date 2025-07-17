import { Collectible } from '@audius/fetch-nft'
import express from 'express'
import fs from 'fs'
import handlebars from 'handlebars'
import path from 'path'

import {
  AUDIO_REWARDS_IMAGE_URL,
  DEFAULT_IMAGE_URL,
  SIGNUP_REF_IMAGE_URL,
} from '../utils/constants'
import { nftClient } from '../utils/fetchNft'
import {
  formatDate,
  formatSeconds,
  truncateDescription,
} from '../utils/format'
import { encodeHashId } from '../utils/hashids'
import {
  getCollectionByHandleAndSlug,
  getCommentDataById,
  getExploreInfo,
  getHash,
  getTrackByHandleAndSlug,
  getUserByHandle,
} from '../utils/helpers'
import { Context, MetaTagFormat, Playable } from './types'

const CAN_EMBED_USER_AGENT_REGEX = /(twitter|discord)/
const RELEASE_DATE_FORMAT = 'ddd MMM DD YYYY HH:mm:ss GMTZZ'

const E = process.env

const getCollectionEmbedUrl = (type: Playable, hashId: string) => {
  return `${E.PUBLIC_URL}/embed/${type}/${hashId}?flavor=card&twitter=true`
}

const getTrackEmbedUrl = (type: Playable, hashId: string) => {
  return `${E.PUBLIC_URL}/embed/${type}/${hashId}?flavor=card&twitter=true`
}

// Note: Discord only respects audius.co embed players at a prefix of
// audius.co/track, audius.co/album, audius.co/playlist
// We add support for Discord by offering a an alternative route "hack"
// These URLs are *never* to be shared more broadly than in the
// general-admission response to a Discordbot.

const getCollectiblesEmbedUrl = (
  handle: string,
  isDiscord: boolean = false
) => {
  return `${E.PUBLIC_URL}/embed/${
    isDiscord ? 'track/' : ''
  }${handle}/collectibles`
}

const getCollectibleEmbedUrl = (
  handle: string,
  collectibleId: string,
  isDiscord: boolean = false
) => {
  return `${E.PUBLIC_URL}/embed/${
    isDiscord ? 'track/' : ''
  }${handle}/collectibles/${collectibleId}`
}

/** Routes */

const template = handlebars.compile(
  fs.readFileSync(path.resolve(__dirname, './template.html')).toString()
)

const getTrackContext = async (
  handle: string,
  slug: string,
  canEmbed: boolean
): Promise<Context> => {
  if (!handle || !slug) return getDefaultContext()
  try {
    const track = await getTrackByHandleAndSlug(handle, slug)
    const isStreamGated = track.is_stream_gated

    const tags = track.tags ? track.tags.split(',') : []
    tags.push('audius', 'sound', 'kit', 'sample', 'pack', 'stems', 'mix')

    const labels = [
      {
        name: 'Released',
        value: formatDate(track.release_date, RELEASE_DATE_FORMAT),
      },
      { name: 'Duration', value: formatSeconds(track.duration) },
      { name: 'Genre', value: track.genre },
      { name: 'Mood', value: track.mood },
    ]

    return {
      format: MetaTagFormat.Track,
      title: `${track.title} • ${track.user.name}`,
      description: truncateDescription(track.description || '', 100),
      tags,
      labels,
      image: track.artwork['1000x1000'],
      embed: canEmbed && !isStreamGated,
      embedUrl: getTrackEmbedUrl(Playable.TRACK, track.id),
      entityId: track.id,
    }
  } catch (e) {
    console.error(e)
    return getDefaultContext()
  }
}

const getCollectionContext = async (
  handle: string,
  title: string,
  canEmbed: boolean
): Promise<Context> => {
  if (!handle || !title) return getDefaultContext()
  try {
    const collection = await getCollectionByHandleAndSlug(handle, title)
    const user = collection.user
    return {
      format: MetaTagFormat.Collection,
      title: `${collection.playlist_name} • ${user.name}`,
      description: truncateDescription(collection.description || '', 100),
      image: collection.artwork['1000x1000'],
      embed: canEmbed,
      embedUrl: getCollectionEmbedUrl(
        collection.is_album ? Playable.ALBUM : Playable.PLAYLIST,
        collection.id
      ),
      entityId: collection.id,
    }
  } catch (e) {
    console.error(e)
    return getDefaultContext()
  }
}

const getUserContext = async (handle: string): Promise<Context> => {
  if (!handle) return getDefaultContext()
  try {
    const user = await getUserByHandle(handle)
    const encodedUserId = encodeHashId(user.user_id)

    const profilePicture = user.profile_picture?.['1000x1000']

    const infoText =
      user.track_count > 0
        ? `Listen to ${user.name} on Audius`
        : `Follow ${user.name} on Audius`

    return {
      format: MetaTagFormat.User,
      title: `${user.name} (@${user.handle})`,
      description: truncateDescription(user.bio || '', 100),
      additionalSEOHint: infoText,
      image: profilePicture ?? DEFAULT_IMAGE_URL,
      entityId: encodedUserId ?? undefined,
    }
  } catch (e) {
    console.error(e)
    return getDefaultContext()
  }
}

const getCollectiblesContext = async (
  handle: string,
  canEmbed: boolean,
  isDiscord: boolean = false
): Promise<Context> => {
  if (!handle) return getDefaultContext()
  try {
    const user = await getUserByHandle(handle)
    const infoText =
      user.track_count > 0
        ? `Listen to ${user.name} on Audius`
        : `Follow ${user.name} on Audius`

    return {
      format: MetaTagFormat.Collectibles,
      title: `${user.name}'s Collectibles`,
      description: `A collection of NFT collectibles owned and created by ${user.name}`,
      additionalSEOHint: infoText,
      image: user.profile_picture?.['1000x1000'] ?? DEFAULT_IMAGE_URL,
      embed: canEmbed,
      embedUrl: getCollectiblesEmbedUrl(user.handle, isDiscord),
    }
  } catch (e) {
    console.error(e)
    return getDefaultContext()
  }
}

const getCollectibleContext = async (
  handle: string,
  collectibleId: string,
  canEmbed: boolean,
  isDiscord: boolean = false
): Promise<Context> => {
  if (!handle) return getDefaultContext()
  try {
    const user = await getUserByHandle(handle)

    const infoText =
      user.track_count > 0
        ? `Listen to ${user.name} on Audius`
        : `Follow ${user.name} on Audius`

    const encodedUserId = encodeHashId(user.user_id)
    const res = await fetch(
      `${E.API_URL}/v1/users/associated_wallets?id=${encodedUserId}`
    )
    const { data: walletData } = await res.json()

    if (collectibleId) {
      // Get collectibles for user wallets
      const resp = await nftClient.getCollectibles({
        ethWallets: walletData.wallets,
        solWallets: walletData.sol_wallets,
      })

      const ethValues: Collectible[][] = Object.values(resp.ethCollectibles)
      const solValues: Collectible[][] = Object.values(resp.solCollectibles)
      const collectibles = [
        ...ethValues.reduce((acc, vals) => [...acc, ...vals], []),
        ...solValues.reduce((acc, vals) => [...acc, ...vals], []),
      ]

      const foundCol = collectibles.find(
        (col) => getHash(col.id) === collectibleId
      )

      if (foundCol) {
        return {
          format: MetaTagFormat.Collectibles,
          title: foundCol.name ?? '',
          description: foundCol.description ?? '',
          additionalSEOHint: infoText,
          image: foundCol.frameUrl ?? '',
          embed: canEmbed,
          embedUrl: getCollectibleEmbedUrl(
            user.handle,
            collectibleId,
            isDiscord
          ),
        }
      }
    }

    return {
      format: MetaTagFormat.Collectibles,
      title: `${user.name}'s Collectibles`,
      description: `A collection of NFT collectibles owned and created by ${user.name}`,
      additionalSEOHint: infoText,
      image: user.profile_picture?.['1000x1000'] ?? DEFAULT_IMAGE_URL,
      embed: canEmbed,
      embedUrl: getCollectiblesEmbedUrl(user.handle),
    }
  } catch (e) {
    console.error(e)
    return getDefaultContext()
  }
}

const getRemixesContext = async (
  handle: string,
  slug: string
): Promise<Context> => {
  if (!handle || !slug) return getDefaultContext()
  try {
    const track = await getTrackByHandleAndSlug(handle, slug)

    const tags = track.tags ? track.tags.split(',') : []
    tags.push('audius', 'sound', 'kit', 'sample', 'pack', 'stems', 'mix')

    const labels = [
      {
        name: 'Released',
        value: formatDate(track.release_date, RELEASE_DATE_FORMAT),
      },
      { name: 'Duration', value: formatSeconds(track.duration) },
      { name: 'Genre', value: track.genre },
      { name: 'Mood', value: track.mood },
    ]

    return {
      format: MetaTagFormat.Remixes,
      title: `Remixes of ${track.title} • ${track.user.name}`,
      description: track.description || '',
      tags,
      labels,
      image: track.artwork['1000x1000'],
    }
  } catch (e) {
    console.error(e)
    return getDefaultContext()
  }
}

const getUploadContext = (): Context => {
  return {
    format: MetaTagFormat.Upload,
    title: 'Audius Upload',
    description: `Upload your tracks to Audius`,
    image: DEFAULT_IMAGE_URL,
    thumbnail: true,
  }
}

const getExploreContext = (type: string): Context => {
  return {
    format: MetaTagFormat.Explore,
    thumbnail: true,
    ...getExploreInfo(type),
  }
}

const getDefaultContext = (): Context => {
  return {
    format: MetaTagFormat.Default,
    title: 'Audius',
    description:
      'Audius is a music streaming and \
sharing platform that puts power back into the hands \
of content creators',
    image: DEFAULT_IMAGE_URL,
    thumbnail: true,
  }
}

const getTokenContext = (): Context => {
  return {
    format: MetaTagFormat.AUDIO,
    title: '$AUDIO & Rewards',
    description: 'Earn $AUDIO tokens while using the app!',
    image: AUDIO_REWARDS_IMAGE_URL,
    thumbnail: false,
  }
}

const getSignupRefContext = (handle?: string): Context => {
  return {
    format: MetaTagFormat.SignupRef,
    title: handle
      ? `Invite to join Audius from @${handle}!`
      : 'Invite to join Audius',
    description:
      'Sign up for Audius to earn $AUDIO tokens while using the app!',
    image: SIGNUP_REF_IMAGE_URL,
    thumbnail: false,
  }
}

const getDownloadAppContext = (): Context => {
  return {
    format: MetaTagFormat.DownloadApp,
    title: 'Audius Download',
    description: 'Artists Deserve More.',
    image: DEFAULT_IMAGE_URL,
    thumbnail: false,
  }
}

const getCommentContext = async (
  commentId: string,
  handle: string,
  title: string
): Promise<Context> => {
  if (!commentId || !handle || !title) return getDefaultContext()
  try {
    const { track, user } = await getCommentDataById(commentId)
    const { id: linkTrackId } = await getTrackByHandleAndSlug(handle, title)

    if (linkTrackId !== track.id) {
      console.log('comment track does not match url track')
      return getTrackContext(handle, title, false)
    }

    const trackName = track.title
    const artistName = track.user.name
    const commenterName = user.name

    return {
      format: MetaTagFormat.Comment,
      title: `${commenterName}'s comment on ${trackName} | Audius Music`,
      description: `Join the conversation around ${trackName} by ${artistName} — streaming on Audius`,
      image: DEFAULT_IMAGE_URL,
      entityId: commentId,
    }
  } catch (e) {
    console.error(e)
    return getDefaultContext()
  }
}

const getResponse = async (
  format: MetaTagFormat,
  req: express.Request,
  res: express.Response
) => {
  const { title, handle, type, collectibleId } = req.params
  const { ref, rf, commentId } = req.query

  const userAgent = req.get('User-Agent') || ''
  const canEmbed = CAN_EMBED_USER_AGENT_REGEX.test(userAgent.toLowerCase())
  const isDiscord = userAgent.toLowerCase().includes('discord')

  let context: Context

  const id = title ? parseInt(title.split('-').slice(-1)[0], 10) : -1
  switch (format) {
    case MetaTagFormat.Track:
      console.log('get track', req.path, handle, title, userAgent)
      context = await getTrackContext(handle, title, canEmbed)
      break
    case MetaTagFormat.Collection:
      console.log('get collection', req.path, id, userAgent)
      context = await getCollectionContext(handle, title, canEmbed)
      break
    case MetaTagFormat.User:
      console.log('get user', req.path, handle, userAgent)
      context = await getUserContext(handle)
      break
    case MetaTagFormat.Remixes:
      console.log('get remixes', req.path, handle, title, userAgent)
      context = await getRemixesContext(handle, title)
      break
    case MetaTagFormat.Upload:
      console.log('get upload', req.path, userAgent)
      context = await getUploadContext()
      break
    case MetaTagFormat.Explore:
      console.log('get explore', req.path, userAgent)
      context = await getExploreContext(type)
      break
    case MetaTagFormat.Collectibles:
      console.log('get collectibles', req.path, userAgent)
      context = await getCollectiblesContext(handle, canEmbed, isDiscord)
      break
    case MetaTagFormat.Collectible:
      console.log('get collectible', req.path, userAgent)
      context = await getCollectibleContext(
        handle,
        collectibleId,
        canEmbed,
        isDiscord
      )
      break
    case MetaTagFormat.AUDIO:
      console.log('get audio', req.path, userAgent)
      context = await getTokenContext()
      break
    case MetaTagFormat.SignupRef:
      console.log('get signup ref', req.path, userAgent)
      if (rf) {
        context = await getSignupRefContext(rf as string)
      } else if (ref) {
        context = await getSignupRefContext(ref as string)
      } else {
        context = await getSignupRefContext()
      }
      break
    case MetaTagFormat.DownloadApp:
      console.log('get download app', req.path, userAgent)
      context = await getDownloadAppContext()
      break
    case MetaTagFormat.Comment:
      console.log('get comment', req.path, userAgent)
      context = await getCommentContext(commentId as string, handle, title)
      break
    case MetaTagFormat.Error:
    default:
      console.log('get default', req.path, userAgent)
      context = getDefaultContext()
  }

  context.appUrl = `audius:/${req.url}`
  context.webUrl = `https://audius.co${req.url}`

  // Add OG image URL based on the format
  const ogFormatMap: Partial<Record<MetaTagFormat, string>> = {
    [MetaTagFormat.User]: 'user',
    [MetaTagFormat.Track]: 'track',
    [MetaTagFormat.Collection]: 'collection',
    [MetaTagFormat.Comment]: 'comment',
  }

  // Only use OG URLs in staging environment
  if (ogFormatMap[context.format] && E.OG_URL && E.OG_URL.includes('staging')) {
    context.image = `${E.OG_URL}/${ogFormatMap[context.format]}/${
      context.entityId
    }`
  }

  const html = template(context)
  return res.send(html)
}

export default getResponse
