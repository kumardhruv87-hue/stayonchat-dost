// =================================================================
// Keepr (usekeepr.com) - Persona, Voice & Multilingual Response Engine
// Silicon Valley Standard Warm & Respectful AI Assistant
// =================================================================

import { ExtractedDoc } from '../services/gemini.js';
import { PLANS, BRAND } from '../config/constants.js';

export const personaService = {
  /**
   * Primary Language Selector (Sent first on greeting/onboarding)
   */
  getLanguageSelectionMessage(): string {
    return `Namaste / Hello! 🙏✨\n\nWelcome to ${BRAND.displayName} — Your Autonomous AI Life Vault & Assistant!\n\nKripya apni pasandeeda bhasha chunein (Please choose your language):\n\n1️⃣ Hinglish (Hindi + English)\n2️⃣ हिंदी (Hindi)\n3️⃣ English\n\n👉 Niche 1, 2 ya 3 likhkar reply karein!`;
  },

  /**
   * Interactive Language Picker for buttons
   */
  getLanguagePicker() {
    return {
      text: this.getLanguageSelectionMessage(),
      buttons: [
        { id: 'lang_hinglish', title: '1️⃣ Hinglish' },
        { id: 'lang_hi', title: '2️⃣ हिंदी' },
        { id: 'lang_en', title: '3️⃣ English' },
      ],
    };
  },

  /**
   * Standard Introduction Message in chosen language
   */
  getIntroMessage(userName: string = 'Bhai Sahab', language: string = 'hinglish'): string {
    const cleanName = userName && userName !== 'Bhai' ? `${userName} ji` : 'Bhai Sahab';

    if (language === 'hi') {
      return `नमस्ते ${cleanName}! 🙏✨\n\nमैं हूँ आपका ${BRAND.displayName} — आपका सुरक्षित डिजिटल लॉकर और पर्सनल असिस्टेंट!\n\nआप मुझसे बेझिझक बात कर सकते हैं। मेरी मुख्य सेवाएँ:\n\n1️⃣ 📁 मेरे कागज़ (Vault): कोई भी फोटो, बिल, RC, बीमा या पर्चा भेज दीजिए — हमेशा सुरक्षित रखूँगा और मांगते ही ओरिजिनल फ़ाइल वापस भेज दूँगा!\n2️⃣ ⏰ रिमाइंडर्स व चालान सुरक्षा: दवा, EMI या सर्विसिंग याद दिलाने को कहिए। चालान व पेनल्टी से बचाने के लिए समय पर अलर्ट भेजूँगा!\n3️⃣ 🔢 मेरा अंक ज्योतिष: हर सुबह 6:00 AM पर आपका लकी रंग, शुभ मुहूर्त और रोड सेफ्टी गाइड!\n4️⃣ 📋 ${BRAND.name} प्लान्स: सिर्फ ₹20/महीना से शुरू!\n\nशुरुआत के लिए नीचे 1, 2, 3 या 4 लिखें या सीधे कोई भी फोटो, सवाल या काम भेजें! 😊`;
    }

    if (language === 'en') {
      return `Hello ${cleanName}! 👋✨\n\nI am ${BRAND.displayName} — your autonomous digital companion and encrypted document vault!\n\nHere is how I can help you:\n\n1️⃣ 📁 My Vault: Send any photo, bill, vehicle RC, insurance, or prescription — I keep them encrypted and return original files instantly!\n2️⃣ ⏰ Smart Reminders: Never miss medicines, bills, or renewals. I save you from penalties and traffic challans with WhatsApp alerts!\n3️⃣ 🔢 Daily Life Guide: Get your lucky colors, daily energy vibration, and travel safety insights every morning at 6:00 AM!\n4️⃣ 📋 ${BRAND.name} Plans: Starting at just ₹20/month!\n\nTo get started, reply with 1, 2, 3, or 4, or simply send any photo, question, or document! 😊`;
    }

    // Default: Hinglish
    return `Namaste ${cleanName}! 🙏✨\n\nMain hoon aapka ${BRAND.displayName} — aapka saccha digital dost, personal assistant aur smart kaagaz locker!\n\nAap mujhse ek sacche dost ki tarah baat kar sakte hain. Main aapke liye kya-kya kar sakta hoon:\n\n1️⃣ 📁 Mere Kaagaz (Vault): Koi bhi photo, bill, RC, insurance ya parcha bhej dijiye — surakshit rakhunga aur maangte hi original file wapas bhej dunga!\n2️⃣ ⏰ Reminders & Expiry Alerts: Dawa, EMI ya servicing yaad dilane ko kahiye. Expiry se pehle WhatsApp alert bhejkar challan aur loss bachaunga!\n3️⃣ 🔢 Mera Ank Jyotish: Har subah 6:00 AM par aapka lucky color, shubh din aur road safety guidance!\n4️⃣ 📋 ${BRAND.name} Plans: Sirf ₹20/mahina se shuru!\n\nShuru karne ke liye niche 1, 2, 3 ya 4 likhein ya seedha koi bhi photo, sawal ya task bhejein! 😊`;
  },

  getWelcomeMessage(userName: string = 'Bhai Sahab', language: string = 'hinglish'): string {
    return this.getIntroMessage(userName, language);
  },

  getPhotoNamingPrompt(userName: string = 'Bhai Sahab'): string {
    return `📸 Aapki photo vault mein bilkul surakshit save ho gayi hai! 🤖✨\n\nKripya batayein ise kis naam se save rakhna hai? (Jaise: "Tarangi Vacation Photo" ya "Ghar ki Registry") taaki aage mangne par main ise turant nikal kar aapko bhej sakoon.`;
  },

  getMenuMessage(userName: string = 'Bhai Sahab'): { text: string; buttons: { id: string; title: string }[] } {
    const cleanName = userName && userName !== 'Bhai' ? `${userName} ji` : 'Bhai Sahab';
    return {
      text: `Namaste ${cleanName}! 🙏✨\n\nMain hoon aapka ${BRAND.displayName} — aapka autonomous digital saathi!\n\nAap niche diye gaye vikalpon mein se chun sakte hain ya seedhe koi bhi photo, kaagaz ya sawaal bhej sakte hain:`,
      buttons: [
        { id: 'btn_my_docs', title: '📁 Mere Kaagaz' },
        { id: 'btn_my_reminders', title: '⏰ Reminders' },
        { id: 'btn_my_numerology', title: '🔢 Mera Ank Jyotish' },
        { id: 'btn_plans', title: `📋 ${BRAND.name} Plans` },
        { id: 'btn_share_invite', title: '🎁 Dosto ko Invite' },
      ],
    };
  },

  getDocSavedMessage(
    doc: ExtractedDoc,
    language: string = 'hinglish',
    remainingFreeSlots?: number
  ): string {
    if (language === 'hi') {
      let msg = `✅ कागज़ सुरक्षित लॉकर में दर्ज हो गया है! 🤖✨\n\n`;
      msg += `• शीर्षक: ${doc.title}\n`;
      if (doc.entity_name) msg += `• दुकान/कंपनी: ${doc.entity_name}\n`;
      if (doc.policy_or_bill_no) msg += `• नंबर: ${doc.policy_or_bill_no}\n`;
      if (doc.amount) msg += `• रकम: ₹${doc.amount.toLocaleString('en-IN')}\n`;
      if (doc.expiry_date) {
        msg += `• अंतिम तिथि (Expiry): ${doc.expiry_date}\n\n`;
        msg += `⏰ निश्चिंत रहिए! अंतिम तिथि से 30, 7 और 1 दिन पहले मैं आपको WhatsApp पर याद दिला दूँगा।`;
      } else {
        msg += `• श्रेणी: ${doc.category}\n`;
        msg += `• विवरण: ${doc.summary}`;
      }
      return msg;
    }

    if (language === 'en') {
      let msg = `✅ Document safely saved in your vault! 🤖✨\n\n`;
      msg += `• Title: ${doc.title}\n`;
      if (doc.entity_name) msg += `• Entity: ${doc.entity_name}\n`;
      if (doc.policy_or_bill_no) msg += `• Number: ${doc.policy_or_bill_no}\n`;
      if (doc.amount) msg += `• Amount: ₹${doc.amount.toLocaleString('en-IN')}\n`;
      if (doc.expiry_date) {
        msg += `• Expiry / Renewal: ${doc.expiry_date}\n\n`;
        msg += `⏰ Locked in! I will alert you 30, 7, and 1 day before expiry.`;
      } else {
        msg += `• Category: ${doc.category}\n`;
        msg += `• Summary: ${doc.summary}`;
      }
      return msg;
    }

    // Hinglish
    let msg = `✅ Aapka kaagaz vault mein surakshit save ho gaya hai! 🤖✨\n\n`;
    msg += `• Title: ${doc.title}\n`;
    if (doc.entity_name) msg += `• Company/Shop: ${doc.entity_name}\n`;
    if (doc.policy_or_bill_no) msg += `• Number: ${doc.policy_or_bill_no}\n`;
    if (doc.amount) msg += `• Rakam: ₹${doc.amount.toLocaleString('en-IN')}\n`;
    if (doc.expiry_date) {
      msg += `• Expiry / Renewal: ${doc.expiry_date}\n\n`;
      msg += `⏰ Reminder set! Expiry se 30, 7 aur 1 din pehle main WhatsApp par aapko alert bhejunga.`;
    } else {
      msg += `• Category: ${doc.category}\n`;
      msg += `• Summary: ${doc.summary}`;
    }

    if (remainingFreeSlots !== undefined) {
      const usedFiles = Math.max(1, 5 - remainingFreeSlots);
      msg += `\n\n📦 Safe Vault: ${usedFiles}/5 files used (Free Plan)\n💡 Tip: 50 files aur saal bhar ke challan & penalty alerts ke liye Yaad Plan sirf ₹20/mahina mein activate karein (likhein "yaad").`;
    }

    return msg;
  },

  formatSearchResults(
    query: string,
    docs: any[],
    language: string = 'hinglish'
  ): string {
    if (docs.length === 0) {
      if (language === 'hi') {
        return `🔍 मुझे "${query}" से संबंधित कोई कागज़ नहीं मिला। आप वाहन का नाम, बिल या पॉलिसी का नाम लिखकर ढूँढ सकते हैं।`;
      }
      if (language === 'en') {
        return `🔍 Couldn't find any document matching "${query}". Try searching by vehicle name, brand, or policy type.`;
      }
      return `🔍 Mujhe "${query}" se milta-julta koi kaagaz nahi mila.\n\nAap "RC", "Bill", "Insurance" ya brand ka naam likhkar dhoondh sakte hain.`;
    }

    if (docs.length === 1) {
      const doc = docs[0];
      let res = `📄 Aapka kaagaz mil gaya! 🤖✨\n\n`;
      res += `• Title: ${doc.title}\n`;
      if (doc.entity_name) res += `• Company: ${doc.entity_name}\n`;
      if (doc.policy_or_bill_no) res += `• No: ${doc.policy_or_bill_no}\n`;
      if (doc.expiry_date) res += `• Expiry: ${doc.expiry_date}\n`;
      if (doc.summary) res += `• Summary: ${doc.summary}\n`;
      return res;
    }

    let res = `🔍 Aapke ${docs.length} kaagaz mile: 🤖✨\n\n`;
    docs.forEach((doc, idx) => {
      res += `${idx + 1}. ${doc.title}\n`;
      if (doc.expiry_date) res += `   • Expiry: ${doc.expiry_date}\n`;
      if (doc.policy_or_bill_no) res += `   • No: ${doc.policy_or_bill_no}\n`;
    });
    res += `\nKisi ek ki original file mangwane ke liye uska poora naam likhein!`;
    return res;
  },

  getReminderSavedMessage(
    task: string,
    remindAtIso: string,
    language: string = 'hinglish'
  ): string {
    const formattedDate = new Date(remindAtIso).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    if (language === 'hi') {
      return `⏰ रिमाइंडर सेट हो गया है! 🤖✨\n\n• कार्य: ${task}\n• समय: ${formattedDate}\n\nआप निश्चिंत रहें, ठीक इस समय मैं आपको WhatsApp पर संदेश भेज दूँगा!`;
    }
    if (language === 'en') {
      return `⏰ Reminder Locked! 🤖✨\n\n• Task: ${task}\n• Time: ${formattedDate}\n\nPlease relax, I will message you right here on WhatsApp when the time comes!`;
    }
    return `⏰ Reminder set ho gaya hai! 🤖✨\n\n• Task: ${task}\n• Waqt: ${formattedDate}\n\nAap nishchint rahein, theek is waqt main aapko WhatsApp par sandesh bhej doonga!`;
  },

  getAstroSavedMessage(
    astro: { dob?: string; tob?: string; pob?: string; rashi?: string },
    language: string = 'hinglish'
  ): string {
    if (language === 'hi') {
      return `🌅 जन्मतिथि व अंक ज्योतिष विवरण दर्ज हो गया है! 🔢✨\n\n• जन्मतिथि (DOB): ${astro.dob || 'दर्ज'}\n\nअब हर सुबह 6:00 AM पर मैं आपको आपके मूलांक, लकी रंग और दिन की शुभता का संदेश WhatsApp पर भेजूँगा! ☀️`;
    }
    if (language === 'en') {
      return `🌅 Birth Profile & Numerology Saved! 🔢✨\n\n• DOB: ${astro.dob || 'Saved'}\n\nStarting tomorrow at 6:00 AM, I will send your personalized morning guidance, lucky colors, and day insights! ☀️`;
    }
    return `🌅 Aapki birth date aur Ank Jyotish details darj ho gayi hain! 🔢✨\n\n• DOB: ${astro.dob || 'Saved'}\n\nAb roz subah 6:00 AM par main aapko WhatsApp par sandesh bhejunga ki aaj ka din kaisa rahega, shubh rang aur zaroori savdhani! ☀️`;
  },

  formatExpiriesList(expiries: any[]): string {
    if (expiries.length === 0) {
      return `✨ Bahut badhiya! Aapke kisi bhi kaagaz ki agle 1 saal mein koi expiry due nahi hai. Aap bilkul nishchint rahein!`;
    }

    let msg = `📅 Aapki aane wali expiries aur renewals: 🤖✨\n\n`;
    expiries.forEach((item, index) => {
      msg += `${index + 1}. ${item.title}\n`;
      msg += `   • Taareekh: ${item.expiry_date}\n`;
      if (item.policy_or_bill_no) msg += `   • No: ${item.policy_or_bill_no}\n`;
      msg += `\n`;
    });

    msg += `In sabhi taareekhon par main aapko 30, 7 aur 1 din pehle WhatsApp par alert bhejunga.`;
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
