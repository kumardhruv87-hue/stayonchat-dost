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
   * Helper: Display user's stored documents
   */
  async showMyDocs(fromPhone: string, language: string = 'english'): Promise<void> {
    const docs = await dbService.searchDocuments(fromPhone, '', 10);
    if (!docs || docs.length === 0) {
      const emptyMsg = language === 'hi'
        ? '📂 आपके वॉल्ट में अभी कोई कागज़ या फ़ोटो सुरक्षित नहीं है।\n\nकोई भी फ़ोटो या PDF भेजकर देखें, मैं तुरंत सुरक्षित सहेज लूँगा!'
        : language === 'hinglish'
        ? '📂 Aapke vault mein abhi koi kaagaz ya photo save nahi hai.\n\nKoi bhi photo ya PDF bhej kar dekhiye, main turant surakshit save kar lunga!'
        : '📂 Your vault is currently empty.\n\nDrop any PDF, photo, or invoice — I will securely encrypt and index it instantly!';
      await whatsappService.sendTextMessage(fromPhone, emptyMsg);
      return;
    }

    const header = language === 'hi'
      ? `📂 आपके वॉल्ट के सुरक्षित कागज़ (${docs.length}): 🤖✨\n\n`
      : language === 'hinglish'
      ? `📂 Aapke vault ke surakshit kaagaz (${docs.length}): 🤖✨\n\n`
      : `📂 Your Encrypted Vault Documents (${docs.length}): 🤖✨\n\n`;

    let reply = header;
    docs.forEach((doc: any, index: number) => {
      reply += `${index + 1}. ${doc.title}\n`;
      if (doc.expiry_date) reply += `   • Expiry: ${doc.expiry_date}\n`;
      if (doc.policy_or_bill_no) reply += `   • Number: ${doc.policy_or_bill_no}\n`;
    });
    reply += language === 'hi'
      ? `\nकिसी भी फ़ाइल को मँगवाने के लिए बस उसका नाम लिखकर भेज दीजिए!`
      : language === 'hinglish'
      ? `\nKisi bhi file ko dekhne ya mangwane ke liye bas uska naam likhkar bhej dijiye!`
      : `\nTo retrieve any original file, simply type its name!`;

    await whatsappService.sendTextMessage(fromPhone, reply);
    await dbService.saveChatMessage(fromPhone, 'model', reply);
  },

  /**
   * Helper: Display user's pending reminders & document expiries
   */
  async showMyReminders(fromPhone: string, language: string = 'english'): Promise<void> {
    const expiries = await dbService.getUserUpcomingDocuments(fromPhone, 365);
    const reminders = await dbService.getUserActiveReminders(fromPhone);

    if ((!expiries || expiries.length === 0) && (!reminders || reminders.length === 0)) {
      const emptyMsg = language === 'hi'
        ? '⏰ अभी आपका कोई लंबित (pending) रिमाइंडर नहीं है।\n\nकिसी भी कार्य का रिमाइंडर लगाने के लिए बस संदेश लिखें।'
        : language === 'hinglish'
        ? '⏰ Abhi aapka koi pending reminder nahi hai.\n\nKisi bhi kaam ka reminder lagane ke liye bas likhiye (jaise: "Kal subah 10 baje doctor appointment").'
        : '⏰ You have no pending reminders or upcoming expiries right now.\n\nTo set one, simply type anytime (e.g. "Remind me to pay electricity bill tomorrow 10 AM").';
      await whatsappService.sendTextMessage(fromPhone, emptyMsg);
      return;
    }

    let reply = language === 'hi'
      ? `⏰ आपके सक्रिय रिमाइंडर्स व तिथियाँ: 🤖✨\n\n`
      : language === 'hinglish'
      ? `⏰ Aapke active reminders aur tareekhein: 🤖✨\n\n`
      : `⏰ Your Active Reminders & Expiry Dates: 🤖✨\n\n`;

    let count = 1;
    if (reminders && reminders.length > 0) {
      reply += `📋 Tasks & Reminders:\n`;
      reminders.forEach((r: any) => {
        const timeStr = new Date(r.remind_at).toLocaleString('en-IN', {
          timeZone: 'Asia/Kolkata',
          dateStyle: 'medium',
          timeStyle: 'short',
        });
        reply += `${count++}. ${r.task} (${timeStr})\n`;
      });
      reply += `\n`;
    }
    if (expiries && expiries.length > 0) {
      reply += `📅 Document Expiry Alerts:\n`;
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
      const askDob = userLang === 'hi'
        ? `🔢 अपना अंक ज्योतिष जानने के लिए कृपया अपनी जन्मतिथि (DOB, जैसे: 15-03-1987) भेज दीजिए।\n\nमैं आपका मूलांक, भाग्यांक, लकी रंग और दिन की शुभता निकाल कर बता दूँगा! ✨`
        : userLang === 'hinglish'
        ? `🔢 Apna Ank Jyotish janne ke liye kripya apni janmtithi (DOB, jaise: 15-03-1987) bhej dijiye.\n\nMain aapka Mulank (मूलांक), Bhagyank (भाग्यांक), shubh rang aur guidance nikal kar bata dunga! ✨`
        : `🔢 To activate your daily morning numerology & day guide, please share your date of birth (DOB, e.g. 15-03-1987).\n\nI will calculate your life path numbers, lucky colors, and optimal focus hours! ✨`;
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
    const plansMsg = `📋 ${BRAND.name} Plans 🤖✨\n\n1️⃣ Yaad Plan (₹249/yr — Just ₹20/month)\n• 50 encrypted files + 25 automated WhatsApp alerts\n• 100% protection against traffic fines, penalties & lapsed warranties\n👉 Instant UPI / Card: https://rzp.io/rzp/ukMXxGY\n\n2️⃣ Ghar Plan (₹499/yr — Just ₹41/month)\n• 200 files + 4 Family Members connected\n• Unlimited reminders & unified family expiry tracking\n👉 Instant UPI / Card: https://rzp.io/rzp/OOIVXyJ\n\n3️⃣ Vault Plan (₹899/yr — ₹75/month)\n• 500 files + CA read-only access + Succession Kit\n👉 Instant UPI / Card: https://rzp.io/rzp/SjNJKT0\n\n💡 Tap any link above to activate in 1 second via UPI (GPay/PhonePe/Paytm/Cards)!`;
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

        // 1. Honest Failure & Blur UX
        if (extracted.is_uncertain) {
          const blurReply = extracted.clarification_prompt || `Photo thodi blur lag rahi hai. Details saaf nahi dikh rahi — ek aur saaf photo bhej doge?`;
          await whatsappService.sendTextMessage(fromPhone, blurReply);
          await dbService.saveChatMessage(fromPhone, 'model', blurReply);
          return;
        }

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

        // Auto-save Health Memory if doctor prescription with medicines
        if (extracted.medicines && extracted.medicines.length > 0) {
          const medsSummary = extracted.medicines.map((m: any) => `${m.name} (${m.dosage || ''} ${m.timing || ''} ${m.relation_to_food || ''})`).join(', ');
          await dbService.saveUserMemory({
            user_phone: fromPhone,
            category: 'health',
            person: extracted.person || 'Family',
            key_fact: `${extracted.person || 'Family'} dawai: ${medsSummary}`,
            raw_text: caption || extracted.summary,
          });
        }

        // Auto-schedule reminders if expiry date exists
        if (extracted.expiry_date && savedDoc.id) {
          await dbService.createReminders(fromPhone, savedDoc.id, extracted.expiry_date);
        }

        // Send crisp 1-line human receipt
        const confirmMsg = personaService.getDocSavedMessage(extracted, activeLang);
        await whatsappService.sendTextMessage(fromPhone, confirmMsg);
        await dbService.saveChatMessage(fromPhone, 'model', confirmMsg);
      } catch (err: any) {
        console.error('Failed to process document:', err);
        const failMsg = activeLang === 'hi'
          ? `क्षमा करें ${resolvedName} जी, फ़ोटो पढ़ने में थोड़ी परेशानी हुई। कृपया एक और साफ़ फ़ोटो भेज दीजिए।`
          : activeLang === 'hinglish'
          ? `Kshama karein ${resolvedName} ji, photo padhne mein thodi takleef hui. Kripya ek aur saaf photo bhej dijiye.`
          : `Sorry ${resolvedName}, couldn't read the image clearly. Please send a clearer close-up.`;
        await whatsappService.sendTextMessage(fromPhone, failMsg);
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
        const voiceLang = detectMessageLanguage(voiceResult.transcript, activeLang);

        // Check if voice note is asking to set a reminder
        const reminderCheck = await geminiService.parseNaturalReminder(voiceResult.transcript);
        if (reminderCheck.isReminder && reminderCheck.task && reminderCheck.remindAtIso) {
          await dbService.addGeneralReminder(fromPhone, reminderCheck.task, reminderCheck.remindAtIso);
          const reply = personaService.getReminderSavedMessage(reminderCheck.task, reminderCheck.remindAtIso, voiceLang);
          await whatsappService.sendTextMessage(fromPhone, reply);
          return;
        }

        if (voiceResult.intent === 'search' || voiceResult.query) {
          const results = await dbService.searchDocuments(fromPhone, voiceResult.query);
          const reply = personaService.formatSearchResults(voiceResult.query, results, voiceLang);
          await whatsappService.sendTextMessage(fromPhone, reply);
          return;
        }

        if (voiceResult.intent === 'expiry_check') {
          const expiries = await dbService.getUserUpcomingDocuments(fromPhone, 365);
          const reply = personaService.formatExpiriesList(expiries, voiceLang);
          await whatsappService.sendTextMessage(fromPhone, reply);
          return;
        }

        const history = await dbService.getRecentChatHistory(fromPhone, 8);
        const numerologyData = await dbService.getUserNumerologyData(fromPhone);
        const chatReply = await geminiService.chatAsDost(
          voiceResult.transcript,
          history,
          voiceLang,
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

      // C1.3. Shareable Client Transparency Portal: "portal", "share", "client link"
      if (['portal', 'share', 'client link', 'client portal', 'share link'].includes(lowerText)) {
        const cleanPhone = fromPhone.replace(/\D/g, '');
        const portalMsg = `🌐 *[ROASSIREN CLIENT TRANSPARENCY PORTAL]* 🛡️\n━━━━━━━━━━━━━━━━━━━━\nShare this live, read-only ad spend protection report with your brand clients or executive team:\n\n👉 *Direct Client Link:*\nhttps://keepr-bot.onrender.com/client?phone=${cleanPhone}\n\n✨ *Features:*\n• Live 24/7 inventory integrity score\n• Zero login required for the client\n• Monthly ad spend protected proof\n• Real-time stock status beacons\n━━━━━━━━━━━━━━━━━━━━\n_Show your clients you are actively preventing ad waste!_`;
        await whatsappService.sendTextMessage(fromPhone, portalMsg);
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

      // 4.31 Emergency Fast-Pack: Traffic Police Checking ("police", "car docs", "gaadi ke paper")
      if (['police', 'car docs', 'car papers', 'gaadi ke kaagaz', 'gaadi ke paper', 'traffic police'].some(k => lowerText === k || lowerText.includes(k))) {
        const vehicleDocs = await dbService.getEmergencyVehicleDocs(fromPhone);
        if (vehicleDocs.length === 0) {
          const noDocMsg = activeLang === 'hi'
            ? '🚗 गाड़ी के कागज़ अभी वॉल्ट में सुरक्षित नहीं हैं।\n\nकार या बाइक की आरसी (RC), बीमा या PUC की फ़ोटो भेज दीजिए — आगे से "police" लिखते ही 2 सेकंड में ओरिजिनल फ़ाइलें मिल जाएँगी!'
            : activeLang === 'hinglish'
            ? '🚗 Gaadi ke kaagaz abhi vault mein save nahi hain.\n\nCar ya bike ki RC, insurance policy ya PUC ki photo bhej dijiye — aage se "police" likhte hi 2 second mein original files wapas mil jayengi!'
            : '🚗 No vehicle documents found in your vault yet.\n\nDrop a photo of your Car RC, Insurance, or PUC now — whenever police stop you, typing "police" will dispatch all original files in 2 seconds!';
          await whatsappService.sendTextMessage(fromPhone, noDocMsg);
          return;
        }

        const dispatchNotice = activeLang === 'hi'
          ? `🚨 आपातकालीन पुलिस पैक: गाड़ी के ${vehicleDocs.length} कागज़ात (RC + Insurance + PUC) भेजे जा रहे हैं...`
          : activeLang === 'hinglish'
          ? `🚨 Emergency Police Pack: Gaadi ke ${vehicleDocs.length} kaagaz (RC + Insurance + PUC) nikal rahe hain...`
          : `🚨 Emergency Police Fast-Pack: Dispatching ${vehicleDocs.length} vehicle documents (RC + Insurance + PUC)...`;
        await whatsappService.sendTextMessage(fromPhone, dispatchNotice);

        for (const vDoc of vehicleDocs.slice(0, 3)) {
          try {
            const buffer = await storageService.downloadDocument(vDoc.storage_path);
            const isPdf = vDoc.file_type?.includes('pdf') || vDoc.file_name?.toLowerCase().endsWith('.pdf');
            if (isPdf) {
              const mediaId = await whatsappService.uploadMedia(buffer, 'application/pdf', vDoc.file_name || `${vDoc.title}.pdf`);
              if (mediaId) await whatsappService.sendDocumentByMediaId(fromPhone, mediaId, vDoc.file_name || `${vDoc.title}.pdf`, `🚗 ${vDoc.title} (${vDoc.expiry_date ? `Expiry: ${vDoc.expiry_date}` : 'Valid'})`);
            } else {
              const mediaId = await whatsappService.uploadMedia(buffer, vDoc.file_type || 'image/jpeg', `${vDoc.title}.jpg`);
              if (mediaId) await whatsappService.sendImageByMediaId(fromPhone, mediaId, `🚗 ${vDoc.title} (${vDoc.expiry_date ? `Expiry: ${vDoc.expiry_date}` : 'Valid'})`);
            }
          } catch (e) {
            console.warn('Error sending emergency vehicle doc:', e);
          }
        }
        return;
      }

      // 4.32 Emergency Fast-Pack: Medical & Hospital ("medical", "emergency", "hospital")
      if (['medical', 'emergency', 'hospital', 'doctor emergency'].some(k => lowerText === k || lowerText.includes(k))) {
        const healthPack = await dbService.getEmergencyHealthDocs(fromPhone);
        let reply = `🏥 Emergency Medical Pack: 🤖✨\n\n`;
        if (healthPack.memories.length > 0) {
          reply += `💊 Active Dawaiyan & Health Notes:\n`;
          healthPack.memories.forEach((m, idx) => {
            reply += `${idx + 1}. ${m.key_fact}\n`;
          });
          reply += `\n`;
        }
        if (healthPack.docs.length > 0) {
          reply += `📄 Health Policies & Reports in Vault (${healthPack.docs.length}):\n`;
          healthPack.docs.forEach((d, idx) => {
            reply += `${idx + 1}. ${d.title} ${d.expiry_date ? `(Valid till ${d.expiry_date})` : ''}\n`;
          });
        } else if (healthPack.memories.length === 0) {
          reply += activeLang === 'hi'
            ? `कोई स्वास्थ्य पॉलिसी या पर्चा वॉल्ट में नहीं है। फ़ॉरवर्ड करके सुरक्षित कर सकते हैं!`
            : activeLang === 'hinglish'
            ? `Koi health policy ya parcha vault mein nahi hai. Forward karke save kar sakte hain!`
            : `No medical prescriptions or policies in your vault yet. Forward any medical document to lock it safely!`;
        }
        await whatsappService.sendTextMessage(fromPhone, reply);
        return;
      }

      // 4.33 Magic Command: "aaj kya hai" / Unified 7:00 AM Daily COO Brief
      if (['aaj kya hai', 'brief', 'schedule', 'aaj ka schedule', 'today schedule', 'daily brief', 'today', 'morning brief', 'what is today', 'daily update'].some(k => lowerText === k || lowerText.includes(k))) {
        const memories = await dbService.getUserMemories(fromPhone);
        const expiries = await dbService.getUserUpcomingDocuments(fromPhone, 30);
        const reminders = await dbService.getUserActiveReminders(fromPhone);
        const numerologyData = await dbService.getUserNumerologyData(fromPhone);

        const brief = await geminiService.generateUnifiedDailyBrief(
          resolvedName,
          memories,
          expiries,
          reminders,
          activeLang,
          numerologyData.profileContext
        );
        await whatsappService.sendTextMessage(fromPhone, brief);
        await dbService.saveChatMessage(fromPhone, 'model', brief);
        return;
      }

      // 4.34 Magic Command: "bhool ja" / Delete Memory
      if (lowerText.startsWith('bhool ja') || lowerText.startsWith('delete') || lowerText.startsWith('remove') || lowerText.startsWith('hata do') || lowerText.startsWith('forget')) {
        const queryToDelete = lowerText.replace(/^(bhool ja|delete|remove|hata do|forget)\s*:?/i, '').trim();
        const deletedCount = await dbService.deleteUserMemories(fromPhone, queryToDelete);
        const delMsg = deletedCount > 0
          ? (activeLang === 'hi' ? `✅ स्मृति से हटा दिया गया है।` : activeLang === 'hinglish' ? `✅ Maine yaad-daasht se hata diya hai. Ab yeh data mere paas nahi hai.` : `✅ Forgotten. Removed from memory.`)
          : (activeLang === 'hi' ? `गोपनीयता सुरक्षित: आपका डेटा साफ़ है।` : activeLang === 'hinglish' ? `Privacy safe: Aapka data clean hai.` : `Privacy safe: Your data is clean.`);
        await whatsappService.sendTextMessage(fromPhone, delMsg);
        return;
      }

      // 4.35 Magic Command: "rakh" / "save"
      if (lowerText.startsWith('rakh') || lowerText.startsWith('save')) {
        const rawNote = text.replace(/^(rakh|save)\s*:?/i, '').trim();
        if (rawNote) {
          const fact = await geminiService.extractFactOrPromise(rawNote);
          await dbService.saveUserMemory({
            user_phone: fromPhone,
            category: fact.isFactOrPromise ? (fact.category || 'note') : 'note',
            person: fact.person,
            key_fact: fact.keyFact || rawNote,
            due_date: fact.dueDate,
            amount: fact.amount,
            raw_text: rawNote,
          });
          const confirm = fact.replyReceipt || (
            activeLang === 'hi' ? `सुरक्षित हो गया ✅\n\n"${rawNote}" — माँगते ही तुरंत निकाल दूँगा।` :
            activeLang === 'hinglish' ? `Save ho gaya ✅\n\n"${rawNote}" — jab bhi poochhoge, turant nikal dunga.` :
            `Saved ✅\n\n"${rawNote}" — ask anytime and I'll retrieve it instantly.`
          );
          await whatsappService.sendTextMessage(fromPhone, confirm);
          return;
        }
      }

      // 4.4 Menu Option 1: Kaagaz Vault
      if (lowerText === '1' || ['kaagaz', 'mere kaagaz', 'dastavez', 'vault', 'files', 'documents', 'docs'].includes(lowerText)) {
        dbService.clearUserPromptState(fromPhone);
        await this.showMyDocs(fromPhone, activeLang);
        return;
      }

      // 4.5 Menu Option 2: Reminders & Expiries
      if (lowerText === '2' || ['reminders', 'reminder', 'mere reminders', 'active reminders'].includes(lowerText)) {
        dbService.clearUserPromptState(fromPhone);
        await this.showMyReminders(fromPhone, activeLang);
        return;
      }

      // 4.6 Menu Option 3: Ank Jyotish
      if (lowerText === '3' || ['jyotish', 'ank jyotish', 'mera ank jyotish', 'numerology', 'mulank', 'bhagyank'].includes(lowerText)) {
        dbService.clearUserPromptState(fromPhone);
        await this.showMyNumerology(fromPhone, user, resolvedName, activeLang);
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
        const langAck = `✅ Language set to ${detectedLang}! 🤖✨\n\nI will now converse with you in ${detectedLang} and protect your documents & reminders. How may I assist you today?`;
        await whatsappService.sendTextMessage(fromPhone, langAck);
        await dbService.saveChatMessage(fromPhone, 'model', langAck);
        return;
      }

      // 4.9 Check for Natural Reminder (e.g. "Kal 10 baje mummy ki dava yaad dilana", "Remind me to pay electricity bill on 15th")
      const reminderCheck = await geminiService.parseNaturalReminder(text);
      if (reminderCheck.isReminder && reminderCheck.task && reminderCheck.remindAtIso) {
        await dbService.addGeneralReminder(fromPhone, reminderCheck.task, reminderCheck.remindAtIso);
        const reply = personaService.getReminderSavedMessage(reminderCheck.task, reminderCheck.remindAtIso, activeLang);
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
        const reply = personaService.getAstroSavedMessage(astroCheck, activeLang);
        await whatsappService.sendTextMessage(fromPhone, reply);
        await dbService.saveChatMessage(fromPhone, 'model', reply);
        return;
      }

      // 4.101 Search User Memories (Life Graph Recall Loop)
      const memoryMatches = await dbService.searchUserMemories(fromPhone, text);
      const isMemoryQuery = /\b(kya tha|kya hai|kaunsi thi|kaunsa hai|password|wifi|dawa|medicine|dawai|promise|sharma|account|ifsc|upi|blood group|kitna|kitne|what was|what is|tell me|where is|when is)\b/i.test(text);
      if (memoryMatches.length > 0 && isMemoryQuery) {
        const topMem = memoryMatches[0];
        const memReply = activeLang === 'hi'
          ? `🔍 ${topMem.key_fact} ✅\n\n(आपने सुरक्षित करवाया था: "${topMem.raw_text || topMem.key_fact}")`
          : activeLang === 'hinglish'
          ? `🔍 ${topMem.key_fact} ✅\n\n(Aapne save karwaya tha: "${topMem.raw_text || topMem.key_fact}")`
          : `🔍 ${topMem.key_fact} ✅\n\n(Saved from: "${topMem.raw_text || topMem.key_fact}")`;
        await whatsappService.sendTextMessage(fromPhone, memReply);
        await dbService.saveChatMessage(fromPhone, 'model', memReply);
        return;
      }

      // 4.102 Fact or Promise Capture (Forwarded Chat / Casual Life Note Dump Loop)
      const isLikelyQuestion = /\b(kya|kaun|kahan|kaise|kyun|batao|bataiye|dikhao|bhejo|what|where|when|who|how|why|tell|show|send|\?)\b/i.test(text);
      if (!isLikelyQuestion) {
        const factCheck = await geminiService.extractFactOrPromise(text);
        if (factCheck.isFactOrPromise && factCheck.keyFact) {
          await dbService.saveUserMemory({
            user_phone: fromPhone,
            category: factCheck.category || 'note',
            person: factCheck.person,
            key_fact: factCheck.keyFact,
            due_date: factCheck.dueDate,
            amount: factCheck.amount,
            raw_text: text,
          });

          if (factCheck.dueDate) {
            const targetDate = new Date(factCheck.dueDate);
            if (!isNaN(targetDate.getTime()) && targetDate.getTime() > Date.now()) {
              await dbService.addGeneralReminder(fromPhone, factCheck.keyFact, targetDate.toISOString());
            }
          }

          const receipt = factCheck.replyReceipt || (
            activeLang === 'hi' ? `सुरक्षित हो गया ✅\n• ${factCheck.keyFact}` :
            activeLang === 'hinglish' ? `Save ho gaya ✅\n• ${factCheck.keyFact}` :
            `Saved ✅\n• ${factCheck.keyFact}`
          );
          await whatsappService.sendTextMessage(fromPhone, receipt);
          await dbService.saveChatMessage(fromPhone, 'model', receipt);
          return;
        }
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
        const formatted = personaService.formatSearchResults(text, results, activeLang);
        await whatsappService.sendTextMessage(fromPhone, formatted);
        await dbService.saveChatMessage(fromPhone, 'model', formatted);
        return;
      }

      // 4.12 Samajhdaar Dost Conversational AI + Ank Jyotish Visheshagya
      // Empathetic, polite conversation with continuous chat memory:
      const respectfulName = (activeLang === 'hi' || activeLang === 'hinglish')
        ? (resolvedName && resolvedName !== 'Friend' && resolvedName !== 'Bhai' ? `${resolvedName} ji` : 'Bhai Sahab')
        : (resolvedName && resolvedName !== 'Bhai' ? resolvedName : 'Friend');
      const history = await dbService.getRecentChatHistory(fromPhone, 10);
      const numerologyData = await dbService.getUserNumerologyData(fromPhone);

      const dostReply = await geminiService.chatAsDost(
        text,
        history,
        activeLang,
        respectfulName,
        numerologyData.profileContext
      );
      await whatsappService.sendTextMessage(fromPhone, dostReply);
      await dbService.saveChatMessage(fromPhone, 'model', dostReply);
    }
  }
};
