import Anthropic from "@anthropic-ai/sdk"
import dotenv from "dotenv"
import type { StreamState, TipDecision } from "../rumble/types.js"
import type { TipbleConfig } from "../config/types.js"

dotenv.config()

const client = new Anthropic()

function getRuleForEvent(eventType: string, config: TipbleConfig) {
  switch (eventType) {
    case 'follower_milestone': return config.rules.followerMilestones
    case 'new_subscriber':    return config.rules.newSubscriber
    case 'viewer_spike':      return config.rules.viewerSpike
    case 'watching_now':      return config.rules.watchingNow
    case 'new_follower':      return config.rules.newFollower
    default:                  return null
  }
}

export async function reasonAboutTip(
  prev: StreamState,
  curr: StreamState,
  config: TipbleConfig
): Promise<TipDecision> {
  const prompt = `You are an autonomous tipping agent for a Rumble livestream. Your job is to decide WHETHER a tip should be sent based on stream events. The tip amount and asset are configured by the user — you do not control those.

CONFIGURED RULES (for context only):
${JSON.stringify(config.rules, null, 2)}

PREVIOUS STATE:
${JSON.stringify(prev, null, 2)}

CURRENT STATE:
${JSON.stringify(curr, null, 2)}

WHAT CHANGED:
- Followers: ${curr.num_followers - prev.num_followers > 0 ? '+' : ''}${curr.num_followers - prev.num_followers}
- Subscribers: ${curr.num_subscribers - prev.num_subscribers > 0 ? '+' : ''}${curr.num_subscribers - prev.num_subscribers}
- Viewers: ${curr.watching_now - prev.watching_now > 0 ? '+' : ''}${curr.watching_now - prev.watching_now}
- New subscriber: ${curr.latest_subscriber_username !== prev.latest_subscriber_username ? curr.latest_subscriber_username : 'none'}

Respond ONLY with raw JSON, no markdown:
{
  "shouldTip": boolean,
  "eventType": string (one of: follower_milestone, new_subscriber, viewer_spike, watching_now, new_follower, none),
  "reason": string (max 10 words explaining why),
  "confidence": number between 0 and 1
}`

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 200,
    messages: [{ role: "user", content: prompt }],
  })

  const text = response.content.find((b) => b.type === "text")?.text ?? ""

  let parsed: { shouldTip: boolean; eventType: string; reason: string; confidence: number }

  try {
    parsed = JSON.parse(text)
  } catch {
    return {
      shouldTip: false,
      amount: "0",
      asset: "USDT",
      reason: "Parse error",
      eventType: "none",
      confidence: 0,
      reasoning: text,
    }
  }

  const rule = getRuleForEvent(parsed.eventType, config)

  if (!rule || !rule.enabled) {
    return {
      shouldTip: false,
      amount: "0",
      asset: "USDT",
      reason: "Rule disabled",
      eventType: parsed.eventType,
      confidence: 0,
    }
  }

  return {
    shouldTip: parsed.shouldTip && parsed.confidence >= config.agent.llmConfidenceThreshold,
    amount: rule.tipAmount,
    asset: rule.asset,
    reason: parsed.reason,
    eventType: parsed.eventType,
    confidence: parsed.confidence,
    reasoning: parsed.reason,
  }
}
