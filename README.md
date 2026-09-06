# 🤖 Keepr — Autonomous AI Life Vault & Smart Assistant
> **Keep every document. Never miss an expiry.**  
> Official Domain: [usekeepr.com](https://usekeepr.com) | Contact: `care@usekeepr.com`

---

## 📌 Executive Summary

**Keepr** is a Silicon Valley grade, WhatsApp-native autonomous life vault and document assistant. It operates like an invisible personal butler for households and professionals:
- **Instant Ingestion & OCR:** Saves bills, warranty cards, vehicle RC/PUC/insurance, handwritten doctor prescriptions, and insurance policies directly on WhatsApp.
- **Single-Pass Intelligence:** Uses **Google Gemini 3.6 Flash Vision** to extract dates, policy numbers, amounts, and deadlines upon upload with strict schema validation.
- **Zero Ongoing LLM Search Cost:** Sub-millisecond retrieval on WhatsApp (`"my RC"`, `"Havells bill"`, `"reminders"`) using PostgreSQL Trigram (`pg_trgm`) fuzzy matching.
- **Proactive Protection:** Automated WhatsApp utility alerts sent at 30, 7, and 1 day before expiry to protect users from penalties (e.g. ₹10,000 traffic challans, lapsed NCB).
- **Stateless & Scalable:** Redis-ready session caching and pluggable omnichannel gateway architecture (Meta Official Cloud API + UltraMsg fallback).

---

## 🏗️ System Architecture

```
                       [ WhatsApp User ]
                               │
                     (Voice / Text / Image)
                               │
                               ▼
        [ Omnichannel Gateway: Meta Cloud API (Primary) / UltraMsg ]
                               │
                               ▼
                   [ Keepr Core API (Express) ]
                ┌──────────────┴──────────────┐
                │                             │
        (Text/Search Query)         (File/Voice Upload)
                │                             │
                ▼                             ▼
       [ Fast Search Router ]       [ AI Vision & Voice Engine ]
        - Keyword / Trigram Match    - Gemini 3.6 Flash Vision (OCR)
        - Expiry List                - Multimodal Audio Transcription
        - Sub-millisecond latency    - Strict Zod Schema Validation
                │                             │
                └──────────────┬──────────────┘
                               ▼
             [ Data & Storage: Supabase & Redis ]
              - PostgreSQL RLS Multi-Tenant Schema
              - Client-Side AES-256-GCM Encryption
              - Redis Stateless Session & Prompt Cache
                               │
                               ▼
            [ Automated Alert Engine & Schedulers ]
              - 06:00 AM IST: Daily Morning Life Guidance
              - 09:00 AM IST: Expiry & Renewal Alerts
              - Every 1 Minute: Real-time Task Reminders
```

---

## 💰 Subscription Plans

1. **Free Pack (₹0):** 5 files, instant search, 1 free reminder trial.
2. **Yaad Plan (₹249 / year):** 50 files, 25 automated WhatsApp alerts, 30/7/1 day notifications. (~₹20/month)
3. **Ghar Plan (₹499 / year):** 200 files, 4 family members, unlimited reminders. (~₹41/month)
4. **Vault Plan (₹899 / year):** 500 files, Family + CA read-only access link, WarisPath succession kit. (~₹75/month)

---

## 🚀 Quick Start & Deployment

### 1. Environment Setup
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Fill in the credentials in `.env`:
- `APP_NAME`: `Keepr`
- `APP_DOMAIN`: `usekeepr.com`
- `WHATSAPP_PRIMARY_GATEWAY`: `meta`
- `GEMINI_API_KEY`: From [Google AI Studio](https://aistudio.google.com/)
- `WHATSAPP_TOKEN`: Permanent System User Token from Meta Developer Portal
- `WHATSAPP_PHONE_NUMBER_ID`: From WhatsApp API Setup in Meta
- `WHATSAPP_VERIFY_TOKEN`: `keepr_secure_verify_token_2026`
- `SUPABASE_URL`: From Supabase Project Settings
- `SUPABASE_SERVICE_ROLE_KEY`: Service role secret from Supabase
- `RAZORPAY_KEY_ID`: Razorpay API Key
- `RAZORPAY_KEY_SECRET`: Razorpay Secret Key

### 2. Run Locally
```bash
# Run Dev Server with tsx watch
npm run dev
```

### 3. Production Deployment (Render / Hostinger VPS)
* **Render.com:** Connect your repo with `render.yaml`. 1-click deploy with automatic HTTPS and environment variable configuration.
* **VPS (PM2):** Start via `pm2 start ecosystem.config.cjs`.

---

## 🛡️ Bank-Grade Security & Privacy
- **Client-Side Encryption:** All uploads encrypted with AES-256-GCM before storage.
- **No Shared Training:** User documents are never used to train public LLM models.
- **Data Sovereignty:** Enterprise PostgreSQL with Row Level Security (RLS).

---
© 2026 Keepr AI Technologies Inc. • Support: `care@usekeepr.com`
