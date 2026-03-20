import { getSettings } from '../lib/storage.js'
import { fetchStatus } from '../lib/api.js'
import type { AgentStatus, TipEvent } from '../types/index.js'

let lastTipCount = 0
let lastTipId = ''

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create('pollAgent', {
    periodInMinutes: 0.17 // ~10 seconds
  })
  console.log('[Tipble] Background worker started')
})

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== 'pollAgent') return

  const settings = await getSettings()
  if (!settings.autoTippingEnabled) return

  try {
    const status = await fetchStatus()

    if (status.recentTips.length > 0) {
      const latestTip = status.recentTips[0]

      if (latestTip.id !== lastTipId && lastTipId !== '') {
        const [tab] = await chrome.tabs.query({
          active: true,
          currentWindow: true
        })

        if (tab?.id && tab.url?.includes('rumble.com')) {
          chrome.tabs.sendMessage(tab.id, {
            type: 'TIP_FIRED',
            tip: latestTip,
            status: {
              tipsCount: status.tipsCount,
              totalTipped: status.totalTipped,
              network: status.network
            }
          })
        }

        if (settings.showNotifications) {
          chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon48.png',
            title: '🦞 Tipble — Tip Sent!',
            message: `${latestTip.amount} ${latestTip.asset} → ${status.creator.displayName} | ${latestTip.reason}`
          })
        }
      }

      lastTipId = latestTip.id
    }

    lastTipCount = status.tipsCount

    chrome.action.setBadgeText({
      text: status.tipsCount > 0 ? status.tipsCount.toString() : ''
    })
    chrome.action.setBadgeBackgroundColor({ color: '#5dcaa5' })

    chrome.storage.local.set({
      cachedStatus: status,
      lastPolled: Date.now()
    })
  } catch (err) {
    chrome.action.setBadgeText({ text: '!' })
    chrome.action.setBadgeBackgroundColor({ color: '#E24B4A' })
    chrome.storage.local.set({
      cachedStatus: null,
      agentOffline: true
    })
  }
})

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_STATUS') {
    chrome.storage.local.get(['cachedStatus', 'lastPolled'], (result) =>
      sendResponse(result)
    )
    return true
  }

  if (message.type === 'PAUSE_AGENT') {
    getSettings().then((s) => {
      fetch(`${s.agentApiUrl}/api/agent/pause`, { method: 'POST' }).then(() =>
        sendResponse({ success: true })
      )
    })
    return true
  }

  if (message.type === 'RESUME_AGENT') {
    getSettings().then((s) => {
      fetch(`${s.agentApiUrl}/api/agent/resume`, { method: 'POST' }).then(() =>
        sendResponse({ success: true })
      )
    })
    return true
  }
})
