export interface RumbleFollowers {
  num_followers: number
  num_followers_total: number
  latest_follower: { username: string; followed_on: string } | null
  recent_followers: { username: string; followed_on: string }[]
}

export interface RumbleSubscriber {
  username: string
  user: string
  amount_cents: number
  amount_dollars: number
  subscribed_on: string
}

export interface RumbleSubscribers {
  num_subscribers: number
  latest_subscriber: RumbleSubscriber | null
  recent_subscribers: RumbleSubscriber[]
}

export interface RumbleLivestream {
  id: string
  title: string
  is_live: boolean
  watching_now: number
  likes: number
  dislikes: number
  chat: {
    latest_message: { username: string; text: string; created_on: string } | null
    recent_messages: { username: string; text: string; created_on: string }[]
  }
}

export interface RumbleApiResponse {
  now: number
  type: string
  followers: RumbleFollowers
  subscribers: RumbleSubscribers
  livestreams: RumbleLivestream[]
}

export interface StreamState {
  num_followers: number
  num_followers_total: number
  num_subscribers: number
  watching_now: number
  is_live: boolean
  latest_subscriber_username: string | null
  latest_follower_username: string | null
  timestamp: number
}

export interface TipDecision {
  shouldTip: boolean
  amount: string
  asset: string
  reason: string
  eventType: string
  confidence: number
  reasoning?: string
}
