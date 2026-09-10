// =================================================================
// Keepr (usekeepr.com) - Official AiSensy WhatsApp Adapter
// =================================================================

import axios from 'axios';
import { ChannelAdapter, WhatsAppButton } from './channel.interface.js';

export class AiSensyAdapter implements ChannelAdapter {
  public name = 'aisensy';
  private apiUrl: string;
  private projectId: string;

  constructor(
    private apiKey: string,
    projectId: string = process.env.AISENSY_PROJECT_ID || '6a9ec55f4de96179c2effd1e'
  ) {
    this.projectId = projectId;
    this.apiUrl = `https://apis.aisensy.com/project-apis/v1/project/${this.projectId}/messages`;
  }

  private cleanPhone(phone: string): string {
    let clean = (phone || '').replace('@c.us', '').replace(/[^0-9]/g, '');
    if (clean.length === 10 && /^[6-9]/.test(clean)) {
      clean = '91' + clean;
    }
    if (!clean.startsWith('+')) {
      clean = '+' + clean;
    }
    return clean;
  }

  private getHeaders() {
    return {
      'X-AiSensy-Project-API-Pwd': this.apiKey,
      'Content-Type': 'application/json',
    };
  }

  async sendTextMessage(to: string, text: string): Promise<boolean> {
    const toClean = this.cleanPhone(to);
    const cleanBody = text.replace(/\*/g, '');

    try {
      const res = await axios.post(
        this.apiUrl,
        {
          to: toClean,
          type: 'text',
          text: { body: cleanBody },
        },
        {
          headers: this.getHeaders(),
          timeout: 10000,
        }
      );
      return res.status === 200;
    } catch (err: any) {
      console.error('[AiSensyAdapter] Send text error:', err.response?.data || err.message);
      return false;
    }
  }

  async sendInteractiveButtons(
    to: string,
    bodyText: string,
    buttons: WhatsAppButton[],
    headerText?: string,
    footerText: string = 'RoasSiren™ 🚨 • 24/7 Ad Waste Watchdog'
  ): Promise<boolean> {
    const toClean = this.cleanPhone(to);
    const cleanBody = bodyText.replace(/\*/g, '');

    if (buttons.length <= 3) {
      try {
        const payload: any = {
          to: toClean,
          type: 'interactive',
          interactive: {
            type: 'button',
            body: { text: cleanBody },
            action: {
              buttons: buttons.map((btn) => ({
                type: 'reply',
                reply: {
                  id: btn.id,
                  title: btn.title.substring(0, 20),
                },
              })),
            },
          },
        };
        if (headerText) payload.interactive.header = { type: 'text', text: headerText };
        if (footerText) payload.interactive.footer = { text: footerText };

        const res = await axios.post(this.apiUrl, payload, {
          headers: this.getHeaders(),
          timeout: 10000,
        });
        if (res.status === 200) return true;
      } catch (err: any) {
        console.warn('[AiSensyAdapter] Interactive button failed, falling back to numbered text:', err.response?.data || err.message);
      }
    }

    // Numbered emoji fallback
    const numberEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣'];
    let formatted = '';
    if (headerText) formatted += `${headerText}\n\n`;
    formatted += `${cleanBody}\n\n`;
    buttons.forEach((btn, idx) => {
      const num = numberEmojis[idx] || `${idx + 1}.`;
      formatted += `${num} ${btn.title}\n`;
    });
    formatted += `\n👉 Reply with number or title to select.`;

    return this.sendTextMessage(toClean, formatted);
  }

  async sendImage(to: string, buffer: Buffer, mimeType: string, caption?: string): Promise<boolean> {
    return this.sendTextMessage(to, caption || 'Attached Image');
  }

  async sendDocument(to: string, buffer: Buffer, mimeType: string, filename: string, caption?: string): Promise<boolean> {
    return this.sendTextMessage(to, `📄 Document: ${filename}\n${caption || ''}`);
  }

  async downloadMedia(mediaIdOrUrl: string): Promise<{ buffer: Buffer; mimeType: string }> {
    const res = await axios.get(mediaIdOrUrl, { responseType: 'arraybuffer' });
    const contentType = res.headers['content-type'];
    const mimeType = typeof contentType === 'string' ? contentType : 'image/jpeg';
    return { buffer: Buffer.from(res.data), mimeType };
  }
}
