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
  }
};
