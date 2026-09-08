// =================================================================
// Keepr (usekeepr.com) - Persona, Voice & Human WhatsApp Interface
// Zero-Friction Human Companion, Life Vault & Personal COO
// "Dump anything. Ask anything. Miss nothing."
// =================================================================

import { ExtractedDoc } from '../services/gemini.js';
import { PLANS, BRAND } from '../config/constants.js';

export const personaService = {
  /**
   * 4-Line Zero-Friction Human Greeting (Default English, adapts to user language)
   */
  getHumanGreeting(userName: string = 'Friend', language: string = 'english'): string {
    const cleanLang = (language || 'english').toLowerCase();
    if (cleanLang === 'hi' || cleanLang === 'hindi') {
      return `मैं Keepr हूँ। जो भी सुरक्षित रखना हो भेज दीजिए — फ़ोटो, PDF, वॉइस नोट।\nयाद रखना हो तो लिख दीजिए। कभी भी ज़रूरत हो तो पूछ लीजिए।\n\nजैसे: "बेटी स्कूल फ़ीस 12 सितम्बर 18400" या "कल शाम पापा की दवाई"`;
    }
    if (cleanLang === 'hinglish') {
      return `Main Keepr hoon. Jo rakhna hai bhej do — photo, PDF, voice note.\nYaad rakhna hai to likh do. Nikalna ho to pooch lo.\n\nJaise: "beti school fee 12 Sept 18400" ya "kal shaam papa ki dawai"`;
    }
    // Default English
    return `I'm Keepr. Drop whatever you want to protect — photos, PDFs, voice notes.\nType to remember. Ask anytime to retrieve.\n\nLike: "daughter school fee 12 Sept 18400" or "remind me car insurance tomorrow"`;
  },

  /**
   * Backward compatible greeting
   */
  getLanguageSelectionMessage(): string {
    return this.getHumanGreeting();
  },

  getIntroMessage(userName: string = 'Friend', language: string = 'english'): string {
    return this.getHumanGreeting(userName, language);
  },

  getWelcomeMessage(userName: string = 'Friend', language: string = 'english'): string {
    return this.getHumanGreeting(userName, language);
  },

  getPhotoNamingPrompt(userName: string = 'Friend', language: string = 'english'): string {
    if (language === 'hi') {
      return `📸 फ़ोटो सुरक्षित हो गई ✅\n\nइसे किस नाम से याद रखना है? (जैसे: "घर की रजिस्ट्री" या "फ़ैमिली फ़ोटो") ताकि माँगते ही निकाल दूँ।`;
    }
    if (language === 'hinglish') {
      return `📸 Photo save ho gayi ✅\n\nIse kis naam se yaad rakhna hai? (Jaise: "Ghar ki Registry" ya "Vacation Photo") taaki maangte hi nikaal doon.`;
    }
    return `📸 Photo saved ✅\n\nHow should I label this? (e.g. "Property Registry" or "Vacation Photo") so you can retrieve it instantly anytime.`;
  },

  getMenuMessage(userName: string = 'Friend', language: string = 'english'): { text: string; buttons: { id: string; title: string }[] } {
    if (language === 'hi' || language === 'hinglish') {
      return {
        text: `Main Keepr hoon. Jo rakhna hai bhej do, nikalna ho to pooch lo.\n\nNiche ke options se bhi dekh sakte hain:`,
        buttons: [
          { id: 'btn_my_docs', title: '📁 Mere Kaagaz' },
          { id: 'btn_my_reminders', title: '⏰ Reminders' },
          { id: 'btn_my_numerology', title: '☀️ Daily Brief' },
          { id: 'btn_plans', title: `📋 Plans` },
        ],
      };
    }
    return {
      text: `I'm Keepr. Drop whatever you want to protect, or ask anytime to retrieve.\n\nYou can also explore the quick options below:`,
      buttons: [
        { id: 'btn_my_docs', title: '📁 My Vault' },
        { id: 'btn_my_reminders', title: '⏰ Reminders' },
        { id: 'btn_my_numerology', title: '☀️ Daily Brief' },
        { id: 'btn_plans', title: `📋 Plans` },
      ],
    };
  },

  /**
   * Crisp Human Receipts for Saved Documents (English default + Hinglish & Hindi)
   */
  getDocSavedMessage(
    doc: ExtractedDoc,
    language: string = 'english',
    remainingFreeSlots?: number
  ): string {
    const isHindi = language === 'hi' || language === 'hindi';
    const isHinglish = language === 'hinglish';

    // 1. Honest Failure & Blur Handling
    if (doc.is_uncertain) {
      if (doc.clarification_prompt) return doc.clarification_prompt;
      if (isHindi) return `फ़ोटो थोड़ी धुंधली लग रही है। क्या आप एक और साफ़ फ़ोटो भेज सकते हैं?`;
      if (isHinglish) return `Photo thodi blur lag rahi hai. Amount ya date clearly nahi dikh rahi — ek aur saaf photo bhej doge?`;
      return `The photo looks slightly blurry. The details aren't fully clear — could you send a clearer close-up?`;
    }

    // 2. Vehicle (RC / Insurance / PUC)
    if (doc.category === 'vehicle' || (doc.category === 'money_assets' && doc.vehicle_number)) {
      const reg = doc.vehicle_number ? `• Reg: ${doc.vehicle_number}` : '';
      const exp = doc.expiry_date ? `• Expiry: ${doc.expiry_date}` : '';
      if (isHinglish) {
        return `🚗 ${doc.title} save ho gayi ✅\n${reg}\n${exp}\n\nJab bhi zaroorat ho, bas likhna "${doc.vehicle_number || 'car rc'}" — turant original file wapas bhej dunga.`;
      }
      if (isHindi) {
        return `🚗 ${doc.title} सुरक्षित हो गई ✅\n${reg}\n${exp}\n\nजब भी ज़रूरत हो, बस "${doc.vehicle_number || 'गाड़ी कागज़'}" लिखें — तुरंत ओरिजिनल फ़ाइल मिल जाएगी।`;
      }
      return `🚗 ${doc.title} saved ✅\n${reg}\n${exp}\n\nWhenever needed, just type "${doc.vehicle_number || 'car rc'}" — I'll dispatch the original file instantly.`;
    }

    // 3. School / Kids / Family
    if (doc.category === 'family_school') {
      const amt = doc.amount ? `• Amount: ₹${doc.amount.toLocaleString('en-IN')}` : '';
      const due = doc.expiry_date ? `• Due Date: ${doc.expiry_date}` : '';
      if (isHinglish) {
        return `🏫 ${doc.title} save ho gayi ✅\n${amt}\n${due}\n\n${doc.action_proposed || 'Due date se pehle WhatsApp par reminder bhej dunga!'}`;
      }
      if (isHindi) {
        return `🏫 ${doc.title} सुरक्षित हो गई ✅\n${amt}\n${due}\n\nदेय तिथि (due date) से पहले मैं आपको WhatsApp पर याद दिला दूँगा!`;
      }
      return `🏫 ${doc.title} saved ✅\n${amt}\n${due}\n\n${doc.action_proposed || 'I will send a reminder on WhatsApp before the due date!'}`;
    }

    // 4. Health / Doctor Prescription / Medicine
    if (doc.category === 'health_medicine' || doc.category === 'medical') {
      let medsList = '';
      if (doc.medicines && doc.medicines.length > 0) {
        medsList = doc.medicines.map(m => `• ${m.name} (${m.dosage || ''} - ${m.timing || ''} ${m.relation_to_food || ''})`).join('\n');
      }
      if (isHinglish) {
        return `💊 ${doc.title} save ho gaya ✅\n${medsList ? `${medsList}\n` : ''}${doc.expiry_date ? `• Next Follow-up: ${doc.expiry_date}\n` : ''}Dawaiyon ki timing yaad rakhunga. Kisi specific waqt par reminder lagana hai?`;
      }
      if (isHindi) {
        return `💊 ${doc.title} सुरक्षित हो गया ✅\n${medsList ? `${medsList}\n` : ''}${doc.expiry_date ? `• फ़ॉलो-अप: ${doc.expiry_date}\n` : ''}दवाइयों का समय दर्ज कर लिया है। किसी निश्चित समय पर रिमाइंडर लगाना है?`;
      }
      return `💊 ${doc.title} saved ✅\n${medsList ? `${medsList}\n` : ''}${doc.expiry_date ? `• Next Follow-up: ${doc.expiry_date}\n` : ''}Medicine timings noted. Would you like a reminder at a specific time?`;
    }

    // 5. Appliance Bill / Warranty
    if (doc.category === 'appliance') {
      const exp = doc.expiry_date ? `• Warranty till: ${doc.expiry_date}` : '';
      if (isHinglish) {
        return `🔌 ${doc.title} save ho gaya ✅\n${exp}\nKharab hone par dhoondhna nahi padega — mangte hi original bill wapas mil jayega.`;
      }
      if (isHindi) {
        return `🔌 ${doc.title} सुरक्षित हो गया ✅\n${exp}\nखराब होने पर ढूँढना नहीं पड़ेगा — माँगते ही बिल मिल जाएगा।`;
      }
      return `🔌 ${doc.title} saved ✅\n${exp}\nNo need to dig through drawers — ask anytime and I'll fetch the original bill.`;
    }

    // 6. General / Bills / Notes
    const amt = doc.amount ? `• Amount: ₹${doc.amount.toLocaleString('en-IN')}\n` : '';
    const exp = doc.expiry_date ? `• Expiry/Due: ${doc.expiry_date}\n` : '';
    if (isHinglish) {
      return `📄 ${doc.title} save ho gaya ✅\n${amt}${exp}Vault mein surakshit darj hai.`;
    }
    if (isHindi) {
      return `📄 ${doc.title} सुरक्षित हो गया ✅\n${amt}${exp}वॉल्ट में सुरक्षित दर्ज है।`;
    }
    return `📄 ${doc.title} saved ✅\n${amt}${exp}Safely locked in your vault.`;
  },

  formatSearchResults(
    query: string,
    docs: any[],
    language: string = 'english'
  ): string {
    const isHindi = language === 'hi' || language === 'hindi';
    const isHinglish = language === 'hinglish';

    if (docs.length === 0) {
      if (isHindi) {
        return `🔍 मुझे "${query}" से संबंधित कोई कागज़ नहीं मिला। आप वाहन का नाम, बिल या पॉलिसी का नाम लिखकर ढूँढ सकते हैं।`;
      }
      if (isHinglish) {
        return `🔍 Mujhe "${query}" se milta-julta koi kaagaz nahi mila.\n\nAap "RC", "Bill", "Insurance" ya brand ka naam likhkar dhoondh sakte hain.`;
      }
      return `🔍 Couldn't find any document matching "${query}". Try searching by vehicle plate, brand name, or document type.`;
    }

    if (docs.length === 1) {
      const doc = docs[0];
      if (isHindi) {
        let res = `📄 आपका कागज़ मिल गया! 🤖✨\n\n`;
        res += `• शीर्षक: ${doc.title}\n`;
        if (doc.entity_name) res += `• कंपनी: ${doc.entity_name}\n`;
        if (doc.policy_or_bill_no) res += `• नंबर: ${doc.policy_or_bill_no}\n`;
        if (doc.expiry_date) res += `• समाप्ति: ${doc.expiry_date}\n`;
        if (doc.summary) res += `• विवरण: ${doc.summary}\n`;
        return res;
      }
      if (isHinglish) {
        let res = `📄 Aapka kaagaz mil gaya! 🤖✨\n\n`;
        res += `• Title: ${doc.title}\n`;
        if (doc.entity_name) res += `• Company: ${doc.entity_name}\n`;
        if (doc.policy_or_bill_no) res += `• No: ${doc.policy_or_bill_no}\n`;
        if (doc.expiry_date) res += `• Expiry: ${doc.expiry_date}\n`;
        if (doc.summary) res += `• Summary: ${doc.summary}\n`;
        return res;
      }
      let res = `📄 Document Found! 🤖✨\n\n`;
      res += `• Title: ${doc.title}\n`;
      if (doc.entity_name) res += `• Entity: ${doc.entity_name}\n`;
      if (doc.policy_or_bill_no) res += `• Number: ${doc.policy_or_bill_no}\n`;
      if (doc.expiry_date) res += `• Expiry: ${doc.expiry_date}\n`;
      if (doc.summary) res += `• Summary: ${doc.summary}\n`;
      return res;
    }

    if (isHindi) {
      let res = `🔍 आपके ${docs.length} कागज़ मिले: 🤖✨\n\n`;
      docs.forEach((doc, idx) => {
        res += `${idx + 1}. ${doc.title}\n`;
        if (doc.expiry_date) res += `   • समाप्ति: ${doc.expiry_date}\n`;
      });
      res += `\nकिसी एक की ओरिजिनल फ़ाइल मँगवाने के लिए उसका नाम लिखें!`;
      return res;
    }
    if (isHinglish) {
      let res = `🔍 Aapke ${docs.length} kaagaz mile: 🤖✨\n\n`;
      docs.forEach((doc, idx) => {
        res += `${idx + 1}. ${doc.title}\n`;
        if (doc.expiry_date) res += `   • Expiry: ${doc.expiry_date}\n`;
      });
      res += `\nKisi ek ki original file mangwane ke liye uska poora naam likhein!`;
      return res;
    }

    let res = `🔍 Found ${docs.length} documents: 🤖✨\n\n`;
    docs.forEach((doc, idx) => {
      res += `${idx + 1}. ${doc.title}\n`;
      if (doc.expiry_date) res += `   • Expiry: ${doc.expiry_date}\n`;
    });
    res += `\nType the title of any document to receive the original uncompressed file!`;
    return res;
  },

  getReminderSavedMessage(
    task: string,
    remindAtIso: string,
    language: string = 'english'
  ): string {
    const formattedDate = new Date(remindAtIso).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    if (language === 'hi' || language === 'hindi') {
      return `⏰ रिमाइंडर सेट हो गया है! 🤖✨\n\n• कार्य: ${task}\n• समय: ${formattedDate}\n\nआप निश्चिंत रहें, ठीक इस समय मैं आपको WhatsApp पर संदेश भेज दूँगा!`;
    }
    if (language === 'hinglish') {
      return `⏰ Reminder set ho gaya hai! 🤖✨\n\n• Task: ${task}\n• Waqt: ${formattedDate}\n\nAap nishchint rahein, theek is waqt main aapko WhatsApp par sandesh bhej doonga!`;
    }
    return `⏰ Reminder Locked! 🤖✨\n\n• Task: ${task}\n• Time: ${formattedDate}\n\nI will message you right here on WhatsApp when the time comes!`;
  },

  getAstroSavedMessage(
    astro: { dob?: string; tob?: string; pob?: string; rashi?: string },
    language: string = 'english'
  ): string {
    if (language === 'hi' || language === 'hindi') {
      return `🌅 जन्मतिथि व अंक ज्योतिष विवरण दर्ज हो गया है! 🔢✨\n\n• जन्मतिथि (DOB): ${astro.dob || 'दर्ज'}\n\nअब हर सुबह 7:00 AM पर मैं आपको आपके मूलांक, लकी रंग और दिन की शुभता का संदेश WhatsApp पर भेजूँगा! ☀️`;
    }
    if (language === 'hinglish') {
      return `🌅 Aapki birth date aur Ank Jyotish details darj ho gayi hain! 🔢✨\n\n• DOB: ${astro.dob || 'Saved'}\n\nAb roz subah 7:00 AM par main aapko WhatsApp par sandesh bhejunga ki aaj ka din kaisa rahega, shubh rang aur zaroori savdhani! ☀️`;
    }
    return `🌅 Birth Profile & Numerology Saved! 🔢✨\n\n• DOB: ${astro.dob || 'Saved'}\n\nStarting tomorrow at 7:00 AM, I will send your personalized morning brief, lucky colors, and day insights! ☀️`;
  },

  formatExpiriesList(expiries: any[], language: string = 'english'): string {
    const isHindi = language === 'hi' || language === 'hindi';
    const isHinglish = language === 'hinglish';

    if (expiries.length === 0) {
      if (isHindi) {
        return `✨ बहुत बढ़िया! आपके किसी भी कागज़ की अगले 1 साल में कोई समाप्ति (expiry) देय नहीं है। आप निश्चिंत रहें!`;
      }
      if (isHinglish) {
        return `✨ Bahut badhiya! Aapke kisi bhi kaagaz ki agle 1 saal mein koi expiry due nahi hai. Aap bilkul nishchint rahein!`;
      }
      return `✨ All clear! None of your saved documents have an expiry due in the next 12 months.`;
    }

    if (isHindi) {
      let msg = `📅 आपकी आने वाली समाप्ति व नवीनीकरण (Renewals): 🤖✨\n\n`;
      expiries.forEach((item, index) => {
        msg += `${index + 1}. ${item.title}\n`;
        msg += `   • समाप्ति: ${item.expiry_date}\n`;
        if (item.policy_or_bill_no) msg += `   • नंबर: ${item.policy_or_bill_no}\n`;
        msg += `\n`;
      });
      msg += `इन सभी तिथियों से 30, 7 और 1 दिन पहले मैं आपको WhatsApp पर याद दिला दूँगा।`;
      return msg;
    }

    if (isHinglish) {
      let msg = `📅 Aapki aane wali expiries aur renewals: 🤖✨\n\n`;
      expiries.forEach((item, index) => {
        msg += `${index + 1}. ${item.title}\n`;
        msg += `   • Taareekh: ${item.expiry_date}\n`;
        if (item.policy_or_bill_no) msg += `   • No: ${item.policy_or_bill_no}\n`;
        msg += `\n`;
      });
      msg += `In sabhi taareekhon par main aapko 30, 7 aur 1 din pehle WhatsApp par alert bhejunga.`;
      return msg;
    }

    let msg = `📅 Upcoming Expiries & Renewals: 🤖✨\n\n`;
    expiries.forEach((item, index) => {
      msg += `${index + 1}. ${item.title}\n`;
      msg += `   • Due Date: ${item.expiry_date}\n`;
      if (item.policy_or_bill_no) msg += `   • Number: ${item.policy_or_bill_no}\n`;
      msg += `\n`;
    });
    msg += `I will notify you 30, 7, and 1 day before each deadline right here on WhatsApp.`;
    return msg;
  },

  getQuotaFullUpsell(userPhone: string): { text: string; buttons: { id: string; title: string }[] } {
    return {
      text: `📦 Free Pack ki 5 files limit poori ho chuki hai!\n\nAapki saved files hamesha 100% surakshit rahengi aur search hoti rahengi.\n\nAur naye documents + 25 automated WhatsApp alerts ke liye Yaad Plan sirf ₹249/saal (Sirf ₹20/mahina) mein activate kar sakte hain.`,
      buttons: [
        { id: `upgrade_yaad_249`, title: '₹249 Yaad Plan' },
        { id: 'dismiss_upsell', title: 'Baad Mein' },
      ],
    };
  },

  getExpiryUpsell(userPhone: string, docTitle: string, expiryDate: string): { text: string; buttons: { id: string; title: string }[] } {
    return {
      text: `⏰ ${docTitle} ki expiry ${expiryDate} ko hai.\n\nPehla reminder maine aapke liye free mein set kar diya hai.\n\nSaare vehicles, appliances aur policies ke saal bhar WhatsApp alerts ke liye Yaad Plan sirf ₹249/saal (Sirf ₹20/mahina) hai.`,
      buttons: [
        { id: `upgrade_yaad_249`, title: '₹249 Yaad Plan' },
        { id: 'dismiss_upsell', title: 'Baad Mein' },
      ],
    };
  },

  getWarisPathInfo(): string {
    return `🛡️ WarisPath Kit (Family Protection)\n\nAapne apne saare zaroori kaagaz to surakshit kar liye.\n\nLekin agar kabhi koi emergency ya unhoni ho, to kya aapki family / nominee ko pata hai ki FD, Insurance aur Property claim kaise karni hai?\n\nIske liye hamari alag WarisPath Kit aati hai jo nominee ko step-by-step guidance deti hai bina kisi vakil ke chakkar ke.\n\nAgar dekhna ho to "Waris Kit" likhein, warna aapka ${BRAND.name} normal chalta rahega. 🙏`;
  },

  getReferralShareMessage(userPhone: string, referralCode: string): string {
    const shareLink = `https://wa.me/${BRAND.botPhone}?text=Hi%20${BRAND.name}%20ref_${referralCode}`;
    const clickToForward = `https://api.whatsapp.com/send?text=Namaste!%20Ye%20check%20karein,%20WhatsApp%20par%20AI%20Locker%20aur%20Reminders%20hai%20ekdum%20free:%20${encodeURIComponent(shareLink)}`;

    return `🎁 Aapka Personal Invite Link: 🤖✨\n\nAapke link se kisi ke judne par aap dono ko milenge:\n• +5 Extra Files Free Storage\n• +3 Extra Free Reminders\n\nInvite Link:\n${shareLink}\n\nWhatsApp par direct forward karne ke liye yahan tap karein:\n${clickToForward}\n\nJaise hi naye user is link se join karenge, aapka extra storage turant unlock ho jayega! 🎉`;
  },

  getReferralRewardMessage(friendName: string, totalFiles: number): string {
    return `🎉 Badhai ho! 🤖✨\n\nAapke refer kiye gaye saathi (${friendName}) ne ${BRAND.name} join kar liya hai!\n\nAapko +5 Extra Files & Reminders free unlock ho gaye hain. Ab aapke account mein total ${totalFiles} files ki jagah hai!\n\nAise hi aur saathiyon ko jodein aur storage badhate rahein. 🚀`;
  },

  getMilestoneMessage(type: 'penalty_saved' | 'five_files' | 'habit_week', data?: string): string {
    if (type === 'penalty_saved') {
      return `🚨 ${BRAND.name} Money Guard: Is ${data || 'kaagaz'} ki date save karke aapne seedha ₹10,000 ka traffic challan ya warranty nuksaan bacha liya hai! Ek samajhdaar saathi ka yahi farz hota hai. ✨`;
    }
    if (type === 'five_files') {
      return `🏆 5 Zaroori Kaagaz Safe! Ab wallet ya file dhoondhne ki chinta hamesha ke liye khatam. Jab bhi zaroorat ho, bas naam likhiye!`;
    }
    return `✨ 1 Hafta Saath: Hamaare saath ko 1 hafta poora ho gaya! Main hamesha 24/7 yahin upasthit hoon aapke zaroori kaagaz aur har baat sambhalne ke liye.`;
  }
};
