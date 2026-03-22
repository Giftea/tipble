import './content.css'

// ─── Types ────────────────────────────────────────────────────────────────────

interface DOMStreamState {
  watchingNow: number
  creatorName: string
  isLive: boolean
  pageUrl: string
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
    chrome.runtime.sendMessage({
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
        chrome.runtime.sendMessage({
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
  const watchingSelectors = [
    '.watching-now',
    '[class*="watching"]',
    '[class*="viewers"]',
    '[class*="viewer-count"]',
    '.live-watching',
  ]

  let watchingNow = 0
  for (const selector of watchingSelectors) {
    const el = document.querySelector(selector)
    if (el?.textContent) {
      const num = parseInt(el.textContent.replace(/[^0-9]/g, ''))
      if (num > 0) { watchingNow = num; break }
    }
  }

  if (watchingNow === 0) {
    const allText = document.querySelectorAll('span, div, p')
    for (const el of allText) {
      const text = el.textContent?.trim() ?? ''
      if (text.match(/^\d+\s*(watching|viewers)/i)) {
        watchingNow = parseInt(text) || 0
        if (watchingNow > 0) break
      }
    }
  }

  const liveBadge = document.querySelector('[class*="live"], .live-badge, [class*="is-live"]')
  const isLive = !!liveBadge ||
    document.title.toLowerCase().includes('live') ||
    window.location.href.includes('/live/')

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
    if (!isVideoPage()) return

    const curr = scrapeStreamState()
    const now = Date.now()

    if (now - lastSentTime < 10000) return
    if (!curr.isLive && curr.watchingNow === 0) return

    let eventType: string | null = null
    if (prevState && curr.watchingNow > 0) {
      const ratio = curr.watchingNow / Math.max(prevState.watchingNow, 1)
      if (ratio >= 1.5 && prevState.watchingNow >= 5) {
        eventType = 'viewer_spike'
      }
      if (curr.watchingNow >= 500 && prevState.watchingNow < 500) {
        eventType = 'watching_now_threshold'
      }
    }

    chrome.runtime.sendMessage({
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

// Detect creator wallet and start stream monitor on video pages
if (isVideoPage()) {
  injectBadge()
  tryDetectCreatorWallet()
  monitorStreamDOM()
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
      tryDetectCreatorWallet()
    } else {
      chrome.runtime.sendMessage({ type: 'CLEAR_CREATOR_WALLET' })
    }
  }
}).observe(document, { subtree: true, childList: true })
