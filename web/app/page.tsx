"use client"

import useSWR from "swr"
import type { AgentStatus } from "@/types"
import MetricCard from "@/components/MetricCard"
import TipTable from "@/components/TipTable"
import AgentLog from "@/components/AgentLog"
import ManualTipButton from "@/components/ManualTipButton"
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

export default function DashboardPage() {
  const { data, error } = useSWR<AgentStatus>("/api/status", fetcher, {
    refreshInterval: 5000,
  })

  const isOffline = !!error
  const isLoading = !data && !error

  return (
    <div>
      {/* Page header */}
      <div className="border-b border-zinc-800 px-6 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-medium text-white">Dashboard</h1>
          <p className="text-sm text-zinc-400 mt-0.5">Monitor your agent activity</p>
        </div>
        <ManualTipButton />
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
                <>
                  <span
                    className="text-xs font-medium px-2 py-0.5 rounded-full border"
                    style={
                      data!.network === "sepolia"
                        ? {
                            color: "#5dcaa5",
                            borderColor: "#5dcaa5",
                            backgroundColor: "rgba(93,202,165,0.08)",
                          }
                        : {
                            color: "#EF9F27",
                            borderColor: "#EF9F27",
                            backgroundColor: "rgba(239,159,39,0.08)",
                          }
                    }
                  >
                    {data!.network}
                  </span>
                  {data!.demoMode && (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full border border-zinc-600 text-zinc-400">
                      demo
                    </span>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Metrics row */}
          {isLoading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                label="Tips fired"
                value={String(data!.tipsCount)}
                sub={`${data!.tipsCount === 1 ? "tip" : "tips"} sent`}
                subColor="green"
              />
              <MetricCard
                label="Total tipped"
                value={`${data!.totalTipped} ETH`}
                subColor="green"
              />
              <MetricCard
                label="Agent wallet"
                value={formatEth(data!.balance)}
                sub={truncateAddress(data!.agentAddress)}
              />
              <MetricCard
                label="Network"
                value={data!.network}
                subColor={data!.network === "sepolia" ? "green" : "amber"}
              />
            </div>
          )}

          {/* Two-column layout */}
          {isLoading ? (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              <div className="lg:col-span-3 space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-48 rounded-lg" />
              </div>
              <div className="lg:col-span-2 space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-50 rounded-lg" />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              <div className="lg:col-span-3">
                <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-3">
                  Recent tips
                </h2>
                <div className="rounded-lg border border-zinc-800 bg-zinc-900 overflow-hidden">
                  <TipTable tips={data!.recentTips} network={data!.network} />
                </div>
              </div>
              <div className="lg:col-span-2">
                <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-3">
                  Agent log
                </h2>
                <AgentLog tips={data!.recentTips} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
