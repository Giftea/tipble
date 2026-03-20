"use client"

import { useEffect, useState } from "react"
import useSWR from "swr"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Separator } from "@/components/ui/separator"
import type { TipbleConfig } from "@/types"

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error("offline")
    return r.json()
  })

const NETWORKS = ["sepolia", "polygon", "ethereum", "bitcoin"] as const

interface FormState {
  seedPhrase: string
  network: string
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

export default function SettingsPage() {
  const { data: config, error: configError, mutate } = useSWR<TipbleConfig>("/api/config", fetcher)

  const [form, setForm] = useState<FormState | null>(null)
  const [saving, setSaving] = useState(false)
  const [generateLoading, setGenerateLoading] = useState(false)
  const [generatedWallet, setGeneratedWallet] = useState<{
    seedPhrase: string
    address: string
  } | null>(null)
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false)

  useEffect(() => {
    if (config && !form) {
      setForm({
        seedPhrase: "",
        network: config.agent.network,
        maxTipPerEvent: config.budget.maxTipPerEvent,
        dailyLimitUsdt: config.budget.dailyLimitUsdt,
        sessionLimitUsdt: config.budget.sessionLimitUsdt,
        creatorWalletAddress: config.creator.walletAddress,
        displayName: config.creator.displayName,
        autoTipping: !config.agent.demoMode,
        notifications: true,
        demoMode: config.agent.demoMode,
        anthropicApiKey: config.agent.anthropicApiKey ?? "",
        llmEnabled: config.agent.llmEnabled,
        llmConfidenceThreshold: String(config.agent.llmConfidenceThreshold),
      })
    }
  }, [config, form])

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  async function handleSave() {
    if (!form) return
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
          ...(config?.agent ?? {
            heartbeatMs: 5000,
            llmConfidenceThreshold: 0.7,
          }),
          network: form.network,
          demoMode: form.demoMode,
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
      toast.success("Settings saved")
    } catch {
      toast.error("Failed to save settings")
    } finally {
      setSaving(false)
    }
  }

  async function handleGenerateWallet() {
    setGenerateLoading(true)
    try {
      const res = await fetch("/api/wallet/generate", { method: "POST" })
      if (!res.ok) throw new Error("Failed to generate wallet")
      const data = await res.json()
      setGeneratedWallet(data)
    } catch {
      toast.error("Failed to generate wallet")
    } finally {
      setGenerateLoading(false)
    }
  }

  async function handleSaveSeedPhrase() {
    if (!form?.seedPhrase) return
    try {
      const res = await fetch("/api/wallet/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seedPhrase: form.seedPhrase }),
      })
      const data = await res.json()
      toast.success(data.message ?? "Seed phrase saved")
    } catch {
      toast.error("Failed to save seed phrase")
    }
  }

  async function handleReset() {
    setResetConfirmOpen(false)
    try {
      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rules: config?.rules,
          budget: { maxTipPerEvent: "0.001", dailyLimitUsdt: "10", sessionLimitUsdt: "5" },
          agent: {
            heartbeatMs: 5000,
            demoMode: true,
            network: "sepolia",
            llmEnabled: false,
            llmConfidenceThreshold: 0.7,
          },
        }),
      })
      if (!res.ok) throw new Error()
      await mutate()
      setForm(null)
      toast.success("Config reset to defaults")
    } catch {
      toast.error("Reset failed")
    }
  }

  if (configError) {
    return (
      <div>
        <div className="border-b border-zinc-800 px-6 py-5">
          <h1 className="text-2xl font-medium text-white">Settings</h1>
          <p className="text-sm text-zinc-400 mt-0.5">Configure your agent</p>
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
          <p className="text-sm text-zinc-400 mt-0.5">Configure your agent</p>
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
          <p className="text-sm text-zinc-400 mt-0.5">Configure your agent</p>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving}
          style={{ backgroundColor: "#5dcaa5" }}
          className="text-zinc-950 font-semibold hover:opacity-90 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Save Settings
        </Button>
      </div>

    <div className="px-6 py-6 max-w-2xl mx-auto space-y-6 pb-6">

      {/* 1. WALLET SETUP */}
      <section className={sectionClass()}>
        <div className="px-5 py-4 border-b border-zinc-800">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
            Wallet Setup
          </p>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-zinc-300">Seed Phrase</Label>
            <textarea
              value={form.seedPhrase}
              onChange={(e) => set("seedPhrase", e.target.value)}
              placeholder="Enter your seed phrase or generate a new one..."
              rows={3}
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder:text-zinc-500 font-mono resize-none focus:outline-none focus:ring-1 focus:ring-[#5dcaa5]"
              style={{ WebkitTextSecurity: "disc" } as React.CSSProperties}
            />
            <p className="text-xs text-zinc-500">Never share your seed phrase with anyone</p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleGenerateWallet}
              disabled={generateLoading}
              className="border-zinc-700 bg-zinc-800 text-zinc-200 hover:bg-zinc-700 hover:text-white"
            >
              {generateLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Generate New Wallet
            </Button>
            <Button
              onClick={handleSaveSeedPhrase}
              disabled={!form.seedPhrase}
              style={{ backgroundColor: "#5dcaa5" }}
              className="text-zinc-950 font-semibold hover:opacity-90 disabled:opacity-40"
            >
              Save Seed Phrase
            </Button>
          </div>

          <Separator className="bg-zinc-800" />

          <div className="space-y-2">
            <Label className="text-zinc-300">Network</Label>
            <div className="grid grid-cols-2 gap-2">
              {NETWORKS.map((n) => (
                <button
                  key={n}
                  onClick={() => set("network", n)}
                  className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
                    form.network === n
                      ? "border-[#5dcaa5] bg-[#5dcaa5]/10 text-[#5dcaa5]"
                      : "border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600"
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      form.network === n ? "bg-[#5dcaa5]" : "bg-zinc-600"
                    }`}
                  />
                  <span className="capitalize">{n}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 2. SPENDING LIMITS */}
      <section className={sectionClass()}>
        <div className="px-5 py-4 border-b border-zinc-800">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
            Spending Limits
          </p>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-zinc-300">Max Tip Per Event ($)</Label>
            <Input
              value={form.maxTipPerEvent}
              onChange={(e) => set("maxTipPerEvent", e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-white"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-zinc-300">Daily Limit ($)</Label>
            <Input
              value={form.dailyLimitUsdt}
              onChange={(e) => set("dailyLimitUsdt", e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-white"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-zinc-300">Session Limit ($)</Label>
            <Input
              value={form.sessionLimitUsdt}
              onChange={(e) => set("sessionLimitUsdt", e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-white"
            />
          </div>
        </div>
      </section>

      {/* 3. CREATOR */}
      <section className={sectionClass()}>
        <div className="px-5 py-4 border-b border-zinc-800">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
            Creator
          </p>
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

      {/* 4. PREFERENCES */}
      <section className={sectionClass()}>
        <div className="px-5 py-4 border-b border-zinc-800">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
            Preferences
          </p>
        </div>
        <div className="px-5 py-4 space-y-4">
          {(
            [
              {
                label: "Enable Auto-Tipping",
                checked: form.autoTipping,
                onChange: (v: boolean) => {
                  set("autoTipping", v)
                  set("demoMode", !v)
                },
              },
              {
                label: "Show Tip Notifications",
                checked: form.notifications,
                onChange: (v: boolean) => set("notifications", v),
              },
              {
                label: "Demo Mode",
                checked: form.demoMode,
                onChange: (v: boolean) => {
                  set("demoMode", v)
                  set("autoTipping", !v)
                },
              },
            ] as { label: string; checked: boolean; onChange: (v: boolean) => void }[]
          ).map(({ label, checked, onChange }) => (
            <div key={label} className="flex items-center justify-between">
              <Label className="text-zinc-300">{label}</Label>
              <Switch
                checked={checked}
                onCheckedChange={onChange}
                className="data-[state=checked]:bg-[#5dcaa5]"
              />
            </div>
          ))}
        </div>
      </section>

      {/* 5. AI AGENT */}
      <section className={sectionClass()}>
        <div className="px-5 py-4 border-b border-zinc-800">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
            AI Agent
            <span className="ml-2 text-zinc-600 normal-case font-normal tracking-normal">
              Optional
            </span>
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
              className="data-[state=checked]:bg-[#5dcaa5]"
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

      {/* 6. DANGER ZONE */}
      <section className={sectionClass(true)}>
        <div className="px-5 py-4 border-b border-red-800/60">
          <p className="text-xs font-semibold text-red-400 uppercase tracking-widest">
            Danger Zone
          </p>
        </div>
        <div className="px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-300 font-medium">Reset All Data</p>
              <p className="text-xs text-zinc-500 mt-0.5">
                Clears tip history and resets config. Wallet data is preserved.
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

      {/* Generated wallet dialog */}
      <Dialog open={!!generatedWallet} onOpenChange={() => setGeneratedWallet(null)}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">New Wallet Generated</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <p className="text-xs text-zinc-400 uppercase tracking-wide">Address</p>
              <p className="font-mono text-sm text-[#5dcaa5] break-all">
                {generatedWallet?.address}
              </p>
            </div>
            <div className="space-y-1.5">
              <p className="text-xs text-zinc-400 uppercase tracking-wide">Seed Phrase</p>
              <p className="font-mono text-sm text-white bg-zinc-800 rounded-md px-3 py-2 wrap-break-word">
                {generatedWallet?.seedPhrase}
              </p>
              <p className="text-xs text-zinc-500">
                Copy this seed phrase and store it safely. It will not be shown again.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                if (generatedWallet) set("seedPhrase", generatedWallet.seedPhrase)
                setGeneratedWallet(null)
              }}
              style={{ backgroundColor: "#5dcaa5" }}
              className="text-zinc-950 font-semibold hover:opacity-90"
            >
              Use This Wallet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
            <Button
              onClick={handleReset}
              className="bg-red-700 text-white hover:bg-red-600"
            >
              Reset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </div>
  )
}
