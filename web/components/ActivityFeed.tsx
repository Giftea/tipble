import type { TipEvent } from "@/types"
import { getExplorerUrl, formatTime } from "@/lib/utils"

interface EventStyle {
  border: string
  badgeBg: string
  text: string
  label: string
}

const EVENT_STYLES: Record<string, EventStyle> = {
  follower_milestone:  { border: '#a855f7', badgeBg: 'rgba(168,85,247,0.12)', text: '#c084fc', label: 'Milestone'   },
  new_subscriber:      { border: '#22c55e', badgeBg: 'rgba(34,197,94,0.12)',  text: '#4ade80', label: 'New Sub'     },
  viewer_spike:        { border: '#f59e0b', badgeBg: 'rgba(245,158,11,0.12)', text: '#fbbf24', label: 'Spike'       },
  new_viewer:          { border: '#5dcaa5', badgeBg: 'rgba(93,202,165,0.12)', text: '#5dcaa5', label: 'New Viewer'  },
  watch_time_reached:  { border: '#c084fc', badgeBg: 'rgba(192,132,252,0.12)',text: '#c084fc', label: 'Watch Time'  },
  subscriber_action:   { border: '#f472b6', badgeBg: 'rgba(244,114,182,0.12)',text: '#f472b6', label: 'Subscribed'  },
  watching_now:        { border: '#3b82f6', badgeBg: 'rgba(59,130,246,0.12)', text: '#60a5fa', label: 'Watching'    },
  manual:              { border: '#71717a', badgeBg: 'rgba(113,113,122,0.12)', text: '#a1a1aa', label: 'Manual'     },
}

function getStyle(type: string): EventStyle {
  return EVENT_STYLES[type] ?? EVENT_STYLES.manual
}

interface ActivityFeedProps {
  tips: TipEvent[]
  network: string
}

export default function ActivityFeed({ tips, network }: ActivityFeedProps) {
  if (tips.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-zinc-500">
        <span className="text-4xl">⚡</span>
        <p className="font-medium text-zinc-400">No activity yet</p>
        <p className="text-sm text-zinc-600">Start the agent or trigger a test event.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {tips.map(tip => {
        const s = getStyle(tip.eventType)
        return (
          <div
            key={tip.id}
            className="bg-zinc-900 border border-zinc-800 rounded-r-lg rounded-l-none pr-4 py-3 pl-4"
            style={{ borderLeft: `3px solid ${s.border}` }}
          >
            {/* top row */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-green-400">
                +{tip.amount} {tip.asset}
              </span>
              <span
                className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ background: s.badgeBg, color: s.text, border: `1px solid ${s.border}` }}
              >
                {s.label}
              </span>
              <a
                href={getExplorerUrl(tip.txHash, network)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                Verify TX ↗
              </a>
              <span className="ml-auto text-xs text-zinc-500 font-mono tabular-nums">
                {tip.confidence.toFixed(2)}
              </span>
              <span className="text-xs text-zinc-600 font-mono tabular-nums">
                {formatTime(tip.timestamp)}
              </span>
            </div>

            {/* reason */}
            <p className="text-sm text-zinc-300 mt-1.5">{tip.reason}</p>

            {/* claude reasoning */}
            {tip.reasoning && (
              <p className="text-xs text-zinc-500 mt-1 italic leading-relaxed">
                Claude: &ldquo;{tip.reasoning}&rdquo;
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}
