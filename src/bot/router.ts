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
import { personaService } from './persona.js';
import { PLANS, BRAND } from '../config/constants.js';

export const botRouter = {
  /**
   * Helper: Display user's stored documents
   */
  async showMyDocs(fromPhone: string): Promise<void> {
    const docs = await dbService.searchDocuments(fromPhone, '', 10);
    if (!docs || docs.length === 0) {
      await whatsappService.sendTextMessage(
        fromPhone,
        '📂 Aapke vault mein abhi koi kaagaz ya photo save nahi hai.\n\nKoi bhi photo ya PDF bhej kar dekhiye, main turant surakshit save kar lunga!'
      );
      return;
    }

    let reply = `📂 Aapke vault ke surakshit kaagaz (${docs.length}): 🤖✨\n\n`;
    docs.forEach((doc: any, index: number) => {
      reply += `${index + 1}. ${doc.title}\n`;
      if (doc.expiry_date) reply += `   • Expiry: ${doc.expiry_date}\n`;
      if (doc.policy_or_bill_no) reply += `   • Number: ${doc.policy_or_bill_no}\n`;
    });
    reply += `\nKisi bhi file ko dekhne ya mangwane ke liye bas uska naam likhkar bhej dijiye!`;
    await whatsappService.sendTextMessage(fromPhone, reply);
    await dbService.saveChatMessage(fromPhone, 'model', reply);
  },

  /**
   * Helper: Display user's pending reminders & document expiries
   */
  async showMyReminders(fromPhone: string): Promise<void> {
    const expiries = await dbService.getUserExpiries(fromPhone);
    const reminders = await dbService.getUserGeneralReminders(fromPhone);

    if ((!expiries || expiries.length === 0) && (!reminders || reminders.length === 0)) {
      await whatsappService.sendTextMessage(
        fromPhone,
        '⏰ Abhi aapka koi pending reminder nahi hai.\n\nKisi bhi kaam ka reminder lagane ke liye bas likhiye (jaise: "Kal subah 10 baje doctor appointment").'
      );
      return;
    }

    let reply = `⏰ Aapke active reminders aur tareekhein: 🤖✨\n\n`;
    let count = 1;
    if (reminders && reminders.length > 0) {
      reply += `📋 Kaam & Reminders:\n`;
      reminders.forEach((r: any) => {
        const timeStr = new Date(r.remind_at).toLocaleString('en-IN', {
          timeZone: 'Asia/Kolkata',
          dateStyle: 'medium',
          timeStyle: 'short',
        });
        reply += `${count++}. ${r.task} (Waqt: ${timeStr})\n`;
      });
      reply += `\n`;
    }
    if (expiries && expiries.length > 0) {
      reply += `📅 Kaagaz Expiry Alerts:\n`;
      expiries.forEach((e: any) => {
        reply += `${count++}. ${e.title} (Expiry: ${e.expiry_date})\n`;
      });
    }
    await whatsappService.sendTextMessage(fromPhone, reply);
    await dbService.saveChatMessage(fromPhone, 'model', reply);
  },

  /**
   * Helper: Display user's Ank Jyotish (Universal Numerology)
   */
  async showMyNumerology(fromPhone: string, user: any, resolvedName: string, userLang: string): Promise<void> {
    const numerology = await dbService.getUserNumerologyData(fromPhone);
    if (!numerology.profileContext && !user.dob) {
      const askDob = `🔢 Apna Ank Jyotish janne ke liye kripya apni janmtithi (DOB, jaise: 15-03-1987) bhej dijiye.\n\nMain aapka Mulank (मूलांक), Bhagyank (भाग्यांक), shubh rang aur guidance nikal kar bata dunga! ✨`;
      await whatsappService.sendTextMessage(fromPhone, askDob);
      await dbService.saveChatMessage(fromPhone, 'model', askDob);
      return;
    }

    const profile = {
      name: resolvedName,
      dob: user.dob || '1987-03-15',
      carNumber: user.vehicle_plate || '',
      mobile: fromPhone,
    };
    const guide = await geminiService.generateDailyNumerologyGuide(profile, userLang);
    await whatsappService.sendTextMessage(fromPhone, guide);
    await dbService.saveChatMessage(fromPhone, 'model', guide);
  },

  /**
   * Helper: Display Plans & Live Razorpay Links
   */
  async showPlans(fromPhone: string): Promise<void> {
    const plansMsg = `📋 ${BRAND.name} Plans 🤖✨\n\n1️⃣ Yaad Plan (₹249/saal — Sirf ₹20/mahina)\n• 50 files vault storage + 25 auto WhatsApp alerts\n• Traffic challan, late fee aur warranty loss se 100% mukti\n👉 Instant UPI / Card: https://rzp.io/rzp/ukMXxGY\n\n2️⃣ Ghar Plan (₹499/saal — Sirf ₹41/mahina)\n• 200 files + 4 Family Members connected\n• Poore parivaar ke liye unlimited reminders & expiries\n👉 Instant UPI / Card: https://rzp.io/rzp/OOIVXyJ\n\n3️⃣ Vault Plan (₹899/saal — ₹75/mahina)\n• 500 files + CA link + Waris kit\n👉 Instant UPI / Card: https://rzp.io/rzp/SjNJKT0\n\n💡 Kisi bhi link par tap karke UPI (GPay/PhonePe/Paytm) se 1 second mein activate karein!`;
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
    const resolvedName = (user.name && user.name !== 'Bhai') ? user.name : (rawContactName || 'Dhruv');
    const userLang = user.language || 'hinglish';

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
      if (buttonId === 'btn_my_docs') {
        await this.showMyDocs(fromPhone);
        return;
      }

      if (buttonId === 'btn_my_reminders') {
        await this.showMyReminders(fromPhone);
        return;
      }

      if (buttonId === 'btn_my_numerology') {
        await this.showMyNumerology(fromPhone, user, resolvedName, userLang);
        return;
      }

      if (buttonId === 'btn_plans') {
        await this.showPlans(fromPhone);
        return;
      }

      // 1.3 Subscription Plans
      if (buttonId.startsWith('upgrade_')) {
        const planKey = buttonId.replace('upgrade_', '') as 'yaad_149' | 'ghar_399' | 'vault_799';
        const plan = PLANS[planKey];
        const paymentLink = await paymentService.createPaymentLink(fromPhone, planKey);

        const responseText = `✨ ${plan.name} Activate karein 🤖✨\n\nRakam: ₹${plan.priceInr}/saal\n\nIs link par click karke UPI / Card se payment karein. Payment hote hi aapka plan turant chaloo ho jayega:\n${paymentLink}\n\nKoi auto-debit nahi hoga. Sirf 1 saal ka ek baar payment.`;
        await whatsappService.sendTextMessage(fromPhone, responseText);
        return;
      }

      // 1.4 Viral Invite / Share
      if (buttonId === 'btn_share_invite') {
        const shareMsg = personaService.getReferralShareMessage(fromPhone, user.referral_code || fromPhone.slice(-6));
        await whatsappService.sendTextMessage(fromPhone, shareMsg);
        return;
      }

      // 1.5 Dismiss
      if (buttonId === 'dismiss_upsell') {
        await whatsappService.sendTextMessage(fromPhone, `Koi baat nahi ${resolvedName} ji! Aapka ${BRAND.name} hamesha aapki sewa ke liye taiyar hai. 🙏`);
        return;
      }
    }

    // =============================================================
    // BRANCH 2: Media Upload (Image or PDF Document)
    // =============================================================
    if (message.type === 'image' || message.type === 'document') {
      const currentPlan = PLANS[user.plan] || PLANS.free;
      const effectiveMaxFiles = dbService.getUserEffectiveMaxFiles(user);

      // Check quota limit with referral bonus inclusion
      if (user.plan === 'free' && user.file_count >= effectiveMaxFiles) {
        const quotaMsg = `📦 Free Storage Limit Reached (${effectiveMaxFiles} Files) 🤖✨\n\nPurani files 100% safe hain!\n\nAur jagah chahiye toh:\n1️⃣ Dosto ko Invite karein: Har friend par +5 files free (+15 files tak)\n2️⃣ Yaad Plan (₹249/saal — sirf ₹20/mahina): 50 files + 25 auto WhatsApp alerts!`;
        await whatsappService.sendInteractiveButtons(fromPhone, quotaMsg, [
          { id: 'upgrade_yaad_249', title: 'Yaad Plan (₹249)' },
          { id: 'btn_share_invite', title: '🎁 Dosto ko Invite (+5)' },
          { id: 'dismiss_upsell', title: 'Baad Mein' },
        ]);
        return;
      }

      // Download file from Meta Cloud API
      const mediaId = message.image ? message.image.id : message.document.id;
      const fileName = message.document?.filename || (message.image ? `doc_${Date.now()}.jpg` : `file_${Date.now()}.pdf`);
      const caption = message.image?.caption || message.document?.caption || '';

      await whatsappService.sendTextMessage(fromPhone, `${BRAND.displayName} aapka kaagaz dekh raha hai... kripya 1 second intezar karein! ⏳`);

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
          raw_extraction: {
            ...extracted,
            media_id: mediaId,
            base64_data: buffer.toString('base64'),
          },
          is_encrypted: true,
          is_active: true,
        });

        // If expiry found, automatically schedule reminders
        if (extracted.expiry_date && savedDoc.id) {
          await dbService.createReminders(fromPhone, savedDoc.id, extracted.expiry_date);
        }

        // Check if this upload is a photo/picture or an ambiguous document without policy/bill no or expiry
        const isPhoto = message.type === 'image';
        const isGenericDoc =
          extracted.category === 'general' ||
          (!extracted.policy_or_bill_no && !extracted.expiry_date) ||
          extracted.title.toLowerCase().includes('photo') ||
          extracted.title.toLowerCase().includes('document') ||
          extracted.title.toLowerCase().includes('image');

        if ((isPhoto || isGenericDoc) && savedDoc.id) {
          // Set pending naming state for this document
          dbService.setPendingDocNaming(fromPhone, savedDoc.id);

          const photoNamingPrompt = personaService.getPhotoNamingPrompt(resolvedName);
          await whatsappService.sendTextMessage(fromPhone, photoNamingPrompt);
          await dbService.saveChatMessage(fromPhone, 'model', photoNamingPrompt);
          return;
        }

        // Recognized official document (e.g. BSES bill, LIC policy, etc.)
        const remainingSlots = currentPlan.maxFiles - (user.file_count + 1);
        let confirmMsg = personaService.getDocSavedMessage(extracted, userLang, user.plan === 'free' ? remainingSlots : undefined);
        if (savedDoc.id) {
          dbService.setPendingDocNaming(fromPhone, savedDoc.id);
          confirmMsg += `\n\n💡 Tip: Agar aap iska koi aur aasan naam rakhna chahein, toh bas naya naam type karke bhej dijiye.`;
        }
        await whatsappService.sendTextMessage(fromPhone, confirmMsg);
        await dbService.saveChatMessage(fromPhone, 'model', confirmMsg);

        // Habit & Loss-prevention milestone message
        if (extracted.expiry_date) {
          const milestoneMsg = personaService.getMilestoneMessage('penalty_saved', extracted.title);
          await whatsappService.sendTextMessage(fromPhone, milestoneMsg);
        }

        // Contextual Upsell Check (Anti-Spam rule: max 1 per 7 days)
        if (extracted.expiry_date && user.plan === 'free' && dbService.canSendUpsell(user)) {
          const upsell = personaService.getExpiryUpsell(fromPhone, extracted.title, extracted.expiry_date);
          await whatsappService.sendInteractiveButtons(fromPhone, upsell.text, upsell.buttons);
          await dbService.markUpsellSent(fromPhone);
        }
      } catch (err: any) {
        console.error('Failed to process document:', err);
        await whatsappService.sendTextMessage(fromPhone, `Kshama karein ${resolvedName} ji, kaagaz padhne mein thodi takleef hui. Kripya thoda saaf photo ya PDF dobara bhejiye.`);
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

        const history = await dbService.getRecentChatHistory(fromPhone, 8);
        const numerologyData = await dbService.getUserNumerologyData(fromPhone);
        const chatReply = await geminiService.chatAsDost(
          voiceResult.transcript,
          history,
          userLang,
          resolvedName,
          numerologyData.profileContext
        );
        await whatsappService.sendTextMessage(fromPhone, chatReply);
        await dbService.saveChatMessage(fromPhone, 'user', `[Voice note: ${voiceResult.transcript}]`);
        await dbService.saveChatMessage(fromPhone, 'model', chatReply);
      } catch (err) {
        console.error('Failed to process audio:', err);
        await whatsappService.sendTextMessage(fromPhone, 'Kshama karein, awaaz saaf sun nahi paaya. Kripya dobara voice note bhejiye ya text type kijiye.');
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

      // 4.01 Direct Plan checkout shortcuts (e.g. user types "yaad", "ghar", "vault")
      if (['yaad', 'yaad plan', '249', 'rs 249', '₹249', '149'].includes(lowerText)) {
        const paymentLink = await paymentService.createPaymentLink(fromPhone, 'yaad_249');
        const responseText = `✨ Yaad Plan Activate karein 🤖✨\n\nRakam: ₹249/saal (Sirf ₹20/mahina)\n\nIs link par click karke UPI / Card se payment karein. Payment hote hi aapka plan turant chaloo ho jayega:\n${paymentLink}\n\nKoi auto-debit nahi hoga. Sirf 1 saal ka ek baar payment.`;
        await whatsappService.sendTextMessage(fromPhone, responseText);
        await dbService.saveChatMessage(fromPhone, 'model', responseText);
        return;
      }

      if (['ghar', 'ghar plan', '499', 'rs 499', '₹499', '399'].includes(lowerText)) {
        const paymentLink = await paymentService.createPaymentLink(fromPhone, 'ghar_499');
        const responseText = `✨ Ghar Plan Activate karein 🤖✨\n\nRakam: ₹499/saal (Sirf ₹41/mahina for entire family)\n\nIs link par click karke UPI / Card se payment karein. Payment hote hi aapka plan turant chaloo ho jayega:\n${paymentLink}\n\nKoi auto-debit nahi hoga. Sirf 1 saal ka ek baar payment.`;
        await whatsappService.sendTextMessage(fromPhone, responseText);
        await dbService.saveChatMessage(fromPhone, 'model', responseText);
        return;
      }

      if (['vault', 'vault plan', '899', 'rs 899', '₹899', '799'].includes(lowerText)) {
        const paymentLink = await paymentService.createPaymentLink(fromPhone, 'vault_899');
        const responseText = `✨ Vault Plan Activate karein 🤖✨\n\nRakam: ₹899/saal (Business + CA Access)\n\nIs link par click karke UPI / Card se payment karein. Payment hote hi aapka plan turant chaloo ho jayega:\n${paymentLink}\n\nKoi auto-debit nahi hoga. Sirf 1 saal ka ek baar payment.`;
        await whatsappService.sendTextMessage(fromPhone, responseText);
        await dbService.saveChatMessage(fromPhone, 'model', responseText);
        return;
      }

      // 4.02 Check if user is replying with a name for a recently uploaded photo or document
      const pendingDocId = dbService.getPendingDocNaming(fromPhone);
      const isSystemCommand = [
        'hi', 'hello', 'hey', 'namaste', 'pranam', 'dost', 'keepr', 'start', 'shuru',
        'menu', 'help', 'madad', 'options', 'language', 'bhasha', 'lang',
        'share', 'invite', 'refer', 'plan', 'pricing', 'kharidna',
        '1', '2', '3', '4', '5'
      ].includes(lowerText);

      if (pendingDocId && !isSystemCommand && text.length > 0 && text.length <= 100) {
        await dbService.updateDocumentTitle(pendingDocId, text);
        dbService.clearPendingDocNaming(fromPhone);

        const renameConfirm = `✅ Bahut badhiya! Maine aapki is file ka naam "${text}" darj kar liya hai. 🤖✨\n\nAb aap jab bhi "${text}" mangenge, main turant nikal kar aapko bhej dunga!`;
        await whatsappService.sendTextMessage(fromPhone, renameConfirm);
        await dbService.saveChatMessage(fromPhone, 'model', renameConfirm);
        return;
      }

      // 4.1 Interactive Menu Command
      if (['menu', 'help', 'madad', 'options', 'suvidha', 'features'].includes(lowerText)) {
        dbService.setUserPromptState(fromPhone, 'main_menu');
        const menu = personaService.getMenuMessage(resolvedName);
        await whatsappService.sendInteractiveButtons(fromPhone, menu.text, menu.buttons);
        return;
      }

      // 4.2 Language Selection Command
      if (['language', 'bhasha', 'lang', 'change language', 'bhasha badlo'].includes(lowerText)) {
        dbService.setUserPromptState(fromPhone, 'pending_language');
        const picker = personaService.getLanguageSelectionMessage();
        await whatsappService.sendTextMessage(fromPhone, picker);
        await dbService.saveChatMessage(fromPhone, 'model', picker);
        return;
      }

      // 4.3 Greeting / Start -> Always ask language first!
      if (['hi', 'hello', 'hey', 'namaste', 'pranam', 'start', 'shuru', 'dost', 'keepr'].includes(lowerText)) {
        dbService.setUserPromptState(fromPhone, 'pending_language');
        const langMsg = personaService.getLanguageSelectionMessage();
        await whatsappService.sendTextMessage(fromPhone, langMsg);
        await dbService.saveChatMessage(fromPhone, 'model', langMsg);
        return;
      }

      // 4.4 Menu Option 1: Kaagaz Vault
      if (lowerText === '1' || ['kaagaz', 'mere kaagaz', 'dastavez', 'vault', 'files', 'documents', 'docs'].includes(lowerText)) {
        dbService.clearUserPromptState(fromPhone);
        await this.showMyDocs(fromPhone);
        return;
      }

      // 4.5 Menu Option 2: Reminders & Expiries
      if (lowerText === '2' || ['reminders', 'reminder', 'mere reminders', 'active reminders'].includes(lowerText)) {
        dbService.clearUserPromptState(fromPhone);
        await this.showMyReminders(fromPhone);
        return;
      }

      // 4.6 Menu Option 3: Ank Jyotish
      if (lowerText === '3' || ['jyotish', 'ank jyotish', 'mera ank jyotish', 'numerology', 'mulank', 'bhagyank'].includes(lowerText)) {
        dbService.clearUserPromptState(fromPhone);
        await this.showMyNumerology(fromPhone, user, resolvedName, userLang);
        return;
      }

      // 4.7 Menu Option 4: Plans & Pricing
      if (lowerText === '4' || ['plan', 'plans', 'pricing', 'kharidna', 'charges', 'pack'].some(k => lowerText.includes(k))) {
        dbService.clearUserPromptState(fromPhone);
        await this.showPlans(fromPhone);
        return;
      }

      // 4.8 Menu Option 5: Invite Friends
      if (
        lowerText === '5' ||
        ['share', 'invite', 'refer', 'referral', 'dosto ko bhejo', 'invite friend', 'link', 'dost invite'].some(
          k => lowerText === k || lowerText.startsWith('invite') || lowerText.startsWith('refer')
        )
      ) {
        dbService.clearUserPromptState(fromPhone);
        const shareMsg = personaService.getReferralShareMessage(fromPhone, user.referral_code || fromPhone.slice(-6));
        await whatsappService.sendTextMessage(fromPhone, shareMsg);
        await dbService.saveChatMessage(fromPhone, 'model', shareMsg);
        return;
      }

      // 4.8 Custom Regional Language Request (e.g. "Marathi", "Gujarati", "Bengali", "Tamil", "Bhojpuri")
      const detectedLang = await geminiService.detectCustomLanguage(text);
      if (detectedLang) {
        await dbService.setUserLanguage(fromPhone, detectedLang.toLowerCase());
        const langAck = `✅ Language set to ${detectedLang}! 🤖✨\n\nAb se main aapse ${detectedLang} mein hi baat karunga aur aapke documents & reminders sambhalunga. Kahiye, aaj kya help karun?`;
        await whatsappService.sendTextMessage(fromPhone, langAck);
        await dbService.saveChatMessage(fromPhone, 'model', langAck);
        return;
      }

      // 4.9 Check for Natural Reminder (e.g. "Kal 10 baje mummy ki dava yaad dilana", "Remind me to pay electricity bill on 15th")
      const reminderCheck = await geminiService.parseNaturalReminder(text);
      if (reminderCheck.isReminder && reminderCheck.task && reminderCheck.remindAtIso) {
        await dbService.addGeneralReminder(fromPhone, reminderCheck.task, reminderCheck.remindAtIso);
        const reply = personaService.getReminderSavedMessage(reminderCheck.task, reminderCheck.remindAtIso, userLang);
        await whatsappService.sendTextMessage(fromPhone, reply);
        await dbService.saveChatMessage(fromPhone, 'model', reply);
        return;
      }

      // 4.10 Check for Birth Details / DOB for Ank Jyotish (Universal Numerology)
      const astroCheck = await geminiService.parseAstroProfile(text);
      if (astroCheck.hasAstroData && astroCheck.dob) {
        await dbService.saveUserProfile(fromPhone, { dob: astroCheck.dob });
        await dbService.setUserAstro(fromPhone, {
          dob: astroCheck.dob,
          tob: astroCheck.tob,
          pob: astroCheck.pob,
          rashi: astroCheck.rashi,
        });
        const reply = personaService.getAstroSavedMessage(astroCheck, userLang);
        await whatsappService.sendTextMessage(fromPhone, reply);
        await dbService.saveChatMessage(fromPhone, 'model', reply);
        return;
      }

      // 4.11 Document & Photo Search Query (e.g. "RC", "Havells bill", "LIC policy", "PUC", "photo", "pic", "meri pic wapas do")
      const isPhotoRequest = /\b(pic|photo|image|tasveer|picture|snap|camera|photo wapas|pic bhej|photo bhej|pic dikha|photo dikha|meri photo|meri pic)\b/i.test(text);
      const isRetrievalRequest =
        isPhotoRequest ||
        /\b(bhej|bhejo|dikha|dikhao|kahan hai|kaha h|send|chahiye|de do|wapas de|wapas karo|nikal|nikalo|download|lao|pan|rc|bill|insurance|puc|aadhaar|dastavez|kaagaz|paper)\b/i.test(text);

      let results: any[] = [];
      if (isRetrievalRequest) {
        results = await dbService.searchDocuments(fromPhone, text);
        if (results.length === 0 && isPhotoRequest) {
          const latestPhoto = await dbService.getLatestUserPhoto(fromPhone);
          if (latestPhoto) results = [latestPhoto];
        }
      }

      if (results.length > 0) {
        // If photo was specifically asked for, prioritize image file
        let doc = results[0];
        if (isPhotoRequest) {
          const matchingImg = results.find(d => d.file_type?.startsWith('image') || d.title?.toLowerCase().includes('photo'));
          if (matchingImg) doc = matchingImg;
        }

        // Deliver original file directly on WhatsApp!
        if (results.length === 1 || isPhotoRequest || text.toLowerCase().includes('bhej') || text.toLowerCase().includes('send') || text.toLowerCase().includes('de')) {
          let caption = `📄 ${doc.title} 🤖✨\n`;
          if (doc.entity_name) caption += `🏢 ${doc.entity_name}\n`;
          if (doc.policy_or_bill_no) caption += `🔢 No: ${doc.policy_or_bill_no}\n`;
          if (doc.expiry_date) caption += `⏳ Expiry: ${doc.expiry_date}\n`;
          if (doc.summary) caption += `📝 ${doc.summary}\n`;

          try {
            const buffer = await storageService.downloadDocument(doc.storage_path);
            const mimeType = doc.file_type || 'image/jpeg';
            const isPdf = mimeType.includes('pdf') || doc.file_name?.toLowerCase().endsWith('.pdf');

            if (isPdf) {
              // PDF Document Delivery (Native WhatsApp document attachment)
              const docName = doc.file_name || `${doc.title}.pdf`;
              const mediaId = await whatsappService.uploadMedia(buffer, 'application/pdf', docName);
              if (mediaId) {
                console.log(`Sending PDF document by mediaId ${mediaId} to ${fromPhone}...`);
                await whatsappService.sendDocumentByMediaId(fromPhone, mediaId, docName, caption.trim());
                await dbService.saveChatMessage(fromPhone, 'model', `[Bheja gaya PDF dastavez: ${doc.title}]`);
                return;
              }
            } else {
              // Image Delivery (Native WhatsApp image attachment)
              const mediaId = await whatsappService.uploadMedia(buffer, mimeType, `${doc.title}.jpg`);
              if (mediaId) {
                console.log(`Sending image by mediaId ${mediaId} to ${fromPhone}...`);
                await whatsappService.sendImageByMediaId(fromPhone, mediaId, caption.trim());
                await dbService.saveChatMessage(fromPhone, 'model', `[Bheji gayi photo: ${doc.title}]`);
                return;
              }
            }
          } catch (mediaErr) {
            console.error('Error sending media back to user:', mediaErr);
          }

          // Fallback text if media upload fails
          const fallbackText = `📸 ${doc.title} 🤖✨\n\n${caption.trim()}\n\nFile details vault mein surakshit darj hain.`;
          await whatsappService.sendTextMessage(fromPhone, fallbackText);
          await dbService.saveChatMessage(fromPhone, 'model', fallbackText);
          return;
        }

        // Multiple results found: show formatted list
        const formatted = personaService.formatSearchResults(text, results, userLang);
        await whatsappService.sendTextMessage(fromPhone, formatted);
        await dbService.saveChatMessage(fromPhone, 'model', formatted);
        return;
      }

      // 4.12 Samajhdaar Dost Conversational AI + Ank Jyotish Visheshagya
      // Empathetic, polite "Aap/Aapka" conversation with continuous chat memory and universal numerology wisdom:
      const respectfulName = resolvedName && resolvedName !== 'Bhai' ? `${resolvedName} ji` : 'Bhai Sahab';
      const history = await dbService.getRecentChatHistory(fromPhone, 10);
      const numerologyData = await dbService.getUserNumerologyData(fromPhone);

      const dostReply = await geminiService.chatAsDost(
        text,
        history,
        userLang,
        respectfulName,
        numerologyData.profileContext
      );
      await whatsappService.sendTextMessage(fromPhone, dostReply);
      await dbService.saveChatMessage(fromPhone, 'model', dostReply);
    }
  }
};
