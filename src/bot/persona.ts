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
      text: `Namaste / Hello! 🙏✨\n\nMain hoon **DOST 🤖** (stayonchat.com) — aapka digital saathi.\n\nPlease choose your preferred language / Apni bhasha chunein:`,
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
  getWelcomeMessage(userName: string = 'Bhai', language: 'en' | 'hi' | 'hinglish' = 'hinglish'): string {
    if (language === 'hi') {
      return `नमस्ते ${userName}! 🙏✨\n\nमैं हूँ आपका **DOST 🤖** (stayonchat.com) — आपका अपना डिजिटल साथी!\n\nमैं आपकी क्या-क्या मदद कर सकता हूँ:\n📁 *कागज़ व बिल लॉकर:* फोटो या PDF भेजिए, सुरक्षित रखूँगा और मांगने पर सेकंड में लौटा दूँगा।\n⏰ *स्मार्ट रिमाइंडर्स:* किसी भी चीज़ की याद दिलवाने को कहिए (जैसे "कल 10 बजे मम्मी की दवा")।\n🌅 *सुबह 6 बजे ग्रह-नक्षत्र सलाह:* अपनी जन्मतिथि (DOB) बताइए, हर सुबह आपके दिन की खास सलाह दूँगा।\n💬 *सच्चा दोस्त:* कोई भी बात करनी हो या सलाह चाहिए, बेझिझक चैट कीजिए!\n\n_शुरुआत करने के लिए कोई भी फोटो, PDF या मैसेज भेजिए!_ 😊`;
    }

    if (language === 'en') {
      return `Hey ${userName}! 👋✨\n\nI'm **DOST 🤖** (stayonchat.com) — your 24/7 personal WhatsApp companion!\n\nHere is how I make your life effortless:\n📁 *Smart Locker:* Send photos or PDFs (bills, RC, insurance, prescription). I'll keep them safe and return the original files instantly whenever you ask.\n⏰ *Reminders:* Ask me to remind you about anything (e.g. "Remind me to pay bill tomorrow at 10 AM").\n🌅 *Daily 6 AM Life & Astro Guide:* Share your date of birth, and I'll send daily personalized guidance & precautions.\n💬 *Friend on Chat:* Stressed? Need advice? Just talk to me anytime!\n\n_Send any document, photo, or message to get started!_ 😊`;
    }

    // Default: Hinglish
    return `Arre ${userName}, Namaste! 🙏✨\n\nMain hoon tera **DOST 🤖** (stayonchat.com) — aapka apna digital saathi aur all-in-one assistant!\n\nMain aapki kya-kya madad karunga:\n📁 *Kaagaz & Bill Locker:* Koi bhi photo ya PDF bhej do (Bill, RC, Insurance, Parcha). Safe rakhunga aur mangte hi original file wapas bhej dunga!\n⏰ *Smart Reminders:* Kisi bhi cheez ka yaad dilane ko bolo (jaise "Kal subah 10 baje mummy ki dawa").\n🌅 *Subah 6 Baje Daily Astro Guide:* Apni date of birth (DOB) batao, roz subah grah-nakshatra aur safety caution dunga.\n💬 *Dost se Chat:* Koi bhi tension ho ya salah chahiye, bas dil khol ke baat karo!\n\n_Chalo shuruat karein! Koi photo, PDF ya sawaal bhej kar dekho._ 😊`;
  },

  /**
   * Confirmation message when a document / PDF is uploaded and parsed
   */
  getDocSavedMessage(
    doc: ExtractedDoc,
    language: 'en' | 'hi' | 'hinglish' = 'hinglish',
    remainingFreeSlots?: number
  ): string {
    if (language === 'hi') {
      let msg = `✅ *कागज़ सुरक्षित लॉकर में दर्ज हो गया है!* 🤖✨\n\n`;
      msg += `📌 *शीर्षक:* ${doc.title}\n`;
      if (doc.entity_name) msg += `🏢 *दुकान/कंपनी:* ${doc.entity_name}\n`;
      if (doc.policy_or_bill_no) msg += `🔢 *नंबर:* ${doc.policy_or_bill_no}\n`;
      if (doc.amount) msg += `💰 *रकम:* ₹${doc.amount.toLocaleString('en-IN')}\n`;
      if (doc.expiry_date) {
        msg += `⏳ *अंतिम तिथि (Expiry):* **${doc.expiry_date}**\n`;
        msg += `\n⏰ *चिंता मत कीजिए!* अंतिम तिथि से 30, 7 और 1 दिन पहले मैं आपको WhatsApp पर याद दिला दूँगा।`;
      } else {
        msg += `\n📁 *श्रेणी:* ${doc.category.toUpperCase()}\n`;
        msg += `📝 *विवरण:* ${doc.summary}`;
      }
      return msg;
    }

    if (language === 'en') {
      let msg = `✅ *Document safely saved in your DOST Vault!* 🤖✨\n\n`;
      msg += `📌 *Title:* ${doc.title}\n`;
      if (doc.entity_name) msg += `🏢 *Entity:* ${doc.entity_name}\n`;
      if (doc.policy_or_bill_no) msg += `🔢 *ID/No:* ${doc.policy_or_bill_no}\n`;
      if (doc.amount) msg += `💰 *Amount:* ₹${doc.amount.toLocaleString('en-IN')}\n`;
      if (doc.expiry_date) {
        msg += `⏳ *Expiry / Renewal:* **${doc.expiry_date}**\n`;
        msg += `\n⏰ *Locked in!* I will alert you 30, 7, and 1 day before expiry so you never face a fine.`;
      } else {
        msg += `\n📁 *Category:* ${doc.category.toUpperCase()}\n`;
        msg += `📝 *Summary:* ${doc.summary}`;
      }
      return msg;
    }

    // Hinglish
    let msg = `✅ *Bhai, kaagaz ekdum safe save ho gaya!* 🤖✨\n\n`;
    msg += `📌 *Title:* ${doc.title}\n`;
    if (doc.entity_name) msg += `🏢 *Company/Shop:* ${doc.entity_name}\n`;
    if (doc.policy_or_bill_no) msg += `🔢 *No:* ${doc.policy_or_bill_no}\n`;
    if (doc.amount) msg += `💰 *Rakam:* ₹${doc.amount.toLocaleString('en-IN')}\n`;
    if (doc.expiry_date) {
      msg += `⏳ *Expiry / Renewal:* **${doc.expiry_date}**\n`;
      msg += `\n⏰ *Reminder locked!* Expiry se 30, 7 aur 1 din pehle main khud WhatsApp par ping karunga taaki fine na lage.`;
    } else {
      msg += `\n📁 *Folder:* ${doc.category.toUpperCase()}\n`;
      msg += `📝 *Summary:* ${doc.summary}`;
    }

    if (remainingFreeSlots !== undefined && remainingFreeSlots <= 3 && remainingFreeSlots > 0) {
      msg += `\n\nℹ️ _Free Pack mein abhi ${remainingFreeSlots} files ki jagah bachi hai._`;
    }

    return msg;
  },

  /**
   * Search results formatter
   */
  formatSearchResults(
    query: string,
    docs: any[],
    language: 'en' | 'hi' | 'hinglish' = 'hinglish'
  ): string {
    if (docs.length === 0) {
      if (language === 'hi') {
        return `🔍 *DOST:* मुझे "${query}" से मिलता-जुलता कोई कागज़ नहीं मिला भाई। आप "RC", "बिल" या कंपनी का नाम लिखकर ढूँढ सकते हैं।`;
      }
      if (language === 'en') {
        return `🔍 *DOST:* Couldn't find any document matching "${query}". Try searching by vehicle name, brand, or policy type.`;
      }
      return `🔍 *DOST:* Mujhe "${query}" se milta-julta koi kaagaz nahi mila bhai.\n\nAap "RC", "Mixer", "Policy" ya brand ka naam likhein ya nayi photo bhej kar save karein.`;
    }

    if (docs.length === 1) {
      const doc = docs[0];
      let res = `📄 *Aapka Kaagaz Mil Gaya!* 🤖✨\n\n`;
      res += `📌 *${doc.title}*\n`;
      if (doc.entity_name) res += `🏢 ${doc.entity_name}\n`;
      if (doc.policy_or_bill_no) res += `🔢 No: ${doc.policy_or_bill_no}\n`;
      if (doc.expiry_date) res += `⏳ Expiry: ${doc.expiry_date}\n`;
      if (doc.summary) res += `📝 ${doc.summary}\n`;
      return res;
    }

    let res = `🔍 *Aapke ${docs.length} kaagaz mile:* 🤖✨\n\n`;
    docs.forEach((doc, idx) => {
      res += `${idx + 1}. *${doc.title}*\n`;
      if (doc.expiry_date) res += `   ⏳ Expiry: ${doc.expiry_date}\n`;
      if (doc.policy_or_bill_no) res += `   🔢 ${doc.policy_or_bill_no}\n`;
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
    language: 'en' | 'hi' | 'hinglish' = 'hinglish'
  ): string {
    const formattedDate = new Date(remindAtIso).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    if (language === 'hi') {
      return `⏰ *रिमाइंडर सेट हो गया भाई!* 🤖✨\n\n📌 *काम:* ${task}\n⏳ *समय:* ${formattedDate}\n\n_बिल्कुल बेफिक्र रहें, इस समय मैं खुद आपको WhatsApp पर मैसेज कर दूँगा!_`;
    }
    if (language === 'en') {
      return `⏰ *Reminder Locked!* 🤖✨\n\n📌 *Task:* ${task}\n⏳ *When:* ${formattedDate}\n\n_Relax, I'll ping you right here on WhatsApp when the time comes!_`;
    }
    return `⏰ *Reminder pakka ho gaya bhai!* 🤖✨\n\n📌 *Task:* ${task}\n⏳ *Waqt:* ${formattedDate}\n\n_Tu bilkul tension mat le, theek is waqt main tujhe WhatsApp par ping kar dunga!_`;
  },

  /**
   * Confirmation when user shares birth details for 6 AM Daily Astro Guide
   */
  getAstroSavedMessage(
    astro: { dob?: string; tob?: string; pob?: string; rashi?: string },
    language: 'en' | 'hi' | 'hinglish' = 'hinglish'
  ): string {
    if (language === 'hi') {
      return `🌅 *आपकी जन्म जानकारी दर्ज हो गई है!* 🪐✨\n\n📅 *जन्मतिथि (DOB):* ${astro.dob || 'दर्ज'}\n⏰ *समय:* ${astro.tob || 'सामान्य'}\n📍 *स्थान:* ${astro.pob || 'भारत'}\n\nअब हर सुबह **6:00 AM** पर मैं आपको आपके ग्रह-नक्षत्र, शुभ मुहूर्त और दिन की विशेष सावधानी की व्यक्तिगत सलाह WhatsApp पर भेजूँगा! ☀️`;
    }
    if (language === 'en') {
      return `🌅 *Birth Profile Saved!* 🪐✨\n\n📅 *DOB:* ${astro.dob || 'Saved'}\n⏰ *Time:* ${astro.tob || 'Standard'}\n📍 *Place:* ${astro.pob || 'India'}\n\nStarting tomorrow at **6:00 AM**, I'll send your daily personalized planetary guidance, safe driving alerts, and lucky hours! ☀️`;
    }
    return `🌅 *Bhai teri kundali details lock ho gayi!* 🪐✨\n\n📅 *DOB:* ${astro.dob || 'Saved'}\n⏰ *Waqt:* ${astro.tob || 'Normal'}\n📍 *Jagah:* ${astro.pob || 'India'}\n\nAb roz subah **6:00 AM** par main tujhe WhatsApp par bataunga ki aaj ka din kaisa hai, grah kya keh rahe hain aur gaadi chalate ya kaam karte waqt kya savdhani rakhni hai! ☀️`;
  },

  /**
   * List of all active expiries for user
   */
  formatExpiriesList(expiries: any[]): string {
    if (expiries.length === 0) {
      return `✨ *DOST:* Bahut badhiya! Aapke kisi bhi kaagaz ki agle 1 saal mein koi expiry due nahi hai. Aap bilkul tension free rahein!`;
    }

    let msg = `📅 *Aapki Aane Wali Expiries & Renewals:* 🤖✨\n\n`;
    expiries.forEach((item, index) => {
      msg += `${index + 1}. *${item.title}*\n`;
      msg += `   ⏳ Taareekh: *${item.expiry_date}*\n`;
      if (item.policy_or_bill_no) msg += `   🔢 No: ${item.policy_or_bill_no}\n`;
      msg += `\n`;
    });

    msg += `_DOST in sabhi taareekhon par aapko 30, 7 aur 1 din pehle WhatsApp par alert karega._`;
    return msg;
  },

  /**
   * Contextual Upsell: Free 15 files quota exhausted
   */
  getQuotaFullUpsell(userPhone: string): { text: string; buttons: { id: string; title: string }[] } {
    return {
      text: `📦 *Free Pack ki 15 files poori ho chuki hain!*\n\nAapki purani 15 files hamesha surakshit rahengi aur search hoti rahengi.\n\nAur naye documents + saal bhar ke automated WhatsApp reminders ke liye *Yaad Plan* sirf ₹149/saal (mahine ka ₹12.50) mein le sakte hain.`,
      buttons: [
        { id: `upgrade_yaad_149`, title: 'Haan, ₹149 Shuru Karo' },
        { id: 'dismiss_upsell', title: 'Nahi, Baad Mein' },
      ],
    };
  },

  /**
   * Contextual Upsell: Expiry Alert activated
   */
  getExpiryUpsell(userPhone: string, docTitle: string, expiryDate: string): { text: string; buttons: { id: string; title: string }[] } {
    return {
      text: `⏰ *${docTitle}* ki expiry **${expiryDate}** ko hai.\n\nPehla reminder maine aapke liye free mein set kar diya hai.\n\nSaare vehicles, appliances aur policies ke saal bhar WhatsApp alerts ke liye *Yaad Plan* sirf ₹149/saal hai.`,
      buttons: [
        { id: `upgrade_yaad_149`, title: 'Haan, ₹149 Yaad Plan' },
        { id: 'dismiss_upsell', title: 'Nahi, Baad Mein' },
      ],
    };
  },

  /**
   * Contextual Upsell: Family / Nominee / Succession inquiry
   */
  getWarisPathInfo(): string {
    return `🛡️ *WarisPath Kit (Family Protection)*\n\nAapne apne saare zaroori kaagaz to surakshit kar liye.\n\nLekin bhagwan na kare kabhi koi emergency ya unhoni ho, to kya aapki family / nominee ko pata hai ki FD, Insurance aur Property kaise claim karni hai?\n\nIske liye hamari alag **WarisPath Kit** aati hai jo aapke nominee ko step-by-step guidance deti hai bina kisi vakil ke chakkar ke.\n\n_Agar dekhna ho to 'Waris Kit' likhein, warna aapka dost normal chalta rahega._ 🙏`;
  }
};
