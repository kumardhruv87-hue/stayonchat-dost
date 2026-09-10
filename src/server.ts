// =================================================================
// RoasSiren (roassiren.com) - Main Express Application Server
// Autonomous Meta Ad Waste & Shopify Stock Watchdog API Gateway
// =================================================================

import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { botRouter } from './bot/router.js';
import { dbService } from './db/supabase.js';
import { whatsappService, getWhatsAppToken, getWhatsAppPhoneId } from './services/whatsapp.js';
import { paymentService } from './services/razorpay.js';
import { schedulerService } from './services/scheduler.js';
import { watchdogService } from './services/watchdog.service.js';
import { sirenService } from './services/siren.service.js';
import { webhookService } from './services/webhook.service.js';
import { BRAND } from './config/constants.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const WHATSAPP_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'keepr_secure_verify_token_2026';


// Capture raw body for Razorpay webhook signature verification
app.use(express.json({
  verify: (req: any, res, buf) => {
    req.rawBody = buf.toString();
  }
}));
app.use(cors());

// Serve public static website (Landing Page on usekeepr.com)
app.use(express.static(path.join(process.cwd(), 'public')));

app.get('/privacy', (req: Request, res: Response) => {
  res.sendFile(path.join(process.cwd(), 'public', 'privacy.html'));
});

app.get('/terms', (req: Request, res: Response) => {
  res.sendFile(path.join(process.cwd(), 'public', 'terms.html'));
});

app.get('/dashboard', (req: Request, res: Response) => {
  res.sendFile(path.join(process.cwd(), 'public', 'dashboard.html'));
});

app.get('/audit', (req: Request, res: Response) => {
  res.sendFile(path.join(process.cwd(), 'public', 'audit.html'));
});

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
  res.json({
    status: 'HEALTHY',
    uptime: process.uptime(),
    gateway: whatsappService.getPrimaryAdapter().name,
    tokenPrefix: getWhatsAppToken().substring(0, 15),
    phoneId: getWhatsAppPhoneId(),
  });
});

app.get('/api/test-reply', async (req: Request, res: Response) => {
  const phone = (req.query.phone as string) || '919560931596';
  try {
    const success = await whatsappService.sendTextMessage(
      phone,
      'Keepr AI Live Test from Render Cloud Server! 🤖✨'
    );
    res.json({
      success,
      gateway: whatsappService.getPrimaryAdapter().name,
      phone,
      tokenPrefix: getWhatsAppToken().substring(0, 15),
      phoneId: getWhatsAppPhoneId(),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// =================================================================
// 1b. RoasSiren Core REST APIs (Public Scanner & Watchdog Radar)
// =================================================================

// Public Instant Scan Endpoint (Used by Landing Page widget)
app.post('/api/scan', async (req: Request, res: Response) => {
  try {
    const { url, dailyAdSpend } = req.body;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'Valid URL is required.' });
    }

    const spendNum = dailyAdSpend ? Math.max(100, Number(dailyAdSpend)) : undefined;
    const result = await watchdogService.scanUrl(url, spendNum);
    return res.json({ success: true, result });
  } catch (err: any) {
    console.error('Error in /api/scan:', err);
    return res.status(500).json({ error: err.message || 'Scan failed' });
  }
});

// Register an Ad URL for 24/7 Autonomous Watchdog Monitoring
// Register an Ad URL for 24/7 Autonomous Watchdog Monitoring
app.post('/api/monitor', (req: Request, res: Response) => {
  try {
    const { url, phone, brandName, dailyAdSpend, webhookUrl, alertRecipients } = req.body;
    if (!url || !phone) {
      return res.status(400).json({ error: 'Both URL and WhatsApp phone number are required.' });
    }

    const item = watchdogService.registerMonitoredUrl({
      url,
      userPhone: String(phone),
      brandName,
      dailyAdSpend: dailyAdSpend ? Number(dailyAdSpend) : undefined,
      webhookUrl: webhookUrl || undefined,
      alertRecipients: Array.isArray(alertRecipients) ? alertRecipients : undefined,
    });

    return res.json({ success: true, monitored: item });
  } catch (err: any) {
    console.error('Error in /api/monitor:', err);
    return res.status(500).json({ error: err.message || 'Registration failed' });
  }
});

// Bulk Scan Array of URLs (Up to 25 simultaneous)
app.post('/api/scan-bulk', async (req: Request, res: Response) => {
  try {
    const { urls, dailyAdSpend } = req.body;
    if (!Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({ error: 'Array of URLs is required.' });
    }
    const results = await watchdogService.scanBulk(urls, dailyAdSpend ? Number(dailyAdSpend) : undefined);
    return res.json({ success: true, count: results.length, results });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Bulk scan failed' });
  }
});

// Store-Wide Auto-Discovery (Scans entire catalog for OOS ad risks)
app.post('/api/scan-store', async (req: Request, res: Response) => {
  try {
    const { domain } = req.body;
    if (!domain || typeof domain !== 'string') {
      return res.status(400).json({ error: 'Valid store domain or URL is required.' });
    }
    const report = await watchdogService.scanStore(domain);
    return res.json({ success: true, report });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Store scan failed' });
  }
});

// Live Dashboard Aggregated Metrics
app.get('/api/dashboard/stats', (req: Request, res: Response) => {
  try {
    const phone = req.query.phone as string | undefined;
    const stats = watchdogService.getDashboardStats(phone);
    return res.json({ success: true, ...stats });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Test Slack / Discord Webhook Siren
app.post('/api/test-webhook', async (req: Request, res: Response) => {
  try {
    const { webhookUrl } = req.body;
    if (!webhookUrl) {
      return res.status(400).json({ error: 'Webhook URL is required.' });
    }
    const result = await webhookService.sendTestWebhook(webhookUrl);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Webhook test failed' });
  }
});

// Retrieve Active Monitored URLs (optionally filtered by subscriber phone)
app.get('/api/monitor', (req: Request, res: Response) => {
  try {
    const phone = req.query.phone as string | undefined;
    const items = phone 
      ? watchdogService.getMonitoredUrlsByPhone(phone) 
      : watchdogService.getAllMonitoredUrls();

    return res.json({
      success: true,
      count: items.length,
      items,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Remove a Monitored URL
app.delete('/api/monitor/:id', (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const removed = watchdogService.removeMonitoredUrl(id);
    return res.json({ success: removed });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Send Demo Siren Alert (Used by landing page interactive simulation)
app.post('/api/simulate-siren', async (req: Request, res: Response) => {
  try {
    const { phone, storeUrl } = req.body;
    if (!phone) {
      return res.status(400).json({ error: 'WhatsApp phone number is required.' });
    }

    const result = await sirenService.sendTestSiren(phone, storeUrl);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Simulation failed' });
  }
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

// In-memory audit log of incoming webhooks
interface WebhookLogEntry {
  timestamp: string;
  source: string;
  senderPhone?: string;
  text?: string;
  type?: string;
  status: string;
  rawPayload?: any;
  error?: string;
}
export const webhookAuditLogs: WebhookLogEntry[] = [];

app.get('/api/webhook-logs', (req: Request, res: Response) => {
  res.json({
    total: webhookAuditLogs.length,
    logs: webhookAuditLogs.slice(-25).reverse(),
  });
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
      const msg = changes.messages[0];
      webhookAuditLogs.push({
        timestamp: new Date().toISOString(),
        source: 'meta_cloud_api',
        senderPhone: msg?.from,
        text: msg?.text?.body,
        type: msg?.type,
        status: 'received',
      });
      // Process message asynchronously
      await botRouter.handleIncomingMessage(changes);
    }
  } catch (err: any) {
    console.error('Error handling incoming WhatsApp webhook event:', err);
    webhookAuditLogs.push({
      timestamp: new Date().toISOString(),
      source: 'meta_cloud_api',
      status: 'error',
      error: err?.message || String(err),
    });
  }
});

// =================================================================
// 3c. AiSensy Official WhatsApp Webhook Handler (/aisensy-webhook)
// Handles incoming messages, media, and verification from AiSensy
// =================================================================
app.all('/aisensy-webhook', async (req: Request, res: Response) => {
  // 1. GET Handshake / verification
  if (req.method === 'GET') {
    const challenge = req.query['hub.challenge'] || req.query.challenge || 'OK';
    return res.status(200).send(challenge);
  }

  // 2. Immediate 200 OK acknowledgement
  res.status(200).json({ status: 'ok', received: true });

  try {
    const body = req.body;
    console.log('📥 AiSensy Inbound Event:', JSON.stringify(body, null, 2));

    if (!body) return;

    // A. If AiSensy forwards raw Meta Graph API event
    if (body.entry?.[0]?.changes?.[0]?.value) {
      await botRouter.handleIncomingMessage(body.entry[0].changes[0].value);
      return;
    }

    // B. AiSensy standard notification payload
    const data = body.data || body;
    const rawFrom =
      data.from ||
      data.sender ||
      data.mobile ||
      data.destination ||
      data.user_phone ||
      body.from ||
      body.sender ||
      '';

    if (!rawFrom) return;

    let cleanPhone = String(rawFrom).replace('@c.us', '').replace(/[^0-9]/g, '');
    if (cleanPhone.length === 10 && /^[6-9]/.test(cleanPhone)) {
      cleanPhone = '91' + cleanPhone;
    }
    if (!cleanPhone) return;

    const contactName = data.userName || data.name || data.senderName || 'Friend';
    const textContent = (data.text || data.message || data.body || data.content || '').trim();
    const mediaUrl = data.mediaUrl || data.media?.url || data.url || '';
    const messageType = data.type || (mediaUrl ? 'image' : 'text');

    const simulatedEvent: any = {
      contacts: [
        {
          profile: { name: contactName },
          wa_id: cleanPhone,
        },
      ],
      messages: [
        {
          from: cleanPhone,
          id: data.id || data.messageId || `aisensy_${Date.now()}`,
          timestamp: String(Math.floor(Date.now() / 1000)),
          type: messageType === 'image' ? 'image' : messageType === 'document' ? 'document' : 'text',
        },
      ],
    };

    if (messageType === 'image' || mediaUrl) {
      simulatedEvent.messages[0].type = 'image';
      simulatedEvent.messages[0].image = {
        id: mediaUrl,
        caption: textContent,
        mime_type: 'image/jpeg',
      };
    } else {
      simulatedEvent.messages[0].type = 'text';
      simulatedEvent.messages[0].text = { body: textContent };
    }

    console.log(`🤖 Dispatching AiSensy message from ${cleanPhone} (${contactName}):`, textContent || mediaUrl);
    await botRouter.handleIncomingMessage(simulatedEvent);
  } catch (err) {
    console.error('[AiSensy Webhook Error]:', err);
  }
});

// =================================================================
// 3b. UltraMsg Webhook Handler (POST /ultramsg-webhook)
// Primary live gateway for incoming WhatsApp messages & media
// =================================================================
app.post('/ultramsg-webhook', async (req: Request, res: Response) => {
  // UltraMsg requires a quick 200 response
  res.status(200).json({ status: 'ok' });

  try {
    const payload = req.body;
    if (!payload || payload.event_type !== 'message_received' || !payload.data) {
      return;
    }

    const data = payload.data;

    // Ignore outbound messages sent by bot itself
    if (data.fromMe) {
      return;
    }

    // Ignore group chats (@g.us) to maintain 1-on-1 personal assistant privacy
    if (data.from && data.from.includes('@g.us')) {
      return;
    }

    // Sanitize phone number (e.g. 919560931596@c.us -> 919560931596)
    let cleanPhone = (data.from || '').replace('@c.us', '').replace(/[^0-9]/g, '');
    if (cleanPhone.length === 10 && /^[6-9]/.test(cleanPhone)) {
      cleanPhone = '91' + cleanPhone;
    }
    if (!cleanPhone) return;

    const contactName = data.pushname || 'Dhruv';
    const rawText = (data.body || '').trim();
    const lowerRaw = rawText.toLowerCase();
    const mediaUrl = data.media || '';

    // Dedicated Bot Mode: responds 24/7 to all messages on this dedicated number.
    // If user explicitly asks to stop/pause:
    if (['exit', 'stop', 'quit', 'dost stop', 'dost off', 'bye dost'].includes(lowerRaw)) {
      await whatsappService.sendTextMessage(
        cleanPhone,
        'Aapke reminders pause kar diye gaye hain. Wapas shuru karne ke liye bas "hi" likhkar bhejiye. 🙏'
      );
      return;
    }

    const triggerModeEnabled = process.env.BOT_TRIGGER_MODE === 'true';

    if (triggerModeEnabled) {
      // Check for trigger command: starts with "keepr", "#keepr", "dost", "#dost", "ai"
      const triggerRegex = /^(#keepr|!keepr|\/keepr|keepr\b|keepr[:\s]|#dost|!dost|\/dost|dost\b|dost[:\s]|ai\b)/i;
      const hasTrigger = triggerRegex.test(rawText);
      const isSessionActive = dbService.isSessionActive(cleanPhone);

      const captionText = (data.caption || '').trim();
      const hasCaptionTrigger = triggerRegex.test(captionText);

      // If neither trigger is present nor session is active -> SILENTLY IGNORE
      if (!hasTrigger && !hasCaptionTrigger && !isSessionActive) {
        console.log(`[Trigger Mode] Ignoring message from ${cleanPhone} (no trigger): "${rawText.substring(0, 30)}..."`);
        return;
      }

      if (hasTrigger || hasCaptionTrigger) {
        dbService.startSession(cleanPhone, 30);
      }
    }

    let textBody = rawText.replace(/^(#keepr|!keepr|\/keepr|keepr[:\s]*|#dost|!dost|\/dost|dost[:\s]*|ai[:\s]*)/i, '').trim();
    if (!textBody && rawText) {
      textBody = 'hi'; // If user just typed "keepr" or "dost", trigger welcome/menu
    }

    let mappedType = 'text';
    if (data.type === 'image') mappedType = 'image';
    else if (data.type === 'document') mappedType = 'document';
    else if (data.type === 'ptt' || data.type === 'audio' || data.type === 'voice') mappedType = 'audio';

    console.log(`📩 UltraMsg Inbound from ${cleanPhone} (${contactName}) [type: ${mappedType}]:`, textBody || mediaUrl);

    // Map UltraMsg event to standard botRouter format
    const simulatedEvent: any = {
      contacts: [
        {
          profile: { name: contactName },
          wa_id: cleanPhone,
        },
      ],
      messages: [
        {
          from: cleanPhone,
          id: data.id || `msg_${Date.now()}`,
          timestamp: String(data.time || Math.floor(Date.now() / 1000)),
          type: mappedType,
        },
      ],
    };

    if (mappedType === 'text') {
      simulatedEvent.messages[0].text = { body: textBody };
    } else if (mappedType === 'image') {
      simulatedEvent.messages[0].image = {
        id: mediaUrl,
        caption: (data.caption || data.body || '').trim(),
        mime_type: 'image/jpeg',
      };
    } else if (mappedType === 'document') {
      simulatedEvent.messages[0].document = {
        id: mediaUrl,
        filename: data.filename || `doc_${Date.now()}.pdf`,
        caption: (data.caption || data.body || '').trim(),
        mime_type: 'application/pdf',
      };
    } else if (mappedType === 'audio') {
      simulatedEvent.messages[0].audio = {
        id: mediaUrl,
        mime_type: 'audio/ogg',
      };
    }

    await botRouter.handleIncomingMessage(simulatedEvent);
  } catch (err) {
    console.error('Error handling UltraMsg webhook event:', err);
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
  console.log(`🤖 ${BRAND.name} Server is live on port ${PORT}`);
  console.log(`🌐 Domain: ${BRAND.domain} | Support: ${BRAND.supportEmail}`);
  console.log(`📡 Webhook URL: http://localhost:${PORT}/webhook`);
  console.log(`=================================================`);

  // Start daily 9:00 AM IST automated expiry check
  schedulerService.startScheduler();
});
