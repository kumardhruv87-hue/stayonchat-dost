# 🚨 RoasSiren™ — Autonomous Meta Ad Waste & Shopify Stock Watchdog
> **Stop burning ad spend on out-of-stock products & dead links.**  
> Live Platform: [https://keepr-bot.onrender.com](https://keepr-bot.onrender.com) | Official WhatsApp: `+91 9870530066`

---

## 📌 Executive Summary

**RoasSiren™** is a category-defining B2B micro-SaaS engineered for Shopify D2C brands and performance marketing agencies. 

### The Core Problem:
Performance marketers burn ₹5,000 to ₹50,000 every week when top-converting Meta (Facebook/Instagram) or Google ads continue driving high-cost paid traffic to products that went **"Sold Out"** at midnight or landing pages that broke into **404 Not Found**. Media buyers only discover this 8–12 hours later when opening Shopify analytics.

### The RoasSiren Solution:
- **Zero-Code Architecture:** Requires **0 Shopify app installs** and injects **zero bloated code** into client themes.
- **Deterministic 100% Native Polling:** Directly queries native `/products/{handle}.js` endpoints and HTTP status codes with sub-200ms latency.
- **60-Second WhatsApp Sirens:** Dispatches high-urgency WhatsApp alert messages to founders and media buyers via official Meta Cloud API within 60 seconds of a stockout.
- **Variant-Level Stockout Detection:** Flags when core sizes (e.g. Size L or M) sell out, even if peripheral sizes (e.g. XS) remain in stock.
- **Automatic Restock Recovery:** Sends a green-light recovery notification once inventory is replenished so media buyers can safely scale ads back up.

---

## 🏗️ System Architecture

```
                 [ Meta / IG Ad Traffic ]
                            │
                            ▼
              [ Shopify Product Destination ]
                            ▲
                            │ (Every 5-15 mins)
               [ RoasSiren Autonomous Watchdog ]
              ┌─────────────┴─────────────┐
              ▼                           ▼
    [ Native Shopify JSON ]      [ HTTP Link Rot Radar ]
     - /products/{handle}.js      - 200 OK vs 301 Redirect
     - Variant availability       - 404 Page Not Found
     - Total vs OOS inventory     - 5xx Server Outages
              │                           │
              └─────────────┬─────────────┘
                            ▼
             [ ROAS Burn Impact Evaluator ]
              - Hourly ad spend burn rate (₹/hr)
              - Bounce risk calculation
                            ▼
         [ 60-Second WhatsApp Siren Dispatcher ]
              - Meta Cloud API (Verified Primary)
              - Instant WhatsApp alert to Media Buyer
              - Cooldown & deduplication protocol
```

---

## ⚡ WhatsApp Bot Commands

Subscribers can manage their watchdogs directly via WhatsApp (`+91 98705 30066`):

| Command | Action |
| :--- | :--- |
| `scan <url>` | Runs an instant stock & ad waste audit on any Shopify product URL. |
| `monitor <url>` | Adds the target URL to the 24/7 autonomous radar (every 15 mins). |
| `list` | Displays all active monitored ad URLs and their latest stock status. |
| `test` | Sends an authentic sample WhatsApp emergency siren to verify phone alerts. |
| `stop <url>` | Removes a URL from active watchdog monitoring. |

---

## 📡 REST API Endpoints

### 1. `POST /api/scan`
Public instant scan endpoint used by the homepage widget:
```json
{
  "url": "https://snitch.co.in/products/air-mesh-oversized-tee",
  "dailyAdSpend": 5000
}
```
**Response:**
```json
{
  "success": true,
  "result": {
    "status": "DEAD_LINK_404",
    "isAvailable": false,
    "httpStatus": 404,
    "adWasteRisk": {
      "level": "CRITICAL",
      "hourlyBurnRateInr": 208,
      "estimatedWastePct": 100,
      "actionHeadline": "🚨 DEAD AD DESTINATION (404 NOT FOUND)"
    },
    "responseTimeMs": 737
  }
}
```

### 2. `POST /api/monitor`
Register an ad URL for 24/7 autonomous background sweeps:
```json
{
  "url": "https://snitch.co.in/products/oversized-tee",
  "phone": "919560931596",
  "brandName": "Snitch",
  "dailyAdSpend": 5000
}
```

### 3. `POST /api/simulate-siren`
Test WhatsApp siren delivery to any verified WhatsApp mobile number.

---

## 💰 B2B Subscription Tiers

1. **Starter D2C (₹1,999 / mo):**
   - Up to 15 active ad URLs monitored
   - 15-minute background sweep cycle
   - 60-second emergency WhatsApp sirens
   - Broken link & Out-of-Stock detection
   
2. **Growth Brand (₹4,999 / mo) — Most Popular:**
   - Up to 50 active ad URLs monitored
   - Ultra-fast 5-minute background sweeps
   - Multi-buyer sirens (up to 3 team members)
   - Variant-level inventory exhaustion alerts
   - Automated Restock Recovery notifications

3. **Agency Fleet (₹9,999 / mo):**
   - Up to 200 ad URLs across 10 client Shopify stores
   - Continuous 5-minute radar
   - Client-tagged WhatsApp alert routing
   - Weekly Ad Waste Saved audit reports
   - Dedicated Slack/WhatsApp webhook bridge

---

## 🛠️ Local Development & Testing

```bash
# Install dependencies
npm install

# Run TypeScript type check
cmd.exe /c "npx tsc --noEmit"

# Run automated watchdog test suite
npm run test:watchdog

# Start development server
npm run dev

# Build for production
npm run build
```

---
© 2026 RoasSiren Technologies Inc. All rights reserved.
