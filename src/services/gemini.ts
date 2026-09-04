// =================================================================
// MunshiJi (stayonchat.com) - Gemini Flash AI Document Extraction Engine
// Vision OCR, Handwritten parsing, Audio Voice note transcription
// =================================================================

import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

// Strict Zod schema for extracted document metadata
export const ExtractedDocSchema = z.object({
  category: z.enum([
    'vehicle',
    'appliance',
    'insurance',
    'medical',
    'identity',
    'property',
    'finance',
    'general',
  ]).default('general'),
  title: z.string().describe('Clear, concise name of the document, e.g. "Havells Mixer Grinder Bill", "Swift Dzire PUC", "LIC Policy"'),
  entity_name: z.string().nullable().optional().describe('Brand, company, shop, vehicle model, doctor or insurer name'),
  policy_or_bill_no: z.string().nullable().optional().describe('Invoice number, policy number, registration number, or prescription ID'),
  amount: z.number().nullable().optional().describe('Total amount in INR if mentioned'),
  issue_date: z.string().nullable().optional().describe('Date of issuance or purchase in YYYY-MM-DD format'),
  expiry_date: z.string().nullable().optional().describe('Expiry date, renewal date, warranty end date, or next follow-up in YYYY-MM-DD format'),
  summary: z.string().describe('One single line crisp summary in simple Hinglish / English'),
  tags: z.array(z.string()).describe('3 to 5 searchable keywords in lowercase, e.g. ["havells", "mixer", "warranty", "kitchen"]'),
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
You are the document intelligence engine for "MunshiJi" (stayonchat.com), a trusted Indian digital locker.
Your job is to read images, scanned PDFs, bills, warranty cards, vehicle papers, insurance policies, or handwritten doctor prescriptions/chits and extract structured metadata.

IMPORTANT RULES FOR INDIAN DOCUMENTS:
1. Dates: Look carefully for dates.
   - If issue_date and warranty period (e.g. "2 Years Warranty") are mentioned, calculate the expiry_date = issue_date + warranty_period.
   - For PUC / Pollution certificates, expiry date is typically 6 months or 1 year from test date.
   - For vehicle insurance, note policy end date.
   - For doctor prescriptions, if follow up is mentioned (e.g. "Visit after 15 days"), calculate expiry_date = prescription date + 15 days.
   - Format all dates strictly as YYYY-MM-DD. If year or date cannot be determined with confidence, return null.
2. Handwritten text: Indian handwritten doctor prescriptions, local repair bills, and rough receipts may have messy handwriting. Do your best to identify the shop name, items, and total amount.
3. Category classification:
   - vehicle: RC, PUC, DL, Car/Bike insurance, Service bills
   - appliance: Electronics, mobile, fridge, TV, mixer warranty cards and bills
   - insurance: Life, Health, Term policies (LIC, Star Health, HDFC Ergo, etc.)
   - medical: Doctor prescriptions, blood reports, test results, hospital discharge summaries
   - identity: Aadhaar, PAN, Voter card, Passport
   - property: Rent agreement, Registry, Electricity bill, Water bill
   - finance: FD slips, Bank receipts, Mutual funds
   - general: Misc receipts, rough notes
4. User provided extra message/context: ${userNotes ? `"${userNotes}"` : 'None'}

Return a JSON object conforming strictly to this JSON schema:
{
  "category": "vehicle" | "appliance" | "insurance" | "medical" | "identity" | "property" | "finance" | "general",
  "title": "Clear title in English/Hinglish",
  "entity_name": "Brand / Company / Doctor / Shop name or null",
  "policy_or_bill_no": "Number or null",
  "amount": number or null,
  "issue_date": "YYYY-MM-DD" or null,
  "expiry_date": "YYYY-MM-DD" or null,
  "summary": "1 single line explanation",
  "tags": ["keyword1", "keyword2", "keyword3"],
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
      // Fallback object
      return {
        category: 'general',
        title: userNotes ? userNotes.substring(0, 50) : 'Zaroori Kaagaz',
        entity_name: null,
        policy_or_bill_no: null,
        amount: null,
        issue_date: null,
        expiry_date: null,
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
You are the voice assistant for "MunshiJi" (stayonchat.com).
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
   * Conversational Companion: "Samajhdaar Dost"
   * Empathetic, witty, street-smart, warm Indian friend persona
   */
  async chatAsDost(
    userMessage: string,
    history: Array<{ role: string; text: string }> = [],
    language: string = 'hinglish',
    userName: string = 'Bhai'
  ): Promise<string> {
    try {
      const model = genAI.getGenerativeModel({
        model: 'gemini-3.6-flash',
        generationConfig: {
          temperature: 0.7,
        },
      });

      const langInstruction =
        language === 'hi'
          ? 'शुद्ध, शिष्ट, आदरणीय और सरल हिंदी में बात करें। हमेशा "आप", "आपका", "आपको" का प्रयोग करें।'
          : language === 'en'
          ? 'Speak in polite, cultured, dignified, and warm Indian English.'
          : 'Hinglish mein baat karein, lekin hamesha purna aadar aur samman ke saath ("Aap", "Aapka", "Aapke").';

      const prompt = `
You are "DOST 🤖✨" (stayonchat.com) — a deeply respectful, cultured, intelligent, and trustworthy personal digital companion.
You are conversing with ${userName}.

MANDATORY LANGUAGE & TONE RULES (STRICT COMPLIANCE REQUIRED):
1. RESPECT & COURTESY FIRST (सदा "आप" का प्रयोग):
   - ALWAYS address the user with deep respect using "Aap" (आप), "Aapka" (आपका), "Aapke" (आपके), "Aapko" (आपको), and respectful verbs ("kijiye", "bataiye", "rakhein", "chaliye").
   - STRICTLY FORBIDDEN: NEVER EVER use "tu", "tera", "teri", "tujhe", "abe", "arre", "oye", "load mat le", "dimaag ka dahi", or cheap street slang.
   - Treat ${userName} like a respected gentleman, elder, or valued family friend (e.g. "Bhai Sahab", "${userName} ji").
2. REFINED & CARING TONE:
   - Be genuinely supportive, wise, and calm. If they have stress or questions, offer thoughtful, practical solutions with empathy.
   - When speaking about papers or photos, say respectfully: "Aapka koi bhi zaroori kaagaz, bill, photo ya reminder ho toh kripya mujhe bhej dijiye, main hamesha surakshit rakhunga."
3. FORMATTING:
   - ${langInstruction}
   - WhatsApp responses should be neat, clean, and dignified with pleasant emojis (2-3 short paragraphs max).

USER MESSAGE: "${userMessage}"
`;

      const result = await model.generateContent(prompt);
      return result.response.text().trim();
    } catch (err: any) {
      console.error('Error in chatAsDost:', err);
      if (language === 'hi') {
        return 'नमस्ते जी, अभी नेटवर्क थोड़ा धीमा है, लेकिन मैं यहीं उपस्थित हूँ! कृपया बताइए मैं आपकी क्या सहायता कर सकता हूँ?';
      }
      return 'Namaste! Network thoda dheema ho gaya tha par main yahin hoon. Kripya bataiye main aapki kya madad kar sakta hoon?';
    }
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
   * Generate Daily 6:00 AM Universal Morning & Safety Guidance
   * Inclusive for all faiths (Hindu, Muslim, Sikh, Christian, Secular)
   */
  async generateDailyAstroGuide(
    profile: { name?: string; dob?: string; tob?: string; pob?: string; rashi?: string },
    language: string = 'hinglish'
  ): Promise<string> {
    try {
      const model = genAI.getGenerativeModel({
        model: 'gemini-3.6-flash',
        generationConfig: {
          temperature: 0.7,
        },
      });

      const todayDate = new Date().toLocaleDateString('en-IN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      const prompt = `
You are "DOST 🤖✨", delivering the daily 6:00 AM personalized morning vibe & safety check for ${profile.name || 'Bhai'}.
Today's Date: ${todayDate}
User Profile: DOB: ${profile.dob || 'General'}, City: ${profile.pob || 'India'}.
User Language: ${language}

INCLUSIVE & UNIVERSAL GUIDELINES:
1. Warm, respectful morning greeting suitable for everyone across India (e.g. "Good morning / Suprabhat / Khush Raho / Salaam / Namaste").
2. Day's Energy & Motivation: Focus on clarity of mind, positivity, and staying energized.
3. Practical Life & Safety Check:
   - Specific road & driving alert (e.g. rush hour traffic, cautious driving, patience on the road).
   - Practical work/finance caution (e.g. double-check bills, avoid rash decisions, keep calm in discussions).
4. Best Focus Hours: Suggest optimal productive hours of the day (e.g. 10 AM - 1 PM).
5. (Optional): If the user specifically asked for Rashi/Astrology, provide a gentle planetary hint, else keep it universal and life-oriented.
6. A punchy, caring one-liner from their trusted buddy DOST!
7. Format with clean WhatsApp bullet points and emojis. Keep under 140 words.
`;

      const result = await model.generateContent(prompt);
      return result.response.text().trim();
    } catch (err: any) {
      console.error('Error in generateDailyAstroGuide:', err);
      return `🌅 *Good Morning ${profile.name || 'Bhai'}!* ✨\n\nAaj ka din aapke liye nayi urja lekar aaya hai. Sadak par driving sambhal kar karein aur dimaag shaant rakhein. Koi bhi zaroori kaagaz ya reminder ho toh mujhe bhej dena! Have a wonderful day! ☀️`;
    }
  }
};
