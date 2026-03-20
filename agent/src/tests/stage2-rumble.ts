import dotenv from "dotenv"
dotenv.config()

import { getStreamState } from "../rumble/client.js"

async function main(): Promise<void> {
  try {
    const state = await getStreamState()
    console.log("Stream state:")
    console.log("  is_live:                   ", state.is_live)
    console.log("  watching_now:              ", state.watching_now)
    console.log("  num_followers:             ", state.num_followers)
    console.log("  num_followers_total:       ", state.num_followers_total)
    console.log("  num_subscribers:           ", state.num_subscribers)
    console.log("  latest_follower_username:  ", state.latest_follower_username)
    console.log("  latest_subscriber_username:", state.latest_subscriber_username)
    console.log("  timestamp:                 ", state.timestamp)
    console.log("✅ STAGE 2 PASSED")
  } catch (err) {
    console.log("❌ STAGE 2 FAILED:", err)
  }
}

main()
