// =================================================================
// Keepr (usekeepr.com) - Official Meta Cloud API Driver
// Zero-Cost WhatsApp Tier-1 Adapter (1,000 Conversations/Mo FREE)
// =================================================================

import axios from 'axios';
import FormData from 'form-data';
import { ChannelAdapter, WhatsAppButton } from './channel.interface.js';

export class MetaCloudAdapter implements ChannelAdapter {
  public name = 'meta_cloud_api';
  private graphBase = 'https://graph.facebook.com/v21.0';

  constructor(
    private phoneNumberId: string,
    private token: string
  ) {}

  private cleanPhone(phone: string): string {
    let clean = (phone || '').replace('@c.us', '').replace(/[^0-9]/g, '');
    if (clean.length === 10 && /^[6-9]/.test(clean)) {
      clean = '91' + clean;
    }
    return clean;
  }

  async sendTextMessage(to: string, text: string): Promise<boolean> {
    const toClean = this.cleanPhone(to);
    const cleanBody = text.replace(/\*/g, '');

    try {
      const url = `${this.graphBase}/${this.phoneNumberId}/messages`;
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
            Authorization: `Bearer ${this.token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      return true;
    } catch (err: any) {
      console.error('[MetaCloudAdapter] Text send error:', err.response?.data || err.message);
      return false;
    }
  }

  async sendInteractiveButtons(
    to: string,
    bodyText: string,
    buttons: WhatsAppButton[],
    headerText?: string,
    footerText: string = 'Keepr 🤖 • Autonomous Life Vault'
  ): Promise<boolean> {
    const toClean = this.cleanPhone(to);
    const cleanBody = bodyText.replace(/\*/g, '');

    // WhatsApp Cloud API supports up to 3 interactive reply buttons
    if (buttons.length <= 3) {
      try {
        const url = `${this.graphBase}/${this.phoneNumberId}/messages`;
        const payload: any = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: toClean,
          type: 'interactive',
          interactive: {
            type: 'button',
            body: { text: cleanBody },
            action: {
              buttons: buttons.map((b) => ({
                type: 'reply',
                reply: { id: b.id, title: b.title.substring(0, 20) },
              })),
            },
          },
        };

        if (headerText) {
          payload.interactive.header = { type: 'text', text: headerText.substring(0, 60) };
        }
        if (footerText) {
          payload.interactive.footer = { text: footerText.substring(0, 60) };
        }

        await axios.post(url, payload, {
          headers: {
            Authorization: `Bearer ${this.token}`,
            'Content-Type': 'application/json',
          },
        });
        return true;
      } catch (err: any) {
        console.warn('[MetaCloudAdapter] Interactive buttons fallback to formatted text:', err.response?.data?.error?.message || err.message);
      }
    }

    // Numbered emoji fallback for lists > 3 items or button errors
    const numberEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣'];
    let formatted = '';
    if (headerText) formatted += `${headerText}\n\n`;
    formatted += `${cleanBody}\n\n`;
    buttons.forEach((btn, idx) => {
      const num = numberEmojis[idx] || `${idx + 1}.`;
      formatted += `${num} ${btn.title}\n`;
    });
    formatted += `\n👉 Reply with the number or title to select.`;
    if (footerText) formatted += `\n\n_${footerText}_`;

    return this.sendTextMessage(toClean, formatted);
  }

  async sendImage(to: string, buffer: Buffer, mimeType: string, caption?: string): Promise<boolean> {
    const toClean = this.cleanPhone(to);
    const cleanCaption = (caption || '').replace(/\*/g, '');

    try {
      // 1. Upload media to Meta
      const mediaId = await this.uploadToMeta(buffer, mimeType, 'image.jpg');
      if (!mediaId) return false;

      // 2. Send image message using mediaId
      const url = `${this.graphBase}/${this.phoneNumberId}/messages`;
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
            Authorization: `Bearer ${this.token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      return true;
    } catch (err: any) {
      console.error('[MetaCloudAdapter] Image send failed:', err.response?.data || err.message);
      return false;
    }
  }

  async sendDocument(to: string, buffer: Buffer, mimeType: string, filename: string, caption?: string): Promise<boolean> {
    const toClean = this.cleanPhone(to);
    const cleanCaption = (caption || '').replace(/\*/g, '');

    try {
      const mediaId = await this.uploadToMeta(buffer, mimeType, filename);
      if (!mediaId) return false;

      const url = `${this.graphBase}/${this.phoneNumberId}/messages`;
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
            Authorization: `Bearer ${this.token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      return true;
    } catch (err: any) {
      console.error('[MetaCloudAdapter] Document send failed:', err.response?.data || err.message);
      return false;
    }
  }

  async downloadMedia(mediaIdOrUrl: string): Promise<{ buffer: Buffer; mimeType: string }> {
    if (mediaIdOrUrl.startsWith('http://') || mediaIdOrUrl.startsWith('https://')) {
      const res = await axios.get(mediaIdOrUrl, { responseType: 'arraybuffer' });
      const contentType = res.headers['content-type'];
      let mimeType = typeof contentType === 'string' ? contentType : 'image/jpeg';
      if (mimeType.includes(';')) mimeType = mimeType.split(';')[0].trim();
      return { buffer: Buffer.from(res.data), mimeType };
    }

    // Direct Meta Media ID lookup
    const mediaMetaUrl = `${this.graphBase}/${mediaIdOrUrl}`;
    const metaRes = await axios.get(mediaMetaUrl, {
      headers: { Authorization: `Bearer ${this.token}` },
    });

    const fileUrl = metaRes.data.url;
    const mimeType = metaRes.data.mime_type || 'image/jpeg';

    const fileRes = await axios.get(fileUrl, {
      headers: { Authorization: `Bearer ${this.token}` },
      responseType: 'arraybuffer',
    });

    return { buffer: Buffer.from(fileRes.data), mimeType };
  }

  private async uploadToMeta(buffer: Buffer, mimeType: string, filename: string): Promise<string | null> {
    try {
      const form = new FormData();
      form.append('messaging_product', 'whatsapp');
      form.append('file', buffer, { filename, contentType: mimeType });
      form.append('type', mimeType);

      const res = await axios.post(`${this.graphBase}/${this.phoneNumberId}/media`, form, {
        headers: {
          ...form.getHeaders(),
          Authorization: `Bearer ${this.token}`,
        },
      });
      return res.data?.id || null;
    } catch (err: any) {
      console.error('[MetaCloudAdapter] Media upload error:', err.response?.data || err.message);
      return null;
    }
  }
}
