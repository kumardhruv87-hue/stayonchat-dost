// =================================================================
// MunshiJi (stayonchat.com) - Main Express Application Server
// Support: info@stayonchat.com
// =================================================================

import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { botRouter } from './bot/router.js';
import { paymentService } from './services/razorpay.js';
import { schedulerService } from './services/scheduler.js';
import { BRAND } from './config/constants.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const WHATSAPP_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'munshiji_secure_verify_token_2026';

import path from 'path';

// Capture raw body for Razorpay webhook signature verification
app.use(express.json({
  verify: (req: any, res, buf) => {
    req.rawBody = buf.toString();
  }
}));
app.use(cors());

// Serve public static website (Landing Page on stayonchat.com)
app.use(express.static(path.join(process.cwd(), 'public')));

// =================================================================
// 1. Health & Landing Endpoint
// =================================================================
app.get('/api/info', (req: Request, res: Response) => {
  res.json({
    app: BRAND.name,
    tagline: BRAND.tagline,
    domain: BRAND.domain,
    support: BRAND.supportEmail,
    status: 'ONLINE',
    time: new Date().toISOString(),
  });
});

app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'HEALTHY', uptime: process.uptime() });
});

// =================================================================
// 2. WhatsApp Cloud API Webhook Verification (GET /webhook)
// Meta calls this when setting up the webhook in Developer Console
// =================================================================
app.get('/webhook', (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === WHATSAPP_VERIFY_TOKEN) {
    console.log('WhatsApp Webhook successfully verified by Meta!');
    res.status(200).send(challenge);
  } else {
    console.warn('WhatsApp Webhook verification failed. Token mismatch.');
    res.status(403).send('Forbidden');
  }
});

// =================================================================
// 3. WhatsApp Cloud API Inbound Message Handler (POST /webhook)
// =================================================================
app.post('/webhook', async (req: Request, res: Response) => {
  // Meta expects an immediate 200 OK response to prevent webhook timeouts
  res.status(200).send('EVENT_RECEIVED');

  console.log('📥 Incoming Webhook Event:', JSON.stringify(req.body, null, 2));

  try {
    const entry = req.body?.entry?.[0];
    const changes = entry?.changes?.[0]?.value;

    if (changes && changes.messages) {
      // Process message asynchronously
      await botRouter.handleIncomingMessage(changes);
    }
  } catch (err) {
    console.error('Error handling incoming WhatsApp webhook event:', err);
  }
});

// =================================================================
// 4. Razorpay Webhook Handler (POST /razorpay-webhook)
// Upgrades user plan immediately upon payment
// =================================================================
app.post('/razorpay-webhook', async (req: any, res: Response) => {
  const signature = req.headers['x-razorpay-signature'] as string;
  const rawBody = req.rawBody;

  try {
    const isProcessed = await paymentService.handleWebhook(rawBody, signature);
    if (isProcessed) {
      res.status(200).json({ status: 'ok' });
    } else {
      res.status(400).json({ error: 'Signature verification failed' });
    }
  } catch (err) {
    console.error('Error processing Razorpay webhook:', err);
    res.status(500).json({ error: 'Webhook processing error' });
  }
});

// =================================================================
// 5. Start Server & Background Schedulers
// =================================================================
app.listen(PORT, () => {
  console.log(`=================================================`);
  console.log(`🧞‍♂️ MunshiJi Server is live on port ${PORT}`);
  console.log(`🌐 Domain: ${BRAND.domain} | Support: ${BRAND.supportEmail}`);
  console.log(`📡 Webhook URL: http://localhost:${PORT}/webhook`);
  console.log(`=================================================`);

  // Start daily 9:00 AM IST automated expiry check
  schedulerService.startScheduler();
});
