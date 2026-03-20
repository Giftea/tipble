import React, { useState, useEffect } from 'react'
import { sendManualTip } from '../../lib/api'
import type { AgentStatus } from '../../types'

export default function Dashboard() {
  const [status, setStatus] = useState<AgentStatus | null>(null)
  const [offline, setOffline] = useState(false)
  const [showTipForm, setShowTipForm] = useState(false)
  const [tipReason, setTipReason] = useState('')
  const [tipping, setTipping] = useState(false)
  const [tipResult, setTipResult] = useState<string | null>(null)

  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (result) => {
      if (result?.cachedStatus) {
        setStatus(result.cachedStatus)
        setOffline(false)
      } else {
        setOffline(true)
      }
    })
  }, [])

  async function handleSendTip() {
    if (!tipReason.trim()) return
    setTipping(true)
    setTipResult(null)
    try {
      const result = await sendManualTip(tipReason)
      if (result.success) {
        setTipResult(`✓ Tip sent!${result.hash ? ' ' + result.hash.slice(0, 8) + '...' : ''}`)
        setTipReason('')
        setShowTipForm(false)
      } else {
        setTipResult('✗ Failed to send tip')
      }
    } catch {
      setTipResult('✗ Error sending tip')
    }
    setTipping(false)
  }

  const recentTips = status?.recentTips?.slice(0, 5) ?? []

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: 18, fontWeight: 700 }}>🦞 Tipble</span>
        <span style={{
          fontSize: 11, padding: '3px 8px', borderRadius: 20,
          background: offline ? '#3d1515' : '#0d2d1e',
          color: offline ? '#E24B4A' : '#5dcaa5',
          border: `1px solid ${offline ? '#E24B4A' : '#5dcaa5'}30`
        }}>
          {offline ? 'Offline' : 'Active'}
        </span>
      </div>

      {offline && (
        <div style={{ background: '#1a0a0a', border: '1px solid #3d1515', borderRadius: 8, padding: 10, marginBottom: 12, fontSize: 12, color: '#E24B4A' }}>
          Agent offline — make sure the Tipble agent is running.
        </div>
      )}

      {status && (
        <>
          {/* Creator info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#111', borderRadius: 8, padding: 10, marginBottom: 8 }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: '#5dcaa520', border: '1px solid #5dcaa540',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 700, color: '#5dcaa5', flexShrink: 0
            }}>
              {status.creator?.displayName?.slice(0, 2).toUpperCase() ?? '??'}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {status.creator?.displayName ?? 'Unknown Creator'}
              </div>
              <div style={{ fontSize: 11, color: '#555', fontFamily: 'monospace' }}>
                {status.creator?.walletAddress
                  ? `${status.creator.walletAddress.slice(0, 6)}...${status.creator.walletAddress.slice(-4)}`
                  : 'No address'}
              </div>
            </div>
            {status.demoMode && (
              <span style={{ marginLeft: 'auto', fontSize: 10, padding: '2px 6px', borderRadius: 4, background: '#2d1f00', color: '#f59e0b', border: '1px solid #f59e0b30', flexShrink: 0 }}>
                DEMO
              </span>
            )}
          </div>

          {/* Metrics grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 10 }}>
            {[
              { label: 'Tips Fired', value: status.tipsCount?.toString() ?? '0' },
              { label: 'Total Tipped', value: status.totalTipped ?? '0' },
              { label: 'Balance', value: status.balance ?? '—' },
              { label: 'Network', value: status.network ?? '—' }
            ].map(m => (
              <div key={m.label} style={{ background: '#111', borderRadius: 8, padding: '8px 10px' }}>
                <div style={{ fontSize: 11, color: '#555', marginBottom: 2 }}>{m.label}</div>
                <div style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.value}</div>
              </div>
            ))}
          </div>

          {/* Recent tips */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
              Recent Tips
            </div>
            {recentTips.length === 0 ? (
              <div style={{ fontSize: 12, color: '#333', textAlign: 'center', padding: '14px 0' }}>No tips yet</div>
            ) : (
              recentTips.map(tip => (
                <div key={tip.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid #111', fontSize: 12 }}>
                  <span style={{ color: '#444', whiteSpace: 'nowrap', fontSize: 10 }}>
                    {new Date(tip.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#999' }}>
                    {tip.reason}
                  </span>
                  <span style={{ color: '#5dcaa5', whiteSpace: 'nowrap', fontWeight: 600, fontSize: 11 }}>
                    {tip.amount} {tip.asset}
                  </span>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* Tip result */}
      {tipResult && (
        <div style={{ fontSize: 12, color: tipResult.startsWith('✓') ? '#5dcaa5' : '#E24B4A', marginBottom: 8, textAlign: 'center' }}>
          {tipResult}
        </div>
      )}

      {/* Send Tip */}
      {showTipForm ? (
        <div style={{ background: '#111', borderRadius: 8, padding: 10 }}>
          <div style={{ fontSize: 11, color: '#666', marginBottom: 6 }}>Reason for tip</div>
          <input
            value={tipReason}
            onChange={e => setTipReason(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSendTip()}
            placeholder="e.g. Great stream content"
            autoFocus
            style={{
              width: '100%', boxSizing: 'border-box',
              background: '#0a0a0a', border: '1px solid #2a2a2a',
              borderRadius: 6, padding: '8px 10px',
              color: 'white', fontSize: 13, marginBottom: 8, outline: 'none'
            }}
          />
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={() => { setShowTipForm(false); setTipReason('') }}
              style={{ flex: 1, padding: '8px 0', background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 6, color: '#666', cursor: 'pointer', fontSize: 12 }}
            >
              Cancel
            </button>
            <button
              onClick={handleSendTip}
              disabled={tipping || !tipReason.trim()}
              style={{
                flex: 2, padding: '8px 0',
                background: tipping || !tipReason.trim() ? '#4a3a00' : '#d97706',
                border: 'none', borderRadius: 6,
                color: 'white', cursor: tipping ? 'not-allowed' : 'pointer',
                fontSize: 12, fontWeight: 600
              }}
            >
              {tipping ? 'Sending...' : 'Send Tip'}
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowTipForm(true)}
          style={{
            width: '100%', padding: '10px 0',
            background: '#d97706', border: 'none', borderRadius: 8,
            color: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 600
          }}
        >
          Send Manual Tip
        </button>
      )}
    </div>
  )
}
