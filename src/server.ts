// =================================================================
// Keepr (usekeepr.com) - Main Express Application Server
// Silicon Valley Grade API Server & Webhook Gateway
// =================================================================

import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { botRouter } from './bot/router.js';
import { dbService } from './db/supabase.js';
import { whatsappService } from './services/whatsapp.js';
import { paymentService } from './services/razorpay.js';
import { schedulerService } from './services/scheduler.js';
import { BRAND } from './config/constants.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const WHATSAPP_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'keepr_secure_verify_token_2026';

import path from 'path';

// Capture raw body for Razorpay webhook signature verification
app.use(express.json({
  verify: (req: any, res, buf) => {
    req.rawBody = buf.toString();
  }
}));
app.use(cors());

// Serve public static website (Landing Page on usekeepr.com)
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
