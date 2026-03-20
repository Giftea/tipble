import dotenv from "dotenv"
import type { RumbleApiResponse, StreamState } from "./types.js"

dotenv.config()

const RUMBLE_API_URL = process.env.RUMBLE_API_URL

export async function fetchStreamData(): Promise<RumbleApiResponse> {
  if (!RUMBLE_API_URL) {
    throw new Error("RUMBLE_API_URL is not set in environment variables")
  }

  const response = await fetch(RUMBLE_API_URL)

  if (!response.ok) {
    throw new Error(`Rumble API request failed: ${response.status} ${response.statusText}`)
  }

  return response.json() as Promise<RumbleApiResponse>
}

export function flattenState(data: RumbleApiResponse): StreamState {
  return {
    num_followers: data.followers.num_followers,
    num_followers_total: data.followers.num_followers_total,
    num_subscribers: data.subscribers.num_subscribers,
    watching_now: data.livestreams[0]?.watching_now ?? 0,
    is_live: data.livestreams[0]?.is_live ?? false,
    latest_subscriber_username: data.subscribers.latest_subscriber?.username ?? null,
    latest_follower_username: data.followers.latest_follower?.username ?? null,
    timestamp: data.now,
  }
}

export async function getStreamState(): Promise<StreamState> {
  const data = await fetchStreamData()
  return flattenState(data)
}
