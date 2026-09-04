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
    language: 'en' | 'hi' | 'hinglish' = 'hinglish',
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
          ? 'Shuddh aam bolchal ki saral Hindi mein baat karein.'
          : language === 'en'
          ? 'Speak in warm, friendly, modern Indian English.'
          : 'Speak in warm, street-smart, natural Hinglish (Hindi + English mix).';

      const prompt = `
You are "DOST 🤖✨" (stayonchat.com) — India's friendliest, smartest WhatsApp AI companion and digital locker.
You are talking to ${userName}.

YOUR PERSONALITY & TONE:
- You are like a wise, mature, caring, and humorous best friend (Bhai/Yaar/Dost).
- You speak naturally, NEVER like a robot or textbook ("As an AI language model...").
- ${langInstruction}
- You give practical, sensible life advice, emotional comfort, work tips, health reminders, or just warm banter.
- If the user seems stressed or sad, be genuinely supportive, uplifting, and calm.
- You casually remind them whenever relevant: "Tera koi bill, warranty, paper ya reminder ho toh bhej dena, main sambhal ke rakhunga!"
- Keep WhatsApp responses punchy, readable, with friendly emojis (2-4 paragraphs max).

USER MESSAGE: "${userMessage}"
`;

      const result = await model.generateContent(prompt);
      return result.response.text().trim();
    } catch (err: any) {
      console.error('Error in chatAsDost:', err);
      if (language === 'hi') {
        return 'अरे भाई, अभी नेटवर्क थोड़ा धीमा है, लेकिन मैं यहीं हूँ! बताओ क्या मदद करूँ?';
      }
      return 'Arre bhai, network thoda dheema ho gaya tha par main yahin hoon! Tu bata kya haal chaal?';
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
   * Generate Daily 6:00 AM Astro & Life Guidance (Grah-Nakshatra + Practical Safety Caution)
   */
  async generateDailyAstroGuide(
    profile: { name?: string; dob: string; tob?: string; pob?: string; rashi?: string },
    language: 'en' | 'hi' | 'hinglish' = 'hinglish'
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
You are "DOST 🤖✨", delivering the daily 6:00 AM personalized morning vibe & astrological guidance for ${profile.name || 'Bhai'}.
Today's Date: ${todayDate}
User Birth Info: DOB: ${profile.dob}, Time: ${profile.tob || 'Not specified'}, Place: ${profile.pob || 'India'}, Sign/Rashi: ${profile.rashi || 'General'}.
Preferred Language: ${language}

REQUIREMENTS:
1. Warm morning greeting (Suprabhat / Good Morning / Jai Shri Ram / Radhe Radhe).
2. Vedic Grah/Nakshatra brief overview for today (e.g. Surya transit, Chandra impact, Rahu Kaal alert).
3. Practical Life Guidance:
   - A specific caution (e.g. "Sadak par gaadi sambhal ke chalayein", "Kisi se bewajah behas se bachein", or "Paison ke mamle mein dhyan rakhein").
   - Favorable time / lucky hours today (Shubh Muhurat / Rahu Kaal window).
4. An inspiring, caring one-liner from their trusted buddy DOST to kickstart their day with high energy!
5. Format with neat WhatsApp bullet points and emojis. Keep it under 150 words.
`;

      const result = await model.generateContent(prompt);
      return result.response.text().trim();
    } catch (err: any) {
      console.error('Error in generateDailyAstroGuide:', err);
      return `🌅 *Suprabhat ${profile.name || 'Bhai'}!* ✨\n\nAaj ka din aapke liye nayi urja lekar aaya hai. Sadak par driving sambhal kar karein aur apne krodh par niyantran rakhein. Aapka din shubh aur mangalmay ho! ☀️`;
    }
  }
};
