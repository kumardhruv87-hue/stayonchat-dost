// =================================================================
// Keepr (usekeepr.com) - Gemini Flash AI Document Extraction Engine
// Vision OCR, Handwritten parsing, Audio Voice note transcription
// =================================================================

import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import { z } from 'zod';
import { BRAND } from '../config/constants.js';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY || 'placeholder_key';
const genAI = new GoogleGenerativeAI(apiKey);

// Strict Zod schema for extracted document metadata (6 Life Packs)
export const ExtractedDocSchema = z.object({
  category: z.enum([
    'identity',
    'family_school',
    'health_medicine',
    'money_assets',
    'promises_tasks',
    'quick_notes',
    'vehicle',
    'appliance',
    'insurance',
    'medical',
    'property',
    'finance',
    'general',
  ]).default('general'),
  title: z.string().describe('Clear, concise name of the document, e.g. "Havells Mixer Grinder Bill", "Swift Dzire RC", "DPS School Fee Slip", "Dr Mehta Prescription"'),
  entity_name: z.string().nullable().optional().describe('Brand, company, school, hospital, vehicle model, doctor or insurer name'),
  policy_or_bill_no: z.string().nullable().optional().describe('Invoice number, policy number, registration number, or prescription ID'),
  amount: z.number().nullable().optional().describe('Total amount in INR if mentioned'),
  issue_date: z.string().nullable().optional().describe('Date of issuance or purchase in YYYY-MM-DD format'),
  expiry_date: z.string().nullable().optional().describe('Expiry date, renewal date, fee due date, warranty end date, or next follow-up in YYYY-MM-DD format'),
  dob: z.string().nullable().optional().describe('Date of birth in YYYY-MM-DD or DD/MM/YYYY format if this is an ID card or medical record'),
  vehicle_number: z.string().nullable().optional().describe('Vehicle registration plate number (e.g. DL01AB1234, UP16CD5678) if this is an RC, PUC, or vehicle insurance'),
  person: z.string().nullable().optional().describe('Person or family member associated, e.g. "Papa", "Mummy", "Beti", "Self", or specific name'),
  medicines: z.array(z.object({
    name: z.string(),
    dosage: z.string().optional(),
    timing: z.string().optional(),
    relation_to_food: z.string().optional(),
  })).nullable().optional().describe('Prescribed medicines with dosages and timings if this is a doctor prescription'),
  is_uncertain: z.boolean().default(false).describe('True if the image is blurry, poorly lit, cut off, or critical amounts/dates are ambiguous'),
  clarification_prompt: z.string().nullable().optional().describe('Honest question in simple Hinglish if photo is unclear or amount is ambiguous'),
  action_proposed: z.string().nullable().optional().describe('Actionable reminder proposal, e.g. "Reminder 10 Sept subah 9 baje laga doon?"'),
  summary: z.string().describe('One single line crisp summary in simple Hinglish / English'),
  tags: z.array(z.string()).describe('3 to 5 searchable keywords in lowercase, e.g. ["rc", "swift", "vehicle", "dl8c"]'),
  confidence_score: z.number().min(0).max(1).default(0.9),
});

export type ExtractedDoc = z.infer<typeof ExtractedDocSchema>;

export const geminiService = {
  /**
   * Extract metadata from image, PDF, or document scan using Gemini Flash Vision
   */
  async extractDocumentMetadata(
    fileBuffer: Buffer,
    mimeType: string,
    userNotes?: string
  ): Promise<ExtractedDoc> {
    const model = genAI.getGenerativeModel({
      model: 'gemini-3.6-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.1, // Low temperature for high extraction accuracy
      },
    });

    const prompt = `
You are the document intelligence engine for "${BRAND.displayName}", a bank-grade trusted personal digital vault and life COO.
Your job is to read images, scanned PDFs, bills, warranty cards, vehicle papers, insurance policies, school fee receipts, or handwritten doctor prescriptions and extract structured metadata into one of our 6 Life Packs.

IMPORTANT RULES FOR INDIAN LIFE OBJECTS:
1. Honesty & Blur Detection (CRUCIAL):
   - If the image is blurry, handwritten text is illegible, numbers are cut off, or you are <80% confident about key amounts/dates:
     Set "is_uncertain": true, and provide a polite, honest "clarification_prompt" in Hinglish (e.g. "Photo thodi blur hai. Amount ~₹18,400 dikh raha hai — yehi maanun ya close-up bhejoge?").
   - NEVER invent or hallucinate dates, policy numbers, or amounts. If not clearly visible, set to null.

2. Dates & Expiry Calculations:
   - For School Fees: Expiry_date is the "Due Date" or "Last date of payment".
   - For Vehicle RC: RC validity is typically 15 years from registration date.
   - For PUC / Pollution: 6 months or 1 year from test date.
   - For Insurance: Policy end / renewal date.
   - For Doctor Prescriptions: Calculate expiry_date as follow-up date (e.g. "Review after 15 days").
   - For Warranties: Calculate expiry_date = issue_date + warranty period.
   - All dates strictly YYYY-MM-DD.

3. Health & Doctor Prescriptions:
   - Identify the patient/person if mentioned ("Papa", "Mummy", kid's name).
   - Extract prescribed medicines into the "medicines" list with name, dosage (e.g. "40mg", "1 tablet"), timing ("morning", "dinner", "twice daily"), and relation_to_food ("after food", "empty stomach").

4. Category classification:
   - "identity": Aadhaar, PAN, Voter card, Passport, Driving License
   - "family_school": School fee slip, tuition receipt, report card, vaccine chart, school ID
   - "health_medicine": Doctor prescription, lab blood test, hospital discharge summary, medical bill
   - "money_assets": Car/bike RC, insurance policy, PUC, electricity bill, gas bill, rent agreement, appliance warranty
   - "promises_tasks": Forwarded chat commitments, task slips, invoices
   - "quick_notes": Passwords, account details, rough notes
   (Legacy categories 'vehicle', 'appliance', 'insurance', 'medical', 'property', 'finance', 'general' are also valid)

5. Proposed Action:
   - Suggest a crisp proactive next step in "action_proposed" (e.g. "10 Sept ko reminder laga doon?", "PUC renew karwane ka alert set karun?").

User provided extra message/context: ${userNotes ? `"${userNotes}"` : 'None'}

Return a JSON object conforming strictly to this schema:
{
  "category": "identity" | "family_school" | "health_medicine" | "money_assets" | "promises_tasks" | "quick_notes" | "vehicle" | "appliance" | "insurance" | "medical" | "property" | "finance" | "general",
  "title": "Clear concise title",
  "entity_name": "School / Company / Doctor / Shop name or null",
  "policy_or_bill_no": "Policy, bill, or reg number or null",
  "amount": number or null,
  "issue_date": "YYYY-MM-DD" or null,
  "expiry_date": "YYYY-MM-DD" or null,
  "dob": "YYYY-MM-DD" or null,
  "vehicle_number": "Registration number string or null",
  "person": "Family member/person or null",
  "medicines": [{"name": "Medicine name", "dosage": "5mg", "timing": "night", "relation_to_food": "after dinner"}] or null,
  "is_uncertain": false,
  "clarification_prompt": null,
  "action_proposed": "1-line prompt or null",
  "summary": "1 single line summary in Hinglish",
  "tags": ["tag1", "tag2", "tag3"],
  "confidence_score": 0.0 to 1.0
}
`;

    const imagePart = {
      inlineData: {
        data: fileBuffer.toString('base64'),
        mimeType: mimeType === 'application/pdf' ? 'application/pdf' : mimeType,
      },
    };

    const result = await model.generateContent([prompt, imagePart]);
    const responseText = result.response.text();

    try {
      const parsed = JSON.parse(responseText);
      return ExtractedDocSchema.parse(parsed);
    } catch (parseErr) {
      console.error('Error parsing Gemini extraction JSON:', parseErr, 'Raw response:', responseText);
      return {
        category: 'general',
        title: userNotes ? userNotes.substring(0, 50) : 'Zaroori Kaagaz',
        entity_name: null,
        policy_or_bill_no: null,
        amount: null,
        issue_date: null,
        expiry_date: null,
        person: null,
        medicines: null,
        is_uncertain: false,
        clarification_prompt: null,
        action_proposed: null,
        summary: 'Kaagaz successfully save kar liya gaya hai.',
        tags: ['document', 'kaagaz'],
        confidence_score: 0.5,
      };
    }
  },

  /**
   * Transcribe and understand WhatsApp Voice Notes (.ogg / .opus)
   */
  async processVoiceNote(audioBuffer: Buffer, mimeType: string): Promise<{ transcript: string; intent: string; query: string }> {
    const model = genAI.getGenerativeModel({
      model: 'gemini-3.6-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
    });

    const prompt = `
You are the voice assistant for "${BRAND.displayName}".
The user has sent a WhatsApp voice message in Hindi / Hinglish / English.
Transcribe the voice message accurately and determine the user's intent.

Intent categories:
- "search": User is asking to retrieve a document (e.g. "Mera car insurance bhej do", "Havells ka bill dikhana", "RC kahan hai?")
- "expiry_check": User is asking about dates (e.g. "Meri policy kab expire ho rahi hai?", "Konse papers renew karne hain?")
- "save_doc": User is speaking while or before uploading a paper (e.g. "Ye mixer ka bill save karlo")
- "help": General questions or greeting (e.g. "Kaise use karein?", "Tu kya karta hai?")

Return JSON:
{
  "transcript": "Exact transcription of spoken words in Hinglish/English",
  "intent": "search" | "expiry_check" | "save_doc" | "help",
  "query": "Clean keyword to search in documents, e.g. 'car insurance' or 'mixer'"
}
`;

    const audioPart = {
      inlineData: {
        data: audioBuffer.toString('base64'),
        mimeType: mimeType.includes('ogg') || mimeType.includes('opus') ? 'audio/ogg' : mimeType,
      },
    };

    const result = await model.generateContent([prompt, audioPart]);
    const responseText = result.response.text();

    try {
      return JSON.parse(responseText);
    } catch {
      return {
        transcript: '',
        intent: 'search',
        query: '',
      };
    }
  },

  /**
   * Conversational Watchdog: "RoasSiren Executive AI"
   * Elite, street-smart D2C growth engineer & autonomous ad waste watchdog
   */
  async chatAsWatchdog(
    userMessage: string,
    history: Array<{ role: string; text: string }> = [],
    language: string = 'english',
    userName: string = 'Founder'
  ): Promise<string> {
    try {
      const model = genAI.getGenerativeModel({
        model: 'gemini-3.6-flash',
        generationConfig: {
          temperature: 0.6,
        },
      });

      const langInstruction =
        language === 'hi' || language === 'hindi'
          ? 'शुद्ध, व्यावहारिक और सम्मानजनक हिंदी में बात करें। सदा "आप", "आपका", "आपको" का प्रयोग करें।'
          : language === 'hinglish'
          ? 'Hinglish mein baat karein, respectful aur business-savvy tone ke saath ("Aap", "Aapka", "Aapke").'
          : 'Speak in crisp, elite, authoritative, and helpful English. If the user writes in Hindi or Hinglish, mirror their language seamlessly.';

      // Build conversation history context
      let historySection = '';
      if (history && history.length > 0) {
        historySection = `RECENT CONVERSATION HISTORY:\n` +
          history.map(h => `${h.role === 'user' ? userName : 'RoasSiren'}: "${h.text}"`).join('\n') +
          `\n(Maintain seamless context and recall previous links, brands, or questions discussed)\n\n`;
      }

      const prompt = `
You are "RoasSiren™ 🚨" — the Autonomous Meta Ad Waste & Quick Commerce Inventory Watchdog for Shopify & D2C brands.
You are conversing with ${userName} (Founder / Media Buyer / Performance Marketer).

CORE MISSION:
Stop performance marketers and D2C brands from burning ad spend when inventory sells out at midnight or ad destination URLs 404.

KEY VALUE PROPOSITIONS & CAPABILITIES:
1. 24/7 Autonomous Radar: Continuously sweeps Shopify product pages, variants, and Blinkit dark stores.
2. 60-Second WhatsApp Emergency Sirens: Dispatches high-urgency WhatsApp sirens to the buyer within 60 seconds of a stockout.
3. Automated Meta Ad Set Auto-Kill: Automatically pauses active Meta ad sets via Marketing API when inventory hits zero.
4. Daily ROAS Digest: Sends an 8:30 AM IST executive summary of protected ad budget and inventory health.
5. Client Transparency Portal: Instant shareable link for agency clients showing real-time spend protection.
6. Available Commands:
   - Paste any Shopify or Blinkit URL to run an instant stock & ad waste audit.
   - \`audit <domain>\` (e.g. \`audit snitch.co.in\`) to scan an entire store catalog.
   - \`monitor <url>\` to lock 24/7 siren protection on an ad landing page.
   - \`list\` to view locked SKUs.
   - \`test\` to receive a sample WhatsApp emergency siren.
   - \`pricing\` or \`plan\` to view B2B subscription plans (Starter ₹1,999/mo, Growth ₹4,999/mo, Agency ₹9,999/mo).

STRICT COMPLIANCE RULES:
1. TONE: High conviction, crisp, street-smart D2C growth engineer & watchdog. Direct, practical, zero corporate fluff.
2. RESPECT: Always address the user politely ("Aap", "Aapka", "Founder"). NEVER use cheap street slang like "tu" or "tera".
3. NO LEGACY ARTIFACTS: NEVER EVER mention astrology, kundli, numerology, vehicle RC, challan, driving license, personal family document lockers, or MunshiJi/Keepr. You are 100% RoasSiren B2B SaaS.
4. WRITING STYLE: Keep answers concise (2-3 short, impactful paragraphs max). Use bullet points (•) when listing steps or commands. ${langInstruction}

${historySection}USER MESSAGE: "${userMessage}"
`;

      const result = await model.generateContent(prompt);
      return result.response.text().trim();
    } catch (err: any) {
      console.error('Error in chatAsWatchdog:', err);
      if (language === 'hi') {
        return '🚨 नमस्ते! नेटवर्क धीमा है, पर आपका RoasSiren वॉचडॉग 24/7 सक्रिय है। किसी भी प्रॉडक्ट का स्टॉक स्कैन करने के लिए उसका URL भेजें या `monitor <url>` लिखें।';
      }
      return '🚨 Hello! Network had a quick blip, but RoasSiren is active 24/7. Paste any Shopify/Blinkit URL to scan for stockouts or type `menu` / `help`.';
    }
  },

  /**
   * Alias for backward compatibility
   */
  async chatAsDost(
    userMessage: string,
    history: Array<{ role: string; text: string }> = [],
    language: string = 'english',
    userName: string = 'Founder',
    _numerologyContext?: string
  ): Promise<string> {
    return this.chatAsWatchdog(userMessage, history, language, userName);
  },

  /**
   * Detect and parse natural language reminders (e.g. "Kal subah 10 baje mummy ko BP ki dawa deni hai")
   */
  async parseNaturalReminder(
    text: string,
    currentIsoTime: string = new Date().toISOString()
  ): Promise<{ isReminder: boolean; task?: string; remindAtIso?: string; replyText?: string }> {
    try {
      const model = genAI.getGenerativeModel({
        model: 'gemini-3.6-flash',
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      });

      const prompt = `
Analyze this text to see if the user is asking to set a reminder or alarm:
Current reference time (IST/UTC): ${currentIsoTime}
User Text: "${text}"

If the user wants a reminder (e.g. "kal subah 9 baje car service", "remind me to pay bill on 15th", "dawai ka yaad dila dena at 8pm"):
Return JSON:
{
  "isReminder": true,
  "task": "Clean description of the reminder task in Hinglish/English",
  "remindAtIso": "ISO 8601 timestamp (YYYY-MM-DDTHH:mm:ss) when the reminder should fire in Indian Standard Time (UTC+5:30)",
  "replyText": "Warm confirmation message in Hinglish saying reminder is locked"
}

If NOT a reminder request (just normal chat, search, or document query):
Return JSON:
{
  "isReminder": false
}
`;

      const result = await model.generateContent(prompt);
      return JSON.parse(result.response.text());
    } catch (err) {
      console.error('Error in parseNaturalReminder:', err);
      return { isReminder: false };
    }
  },

  /**
   * Parse user's birth details for Astro / Kundali profile (DOB, Time of Birth, Place of Birth)
   */
  async parseAstroProfile(
    text: string
  ): Promise<{ hasAstroData: boolean; dob?: string; tob?: string; pob?: string; rashi?: string; summary?: string }> {
    try {
      const model = genAI.getGenerativeModel({
        model: 'gemini-3.6-flash',
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      });

      const prompt = `
Analyze if the user is sharing their birth details (Date of Birth, Time of Birth, Place of Birth, or Rashi/Zodiac):
User Text: "${text}"

If they are sharing birth details:
Return JSON:
{
  "hasAstroData": true,
  "dob": "YYYY-MM-DD" or null,
  "tob": "HH:MM AM/PM" or null,
  "pob": "City/State/Place" or null,
  "rashi": "Vedic moon sign or western sun sign if mentioned/inferred" or null,
  "summary": "Brief 1-line friendly acknowledgment in Hinglish"
}

If NOT sharing birth details:
Return JSON:
{
  "hasAstroData": false
}
`;

      const result = await model.generateContent(prompt);
      return JSON.parse(result.response.text());
    } catch (err) {
      console.error('Error in parseAstroProfile:', err);
      return { hasAstroData: false };
    }
  },

  /**
   * Detect custom language if user types "marathi", "bengali", "gujarati", "tamil", etc.
   */
  async detectCustomLanguage(text: string): Promise<string | null> {
    const cleaned = text.trim().toLowerCase();
    const commonLangs: Record<string, string> = {
      marathi: 'Marathi',
      'marathi mein': 'Marathi',
      'in marathi': 'Marathi',
      bengali: 'Bengali',
      bangla: 'Bengali',
      'bengali mein': 'Bengali',
      'in bengali': 'Bengali',
      gujarati: 'Gujarati',
      gujrati: 'Gujarati',
      'gujarati mein': 'Gujarati',
      'in gujarati': 'Gujarati',
      punjabi: 'Punjabi',
      'punjabi mein': 'Punjabi',
      tamil: 'Tamil',
      'tamil mein': 'Tamil',
      'in tamil': 'Tamil',
      telugu: 'Telugu',
      'telugu mein': 'Telugu',
      'in telugu': 'Telugu',
      kannada: 'Kannada',
      'kannada mein': 'Kannada',
      malayalam: 'Malayalam',
      'malayalam mein': 'Malayalam',
      urdu: 'Urdu',
      'urdu mein': 'Urdu',
      odia: 'Odia',
      assamese: 'Assamese',
      bhojpuri: 'Bhojpuri',
      marwari: 'Marwari',
    };

    if (commonLangs[cleaned]) {
      return commonLangs[cleaned];
    }

    // Only invoke LLM if message looks like a language switch request
    const hasLangKeywords = /\b(language|bhasha|speak in|talk in|mein baat|boli|bhasha badlo)\b/i.test(text);
    if (!hasLangKeywords && text.split(/\s+/).length > 4) {
      return null;
    }

    try {
      const model = genAI.getGenerativeModel({
        model: 'gemini-3.6-flash',
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      });

      const prompt = `
Did the user just ask to switch to a specific language in this message?
Text: "${text}"

If they mentioned a language name (like "talk in Marathi", "Tamil please", "Bengali mein baat karo", "Spanish", etc.):
Return JSON:
{ "isLanguageRequest": true, "languageName": "English name of the language e.g. Marathi, Tamil, Bengali" }

Else:
Return JSON:
{ "isLanguageRequest": false }
`;

      const res = await model.generateContent(prompt);
      const data = JSON.parse(res.response.text());
      if (data.isLanguageRequest && data.languageName) {
        return data.languageName;
      }
      return null;
    } catch {
      return null;
    }
  },

  /**
   * Generate Daily 6:00 AM Universal Numerology & Life Guidance (अंक ज्योतिष विशेषज्ञ)
   * 100% Neutral & Inclusive for all faiths (Hindu, Muslim, Sikh, Christian, Jain)
   */
  async generateDailyNumerologyGuide(
    profile: { name?: string; dob?: string; carNumber?: string; mobile?: string },
    language: string = 'hinglish'
  ): Promise<string> {
    try {
      const model = genAI.getGenerativeModel({
        model: 'gemini-3.6-flash',
        generationConfig: {
          temperature: 0.7,
        },
      });

      const today = new Date();
      const todayDate = today.toLocaleDateString('en-IN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      const dayDigit = ((today.getDate() - 1) % 9) + 1;

      const prompt = `
You are "${BRAND.displayName}" — a deeply respectful, cultured companion and expert Ank Jyotish Visheshagya (अंक ज्योतिष विशेषज्ञ / Universal Numerology Specialist).
Today's Date: ${todayDate} (Day Vibration Number: ${dayDigit})
User: ${profile.name || 'Bhai Sahab'}, DOB: ${profile.dob || 'Not specified'}, Vehicle: ${profile.carNumber || 'Not specified'}.
Preferred Language: ${language}

UNIVERSAL NUMEROLOGY & LIFE GUIDELINES (ALL FAITHS):
1. Warm, respectful morning greeting ("Namaste / Good morning / Khush Raho / Salaam / Sat Sri Akal").
2. Today's Date Vibration (अंक ऊर्जा): Brief practical explanation of today's date vibration (e.g. Day number ${dayDigit} favors focus, commerce, harmony, or perseverance).
3. Practical Life & Safety Check:
   - Road & Driving Alert (e.g. rush-hour vigilance, patience, caution).
   - Financial & Work Caution (e.g. double-checking accounts, avoiding impulsive decisions).
4. Best Focus Hours: Suggest optimal productive window (e.g. 10:00 AM – 1:00 PM).
5. Lucky Color of the Day & Encouraging Signoff from DOST.
6. Tone: ALWAYS use "Aap", "Aapka", "Aapko". NEVER use "tu", "tera", "abe", "arre". Keep under 140 words.
7. Clean typography: NEVER use spam asterisks (* or **). Write cleanly and naturally.
`;

      const result = await model.generateContent(prompt);
      return result.response.text().trim();
    } catch (err: any) {
      console.error('Error in generateDailyNumerologyGuide:', err);
      return `🌅 Good Morning ${profile.name || 'Bhai Sahab'}! ✨\n\nAaj ka din aapke liye nayi sakaratmak urja lekar aaya hai. Sadak par driving sambhal kar kijiye aur dimaag shaant rakhein. Koi bhi zaroori kaagaz ya reminder ho toh mujhe bhej dijiye! Have a wonderful day! ☀️`;
    }
  },

  // Backwards compatible alias
  async generateDailyAstroGuide(profile: any, language: string = 'hinglish') {
    return this.generateDailyNumerologyGuide(profile, language);
  },

  /**
   * Extract Structured Life Memory or Promise from Casual Text / Forwarded WhatsApp Chats
   * (e.g. "Bhai quote kal shaam 5 baje tak bhej dunga", "Ghar ka WiFi password Airtel@123", "Papa BP dawa Telma 40")
   */
  async extractFactOrPromise(
    text: string,
    currentIsoTime: string = new Date().toISOString()
  ): Promise<{
    isFactOrPromise: boolean;
    category?: 'health' | 'family' | 'finance' | 'home' | 'promise' | 'note' | 'general';
    person?: string;
    keyFact?: string;
    dueDate?: string;
    amount?: number;
    replyReceipt?: string;
  }> {
    try {
      const model = genAI.getGenerativeModel({
        model: 'gemini-3.6-flash',
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      });

      const prompt = `
Analyze if this text or forwarded WhatsApp chat contains an actionable promise, medical fact, family note, WiFi/account detail, or crucial life fact to remember:
Current time: ${currentIsoTime}
User Text: "${text}"

Life Fact Categories:
- "promise": A commitment made to someone or owed by someone (e.g. "Quote kal bhejunga", "Sharma ji ko ₹10k dene hain", "I will send file by Tuesday")
- "health": Family medicine, dosage, timing, health allergy, doctor note (e.g. "Papa ki BP dawa Telma 40 dinner ke baad")
- "family": Kids school, fee, tuition, PTM, vaccine (e.g. "Beti ki school fee 18400 due 12 Sept")
- "home": WiFi password, appliance note, repair guy number, maid timing
- "finance": EMI, bill, bank account, IFSC, UPI ID, rent
- "note": General fact or important detail to recall later

If it contains a life fact or promise:
Return JSON:
{
  "isFactOrPromise": true,
  "category": "health" | "family" | "finance" | "home" | "promise" | "note" | "general",
  "person": "Person involved (e.g. Papa, Mummy, Beti, Sharma ji, Client) or null",
  "keyFact": "Concise clean summary of the fact/promise in 1 line",
  "dueDate": "YYYY-MM-DD or null if a deadline exists",
  "amount": number or null,
  "replyReceipt": "Crisp 1-line human receipt confirming what was saved. MATCH THE LANGUAGE OF USER'S TEXT: If user text is in English, reply in English (e.g. 'Saved ✅ WiFi password noted.' or 'Saved ✅ ₹10,000 to Sharma by 15 Sept. Remind you on 14 Sept?'). If Hinglish, reply in Hinglish. If Hindi, reply in Hindi."
}

If it is just casual greeting, general chat, or inquiry:
Return JSON:
{
  "isFactOrPromise": false
}
`;

      const result = await model.generateContent(prompt);
      return JSON.parse(result.response.text());
    } catch (err) {
      console.error('Error in extractFactOrPromise:', err);
      return { isFactOrPromise: false };
    }
  },

  /**
   * Unified 7:00 AM Morning COO Briefing Engine
   * Combines Today's Expiries + Medicine Timings + Promises + Road Safety Alert into 1 clean card
   */
  async generateUnifiedDailyBrief(
    userName: string = 'Friend',
    memories: any[] = [],
    upcomingDocs: any[] = [],
    reminders: any[] = [],
    language: string = 'english',
    numerologyContext?: string
  ): Promise<string> {
    try {
      const model = genAI.getGenerativeModel({
        model: 'gemini-3.6-flash',
        generationConfig: {
          temperature: 0.5,
        },
      });

      const todayStr = new Date().toLocaleDateString('en-IN', {
        weekday: 'long',
        day: 'numeric',
        month: 'short',
      });

      const prompt = `
You are "${BRAND.displayName}" — the personal life COO on WhatsApp.
Create the single unified 7:00 AM morning brief for ${userName}.
Today is ${todayStr}.
Language preference: ${language} (If "english", write in clean English; if "hinglish", write in natural Hinglish; if "hi", write in Hindi).

Active Data:
- Upcoming/Due Document Expiries & Bills: ${JSON.stringify(upcomingDocs.map(d => ({ title: d.title, date: d.expiry_date, amount: d.amount })))}
- Active Reminders/Tasks for today: ${JSON.stringify(reminders.map(r => ({ task: r.task, time: r.remind_at })))}
- Stored Family & Health Memories (e.g. medicines, promises): ${JSON.stringify(memories.map(m => m.key_fact))}
- Road Safety Context: ${numerologyContext || 'Drive carefully and stay alert during rush hour.'}

MANDATORY RULES:
1. Short & crisp (NO long essays, max 4-6 bullet points).
2. Format:
   ☀️ Keepr Morning Brief (7:00 AM) — ${todayStr}

   1. 🚗 Vehicle/Bills: [Car/Insurance/PUC or bill due soon]
   2. 💊 Health/Family: [Medicine schedule or family task]
   3. 📌 Note: [Committed promise or owed money]
   4. 🛡️ Safety: [Road safety tip or focus hours]
   
   Would you like me to set a reminder for anything?

   (Adapt language cleanly according to the requested language preference: English, Hinglish, or Hindi).
3. Professional, warm, respectful. NEVER spam asterisks.
`;

      const result = await model.generateContent(prompt);
      return result.response.text().trim();
    } catch (err) {
      console.error('Error in generateUnifiedDailyBrief:', err);
      if (language === 'hi' || language === 'hindi') {
        return `सुप्रभात ${userName}! ☀️\n\nआज का दिन शुभ रहे। सड़क पर सावधानी से वाहन चलाएँ और अपने ज़रूरी कार्यों पर ध्यान दें। किसी भी कागज़ या रिमाइंडर के लिए मैं यहीं हूँ! 🙏`;
      }
      if (language === 'hinglish') {
        return `Suprabhat ${userName}! ☀️\n\nAaj ka din shubh rahe. Sadak par driving sambhal kar kijiye aur apne zaroori kaamo par dhyan dein. Kisi bhi kaagaz ya reminder ke liye main yahin hoon! 🙏`;
      }
      return `Good morning ${userName}! ☀️\n\nWishing you a productive and safe day ahead. Drive carefully and stay on top of your key tasks. Whenever you need to store or pull a document, I'm right here! 🙏`;
    }
  },
};
