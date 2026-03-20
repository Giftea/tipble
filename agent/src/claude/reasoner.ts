import Anthropic from "@anthropic-ai/sdk"
import dotenv from "dotenv"
import type { StreamState, TipDecision } from "../rumble/types.js"
import type { TipbleConfig } from "../config/types.js"

dotenv.config()

const client = new Anthropic()

export async function reasonAboutTip(
  prev: StreamState,
  curr: StreamState,
  config: TipbleConfig
): Promise<TipDecision> {
  const prompt = `You are an autonomous tipping agent for a Rumble livestream. Based on the stream state change and the configured rules below, decide whether to send a crypto tip to the creator.

CONFIGURED RULES:
${JSON.stringify(config.rules, null, 2)}

BUDGET LIMITS:
${JSON.stringify(config.budget, null, 2)}

PREVIOUS STATE:
${JSON.stringify(prev, null, 2)}

CURRENT STATE:
${JSON.stringify(curr, null, 2)}

WHAT CHANGED:
- Followers: ${curr.num_followers - prev.num_followers > 0 ? "+" : ""}${curr.num_followers - prev.num_followers}
- Subscribers: ${curr.num_subscribers - prev.num_subscribers > 0 ? "+" : ""}${curr.num_subscribers - prev.num_subscribers}
- Viewers: ${curr.watching_now - prev.watching_now > 0 ? "+" : ""}${curr.watching_now - prev.watching_now}
- New subscriber: ${curr.latest_subscriber_username !== prev.latest_subscriber_username ? curr.latest_subscriber_username : "none"}

Respond ONLY with raw JSON, no markdown, no explanation:
{
  "shouldTip": boolean,
  "amount": string (e.g. "0.001"),
  "asset": "ETH" or "USDT" or "XAUT" or "BTC",
  "reason": string (human readable, max 10 words),
  "eventType": string (e.g. "follower_milestone"),
  "confidence": number between 0 and 1
}`

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 300,
    messages: [{ role: "user", content: prompt }],
  })

  const text = response.content.find((b) => b.type === "text")?.text ?? ""

  let decision: TipDecision

  try {
    decision = JSON.parse(text) as TipDecision
  } catch {
    return {
      shouldTip: false,
      amount: "0",
      asset: "ETH",
      reason: "Parse error",
      eventType: "none",
      confidence: 0,
    }
  }

  if (decision.confidence < config.agent.llmConfidenceThreshold) {
    decision.shouldTip = false
  }

  return decision
}
