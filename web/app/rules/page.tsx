"use client"

import { useEffect, useState } from "react"
import useSWR from "swr"
import { toast } from "sonner"
import { Loader2, X, TriangleAlert } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import type { TipbleConfig } from "@/types"

const ASSETS = ["ETH", "USDT", "XAUT", "BTC"] as const

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error("offline")
    return r.json()
  })

interface RulesForm {
  followerMilestones: {
    enabled: boolean
    milestones: string        // comma-separated for input
    tipAmount: string
    asset: string
  }
  newSubscriber: {
    enabled: boolean
    tipAmount: string
    asset: string
  }
  viewerSpike: {
    enabled: boolean
    thresholdMultiplier: string
    minimumViewers: string
    tipAmount: string
    asset: string
  }
  watchingNow: {
    enabled: boolean
    threshold: string
    tipAmount: string
    asset: string
  }
  newFollower: {
    enabled: boolean
    tipAmount: string
    asset: string
  }
}

function AssetSelect({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 rounded-md border border-zinc-700 bg-zinc-800 px-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#00C8FF]"
    >
      {ASSETS.map((a) => (
        <option key={a} value={a}>
          {a}
        </option>
      ))}
    </select>
  )
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-zinc-400 text-xs uppercase tracking-wide">{label}</Label>
      {children}
    </div>
  )
}

function RuleCard({
  title,
  enabled,
  onToggle,
  children,
  warning,
}: {
  title: string
  enabled: boolean
  onToggle: (v: boolean) => void
  children: React.ReactNode
  warning?: string
}) {
  return (
    <Card
      className={`border transition-colors ${
        enabled ? "border-[#00C8FF]/30 bg-zinc-900" : "border-zinc-800 bg-zinc-900/60"
      }`}
    >
      <CardHeader className="pb-3 pt-4 px-5">
        <div className="flex items-center justify-between">
          <CardTitle className={`text-sm font-semibold ${enabled ? "text-white" : "text-zinc-500"}`}>
            {title}
          </CardTitle>
          <Switch
            checked={enabled}
            onCheckedChange={onToggle}
            className="data-[state=checked]:bg-[#00C8FF]"
          />
        </div>
        {warning && (
          <div className="flex items-center gap-1.5 mt-2 text-xs text-amber-400">
            <TriangleAlert size={12} />
            {warning}
          </div>
        )}
      </CardHeader>
      {enabled && (
        <CardContent className="px-5 pb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>
        </CardContent>
      )}
    </Card>
  )
}

export default function RulesPage() {
  const { data: config, error, mutate } = useSWR<TipbleConfig>("/api/config", fetcher)
  const [form, setForm] = useState<RulesForm | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (config && !form) {
      const r = config.rules
      setForm({
        followerMilestones: {
          enabled: r.followerMilestones.enabled,
          milestones: (r.followerMilestones.milestones ?? []).join(", "),
          tipAmount: r.followerMilestones.tipAmount,
          asset: r.followerMilestones.asset,
        },
        newSubscriber: {
          enabled: r.newSubscriber.enabled,
          tipAmount: r.newSubscriber.tipAmount,
          asset: r.newSubscriber.asset,
        },
        viewerSpike: {
          enabled: r.viewerSpike.enabled,
          thresholdMultiplier: String(r.viewerSpike.thresholdMultiplier),
          minimumViewers: String(r.viewerSpike.minimumViewers),
          tipAmount: r.viewerSpike.tipAmount,
          asset: r.viewerSpike.asset,
        },
        watchingNow: {
          enabled: r.watchingNow.enabled,
          threshold: String(r.watchingNow.threshold),
          tipAmount: r.watchingNow.tipAmount,
          asset: r.watchingNow.asset,
        },
        newFollower: {
          enabled: r.newFollower?.enabled ?? false,
          tipAmount: r.newFollower?.tipAmount ?? "0.0001",
          asset: r.newFollower?.asset ?? "ETH",
        },
      })
    }
  }, [config, form])

  function patch<K extends keyof RulesForm>(
    rule: K,
    field: keyof RulesForm[K],
    value: string | boolean
  ) {
    setForm((prev) =>
      prev ? { ...prev, [rule]: { ...prev[rule], [field]: value } } : prev
    )
  }

  function disableRule(rule: keyof RulesForm) {
    setForm((prev) =>
      prev ? { ...prev, [rule]: { ...prev[rule], enabled: false } } : prev
    )
  }

  async function handleSave() {
    if (!form || !config) return
    setSaving(true)
    try {
      const payload: Partial<TipbleConfig> = {
        rules: {
          followerMilestones: {
            enabled: form.followerMilestones.enabled,
            milestones: form.followerMilestones.milestones
              .split(",")
              .map((s) => parseInt(s.trim(), 10))
              .filter((n) => !isNaN(n)),
            tipAmount: form.followerMilestones.tipAmount,
            asset: form.followerMilestones.asset,
          },
          newSubscriber: {
            enabled: form.newSubscriber.enabled,
            tipAmount: form.newSubscriber.tipAmount,
            asset: form.newSubscriber.asset,
          },
          viewerSpike: {
            enabled: form.viewerSpike.enabled,
            thresholdMultiplier: parseFloat(form.viewerSpike.thresholdMultiplier) || 1.5,
            minimumViewers: parseInt(form.viewerSpike.minimumViewers, 10) || 10,
            tipAmount: form.viewerSpike.tipAmount,
            asset: form.viewerSpike.asset,
          },
          watchingNow: {
            enabled: form.watchingNow.enabled,
            threshold: parseInt(form.watchingNow.threshold, 10) || 500,
            tipAmount: form.watchingNow.tipAmount,
            asset: form.watchingNow.asset,
          },
          newFollower: {
            enabled: form.newFollower.enabled,
            tipAmount: form.newFollower.tipAmount,
            asset: form.newFollower.asset,
          },
        },
      }
      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error("Save failed")
      await mutate()
      toast.success("Rules saved")
    } catch {
      toast.error("Failed to save rules")
    } finally {
      setSaving(false)
    }
  }

  // ── Active rules for summary pills ────────────────────────────
  const activePills: { key: keyof RulesForm; label: string; detail: string }[] = form
    ? [
        form.followerMilestones.enabled && {
          key: "followerMilestones" as const,
          label: "Milestones",
          detail: `${form.followerMilestones.tipAmount} ${form.followerMilestones.asset}`,
        },
        form.newSubscriber.enabled && {
          key: "newSubscriber" as const,
          label: "New Sub",
          detail: `${form.newSubscriber.tipAmount} ${form.newSubscriber.asset}`,
        },
        form.viewerSpike.enabled && {
          key: "viewerSpike" as const,
          label: "Viewer Spike",
          detail: `${form.viewerSpike.tipAmount} ${form.viewerSpike.asset}`,
        },
        form.watchingNow.enabled && {
          key: "watchingNow" as const,
          label: "Watching Now",
          detail: `${form.watchingNow.tipAmount} ${form.watchingNow.asset}`,
        },
        form.newFollower.enabled && {
          key: "newFollower" as const,
          label: "New Follower",
          detail: `${form.newFollower.tipAmount} ${form.newFollower.asset}`,
        },
      ].filter(Boolean) as { key: keyof RulesForm; label: string; detail: string }[]
    : []

  // ── Render states ─────────────────────────────────────────────
  if (error) {
    return (
      <div>
        <div className="border-b border-zinc-800 px-6 py-5">
          <h1 className="text-2xl font-medium text-white">Rules</h1>
          <p className="text-sm text-zinc-400 mt-0.5">Configure automated tipping rules</p>
        </div>
        <div className="p-6">
          <p className="text-zinc-400 text-sm">Agent offline — start the agent to edit rules</p>
        </div>
      </div>
    )
  }

  if (!form) {
    return (
      <div>
        <div className="border-b border-zinc-800 px-6 py-5">
          <h1 className="text-2xl font-medium text-white">Rules</h1>
          <p className="text-sm text-zinc-400 mt-0.5">Configure automated tipping rules</p>
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
          <h1 className="text-2xl font-medium text-white">Rules</h1>
          <p className="text-sm text-zinc-400 mt-0.5">Configure automated tipping rules</p>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving}
          style={{ backgroundColor: "#00C8FF" }}
          className="text-zinc-950 font-semibold hover:opacity-90 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Save Rules
        </Button>
      </div>

      <div className="p-6 max-w-3xl space-y-6">

        {/* ── 1. Configure Rules ─────────────────────────────── */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="px-5 pt-5 pb-3">
            <CardTitle className="text-base text-white">Configure Tipping Rules</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5 space-y-4">

            {/* A. Follower Milestones */}
            <RuleCard
              title="Follower Milestones"
              enabled={form.followerMilestones.enabled}
              onToggle={(v) => patch("followerMilestones", "enabled", v)}
            >
              <FieldRow label="Milestones (comma separated)">
                <Input
                  value={form.followerMilestones.milestones}
                  onChange={(e) => patch("followerMilestones", "milestones", e.target.value)}
                  placeholder="100, 500, 1000, 5000, 10000"
                  className="bg-zinc-800 border-zinc-700 text-white col-span-2"
                />
              </FieldRow>
              <FieldRow label="Tip Amount (ETH)">
                <Input
                  value={form.followerMilestones.tipAmount}
                  onChange={(e) => patch("followerMilestones", "tipAmount", e.target.value)}
                  placeholder="0.001"
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </FieldRow>
              <FieldRow label="Asset">
                <AssetSelect
                  value={form.followerMilestones.asset}
                  onChange={(v) => patch("followerMilestones", "asset", v)}
                />
              </FieldRow>
            </RuleCard>

            {/* B. New Subscriber */}
            <RuleCard
              title="New Subscriber"
              enabled={form.newSubscriber.enabled}
              onToggle={(v) => patch("newSubscriber", "enabled", v)}
            >
              <FieldRow label="Tip Amount">
                <Input
                  value={form.newSubscriber.tipAmount}
                  onChange={(e) => patch("newSubscriber", "tipAmount", e.target.value)}
                  placeholder="0.0005"
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </FieldRow>
              <FieldRow label="Asset">
                <AssetSelect
                  value={form.newSubscriber.asset}
                  onChange={(v) => patch("newSubscriber", "asset", v)}
                />
              </FieldRow>
            </RuleCard>

            {/* C. Viewer Spike */}
            <RuleCard
              title="Viewer Spike"
              enabled={form.viewerSpike.enabled}
              onToggle={(v) => patch("viewerSpike", "enabled", v)}
            >
              <FieldRow label="Threshold Multiplier (e.g. 1.5 = 50% spike)">
                <Input
                  value={form.viewerSpike.thresholdMultiplier}
                  onChange={(e) => patch("viewerSpike", "thresholdMultiplier", e.target.value)}
                  placeholder="1.5"
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </FieldRow>
              <FieldRow label="Minimum Viewers">
                <Input
                  value={form.viewerSpike.minimumViewers}
                  onChange={(e) => patch("viewerSpike", "minimumViewers", e.target.value)}
                  placeholder="10"
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </FieldRow>
              <FieldRow label="Tip Amount">
                <Input
                  value={form.viewerSpike.tipAmount}
                  onChange={(e) => patch("viewerSpike", "tipAmount", e.target.value)}
                  placeholder="0.0003"
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </FieldRow>
              <FieldRow label="Asset">
                <AssetSelect
                  value={form.viewerSpike.asset}
                  onChange={(v) => patch("viewerSpike", "asset", v)}
                />
              </FieldRow>
            </RuleCard>

            {/* D. Watching Now */}
            <RuleCard
              title="Watching Now Threshold"
              enabled={form.watchingNow.enabled}
              onToggle={(v) => patch("watchingNow", "enabled", v)}
            >
              <FieldRow label="Viewer Threshold (e.g. 500)">
                <Input
                  value={form.watchingNow.threshold}
                  onChange={(e) => patch("watchingNow", "threshold", e.target.value)}
                  placeholder="500"
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </FieldRow>
              <FieldRow label="Tip Amount">
                <Input
                  value={form.watchingNow.tipAmount}
                  onChange={(e) => patch("watchingNow", "tipAmount", e.target.value)}
                  placeholder="0.0005"
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </FieldRow>
              <FieldRow label="Asset">
                <AssetSelect
                  value={form.watchingNow.asset}
                  onChange={(v) => patch("watchingNow", "asset", v)}
                />
              </FieldRow>
            </RuleCard>

            {/* E. New Follower */}
            <RuleCard
              title="New Follower"
              enabled={form.newFollower.enabled}
              onToggle={(v) => patch("newFollower", "enabled", v)}
              warning="High frequency — use small amounts"
            >
              <FieldRow label="Tip Amount">
                <Input
                  value={form.newFollower.tipAmount}
                  onChange={(e) => patch("newFollower", "tipAmount", e.target.value)}
                  placeholder="0.0001"
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </FieldRow>
              <FieldRow label="Asset">
                <AssetSelect
                  value={form.newFollower.asset}
                  onChange={(v) => patch("newFollower", "asset", v)}
                />
              </FieldRow>
            </RuleCard>

          </CardContent>
        </Card>

        {/* ── 2. Active Rules Summary ────────────────────────── */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="px-5 pt-5 pb-3">
            <CardTitle className="text-base text-white">Active Rules</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            {activePills.length === 0 ? (
              <p className="text-sm text-zinc-500">No rules enabled — toggle rules above to activate them.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {activePills.map(({ key, label, detail }) => (
                  <span
                    key={key}
                    className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1 rounded-full text-xs font-medium border border-[#00C8FF]/40 text-[#00C8FF]"
                    style={{ backgroundColor: "rgba(0,200,255,0.08)" }}
                  >
                    {label}: {detail}
                    <button
                      onClick={() => disableRule(key)}
                      className="ml-0.5 rounded-full hover:bg-[#00C8FF]/20 p-0.5 transition-colors"
                      aria-label={`Disable ${label}`}
                    >
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  )
}
