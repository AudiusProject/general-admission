type CommentMention = {
  user_id: string
  handle: string
}

type ReplyComment = {
  id: string
  entity_type: string
  entity_id: string
  user_id: string
  message: string
  mentions: CommentMention[] | null
  track_timestamp_s: number
  is_edited: boolean
  is_current_user_reacted: boolean
  is_artist_reacted: boolean
  react_count: number
  created_at: string
  updated_at: string
}

export type Comment = {
  id: string
  entity_type: string
  entity_id: string
  user_id: string
  message: string
  mentions: CommentMention[] | null
  track_timestamp_s: number
  is_muted: boolean
  is_edited: boolean
  is_current_user_reacted: boolean
  is_artist_reacted: boolean
  is_tombstone: boolean
  react_count: number
  created_at: string
  updated_at: string
  reply_count: number
  replies: ReplyComment[] | null
}
