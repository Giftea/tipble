import React, { useState, useEffect } from 'react'
import {
  getSettings, saveSettings,
  getSeedPhrase, saveSeedPhrase, clearSeedPhrase,
  getWalletAddress, saveWalletAddress
} from '../../lib/storage'
import { generateWallet, validateWallet } from '../../lib/api'
import type { ExtensionSettings } from '../../types'

// ─── Primitives ───────────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div
      onClick={() => onChange(!checked)}
      style={{
        width: 34, height: 19, borderRadius: 10,
        background: checked ? '#00C8FF' : '#0b1e38',
        position: 'relative', cursor: 'pointer', flexShrink: 0,
        transition: 'background 0.2s'
      }}
    >
      <div style={{
        position: 'absolute', top: 3,
        left: checked ? 17 : 3,
        width: 13, height: 13, borderRadius: '50%',
        background: checked ? '#020810' : '#3a6a96',
        transition: 'left 0.2s'
      }} />
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 10, color: '#3a6a96', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
        {title}
      </div>
      <div style={{ background: '#050d1e', border: '1px solid #0b1e38', borderRadius: 8, overflow: 'hidden' }}>
        {children}
      </div>
    </div>
  )
}

function Row({ label, children, last }: { label: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '9px 10px',
      borderBottom: last ? 'none' : '1px solid #0b1e38'
    }}>
      <span style={{ fontSize: 12, color: '#88b0d6' }}>{label}</span>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  background: '#020810', border: '1px solid #0b1e38',
  borderRadius: 6, padding: '8px 10px',
  color: '#e8f4ff', fontSize: 12, outline: 'none'
}

// ─── Wallet Section ───────────────────────────────────────────────────────────

function WalletSection() {
  const [address, setAddress] = useState<string | null>(null)
  const [hasSeed, setHasSeed] = useState(false)
  const [importText, setImportText] = useState('')
  const [importError, setImportError] = useState<string | null>(null)
  const [generatedSeed, setGeneratedSeed] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    Promise.all([getWalletAddress(), getSeedPhrase()]).then(([addr, seed]) => {
      setAddress(addr)
      setHasSeed(!!seed)
    })
  }, [])

  async function handleGenerate() {
    setLoading(true)
    setImportError(null)
    try {
      const result = await generateWallet()
      setGeneratedSeed(result.seedPhrase)
    } catch {
      setImportError('Failed to generate wallet — is the agent running?')
    }
    setLoading(false)
  }

  async function handleSaveSeed() {
    if (!generatedSeed) return
    setLoading(true)
    try {
      const result = await validateWallet(generatedSeed)
      if (result.valid && result.address) {
        await saveSeedPhrase(generatedSeed)
        await saveWalletAddress(result.address)
        setAddress(result.address)
        setHasSeed(true)
        setGeneratedSeed(null)
      }
    } catch {
      setImportError('Failed to save wallet')
    }
    setLoading(false)
  }

  async function handleImport() {
    setImportError(null)
    setLoading(true)
    try {
      const result = await validateWallet(importText.trim())
      if (result.valid && result.address) {
        await saveSeedPhrase(importText.trim())
        await saveWalletAddress(result.address)
        setAddress(result.address)
        setHasSeed(true)
        setImportText('')
      } else {
        setImportError(result.error ?? 'Invalid seed phrase')
      }
    } catch {
      setImportError('Validation failed — check the agent is running')
    }
    setLoading(false)
  }

  async function handleDisconnect() {
    await clearSeedPhrase()
    await saveWalletAddress('')
    setAddress(null)
    setHasSeed(false)
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  // ── Connected ──
  if (address && hasSeed) {
    return (
      <Section title="Wallet">
        <div style={{ padding: '9px 10px', borderBottom: '1px solid #0b1e38' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 10, background: 'rgba(0,200,255,0.1)', color: '#00C8FF', border: '1px solid rgba(0,200,255,0.3)' }}>
              ● Connected
            </span>
          </div>
          <div
            onClick={() => copy(address)}
            title="Click to copy"
            style={{ fontSize: 11, fontFamily: 'monospace', color: '#5e8fbe', cursor: 'pointer', padding: '6px 8px', background: '#020810', borderRadius: 6, userSelect: 'none', border: '1px solid #0b1e38' }}
          >
            {address.slice(0, 10)}...{address.slice(-8)}
            <span style={{ marginLeft: 6, color: '#3a6a96' }}>{copied ? '✓' : '⎘'}</span>
          </div>
        </div>
        <div style={{ padding: '9px 10px' }}>
          <button
            onClick={handleDisconnect}
            style={{ width: '100%', padding: '7px 0', background: 'transparent', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 6, color: '#f87171', cursor: 'pointer', fontSize: 12 }}
          >
            Disconnect Wallet
          </button>
        </div>
      </Section>
    )
  }

  // ── Seed phrase reveal ──
  if (generatedSeed) {
    return (
      <Section title="Wallet">
        <div style={{ padding: 10 }}>
          <div style={{ background: 'rgba(239,159,39,0.08)', border: '1px solid rgba(239,159,39,0.3)', borderRadius: 6, padding: 10, marginBottom: 10 }}>
            <div style={{ fontSize: 11, color: '#EF9F27', marginBottom: 6, fontWeight: 600 }}>
              ⚠️ Write this down — never share it
            </div>
            <div style={{ fontSize: 12, fontFamily: 'monospace', color: '#e8f4ff', lineHeight: 1.7, wordBreak: 'break-word' }}>
              {generatedSeed}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={() => copy(generatedSeed)}
              style={{ flex: 1, padding: '8px 0', background: '#0b1e38', border: '1px solid #122f52', borderRadius: 6, color: '#88b0d6', cursor: 'pointer', fontSize: 12 }}
            >
              {copied ? '✓ Copied' : 'Copy'}
            </button>
            <button
              onClick={handleSaveSeed}
              disabled={loading}
              style={{ flex: 2, padding: '8px 0', background: '#00C8FF', border: 'none', borderRadius: 6, color: '#020810', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
            >
              {loading ? 'Saving...' : "I've saved it"}
            </button>
          </div>
        </div>
      </Section>
    )
  }

  // ── Not connected ──
  return (
    <Section title="Wallet">
      <div style={{ padding: 10 }}>
        <button
          onClick={handleGenerate}
          disabled={loading}
          style={{ width: '100%', padding: '9px 0', background: '#00C8FF', border: 'none', borderRadius: 6, color: '#020810', cursor: loading ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 600, marginBottom: 10 }}
        >
          {loading ? 'Generating...' : 'Generate New Wallet'}
        </button>

        <div style={{ fontSize: 11, color: '#1e4a75', textAlign: 'center', marginBottom: 10 }}>or import existing</div>

        <textarea
          value={importText}
          onChange={e => setImportText(e.target.value)}
          placeholder="Enter your 12-word seed phrase"
          rows={3}
          style={{ ...inputStyle, resize: 'none', fontFamily: 'monospace', marginBottom: 6 }}
        />

        {importError && (
          <div style={{ fontSize: 11, color: '#f87171', marginBottom: 6 }}>{importError}</div>
        )}

        <button
          onClick={handleImport}
          disabled={loading || !importText.trim()}
          style={{
            width: '100%', padding: '9px 0',
            background: '#0b1e38', border: '1px solid #122f52',
            borderRadius: 6, color: loading || !importText.trim() ? '#1e4a75' : '#88b0d6',
            cursor: loading || !importText.trim() ? 'not-allowed' : 'pointer', fontSize: 12
          }}
        >
          {loading ? 'Validating...' : 'Connect Wallet'}
        </button>
      </div>
    </Section>
  )
}

// ─── Main Settings ────────────────────────────────────────────────────────────

export default function Settings() {
  const [settings, setSettings] = useState<ExtensionSettings | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    getSettings().then(setSettings)
  }, [])

  function update(patch: Partial<ExtensionSettings>) {
    setSettings(s => s ? { ...s, ...patch } : s)
  }

  async function handleSave() {
    if (!settings) return
    setSaving(true)
    await saveSettings(settings)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    setSaving(false)
  }

  function handleAutoTipping(enabled: boolean) {
    update({ autoTippingEnabled: enabled })
    chrome.runtime.sendMessage({ type: enabled ? 'RESUME_AGENT' : 'PAUSE_AGENT' })
  }

  if (!settings) {
    return <div style={{ textAlign: 'center', color: '#5e8fbe', padding: '32px 0', fontSize: 13 }}>Loading...</div>
  }

  return (
    <div style={{ paddingBottom: 8 }}>
      <WalletSection />

      <Section title="Agent URL">
        <div style={{ padding: 10 }}>
          <input
            value={settings.agentApiUrl}
            onChange={e => update({ agentApiUrl: e.target.value })}
            style={{ ...inputStyle, fontFamily: 'monospace' }}
          />
        </div>
      </Section>

      <Section title="Preferences">
        <Row label="Auto-Tipping">
          <Toggle checked={settings.autoTippingEnabled} onChange={handleAutoTipping} />
        </Row>
        <Row label="Badge on Videos">
          <Toggle checked={settings.showBadge} onChange={v => update({ showBadge: v })} />
        </Row>
        <Row label="Notifications">
          <Toggle checked={settings.showNotifications} onChange={v => update({ showNotifications: v })} />
        </Row>
        <Row label="LLM Analysis" last>
          <Toggle checked={settings.llmEnabled} onChange={v => update({ llmEnabled: v })} />
        </Row>
      </Section>

      <Section title="Network">
        <div style={{ padding: 10 }}>
          <select
            value={settings.network}
            onChange={e => update({ network: e.target.value })}
            style={{ ...inputStyle }}
          >
            <option value="sepolia">Sepolia (Testnet)</option>
            <option value="polygon">Polygon</option>
          </select>
        </div>
      </Section>

      <button
        onClick={handleSave}
        disabled={saving}
        style={{
          width: '100%', padding: '10px 0',
          background: saved ? 'rgba(0,200,255,0.1)' : saving ? '#0b1e38' : '#00C8FF',
          border: saved ? '1px solid rgba(0,200,255,0.3)' : 'none',
          borderRadius: 8,
          color: saved ? '#00C8FF' : saving ? '#5e8fbe' : '#020810',
          cursor: saving ? 'not-allowed' : 'pointer',
          fontSize: 13, fontWeight: 600, marginBottom: 14
        }}
      >
        {saved ? '✓ Settings Saved' : saving ? 'Saving...' : 'Save Settings'}
      </button>

      <div style={{ textAlign: 'center', fontSize: 10, color: '#122f52' }}>
        Powered by Tether WDK
      </div>
    </div>
  )
}
