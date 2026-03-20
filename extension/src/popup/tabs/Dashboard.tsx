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
        <img src="icons/logo.svg" alt="Tipble" style={{ height: 22, width: 'auto' }} />
        <span style={{
          fontSize: 11, padding: '3px 8px', borderRadius: 20,
          background: offline ? 'rgba(248,113,113,0.12)' : 'rgba(0,200,255,0.1)',
          color: offline ? '#f87171' : '#00C8FF',
          border: `1px solid ${offline ? 'rgba(248,113,113,0.3)' : 'rgba(0,200,255,0.3)'}`
        }}>
          {offline ? 'Offline' : 'Active'}
        </span>
      </div>

      {offline && (
        <div style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: 8, padding: 10, marginBottom: 12, fontSize: 12, color: '#f87171' }}>
          Agent offline — make sure the Tipble agent is running.
        </div>
      )}

      {status && (
        <>
          {/* Creator info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#050d1e', border: '1px solid #0b1e38', borderRadius: 8, padding: 10, marginBottom: 8 }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'rgba(0,200,255,0.08)', border: '1px solid rgba(0,200,255,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 700, color: '#00C8FF', flexShrink: 0
            }}>
              {status.creator?.displayName?.slice(0, 2).toUpperCase() ?? '??'}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#e8f4ff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {status.creator?.displayName ?? 'Unknown Creator'}
              </div>
              <div style={{ fontSize: 11, color: '#5e8fbe', fontFamily: 'monospace' }}>
                {status.creator?.walletAddress
                  ? `${status.creator.walletAddress.slice(0, 6)}...${status.creator.walletAddress.slice(-4)}`
                  : 'No address'}
              </div>
            </div>
            {status.demoMode && (
              <span style={{ marginLeft: 'auto', fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'rgba(239,159,39,0.12)', color: '#EF9F27', border: '1px solid rgba(239,159,39,0.3)', flexShrink: 0 }}>
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
              <div key={m.label} style={{ background: '#050d1e', border: '1px solid #0b1e38', borderRadius: 8, padding: '8px 10px' }}>
                <div style={{ fontSize: 11, color: '#5e8fbe', marginBottom: 2 }}>{m.label}</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#e8f4ff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.value}</div>
              </div>
            ))}
          </div>

          {/* Recent tips */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 10, color: '#5e8fbe', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
              Recent Tips
            </div>
            {recentTips.length === 0 ? (
              <div style={{ fontSize: 12, color: '#122f52', textAlign: 'center', padding: '14px 0' }}>No tips yet</div>
            ) : (
              recentTips.map(tip => (
                <div key={tip.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid #0b1e38', fontSize: 12 }}>
                  <span style={{ color: '#3a6a96', whiteSpace: 'nowrap', fontSize: 10 }}>
                    {new Date(tip.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#88b0d6' }}>
                    {tip.reason}
                  </span>
                  <span style={{ color: '#00C8FF', whiteSpace: 'nowrap', fontWeight: 600, fontSize: 11 }}>
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
        <div style={{ fontSize: 12, color: tipResult.startsWith('✓') ? '#00C8FF' : '#f87171', marginBottom: 8, textAlign: 'center' }}>
          {tipResult}
        </div>
      )}

      {/* Send Tip */}
      {showTipForm ? (
        <div style={{ background: '#050d1e', border: '1px solid #0b1e38', borderRadius: 8, padding: 10 }}>
          <div style={{ fontSize: 11, color: '#5e8fbe', marginBottom: 6 }}>Reason for tip</div>
          <input
            value={tipReason}
            onChange={e => setTipReason(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSendTip()}
            placeholder="e.g. Great stream content"
            autoFocus
            style={{
              width: '100%', boxSizing: 'border-box',
              background: '#020810', border: '1px solid #0b1e38',
              borderRadius: 6, padding: '8px 10px',
              color: '#e8f4ff', fontSize: 13, marginBottom: 8, outline: 'none'
            }}
          />
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={() => { setShowTipForm(false); setTipReason('') }}
              style={{ flex: 1, padding: '8px 0', background: '#0b1e38', border: '1px solid #122f52', borderRadius: 6, color: '#5e8fbe', cursor: 'pointer', fontSize: 12 }}
            >
              Cancel
            </button>
            <button
              onClick={handleSendTip}
              disabled={tipping || !tipReason.trim()}
              style={{
                flex: 2, padding: '8px 0',
                background: tipping || !tipReason.trim() ? 'rgba(239,159,39,0.3)' : '#EF9F27',
                border: 'none', borderRadius: 6,
                color: tipping || !tipReason.trim() ? '#5e8fbe' : '#020810',
                cursor: tipping ? 'not-allowed' : 'pointer',
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
            background: '#EF9F27', border: 'none', borderRadius: 8,
            color: '#020810', cursor: 'pointer', fontSize: 13, fontWeight: 600
          }}
        >
          Send Manual Tip
        </button>
      )}
    </div>
  )
}
