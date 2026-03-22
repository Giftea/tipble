"use client"

import { useState } from "react"
import useSWR from "swr"
import type { AgentStatus } from "@/types"
import MetricCard from "@/components/MetricCard"
import ActivityFeed from "@/components/ActivityFeed"
import AgentLog from "@/components/AgentLog"
import { formatEth } from "@/lib/utils"

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error("offline")
    return res.json()
  })

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

function truncateAddress(addr: string): string {
  if (!addr) return ""
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded bg-zinc-800 ${className ?? ""}`} />
  )
}

const STATE_BADGE: Record<string, { label: string; color: string; bg: string; border: string; pulse?: boolean }> = {
  idle:    { label: 'Idle',   color: '#71717a', bg: 'rgba(113,113,122,0.1)', border: 'rgba(113,113,122,0.3)' },
  running: { label: 'Live',   color: '#4ade80', bg: 'rgba(34,197,94,0.1)',   border: 'rgba(34,197,94,0.3)',   pulse: true },
  demo:    { label: 'Demo',   color: '#fbbf24', bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.3)' },
  paused:  { label: 'Paused', color: '#60a5fa', bg: 'rgba(59,130,246,0.1)',  border: 'rgba(59,130,246,0.3)' },
}

function formatUsdt(balance: string): string {
  return parseFloat(balance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function DashboardPage() {
  const { data, error, mutate } = useSWR<AgentStatus>("/api/status", fetcher, {
    refreshInterval: 3000,
  })
  const { data: usdtData } = useSWR<{ balance: string; asset: string }>(
    "/api/wallet/usdt-balance",
    fetcher,
    { refreshInterval: 3000 }
  )

  const [activeTab, setActiveTab] = useState<"activity" | "log">("activity")
  const [controlling, setControlling] = useState(false)

  const isOffline = !!error
  const isLoading = !data && !error

  const agentState = data?.agentState ?? "idle"
  const stateBadge = STATE_BADGE[agentState] ?? STATE_BADGE.idle

  // Derived metrics
  const agentLogEntries = data?.agentLog ?? []
  const evtCount = data?.eventsCount ?? 0
  const tipsCount = data?.tipsCount ?? 0
  const successRate = evtCount > 0 ? Math.round((tipsCount / evtCount) * 100) : 0
  const tips = data?.recentTips ?? []
  const avgConf =
    tips.length > 0
      ? (tips.reduce((s, t) => s + t.confidence, 0) / tips.length).toFixed(2)
      : "—"

  async function control(action: "start" | "demo" | "stop", body?: Record<string, unknown>) {
    setControlling(true)
    try {
      await fetch(`/api/agent/${action}`, {
        method: "POST",
        ...(body ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}),
      })
      await mutate()
    } finally {
      setControlling(false)
    }
  }

  const isIdle = agentState === "idle"
  const isActive = agentState === "running" || agentState === "demo"

  return (
    <div>
      {/* Page header */}
      <div className="border-b border-zinc-800 px-6 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-medium text-white">Dashboard</h1>
          <p className="text-sm text-zinc-400 mt-0.5">Monitor your agent activity</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Agent state badge */}
          <span
            className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border"
            style={{ color: stateBadge.color, background: stateBadge.bg, borderColor: stateBadge.border }}
          >
            {stateBadge.pulse && (
              <span
                className="inline-block w-1.5 h-1.5 rounded-full animate-pulse"
                style={{ background: stateBadge.color }}
              />
            )}
            {stateBadge.label}
          </span>
        </div>
      </div>

      {isOffline ? (
        <div className="flex items-center justify-center py-32">
          <div className="text-center space-y-2">
            <p className="text-2xl">🦞</p>
            <p className="text-zinc-400 text-sm">
              Agent offline — run{" "}
              <code className="font-mono text-zinc-300">npm run dev</code> in the{" "}
              <code className="font-mono text-zinc-300">agent/</code> directory
            </p>
          </div>
        </div>
      ) : (
        <div className="p-6 space-y-6">
          {/* Creator bar */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isLoading ? (
                <>
                  <Skeleton className="h-9 w-9 rounded-full" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </>
              ) : (
                <>
                  <div className="h-9 w-9 rounded-full bg-zinc-700 flex items-center justify-center text-sm font-semibold text-white">
                    {getInitials(data!.creator.displayName)}
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium leading-none">
                      {data!.creator.displayName}
                    </p>
                    <p className="text-zinc-400 text-xs mt-0.5 font-mono">
                      {truncateAddress(data!.creator.walletAddress)}
                    </p>
                  </div>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              {isLoading ? (
                <Skeleton className="h-5 w-20" />
              ) : (
                <span
                  className="text-xs font-medium px-2 py-0.5 rounded-full border"
                  style={
                    data!.network === "sepolia"
                      ? { color: "#00C8FF", borderColor: "#00C8FF", backgroundColor: "rgba(0,200,255,0.08)" }
                      : { color: "#EF9F27", borderColor: "#EF9F27", backgroundColor: "rgba(239,159,39,0.08)" }
                  }
                >
                  {data!.network}
                </span>
              )}
            </div>
          </div>

          {/* 5 Metric cards */}
          {isLoading ? (
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <MetricCard label="Events" value={String(evtCount)} />
              <MetricCard
                label="Tips Sent"
                value={String(tipsCount)}
                subColor="green"
              />
              <MetricCard
                label="Total Tipped"
                value={`${formatUsdt(data!.totalTipped)} USDT`}
                subColor="green"
              />
              <MetricCard
                label="Success Rate"
                value={evtCount > 0 ? `${successRate}%` : "—"}
                subColor={successRate >= 50 ? "green" : "amber"}
              />
              <MetricCard label="Avg Confidence" value={avgConf} />
            </div>
          )}

          {/* Main content + right controls panel */}
          {isLoading ? (
            <div className="flex gap-6">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-8 w-48 rounded" />
                <Skeleton className="h-64 rounded-lg" />
              </div>
              <div className="w-70 shrink-0 space-y-3">
                <Skeleton className="h-40 rounded-lg" />
                <Skeleton className="h-32 rounded-lg" />
              </div>
            </div>
          ) : (
            <div className="flex gap-6 items-start">
              {/* Tabbed content */}
              <div className="flex-1 min-w-0">
                {/* Tab nav */}
                <div className="flex gap-1 border-b border-zinc-800 mb-4">
                  {(["activity", "log"] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className="px-4 py-2 text-sm font-medium capitalize transition-colors"
                      style={
                        activeTab === tab
                          ? { color: "#00C8FF", borderBottom: "2px solid #00C8FF" }
                          : { color: "#71717a", borderBottom: "2px solid transparent" }
                      }
                    >
                      {tab === "activity" ? "Activity" : "Agent Log"}
                    </button>
                  ))}
                </div>

                {activeTab === "activity" ? (
                  <ActivityFeed tips={data?.recentTips ?? []} network={data?.network ?? "sepolia"} />
                ) : (
                  <AgentLog entries={agentLogEntries} onClear={async () => {
                    await fetch("/api/agent/log/clear", { method: "POST" })
                    await mutate()
                  }} />
                )}
              </div>

              {/* Right controls panel */}
              <div className="w-70 shrink-0 space-y-4">
                {/* Controls card */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-3">
                  <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                    Controls
                  </h3>

                  {isIdle && (
                    <>
                      <button
                        onClick={() => control("start")}
                        disabled={controlling}
                        className="w-full py-2 rounded-lg text-sm font-semibold transition-all hover:brightness-110 disabled:opacity-50 disabled:hover:brightness-100 cursor-pointer disabled:cursor-not-allowed"
                        style={{ background: "rgba(34,197,94,0.15)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.3)" }}
                      >
                        Start Agent
                      </button>
                      <button
                        onClick={() => control("demo")}
                        disabled={controlling}
                        className="w-full py-2 rounded-lg text-sm font-semibold transition-all hover:brightness-110 disabled:opacity-50 disabled:hover:brightness-100 cursor-pointer disabled:cursor-not-allowed"
                        style={{ background: "rgba(245,158,11,0.15)", color: "#fbbf24", border: "1px solid rgba(245,158,11,0.3)" }}
                      >
                        Run Demo
                      </button>
                    </>
                  )}

                  {isActive && (
                    <button
                      onClick={() => control("stop")}
                      disabled={controlling}
                      className="w-full py-2 rounded-lg text-sm font-semibold transition-all hover:brightness-110 disabled:opacity-50 disabled:hover:brightness-100 cursor-pointer disabled:cursor-not-allowed"
                      style={{ background: "transparent", color: "#f87171", border: "1px solid rgba(248,113,113,0.4)" }}
                    >
                      Stop
                    </button>
                  )}

                  <button
                    onClick={() => control("demo", { single: true })}
                    disabled={controlling}
                    className="w-full py-2 rounded-lg text-sm font-medium transition-all hover:brightness-110 disabled:opacity-50 disabled:hover:brightness-100 cursor-pointer disabled:cursor-not-allowed"
                    style={{ background: "rgba(113,113,122,0.15)", color: "#a1a1aa", border: "1px solid rgba(113,113,122,0.3)" }}
                  >
                    Test Event
                  </button>
                </div>

                {/* Agent Wallet card */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-3">
                  <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                    Agent Wallet
                  </h3>
                  {usdtData?.balance ? (
                    <p className="text-2xl font-bold tabular-nums" style={{ color: '#4ade80' }}>
                      {formatUsdt(usdtData.balance)} USDT
                    </p>
                  ) : (
                    <p className="text-2xl font-bold text-white tabular-nums">— USDT</p>
                  )}
                  <p className="text-xs text-zinc-600 tabular-nums">
                    {formatEth(data!.balance)} gas
                  </p>
                  <p className="font-mono text-xs text-zinc-500">
                    {truncateAddress(data!.agentAddress)}
                  </p>
                  <span
                    className="inline-block text-xs font-medium px-2 py-0.5 rounded-full border"
                    style={
                      data!.network === "sepolia"
                        ? { color: "#00C8FF", borderColor: "#00C8FF", backgroundColor: "rgba(0,200,255,0.08)" }
                        : { color: "#EF9F27", borderColor: "#EF9F27", backgroundColor: "rgba(239,159,39,0.08)" }
                    }
                  >
                    {data!.network}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
