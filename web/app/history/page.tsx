"use client"

import useSWR from "swr"
import { Download } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatHash, getExplorerUrl } from "@/lib/utils"
import type { TipEvent, AgentStatus } from "@/types"

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error("offline")
    return r.json()
  })

// ── Event type badge ──────────────────────────────────────────

const EVENT_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  follower_milestone: { label: "Milestone",   color: "#a78bfa", bg: "rgba(167,139,250,0.1)" },
  new_subscriber:    { label: "New Sub",      color: "#00C8FF", bg: "rgba(0,200,255,0.1)"   },
  viewer_spike:      { label: "Viewer Spike", color: "#EF9F27", bg: "rgba(239,159,39,0.1)"  },
  watching_now:      { label: "Watching Now", color: "#38bdf8", bg: "rgba(56,189,248,0.1)"  },
  manual:            { label: "Manual",       color: "#94a3b8", bg: "rgba(148,163,184,0.1)" },
}

function EventBadge({ type }: { type: string }) {
  const style = EVENT_STYLES[type] ?? { label: type, color: "#94a3b8", bg: "rgba(148,163,184,0.1)" }
  return (
    <span
      className="text-xs font-medium px-2 py-0.5 rounded-full border"
      style={{ color: style.color, backgroundColor: style.bg, borderColor: style.color + "40" }}
    >
      {style.label}
    </span>
  )
}

// ── Confidence display ────────────────────────────────────────

function Confidence({ value }: { value: number }) {
  const color = value >= 0.9 ? "#00C8FF" : value >= 0.7 ? "#EF9F27" : "#f87171"
  return (
    <span className="font-mono text-xs" style={{ color }}>
      {(value * 100).toFixed(0)}%
    </span>
  )
}

// ── Metric card ───────────────────────────────────────────────

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardContent className="pt-4 pb-4">
        <p className="text-xs text-zinc-400 uppercase tracking-wide mb-1">{label}</p>
        <p className="text-2xl font-bold text-white">{value}</p>
      </CardContent>
    </Card>
  )
}

// ── CSV export ────────────────────────────────────────────────

function exportCSV(tips: TipEvent[]) {
  const header = ["id", "timestamp", "eventType", "reason", "amount", "asset", "confidence", "txHash"]
  const rows = tips.map((t) =>
    [t.id, t.timestamp, t.eventType, `"${t.reason}"`, t.amount, t.asset, t.confidence, t.txHash].join(",")
  )
  const csv = [header.join(","), ...rows].join("\n")
  const blob = new Blob([csv], { type: "text/csv" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `tipble-history-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ── Page ──────────────────────────────────────────────────────

export default function HistoryPage() {
  const { data: tips, error: tipsError } = useSWR<TipEvent[]>("/api/tips", fetcher, {
    refreshInterval: 5000,
  })
  const { data: status } = useSWR<AgentStatus>("/api/status", fetcher, {
    refreshInterval: 5000,
  })

  const network = status?.network ?? "sepolia"

  const totalTipped = tips
    ? tips.reduce((sum, t) => sum + parseFloat(t.amount || "0"), 0).toFixed(6)
    : "—"

  const highestTip = tips?.length
    ? Math.max(...tips.map((t) => parseFloat(t.amount || "0"))).toFixed(6)
    : "—"

  return (
    <div>
      {/* Page header */}
      <div className="border-b border-zinc-800 px-6 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-medium text-white">History</h1>
          <p className="text-sm text-zinc-400 mt-0.5">Full tip transaction history</p>
        </div>
        {tips && tips.length > 0 && (
          <Button
            variant="outline"
            onClick={() => exportCSV(tips)}
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white gap-2"
          >
            <Download size={14} />
            Export CSV
          </Button>
        )}
      </div>

      <div className="p-6 space-y-6">
        {/* Summary row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard label="Total tips fired"  value={tips ? String(tips.length) : "—"} />
          <StatCard label="Total ETH tipped"  value={tips ? `${totalTipped} ETH` : "—"} />
          <StatCard label="Highest single tip" value={tips && tips.length ? `${highestTip} ETH` : "—"} />
        </div>

        {/* Table */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 overflow-hidden">
          {tipsError ? (
            <div className="flex items-center justify-center py-16 text-zinc-500 text-sm">
              Agent offline — start the agent to view history
            </div>
          ) : !tips ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-700 border-t-[#00C8FF]" />
            </div>
          ) : tips.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-2">
              <p className="text-2xl">🦞</p>
              <p className="text-zinc-400 text-sm text-center">
                No tips fired yet.<br />Start the agent to begin tipping.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800 hover:bg-transparent">
                  <TableHead className="text-zinc-400 w-44">Time</TableHead>
                  <TableHead className="text-zinc-400 w-36">Event Type</TableHead>
                  <TableHead className="text-zinc-400">Reason</TableHead>
                  <TableHead className="text-zinc-400 w-32">Amount</TableHead>
                  <TableHead className="text-zinc-400 w-16">Asset</TableHead>
                  <TableHead className="text-zinc-400 w-20">Confidence</TableHead>
                  <TableHead className="text-zinc-400 w-28">Tx Hash</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tips.map((tip) => (
                  <TableRow key={tip.id} className="border-zinc-800 hover:bg-zinc-800/40">
                    <TableCell className="font-mono text-xs text-zinc-400 whitespace-nowrap">
                      {new Date(tip.timestamp).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <EventBadge type={tip.eventType} />
                    </TableCell>
                    <TableCell className="text-sm text-zinc-300 max-w-48 truncate">
                      {tip.reason}
                    </TableCell>
                    <TableCell className="font-mono text-sm text-[#00C8FF]">
                      {tip.amount}
                    </TableCell>
                    <TableCell className="text-xs text-zinc-500">
                      {tip.asset}
                    </TableCell>
                    <TableCell>
                      <Confidence value={tip.confidence} />
                    </TableCell>
                    <TableCell className="font-mono text-xs text-zinc-400">
                      {tip.txHash ? (
                        <a
                          href={getExplorerUrl(tip.txHash, network)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-white transition-colors"
                        >
                          {formatHash(tip.txHash)}
                        </a>
                      ) : (
                        <span className="text-zinc-600">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  )
}
