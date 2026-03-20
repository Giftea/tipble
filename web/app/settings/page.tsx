"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import useSWR from "swr"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import type { TipbleConfig } from "@/types"

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error("offline")
    return r.json()
  })

interface AgentStatusData {
  paused: boolean
  autoTippingEnabled: boolean
}

interface FormState {
  maxTipPerEvent: string
  dailyLimitUsdt: string
  sessionLimitUsdt: string
  creatorWalletAddress: string
  displayName: string
  autoTipping: boolean
  notifications: boolean
  demoMode: boolean
  anthropicApiKey: string
  llmEnabled: boolean
  llmConfidenceThreshold: string
}

function sectionClass(danger = false) {
  return `bg-zinc-900 border ${danger ? "border-red-800" : "border-zinc-800"} rounded-lg`
}

function validate(form: FormState): string | null {
  const addr = form.creatorWalletAddress.trim()
  if (addr && (!/^0x/.test(addr) || addr.length !== 42)) {
    return "Creator wallet address must start with 0x and be 42 characters"
  }
  const conf = parseFloat(form.llmConfidenceThreshold)
  if (isNaN(conf) || conf < 0 || conf > 1) {
    return "Confidence threshold must be a number between 0 and 1"
  }
  for (const [label, val] of [
    ["Max tip per event", form.maxTipPerEvent],
    ["Daily limit", form.dailyLimitUsdt],
    ["Session limit", form.sessionLimitUsdt],
  ] as [string, string][]) {
    const n = parseFloat(val)
    if (isNaN(n) || n <= 0) return `${label} must be a positive number`
  }
  return null
}

export default function SettingsPage() {
  const router = useRouter()
  const { data: config, error: configError, mutate } = useSWR<TipbleConfig>("/api/config", fetcher)
  const { data: agentStatus } = useSWR<AgentStatusData>("/api/agent/status", fetcher)

  const [form, setForm] = useState<FormState | null>(null)
  const [saving, setSaving] = useState(false)
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false)

  useEffect(() => {
    if (config && !form) {
      const autoTipping = agentStatus
        ? !agentStatus.paused && agentStatus.autoTippingEnabled
        : !config.agent.demoMode
      setForm({
        maxTipPerEvent: config.budget.maxTipPerEvent,
        dailyLimitUsdt: config.budget.dailyLimitUsdt,
        sessionLimitUsdt: config.budget.sessionLimitUsdt,
        creatorWalletAddress: config.creator.walletAddress,
        displayName: config.creator.displayName,
        autoTipping,
        notifications: true,
        demoMode: config.agent.demoMode,
        anthropicApiKey: config.agent.anthropicApiKey ?? "",
        llmEnabled: config.agent.llmEnabled,
        llmConfidenceThreshold: String(config.agent.llmConfidenceThreshold),
      })
    }
  }, [config, agentStatus, form])

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  async function handleAutoTippingToggle(enabled: boolean) {
    set("autoTipping", enabled)
    set("demoMode", !enabled)
    try {
      await fetch(enabled ? "/api/agent/resume" : "/api/agent/pause", { method: "POST" })
    } catch {
      // silent — will still be saved via config
    }
  }

  async function handleSave() {
    if (!form) return
    const err = validate(form)
    if (err) { toast.error(err); return }
    setSaving(true)
    try {
      const payload: Partial<TipbleConfig> = {
        creator: {
          walletAddress: form.creatorWalletAddress,
          displayName: form.displayName,
        },
        budget: {
          maxTipPerEvent: form.maxTipPerEvent,
          dailyLimitUsdt: form.dailyLimitUsdt,
          sessionLimitUsdt: form.sessionLimitUsdt,
        },
        agent: {
          ...(config?.agent ?? { heartbeatMs: 5000, network: "sepolia" }),
          demoMode: form.demoMode,
          autoTippingEnabled: form.autoTipping,
          llmEnabled: form.llmEnabled,
          llmConfidenceThreshold: parseFloat(form.llmConfidenceThreshold) || 0.7,
          anthropicApiKey: form.anthropicApiKey || undefined,
        },
      }
      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error("Save failed")
      await mutate()
      toast.success("Settings saved — changes active on next heartbeat")
    } catch {
      toast.error("Failed to save settings")
    } finally {
      setSaving(false)
    }
  }

  async function handleReset() {
    setResetConfirmOpen(false)
    try {
      const res = await fetch("/api/data/reset", { method: "POST" })
      if (!res.ok) throw new Error()
      toast.success("All tip history cleared")
      router.push("/")
    } catch {
      toast.error("Reset failed")
    }
  }

  // ── Render states ──────────────────────────────────────────

  if (configError) {
    return (
      <div>
        <div className="border-b border-zinc-800 px-6 py-5">
          <h1 className="text-2xl font-medium text-white">Settings</h1>
          <p className="text-sm text-zinc-400 mt-0.5">Configure your tipping agent</p>
        </div>
        <div className="p-6 flex justify-center">
          <p className="text-zinc-400 text-sm">Agent offline — start the agent to edit settings</p>
        </div>
      </div>
    )
  }

  if (!form) {
    return (
      <div>
        <div className="border-b border-zinc-800 px-6 py-5">
          <h1 className="text-2xl font-medium text-white">Settings</h1>
          <p className="text-sm text-zinc-400 mt-0.5">Configure your tipping agent</p>
        </div>
        <div className="p-6 flex justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Page header */}
      <div className="border-b border-zinc-800 px-6 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-medium text-white">Settings</h1>
          <p className="text-sm text-zinc-400 mt-0.5">Configure your tipping agent</p>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving}
          style={{ backgroundColor: "#00C8FF" }}
          className="text-zinc-950 font-semibold hover:opacity-90 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Save Settings
        </Button>
      </div>

      <div className="px-6 py-6 max-w-2xl mx-auto space-y-6 pb-6">

        {/* Extension info banner */}
        <div className="bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-sm text-zinc-300">
          🦞 Wallet management is available in the Tipble Chrome Extension. Install it to generate or import your own wallet and tip with your own funds.
        </div>

        {/* 1. SPENDING LIMITS */}
        <section className={sectionClass()}>
          <div className="px-5 py-4 border-b border-zinc-800">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Spending Limits</p>
          </div>
          <div className="px-5 py-4 space-y-4">
            {(
              [
                { label: "Max Tip Per Event ($)", key: "maxTipPerEvent" },
                { label: "Daily Limit ($)", key: "dailyLimitUsdt" },
                { label: "Session Limit ($)", key: "sessionLimitUsdt" },
              ] as { label: string; key: keyof FormState }[]
            ).map(({ label, key }) => (
              <div key={key} className="space-y-1.5">
                <Label className="text-zinc-300">{label}</Label>
                <Input
                  value={form[key] as string}
                  onChange={(e) => set(key, e.target.value)}
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
            ))}
          </div>
        </section>

        {/* 2. CREATOR */}
        <section className={sectionClass()}>
          <div className="px-5 py-4 border-b border-zinc-800">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Creator</p>
          </div>
          <div className="px-5 py-4 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-zinc-300">Creator Wallet Address</Label>
              <Input
                value={form.creatorWalletAddress}
                onChange={(e) => set("creatorWalletAddress", e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-white font-mono"
                placeholder="0x..."
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-zinc-300">Display Name</Label>
              <Input
                value={form.displayName}
                onChange={(e) => set("displayName", e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
          </div>
        </section>

        {/* 3. PREFERENCES */}
        <section className={sectionClass()}>
          <div className="px-5 py-4 border-b border-zinc-800">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Preferences</p>
          </div>
          <div className="px-5 py-4 space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-zinc-300">Enable Auto-Tipping</Label>
              <Switch
                checked={form.autoTipping}
                onCheckedChange={handleAutoTippingToggle}
                className="data-[state=checked]:bg-[#00C8FF]"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-zinc-300">Show Tip Notifications</Label>
              <Switch
                checked={form.notifications}
                onCheckedChange={(v) => set("notifications", v)}
                className="data-[state=checked]:bg-[#00C8FF]"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-zinc-300">Demo Mode</Label>
              <Switch
                checked={form.demoMode}
                onCheckedChange={(v) => { set("demoMode", v); set("autoTipping", !v) }}
                className="data-[state=checked]:bg-[#00C8FF]"
              />
            </div>
          </div>
        </section>

        {/* 4. AI AGENT */}
        <section className={sectionClass()}>
          <div className="px-5 py-4 border-b border-zinc-800">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
              AI Agent
              <span className="ml-2 text-zinc-600 normal-case font-normal tracking-normal">Optional</span>
            </p>
          </div>
          <div className="px-5 py-4 space-y-4">
            <p className="text-xs text-zinc-500">
              Claude AI analyzes stream events and makes smarter tipping decisions
            </p>
            <div className="space-y-1.5">
              <Label className="text-zinc-300">Anthropic API Key</Label>
              <Input
                type="password"
                value={form.anthropicApiKey}
                onChange={(e) => set("anthropicApiKey", e.target.value)}
                placeholder="sk-ant-..."
                className="bg-zinc-800 border-zinc-700 text-white font-mono"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-zinc-300">Enable AI Reasoning</Label>
              <Switch
                checked={form.llmEnabled}
                onCheckedChange={(v) => set("llmEnabled", v)}
                className="data-[state=checked]:bg-[#00C8FF]"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-zinc-300">Confidence Threshold (0–1)</Label>
              <Input
                value={form.llmConfidenceThreshold}
                onChange={(e) => set("llmConfidenceThreshold", e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-white"
                placeholder="0.7"
              />
            </div>
          </div>
        </section>

        {/* 5. DANGER ZONE */}
        <section className={sectionClass(true)}>
          <div className="px-5 py-4 border-b border-red-800/60">
            <p className="text-xs font-semibold text-red-400 uppercase tracking-widest">Danger Zone</p>
          </div>
          <div className="px-5 py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-300 font-medium">Reset All Data</p>
                <p className="text-xs text-zinc-500 mt-0.5">
                  This will clear all tip history and reset config to defaults. Wallet data is preserved.
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => setResetConfirmOpen(true)}
                className="border-red-800 text-red-400 hover:bg-red-900/30 hover:text-red-300"
              >
                Reset
              </Button>
            </div>
          </div>
        </section>

        {/* Footer */}
        <p className="text-center text-xs text-zinc-600">Powered by Tether WDK</p>

        {/* Bottom save button */}
        <Button
          onClick={handleSave}
          disabled={saving}
          style={{ backgroundColor: "#00C8FF" }}
          className="w-full text-zinc-950 font-semibold hover:opacity-90 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Save Settings
        </Button>

        {/* Reset confirmation dialog */}
        <Dialog open={resetConfirmOpen} onOpenChange={setResetConfirmOpen}>
          <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
            <DialogHeader>
              <DialogTitle className="text-white">Reset All Data?</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-zinc-400 py-2">
              This will clear all tip history and reset config to defaults. Wallet data is preserved.
            </p>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setResetConfirmOpen(false)}
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              >
                Cancel
              </Button>
              <Button onClick={handleReset} className="bg-red-700 text-white hover:bg-red-600">
                Reset
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
