// =================================================================
// MunshiJi (stayonchat.com) - Persona, Voice & Response Formatter
// Aladdin's Jinn & Loyal Family Munshi Tone
// =================================================================

import { ExtractedDoc } from '../services/gemini.js';
import { PLANS } from '../config/constants.js';

export const personaService = {
  /**
   * Warm, instant welcome greeting for a first-time user
   */
  getWelcomeMessage(userName: string = 'Bhaiya'): string {
    return `Pranam ${userName}! 🙏\n\nMain hoon **MunshiJi 🧞‍♂️** — aapka digital munshi aur personal assistant (stayonchat.com).\n\nAapka koi bhi zaroori kaagaz ho —\n📄 Bill ya Warranty Card\n🚗 Bike/Car RC, PUC ya Insurance\n💊 Doctor ka parcha ya test report\n🛡️ LIC / Health Policy\n\nBas yahan **Photo, PDF ya Voice Note** bhej dijiye. Main use surakshit save rakhunga aur expiry se pehle khud yaad dilaunga!\n\n_Ek file bhej kar dekhein?_ ✨`;
  },

  /**
   * Confirmation message when a document is uploaded and parsed
   */
  getDocSavedMessage(doc: ExtractedDoc, remainingFreeSlots?: number): string {
    let msg = `✅ *Hukum, kaagaz darj kar liya gaya hai!* 🧞‍♂️\n\n`;
    msg += `📌 *Title:* ${doc.title}\n`;
    if (doc.entity_name) msg += `🏢 *Company/Shop:* ${doc.entity_name}\n`;
    if (doc.policy_or_bill_no) msg += `🔢 *No:* ${doc.policy_or_bill_no}\n`;
    if (doc.amount) msg += `💰 *Rakam:* ₹${doc.amount.toLocaleString('en-IN')}\n`;
    
    if (doc.expiry_date) {
      msg += `⏳ *Expiry / Renewal:* **${doc.expiry_date}**\n`;
      msg += `\n⏰ *Maine iska reminder lock kar diya hai.* Expiry se 30, 7 aur 1 din pehle main aapko WhatsApp par alert bhej dunga taaki kisi fine ya nuksaan se bacha ja sake.`;
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
  formatSearchResults(query: string, docs: any[]): string {
    if (docs.length === 0) {
      return `🔍 *MunshiJi:* Mujhe "${query}" se milta-julta koi kaagaz nahi mila bhaiya.\n\nAap "RC", "Mixer", "Policy" ya brand ka naam likh kar try karein, ya nayi photo bhej kar save karein.`;
    }

    if (docs.length === 1) {
      const doc = docs[0];
      let res = `📄 *Aapka Kaagaz Mil Gaya!* 🧞‍♂️\n\n`;
      res += `📌 *${doc.title}*\n`;
      if (doc.entity_name) res += `🏢 ${doc.entity_name}\n`;
      if (doc.policy_or_bill_no) res += `🔢 No: ${doc.policy_or_bill_no}\n`;
      if (doc.expiry_date) res += `⏳ Expiry: ${doc.expiry_date}\n`;
      if (doc.summary) res += `📝 ${doc.summary}\n`;
      return res;
    }

    let res = `🔍 *Aapke ${docs.length} kaagaz mile:* 🧞‍♂️\n\n`;
    docs.forEach((doc, idx) => {
      res += `${idx + 1}. *${doc.title}*\n`;
      if (doc.expiry_date) res += `   ⏳ Expiry: ${doc.expiry_date}\n`;
      if (doc.policy_or_bill_no) res += `   🔢 ${doc.policy_or_bill_no}\n`;
    });
    res += `\nKisi ek ka poora parcha dekhne ke liye uska naam likhein (jaise "${docs[0].title}").`;
    return res;
  },

  /**
   * List of all active expiries for user
   */
  formatExpiriesList(expiries: any[]): string {
    if (expiries.length === 0) {
      return `✨ *MunshiJi:* Bahut badhiya! Aapke kisi bhi kaagaz ki agle 1 saal mein koi expiry due nahi hai. Aap bilkul tension free rahein!`;
    }

    let msg = `📅 *Aapki Aane Wali Expiries & Renewals:* 🧞‍♂️\n\n`;
    expiries.forEach((item, index) => {
      msg += `${index + 1}. *${item.title}*\n`;
      msg += `   ⏳ Taareekh: *${item.expiry_date}*\n`;
      if (item.policy_or_bill_no) msg += `   🔢 No: ${item.policy_or_bill_no}\n`;
      msg += `\n`;
    });

    msg += `_MunshiJi in sabhi taareekhon par aapko 30, 7 aur 1 din pehle WhatsApp par alert karega._`;
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
    return `🛡️ *WarisPath Kit (Family Protection)*\n\nAapne apne saare zaroori kaagaz to surakshit kar liye.\n\nLekin bhagwan na kare kabhi koi emergency ya unhoni ho, to kya aapki family / nominee ko pata hai ki FD, Insurance aur Property kaise claim karni hai?\n\nIske liye hamara alag **WarisPath Kit** aati hai jo aapke nominee ko step-by-step guidance deti hai bina kisi vakil ke chakkar ke.\n\n_Agar dekhna ho to 'Waris Kit' likhein, warna aapka locker normal chalta rahega._ 🙏`;
  }
};
