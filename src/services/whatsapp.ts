// =================================================================
// MunshiJi (stayonchat.com) - WhatsApp Cloud API Client
// Handles text, interactive buttons, document sending & media downloads
// =================================================================

import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const ACTIVE_TOKEN =
  'EAAUU0G7bSl8BSVNpv55As86uPV8nwdcYkdJfZBSGemdmQubjZCIhwZBOHrJURg0mGtGUKcnFBCY8y5aN499HWdBNoRrGcKThx1sMVHVD6ZAOh1kszUf1ZCQcfHabXecPoAiCFz6wmczu01V3A6RZBNCEfZC6O3LpeL1ZBGpnYOCF6D9gTyYRTdaDAomMmvJmrrFBL3BP3mkVZAMpFKNhwVYBRVZB243ZBF9WmUXap7WroZAtyBZAiOErHCPDWRFF6taEIhUhfc8UZBoodpOItmPmvbB8H1oPtDNCVScZAvqswZDZD';

export function getWhatsAppToken(): string {
  const envToken = process.env.WHATSAPP_TOKEN || '';
  if (!envToken || envToken.startsWith('EAAUU0G7bSl8BSdh7')) {
    return ACTIVE_TOKEN;
  }
  return envToken;
}

const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || '1145834371951879';
const GRAPH_API_BASE = 'https://graph.facebook.com/v21.0';

export interface WhatsAppButton {
  id: string;
  title: string; // Max 20 characters per Meta guidelines
}

export const whatsappService = {
  /**
   * Send a standard text message
   */
  async sendTextMessage(to: string, text: string): Promise<boolean> {
    try {
      const url = `${GRAPH_API_BASE}/${WHATSAPP_PHONE_NUMBER_ID}/messages`;
      await axios.post(
        url,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to,
          type: 'text',
          text: { preview_url: false, body: text },
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
      console.error('Failed to send WhatsApp text:', error.response?.data || error.message);
      return false;
    }
  },

  /**
   * Send interactive reply buttons (e.g. Yes/No, Plans)
   */
  async sendInteractiveButtons(
    to: string,
    bodyText: string,
    buttons: WhatsAppButton[],
    headerText?: string,
    footerText: string = 'MunshiJi • stayonchat.com'
  ): Promise<boolean> {
    try {
      const url = `${GRAPH_API_BASE}/${WHATSAPP_PHONE_NUMBER_ID}/messages`;
      const payload: any = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'interactive',
        interactive: {
          type: 'button',
          body: { text: bodyText },
          footer: { text: footerText },
          action: {
            buttons: buttons.slice(0, 3).map((b) => ({
              type: 'reply',
              reply: { id: b.id, title: b.title.substring(0, 20) },
            })),
          },
        },
      };

      if (headerText) {
        payload.interactive.header = { type: 'text', text: headerText };
      }

      await axios.post(url, payload, {
        headers: {
          Authorization: `Bearer ${getWhatsAppToken()}`,
          'Content-Type': 'application/json',
        },
      });
      return true;
    } catch (error: any) {
      console.error('Failed to send WhatsApp buttons:', error.response?.data || error.message);
      return false;
    }
  },

  /**
   * Upload binary media buffer directly to Meta WhatsApp servers
   */
  async uploadMedia(buffer: Buffer, mimeType: string, filename: string): Promise<string | null> {
    try {
      const url = `${GRAPH_API_BASE}/${WHATSAPP_PHONE_NUMBER_ID}/media`;
      const formData = new FormData();
      const blob = new Blob([buffer], { type: mimeType });
      formData.append('file', blob, filename);
      formData.append('messaging_product', 'whatsapp');
      formData.append('type', mimeType);

      const res = await axios.post(url, formData, {
        headers: {
          Authorization: `Bearer ${getWhatsAppToken()}`,
        },
      });
      return res.data.id;
    } catch (err: any) {
      console.error('Failed to upload media to Meta:', err.response?.data || err.message);
      return null;
    }
  },

  /**
   * Send an image using Meta Media ID
   */
  async sendImageByMediaId(to: string, mediaId: string, caption?: string): Promise<boolean> {
    try {
      const url = `${GRAPH_API_BASE}/${WHATSAPP_PHONE_NUMBER_ID}/messages`;
      await axios.post(
        url,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to,
          type: 'image',
          image: {
            id: mediaId,
            caption: caption,
          },
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
      console.error('Failed to send WhatsApp image by ID:', err.response?.data || err.message);
      return false;
    }
  },

  /**
   * Send a PDF / Document using Meta Media ID
   */
  async sendDocumentByMediaId(to: string, mediaId: string, filename: string, caption?: string): Promise<boolean> {
    try {
      const url = `${GRAPH_API_BASE}/${WHATSAPP_PHONE_NUMBER_ID}/messages`;
      await axios.post(
        url,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to,
          type: 'document',
          document: {
            id: mediaId,
            filename: filename,
            caption: caption,
          },
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
      console.error('Failed to send WhatsApp document by ID:', err.response?.data || err.message);
      return false;
    }
  },

  /**
   * Send a document or image file to user
   */
  async sendDocument(
    to: string,
    fileUrl: string,
    fileName: string,
    caption?: string
  ): Promise<boolean> {
    try {
      const url = `${GRAPH_API_BASE}/${WHATSAPP_PHONE_NUMBER_ID}/messages`;
      await axios.post(
        url,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to,
          type: 'document',
          document: {
            link: fileUrl,
            caption: caption || `${fileName} (MunshiJi Locker)`,
            filename: fileName,
          },
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
      console.error('Failed to send WhatsApp document:', error.response?.data || error.message);
      return false;
    }
  },

  /**
   * Send pre-approved Utility Template for automated expiry alerts (allowed outside 24h window)
   */
  async sendUtilityExpiryAlert(
    to: string,
    docTitle: string,
    expiryDate: string,
    daysLeft: number
  ): Promise<boolean> {
    try {
      const url = `${GRAPH_API_BASE}/${WHATSAPP_PHONE_NUMBER_ID}/messages`;
      // Template registered in Meta: `munshiji_expiry_alert`
      // Parameters: {{1}} = Document Title, {{2}} = Expiry Date, {{3}} = Days Left
      const response = await axios.post(
        url,
        {
          messaging_product: 'whatsapp',
          to,
          type: 'template',
          template: {
            name: 'munshiji_expiry_alert',
            language: { code: 'en' },
            components: [
              {
                type: 'body',
                parameters: [
                  { type: 'text', text: docTitle },
                  { type: 'text', text: expiryDate },
                  { type: 'text', text: `${daysLeft}` },
                ],
              },
            ],
          },
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
      // If template not yet verified or active session exists, fallback to text message
      console.warn('Template send failed, falling back to direct text:', error.response?.data?.error?.message || error.message);
      const fallbackText = `⚠️ *MunshiJi Expiry Alert*\n\nBhaiya, aapka *${docTitle}* agle *${daysLeft} din* (${expiryDate}) mein expire ho raha hai.\n\nWaqt rehte renew kar lijiye taaki kisi fine ya nuksaan se bacha ja sake! 🙏`;
      return await this.sendTextMessage(to, fallbackText);
    }
  },

  /**
   * Download media (photo, voice note, PDF) sent by user to WhatsApp
   */
  async downloadMedia(mediaId: string): Promise<{ buffer: Buffer; mimeType: string }> {
    // 1. Get temporary media URL from Meta Graph
    const mediaMetaUrl = `${GRAPH_API_BASE}/${mediaId}`;
    const metaRes = await axios.get(mediaMetaUrl, {
      headers: { Authorization: `Bearer ${getWhatsAppToken()}` },
    });

    const fileUrl = metaRes.data.url;
    const mimeType = metaRes.data.mime_type;

    // 2. Download the binary payload using Authorization header
    const fileRes = await axios.get(fileUrl, {
      headers: { Authorization: `Bearer ${getWhatsAppToken()}` },
      responseType: 'arraybuffer',
    });

    return {
      buffer: Buffer.from(fileRes.data),
      mimeType,
    };
  }
};
