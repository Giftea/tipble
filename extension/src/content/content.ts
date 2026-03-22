import './content.css'

// ─── Types ────────────────────────────────────────────────────────────────────

interface DOMStreamState {
  watchingNow: number
  creatorName: string
  isLive: boolean
  pageUrl: string
}

// ─── Extension safety helpers ─────────────────────────────────────────────────

function isExtensionValid(): boolean {
  try {
    return !!chrome.runtime?.id
  } catch(e) {
    return false
  }
}

function safeSendMessage(message: any): void {
  try {
    chrome.runtime.sendMessage(message, (_response) => {
      if (chrome.runtime.lastError) {
        // Extension context invalidated — ignore
        return
      }
    })
  } catch(e) {
    // Extension reloaded — content script needs page refresh to reconnect
    // Silently ignore
  }
}

// ─── Watch time state ─────────────────────────────────────────────────────────

let watchSeconds = 0
let watchTimerFired = false
let isVideoPlaying = false

// ─── Live detection ───────────────────────────────────────────────────────────

function detectIsLiveStream(): boolean {
  return !!document.querySelector('.video-header-live-info') ||
         !!document.querySelector('.live-video-view-count-status')
}

let currentlyLive = false

function scrapeViewerCount(): number {
  const el = document.querySelector('.live-video-view-count-status-count')
  if (!el) return 0
  const fromTitle = el.getAttribute('title')?.match(/^(\d+)/)
  if (fromTitle) return parseInt(fromTitle[1])
  return parseInt(el.textContent?.trim() ?? '0') || 0
}

function updateBadgeStyle(isLive: boolean): void {
  const badge = document.getElementById('tipble-badge')
  if (!badge) return
  const dot = badge.querySelector('span')
  if (dot) dot.style.background = isLive ? '#ef4444' : '#5dcaa5'
}

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

  const isLive = detectIsLiveStream()

  if (isLive) {
    dot.style.background = '#DC2626'
  }

  badge.prepend(dot)

  const textNode = document.createTextNode(
    isLive ? ' Tipble ● LIVE ⏱ 0:00' : ' Tipble Active ⏱ 0:00'
  )
  badge.appendChild(textNode)

  document.documentElement.appendChild(badge)

  let seconds = 0
  const timer = setInterval(() => {
    if (!document.getElementById('tipble-badge')) {
      clearInterval(timer)
      return
    }
    seconds++
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    const timerStr = `${mins}:${secs.toString().padStart(2, '0')}`
    const node = badge.lastChild
    if (!node) return
    if (currentlyLive) {
      const viewers = scrapeViewerCount()
      const duration = document.querySelector('.live-video-view-count-status-duration')?.textContent?.trim() ?? timerStr
      node.textContent = ` Tipble ● LIVE  👁 ${viewers}  ⏱ ${duration}`
    } else {
      node.textContent = ` Tipble Active ⏱ ${timerStr}`
    }
  }, 1000)
}

// ─── Creator wallet detection ─────────────────────────────────────────────────

async function detectCreatorWallet(): Promise<{ evm: string | null; btc: string | null; displayName: string }> {
  // Step 1 - Find tip button (wildcard match)
  const tipButton =
    document.querySelector('button[hx-get*="qr-modal"]') ||
    document.querySelector('[hx-get*="qr-modal"]')
  if (!tipButton) return { evm: null, btc: null, displayName: 'Rumble Creator' }

  // Step 2 - Extract eid
  const hxValsRaw = tipButton.getAttribute('hx-vals')
  const hxVals = JSON.parse(hxValsRaw || '{}')
  const eid = hxVals.eid
  const dt = hxVals.dt
  if (!eid) return { evm: null, btc: null, displayName: 'Rumble Creator' }

  // Step 3 - Fetch QR modal
  const modalUrl =
    `https://rumble.com/-htmx/wallet/payment/qr-modal` +
    `?eid=${eid}&dt=${dt}`

  try {
    const modalRes = await fetch(modalUrl, { credentials: 'include' })
    const modalHtml = await modalRes.text()

    // Step 3b - Extract creator display name
    const nameMatch = modalHtml.match(/title="([^"]+)"/)
    const creatorName = (
      nameMatch?.[1] &&
      nameMatch[1] !== 'Close Modal' &&
      nameMatch[1].length > 1 &&
      nameMatch[1].length < 60
    ) ? nameMatch[1] : 'Rumble Creator'
    console.log('[Tipble] Creator name:', creatorName)

    // Step 4 - Extract payment_url (try two patterns)
    const paymentUrlMatch =
      modalHtml.match(/payment_url&#34;:&#34;(https:\/\/pay\.rumble\.com\/\?[^&]*(?:&amp;[^&"']*)*)/) ??
      modalHtml.match(/href="(https:\/\/pay\.rumble\.com\/\?[^"]+)"/)
    if (!paymentUrlMatch) return { evm: null, btc: null, displayName: creatorName }

    const paymentUrl = paymentUrlMatch[1]
      .replace(/&amp;/g, '&')
      .replace(/&#34;/g, '')
      .replace(/;}/g, '')
      .trim()

    // Step 5 - Fetch network selector
    const networkUrl =
      `https://rumble.com/-htmx/wallet/payment/qr-address` +
      `?action=select-network&payment_url=${encodeURIComponent(paymentUrl)}`

    const networkRes = await fetch(networkUrl, { credentials: 'include' })
    const networkHtml = await networkRes.text()

    // Step 6 - Parse all hx-vals buttons, collect addresses with blockchain/currency
    const allHxVals = networkHtml.match(/hx-vals='([^']+)'/g) ||
                      networkHtml.match(/hx-vals="([^"]+)"/g) || []

    const addresses: Array<{ address: string; blockchain: string; currency: string }> = []

    for (const hxVal of allHxVals) {
      const decoded = hxVal
        .replace(/hx-vals='|hx-vals="/g, '')
        .replace(/'$|"$/, '')
        .replace(/&amp;/g, '&')
        .replace(/&#34;/g, '"')
        .replace(/&quot;/g, '"')
      try {
        const parsed = JSON.parse(decoded)
        if (parsed.address && parsed.blockchain) {
          addresses.push({
            address: parsed.address,
            blockchain: parsed.blockchain,
            currency: parsed.currency ?? ''
          })
        }
      } catch {
        // skip malformed vals
      }
    }

    // Step 6b - Priority: polygon/usdt > ethereum/usdt > arbitrum/usdt > any EVM
    const priority = [
      (a: { blockchain: string; currency: string }) => a.blockchain === 'polygon'  && a.currency === 'usdt',
      (a: { blockchain: string; currency: string }) => a.blockchain === 'ethereum' && a.currency === 'usdt',
      (a: { blockchain: string; currency: string }) => a.blockchain === 'arbitrum' && a.currency === 'usdt',
      (a: { address: string })                      => a.address?.startsWith('0x'),
    ]

    let evmAddress: string | null = null
    for (const check of priority) {
      const found = addresses.find(check as (a: { address: string; blockchain: string; currency: string }) => boolean)
      if (found) { evmAddress = found.address; break }
    }

    // Fallback to regex match if hx-vals parsing found nothing
    if (!evmAddress) {
      const evmMatch = networkHtml.match(
        /(?:"address"|&#34;address&#34;)\s*:\s*(?:"|&#34;)(0x[a-fA-F0-9]{40})(?:"|&#34;)/
      )
      evmAddress = evmMatch?.[1] ?? null
    }

    const btcAddress =
      addresses.find(a => a.address?.startsWith('bc1'))?.address ??
      networkHtml.match(
        /(?:"address"|&#34;address&#34;)\s*:\s*(?:"|&#34;)(bc1[a-zA-HJ-NP-Z0-9]{25,90})(?:"|&#34;)/
      )?.[1] ?? null

    return { evm: evmAddress, btc: btcAddress, displayName: creatorName }
  } catch {
    return { evm: null, btc: null, displayName: 'Rumble Creator' }
  }
}

// ─── Retry wallet detection ───────────────────────────────────────────────────

async function tryDetectCreatorWallet(): Promise<void> {
  const MAX_ATTEMPTS = 10
  const RETRY_INTERVAL = 2000

  const videoId = window.location.pathname.split('/').find(s => s.length > 5) ??
    window.location.pathname
  const cacheKey = `creator_${videoId}`

  // Clear old cache to force fresh detection
  await chrome.storage.local.remove(cacheKey)

  // Use cached address if available
  const cached = await chrome.storage.local.get(cacheKey)
  if (cached[cacheKey]) {
    const entry = cached[cacheKey] as { evm: string | null; btc: string | null; displayName?: string }
    safeSendMessage({
      type: 'CREATOR_WALLET_DETECTED',
      addresses: { evm: entry.evm, btc: entry.btc },
      creatorName: entry.displayName ?? 'Rumble Creator',
      pageUrl: window.location.href
    })
    return
  }

  let attempts = 0

  const attempt = async () => {
    attempts++

    const tipButton =
      document.querySelector('button[hx-get*="qr-modal"]') ||
      document.querySelector('[hx-get*="qr-modal"]')

    if (tipButton) {
      const result = await detectCreatorWallet()
      if (result.evm || result.btc) {
        await chrome.storage.local.set({ [cacheKey]: result })
        safeSendMessage({
          type: 'CREATOR_WALLET_DETECTED',
          addresses: { evm: result.evm, btc: result.btc },
          creatorName: result.displayName,
          pageUrl: window.location.href
        })
        const badge = document.getElementById('tipble-badge')
        if (badge && result.evm) {
          badge.title = `Tipping: ${result.evm.slice(0, 6)}...${result.evm.slice(-4)}`
        }
        return
      }
    }

    if (attempts < MAX_ATTEMPTS) {
      setTimeout(attempt, RETRY_INTERVAL)
    }
  }

  setTimeout(attempt, 1000)
}

// ─── DOM stream monitor ───────────────────────────────────────────────────────

function scrapeStreamState(): DOMStreamState {
  const watchingNow = scrapeViewerCount()

  const isLive = detectIsLiveStream()

  const creatorSelectors = [
    '.creator-name',
    '[class*="channel-name"]',
    '[class*="username"]',
    'h1[class*="title"] + * [class*="name"]',
  ]
  let creatorName = 'Unknown'
  for (const selector of creatorSelectors) {
    const el = document.querySelector(selector)
    if (el?.textContent?.trim()) {
      creatorName = el.textContent.trim()
      break
    }
  }

  return { watchingNow, creatorName, isLive, pageUrl: window.location.href }
}

function monitorStreamDOM(): void {
  let prevState: DOMStreamState | null = null
  let lastSentTime = 0

  const check = () => {
    if (!isExtensionValid()) return
    if (!isVideoPage()) return

    const curr = scrapeStreamState()
    const now = Date.now()

    if (now - lastSentTime < 10000) return
    if (!detectIsLiveStream() && curr.watchingNow === 0) return

    let eventType: string | null = null
    if (prevState && curr.watchingNow > 0) {
      if (curr.watchingNow >= prevState.watchingNow * 1.5 && prevState.watchingNow >= 5) {
        eventType = 'viewer_spike'
      } else if (curr.watchingNow > prevState.watchingNow && prevState.watchingNow > 0) {
        eventType = 'new_viewer'
      }
    }

    safeSendMessage({
      type: 'DOM_STREAM_UPDATE',
      state: curr,
      eventType,
      prevWatching: prevState?.watchingNow ?? 0
    })

    prevState = curr
    lastSentTime = now
  }

  setInterval(check, 10000)
  setTimeout(check, 3000)
}

// ─── Live status polling ──────────────────────────────────────────────────────

function checkLiveStatus(): void {
  const isLive = detectIsLiveStream()
  if (isLive === currentlyLive) return

  currentlyLive = isLive

  if (isLive) {
    injectLiveBanner()
    updateBadgeStyle(true)
    console.log('[Tipble] Livestream detected')
  } else {
    updateBadgeStyle(false)
    document.getElementById('tipble-live-banner')?.remove()
    console.log('[Tipble] Stream ended — now VOD')
  }
}

// ─── Watch time tracking ──────────────────────────────────────────────────────

function setupWatchTimeTracking(): void {
  const video = document.querySelector('video')
  if (!video) {
    setTimeout(setupWatchTimeTracking, 2000)
    return
  }

  video.addEventListener('play', () => { isVideoPlaying = true })
  video.addEventListener('pause', () => { isVideoPlaying = false })

  setInterval(() => {
    if (!isExtensionValid()) return
    if (!isVideoPlaying) return
    watchSeconds++
    ;(async () => {
      const config = await chrome.storage.local.get('tipbleRules')
      const rules = config.tipbleRules as { watchTime?: { thresholdMinutes?: number } } | undefined
      const thresholdSeconds = (rules?.watchTime?.thresholdMinutes ?? 30) * 60
      if (watchSeconds >= thresholdSeconds && !watchTimerFired) {
        watchTimerFired = true
        safeSendMessage({
          type: 'WATCH_TIME_REACHED',
          watchSeconds,
          pageUrl: window.location.href
        })
      }
    })()
  }, 1000)
}

// ─── Subscribe detection ──────────────────────────────────────────────────────

function setupSubscribeDetection(): void {
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement
    const button = target.closest('button')
    if (!button) return

    const text = button.textContent?.trim().toLowerCase() ?? ''
    const isSubscribeClick =
      text.includes('subscribe') ||
      text.includes('rumble premium') ||
      button.classList.toString().includes('subscribe')

    if (isSubscribeClick) {
      setTimeout(() => {
        safeSendMessage({
          type: 'SUBSCRIBER_ACTION_DETECTED',
          pageUrl: window.location.href
        })
      }, 1000)
    }
  })
}

// ─── Live banner ──────────────────────────────────────────────────────────────

function injectLiveBanner(): void {
  if (!detectIsLiveStream()) return

  const existing = document.getElementById('tipble-live-banner')
  if (existing) existing.remove()

  const banner = document.createElement('div')
  banner.id = 'tipble-live-banner'
  banner.setAttribute('style', [
    'position: fixed',
    'top: 20px',
    'left: 50%',
    'transform: translateX(-50%)',
    'z-index: 2147483647',
    'background: rgba(220, 38, 38, 0.9)',
    'color: white',
    'padding: 6px 16px',
    'border-radius: 20px',
    'font-size: 13px',
    'font-family: -apple-system, sans-serif',
    'font-weight: 600',
    'display: flex',
    'align-items: center',
    'gap: 8px',
    'pointer-events: none',
    'animation: tipble-pulse-red 2s infinite'
  ].join('; '))

  banner.innerHTML = `
    <span style="width:8px;height:8px;border-radius:50%;background:white;display:inline-block;flex-shrink:0"></span>
    LIVESTREAM DETECTED — Tipble Active
  `

  document.documentElement.appendChild(banner)

  setTimeout(() => {
    banner.style.opacity = '0'
    banner.style.transition = 'opacity 0.5s'
    setTimeout(() => banner.remove(), 500)
  }, 5000)
}

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

// ─── Init ────────────────────────────────────────────────────────────────────

// Run immediately
injectBadge()

// Also run after DOM is fully loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectBadge)
} else {
  injectBadge()
}

// Detect creator wallet and start monitors on video pages
if (isVideoPage()) {
  injectBadge()
  tryDetectCreatorWallet()
  monitorStreamDOM()
  setupWatchTimeTracking()
  setupSubscribeDetection()
  setTimeout(checkLiveStatus, 3000)
  setInterval(checkLiveStatus, 30000)
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
      watchSeconds = 0
      watchTimerFired = false
      currentlyLive = false
      setTimeout(injectBadge, 1000)
      tryDetectCreatorWallet()
      setTimeout(checkLiveStatus, 3000)
    } else {
      safeSendMessage({ type: 'CLEAR_CREATOR_WALLET' })
    }
  }
}).observe(document, { subtree: true, childList: true })
