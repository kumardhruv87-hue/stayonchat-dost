// =================================================================
// DOST (stayonchat.com) - Multi-Layer Smart Router
// Layer 1: Interactive Buttons & Language Selection
// Layer 2: Natural Reminders & Astro Profiler (Gemini Flash)
// Layer 3: Document Vault & Original PDF/Image Delivery
// Layer 4: Samajhdaar Dost Conversational AI Companion
// =================================================================

import { dbService } from '../db/supabase.js';
import { geminiService } from '../services/gemini.js';
import { storageService } from '../services/storage.js';
import { whatsappService } from '../services/whatsapp.js';
import { paymentService } from '../services/razorpay.js';
import { personaService } from './persona.js';
import { PLANS, BRAND } from '../config/constants.js';

export const botRouter = {
  /**
   * Main entry point for incoming WhatsApp message events
   */
  async handleIncomingMessage(event: any) {
    const message = event.messages?.[0];
    const contact = event.contacts?.[0];

    if (!message) return;

    const fromPhone = message.from; // User's WhatsApp number
    const userName = contact?.profile?.name || 'Bhai';

    // 1. Get or register user in database
    const user = await dbService.getOrCreateUser(fromPhone, userName);
    const userLang = user.language || 'hinglish';

    // =============================================================
    // BRANCH 1: User Clicked an Interactive Button
    // =============================================================
    if (message.type === 'interactive' && message.interactive?.button_reply) {
      const buttonId = message.interactive.button_reply.id;

      // 1.1 Language Switcher Selection
      if (buttonId.startsWith('lang_')) {
        const chosenLang = buttonId.replace('lang_', '') as 'en' | 'hi' | 'hinglish';
        await dbService.setUserLanguage(fromPhone, chosenLang);
        const welcome = personaService.getWelcomeMessage(userName, chosenLang);
        await whatsappService.sendTextMessage(fromPhone, welcome);
        return;
      }

      // 1.2 Subscription Plans
      if (buttonId.startsWith('upgrade_')) {
        const planKey = buttonId.replace('upgrade_', '') as 'yaad_149' | 'ghar_399' | 'vault_799';
        const plan = PLANS[planKey];
        const paymentLink = await paymentService.createPaymentLink(fromPhone, planKey);

        const responseText = `✨ *${plan.name} Activate karein* 🤖✨\n\nRakam: *₹${plan.priceInr}/saal*\n\nIs link par click karke UPI / Card se payment karein. Payment hote hi aapka plan turant chaloo ho jayega:\n${paymentLink}\n\n_Koi auto-debit nahi hoga. Sirf 1 saal ka ek baar payment._`;
        await whatsappService.sendTextMessage(fromPhone, responseText);
        return;
      }

      // 1.3 Dismiss
      if (buttonId === 'dismiss_upsell') {
        await whatsappService.sendTextMessage(fromPhone, 'Koi baat nahi bhai! Tera dost pehle ki tarah hamesha ready hai. 🙏');
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
      const fileName = message.document?.filename || (message.image ? `doc_${Date.now()}.jpg` : `file_${Date.now()}.pdf`);
      const caption = message.image?.caption || message.document?.caption || '';

      await whatsappService.sendTextMessage(fromPhone, 'DOST kaagaz padh raha hai... 1 second ruko! ⏳');

      try {
        const { buffer, mimeType } = await whatsappService.downloadMedia(mediaId);

        // Upload encrypted to Storage / Local Vault
        const { storagePath } = await storageService.uploadDocument(
          fromPhone,
          fileName,
          buffer,
          mimeType
        );

        // Extract metadata using Gemini Flash Vision
        const extracted = await geminiService.extractDocumentMetadata(buffer, mimeType, caption);
        console.log('📄 Gemini Extracted Metadata:', JSON.stringify(extracted, null, 2));

        // Save into Database
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
        const confirmMsg = personaService.getDocSavedMessage(extracted, userLang, user.plan === 'free' ? remainingSlots : undefined);
        await whatsappService.sendTextMessage(fromPhone, confirmMsg);

        // Contextual Upsell Check (Anti-Spam rule: max 1 per 7 days)
        if (extracted.expiry_date && user.plan === 'free' && dbService.canSendUpsell(user)) {
          const upsell = personaService.getExpiryUpsell(fromPhone, extracted.title, extracted.expiry_date);
          await whatsappService.sendInteractiveButtons(fromPhone, upsell.text, upsell.buttons);
          await dbService.markUpsellSent(fromPhone);
        }
      } catch (err: any) {
        console.error('Failed to process document:', err);
        await whatsappService.sendTextMessage(fromPhone, 'Kaagaz padhne mein thodi takleef hui bhai. Thoda saaf photo ya PDF dobara bhejo.');
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

        // Check if voice note is asking to set a reminder
        const reminderCheck = await geminiService.parseNaturalReminder(voiceResult.transcript);
        if (reminderCheck.isReminder && reminderCheck.task && reminderCheck.remindAtIso) {
          await dbService.addGeneralReminder(fromPhone, reminderCheck.task, reminderCheck.remindAtIso);
          const reply = personaService.getReminderSavedMessage(reminderCheck.task, reminderCheck.remindAtIso, userLang);
          await whatsappService.sendTextMessage(fromPhone, reply);
          return;
        }

        if (voiceResult.intent === 'search' || voiceResult.query) {
          const results = await dbService.searchDocuments(fromPhone, voiceResult.query);
          const reply = personaService.formatSearchResults(voiceResult.query, results, userLang);
          await whatsappService.sendTextMessage(fromPhone, reply);
          return;
        }

        if (voiceResult.intent === 'expiry_check') {
          const expiries = await dbService.getUserExpiries(fromPhone);
          const reply = personaService.formatExpiriesList(expiries);
          await whatsappService.sendTextMessage(fromPhone, reply);
          return;
        }

        // Conversational voice response
        const chatReply = await geminiService.chatAsDost(voiceResult.transcript, [], userLang, userName);
        await whatsappService.sendTextMessage(fromPhone, chatReply);
      } catch (err) {
        console.error('Failed to process audio:', err);
        await whatsappService.sendTextMessage(fromPhone, 'Awaaz saaf sun nahi paaya bhai. Ek baar dobara voice note bhejo ya type karo.');
      }
      return;
    }

    // =============================================================
    // BRANCH 4: Plain Text Messages
    // =============================================================
    if (message.type === 'text') {
      const text = (message.text?.body || '').trim();
      const lowerText = text.toLowerCase();

      // 4.1 Language Selection Command
      if (['language', 'bhasha', 'lang', 'change language', 'bhasha badlo'].includes(lowerText)) {
        const picker = personaService.getLanguagePicker();
        await whatsappService.sendInteractiveButtons(fromPhone, picker.text, picker.buttons);
        return;
      }

      // 4.2 First-time greeting / Start
      if (['hi', 'hello', 'hey', 'namaste', 'pranam', 'dost', 'start', 'shuru'].includes(lowerText)) {
        const picker = personaService.getLanguagePicker();
        await whatsappService.sendInteractiveButtons(fromPhone, picker.text, picker.buttons);
        return;
      }

      // 4.3 Expiry inquiry
      if (['expiry', 'dates', 'kab khatam', 'renew', 'tarikh', 'tareekh', 'list'].some(k => lowerText.includes(k))) {
        const expiries = await dbService.getUserExpiries(fromPhone);
        const reply = personaService.formatExpiriesList(expiries);
        await whatsappService.sendTextMessage(fromPhone, reply);
        return;
      }

      // 4.4 Succession / Nominee inquiry (WarisPath Kit)
      if (['waris', 'nominee', 'papa ke papers', 'baad mein', 'succession'].some(k => lowerText.includes(k))) {
        await whatsappService.sendTextMessage(fromPhone, personaService.getWarisPathInfo());
        return;
      }

      // 4.5 Plans & Pricing inquiry
      if (['plan', 'price', 'pricing', 'kharidna', 'charges', 'pack'].some(k => lowerText.includes(k))) {
        const plansMsg = `📋 *DOST Parivaar Plans (stayonchat.com)* 🤖✨\n\n1️⃣ *Free Pack:* 15 files + 1 reminder trial (₹0)\n2️⃣ *Yaad Plan:* 50 files + 20 WhatsApp reminders (₹149/saal)\n3️⃣ *Ghar Plan:* 200 files + 4 Family seats + Unlimited reminders (₹399/saal)\n4️⃣ *Vault Plan:* 500 files + CA link + Waris kit (₹799/saal)\n\n_Jo plan chahiye uska naam likhein ya button dabayein._`;
        await whatsappService.sendInteractiveButtons(fromPhone, plansMsg, [
          { id: 'upgrade_yaad_149', title: 'Yaad Plan (₹149)' },
          { id: 'upgrade_ghar_399', title: 'Ghar Plan (₹399)' },
          { id: 'upgrade_vault_799', title: 'Vault Plan (₹799)' }
        ]);
        return;
      }

      // 4.6 Check for Natural Reminder (e.g. "Kal 10 baje mummy ki dava yaad dilana", "Remind me to pay electricity bill on 15th")
      const reminderCheck = await geminiService.parseNaturalReminder(text);
      if (reminderCheck.isReminder && reminderCheck.task && reminderCheck.remindAtIso) {
        await dbService.addGeneralReminder(fromPhone, reminderCheck.task, reminderCheck.remindAtIso);
        const reply = personaService.getReminderSavedMessage(reminderCheck.task, reminderCheck.remindAtIso, userLang);
        await whatsappService.sendTextMessage(fromPhone, reply);
        return;
      }

      // 4.7 Check for Astro / Birth Details (DOB, Time, Place, Kundali)
      const astroCheck = await geminiService.parseAstroProfile(text);
      if (astroCheck.hasAstroData && astroCheck.dob) {
        await dbService.setUserAstro(fromPhone, {
          dob: astroCheck.dob,
          tob: astroCheck.tob,
          pob: astroCheck.pob,
          rashi: astroCheck.rashi,
        });
        const reply = personaService.getAstroSavedMessage(astroCheck, userLang);
        await whatsappService.sendTextMessage(fromPhone, reply);
        return;
      }

      // 4.8 Document Search Query (e.g. "RC", "Havells bill", "LIC policy", "PUC")
      const cleanQuery = text
        .replace(/^(mera|meri|mere|apna|apni|bhai|dost)\s+/i, '')
        .replace(/\s+(bhej|bhejo|dikha|dikhao|kahan hai|kaha h|send)$/i, '')
        .trim();

      const searchKeyword = cleanQuery || text;
      const results = await dbService.searchDocuments(fromPhone, searchKeyword);

      if (results.length === 1 && results[0].storage_path) {
        // Single exact result found! Send details + original image OR PDF document
        const doc = results[0];
        let caption = `📄 *${doc.title}* 🤖✨\n`;
        if (doc.entity_name) caption += `🏢 ${doc.entity_name}\n`;
        if (doc.policy_or_bill_no) caption += `🔢 No: ${doc.policy_or_bill_no}\n`;
        if (doc.expiry_date) caption += `⏳ Expiry: ${doc.expiry_date}\n`;
        if (doc.summary) caption += `📝 ${doc.summary}\n`;

        try {
          const buffer = await storageService.downloadDocument(doc.storage_path);
          const mimeType = doc.file_type || 'image/jpeg';
          const isPdf = mimeType.includes('pdf') || doc.file_name?.toLowerCase().endsWith('.pdf');

          if (isPdf) {
            // PDF Document Delivery (Exact original PDF file back on WhatsApp!)
            const docName = doc.file_name || `${doc.title}.pdf`;
            const mediaId = await whatsappService.uploadMedia(buffer, 'application/pdf', docName);
            if (mediaId) {
              console.log(`Sending PDF document by mediaId ${mediaId} to ${fromPhone}...`);
              await whatsappService.sendDocumentByMediaId(fromPhone, mediaId, docName, caption.trim());
              return;
            }
          } else {
            // Image Delivery (JPG/PNG)
            const mediaId = await whatsappService.uploadMedia(buffer, mimeType, `${doc.title}.jpg`);
            if (mediaId) {
              console.log(`Sending image by mediaId ${mediaId} to ${fromPhone}...`);
              await whatsappService.sendImageByMediaId(fromPhone, mediaId, caption.trim());
              return;
            }
          }
        } catch (mediaErr) {
          console.error('Error sending media back to user:', mediaErr);
        }

        // Fallback text if media upload fails
        await whatsappService.sendTextMessage(fromPhone, caption.trim());
        return;
      }

      if (results.length > 1) {
        const formatted = personaService.formatSearchResults(searchKeyword, results, userLang);
        await whatsappService.sendTextMessage(fromPhone, formatted);
        return;
      }

      // 4.9 Samajhdaar Dost Conversational AI
      // When the user is simply chatting, sharing feelings, asking life/money advice, or greeting:
      const dostReply = await geminiService.chatAsDost(text, [], userLang, userName);
      await whatsappService.sendTextMessage(fromPhone, dostReply);
    }
  }
};
