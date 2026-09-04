// =================================================================
// MunshiJi (stayonchat.com) - 3-Layer Dispatch Router
// Layer 1: Fast Regex / Zero-Cost Intent
// Layer 2: Gemini Flash Document / Audio Extraction
// Layer 3: Instant Database Search & Retrieval
// =================================================================

import { dbService } from '../db/supabase.js';
import { geminiService } from '../services/gemini.js';
import { storageService } from '../services/storage.js';
import { whatsappService } from '../services/whatsapp.js';
import { paymentService } from '../services/razorpay.js';
import { personaService } from './persona.js';
import { PLANS, BUSINESS_RULES } from '../config/constants.js';

export const botRouter = {
  /**
   * Main entry point for incoming WhatsApp message events
   */
  async handleIncomingMessage(event: any) {
    const message = event.messages?.[0];
    const contact = event.contacts?.[0];

    if (!message) return;

    const fromPhone = message.from; // User's WhatsApp number
    const userName = contact?.profile?.name || 'Bhaiya';

    // 1. Get or register user in database
    let user;
    try {
      user = await dbService.getOrCreateUser(fromPhone, userName);
    } catch (dbErr) {
      console.warn('DB user fetch/create warning, using fallback:', dbErr);
      user = {
        phone_number: fromPhone,
        name: userName,
        language: 'hinglish',
        plan: 'free' as const,
        file_count: 0,
        reminder_count: 0,
        created_at: new Date().toISOString()
      };
    }

    // =============================================================
    // BRANCH 1: User Clicked an Interactive Button
    // =============================================================
    if (message.type === 'interactive' && message.interactive?.button_reply) {
      const buttonId = message.interactive.button_reply.id;

      if (buttonId.startsWith('upgrade_')) {
        const planKey = buttonId.replace('upgrade_', '') as 'yaad_149' | 'ghar_399' | 'vault_799';
        const plan = PLANS[planKey];
        const paymentLink = await paymentService.createPaymentLink(fromPhone, planKey);

        const responseText = `✨ *${plan.name} Activate karein* 🧞‍♂️\n\nRakam: *₹${plan.priceInr}/saal*\n\nIs link par click karke UPI / Card se payment karein. Payment hote hi aapka plan turant chaloo ho jayega:\n${paymentLink}\n\n_Koi auto-debit nahi hoga. Sirf 1 saal ka ek baar payment._`;
        await whatsappService.sendTextMessage(fromPhone, responseText);
        return;
      }

      if (buttonId === 'dismiss_upsell') {
        await whatsappService.sendTextMessage(fromPhone, 'Hukum! Koi baat nahi bhaiya. Aapka locker pehle ki tarah chalta rahega. 🙏');
        return;
      }
    }

    // =============================================================
    // BRANCH 2: Media Upload (Image or PDF Document)
    // =============================================================
    if (message.type === 'image' || message.type === 'document') {
      const currentPlan = PLANS[user.plan] || PLANS.free;

      // Check quota limit for free tier
      if (user.plan === 'free' && user.file_count >= currentPlan.maxFiles) {
        const upsell = personaService.getQuotaFullUpsell(fromPhone);
        await whatsappService.sendInteractiveButtons(fromPhone, upsell.text, upsell.buttons);
        return;
      }

      // Download file from Meta Cloud API
      const mediaId = message.image ? message.image.id : message.document.id;
      const fileName = message.document?.filename || `doc_${Date.now()}.jpg`;
      const caption = message.image?.caption || message.document?.caption || '';

      await whatsappService.sendTextMessage(fromPhone, 'MunshiJi kaagaz padh rahe hain... 1 second dijiye! ⏳');

      try {
        const { buffer, mimeType } = await whatsappService.downloadMedia(mediaId);

        // Upload encrypted to Supabase Storage
        const { storagePath } = await storageService.uploadDocument(
          fromPhone,
          fileName,
          buffer,
          mimeType
        );

        // Extract metadata using Gemini Flash Vision
        const extracted = await geminiService.extractDocumentMetadata(buffer, mimeType, caption);
        console.log('📄 Gemini Extracted Metadata:', JSON.stringify(extracted, null, 2));

        // Save into Supabase Database
        const savedDoc = await dbService.saveDocument({
          user_phone: fromPhone,
          storage_path: storagePath,
          file_name: fileName,
          file_type: mimeType,
          file_size_bytes: buffer.length,
          category: extracted.category,
          title: extracted.title,
          entity_name: extracted.entity_name || undefined,
          policy_or_bill_no: extracted.policy_or_bill_no || undefined,
          amount: extracted.amount || undefined,
          issue_date: extracted.issue_date || undefined,
          expiry_date: extracted.expiry_date || undefined,
          summary: extracted.summary,
          tags: extracted.tags,
          raw_extraction: extracted,
          is_encrypted: true,
          is_active: true,
        });

        // If expiry found, automatically schedule reminders
        if (extracted.expiry_date && savedDoc.id) {
          await dbService.createReminders(fromPhone, savedDoc.id, extracted.expiry_date);
        }

        // Send confirmation to user
        const remainingSlots = currentPlan.maxFiles - (user.file_count + 1);
        const confirmMsg = personaService.getDocSavedMessage(extracted, user.plan === 'free' ? remainingSlots : undefined);
        await whatsappService.sendTextMessage(fromPhone, confirmMsg);

        // Contextual Upsell Check (Anti-Spam rule: max 1 per 7 days)
        if (extracted.expiry_date && user.plan === 'free' && dbService.canSendUpsell(user)) {
          const upsell = personaService.getExpiryUpsell(fromPhone, extracted.title, extracted.expiry_date);
          await whatsappService.sendInteractiveButtons(fromPhone, upsell.text, upsell.buttons);
          await dbService.markUpsellSent(fromPhone);
        }
      } catch (err: any) {
        console.error('Failed to process document:', err);
        await whatsappService.sendTextMessage(fromPhone, 'Kshama karein bhaiya, kaagaz padhne mein thodi takleef hui. Kripya thoda saaf photo ya PDF dobara bhejein.');
      }
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

        if (voiceResult.intent === 'search' || voiceResult.query) {
          // Perform search based on transcribed query
          const results = await dbService.searchDocuments(fromPhone, voiceResult.query);
          const reply = personaService.formatSearchResults(voiceResult.query, results);
          await whatsappService.sendTextMessage(fromPhone, reply);
          return;
        }

        if (voiceResult.intent === 'expiry_check') {
          const expiries = await dbService.getUserExpiries(fromPhone);
          const reply = personaService.formatExpiriesList(expiries);
          await whatsappService.sendTextMessage(fromPhone, reply);
          return;
        }

        // General voice response
        await whatsappService.sendTextMessage(fromPhone, `MunshiJi ne sun liya: "${voiceResult.transcript}" 🧞‍♂️\n\nAap apna koi bhi kaagaz (photo/pdf) bhej sakte hain, main sambhal lunga!`);
      } catch (err) {
        console.error('Failed to process audio:', err);
        await whatsappService.sendTextMessage(fromPhone, 'MunshiJi aapki awaaz saaf sun nahi paaye. Kripya dobara voice note bhejein ya type karein.');
      }
      return;
    }

    // =============================================================
    // BRANCH 4: Plain Text Query (Fast 0 ms Layer 1 & 3 Router)
    // =============================================================
    if (message.type === 'text') {
      const text = (message.text?.body || '').trim();
      const lowerText = text.toLowerCase();

      // 4.1 Greeting / First contact
      if (['hi', 'hello', 'hey', 'namaste', 'pranam', 'munshiji', 'start'].includes(lowerText)) {
        await whatsappService.sendTextMessage(fromPhone, personaService.getWelcomeMessage(userName));
        return;
      }

      // 4.2 Expiry inquiry
      if (['expiry', 'dates', 'kab khatam', 'renew', 'tarikh', 'tareekh', 'list'].some(k => lowerText.includes(k))) {
        const expiries = await dbService.getUserExpiries(fromPhone);
        const reply = personaService.formatExpiriesList(expiries);
        await whatsappService.sendTextMessage(fromPhone, reply);
        return;
      }

      // 4.3 Succession / Nominee inquiry (WarisPath Kit)
      if (['waris', 'nominee', 'papa ke papers', 'baad mein', 'succession'].some(k => lowerText.includes(k))) {
        await whatsappService.sendTextMessage(fromPhone, personaService.getWarisPathInfo());
        return;
      }

      // 4.4 Plans & Pricing inquiry
      if (['plan', 'price', 'pricing', 'kharidna', 'charges', 'pack'].some(k => lowerText.includes(k))) {
        const plansMsg = `📋 *MunshiJi Parivaar Plans (stayonchat.com)* 🧞‍♂️\n\n1️⃣ *Free Pack:* 15 files + 1 reminder trial (₹0)\n2️⃣ *Yaad Plan:* 50 files + 20 WhatsApp reminders (₹149/saal)\n3️⃣ *Ghar Plan:* 200 files + 4 Family seats + Unlimited reminders (₹399/saal)\n4️⃣ *Vault Plan:* 500 files + CA link + Waris kit (₹799/saal)\n\n_Jo plan chahiye uska naam likhein ya button dabayein._`;
        await whatsappService.sendInteractiveButtons(fromPhone, plansMsg, [
          { id: 'upgrade_yaad_149', title: 'Yaad Plan (₹149)' },
          { id: 'upgrade_ghar_399', title: 'Ghar Plan (₹399)' },
          { id: 'upgrade_vault_799', title: 'Vault Plan (₹799)' }
        ]);
        return;
      }

      // 4.5 Fast Search Query (e.g. "RC", "Havells bill", "LIC policy", "PUC")
      // Clean query text: remove common words like "mera", "meri", "dikha", "bhej", "kahan hai"
      const cleanQuery = text
        .replace(/^(mera|meri|mere|apna|apni|bhai|munshiji)\s+/i, '')
        .replace(/\s+(bhej|bhejo|dikha|dikhao|kahan hai|kaha h|send)$/i, '')
        .trim();

      const searchKeyword = cleanQuery || text;
      const results = await dbService.searchDocuments(fromPhone, searchKeyword);

      if (results.length === 1 && results[0].storage_path) {
        // Single exact result found! Send details + original image/document
        const doc = results[0];
        let caption = `📄 *${doc.title}* 🧞‍♂️\n`;
        if (doc.entity_name) caption += `🏢 ${doc.entity_name}\n`;
        if (doc.policy_or_bill_no) caption += `🔢 No: ${doc.policy_or_bill_no}\n`;
        if (doc.expiry_date) caption += `⏳ Expiry: ${doc.expiry_date}\n`;
        if (doc.summary) caption += `📝 ${doc.summary}\n`;

        try {
          const buffer = await storageService.downloadDocument(doc.storage_path);
          const mimeType = doc.file_type || 'image/jpeg';
          const mediaId = await whatsappService.uploadMedia(buffer, mimeType, `${doc.title}.jpg`);

          if (mediaId) {
            console.log(`Sending image by mediaId ${mediaId} to ${fromPhone}...`);
            await whatsappService.sendImageByMediaId(fromPhone, mediaId, caption.trim());
            return;
          }
        } catch (mediaErr) {
          console.error('Error sending media back to user:', mediaErr);
        }

        // Fallback text if media upload fails
        await whatsappService.sendTextMessage(fromPhone, caption.trim());
      } else {
        const formatted = personaService.formatSearchResults(searchKeyword, results);
        await whatsappService.sendTextMessage(fromPhone, formatted);
      }
    }
  }
};
