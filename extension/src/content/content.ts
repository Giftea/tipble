console.log('[Tipble] Content script loaded on:', window.location.href)

import './content.css'

// ─── Page detection ───────────────────────────────────────────────────────────

function isVideoPage(): boolean {
  const path = window.location.pathname
  return (
    path.startsWith('/v') ||
    path.includes('/live/') ||
    path.match(/\/[a-z0-9]+-.*\.html/) !== null
  )
}

// ─── Badge ───────────────────────────────────────────────────────────────────

function injectBadge() {
  if (!isVideoPage()) {
    const existing = document.getElementById('tipble-badge')
    if (existing) existing.remove()
    return
  }

  const existing = document.getElementById('tipble-badge')
  if (existing) existing.remove()

  const badge = document.createElement('div')
  badge.id = 'tipble-badge'
  badge.textContent = '🦞 Tipble Active'

  badge.setAttribute('style', [
    'position: fixed',
    'top: 80px',
    'right: 20px',
    'z-index: 2147483647',
    'background: rgba(0, 0, 0, 0.85)',
    'color: #ffffff',
    'padding: 6px 14px',
    'border-radius: 20px',
    'font-size: 13px',
    'font-family: -apple-system, sans-serif',
    'font-weight: 500',
    'border: 1px solid rgba(93, 202, 165, 0.6)',
    'pointer-events: none',
    'display: flex',
    'align-items: center',
    'gap: 6px',
    'box-shadow: 0 2px 8px rgba(0,0,0,0.5)'
  ].join('; '))

  const dot = document.createElement('span')
  dot.setAttribute('style', [
    'width: 7px',
    'height: 7px',
    'border-radius: 50%',
    'background: #5dcaa5',
    'display: inline-block',
    'flex-shrink: 0'
  ].join('; '))

  badge.prepend(dot)

  document.documentElement.appendChild(badge)
  console.log('[Tipble] Badge injected, element:', badge)

  let seconds = 0
  const timer = setInterval(() => {
    if (!document.getElementById('tipble-badge')) {
      clearInterval(timer)
      return
    }
    seconds++
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    const time = `${mins}:${secs.toString().padStart(2, '0')}`
    const textNode = badge.lastChild
    if (textNode) textNode.textContent = ` Tipble ⏱ ${time}`
  }, 1000)
}

// Run immediately
injectBadge()

// Also run after DOM is fully loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectBadge)
} else {
  injectBadge()
}

// Re-inject on Rumble SPA navigation
let lastUrl = location.href
new MutationObserver(() => {
  const url = location.href
  if (url !== lastUrl) {
    lastUrl = url
    const existing = document.getElementById('tipble-badge')
    if (existing) existing.remove()

    if (isVideoPage()) {
      setTimeout(injectBadge, 1000)
    }
  }
}).observe(document, { subtree: true, childList: true })

// ─── Toast ───────────────────────────────────────────────────────────────────

function showTipToast(tip: any): void {
  const existing = document.getElementById('tipble-toast')
  if (existing) existing.remove()

  const toast = document.createElement('div')
  toast.id = 'tipble-toast'
  toast.innerHTML = `
    <div class="tipble-toast-header"><img src="${chrome.runtime.getURL('icons/logo.svg')}" alt="Tipble" style="height:13px;width:auto;vertical-align:middle;margin-right:5px;">Tip Sent!</div>
    <div class="tipble-toast-amount">${tip.amount} ${tip.asset} → Creator</div>
    <div class="tipble-toast-meta">${tip.reason} · ${tip.txHash.slice(0, 6)}...${tip.txHash.slice(-4)}</div>
  `

  document.body.appendChild(toast)

  setTimeout(() => {
    toast.style.animation = 'tipble-fade-out 0.4s ease-in forwards'
    setTimeout(() => toast.remove(), 400)
  }, 4000)
}

// ─── Badge state ─────────────────────────────────────────────────────────────

function updateBadge(running: boolean): void {
  const badge = document.getElementById('tipble-badge')
  if (!badge) return

  const dot = badge.querySelector('span')
  if (running) {
    badge.style.borderColor = 'rgba(0, 200, 255, 0.6)'
    if (dot) dot.style.background = '#00C8FF'
    badge.lastChild!.textContent = ' Tipble Active'
  } else {
    badge.style.borderColor = 'rgba(255,255,255,0.2)'
    if (dot) dot.style.background = '#5e8fbe'
    badge.lastChild!.textContent = ' Tipble Offline'
  }
}

// ─── Message listener ────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'TIP_FIRED') {
    showTipToast(message.tip)
  }

  if (message.type === 'AGENT_STATUS') {
    updateBadge(message.running)
  }
})
