import React, { useState, useEffect } from 'react'
import { getSettings } from '../../lib/storage'

// Shape the agent API actually returns for each rule key
interface RuleValue {
  enabled: boolean
  tipAmount: string
  asset: string
  [key: string]: unknown
}

// Flat shape used for display
interface Rule {
  key: string
  name: string
  enabled: boolean
  amount: string
  asset: string
  thresholdMinutes?: string
}

const RULE_LABELS: Record<string, string> = {
  followerMilestones:   'Follower Milestones',
  newSubscriber:        'New Subscriber',
  viewerSpike:          'Viewer Spike',
  watchingNow:          'New Viewer',
  newFollower:          'New Follower',
  watchTime:            'Watch Time',
  newSubscriberDetected:'Subscriber Action',
}

function rulesObjectToArray(rulesObj: Record<string, RuleValue>): Rule[] {
  return Object.entries(rulesObj).map(([key, val]) => ({
    key,
    name:             RULE_LABELS[key] ?? key,
    enabled:          val.enabled ?? false,
    amount:           val.tipAmount ?? '0',
    asset:            val.asset ?? 'USDT',
    thresholdMinutes: key === 'watchTime' ? String(val.thresholdMinutes ?? 30) : undefined,
  }))
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <div
      onClick={onChange}
      style={{
        width: 30, height: 17, borderRadius: 9,
        background: checked ? '#00C8FF' : '#0b1e38',
        position: 'relative', cursor: 'pointer', flexShrink: 0,
        transition: 'background 0.2s'
      }}
    >
      <div style={{
        position: 'absolute', top: 2,
        left: checked ? 15 : 2,
        width: 13, height: 13, borderRadius: '50%',
        background: checked ? '#020810' : '#3a6a96',
        transition: 'left 0.2s'
      }} />
    </div>
  )
}

export default function Rules() {
  const [rules, setRules] = useState<Rule[]>([])
  // Keep the full raw config so we can merge back on save
  const [rawConfig, setRawConfig] = useState<Record<string, unknown>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const settings = await getSettings()
        const res = await fetch(`${settings.agentApiUrl}/api/config`)
        const data = await res.json()
        setRawConfig(data)
        const rulesObj: Record<string, RuleValue> = data.rules ?? {}
        setRules(rulesObjectToArray(rulesObj))
      } catch {
        setError('Could not load rules — is the agent running?')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const settings = await getSettings()

      // Merge edited fields back into the raw rules object
      const updatedRules = { ...(rawConfig.rules as Record<string, RuleValue>) }
      rules.forEach(r => {
        updatedRules[r.key] = {
          ...updatedRules[r.key],
          enabled:   r.enabled,
          tipAmount: r.amount,
          asset:     r.asset,
          ...(r.thresholdMinutes !== undefined ? { thresholdMinutes: parseInt(r.thresholdMinutes, 10) || 30 } : {})
        }
      })

      await fetch(`${settings.agentApiUrl}/api/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...rawConfig, rules: updatedRules })
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      setError('Failed to save rules')
    }
    setSaving(false)
  }

  function toggleRule(key: string) {
    setRules(r => r.map(rule => rule.key === key ? { ...rule, enabled: !rule.enabled } : rule))
  }

  function updateAmount(key: string, amount: string) {
    setRules(r => r.map(rule => rule.key === key ? { ...rule, amount } : rule))
  }

  function updateThreshold(key: string, thresholdMinutes: string) {
    setRules(r => r.map(rule => rule.key === key ? { ...rule, thresholdMinutes } : rule))
  }

  if (loading) {
    return <div style={{ textAlign: 'center', color: '#5e8fbe', padding: '32px 0', fontSize: 13 }}>Loading rules...</div>
  }

  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#e8f4ff', marginBottom: 10 }}>Tip Rules</div>

      {error && (
        <div style={{ fontSize: 12, color: '#f87171', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: 6, padding: '8px 10px', marginBottom: 10 }}>
          {error}
        </div>
      )}

      {rules.length === 0 && !error ? (
        <div style={{ fontSize: 12, color: '#3a6a96', textAlign: 'center', padding: '32px 0' }}>No rules configured</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
          {rules.map(rule => (
            <div
              key={rule.key}
              style={{
                background: '#050d1e',
                border: `1px solid ${rule.enabled ? 'rgba(0,200,255,0.2)' : '#0b1e38'}`,
                borderRadius: 8, padding: '8px 10px',
                display: 'flex', alignItems: 'center', gap: 8
              }}
            >
              <Toggle checked={rule.enabled} onChange={() => toggleRule(rule.key)} />

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: rule.enabled ? '#e8f4ff' : '#3a6a96', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {rule.name}
                </div>
              </div>

              {rule.thresholdMinutes !== undefined && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  <input
                    type="number"
                    min={1}
                    max={120}
                    value={rule.thresholdMinutes}
                    onChange={e => updateThreshold(rule.key, e.target.value)}
                    style={{
                      width: 40, padding: '3px 4px',
                      background: '#020810', border: '1px solid #0b1e38',
                      borderRadius: 4, color: '#e8f4ff', fontSize: 12,
                      textAlign: 'right', outline: 'none'
                    }}
                  />
                  <span style={{ fontSize: 10, color: '#3a6a96', whiteSpace: 'nowrap' }}>min</span>
                </div>
              )}

              <input
                value={rule.amount}
                onChange={e => updateAmount(rule.key, e.target.value)}
                style={{
                  width: 52, padding: '3px 6px',
                  background: '#020810', border: '1px solid #0b1e38',
                  borderRadius: 4, color: '#e8f4ff', fontSize: 12,
                  textAlign: 'right', outline: 'none'
                }}
              />

              <span style={{
                fontSize: 10, padding: '2px 6px', borderRadius: 4,
                background: 'rgba(0,200,255,0.08)', color: '#00C8FF',
                border: '1px solid rgba(0,200,255,0.2)', whiteSpace: 'nowrap'
              }}>
                {rule.asset}
              </span>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={saving || rules.length === 0}
        style={{
          width: '100%', padding: '10px 0',
          background: saved ? 'rgba(0,200,255,0.1)' : saving ? '#0b1e38' : '#00C8FF',
          border: saved ? '1px solid rgba(0,200,255,0.3)' : 'none',
          borderRadius: 8,
          color: saved ? '#00C8FF' : saving ? '#5e8fbe' : '#020810',
          cursor: saving || rules.length === 0 ? 'not-allowed' : 'pointer',
          fontSize: 13, fontWeight: 600
        }}
      >
        {saved ? '✓ Saved' : saving ? 'Saving...' : 'Save Rules'}
      </button>
    </div>
  )
}
