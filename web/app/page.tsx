"use client"

import { useState, useEffect } from "react"
import useSWR from "swr"
import type { AgentStatus } from "@/types"
import MetricCard from "@/components/MetricCard"
import ActivityFeed from "@/components/ActivityFeed"
import AgentLog from "@/components/AgentLog"
import { formatEth } from "@/lib/utils"
import { SEED_KEY, DEMO_KEY, ADDR_KEY, getSeedPhrase } from "@/lib/api"

// ── Seed-aware SWR fetcher ────────────────────────────────────
const fetcher = async (url: string) => {
  const seed = getSeedPhrase()
  const res = await fetch(url, { headers: seed ? { "x-seed-phrase": seed } : {} })
  if (!res.ok) throw new Error("offline")
  return res.json()
}

// ── Utilities ─────────────────────────────────────────────────
function getInitials(name: string): string {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
}

function truncateAddress(addr: string): string {
  if (!addr) return ""
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-zinc-800 ${className ?? ""}`} />
}

const STATE_BADGE: Record<string, { label: string; color: string; bg: string; border: string; pulse?: boolean }> = {
  idle:    { label: "Idle",   color: "#71717a", bg: "rgba(113,113,122,0.1)", border: "rgba(113,113,122,0.3)" },
  running: { label: "Live",   color: "#4ade80", bg: "rgba(34,197,94,0.1)",  border: "rgba(34,197,94,0.3)",  pulse: true },
  demo:    { label: "Demo",   color: "#fbbf24", bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.3)" },
  paused:  { label: "Paused", color: "#60a5fa", bg: "rgba(59,130,246,0.1)", border: "rgba(59,130,246,0.3)" },
}

function formatUsdt(balance: string): string {
  return parseFloat(balance).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ── Wallet connect modal ──────────────────────────────────────
type WalletStep = "select" | "seed-reveal" | "import"

function WalletModal({ onConnected }: { onConnected: () => void }) {
  const [step, setStep] = useState<WalletStep>("select")
  const [generatedSeed, setGeneratedSeed] = useState("")
  const [generatedAddress, setGeneratedAddress] = useState("")
  const [importPhrase, setImportPhrase] = useState("")
  const [importError, setImportError] = useState("")
  const [generating, setGenerating] = useState(false)
  const [validating, setValidating] = useState(false)
  const [copied, setCopied] = useState(false)

  async function handleGenerate() {
    setGenerating(true)
    try {
      const res = await fetch("/api/wallet/generate", { method: "POST" })
      const data = await res.json() as { seedPhrase: string; address: string }
      setGeneratedSeed(data.seedPhrase)
      setGeneratedAddress(data.address)
      setStep("seed-reveal")
    } finally {
      setGenerating(false)
    }
  }

  function confirmSeed() {
    localStorage.setItem(SEED_KEY, generatedSeed)
    localStorage.setItem(ADDR_KEY, generatedAddress)
    onConnected()
  }

  async function handleValidate() {
    const phrase = importPhrase.trim()
    if (!phrase) return
    setValidating(true)
    setImportError("")
    try {
      const res = await fetch("/api/wallet/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seedPhrase: phrase }),
      })
      const data = await res.json() as { valid: boolean; address?: string; error?: string }
      if (data.valid) {
        localStorage.setItem(SEED_KEY, phrase)
        if (data.address) localStorage.setItem(ADDR_KEY, data.address)
        onConnected()
      } else {
        setImportError(data.error ?? "Invalid seed phrase")
      }
    } catch {
      setImportError("Validation failed — is the agent running?")
    } finally {
      setValidating(false)
    }
  }

  function handleDemo() {
    localStorage.setItem(DEMO_KEY, "1")
    localStorage.removeItem(ADDR_KEY)
    onConnected()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md space-y-6 p-8">

        {/* Select step */}
        {step === "select" && (
          <>
            <div className="text-center space-y-2">
              <p className="text-4xl">🦞</p>
              <h2 className="text-xl font-semibold text-white">Welcome to Tipble</h2>
              <p className="text-sm text-zinc-400">Connect your wallet to get started</p>
            </div>
            <div className="space-y-3">
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="w-full py-3 rounded-lg text-sm font-semibold transition-all hover:brightness-110 disabled:opacity-50"
                style={{ background: "rgba(0,200,255,0.15)", color: "#00C8FF", border: "1px solid rgba(0,200,255,0.3)" }}
              >
                {generating ? "Generating…" : "Generate New Wallet"}
              </button>
              <button
                onClick={() => setStep("import")}
                className="w-full py-3 rounded-lg text-sm font-semibold transition-all hover:brightness-110"
                style={{ background: "rgba(113,113,122,0.15)", color: "#a1a1aa", border: "1px solid rgba(113,113,122,0.3)" }}
              >
                Import Existing Wallet
              </button>
              <button
                onClick={handleDemo}
                className="w-full py-2 rounded-lg text-xs font-medium text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                Use Demo Wallet
              </button>
            </div>
          </>
        )}

        {/* Seed reveal step */}
        {step === "seed-reveal" && (
          <>
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-white">Save Your Seed Phrase</h2>
              <p className="text-xs text-zinc-400">Write this down. You cannot recover your wallet without it.</p>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 space-y-3">
              <p className="font-mono text-sm text-amber-200 break-all leading-relaxed">{generatedSeed}</p>
              <p className="font-mono text-xs text-zinc-500">{generatedAddress}</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { navigator.clipboard.writeText(generatedSeed); setCopied(true) }}
                className="flex-1 py-2 rounded-lg text-xs font-medium transition-colors"
                style={{ background: "rgba(113,113,122,0.15)", color: copied ? "#4ade80" : "#a1a1aa", border: "1px solid rgba(113,113,122,0.3)" }}
              >
                {copied ? "Copied!" : "Copy"}
              </button>
              <button
                onClick={confirmSeed}
                className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all hover:brightness-110"
                style={{ background: "rgba(0,200,255,0.15)", color: "#00C8FF", border: "1px solid rgba(0,200,255,0.3)" }}
              >
                I&apos;ve saved it — Continue
              </button>
            </div>
          </>
        )}

        {/* Import step */}
        {step === "import" && (
          <>
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-white">Import Wallet</h2>
              <p className="text-xs text-zinc-400">Enter your 12 or 24 word seed phrase</p>
            </div>
            <textarea
              value={importPhrase}
              onChange={(e) => { setImportPhrase(e.target.value); setImportError("") }}
              placeholder="word1 word2 word3 …"
              rows={4}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-600 font-mono focus:outline-none focus:border-[#00C8FF] resize-none"
            />
            {importError && (
              <p className="text-xs text-red-400">{importError}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setStep("select")}
                className="px-4 py-2 rounded-lg text-xs font-medium text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleValidate}
                disabled={validating || !importPhrase.trim()}
                className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all hover:brightness-110 disabled:opacity-50"
                style={{ background: "rgba(0,200,255,0.15)", color: "#00C8FF", border: "1px solid rgba(0,200,255,0.3)" }}
              >
                {validating ? "Validating…" : "Connect Wallet"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────
export default function DashboardPage() {
  // null = not yet checked, false = show modal, true = ready
  const [walletReady, setWalletReady] = useState<boolean | null>(null)
  const [isDemoMode, setIsDemoMode] = useState(false)
  const [cacheKey, setCacheKey] = useState<string | null>(null)

  useEffect(() => {
    const seed = localStorage.getItem(SEED_KEY)
    const demo = localStorage.getItem(DEMO_KEY)
    setIsDemoMode(!!demo)
    // Derive a per-account cache key so SWR never serves one user's
    // cached data to another user sharing the same browser.
    const addr = localStorage.getItem(ADDR_KEY)
    setCacheKey(addr ?? (demo ? 'demo' : null))
    setWalletReady(!!(seed || demo))
  }, [])

  const { data, error, mutate } = useSWR<AgentStatus>(
    walletReady && cacheKey ? `/api/status?_=${cacheKey}` : null,
    fetcher,
    { refreshInterval: 3000 }
  )
  const { data: usdtData } = useSWR<{ balance: string; asset: string }>(
    walletReady && cacheKey ? `/api/wallet/usdt-balance?_=${cacheKey}` : null,
    fetcher,
    { refreshInterval: 3000 }
  )

  const [activeTab, setActiveTab] = useState<"activity" | "log">("activity")
  const [controlling, setControlling] = useState(false)

  function handleConnected() {
    const demo = !!localStorage.getItem(DEMO_KEY)
    setIsDemoMode(demo)
    const addr = localStorage.getItem(ADDR_KEY)
    setCacheKey(addr ?? (demo ? 'demo' : null))
    setWalletReady(true)
    mutate()
  }

  const isOffline = !!error
  const isLoading = !data && !error

  const agentState = data?.agentState ?? "idle"
  const stateBadge = STATE_BADGE[agentState] ?? STATE_BADGE.idle

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

  // Still checking localStorage
  if (walletReady === null) return null

  return (
    <div>
      {/* Wallet connect modal */}
      {!walletReady && <WalletModal onConnected={handleConnected} />}

      {/* Demo mode banner */}
      {isDemoMode && (
        <div className="border-b border-amber-500/30 bg-amber-500/10 px-6 py-2 flex items-center justify-between">
          <p className="text-amber-300 text-xs font-medium">Using demo wallet — tips use the server&apos;s default funds</p>
          <button
            onClick={() => { localStorage.removeItem(DEMO_KEY); setWalletReady(false); setIsDemoMode(false) }}
            className="text-xs text-amber-400 hover:text-amber-200 transition-colors"
          >
            Connect own wallet
          </button>
        </div>
      )}

      {/* Page header */}
      <div className="border-b border-zinc-800 px-6 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-medium text-white">Dashboard</h1>
          <p className="text-sm text-zinc-400 mt-0.5">Monitor your agent activity</p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border"
            style={{ color: stateBadge.color, background: stateBadge.bg, borderColor: stateBadge.border }}
          >
            {stateBadge.pulse && (
              <span className="inline-block w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: stateBadge.color }} />
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


          {/* Metric cards */}
          {isLoading ? (
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <MetricCard label="Balance" value={usdtData?.balance ? `${formatUsdt(usdtData.balance)} USDT` : "—"} subColor="green" />
              <MetricCard label="Tips Sent" value={String(tipsCount)} subColor="green" />
              <MetricCard label="Total Tipped" value={`${formatUsdt(data!.totalTipped)} USDT`} subColor="green" />
              <MetricCard label="Success Rate" value={evtCount > 0 ? `${successRate}%` : "—"} subColor={successRate >= 50 ? "green" : "amber"} />
              <MetricCard label="Avg Confidence" value={avgConf} />
            </div>
          )}

          {/* Main content + controls */}
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
                <div className="flex gap-1 border-b border-zinc-800 mb-4">
                  {(["activity", "log"] as const).map((tab) => (
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
                  <ActivityFeed tips={data?.recentTips ?? []} network={data?.network ?? "base"} />
                ) : (
                  <AgentLog
                    entries={agentLogEntries}
                    onClear={async () => {
                      await fetch("/api/agent/log/clear", { method: "POST" })
                      await mutate()
                    }}
                  />
                )}
              </div>

              {/* Right controls panel */}
              <div className="w-70 shrink-0 space-y-4">
                {/* Controls card */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-3">
                  <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Controls</h3>
                  {isIdle && (
                    <>
                      <button
                        onClick={() => control("start")}
                        disabled={controlling}
                        className="w-full py-2 rounded-lg text-sm font-semibold transition-all hover:brightness-110 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                        style={{ background: "rgba(34,197,94,0.15)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.3)" }}
                      >
                        Start Agent
                      </button>
                      <button
                        onClick={() => control("demo")}
                        disabled={controlling}
                        className="w-full py-2 rounded-lg text-sm font-semibold transition-all hover:brightness-110 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
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
                      className="w-full py-2 rounded-lg text-sm font-semibold transition-all hover:brightness-110 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                      style={{ background: "transparent", color: "#f87171", border: "1px solid rgba(248,113,113,0.4)" }}
                    >
                      Stop
                    </button>
                  )}
                  <button
                    onClick={() => control("demo", { single: true })}
                    disabled={controlling}
                    className="w-full py-2 rounded-lg text-sm font-medium transition-all hover:brightness-110 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                    style={{ background: "rgba(113,113,122,0.15)", color: "#a1a1aa", border: "1px solid rgba(113,113,122,0.3)" }}
                  >
                    Test Event
                  </button>
                </div>

                {/* Wallet card */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-3">
                  <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                    {isDemoMode ? "Demo Wallet" : "My Wallet"}
                  </h3>
                  {usdtData?.balance ? (
                    <p className="text-2xl font-bold tabular-nums" style={{ color: "#4ade80" }}>
                      {formatUsdt(usdtData.balance)} USDT
                    </p>
                  ) : (
                    <p className="text-2xl font-bold text-white tabular-nums">— USDT</p>
                  )}
                  <p className="text-xs text-zinc-600 tabular-nums">{formatEth(data!.balance)} gas</p>
                  <p className="font-mono text-xs text-zinc-500">{truncateAddress(data!.agentAddress)}</p>
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
