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
import { SEED_KEY, DEMO_KEY, ADDR_KEY } from "@/lib/api"

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
  autoTipping: boolean
  notifications: boolean
  demoMode: boolean
}

function sectionClass(danger = false) {
  return `bg-zinc-900 border ${danger ? "border-red-800" : "border-zinc-800"} rounded-lg`
}

function validate(form: FormState): string | null {
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

// ── Wallet Section ─────────────────────────────────────────────────────────────

function WalletSection({ seedKey, demoKey, addrKey }: { seedKey: string; demoKey: string; addrKey: string }) {
  const [address, setAddress] = useState<string | null>(null)
  const [step, setStep] = useState<"idle" | "seed-reveal" | "import">("idle")
  const [generatedSeed, setGeneratedSeed] = useState<string | null>(null)
  const [importText, setImportText] = useState("")
  const [importError, setImportError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const seed = localStorage.getItem(seedKey)
    if (seed) {
      fetch("/api/wallet/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seedPhrase: seed }),
      })
        .then((r) => r.json())
        .then((d) => { if (d.valid && d.address) setAddress(d.address) })
        .catch(() => {})
    }
  }, [seedKey])

  function copy(text: string) {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  async function handleGenerate() {
    setLoading(true)
    setImportError(null)
    try {
      const res = await fetch("/api/wallet/generate", { method: "POST" })
      const data = await res.json()
      setGeneratedSeed(data.seedPhrase)
      setStep("seed-reveal")
    } catch {
      toast.error("Failed to generate wallet — is the agent running?")
    }
    setLoading(false)
  }

  async function handleSaveSeed() {
    if (!generatedSeed) return
    setLoading(true)
    try {
      const res = await fetch("/api/wallet/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seedPhrase: generatedSeed }),
      })
      const data = await res.json()
      if (data.valid && data.address) {
        localStorage.setItem(seedKey, generatedSeed)
        localStorage.setItem(addrKey, data.address)
        localStorage.removeItem(demoKey)
        window.location.reload()
      }
    } catch {
      toast.error("Failed to save wallet")
    }
    setLoading(false)
  }

  async function handleImport() {
    setImportError(null)
    setLoading(true)
    try {
      const res = await fetch("/api/wallet/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seedPhrase: importText.trim() }),
      })
      const data = await res.json()
      if (data.valid && data.address) {
        localStorage.setItem(seedKey, importText.trim())
        localStorage.setItem(addrKey, data.address)
        localStorage.removeItem(demoKey)
        window.location.reload()
      } else {
        setImportError(data.error ?? "Invalid seed phrase")
      }
    } catch {
      setImportError("Validation failed — check the agent is running")
    }
    setLoading(false)
  }

  function handleDisconnect() {
    localStorage.removeItem(seedKey)
    localStorage.removeItem(demoKey)
    localStorage.removeItem(addrKey)
    setAddress(null)
    setStep("idle")
    window.location.reload()
  }

  // Connected
  if (address) {
    return (
      <section className={sectionClass()}>
        <div className="px-5 py-4 border-b border-zinc-800">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Wallet</p>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs px-2 py-0.5 rounded-full bg-[rgba(0,200,255,0.1)] text-[#00C8FF] border border-[rgba(0,200,255,0.3)]">
              ● Connected
            </span>
          </div>
          <div
            onClick={() => copy(address)}
            title="Click to copy"
            className="text-xs font-mono text-zinc-400 bg-zinc-800 rounded px-3 py-2 cursor-pointer select-none border border-zinc-700"
          >
            {address.slice(0, 10)}...{address.slice(-8)}
            <span className="ml-2 text-zinc-600">{copied ? "✓" : "⎘"}</span>
          </div>
          <Button
            variant="outline"
            onClick={handleDisconnect}
            className="border-red-800 text-red-400 hover:bg-red-900/30 hover:text-red-300 w-full"
          >
            Disconnect Wallet
          </Button>
        </div>
      </section>
    )
  }

  // Seed reveal
  if (step === "seed-reveal" && generatedSeed) {
    return (
      <section className={sectionClass()}>
        <div className="px-5 py-4 border-b border-zinc-800">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Wallet</p>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div className="bg-yellow-900/20 border border-yellow-700/40 rounded-lg p-3">
            <p className="text-xs text-yellow-400 font-semibold mb-2">Write this down — never share it</p>
            <p className="text-sm font-mono text-white leading-relaxed break-words">{generatedSeed}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => copy(generatedSeed)} className="flex-1 border-zinc-700 text-zinc-300 hover:bg-zinc-800">
              {copied ? "✓ Copied" : "Copy"}
            </Button>
            <Button onClick={handleSaveSeed} disabled={loading} style={{ backgroundColor: "#00C8FF" }} className="flex-[2] text-zinc-950 font-semibold hover:opacity-90">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              I&apos;ve saved it
            </Button>
          </div>
        </div>
      </section>
    )
  }

  // Not connected
  return (
    <section className={sectionClass()}>
      <div className="px-5 py-4 border-b border-zinc-800">
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Wallet</p>
      </div>
      <div className="px-5 py-4 space-y-3">
        <Button onClick={handleGenerate} disabled={loading} style={{ backgroundColor: "#00C8FF" }} className="w-full text-zinc-950 font-semibold hover:opacity-90 disabled:opacity-50">
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Generate New Wallet
        </Button>
        <div className="text-center text-xs text-zinc-600">or import existing</div>
        {step === "import" ? (
          <div className="space-y-2">
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder="Enter your 12-word seed phrase"
              rows={3}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white font-mono resize-none outline-none"
            />
            {importError && <p className="text-xs text-red-400">{importError}</p>}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setStep("idle"); setImportText(""); setImportError(null) }} className="flex-1 border-zinc-700 text-zinc-300 hover:bg-zinc-800">
                Cancel
              </Button>
              <Button onClick={handleImport} disabled={loading || !importText.trim()} className="flex-[2] bg-zinc-700 hover:bg-zinc-600 text-white">
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Connect Wallet
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="outline" onClick={() => setStep("import")} className="w-full border-zinc-700 text-zinc-300 hover:bg-zinc-800">
            Import Wallet
          </Button>
        )}
      </div>
    </section>
  )
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
        autoTipping,
        notifications: true,
        demoMode: config.agent.demoMode,
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
        budget: {
          maxTipPerEvent: form.maxTipPerEvent,
          dailyLimitUsdt: form.dailyLimitUsdt,
          sessionLimitUsdt: form.sessionLimitUsdt,
        },
        agent: {
          ...(config?.agent ?? { heartbeatMs: 5000, network: "sepolia", llmEnabled: false, llmConfidenceThreshold: 0.7 }),
          demoMode: form.demoMode,
          autoTippingEnabled: form.autoTipping,
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

        {/* 1. WALLET */}
        <WalletSection seedKey={SEED_KEY} demoKey={DEMO_KEY} addrKey={ADDR_KEY} />

        {/* 2. SPENDING LIMITS */}
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

        {/* 2. PREFERENCES */}
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

        {/* 3. DANGER ZONE */}
        <section className={sectionClass(true)}>
          <div className="px-5 py-4 border-b border-red-800/60">
            <p className="text-xs font-semibold text-red-400 uppercase tracking-widest">Danger Zone</p>
          </div>
          <div className="px-5 py-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-300 font-medium">Disconnect Wallet</p>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Removes your seed phrase from this browser. You can reconnect at any time.
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  localStorage.removeItem(SEED_KEY)
                  localStorage.removeItem(DEMO_KEY)
                  localStorage.removeItem(ADDR_KEY)
                  window.location.reload()
                }}
                className="border-red-800 text-red-400 hover:bg-red-900/30 hover:text-red-300"
              >
                Disconnect
              </Button>
            </div>
            <div className="border-t border-red-800/30 pt-4 flex items-center justify-between">
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
