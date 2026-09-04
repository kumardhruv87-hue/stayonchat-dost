// =================================================================
// AI DOST (stayonchat.com) - WhatsApp Gateway Client
// Supports UltraMsg (Primary Live Gateway) with Meta Cloud API Fallback
// Zero Spam Asterisks Policy & Universal Media Handlers
// =================================================================

import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const ULTRAMSG_INSTANCE_ID = process.env.ULTRAMSG_INSTANCE_ID || 'instance190648';
const ULTRAMSG_TOKEN = process.env.ULTRAMSG_TOKEN || 'knnyrkcj26wp4jyf';
const ULTRAMSG_BASE_URL = `https://api.ultramsg.com/${ULTRAMSG_INSTANCE_ID}`;

const ACTIVE_META_TOKEN =
  'EAAUU0G7bSl8BSVNpv55As86uPV8nwdcYkdJfZBSGemdmQubjZCIhwZBOHrJURg0mGtGUKcnFBCY8y5aN499HWdBNoRrGcKThx1sMVHVD6ZAOh1kszUf1ZCQcfHabXecPoAiCFz6wmczu01V3A6RZBNCEfZC6O3LpeL1ZBGpnYOCF6D9gTyYRTdaDAomMmvJmrrFBL3BP3mkVZAMpFKNhwVYBRVZB243ZBF9WmUXap7WroZAtyBZAiOErHCPDWRFF6taEIhUhfc8UZBoodpOItmPmvbB8H1oPtDNCVScZAvqswZDZD';

export function getWhatsAppToken(): string {
  const envToken = process.env.WHATSAPP_TOKEN || '';
  if (!envToken || envToken.startsWith('EAAUU0G7bSl8BSdh7')) {
    return ACTIVE_META_TOKEN;
  }
  return envToken;
}

const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || '1145834371951879';
const GRAPH_API_BASE = 'https://graph.facebook.com/v21.0';

export interface WhatsAppButton {
  id: string;
  title: string;
}

/**
 * Clean phone number to ensure pure international digits (e.g. 919560931596)
 */
export function cleanPhoneNumber(phone: string): string {
  let cleaned = (phone || '').replace('@c.us', '').replace(/[^0-9]/g, '');
  if (cleaned.length === 10 && /^[6-9]/.test(cleaned)) {
    cleaned = '91' + cleaned;
  }
  return cleaned;
}

export const whatsappService = {
  /**
   * Send a standard text message (Zero asterisks enforced)
   */
  async sendTextMessage(to: string, text: string): Promise<boolean> {
    const toClean = cleanPhoneNumber(to);
    const cleanBody = text.replace(/\*/g, '');

    // 1. Primary Gateway: UltraMsg
    try {
      const res = await axios.post(`${ULTRAMSG_BASE_URL}/messages/chat`, {
        token: ULTRAMSG_TOKEN,
        to: toClean,
        body: cleanBody,
      });

      if (res.data?.sent === 'true' || res.data?.sent === true) {
        return true;
      }
      console.warn('UltraMsg chat send non-ok response:', res.data);
    } catch (err: any) {
      console.error('UltraMsg chat send error:', err.response?.data || err.message);
    }

    // 2. Secondary Gateway: Meta Graph API (Fallback)
    try {
      const url = `${GRAPH_API_BASE}/${WHATSAPP_PHONE_NUMBER_ID}/messages`;
      await axios.post(
        url,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: toClean,
          type: 'text',
          text: { preview_url: false, body: cleanBody },
        },
        {
          headers: {
            Authorization: `Bearer ${getWhatsAppToken()}`,
            'Content-Type': 'application/json',
          },
        }
      );
      return true;
    } catch (error: any) {
      console.error('Meta fallback send failed:', error.response?.data || error.message);
      return false;
    }
  },

  /**
   * Send interactive menu options cleanly formatted with emojis and numbers
   */
  async sendInteractiveButtons(
    to: string,
    bodyText: string,
    buttons: WhatsAppButton[],
    headerText?: string,
    footerText: string = 'AI DOST • stayonchat.com'
  ): Promise<boolean> {
    const numberEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣'];
    let formatted = '';

    if (headerText) {
      formatted += `${headerText}\n\n`;
    }
    formatted += `${bodyText}\n\n`;

    buttons.forEach((btn, idx) => {
      const num = numberEmojis[idx] || `${idx + 1}.`;
      formatted += `${num} ${btn.title}\n`;
    });

    formatted += `\n👉 Vikalp chunne ke liye bas number (1, 2, 3...) ya naam likhkar bhejiye.`;
    if (footerText) {
      formatted += `\n\n_${footerText}_`;
    }

    return await this.sendTextMessage(to, formatted);
  },

  /**
   * Convert binary media buffer to Base64 data URI for UltraMsg
   */
  async uploadMedia(buffer: Buffer, mimeType: string, filename: string): Promise<string | null> {
    // UltraMsg natively accepts base64 data URI for images, documents, and audio
    return `data:${mimeType};base64,${buffer.toString('base64')}`;
  },

  /**
   * Send an image using Base64 URI or direct URL
   */
  async sendImageByMediaId(to: string, mediaId: string, caption?: string): Promise<boolean> {
    const toClean = cleanPhoneNumber(to);
    const cleanCaption = (caption || '').replace(/\*/g, '');

    try {
      const res = await axios.post(`${ULTRAMSG_BASE_URL}/messages/image`, {
        token: ULTRAMSG_TOKEN,
        to: toClean,
        image: mediaId,
        caption: cleanCaption,
      });
      if (res.data?.sent === 'true' || res.data?.sent === true) {
        return true;
      }
      console.warn('UltraMsg image send non-ok response:', res.data);
    } catch (err: any) {
      console.error('UltraMsg image send error:', err.response?.data || err.message);
    }

    // Fallback: If mediaId is not a base64 string, try Meta Graph API
    if (!mediaId.startsWith('data:')) {
      try {
        const url = `${GRAPH_API_BASE}/${WHATSAPP_PHONE_NUMBER_ID}/messages`;
        await axios.post(
          url,
          {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: toClean,
            type: 'image',
            image: { id: mediaId, caption: cleanCaption },
          },
          {
            headers: {
              Authorization: `Bearer ${getWhatsAppToken()}`,
              'Content-Type': 'application/json',
            },
          }
        );
        return true;
      } catch (err: any) {
        console.error('Meta fallback image send failed:', err.response?.data || err.message);
      }
    }

    return false;
  },

  /**
   * Send a PDF / Document using Base64 URI or direct URL
   */
  async sendDocumentByMediaId(to: string, mediaId: string, filename: string, caption?: string): Promise<boolean> {
    const toClean = cleanPhoneNumber(to);
    const cleanCaption = (caption || '').replace(/\*/g, '');

    try {
      const res = await axios.post(`${ULTRAMSG_BASE_URL}/messages/document`, {
        token: ULTRAMSG_TOKEN,
        to: toClean,
        document: mediaId,
        filename: filename,
        caption: cleanCaption,
      });
      if (res.data?.sent === 'true' || res.data?.sent === true) {
        return true;
      }
      console.warn('UltraMsg document send non-ok response:', res.data);
    } catch (err: any) {
      console.error('UltraMsg document send error:', err.response?.data || err.message);
    }

    // Fallback: If mediaId is not a base64 string, try Meta Graph API
    if (!mediaId.startsWith('data:')) {
      try {
        const url = `${GRAPH_API_BASE}/${WHATSAPP_PHONE_NUMBER_ID}/messages`;
        await axios.post(
          url,
          {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: toClean,
            type: 'document',
            document: { id: mediaId, filename, caption: cleanCaption },
          },
          {
            headers: {
              Authorization: `Bearer ${getWhatsAppToken()}`,
              'Content-Type': 'application/json',
            },
          }
        );
        return true;
      } catch (err: any) {
        console.error('Meta fallback document send failed:', err.response?.data || err.message);
      }
    }

    return false;
  },

  /**
   * Send a document or image file from public URL to user
   */
  async sendDocument(
    to: string,
    fileUrl: string,
    fileName: string,
    caption?: string
  ): Promise<boolean> {
    const toClean = cleanPhoneNumber(to);
    const cleanCaption = (caption || `${fileName} (AI DOST Vault)`).replace(/\*/g, '');

    try {
      const res = await axios.post(`${ULTRAMSG_BASE_URL}/messages/document`, {
        token: ULTRAMSG_TOKEN,
        to: toClean,
        document: fileUrl,
        filename: fileName,
        caption: cleanCaption,
      });
      if (res.data?.sent === 'true' || res.data?.sent === true) {
        return true;
      }
    } catch (error: any) {
      console.error('UltraMsg send document by URL error:', error.response?.data || error.message);
    }

    return false;
  },

  /**
   * Send automated expiry alerts with zero asterisks
   */
  async sendUtilityExpiryAlert(
    to: string,
    docTitle: string,
    expiryDate: string,
    daysLeft: number
  ): Promise<boolean> {
    const alertText = `⚠️ AI DOST Expiry Alert 🤖✨\n\nDhruv ji, aapka ${docTitle} agle ${daysLeft} din (${expiryDate}) mein expire ho raha hai.\n\nWaqt rehte renew kar lijiye taaki kisi fine ya pareshani se bacha ja sake. 🙏`;
    return await this.sendTextMessage(to, alertText);
  },

  /**
   * Download media (photo, voice note, PDF) sent by user
   * Supports UltraMsg direct download URL, Base64 data URI, and Meta Graph API fallback
   */
  async downloadMedia(mediaIdOrUrl: string): Promise<{ buffer: Buffer; mimeType: string }> {
    if (mediaIdOrUrl.startsWith('http://') || mediaIdOrUrl.startsWith('https://')) {
      const res = await axios.get(mediaIdOrUrl, { responseType: 'arraybuffer' });
      const contentType = res.headers['content-type'];
      let mimeType = typeof contentType === 'string' ? contentType : 'image/jpeg';
      if (mimeType.includes(';')) {
        mimeType = mimeType.split(';')[0].trim();
      }
      return {
        buffer: Buffer.from(res.data),
        mimeType,
      };
    }

    // 2. Base64 data URI
    if (mediaIdOrUrl.startsWith('data:')) {
      const matches = mediaIdOrUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        return {
          buffer: Buffer.from(matches[2], 'base64'),
          mimeType: matches[1],
        };
      }
    }

    // 3. Meta Graph API (Fallback for legacy Meta media IDs)
    const mediaMetaUrl = `${GRAPH_API_BASE}/${mediaIdOrUrl}`;
    const metaRes = await axios.get(mediaMetaUrl, {
      headers: { Authorization: `Bearer ${getWhatsAppToken()}` },
    });

    const fileUrl = metaRes.data.url;
    const mimeType = metaRes.data.mime_type;

    const fileRes = await axios.get(fileUrl, {
      headers: { Authorization: `Bearer ${getWhatsAppToken()}` },
      responseType: 'arraybuffer',
    });

    return {
      buffer: Buffer.from(fileRes.data),
      mimeType,
    };
  },
};
