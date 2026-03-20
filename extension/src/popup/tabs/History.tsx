import React, { useState, useEffect } from 'react'
import type { TipEvent } from '../../types'

const EVENT_BADGES: Record<string, { label: string; color: string; bg: string }> = {
  milestone:    { label: 'Milestone', color: '#a78bfa', bg: '#1e1040' },
  new_sub:      { label: 'Sub',       color: '#5dcaa5', bg: '#0d2d1e' },
  viewer_spike: { label: 'Spike',     color: '#f59e0b', bg: '#2d1f00' },
  manual:       { label: 'Manual',    color: '#9ca3af', bg: '#1a1a1a' }
}

function getExplorerUrl(txHash: string, network: string): string {
  if (network === 'polygon') return `https://polygonscan.com/tx/${txHash}`
  return `https://sepolia.etherscan.io/tx/${txHash}`
}

export default function History() {
  const [tips, setTips] = useState<TipEvent[]>([])
  const [network, setNetwork] = useState('sepolia')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (result) => {
      if (result?.cachedStatus) {
        setTips(result.cachedStatus.recentTips?.slice(0, 20) ?? [])
        setNetwork(result.cachedStatus.network ?? 'sepolia')
      }
      setLoading(false)
    })
  }, [])

  if (loading) {
    return <div style={{ textAlign: 'center', color: '#444', padding: '32px 0', fontSize: 13 }}>Loading...</div>
  }

  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#ccc', marginBottom: 10 }}>
        Tip History
        {tips.length > 0 && (
          <span style={{ marginLeft: 6, fontSize: 11, color: '#444', fontWeight: 400 }}>
            ({tips.length} tips)
          </span>
        )}
      </div>

      {tips.length === 0 ? (
        <div style={{ fontSize: 12, color: '#333', textAlign: 'center', padding: '32px 0' }}>No tips yet</div>
      ) : (
        <div>
          {/* Header row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 0 6px', borderBottom: '1px solid #1a1a1a', marginBottom: 2 }}>
            <span style={{ fontSize: 10, color: '#333', minWidth: 36 }}>Time</span>
            <span style={{ fontSize: 10, color: '#333', minWidth: 60 }}>Event</span>
            <span style={{ fontSize: 10, color: '#333', flex: 1 }}>Amount</span>
            <span style={{ fontSize: 10, color: '#333' }}>Tx</span>
          </div>

          {tips.map(tip => {
            const badge = EVENT_BADGES[tip.eventType] ?? EVENT_BADGES.manual
            return (
              <div
                key={tip.id}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 0', borderBottom: '1px solid #0f0f0f' }}
              >
                <span style={{ fontSize: 10, color: '#444', whiteSpace: 'nowrap', minWidth: 36 }}>
                  {new Date(tip.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>

                <span style={{
                  fontSize: 9, padding: '2px 5px', borderRadius: 3,
                  background: badge.bg, color: badge.color,
                  whiteSpace: 'nowrap', fontWeight: 600, minWidth: 60,
                  textAlign: 'center'
                }}>
                  {badge.label}
                </span>

                <span style={{ flex: 1, fontSize: 12, color: '#5dcaa5', fontWeight: 600, whiteSpace: 'nowrap' }}>
                  {tip.amount} {tip.asset}
                </span>

                {tip.txHash ? (
                  <a
                    href={getExplorerUrl(tip.txHash, network)}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: '#444', fontSize: 10, fontFamily: 'monospace', textDecoration: 'none', whiteSpace: 'nowrap' }}
                  >
                    {tip.txHash.slice(0, 5)}...{tip.txHash.slice(-3)} ↗
                  </a>
                ) : (
                  <span style={{ color: '#2a2a2a', fontSize: 10 }}>—</span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
