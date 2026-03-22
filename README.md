# 🦞 Tipble

> **Watching should be enough. Tipble makes it so.**

Tipble is an autonomous AI agent that watches Rumble livestreams and automatically tips creators in crypto when meaningful moments happen, follower milestones, new subscribers, viewer spikes, and more. Powered by Tether WDK, Claude AI, and Rumble's native wallet infrastructure.

---

## ✨ Features

- **Autonomous tipping** — AI agent monitors stream events and tips creators without any manual action
- **Claude AI reasoning** — Claude evaluates each event and decides whether it's worth tipping, filtering noise and duplicates
- **Auto wallet detection** — Chrome extension silently detects any Rumble creator's wallet address from the page DOM — no copy-paste required
- **Watch time rewards** — Tip creators after watching their content for a configurable duration (default: 30 minutes)
- **Subscribe detection** — Automatically tips a creator when you click Follow/Subscribe on their page
- **Live stream detection** — Detects active livestreams and shows a live banner with real-time viewer count
- **Configurable rules** — Users set exactly when and how much to tip per event type
- **Self-custodial wallets** — Each user connects their own wallet via seed phrase — your keys, your funds
- **Real on-chain transactions** — Every tip is a verifiable ERC-20 USDT transfer on Base Sepolia (testnet) or Polygon (production)
- **Full dashboard** — Next.js web dashboard with live agent log, tip history, rules editor, and spending controls
- **Chrome extension** — 4-tab popup with dashboard, rules, history, and wallet settings

---

## 🏗 Architecture

```
tipble/
  agent/          ← Node.js autonomous agent (port 3001)
  web/            ← Next.js dashboard (port 3000)
  extension/      ← Chrome Extension MV3
```

### How it works

```
Chrome Extension (content script)
  → Detects creator wallet from Rumble DOM
  → Monitors viewer count, subscribe clicks, watch time
  → Sends events to background service worker
  → Background forwards to agent API

Agent (Node.js + WDK)
  → Receives stream events
  → Calls Claude AI to evaluate each event
  → Claude decides: should we tip? (yes/no + confidence)
  → User's configured rules determine: how much? which asset?
  → WDK sends real ERC-20 transaction on-chain
  → Logs tip to history

Web Dashboard (Next.js)
  → Shows live agent log and activity
  → Rules configuration
  → Tip history with tx links
  → Wallet management
```

### Decision model

Claude's role is **event validation**:

| Responsibility | Owner |
|---|---|
| Should we tip? | Claude AI |
| Which event type? | Claude AI |
| Confidence score | Claude AI |
| How much to tip? | User's rules config |
| Which asset? | User's rules config |
| Send transaction | Tether WDK |

---

## 🛠 Tech Stack

| Component | Technology |
|---|---|
| Wallet & transactions | Tether WDK (`@tetherto/wdk`, `@tetherto/wdk-wallet-evm`) |
| AI reasoning | Anthropic Claude Sonnet 4 |
| Agent backend | Node.js + TypeScript |
| Web dashboard | Next.js 14 + shadcn/ui + Tailwind |
| Chrome extension | MV3 + React + Webpack |
| Network (testnet) | Base Sepolia (Chain ID: 84532) |
| Network (production) | Polygon mainnet |
| Stablecoin | USDT (ERC-20, 6 decimals) |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- An Alchemy account (for RPC URL)
- An Anthropic API key
- A Rumble Livestream API key

### 1. Clone the repo

```bash
git clone https://github.com/giftea/tipble.git
cd tipble
```

### 2. Set up the agent

```bash
cd agent
npm install
cp .env.example .env
```

Edit `agent/.env`:

```env
SEED_PHRASE=your_twelve_word_seed_phrase_here
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
BASE_SEPOLIA_RPC_URL=https://base-sepolia.g.alchemy.com/v2/YOUR_KEY
POLYGON_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/YOUR_KEY
ANTHROPIC_API_KEY=sk-ant-...
RUMBLE_API_URL=https://rumble.com/api/v0/livestream?key=YOUR_KEY
```

Start the agent:

```bash
npm run dev
```

### 3. Set up the web dashboard

```bash
cd web
npm install
cp .env.example .env.local
```

Edit `web/.env.local`:

```env
NEXT_PUBLIC_AGENT_API=http://localhost:3001
```

Start the dashboard:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 4. Load the Chrome extension

```bash
cd extension
npm install
npm run build
```

1. Open Chrome → `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the `extension/dist/` folder
5. Pin Tipble to your toolbar

---

## ⚙️ Configuration

Edit `agent/src/config/tipble.config.json`:

```json
{
  "creator": {
    "walletAddress": "",
    "displayName": "Demo Creator"
  },
  "rules": {
    "followerMilestones": {
      "enabled": true,
      "milestones": [100, 500, 1000, 5000, 10000],
      "tipAmount": "1.00",
      "asset": "USDT"
    },
    "newSubscriber": {
      "enabled": true,
      "tipAmount": "0.50",
      "asset": "USDT"
    },
    "viewerSpike": {
      "enabled": true,
      "thresholdMultiplier": 1.5,
      "minimumViewers": 10,
      "tipAmount": "0.25",
      "asset": "USDT"
    },
    "watchTime": {
      "enabled": true,
      "thresholdMinutes": 30,
      "tipAmount": "0.25",
      "asset": "USDT"
    },
    "newSubscriberDetected": {
      "enabled": true,
      "tipAmount": "0.50",
      "asset": "USDT"
    }
  },
  "budget": {
    "maxTipPerEvent": "5.00",
    "dailyLimitUsdt": "20.00",
    "sessionLimitUsdt": "10.00"
  },
  "agent": {
    "heartbeatMs": 10000,
    "demoMode": true,
    "network": "base-sepolia",
    "llmEnabled": true,
    "llmConfidenceThreshold": 0.7,
    "autoTippingEnabled": true
  }
}
```

All rules are also configurable from the dashboard UI and extension popup — no need to edit the JSON directly.

---

## 🧪 Testing

Run the staged test suite:

```bash
cd agent

# Stage 1 — WDK wallet initialization
npm run test:stage1

# Stage 2 — Rumble API connection
npm run test:stage2

# Stage 3 — Claude AI reasoning
npm run test:stage3

# Stage 4 — On-chain ETH transaction
npm run test:stage4

# Stage 5 — USDT ERC-20 transfer
npm run test:stage5
```

---

## 🌐 API Reference

The agent exposes a REST API on port 3001:

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/status` | Agent status, balances, tip log |
| GET | `/api/config` | Current configuration |
| POST | `/api/config` | Update configuration |
| POST | `/api/tip/manual` | Send a manual tip |
| POST | `/api/creator/set` | Set active creator |
| POST | `/api/creator/clear` | Clear active creator |
| POST | `/api/agent/start` | Start live mode |
| POST | `/api/agent/demo` | Start demo sequence |
| POST | `/api/agent/stop` | Stop agent |
| POST | `/api/agent/pause` | Pause agent |
| POST | `/api/agent/resume` | Resume agent |
| POST | `/api/wallet/generate` | Generate new wallet |
| POST | `/api/wallet/validate` | Validate seed phrase |
| GET | `/api/wallet/balance` | Get wallet balance |
| POST | `/api/stream/event` | Trigger stream event (from extension) |
| POST | `/api/data/reset` | Clear tip history |

All endpoints accept an optional `x-seed-phrase` header to use a specific user wallet instead of the default agent wallet.

---

## 🔐 Wallet Architecture

Tipble is **self-custodial** — each user controls their own funds:

```
User connects wallet (seed phrase)
  → Stored in chrome.storage.local (extension)
  → Stored in localStorage (web dashboard)
  → Sent as x-seed-phrase header with every API call
  → Server derives wallet address from seed
  → Tips fire from their wallet
  → Their tip history, their balance
```

**Never share your seed phrase.** Tipble stores it locally on your device and never sends it to any third-party server.

---

## 🗺 Roadmap

- [ ] Supabase integration for persistent cross-device tip history
- [ ] User accounts with tip history per wallet
- [ ] Polygon mainnet production deployment
- [ ] XAUT (Tether Gold) tipping support
- [ ] Multi-creator support (tip multiple creators simultaneously)
- [ ] Rumble chat message detection (tip on super chats)
- [ ] Mobile companion app
- [ ] "Deploy your own" one-click Railway button

---

## 🏆 Hackathon

Built for **Hackathon Galactica — WDK Edition 1**
Track 4: Tipping Bot

**WDK modules used:**
- Core Module
- `@tetherto/wdk-wallet-evm`
- Node.js & Bare Quickstart

---

## 📄 License

MIT

---

## 🙏 Acknowledgements

- [Tether WDK](https://github.com/tetherto) — wallet infrastructure
- [Anthropic Claude](https://anthropic.com) — AI reasoning layer
- [Rumble](https://rumble.com) — creator platform
- [shadcn/ui](https://ui.shadcn.com) — dashboard components