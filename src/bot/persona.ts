// =================================================================
// Keepr (usekeepr.com) - Persona, Voice & Human WhatsApp Interface
// Zero-Friction Human Companion, Life Vault & Personal COO
// "Dump anything. Ask anything. Miss nothing."
// =================================================================

import { ExtractedDoc } from '../services/gemini.js';
import { PLANS, BRAND } from '../config/constants.js';

export const personaService = {
  /**
   * 4-Line Zero-Friction Human Greeting (NO brochures, NO IVR menus)
   */
  getHumanGreeting(userName: string = 'Dhruv'): string {
    return `Main Keepr hoon. Jo rakhna hai bhej do — photo, PDF, voice note.\nYaad rakhna hai to likh do. Nikalna ho to pooch lo.\n\nJaise: "beti school fee 12 Sept 18400" ya "kal shaam papa ki dawai"`;
  },

  /**
   * Backward compatible greeting
   */
  getLanguageSelectionMessage(): string {
    return this.getHumanGreeting();
  },

  getIntroMessage(userName: string = 'Dhruv', language: string = 'hinglish'): string {
    return this.getHumanGreeting(userName);
  },

  getWelcomeMessage(userName: string = 'Dhruv', language: string = 'hinglish'): string {
    return this.getHumanGreeting(userName);
  },

  getPhotoNamingPrompt(userName: string = 'Dhruv'): string {
    return `📸 Photo save ho gayi ✅\n\nIse kis naam se yaad rakhna hai? (Jaise: "Ghar ki Registry" ya "Vacation Photo") taaki maangte hi nikaal doon.`;
  },

  getMenuMessage(userName: string = 'Dhruv'): { text: string; buttons: { id: string; title: string }[] } {
    return {
      text: `Main Keepr hoon. Jo rakhna hai bhej do, nikalna ho to pooch lo.\n\nNiche ke options se bhi dekh sakte hain:`,
      buttons: [
        { id: 'btn_my_docs', title: '📁 Mere Kaagaz' },
        { id: 'btn_my_reminders', title: '⏰ Reminders' },
        { id: 'btn_my_numerology', title: '🌅 Daily Brief' },
        { id: 'btn_plans', title: `📋 Plans` },
      ],
    };
  },

  /**
   * Crisp Human Receipts for Saved Documents
   */
  getDocSavedMessage(
    doc: ExtractedDoc,
    language: string = 'hinglish',
    remainingFreeSlots?: number
  ): string {
    // 1. Honest Failure & Blur Handling
    if (doc.is_uncertain) {
      return doc.clarification_prompt || `Photo thodi blur lag rahi hai. Amount ya date clearly nahi dikh rahi — ek aur saaf photo bhej doge?`;
    }

    // 2. Vehicle (RC / Insurance / PUC)
    if (doc.category === 'vehicle' || doc.category === 'money_assets' && doc.vehicle_number) {
      const reg = doc.vehicle_number ? `• Reg: ${doc.vehicle_number}` : '';
      const exp = doc.expiry_date ? `• Expiry: ${doc.expiry_date} (Reminder locked)` : '';
      return `🚗 ${doc.title} save ho gayi ✅\n${reg}\n${exp}\n\nJab bhi zaroorat ho, bas likhna "${doc.vehicle_number || 'car rc'}" — turant original file wapas bhej dunga.`;
    }

    // 3. School / Kids / Family
    if (doc.category === 'family_school') {
      const amt = doc.amount ? `• Rakam: ₹${doc.amount.toLocaleString('en-IN')}` : '';
      const due = doc.expiry_date ? `• Due Date: ${doc.expiry_date}` : '';
      return `🏫 ${doc.title} save ho gayi ✅\n${amt}\n${due}\n\n${doc.action_proposed || 'Due date se pehle WhatsApp par reminder bhej dunga!'}`;
    }

    // 4. Health / Doctor Prescription / Medicine
    if (doc.category === 'health_medicine' || doc.category === 'medical') {
      let medsList = '';
      if (doc.medicines && doc.medicines.length > 0) {
        medsList = doc.medicines.map(m => `• ${m.name} (${m.dosage || ''} - ${m.timing || ''} ${m.relation_to_food || ''})`).join('\n');
      }
      return `💊 ${doc.title} save ho gaya ✅\n${medsList ? `${medsList}\n` : ''}${doc.expiry_date ? `• Next Follow-up: ${doc.expiry_date}\n` : ''}Dawaiyon ki timing yaad rakhunga. Kisi specific waqt par reminder lagana hai?`;
    }

    // 5. Appliance Bill / Warranty
    if (doc.category === 'appliance') {
      const exp = doc.expiry_date ? `• Warranty till: ${doc.expiry_date}` : '';
      return `🔌 ${doc.title} save ho gaya ✅\n${exp}\nKharab hone par dhoondhna nahi padega — mangte hi original bill wapas mil jayega.`;
    }

    // 6. General / Bills / Notes
    const amt = doc.amount ? `• Rakam: ₹${doc.amount.toLocaleString('en-IN')}\n` : '';
    const exp = doc.expiry_date ? `• Expiry/Due: ${doc.expiry_date} (Reminder set)\n` : '';
    return `📄 ${doc.title} save ho gaya ✅\n${amt}${exp}Vault mein surakshit darj hai.`;
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
