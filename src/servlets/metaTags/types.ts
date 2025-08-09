export enum MetaTagFormat {
  Default,
  Track,
  Collection,
  User,
  Remixes,
  Upload,
  Explore,
  Collectibles,
  Collectible,
  Error,
  AUDIO,
  SignupRef,
  DownloadApp,
  Comment,
}

export enum Playable {
  TRACK = 'track',
  PLAYLIST = 'playlist',
  ALBUM = 'album',
}

export interface Context {
  format: MetaTagFormat

  title: string
  description: string
  image: string
  // Whether or not the image shows as a small thumbnail version
  thumbnail?: boolean

  // Url to the webapp
  webUrl?: string
  // Url to the app (for deep-linking)
  appUrl?: string
  // Whether or not to show an embed player
  embed?: boolean
  // Bedtime player url
  embedUrl?: string
  // OEmbed root url
  oembedUrl?: string

  tags?: string[]
  labels?: Array<{ name: string; value: string }>

  additionalSEOHint?: string

  // For OG images
  entityId?: string
}
