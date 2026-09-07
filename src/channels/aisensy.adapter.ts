// =================================================================
// Keepr (usekeepr.com) - Official AiSensy WhatsApp Adapter
// =================================================================

import axios from 'axios';
import { ChannelAdapter, WhatsAppButton } from './channel.interface.js';

export class AiSensyAdapter implements ChannelAdapter {
  public name = 'aisensy';
  private apiUrl = 'https://api.aisensy.io/v1/messages';
  private projectId: string;

  constructor(
    private apiKey: string,
    projectId: string = process.env.AISENSY_PROJECT_ID || '6a9ec55f4de96179c2effd1e'
  ) {
    this.projectId = projectId;
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

  async sendTextMessage(to: string, text: string): Promise<boolean> {
    const toClean = this.cleanPhone(to);
    const cleanBody = text.replace(/\*/g, '');

    // 1. Primary: Standard AiSensy v1 Messages API
    try {
      await axios.post(
        this.apiUrl,
        {
          to: toClean,
          type: 'text',
          text: { body: cleanBody },
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );
      return true;
    } catch (err: any) {
      console.warn('[AiSensyAdapter] Standard v1 messages failed, trying project API fallback:', err.response?.data || err.message);
    }

    // 2. Fallback: Project-specific endpoint
    try {
      await axios.post(
        `https://apis.aisensy.com/project-apis/v1/project/${this.projectId}/messages`,
        {
          to: toClean,
          type: 'text',
          text: { body: cleanBody },
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'X-AiSensy-Project-API-Pwd': this.apiKey,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );
      return true;
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
    footerText: string = 'Keepr 🤖 • Autonomous Life Vault'
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

        await axios.post(this.apiUrl, payload, {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        });
        return true;
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
