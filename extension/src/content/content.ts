import './content.css'

// ─── Badge ───────────────────────────────────────────────────────────────────

function injectBadge(): void {
  if (document.getElementById('tipble-badge')) return

  const player =
    document.querySelector('.rumble-player') ??
    document.querySelector('video')?.closest('div') ??
    document.querySelector('video')?.parentElement

  if (!player) {
    const observer = new MutationObserver(() => {
      const found =
        document.querySelector('.rumble-player') ??
        document.querySelector('video')?.closest('div') ??
        document.querySelector('video')?.parentElement

      if (found) {
        observer.disconnect()
        mountBadge(found as HTMLElement)
      }
    })
    observer.observe(document.body, { childList: true, subtree: true })
    return
  }

  mountBadge(player as HTMLElement)
}

function mountBadge(container: HTMLElement): void {
  if (document.getElementById('tipble-badge')) return

  if (getComputedStyle(container).position === 'static') {
    container.style.position = 'relative'
  }

  const badge = document.createElement('div')
  badge.id = 'tipble-badge'
  badge.innerHTML = '🦞 Tipble Active'
  container.appendChild(badge)

  let seconds = 0
  setInterval(() => {
    seconds++
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`
    badge.innerHTML = `🦞 Tipble ⏱ ${timeStr}`
  }, 1000)
}

// ─── Toast ───────────────────────────────────────────────────────────────────

function showTipToast(tip: any): void {
  const existing = document.getElementById('tipble-toast')
  if (existing) existing.remove()

  const toast = document.createElement('div')
  toast.id = 'tipble-toast'
  toast.innerHTML = `
    <div class="tipble-toast-header">🦞 Tip Sent!</div>
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

  if (running) {
    badge.style.borderColor = 'rgba(93, 202, 165, 0.4)'
    badge.dataset.offline = 'false'
    badge.innerHTML = '🦞 Tipble Active'
  } else {
    badge.style.borderColor = 'rgba(255,255,255,0.15)'
    badge.dataset.offline = 'true'
    badge.innerHTML = '🦞 Tipble Offline'
    const dot = badge.querySelector<HTMLElement>('::before')
    // CSS handles the dot; just mute the color via a class
    badge.classList.add('tipble-offline')
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

// ─── SPA navigation ──────────────────────────────────────────────────────────

function isVideoPage(): boolean {
  return /\/(v|live)\//.test(location.pathname)
}

function onNavigate(): void {
  if (isVideoPage()) {
    // Small delay to let the new page's DOM settle
    setTimeout(injectBadge, 800)
  }
}

const originalPushState = history.pushState.bind(history)
history.pushState = function (...args) {
  originalPushState(...args)
  onNavigate()
}

window.addEventListener('popstate', onNavigate)

// ─── Init ────────────────────────────────────────────────────────────────────

if (isVideoPage()) {
  injectBadge()
}
