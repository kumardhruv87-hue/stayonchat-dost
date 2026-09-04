# 🧞‍♂️ MunshiJi (मुंशी जी) — stayonchat.com
> **Aapka Digital Munshi. Kaagaz sambhale, waqt pe yaad dilaye.**  
> Official Domain: [stayonchat.com](https://stayonchat.com) | Contact: `info@stayonchat.com`

---

## 📌 Introduction

**MunshiJi** is an ultra-lean, high-retention WhatsApp-first AI digital locker and personal document assistant. It is designed to act like an **Aladdin's Jinn / Loyal Family Munshi** for Indian households:
- Saves all documents: Bills, Warranty cards, Vehicle RC/PUC/Insurance, Handwritten doctor prescriptions, and LIC/Health policies.
- Uses **Google Gemini Flash Vision** to extract dates and entities once upon upload.
- Fast sub-millisecond retrieval on WhatsApp (`"mera RC"`, `"Havells bill"`, `"dates"`) with **zero ongoing LLM cost**.
- Sends automated WhatsApp Utility reminders 30, 7, and 1 day before expiry to protect users from penalties (e.g. ₹10,000 PUC challan, lapsed insurance NCB).
- Contextual, ethical upsells to transparent yearly plans (**Yaad ₹149/yr**, **Ghar ₹399/yr**, **Vault ₹799/yr**) via Razorpay.

---

## 🏗️ 3-Layer System Architecture

```
                       [ WhatsApp User ]
                              │
                    (Voice / Text / Image)
                              │
                              ▼
                [ WhatsApp Cloud API (Meta) ]
                              │
                              ▼
                [ MunshiJi Webhook (Express) ]
               ┌──────────────┴──────────────┐
               │                             │
       (Text/Search Query)         (File/Voice Upload)
               │                             │
               ▼                             ▼
       [ Fast Search Router ]       [ AI Padhaai Engine ]
        - Keyword Match              - Gemini Flash Vision (OCR)
        - Expiry List                - Gemini Multimodal Audio (Voice)
        - Near 0 ms                  - Strict JSON: {title, expiry, etc.}
               │                             │
               └──────────────┬──────────────┘
                              ▼
                 [ Database: Supabase India ]
                  - User Profile & Graph
                  - Encrypted Storage (AES-256)
                  - Daily 9:00 AM IST Expiry Scheduler
                              │
                              ▼
           [ Automated Jinn Alerts & Upsells ]
```

---

## 💰 Public Menu & Business Rules

1. **Free Pack (₹0):** 15 files, instant search, 1 free reminder trial.
2. **Yaad Plan (₹149 / saal):** 50 files, 20 automated WhatsApp reminders, 30/7/1 day notifications.
3. **Ghar Plan (₹399 / saal):** 200 files, 4 family members (Maa, Papa, Spouse, Self), unlimited reminders.
4. **Vault Plan (₹799 / saal):** 500 files, Family + CA read-only access link, WarisPath kit priority access.

**Anti-Spam Business Rule:** Max 1 upsell / offer message per 7 days per user.

---

## 🚀 Quick Start & Local Setup

### 1. Prerequisites
- Node.js (v20+ or v26+)
- npm (v10+)
- Supabase account (Postgres + Storage)
- Google AI Studio account (Gemini API Key)
- Meta for Developers account (WhatsApp Cloud API)
- Razorpay account (Test or Live mode)

### 2. Installation
```bash
# Clone or navigate to the project directory
cd C:\Users\kumar\.gemini\antigravity\scratch\munshiji

# Install dependencies (already installed)
npm install

# Compile TypeScript
npm run build
```

### 3. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Fill in the credentials in `.env`:
- `GEMINI_API_KEY`: From [Google AI Studio](https://aistudio.google.com/)
- `WHATSAPP_TOKEN`: Permanent System User Token from Meta Developer Portal
- `WHATSAPP_PHONE_NUMBER_ID`: From WhatsApp API Setup in Meta
- `WHATSAPP_VERIFY_TOKEN`: `munshiji_secure_verify_token_2026`
- `SUPABASE_URL`: From Supabase Project Settings -> API
- `SUPABASE_SERVICE_ROLE_KEY`: Service role secret from Supabase
- `RAZORPAY_KEY_ID`: From Razorpay Dashboard -> API Keys
- `RAZORPAY_KEY_SECRET`: Razorpay Secret Key

---

## 🗄️ Supabase Database Setup

1. Open your project on [Supabase](https://supabase.com/).
2. Navigate to the **SQL Editor** on the left menu.
3. Open [`src/db/schema.sql`](file:///C:/Users/kumar/.gemini/antigravity/scratch/munshiji/src/db/schema.sql) and run the full script.
4. Go to **Storage** -> **New Bucket**:
   - Bucket Name: `munshiji-vault`
   - Mark as **Private** (authenticated via signed URLs).

---

## 📱 Meta WhatsApp Cloud API Setup

1. Go to [Meta for Developers](https://developers.facebook.com/).
2. Create an App -> Type: **Business**.
3. Add the **WhatsApp** product.
4. In WhatsApp -> **Configuration**:
   - **Callback URL:** `https://your-domain.com/webhook` (or your ngrok URL for local dev)
   - **Verify Token:** `munshiji_secure_verify_token_2026`
   - Click **Verify and Save**.
5. Under **Webhook Fields**, click **Manage** and subscribe to `messages`.
6. Template Registration (For Outbound Expiry Alerts):
   - Template Name: `munshiji_expiry_alert`
   - Category: `UTILITY`
   - Language: `English`
   - Body:
     ```
     MunshiJi Expiry Alert: Your {{1}} is expiring on {{2}} (in {{3}} days). Please renew it in time to avoid penalties!
     ```

---

## 💳 Razorpay Webhook Setup

1. In Razorpay Dashboard -> Settings -> **Webhooks**.
2. Add New Webhook:
   - **Webhook URL:** `https://your-domain.com/razorpay-webhook`
   - **Secret:** Enter your `RAZORPAY_WEBHOOK_SECRET`
   - **Active Events:** Select `payment_link.paid` and `payment.captured`.

---

## 🧪 Testing Locally

### Run Verification Test
```bash
npm run test:extraction
```

### Run Dev Server with Watch Mode
```bash
npm run dev
```

### Expose with Ngrok for WhatsApp Webhook
```bash
ngrok http 3000
```
Copy your forwarding URL (e.g. `https://xyz.ngrok-free.app/webhook`) and paste it into the Meta WhatsApp Webhook settings!

---

## 📁 Project Structure

```
munshiji/
├── dist/                      # Compiled production JavaScript
├── docs/                      # Architecture and Meta guidelines
├── src/
│   ├── bot/
│   │   ├── persona.ts         # MunshiJi Hinglish voice & responses
│   │   └── router.ts          # 3-Layer message & media router
│   ├── config/
│   │   └── constants.ts       # Plans (Yaad, Ghar, Vault) & rules
│   ├── db/
│   │   ├── schema.sql         # Supabase schema + Trigram fuzzy search
│   │   └── supabase.ts        # Database client & queries
│   ├── services/
│   │   ├── gemini.ts          # Gemini Flash Vision & Voice extractor
│   │   ├── razorpay.ts        # Payment links & webhook processing
│   │   ├── scheduler.ts       # 9 AM IST Expiry cron engine
│   │   ├── storage.ts         # AES-256 client-side file encryption
│   │   └── whatsapp.ts        # Meta WhatsApp Cloud API client
│   ├── tests/
│   │   └── test-flow.ts       # Verification test suite
│   └── server.ts              # Express server entrypoint
├── .env.example               # Environment variables template
├── package.json               # Dependencies & scripts
└── tsconfig.json              # TypeScript compiler configuration
```

---

## ⚖️ Privacy Pledge & Ethical AI
- **No Shared Training:** User files are never used to train shared AI models.
- **Client-Side Encryption:** All uploads are encrypted with AES-256 before storage.
- **Transparent Pricing:** No dynamic wealth pricing; the public menu applies to everyone.
- **Respectful Notifications:** Max 1 upsell per 7 days; silent on "No".

---
© 2026 [stayonchat.com](https://stayonchat.com) • Support: `info@stayonchat.com`
