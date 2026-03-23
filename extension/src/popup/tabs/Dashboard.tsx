import { useState, useEffect } from 'react'
import { sendManualTip, fetchStatus, fetchUsdtBalance } from '../../lib/api'
import { getSeedPhrase, getDemoMode, setDemoMode } from '../../lib/storage'
import type { AgentStatus } from '../../types'

interface CreatorWallet {
  evm: string | null
  btc: string | null
  displayName?: string
}

interface TipSuccess {
  hash: string
  sentTo: string
  amount: string
  asset: string
}

function explorerUrl(hash: string, network: string): string {
  if (network === 'polygon') return `https://polygonscan.com/tx/${hash}`
  if (network === 'base-sepolia') return `https://sepolia.basescan.org/tx/${hash}`
  if (network === 'sepolia') return `https://sepolia.etherscan.io/tx/${hash}`
  return `https://basescan.org/tx/${hash}`
}

type Tab = 'dashboard' | 'rules' | 'history' | 'settings'

export default function Dashboard({ onNavigate, isActive }: { onNavigate: (tab: Tab) => void; isActive: boolean }) {
  const [walletReady, setWalletReady] = useState<boolean | null>(null)
  const [isDemoMode, setIsDemoMode] = useState(false)
  const [status, setStatus] = useState<AgentStatus | null>(null)
  const [offline, setOffline] = useState(false)
  const [creatorWallet, setCreatorWallet] = useState<CreatorWallet | null>(null)
  const [usdtBalance, setUsdtBalance] = useState<string | null>(null)
  const [showTipForm, setShowTipForm] = useState(false)
  const [tipAmount, setTipAmount] = useState('0.50')
  const [tipping, setTipping] = useState(false)
  const [tipError, setTipError] = useState<string | null>(null)
  const [tipSuccess, setTipSuccess] = useState<TipSuccess | null>(null)

  // Re-check wallet whenever the tab becomes active
  useEffect(() => {
    if (!isActive) return
    Promise.all([getSeedPhrase(), getDemoMode()]).then(([seed, demo]) => {
      setIsDemoMode(demo)
      setWalletReady(!!seed || demo)
    })
  }, [isActive])

  // Load data once wallet is ready
  useEffect(() => {
    if (!walletReady) return
    fetchStatus()
      .then(s => { setStatus(s); setOffline(false) })
      .catch(() => setOffline(true))
    fetchUsdtBalance().then(r => setUsdtBalance(r.balance)).catch(() => {})
    chrome.storage.local.get(['currentCreatorWallet'], (data) => {
      if (data.currentCreatorWallet) setCreatorWallet(data.currentCreatorWallet as CreatorWallet)
    })
  }, [walletReady])


  function resetForm() {
    setTipAmount('0.50')
    setTipError(null)
    setTipSuccess(null)
    setShowTipForm(false)
  }

  async function handleSendTip() {
    setTipping(true)
    setTipError(null)
    setTipSuccess(null)
    try {
      const result = await sendManualTip('Manual tip', tipAmount, 'USDT')
      if (result.success && result.hash) {
        setTipSuccess({
          hash: result.hash,
          sentTo: result.sentTo ?? creatorWallet?.evm ?? '',
          amount: result.amount ?? tipAmount,
          asset: result.asset ?? 'USDT'
        })
        fetchStatus().then(setStatus).catch(() => {})
        fetchUsdtBalance().then(r => setUsdtBalance(r.balance)).catch(() => {})
        setTimeout(resetForm, 3000)
      } else {
        setTipError(result.error ?? 'Tip failed')
      }
    } catch {
      setTipError('Could not reach agent')
    }
    setTipping(false)
  }

  async function handleUseDemoWallet() {
    await setDemoMode(true)
    setIsDemoMode(true)
    setWalletReady(true)
  }

  const recentTips = status?.recentTips?.slice(0, 5) ?? []

  // Loading
  if (walletReady === null) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '60px 0' }}>
        <div style={{ fontSize: 12, color: '#3a6a96' }}>Loading...</div>
      </div>
    )
  }

  // Onboarding — no wallet set up
  if (!walletReady) {
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <img src="icons/logo.svg" alt="Tipble" style={{ height: 22, width: 'auto' }} />
        </div>

        <div style={{ background: '#050d1e', border: '1px solid #0b1e38', borderRadius: 10, padding: 16, marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#e8f4ff', marginBottom: 4 }}>Welcome to Tipble</div>
          <div style={{ fontSize: 12, color: '#5e8fbe', lineHeight: 1.5 }}>
            Connect a wallet to start tipping creators with your own funds, or use demo mode to try it out.
          </div>
        </div>

        {/* Metrics placeholder */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 14 }}>
          {[
            { label: 'Tips Fired', value: '0' },
            { label: 'Total Tipped', value: '0 USDT' },
            { label: 'Network', value: '—' }
          ].map(m => (
            <div key={m.label} style={{ background: '#050d1e', border: '1px solid #0b1e38', borderRadius: 8, padding: '8px 10px', opacity: 0.5 }}>
              <div style={{ fontSize: 11, color: '#5e8fbe', marginBottom: 2 }}>{m.label}</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#e8f4ff' }}>{m.value}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            onClick={() => onNavigate('settings')}
            style={{
              width: '100%', padding: '11px 0',
              background: '#00C8FF', border: 'none', borderRadius: 8,
              color: '#020810', cursor: 'pointer', fontSize: 13, fontWeight: 600
            }}
          >
            Setup Wallet
          </button>
          <button
            onClick={handleUseDemoWallet}
            style={{
              width: '100%', padding: '11px 0',
              background: 'transparent', border: '1px solid #0b1e38', borderRadius: 8,
              color: '#5e8fbe', cursor: 'pointer', fontSize: 13
            }}
          >
            Use Demo Wallet
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <img src="icons/logo.svg" alt="Tipble" style={{ height: 22, width: 'auto' }} />
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {isDemoMode && (
            <span style={{
              fontSize: 10, padding: '2px 7px', borderRadius: 10,
              background: 'rgba(239,159,39,0.12)', color: '#EF9F27',
              border: '1px solid rgba(239,159,39,0.3)'
            }}>
              Demo
            </span>
          )}
          <span style={{
            fontSize: 11, padding: '3px 8px', borderRadius: 20,
            background: offline ? 'rgba(248,113,113,0.12)' : 'rgba(0,200,255,0.1)',
            color: offline ? '#f87171' : '#00C8FF',
            border: `1px solid ${offline ? 'rgba(248,113,113,0.3)' : 'rgba(0,200,255,0.3)'}`
          }}>
            {offline ? 'Offline' : 'Active'}
          </span>
        </div>
      </div>

      {offline && (
        <div style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: 8, padding: 10, marginBottom: 12, fontSize: 12, color: '#f87171' }}>
          Agent offline — make sure the Tipble agent is running.
        </div>
      )}

      {/* Creator wallet detection status */}
      {creatorWallet?.evm ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(0,200,255,0.06)', border: '1px solid rgba(0,200,255,0.2)', borderRadius: 8, padding: '8px 10px', marginBottom: 10 }}>
          <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 10, background: 'rgba(0,200,255,0.1)', color: '#00C8FF', border: '1px solid rgba(0,200,255,0.3)', whiteSpace: 'nowrap' }}>
            ● Wallet detected
          </span>
          <span style={{ fontSize: 11, color: '#e8f4ff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {creatorWallet.displayName ?? 'Rumble Creator'}
          </span>
          <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#3a6a96', marginLeft: 'auto', whiteSpace: 'nowrap' }}>
            {creatorWallet.evm.slice(0, 6)}...{creatorWallet.evm.slice(-4)}
          </span>
        </div>
      ) : (
        <div style={{ background: 'rgba(239,159,39,0.06)', border: '1px solid rgba(239,159,39,0.2)', borderRadius: 8, padding: '8px 10px', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 10, background: 'rgba(239,159,39,0.1)', color: '#EF9F27', border: '1px solid rgba(239,159,39,0.3)' }}>
              No creator wallet
            </span>
          </div>
          <div style={{ fontSize: 11, color: '#5e8fbe', lineHeight: 1.4 }}>
            Visit a Rumble video page with Rumble Wallet enabled to auto-detect creator address
          </div>
        </div>
      )}

      {status && (
        <>

          {/* USDT Balance */}
          {(() => {
            const balNum = usdtBalance != null ? parseFloat(usdtBalance) : null
            const isLow = balNum !== null && balNum < 1
            return (
              <div style={{ background: '#050d1e', border: `1px solid ${isLow ? 'rgba(248,113,113,0.3)' : '#0b1e38'}`, borderRadius: 8, padding: '8px 10px', marginBottom: isLow ? 6 : 8 }}>
                <div style={{ fontSize: 10, color: '#5e8fbe', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Wallet Balance</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  <span style={{ fontSize: 20, fontWeight: 700, color: isLow ? '#f87171' : '#00C8FF', fontVariantNumeric: 'tabular-nums' }}>
                    {balNum != null ? balNum.toFixed(2) : '—'}
                  </span>
                  <span style={{ fontSize: 12, color: '#3a6a96', fontWeight: 600 }}>USDT</span>
                </div>
              </div>
            )
          })()}

          {/* Low balance warning */}
          {usdtBalance != null && parseFloat(usdtBalance) < 1 && (
            <div style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: 8, padding: '8px 10px', marginBottom: 8, fontSize: 11, color: '#f87171' }}>
              {parseFloat(usdtBalance) <= 0
                ? 'Wallet is empty — auto-tipping has been paused. Top up your wallet to resume.'
                : 'Balance is low — top up soon to avoid tipping being paused.'}
            </div>
          )}

          {/* Metrics grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 10 }}>
            {[
              { label: 'Tips Fired', value: status.tipsCount?.toString() ?? '0' },
              { label: 'Total Tipped', value: `${status.totalTipped ?? '0'} USDT` },
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

      {/* Send Tip */}
      {creatorWallet?.evm && (showTipForm ? (
        <div style={{ background: '#050d1e', border: '1px solid #0b1e38', borderRadius: 8, padding: 10 }}>

          {/* Success state */}
          {tipSuccess ? (
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <div style={{ fontSize: 13, color: '#00C8FF', fontWeight: 600, marginBottom: 6 }}>
                ✅ {tipSuccess.amount} {tipSuccess.asset} sent!
              </div>
              <div style={{ fontSize: 11, color: '#5e8fbe', marginBottom: 6 }}>
                → {tipSuccess.sentTo.slice(0, 6)}...{tipSuccess.sentTo.slice(-4)}
              </div>
              <a
                href={explorerUrl(tipSuccess.hash, status?.network ?? 'base')}
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: 10, color: '#3a6a96', fontFamily: 'monospace', textDecoration: 'none' }}
              >
                {tipSuccess.hash.slice(0, 10)}... ↗
              </a>
            </div>
          ) : (
            <>
              {/* Amount row */}
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 11, color: '#5e8fbe', marginBottom: 4 }}>Amount (USDT)</div>
                <input
                  type="number"
                  value={tipAmount}
                  onChange={e => setTipAmount(e.target.value)}
                  min="0.01"
                  step="0.01"
                  placeholder="0.50"
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    background: '#020810', border: '1px solid #0b1e38',
                    borderRadius: 6, padding: '7px 8px',
                    color: '#e8f4ff', fontSize: 13, outline: 'none'
                  }}
                />
              </div>


              {/* Creator address hint / warning */}
              {creatorWallet?.evm ? (
                <div style={{ fontSize: 10, color: '#00C8FF', marginBottom: 8 }}>
                  Tipping: {creatorWallet.evm.slice(0, 6)}...{creatorWallet.evm.slice(-4)}
                </div>
              ) : (
                <div style={{ fontSize: 10, color: '#EF9F27', marginBottom: 8 }}>
                  ⚠ No creator detected. Visit a Rumble video page first.
                </div>
              )}

              {/* Insufficient balance warning */}
              {usdtBalance != null && parseFloat(usdtBalance) < parseFloat(tipAmount || '0') && (
                <div style={{ fontSize: 11, color: '#f87171', marginBottom: 8 }}>
                  Insufficient balance — you have {parseFloat(usdtBalance).toFixed(2)} USDT
                </div>
              )}

              {/* Error */}
              {tipError && (
                <div style={{ fontSize: 11, color: '#f87171', marginBottom: 8 }}>{tipError}</div>
              )}

              {/* Buttons */}
              {(() => {
                const insufficientFunds = usdtBalance != null && parseFloat(usdtBalance) < parseFloat(tipAmount || '0')
                const disabled = tipping || !creatorWallet?.evm || insufficientFunds
                return (
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={resetForm}
                  style={{ flex: 1, padding: '8px 0', background: '#0b1e38', border: '1px solid #122f52', borderRadius: 6, color: '#5e8fbe', cursor: 'pointer', fontSize: 12 }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendTip}
                  disabled={disabled}
                  style={{
                    flex: 2, padding: '8px 0',
                    background: disabled ? 'rgba(239,159,39,0.25)' : '#EF9F27',
                    border: 'none', borderRadius: 6,
                    color: disabled ? '#5e8fbe' : '#020810',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    fontSize: 12, fontWeight: 600
                  }}
                >
                  {tipping ? 'Sending...' : 'Send Tip'}
                </button>
              </div>
                )
              })()}
            </>
          )}
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
      ))}
    </div>
  )
}
