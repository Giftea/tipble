"use client"

import { useRef, useEffect } from "react"
import type { AgentLogEntry } from "@/types"

interface TypeStyle {
  bg: string
  text: string
}

const TYPE_STYLES: Record<AgentLogEntry['type'], TypeStyle> = {
  SYS: { bg: 'rgba(113,113,122,0.2)',  text: '#a1a1aa' },
  INF: { bg: 'rgba(59,130,246,0.15)',  text: '#60a5fa' },
  EVT: { bg: 'rgba(245,158,11,0.15)',  text: '#fbbf24' },
  LLM: { bg: 'rgba(168,85,247,0.15)', text: '#c084fc' },
  ACT: { bg: 'rgba(34,197,94,0.15)',   text: '#4ade80' },
  TX:  { bg: 'rgba(20,184,166,0.15)',  text: '#2dd4bf' },
}

export default function AgentLog({ entries }: { entries: AgentLogEntry[] }) {
  const bottomRef = useRef<HTMLDivElement>(null)

  // entries arrive newest-first; display chronologically (oldest first, newest at bottom)
  const chronological = [...entries].reverse()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [entries.length])

  return (
    <div
      className="overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-950 p-3 font-mono text-xs space-y-0.5"
      style={{ height: "calc(100vh - 300px)", minHeight: 300 }}
    >
      {chronological.length === 0 ? (
        <span className="text-zinc-600">Waiting for events...</span>
      ) : (
        chronological.map(entry => {
          const s = TYPE_STYLES[entry.type] ?? TYPE_STYLES.SYS
          return (
            <div key={entry.id} className="flex items-start gap-2 leading-relaxed">
              <span className="text-zinc-600 shrink-0 tabular-nums">{entry.timestamp}</span>
              <span
                className="shrink-0 px-1.5 rounded text-[10px] font-semibold leading-[18px]"
                style={{ background: s.bg, color: s.text }}
              >
                {entry.type}
              </span>
              <span className="text-zinc-300 break-all">{entry.message}</span>
            </div>
          )
        })
      )}
      <div ref={bottomRef} />
    </div>
  )
}
