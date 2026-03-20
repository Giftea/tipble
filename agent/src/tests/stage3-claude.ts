import dotenv from "dotenv"
dotenv.config()

import { reasonAboutTip } from "../claude/reasoner.js"
import { getConfig } from "../config/loader.js"
import type { StreamState } from "../rumble/types.js"

async function main(): Promise<void> {
  try {
    const config = getConfig()

    const prev: StreamState = {
      num_followers: 999,
      num_followers_total: 999,
      num_subscribers: 4,
      watching_now: 120,
      is_live: true,
      latest_follower_username: null,
      latest_subscriber_username: null,
      timestamp: Date.now(),
    }

    const curr: StreamState = {
      num_followers: 1000,
      num_followers_total: 1000,
      num_subscribers: 4,
      watching_now: 130,
      is_live: true,
      latest_follower_username: null,
      latest_subscriber_username: null,
      timestamp: Date.now(),
    }

    const decision = await reasonAboutTip(prev, curr, config)
    console.log("TipDecision:", decision)

    if (decision.shouldTip && decision.confidence >= 0.7) {
      console.log("✅ STAGE 3 PASSED")
    } else {
      console.log("❌ STAGE 3 FAILED")
    }
  } catch (err) {
    console.log("❌ STAGE 3 FAILED:", err)
  }
}

main()
