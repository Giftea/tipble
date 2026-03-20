import React, { useState, useEffect } from 'react'
import { getSettings } from '../../lib/storage'

interface Rule {
  id: string
  name: string
  enabled: boolean
  amount: string
  asset: string
  description?: string
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <div
      onClick={onChange}
      style={{
        width: 30, height: 17, borderRadius: 9,
        background: checked ? '#5dcaa5' : '#2a2a2a',
        position: 'relative', cursor: 'pointer', flexShrink: 0,
        transition: 'background 0.2s'
      }}
    >
      <div style={{
        position: 'absolute', top: 2,
        left: checked ? 15 : 2,
        width: 13, height: 13, borderRadius: '50%',
        background: 'white', transition: 'left 0.2s'
      }} />
    </div>
  )
}

export default function Rules() {
  const [rules, setRules] = useState<Rule[]>([])
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
        setRules(data.rules ?? [])
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
      await fetch(`${settings.agentApiUrl}/api/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rules })
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      setError('Failed to save rules')
    }
    setSaving(false)
  }

  function toggleRule(id: string) {
    setRules(r => r.map(rule => rule.id === id ? { ...rule, enabled: !rule.enabled } : rule))
  }

  function updateAmount(id: string, amount: string) {
    setRules(r => r.map(rule => rule.id === id ? { ...rule, amount } : rule))
  }

  if (loading) {
    return <div style={{ textAlign: 'center', color: '#444', padding: '32px 0', fontSize: 13 }}>Loading rules...</div>
  }

  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#ccc', marginBottom: 10 }}>Tip Rules</div>

      {error && (
        <div style={{ fontSize: 12, color: '#E24B4A', background: '#1a0a0a', border: '1px solid #3d1515', borderRadius: 6, padding: '8px 10px', marginBottom: 10 }}>
          {error}
        </div>
      )}

      {rules.length === 0 && !error ? (
        <div style={{ fontSize: 12, color: '#333', textAlign: 'center', padding: '32px 0' }}>No rules configured</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
          {rules.map(rule => (
            <div
              key={rule.id}
              style={{
                background: '#111',
                border: `1px solid ${rule.enabled ? '#1a2d1a' : '#1a1a1a'}`,
                borderRadius: 8, padding: '8px 10px',
                display: 'flex', alignItems: 'center', gap: 8
              }}
            >
              <Toggle checked={rule.enabled} onChange={() => toggleRule(rule.id)} />

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: rule.enabled ? '#ccc' : '#555', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {rule.name}
                </div>
                {rule.description && (
                  <div style={{ fontSize: 10, color: '#3a3a3a', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {rule.description}
                  </div>
                )}
              </div>

              <input
                value={rule.amount}
                onChange={e => updateAmount(rule.id, e.target.value)}
                style={{
                  width: 52, padding: '3px 6px',
                  background: '#0a0a0a', border: '1px solid #2a2a2a',
                  borderRadius: 4, color: 'white', fontSize: 12,
                  textAlign: 'right', outline: 'none'
                }}
              />

              <span style={{
                fontSize: 10, padding: '2px 6px', borderRadius: 4,
                background: '#0d1f1a', color: '#5dcaa5',
                border: '1px solid #5dcaa520', whiteSpace: 'nowrap'
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
          background: saved ? '#0d2d1e' : saving ? '#2a2a2a' : '#5dcaa5',
          border: 'none', borderRadius: 8,
          color: saved ? '#5dcaa5' : saving ? '#555' : '#000',
          cursor: saving || rules.length === 0 ? 'not-allowed' : 'pointer',
          fontSize: 13, fontWeight: 600
        }}
      >
        {saved ? '✓ Saved' : saving ? 'Saving...' : 'Save Rules'}
      </button>
    </div>
  )
}
