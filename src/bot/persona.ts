// =================================================================
// DOST (stayonchat.com) - Lovable Persona, Voice & Multilingual Response Engine
// "Aapka Apna Digital Saathi" - Caring, Witty, Reliable Best Friend
// =================================================================

import { ExtractedDoc } from '../services/gemini.js';
import { PLANS } from '../config/constants.js';

export const personaService = {
  /**
   * Language selector buttons for first-time onboarding or language command
   */
  getLanguagePicker() {
    return {
      text: `Namaste / Hello! 🙏✨\n\nMain hoon *AI DOST 🤖* — aapka apna digital dost! (powered by stayonchat.com)\n\nApni bhasha chunein:\n\n👉 Kisi aur bhasha (Marathi, Gujarati, Bengali, Tamil, etc.) ke liye bas uska naam type kar dein!`,
      buttons: [
        { id: 'lang_hinglish', title: 'Hinglish (Mix)' },
        { id: 'lang_hi', title: 'हिंदी' },
        { id: 'lang_en', title: 'English' },
      ],
    };
  },

  /**
   * Warm, lovable welcome message after language selection
   */
  getWelcomeMessage(userName: string = 'Bhai Sahab', language: string = 'hinglish'): string {
    if (language === 'hi') {
      return `नमस्ते ${userName}! 🙏✨\n\nमैं हूँ आपका AI DOST 🤖 (stayonchat.com) — आपका अपना डिजिटल साथी!\n\nमैं आपकी क्या-क्या मदद कर सकता हूँ:\n• कागज़ व बिल लॉकर: कोई भी फोटो या PDF भेजिए, सुरक्षित रखूँगा और मांगने पर तुरंत भेज दूँगा।\n• स्मार्ट रिमाइंडर्स: किसी भी काम की याद दिलाने को कहिए (जैसे "कल सुबह 10 बजे बिल भरना है")।\n• अंक ज्योतिष व सलाह: अपनी जन्मतिथि या गाड़ी का नंबर बताइए, लकी रंग और ज़रूरी सलाह दूँगा।\n• आदरणीय साथी: कोई भी बात करनी हो या जीवन/काम की सलाह चाहिए, बेझिझक पूछिए।\n\nशुरुआत करने के लिए कृपया कोई भी फोटो, PDF या सवाल भेजकर देखिए! 😊`;
    }

    if (language === 'en') {
      return `Hello ${userName}! 👋✨\n\nI am AI DOST 🤖 (stayonchat.com) — your personal digital companion!\n\nHere is how I can assist you:\n• Smart Locker: Send any photo or PDF (bills, RC, insurance, prescription). I'll keep them safe and return original files whenever you ask.\n• Smart Reminders: Ask me to remind you about anything (e.g. "Remind me to pay electricity bill tomorrow").\n• Numerology & Insights: Share your date of birth or vehicle number for lucky colors and helpful guidance.\n• Trusted Companion: Feel free to chat anytime for advice or conversation.\n\nPlease send any document, photo, or question to get started! 😊`;
    }

    // Default: Hinglish
    return `Namaste ${userName}! 🙏✨\n\nMain hoon aapka AI DOST 🤖 (stayonchat.com) — aapka apna digital dost!\n\nMain aapki kya-kya madad kar sakta hoon:\n• Kaagaz & Photo Vault: Koi bhi photo ya PDF bhej dijiye (Bill, RC, Insurance, Parcha). Safe rakhunga aur mangte hi turant bhej dunga!\n• Smart Reminders: Kisi bhi zaroori kaam ka yaad dilane ko kahiye (jaise "Kal subah 10 baje bill bharna hai").\n• Ank Jyotish: Apni birth date ya car number batayein, main shubh rang aur zaroori salah dunga.\n• Sacha Saathi: Koi bhi baat karni ho ya salah chahiye, aadar ke saath chat kijiye!\n\nShuruat karne ke liye kripya koi photo, PDF ya sawaal bhej kar dekhiye. 😊`;
  },

  /**
   * Confirmation message when a document / PDF is uploaded and parsed
   */
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

    if (remainingFreeSlots !== undefined && remainingFreeSlots <= 3 && remainingFreeSlots > 0) {
      msg += `\n\nℹ️ Free Pack mein abhi ${remainingFreeSlots} files ki jagah bachi hai.`;
    }

    return msg;
  },

  /**
   * Search results formatter
   */
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

  /**
   * Confirmation when general reminder is scheduled
   */
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

  /**
   * Confirmation when user shares birth details for 6 AM Daily Astro Guide
   */
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

  /**
   * List of all active expiries for user
   */
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

  /**
   * Contextual Upsell: Free 15 files quota exhausted
   */
  getQuotaFullUpsell(userPhone: string): { text: string; buttons: { id: string; title: string }[] } {
    return {
      text: `📦 Free Pack ki 15 files poori ho chuki hain!\n\nAapki purani 15 files hamesha surakshit rahengi aur search hoti rahengi.\n\nAur naye documents + saal bhar ke automated WhatsApp reminders ke liye Yaad Plan sirf ₹149/saal (mahine ka ₹12.50) mein le sakte hain.`,
      buttons: [
        { id: `upgrade_yaad_149`, title: '₹149 Yaad Plan' },
        { id: 'dismiss_upsell', title: 'Baad Mein' },
      ],
    };
  },

  /**
   * Contextual Upsell: Expiry Alert activated
   */
  getExpiryUpsell(userPhone: string, docTitle: string, expiryDate: string): { text: string; buttons: { id: string; title: string }[] } {
    return {
      text: `⏰ ${docTitle} ki expiry ${expiryDate} ko hai.\n\nPehla reminder maine aapke liye free mein set kar diya hai.\n\nSaare vehicles, appliances aur policies ke saal bhar WhatsApp alerts ke liye Yaad Plan sirf ₹149/saal hai.`,
      buttons: [
        { id: `upgrade_yaad_149`, title: '₹149 Yaad Plan' },
        { id: 'dismiss_upsell', title: 'Baad Mein' },
      ],
    };
  },

  /**
   * Contextual Upsell: Family / Nominee / Succession inquiry
   */
  getWarisPathInfo(): string {
    return `🛡️ WarisPath Kit (Family Protection)\n\nAapne apne saare zaroori kaagaz to surakshit kar liye.\n\nLekin agar kabhi koi emergency ya unhoni ho, to kya aapki family / nominee ko pata hai ki FD, Insurance aur Property claim kaise karni hai?\n\nIske liye hamari alag WarisPath Kit aati hai jo nominee ko step-by-step guidance deti hai bina kisi vakil ke chakkar ke.\n\nAgar dekhna ho to "Waris Kit" likhein, warna aapka dost normal chalta rahega. 🙏`;
  },

  /**
   * Viral Marketing: Referral invite link message
   */
  getReferralShareMessage(userPhone: string, referralCode: string): string {
    const shareLink = `https://wa.me/15556681690?text=Hi%20DOST%20ref_${referralCode}`;
    const clickToForward = `https://api.whatsapp.com/send?text=Namaste!%20Ye%20check%20karein,%20WhatsApp%20par%20AI%20Locker%20aur%20Reminders%20hai%20ekdum%20free:%20${encodeURIComponent(shareLink)}`;

    return `🎁 Aapka Personal Invite Link: 🤖✨\n\nAapke link se kisi ke judne par aap dono ko milenge:\n• +5 Extra Files Free Storage\n• +3 Extra Free Reminders\n\nInvite Link:\n${shareLink}\n\nWhatsApp par direct forward karne ke liye yahan tap karein:\n${clickToForward}\n\nJaise hi naye user is link se join karenge, aapka extra storage turant unlock ho jayega! 🎉`;
  },

  /**
   * Confirmation to referrer when a friend joins
   */
  getReferralRewardMessage(friendName: string, totalFiles: number): string {
    return `🎉 Badhai ho! 🤖✨\n\nAapke refer kiye gaye saathi (${friendName}) ne AI DOST join kar liya hai!\n\nAapko +5 Extra Files & Reminders free unlock ho gaye hain. Ab aapke account mein total ${totalFiles} files ki jagah hai!\n\nAise hi aur saathiyon ko jodein aur storage badhate rahein. 🚀`;
  },

  /**
   * Habit & Loss-Prevention Milestones
   */
  getMilestoneMessage(type: 'penalty_saved' | 'five_files' | 'habit_week', data?: string): string {
    if (type === 'penalty_saved') {
      return `🚨 AI DOST Money Guard: Is ${data || 'kaagaz'} ki date save karke aapne seedha ₹10,000 ka traffic challan ya warranty nuksaan bacha liya hai! Ek samajhdaar saathi ka yahi farz hota hai. ✨`;
    }
    if (type === 'five_files') {
      return `🏆 5 Zaroori Kaagaz Safe! Ab wallet ya file dhoondhne ki chinta hamesha ke liye khatam. Jab bhi zaroorat ho, bas naam likhiye!`;
    }
    return `✨ 1 Hafta Saath: Hamaare saath ko 1 hafta poora ho gaya! Main hamesha 24/7 yahin upasthit hoon aapke zaroori kaagaz aur har baat sambhalne ke liye.`;
  }
};
