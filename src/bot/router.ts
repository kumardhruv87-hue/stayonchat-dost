// =================================================================
// Keepr (usekeepr.com) - Multi-Layer Smart Router
// Layer 1: Interactive Buttons & Language Selection
// Layer 2: Natural Reminders & Life Guidance (Gemini Flash)
// Layer 3: Document Vault & Original PDF/Image Delivery
// Layer 4: Autonomous Conversational AI Companion
// =================================================================

import { dbService } from '../db/supabase.js';
import { geminiService } from '../services/gemini.js';
import { storageService } from '../services/storage.js';
import { whatsappService } from '../services/whatsapp.js';
import { paymentService } from '../services/razorpay.js';
import { watchdogService } from '../services/watchdog.service.js';
import { sirenService } from '../services/siren.service.js';
import { schedulerService } from '../services/scheduler.js';
import { metaAdsService } from '../services/meta-ads.service.js';
import { personaService } from './persona.js';
import { PLANS, BRAND } from '../config/constants.js';

export function detectMessageLanguage(text: string, currentPref: string = 'english'): string {
  if (!text || text.trim().length === 0) return currentPref;
  const t = text.trim();

  // 1. Check Devanagari script (Hindi / Marathi)
  if (/[\u0900-\u097F]/.test(t)) {
    return 'hi';
  }

  // 2. Check Hinglish keywords
  const lower = t.toLowerCase();
  const hinglishMarkers = [
    'kya', 'hai', 'hain', 'ho', 'mera', 'meri', 'mere', 'apna', 'apni', 'apne',
    'bhai', 'dost', 'bhejo', 'bhej', 'karo', 'karein', 'karna', 'yaad', 'rakho',
    'kal', 'aaj', 'parso', 'subah', 'shaam', 'raat', 'kripya', 'dawa', 'dawai',
    'kaagaz', 'kagaz', 'gaadi', 'paise', 'batao', 'dekh', 'lena', 'dena',
    'nahi', 'nahin', 'thoda', 'theek', 'achha', 'acha', 'bhi', 'toh', 'aur',
    'chahiye', 'kahan', 'dikhao', 'dikhana', 'mil', 'gaya', 'gayi', 'hoga', 'pehle'
  ];
  
  const words = lower.replace(/[^\w\s]/g, ' ').split(/\s+/).filter(w => w.length > 1);
  const matchCount = words.filter(w => hinglishMarkers.includes(w)).length;
  
  if (matchCount >= 2 || (words.length <= 4 && matchCount >= 1)) {
    return 'hinglish';
  }

  // 3. English markers or pure English sentences
  const englishMarkers = [
    'what', 'where', 'when', 'remind', 'remember', 'save', 'send', 'show',
    'password', 'car', 'insurance', 'due', 'my', 'the', 'please', 'thanks',
    'hi', 'hello', 'who', 'how', 'bill', 'receipt', 'note', 'forget', 'police', 'doc', 'docs'
  ];
  const enCount = words.filter(w => englishMarkers.includes(w)).length;
  if (enCount >= 1 && matchCount === 0) {
    return 'english';
  }

  return currentPref || 'english';
}

export const botRouter = {
  /**
   * Helper: Display user's active monitored URLs & status
   */
  async showMyMonitors(fromPhone: string): Promise<void> {
    const userUrls = watchdogService.getMonitoredUrlsByPhone(fromPhone);
    if (!userUrls || userUrls.length === 0) {
      const emptyMsg = `📡 *No URLs on your RoasSiren Radar yet.*\n\nTo lock an active Meta ad landing page or Blinkit SKU under 24/7 siren protection, reply with:\n\`monitor https://yourbrand.com/products/hero-sku\``;
      await whatsappService.sendTextMessage(fromPhone, emptyMsg);
      return;
    }

    let reply = `📡 *Your Active RoasSiren Radar (${userUrls.length}):*\n━━━━━━━━━━━━━━━━━━━━\n`;
    userUrls.forEach((item, idx) => {
      const icon = item.lastStatus === 'SAFE_IN_STOCK' ? '🟢' : item.lastStatus === 'CRITICAL_OUT_OF_STOCK' ? '🔴' : '🟡';
      const pBadge = item.platform === 'BLINKIT' ? '⚡ Blinkit' : '🛍️ Shopify';
      reply += `${idx + 1}. ${icon} *${item.brandName}* [${pBadge}]\n   🔗 ${item.url}\n   📊 Status: ${item.lastStatus.replace(/_/g, ' ')}\n\n`;
    });
    reply += `_To add another URL, reply: \`monitor <url>\` | Type \`plan\` to view quota_`;

    await whatsappService.sendTextMessage(fromPhone, reply);
    await dbService.saveChatMessage(fromPhone, 'model', reply);
  },

  /**
   * Alias for backward compatibility
   */
  async showMyDocs(fromPhone: string, _language: string = 'english'): Promise<void> {
    await this.showMyMonitors(fromPhone);
  },

  /**
   * Helper: Display Daily Executive ROAS Digest
   */
  async showDigest(fromPhone: string): Promise<void> {
    const userUrls = watchdogService.getMonitoredUrlsByPhone(fromPhone);
    if (userUrls.length === 0) {
      await whatsappService.sendTextMessage(fromPhone, `📡 *No SKUs on radar yet.* Reply \`monitor <product-url>\` to protect your first active ad destination.`);
      return;
    }
    const digestText = schedulerService.generateUserDigestText(fromPhone, userUrls);
    await whatsappService.sendTextMessage(fromPhone, digestText);
    await dbService.saveChatMessage(fromPhone, 'model', digestText);
  },

  /**
   * Alias for backward compatibility
   */
  async showMyReminders(fromPhone: string, _language: string = 'english'): Promise<void> {
    await this.showDigest(fromPhone);
  },

  /**
   * Helper: Display RoasSiren B2B Subscription Plans
   */
  async showPlans(fromPhone: string): Promise<void> {
    const plansMsg = `💎 *RoasSiren™ Subscription Plans* 🚨\n━━━━━━━━━━━━━━━━━━━━\nChoose the right watchdog tier for your store or agency:\n\n1️⃣ *STARTER D2C — ₹1,999/month*\n• Up to 15 active ad landing pages monitored 24/7\n• 15-minute background radar sweeps\n• 60-second WhatsApp Siren to Founder / Buyer\n• Broken link (404) & Out-of-Stock sirens\n👉 Instant Checkout: https://rzp.io/rzp/ukMXxGY\n\n2️⃣ *GROWTH BRAND — ₹4,999/month* (Most Popular)\n• Up to 50 active ad landing pages monitored\n• Ultra-fast 5-minute autonomous radar\n• Multi-Buyer Sirens (Up to 3 team members)\n• Automatic Restock Recovery alerts\n👉 Instant Checkout: https://rzp.io/rzp/OOIVXyJ\n\n3️⃣ *AGENCY FLEET — ₹9,999/month*\n• Up to 200 active ad landing pages across all clients\n• Multi-client agency command dashboard\n• Slack & Discord Webhook sirens\n👉 Instant Checkout: https://rzp.io/rzp/SjNJKT0\n━━━━━━━━━━━━━━━━━━━━\n_Type \`buy starter\`, \`buy growth\`, or \`buy agency\` to subscribe._`;
    await whatsappService.sendTextMessage(fromPhone, plansMsg);
    await dbService.saveChatMessage(fromPhone, 'model', plansMsg);
  },

  /**
   * Main entry point for incoming WhatsApp message events
   */
  async handleIncomingMessage(event: any) {
    const message = event.messages?.[0];
    const contact = event.contacts?.[0];

    if (!message) return;

    const fromPhone = message.from; // User's WhatsApp number
    const rawContactName = contact?.profile?.name;

    // 1. Get or register user in database
    const user = await dbService.getOrCreateUser(fromPhone, rawContactName);
    const resolvedName = (user.name && user.name !== 'Bhai' && user.name !== 'Friend') ? user.name : (rawContactName || 'Friend');
    const userLang = user.language || 'english';

    // Extract message content for language detection
    let incomingText = '';
    if (message.type === 'text') incomingText = message.text?.body || '';
    else if (message.type === 'image' || message.type === 'document') incomingText = message.image?.caption || message.document?.caption || '';

    // Auto-detect & dynamically mirror language
    const detectedLanguage = detectMessageLanguage(incomingText, userLang);
    if (detectedLanguage !== user.language && incomingText.trim().length > 2) {
      await dbService.setUserLanguage(fromPhone, detectedLanguage);
    }
    const activeLang = detectedLanguage || userLang;

    // 1.1 Check if new user came with a viral referral code (e.g. "Hi DOST ref_956093")
    const refMatch = (message.text?.body || '').match(/ref_([a-zA-Z0-9]+)/i);
    if (refMatch && !user.referred_by) {
      const refCode = refMatch[0];
      const result = await dbService.applyReferral(fromPhone, refCode);
      if (result.success && result.referrerPhone) {
        // Send instant celebration message to the referrer
        const rewardMsg = personaService.getReferralRewardMessage(resolvedName, result.newTotalBonus || 15);
        await whatsappService.sendTextMessage(result.referrerPhone, rewardMsg);
      }
    }

    // =============================================================
    // BRANCH 1: User Clicked an Interactive Button
    // =============================================================
    if (message.type === 'interactive' && message.interactive?.button_reply) {
      const buttonId = message.interactive.button_reply.id;

      // 1.1 Language Switcher Selection
      if (buttonId.startsWith('lang_')) {
        const chosenLang = buttonId.replace('lang_', '') as 'en' | 'hi' | 'hinglish';
        await dbService.setUserLanguage(fromPhone, chosenLang);
        dbService.clearUserPromptState(fromPhone);
        const welcome = personaService.getIntroMessage(resolvedName, chosenLang);
        await whatsappService.sendTextMessage(fromPhone, welcome);
        await dbService.saveChatMessage(fromPhone, 'model', welcome);
        return;
      }

      // 1.2 Interactive Menu Buttons
      if (buttonId === 'btn_test_siren') {
        await sirenService.sendTestSiren(fromPhone);
        return;
      }

      if (buttonId === 'btn_my_monitors' || buttonId === 'btn_my_docs') {
        await this.showMyMonitors(fromPhone);
        return;
      }

      if (buttonId === 'btn_plans' || buttonId === 'btn_pricing') {
        await this.showPlans(fromPhone);
        return;
      }

      if (buttonId === 'btn_client_portal') {
        const cleanPhone = fromPhone.replace(/\D/g, '');
        const portalMsg = `🌐 *Client Transparency Portal:*\nhttps://keepr-bot.onrender.com/client?phone=${cleanPhone}`;
        await whatsappService.sendTextMessage(fromPhone, portalMsg);
        return;
      }

      // 1.3 Subscription Plan Direct Checkout
      if (buttonId.startsWith('upgrade_') || buttonId.startsWith('buy_')) {
        const planKey = buttonId.replace(/^(upgrade_|buy_)/, '');
        const targetPlan = planKey.includes('agency') ? 'agency_9999' : planKey.includes('growth') ? 'growth_4999' : 'starter_1999';
        const plan = PLANS[targetPlan] || PLANS.starter_1999;
        const paymentLink = await paymentService.createPaymentLink(fromPhone, targetPlan);

        const responseText = `💎 *Activate ${plan.name}* 🚨\n━━━━━━━━━━━━━━━━━━━━\nInvestment: ₹${plan.priceInr.toLocaleString('en-IN')}/${plan.period}\n\n👉 Complete instant checkout via UPI / Card:\n${paymentLink}\n\nYour 24/7 autonomous watchdog radar activates immediately!`;
        await whatsappService.sendTextMessage(fromPhone, responseText);
        return;
      }

      // 1.4 Dismiss
      if (buttonId === 'dismiss_upsell') {
        await whatsappService.sendTextMessage(fromPhone, `RoasSiren is standing by on 24/7 radar. Paste any product URL whenever you are ready! 🚨`);
        return;
      }
    }

    // =============================================================
    // BRANCH 2: Media Upload (Ad Creative / Inventory Screenshot)
    // =============================================================
    if (message.type === 'image' || message.type === 'document') {
      const caption = message.image?.caption || message.document?.caption || '';
      
      // If caption contains a product URL, scan it immediately!
      const urlMatch = caption.match(/(https?:\/\/[^\s]+)/i);
      if (urlMatch) {
        await whatsappService.sendTextMessage(fromPhone, `🔍 *Creative Asset & URL Received:* Scanning ${urlMatch[0]}...`);
        const diag = await watchdogService.scanUrl(urlMatch[0]);
        const statusBadge = diag.isAvailable ? '✅ IN STOCK' : '🚨 OUT OF STOCK';
        const report = `🛡️ *[CREATIVE AUDIT]*\nProduct: ${diag.productTitle}\nStatus: ${statusBadge}\n${diag.price ? `Price: ₹${diag.price}\n` : ''}\nReply \`monitor ${urlMatch[0]}\` to lock 24/7 sirens!`;
        await whatsappService.sendTextMessage(fromPhone, report);
        return;
      }

      const reply = `📸 *Ad Creative / Screenshot Received* 🚨\n\nTo audit live inventory and prevent ad budget waste on this product:\n👉 *Paste its product URL* (e.g. \`https://yourbrand.com/products/hero-sku\`)\n👉 Or reply \`audit yourstore.com\` to scan full catalog.`;
      await whatsappService.sendTextMessage(fromPhone, reply);
      await dbService.saveChatMessage(fromPhone, 'user', `[Uploaded ${message.type}]`);
      await dbService.saveChatMessage(fromPhone, 'model', reply);
      return;
    }

    // =============================================================
    // BRANCH 3: Voice Note (.ogg / .opus audio)
    // =============================================================
    if (message.type === 'audio') {
      try {
        const { buffer, mimeType } = await whatsappService.downloadMedia(message.audio.id);
        const voiceResult = await geminiService.processVoiceNote(buffer, mimeType);

        console.log(`Voice transcribed: "${voiceResult.transcript}", intent: ${voiceResult.intent}`);
        const voiceLang = detectMessageLanguage(voiceResult.transcript, activeLang);

        const history = await dbService.getRecentChatHistory(fromPhone, 6);
        const chatReply = await geminiService.chatAsWatchdog(
          voiceResult.transcript,
          history,
          voiceLang,
          resolvedName
        );
        await whatsappService.sendTextMessage(fromPhone, chatReply);
        await dbService.saveChatMessage(fromPhone, 'user', `[Voice note: ${voiceResult.transcript}]`);
        await dbService.saveChatMessage(fromPhone, 'model', chatReply);
      } catch (err) {
        console.error('Failed to process audio:', err);
        await whatsappService.sendTextMessage(fromPhone, '⚠️ Could not process audio. Please send a text message or paste your product link.');
      }
      return;
    }

    // =============================================================
    // BRANCH 4: Plain Text Messages
    // =============================================================
    if (message.type === 'text') {
      const text = (message.text?.body || '').trim();
      const lowerText = text.toLowerCase();

      // Record incoming user message in conversation memory
      await dbService.saveChatMessage(fromPhone, 'user', text);

      // Check if user mentions a vehicle plate in text (e.g. "DL 01 AB 1234", "UP16 CD 5678")
      const vehicleMatch = text.match(/\b([A-Z]{2}\s*[-]?\s*[0-9]{1,2}\s*[-]?\s*[A-Z]{0,3}\s*[-]?\s*[0-9]{4})\b/i);
      if (vehicleMatch) {
        const cleanPlate = vehicleMatch[1].replace(/[\s-]/g, '').toUpperCase();
        await dbService.saveUserProfile(fromPhone, { vehiclePlate: cleanPlate });
      }

      // 4.0 Check if user is in pending_language or replying to Language selection
      const promptState = dbService.getUserPromptState(fromPhone);
      if (promptState === 'pending_language' || promptState === 'language_picker') {
        if (['1', 'hinglish', 'mix'].includes(lowerText)) {
          dbService.clearUserPromptState(fromPhone);
          await dbService.setUserLanguage(fromPhone, 'hinglish');
          const intro = personaService.getIntroMessage(resolvedName, 'hinglish');
          await whatsappService.sendTextMessage(fromPhone, intro);
          await dbService.saveChatMessage(fromPhone, 'model', intro);
          return;
        }
        if (['2', 'hindi', 'hi', 'हिंदी'].includes(lowerText)) {
          dbService.clearUserPromptState(fromPhone);
          await dbService.setUserLanguage(fromPhone, 'hi');
          const intro = personaService.getIntroMessage(resolvedName, 'hi');
          await whatsappService.sendTextMessage(fromPhone, intro);
          await dbService.saveChatMessage(fromPhone, 'model', intro);
          return;
        }
        if (['3', 'english', 'en'].includes(lowerText)) {
          dbService.clearUserPromptState(fromPhone);
          await dbService.setUserLanguage(fromPhone, 'en');
          const intro = personaService.getIntroMessage(resolvedName, 'en');
          await whatsappService.sendTextMessage(fromPhone, intro);
          await dbService.saveChatMessage(fromPhone, 'model', intro);
          return;
        }
      }

      // =============================================================
      // RoasSiren Watchdog Commands
      // =============================================================

      // A. Test WhatsApp Siren
      if (['test', 'test siren', 'siren', 'demo siren'].includes(lowerText)) {
        await sirenService.sendTestSiren(fromPhone);
        return;
      }

      // B1. Store-Wide Catalog Audit: "audit snitch.co.in" or "catalog boat-lifestyle.com"
      if (lowerText.startsWith('audit ') || lowerText.startsWith('catalog ') || lowerText.startsWith('scanstore ')) {
        const rawDomain = text.replace(/^(audit|catalog|scanstore)\s+/i, '').trim();
        const cleanDomain = rawDomain.replace(/^https?:\/\//i, '').replace(/\/.*$/, '').trim();

        if (!cleanDomain.includes('.')) {
          await whatsappService.sendTextMessage(fromPhone, '⚠️ Please provide a valid store domain, e.g.:\n`audit snitch.co.in`');
          return;
        }

        await whatsappService.sendTextMessage(fromPhone, `🔍 *Auditing public Shopify catalog for ${cleanDomain}...*\n_Scanning products for out-of-stock ad burn risks..._`);
        const report = await watchdogService.scanStore(cleanDomain);

        if (report.totalProducts === 0) {
          await whatsappService.sendTextMessage(fromPhone, `⚠️ Could not scan catalog for *${cleanDomain}*. Ensure the domain is powered by Shopify or try scanning an individual product link:\n\`scan https://${cleanDomain}/products/your-sku\``);
          return;
        }

        let auditMsg = `🚨 *[ROASSIREN STORE CATALOG AUDIT]* 🚨\n━━━━━━━━━━━━━━━━━━━━\n🏬 *Store:* ${report.brandName} (${report.domain})\n📦 *Total SKUs Scanned:* ${report.totalProducts}\n`;
        auditMsg += `🔴 *Sold Out SKUs:* ${report.outOfStockCount}\n`;
        auditMsg += `🟡 *Partial Stockout:* ${report.partialCount}\n`;
        auditMsg += `🟢 *100% In Stock:* ${report.inStockCount}\n`;
        auditMsg += `\n📊 *Catalog Vulnerability Score:* ${report.vulnerabilityScorePct}%\n`;
        auditMsg += `💸 *Estimated Daily Ad Burn Risk:* ~₹${report.estimatedPotentialWastePerDay.toLocaleString('en-IN')}/day\n`;

        if (report.outOfStockProducts.length > 0) {
          auditMsg += `\n❌ *Top Out-of-Stock Products Found:*\n`;
          report.outOfStockProducts.slice(0, 4).forEach((p, idx) => {
            auditMsg += `${idx + 1}. *${p.title}* ${p.price ? `(₹${p.price})` : ''}\n   🔗 ${p.url}\n`;
          });
        }

        auditMsg += `\n━━━━━━━━━━━━━━━━━━━━\n⚡ *Protect These SKUs 24/7:*\nReply: \`monitor <product-url>\` to lock them under our 60-second WhatsApp Siren!\n\n🌐 *View Interactive Audit Page:*\nhttps://keepr-bot.onrender.com/audit?store=${encodeURIComponent(report.domain)}`;
        await whatsappService.sendTextMessage(fromPhone, auditMsg);
        return;
      }

      // B2. Monitor URL Command: "monitor https://..." or "watch https://..."
      if (lowerText.startsWith('monitor ') || lowerText.startsWith('watch ') || lowerText.startsWith('track ')) {
        const rawUrl = text.replace(/^(monitor|watch|track)\s+/i, '').trim();
        const urlMatch = rawUrl.match(/(https?:\/\/[^\s]+)/i);
        const targetUrl = urlMatch ? urlMatch[0] : rawUrl;

        if (!targetUrl.includes('.')) {
          await whatsappService.sendTextMessage(fromPhone, '⚠️ Please provide a valid store or Blinkit URL, e.g.:\n`monitor https://brand.com/products/summer-tee`');
          return;
        }

        // Quota check based on purchased plan
        const userUrls = watchdogService.getMonitoredUrlsByPhone(fromPhone);
        const planKey = user.plan || (userUrls.length > 0 ? 'starter_1999' : 'free_scan');
        const planDetail = PLANS[planKey] || PLANS.starter_1999;
        const maxQuota = planDetail.maxMonitoredUrls || 15;

        if (userUrls.length >= maxQuota) {
          const quotaReachedMsg = `⚠️ *[RADAR QUOTA REACHED]*\n━━━━━━━━━━━━━━━━━━━━\nYou have locked in all *${maxQuota}/${maxQuota}* available slots on your *${planDetail.name}* plan.\n\nTo expand your radar and monitor more ad destinations:\n👉 Reply \`buy growth\` for 50 URLs (₹4,999/mo)\n👉 Reply \`buy agency\` for 200 URLs (₹9,999/mo)\n\nType \`plan\` to view your full subscription & lock-in status.`;
          await whatsappService.sendTextMessage(fromPhone, quotaReachedMsg);
          return;
        }

        // Check for optional Meta Ad Set ID: adset:123456789 or meta:123456789
        const metaMatch = text.match(/(?:adset|meta)[:=\s]+([0-9]{8,25})/i);
        const metaAdSetId = metaMatch ? metaMatch[1] : undefined;

        // Run instant initial check
        const initialDiag = await watchdogService.scanUrl(targetUrl);
        const monitored = watchdogService.registerMonitoredUrl({
          url: targetUrl,
          userPhone: fromPhone,
          brandName: initialDiag.brandName,
          metaAdSetId,
          autoKillEnabled: !!metaAdSetId,
        });

        const isQuickCommerce = initialDiag.platform === 'BLINKIT';
        const statusEmoji = initialDiag.isAvailable ? '✅' : '🚨';
        const platformLabel = isQuickCommerce ? '⚡ Blinkit Quick Commerce' : '🛍️ Shopify D2C';
        const usedCount = userUrls.length + 1;

        let msg = `🛡️ *[ROASSIREN RADAR LOCKED]* 🚨\n━━━━━━━━━━━━━━━━━━━━\n🏬 *Platform:* ${platformLabel}\n🏷️ *Store / Brand:* ${monitored.brandName}\n📦 *Product:* ${initialDiag.productTitle}\n${statusEmoji} *Initial Status:* ${initialDiag.status}\n🔗 *Target:* ${monitored.url}\n`;
        if (metaAdSetId) {
          msg += `🛑 *Autonomous Meta Auto-Kill:* ACTIVE (Ad Set #${metaAdSetId})\n`;
        }
        msg += `\n📊 *Radar Quota:* ${usedCount}/${maxQuota} Used (${maxQuota - usedCount} available)\n🕒 *Sweep Frequency:* 24/7 Autonomous Radar (Every ${planDetail.scanFrequencyMinutes} mins)\n⚡ *Siren Protocol:* If stock drops to zero or URL hits 404, an emergency WhatsApp siren will alert your phone within 60 seconds!\n━━━━━━━━━━━━━━━━━━━━\n_Type \`plan\` to see subscription details or \`list\` for all locked SKUs._`;
        await whatsappService.sendTextMessage(fromPhone, msg);
        return;
      }

      // C1.2. Daily Executive ROAS Digest On-Demand: "digest", "report", "brief", "summary"
      if (['digest', 'report', 'brief', 'summary', 'morning report', 'daily report', 'roas report'].includes(lowerText)) {
        const userUrls = watchdogService.getMonitoredUrlsByPhone(fromPhone);
        if (userUrls.length === 0) {
          await whatsappService.sendTextMessage(fromPhone, `📡 *No SKUs on radar yet.* Reply \`monitor <product-url>\` to protect your first active ad destination and unlock daily ROAS briefings.`);
          return;
        }

        const digestText = schedulerService.generateUserDigestText(fromPhone, userUrls);
        await whatsappService.sendTextMessage(fromPhone, digestText);
        return;
      }

      // C1.4. Manual Meta Killswitch Command: "killswitch <adSetId>" or "pause <adSetId>"
      if (lowerText.startsWith('killswitch ') || lowerText.startsWith('pause ') || lowerText.startsWith('pausead ')) {
        const rawId = text.replace(/^(killswitch|pause|pausead)\s+/i, '').trim();
        const cleanId = rawId.replace(/\D/g, '');

        if (!cleanId || cleanId.length < 8) {
          await whatsappService.sendTextMessage(fromPhone, '⚠️ Please provide a valid Meta Ad Set ID, e.g.:\n`killswitch 120204894389204`');
          return;
        }

        const killRes = await metaAdsService.pauseAdSet(cleanId);
        const killMsg = `🛑 *[META KILLSWITCH EXECUTED]* 🚨\n━━━━━━━━━━━━━━━━━━━━\nAd Set *#${cleanId}* has been marked PAUSED!\n💸 Zero further ad spend will be wasted.\n\n👉 *Open in Ads Manager:*\n${killRes.adsManagerUrl}\n\n_To reactivate later, reply: \`resume ${cleanId}\`_`;
        await whatsappService.sendTextMessage(fromPhone, killMsg);
        return;
      }

      // C1. Check Active Plan, Subscription & Lock-in Quota: "plan", "my plan", "account", "quota", "lock in"
      if (['plan', 'my plan', 'account', 'quota', 'lock in', 'lockin', 'subscription', 'my account', 'my radar'].includes(lowerText)) {
        const userUrls = watchdogService.getMonitoredUrlsByPhone(fromPhone);
        const planKey = user.plan || (userUrls.length > 0 ? 'starter_1999' : 'free_scan');
        const planDetail = PLANS[planKey] || PLANS.starter_1999;
        
        const usedCount = userUrls.length;
        const maxQuota = planDetail.maxMonitoredUrls || 15;
        const availableQuota = Math.max(0, maxQuota - usedCount);

        let expiryDate = 'Active (Monthly)';
        if (user.plan_expires_at) {
          expiryDate = new Date(user.plan_expires_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
        } else {
          const defaultExp = new Date();
          defaultExp.setDate(defaultExp.getDate() + 30);
          expiryDate = defaultExp.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
        }

        const totalProtected = userUrls.reduce((acc, curr) => acc + (curr.dailyAdSpend || 3000), 0) * 30;

        let statusReport = `💎 *[ROASSIREN ACCOUNT & RADAR LOCK-IN]* 🚨\n━━━━━━━━━━━━━━━━━━━━\n👤 *Subscriber:* +${fromPhone.replace(/\D/g, '')}\n📦 *Current Plan:* ${planDetail.name.toUpperCase()} (₹${planDetail.priceInr.toLocaleString('en-IN')}/${planDetail.period})\n🛡️ *Radar Status:* ACTIVE 🟢\n🕒 *Valid Until:* ${expiryDate}\n\n📊 *Radar Quota Allocation:*\n• Monitored SKUs: ${usedCount} / ${maxQuota} Slots (${availableQuota} Available)\n• Sweep Frequency: Every ${planDetail.scanFrequencyMinutes} Minutes\n• Monthly Ad Spend Protected: ₹${totalProtected.toLocaleString('en-IN')}\n• Siren Recipient: +${fromPhone.replace(/\D/g, '')}\n`;

        if (userUrls.length > 0) {
          statusReport += `\n📡 *Your Locked SKUs (${userUrls.length}):*\n`;
          userUrls.forEach((item, idx) => {
            const icon = item.lastStatus === 'SAFE_IN_STOCK' ? '🟢' : item.lastStatus === 'CRITICAL_OUT_OF_STOCK' ? '🔴' : '🟡';
            const pBadge = item.platform === 'BLINKIT' ? '⚡ Blinkit' : '🛍️ Shopify';
            statusReport += `${idx + 1}. ${icon} *${item.brandName}* [${pBadge}]\n   🔗 ${item.url}\n   📊 Status: ${item.lastStatus.replace(/_/g, ' ')}\n`;
          });
        } else {
          statusReport += `\n⚠️ *No SKUs locked in yet.* Reply \`monitor <product-url>\` to lock your first active Meta ad destination.\n`;
        }

        statusReport += `\n━━━━━━━━━━━━━━━━━━━━\n⚡ *Quick Actions:*\n• Lock another SKU: \`monitor <url>\`\n• Audit full store: \`audit <brand.com>\`\n• Upgrade Plan: \`pricing\`\n• Test Siren: \`test\`\n• Web Dashboard: https://keepr-bot.onrender.com/dashboard`;

        await whatsappService.sendTextMessage(fromPhone, statusReport);
        return;
      }

      // C2. List Active Monitored URLs: "list", "radar", "monitors"
      if (['list', 'radar', 'monitors', 'my monitors', 'urls', 'status'].includes(lowerText)) {
        const userUrls = watchdogService.getMonitoredUrlsByPhone(fromPhone);
        if (userUrls.length === 0) {
          const emptyMsg = `📡 *No URLs on your RoasSiren Radar yet.*\n\nTo lock an active Meta ad or Blinkit destination under 24/7 siren protection, reply with:\n\`monitor https://yourbrand.com/products/hero-sku\``;
          await whatsappService.sendTextMessage(fromPhone, emptyMsg);
          return;
        }

        let listMsg = `📡 *Your Active RoasSiren Watchdogs (${userUrls.length}):*\n━━━━━━━━━━━━━━━━━━━━\n`;
        userUrls.forEach((item, idx) => {
          const icon = item.lastStatus === 'SAFE_IN_STOCK' ? '🟢' : item.lastStatus === 'CRITICAL_OUT_OF_STOCK' ? '🔴' : '🟡';
          const pBadge = item.platform === 'BLINKIT' ? '⚡ Blinkit' : '🛍️ Shopify';
          listMsg += `${idx + 1}. ${icon} *${item.brandName}* [${pBadge}]\n   🔗 ${item.url}\n   📊 Status: ${item.lastStatus}\n   🕒 Last Sweep: ${new Date(item.lastCheckedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}\n\n`;
        });
        listMsg += `_To add another URL, reply: \`monitor <url>\` | Type \`plan\` to view quota_`;
        await whatsappService.sendTextMessage(fromPhone, listMsg);
        return;
      }

      // D. Instant Stock Scan: "scan https://..." or pasting any HTTP/HTTPS URL
      const hasUrl = /(https?:\/\/[^\s]+)/i.test(text);
      if (lowerText.startsWith('scan ') || hasUrl) {
        const urlMatch = text.match(/(https?:\/\/[^\s]+)/i);
        const targetUrl = urlMatch ? urlMatch[0] : text.replace(/^scan\s+/i, '').trim();

        if (targetUrl.startsWith('http')) {
          await whatsappService.sendTextMessage(fromPhone, `🔍 *Scanning destination:* ${targetUrl} ...`);
          const diag = await watchdogService.scanUrl(targetUrl);

          const isQuickCommerce = diag.platform === 'BLINKIT';
          const platformName = isQuickCommerce 
            ? '⚡ Blinkit Quick Commerce' 
            : (diag.platform === 'WOOCOMMERCE' ? '📦 WooCommerce D2C' : '🛍️ Shopify D2C');

          const statusBadge = diag.isAvailable 
            ? (isQuickCommerce ? '✅ IN STOCK (10-Min Delivery Ready)' : '✅ IN STOCK (Ready for Ads)') 
            : (isQuickCommerce ? '🚨 SOLD OUT IN DARK STORE' : '🚨 CRITICAL OUT OF STOCK');

          let scanReport = `🛡️ *[ROASSIREN DIAGNOSTIC AUDIT]*\n━━━━━━━━━━━━━━━━━━━━\n🏬 *Platform:* ${platformName}\n🏷️ *Brand:* ${diag.brandName}\n📦 *Product:* ${diag.productTitle}\n${diag.price ? `💰 *Price:* ₹${diag.price} ${diag.currency}\n` : ''}📊 *Status:* ${statusBadge}\n`;

          if (isQuickCommerce) {
            scanReport += `🛡️ *Anti-Bot WAF:* Cloudflare Bypassed (Native TLS)\n`;
          } else if (diag.totalVariants > 0) {
            scanReport += `🛒 *Inventory:* ${diag.inStockVariants}/${diag.totalVariants} variants in stock\n`;
          }

          if (diag.adWasteRisk.level === 'CRITICAL') {
            if (isQuickCommerce) {
              scanReport += `\n⚠️ *Quick Commerce Alert:* Product is SOLD OUT in this dark store hub! Customers cannot buy and search rank is demoting.\n`;
            } else {
              scanReport += `\n💸 *ESTIMATED AD WASTE:* ~₹${diag.adWasteRisk.hourlyBurnRateInr}/hour\n⚠️ *Action:* ${diag.adWasteRisk.actionHeadline}\n${diag.adWasteRisk.actionAdvice}\n`;
            }
          } else if (diag.adWasteRisk.level === 'HIGH') {
            scanReport += `\n⚠️ *Bounce Risk:* ~${diag.adWasteRisk.estimatedWastePct}% (Some popular sizes sold out)\n`;
          } else {
            scanReport += `\n🟢 *Verdict:* 100% in stock and ready for conversion.\n`;
          }

          scanReport += `\n━━━━━━━━━━━━━━━━━━━━\n⚡ *Want 24/7 WhatsApp Sirens?*\nReply: \`monitor ${diag.url}\``;
          await whatsappService.sendTextMessage(fromPhone, scanReport);
          return;
        }
      }

      // E. Subscription Plans & Pricing Command
      if (['pricing', 'plans', 'plan', 'price', 'upgrade', 'subscription'].includes(lowerText)) {
        const pricingMsg = `💎 *RoasSiren™ Subscription Plans* 🚨\n━━━━━━━━━━━━━━━━━━━━\nChoose the right watchdog tier for your store or agency:\n\n1️⃣ *STARTER D2C — ₹1,999/month*\n• Up to 15 active ad landing pages monitored 24/7\n• 15-minute background radar sweeps\n• 60-second WhatsApp Siren to Founder / Buyer\n• Broken link (404) & Out-of-Stock sirens\n👉 Reply: \`buy starter\`\n\n2️⃣ *GROWTH BRAND — ₹4,999/month* (Most Popular)\n• Up to 50 active ad landing pages monitored\n• Ultra-fast 5-minute autonomous radar\n• Multi-Buyer Sirens (Up to 3 team members)\n• Size/variant level exhaustion alerts\n• Automatic Restock Recovery alerts\n👉 Reply: \`buy growth\`\n\n3️⃣ *AGENCY FLEET — ₹9,999/month*\n• Up to 200 active ad landing pages across all clients\n• Multi-client agency command dashboard\n• Slack & Discord Webhook sirens\n• Priority API access & dedicated account manager\n👉 Reply: \`buy agency\`\n━━━━━━━━━━━━━━━━━━━━\n_Save ₹25,000 to ₹1,50,000+ every month in wasted Meta ad budget._`;
        await whatsappService.sendTextMessage(fromPhone, pricingMsg);
        return;
      }

      // F. Checkout commands: "buy starter", "buy growth", "buy agency"
      if (['buy starter', 'buy starter plan', 'get starter'].includes(lowerText)) {
        const link = await paymentService.createPaymentLink(fromPhone, 'starter_1999');
        const msg = `⚡ *Activate RoasSiren Starter Plan (₹1,999/mo)*\n\nClick this secure link to pay via UPI, Card, or Netbanking:\n${link}\n\nYour 24/7 radar activates instantly upon payment confirmation!`;
        await whatsappService.sendTextMessage(fromPhone, msg);
        return;
      }

      if (['buy growth', 'buy growth plan', 'get growth'].includes(lowerText)) {
        const link = await paymentService.createPaymentLink(fromPhone, 'growth_4999');
        const msg = `⚡ *Activate RoasSiren Growth Brand Plan (₹4,999/mo)*\n\nClick this secure link to pay via UPI, Card, or Netbanking:\n${link}\n\nYour 5-minute multi-buyer radar activates instantly!`;
        await whatsappService.sendTextMessage(fromPhone, msg);
        return;
      }

      if (['buy agency', 'buy agency plan', 'get agency'].includes(lowerText)) {
        const link = await paymentService.createPaymentLink(fromPhone, 'agency_9999');
        const msg = `⚡ *Activate RoasSiren Agency Fleet Plan (₹9,999/mo)*\n\nClick this secure link to pay via UPI, Card, or Netbanking:\n${link}\n\n200-URL agency dashboard & Slack webhooks will be unlocked immediately!`;
        await whatsappService.sendTextMessage(fromPhone, msg);
        return;
      }

      // G. Executive Greeting & Menu
      if (['hi', 'hello', 'hey', 'namaste', 'pranam', 'start', 'shuru', 'menu', 'help', 'madad', 'roas', 'siren'].includes(lowerText)) {
        const welcome = `🚨 *Welcome to RoasSiren™* 🚨\n━━━━━━━━━━━━━━━━━━━━\n*Autonomous Meta Ad Waste & Quick Commerce Dark Store Watchdog*\nStop burning ad spend and losing GMV when inventory drops to zero!\n\n⚡ *Quick Commands:*\n\n1️⃣ *Instant Single SKU Scan:*\n   Paste any product or Blinkit link directly:\n   e.g. \`https://snitch.co.in/products/air-mesh-oversized-tee\`\n   or \`https://blinkit.com/prn/.../prid/333324\`\n\n2️⃣ *Store Catalog Audit:*\n   Audit an entire brand catalog for sold-out ad risks:\n   Reply: \`audit <domain>\` (e.g. \`audit snitch.co.in\`)\n\n3️⃣ *Lock 24/7 Siren Radar:*\n   Reply: \`monitor <url>\`\n\n4️⃣ *Check Active Radar:*\n   Reply: \`list\`\n\n5️⃣ *Test 60-Second WhatsApp Siren:*\n   Reply: \`test\`\n\n6️⃣ *Plans & Pricing:*\n   Reply: \`pricing\`\n━━━━━━━━━━━━━━━━━━━━\n_Paste any product link right now to run a free diagnostic._`;
        await whatsappService.sendTextMessage(fromPhone, welcome);
        await dbService.saveChatMessage(fromPhone, 'model', welcome);
        return;
      }

      // Numbered Menu Direct Routing (Matches Welcome Menu Options)
      // 1. Instant Single SKU Scan
      if (lowerText === '1') {
        const promptMsg = `🔍 *Instant Single SKU Scan*\n\nPaste any Shopify or Blinkit product link to run an instant inventory audit and calculate ad waste risk:\n\ne.g. \`https://snitch.co.in/products/air-mesh-oversized-tee\`\nor \`https://blinkit.com/prn/.../prid/333324\``;
        await whatsappService.sendTextMessage(fromPhone, promptMsg);
        return;
      }

      // 2. Store Catalog Audit
      if (lowerText === '2') {
        const promptMsg = `🏬 *Store Catalog Stockout Audit*\n\nReply with \`audit <domain>\` to scan an entire store catalog for sold-out products:\n\ne.g. \`audit snitch.co.in\` or \`audit boat-lifestyle.com\``;
        await whatsappService.sendTextMessage(fromPhone, promptMsg);
        return;
      }

      // 3. Monitored Radar SKUs
      if (lowerText === '3') {
        await this.showMyMonitors(fromPhone);
        return;
      }

      // 4. Check Active Radar Quota
      if (lowerText === '4') {
        const userUrls = watchdogService.getMonitoredUrlsByPhone(fromPhone);
        const planKey = user.plan || (userUrls.length > 0 ? 'starter_1999' : 'free_scan');
        const planDetail = PLANS[planKey] || PLANS.starter_1999;
        const usedCount = userUrls.length;
        const maxQuota = planDetail.maxMonitoredUrls || 15;
        const availableQuota = Math.max(0, maxQuota - usedCount);

        const statusReport = `💎 *[ROASSIREN ACCOUNT & RADAR LOCK-IN]* 🚨\n━━━━━━━━━━━━━━━━━━━━\n👤 *Subscriber:* +${fromPhone.replace(/\D/g, '')}\n📦 *Current Plan:* ${planDetail.name.toUpperCase()} (₹${planDetail.priceInr.toLocaleString('en-IN')}/${planDetail.period})\n🛡️ *Radar Status:* ACTIVE 🟢\n\n📊 *Radar Quota Allocation:*\n• Monitored SKUs: ${usedCount} / ${maxQuota} Slots (${availableQuota} Available)\n• Sweep Frequency: Every ${planDetail.scanFrequencyMinutes} Minutes\n• Siren Recipient: +${fromPhone.replace(/\D/g, '')}\n━━━━━━━━━━━━━━━━━━━━\n_To upgrade radar capacity, reply \`pricing\`._`;
        await whatsappService.sendTextMessage(fromPhone, statusReport);
        return;
      }

      // 5. Test 60-Second WhatsApp Siren
      if (lowerText === '5') {
        await sirenService.sendTestSiren(fromPhone);
        return;
      }

      // 6. Plans & Pricing
      if (lowerText === '6') {
        await this.showPlans(fromPhone);
        return;
      }

      // Conversational AI Fallback: RoasSiren Executive Watchdog AI
      const respectfulName = (activeLang === 'hi' || activeLang === 'hinglish')
        ? (resolvedName && resolvedName !== 'Friend' && resolvedName !== 'Bhai' ? `${resolvedName} ji` : 'Founder')
        : (resolvedName && resolvedName !== 'Bhai' ? resolvedName : 'Founder');
      const history = await dbService.getRecentChatHistory(fromPhone, 8);

      const watchdogReply = await geminiService.chatAsWatchdog(
        text,
        history,
        activeLang,
        respectfulName
      );
      await whatsappService.sendTextMessage(fromPhone, watchdogReply);
      await dbService.saveChatMessage(fromPhone, 'model', watchdogReply);
    }
  }
};
