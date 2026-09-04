# 🚀 MunshiJi (stayonchat.com) - Production 24/7 Deployment Guide

Ab tak humne local laptop par bot test kiya hai. Local tunnels (`trycloudflare` ya `ngrok`) sirf testing ke liye hote hain aur laptop band hote hi disconnect ho jaate hain.

Production mein **stayonchat.com** ko **24 ghante, 365 din** live rakhne ke 2 sabse aasan aur best raste hain:

---

## 🌟 Option 1: Render.com par 1-Click Free Deploy (Sabse Aasan & Recommended)

Agar aapko Linux terminal ya VPS configure nahi karna, to **Render** par 5 minute mein deploy ho jaata hai aur free SSL certificate (`https://`) milta hai:

### Step 1: GitHub par Code Push karein
1. Apne GitHub account par ek private/public repository banayein (e.g. `munshiji`).
2. Is folder (`C:\Users\kumar\.gemini\antigravity\scratch\munshiji`) ka poora code us repo mein push kar dein:
   ```bash
   git init
   git add .
   git commit -m "feat: initial release of MunshiJi"
   git remote add origin https://github.com/your-username/munshiji.git
   git push -u origin main
   ```

### Step 2: Render par Web Service banayein
1. [Render.com](https://render.com/) par account banayein aur **New ➔ Web Service** chunein.
2. Apni `munshiji` GitHub repo connect karein.
3. Settings:
   - **Environment:** `Node`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
4. **Environment Variables:** `.env` ki saari keys wahan add karein:
   - `GEMINI_API_KEY`
   - `WHATSAPP_TOKEN`
   - `WHATSAPP_PHONE_NUMBER_ID`
   - `WHATSAPP_VERIFY_TOKEN`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ENCRYPTION_SECRET`
5. **Deploy Web Service** par click karein!
   Aapko ek permanent link mil jayega: `https://munshiji.onrender.com`.

### Step 3: Hostinger DNS Connect karein
1. Hostinger cPanel / hPanel mein **DNS Zone Editor** kholein.
2. `stayonchat.com` ke liye ek `CNAME` record daalein:
   - **Type:** `CNAME`
   - **Name:** `@` (ya `bot`)
   - **Target:** `munshiji.onrender.com`
3. Render ke dashboard mein **Custom Domains** mein jaakar `stayonchat.com` add karein.

---

## ⚡ Option 2: Hostinger VPS par Direct Deploy (Agar Hostinger par VPS hai)

Agar aapke Hostinger account mein **Ubuntu/Debian VPS** hai, to yeh sabse fast option hai:

### Step 1: VPS mein Node.js & PM2 install karein
```bash
# Update server
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs git nginx

# Install PM2 (Process Manager)
sudo npm install -g pm2
```

### Step 2: Code deploy karein
```bash
# Code clone karein
git clone https://github.com/your-username/munshiji.git /var/www/munshiji
cd /var/www/munshiji

# Install & Build
npm install
npm run build

# PM2 se 24/7 start karein
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

### Step 3: Nginx & Free SSL (Let's Encrypt)
```bash
# Nginx config
sudo nano /etc/nginx/sites-available/stayonchat.com
```
Nginx config paste karein:
```nginx
server {
    server_name stayonchat.com www.stayonchat.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```
SSL enable karein:
```bash
sudo ln -s /etc/nginx/sites-available/stayonchat.com /etc/nginx/sites-enabled/
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d stayonchat.com -d www.stayonchat.com
sudo systemctl restart nginx
```

---

## 📱 Meta Portal Update (Permanent Webhook)

Deploy hone ke baad Meta Developer Console mein:
1. **WhatsApp ➔ Configuration** par jayein.
2. **Callback URL** permanently daal dein:  
   👉 `https://stayonchat.com/webhook`  
   (ya Render wala: `https://munshiji.onrender.com/webhook`)
3. **Verify token:** `munshiji_secure_verify_token_2026`.

Iske baad aapka laptop band ho ya chaalu, **MunshiJi 24 ghante, 365 din stayonchat.com par live rahega!**
