// =================================================================
// Keepr (usekeepr.com) - UltraMsg WhatsApp Adapter (Optional Secondary)
// =================================================================

import axios from 'axios';
import { ChannelAdapter, WhatsAppButton } from './channel.interface.js';

export class UltraMsgAdapter implements ChannelAdapter {
  public name = 'ultramsg';
  private baseUrl: string;

  constructor(
    private instanceId: string,
    private token: string
  ) {
    this.baseUrl = `https://api.ultramsg.com/${this.instanceId}`;
  }

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
      const res = await axios.post(`${this.baseUrl}/messages/chat`, {
        token: this.token,
        to: toClean,
        body: cleanBody,
      });
      return res.data?.sent === 'true' || res.data?.sent === true;
    } catch (err: any) {
      console.error('[UltraMsgAdapter] Send text failed:', err.response?.data || err.message);
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
    const numberEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣'];
    let formatted = '';

    if (headerText) formatted += `${headerText}\n\n`;
    formatted += `${bodyText.replace(/\*/g, '')}\n\n`;

    buttons.forEach((btn, idx) => {
      const num = numberEmojis[idx] || `${idx + 1}.`;
      formatted += `${num} ${btn.title}\n`;
    });

    formatted += `\n👉 Reply with the number or title to select.`;
    if (footerText) formatted += `\n\n_${footerText}_`;

    return this.sendTextMessage(to, formatted);
  }

  async sendImage(to: string, buffer: Buffer, mimeType: string, caption?: string): Promise<boolean> {
    const toClean = this.cleanPhone(to);
    const cleanCaption = (caption || '').replace(/\*/g, '');
    const dataUri = `data:${mimeType};base64,${buffer.toString('base64')}`;

    try {
      const res = await axios.post(`${this.baseUrl}/messages/image`, {
        token: this.token,
        to: toClean,
        image: dataUri,
        caption: cleanCaption,
      });
      return res.data?.sent === 'true' || res.data?.sent === true;
    } catch (err: any) {
      console.error('[UltraMsgAdapter] Send image failed:', err.response?.data || err.message);
      return false;
    }
  }

  async sendDocument(to: string, buffer: Buffer, mimeType: string, filename: string, caption?: string): Promise<boolean> {
    const toClean = this.cleanPhone(to);
    const cleanCaption = (caption || '').replace(/\*/g, '');
    const dataUri = `data:${mimeType};base64,${buffer.toString('base64')}`;

    try {
      const res = await axios.post(`${this.baseUrl}/messages/document`, {
        token: this.token,
        to: toClean,
        document: dataUri,
        filename,
        caption: cleanCaption,
      });
      return res.data?.sent === 'true' || res.data?.sent === true;
    } catch (err: any) {
      console.error('[UltraMsgAdapter] Send document failed:', err.response?.data || err.message);
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

    if (mediaIdOrUrl.startsWith('data:')) {
      const matches = mediaIdOrUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        return {
          buffer: Buffer.from(matches[2], 'base64'),
          mimeType: matches[1],
        };
      }
    }

    throw new Error(`Unsupported media format for UltraMsg download: ${mediaIdOrUrl.substring(0, 30)}...`);
  }
}
