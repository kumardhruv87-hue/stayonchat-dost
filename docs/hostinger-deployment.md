# 🚀 Keepr (usekeepr.com) - Production 24/7 Deployment Guide

Production mein **Keepr** ko **24 ghante, 365 din** live rakhne ke 2 sabse aasan aur best raste hain:

---

## 🌟 Option 1: Render.com par 1-Click Free Deploy (Sabse Aasan & Recommended)

Render par 5 minute mein deploy ho jaata hai aur free automatic SSL certificate (`https://`) milta hai:

### Step 1: GitHub par Code Push karein
1. Apne GitHub account par ek private/public repository banayein (e.g. `keepr`).
2. Is folder ka poora code us repo mein push kar dein:
   ```bash
   git init
   git add .
   git commit -m "feat: initial release of Keepr"
   git remote add origin https://github.com/your-username/keepr.git
   git push -u origin main
   ```

### Step 2: Render par Web Service banayein
1. [Render.com](https://render.com/) par account banayein aur **New ➔ Web Service** chunein.
2. Apni `keepr` GitHub repo connect karein.
3. Settings:
   - **Environment:** `Node`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
4. **Environment Variables:** `.env` ki saari keys wahan add karein:
   - `APP_NAME`: `Keepr`
   - `APP_DOMAIN`: `usekeepr.com`
   - `WHATSAPP_PRIMARY_GATEWAY`: `meta`
   - `GEMINI_API_KEY`
   - `WHATSAPP_TOKEN`
   - `WHATSAPP_PHONE_NUMBER_ID`
   - `WHATSAPP_VERIFY_TOKEN`: `keepr_secure_verify_token_2026`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ENCRYPTION_SECRET`
5. **Deploy Web Service** par click karein!

### Step 3: Custom Domain Connect karein
1. Apne Domain Registrar (Cloudflare / Hostinger / Namecheap) mein **DNS Zone Editor** kholein.
2. Apne domain (e.g. `usekeepr.com`) ke liye ek `CNAME` record daalein:
   - **Type:** `CNAME`
   - **Name:** `@` (ya `www`)
   - **Target:** `your-app-name.onrender.com`
3. Render ke dashboard mein **Custom Domains** mein jaakar apna domain add karein.

---

## ⚡ Option 2: VPS par Direct Deploy (Ubuntu / Debian)

### Step 1: VPS mein Node.js 22 & PM2 install karein
```bash
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs git nginx
sudo npm install -g pm2
```

### Step 2: Code deploy karein
```bash
git clone https://github.com/your-username/keepr.git /var/www/keepr
cd /var/www/keepr
npm install
npm run build

# PM2 se 24/7 start karein
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

### Step 3: Nginx & Free SSL (Let's Encrypt)
```bash
sudo certbot --nginx -d yourdomain.com
```

### Step 4: WhatsApp Webhook Connect karein
Meta for Developers Console mein Webhook URL configure karein:
👉 `https://yourdomain.com/webhook`
Verify Token: `keepr_secure_verify_token_2026`
