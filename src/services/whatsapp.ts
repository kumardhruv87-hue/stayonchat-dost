// =================================================================
// Keepr (usekeepr.com) - WhatsApp Gateway Orchestrator
// Supports Meta Cloud API (Tier-1 Primary, Zero Monthly Burn)
// with UltraMsg Pluggable Secondary Adapter
// =================================================================

import dotenv from 'dotenv';
import { ChannelAdapter, WhatsAppButton } from '../channels/channel.interface.js';
import { MetaCloudAdapter } from '../channels/meta-cloud.adapter.js';
import { UltraMsgAdapter } from '../channels/ultramsg.adapter.js';
import { BRAND } from '../config/constants.js';

dotenv.config();

const ULTRAMSG_INSTANCE_ID = process.env.ULTRAMSG_INSTANCE_ID || 'instance190648';
const ULTRAMSG_TOKEN = process.env.ULTRAMSG_TOKEN || 'knnyrkcj26wp4jyf';

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
const PRIMARY_GATEWAY = process.env.WHATSAPP_PRIMARY_GATEWAY || 'meta';

// Initialize Adapters
const metaAdapter = new MetaCloudAdapter(WHATSAPP_PHONE_NUMBER_ID, getWhatsAppToken());
const ultraMsgAdapter = new UltraMsgAdapter(ULTRAMSG_INSTANCE_ID, ULTRAMSG_TOKEN);

export { WhatsAppButton };

export function cleanPhoneNumber(phone: string): string {
  let cleaned = (phone || '').replace('@c.us', '').replace(/[^0-9]/g, '');
  if (cleaned.length === 10 && /^[6-9]/.test(cleaned)) {
    cleaned = '91' + cleaned;
  }
  return cleaned;
}

export const whatsappService = {
  getPrimaryAdapter(): ChannelAdapter {
    return PRIMARY_GATEWAY === 'ultramsg' ? ultraMsgAdapter : metaAdapter;
  },

  getSecondaryAdapter(): ChannelAdapter {
    return PRIMARY_GATEWAY === 'ultramsg' ? metaAdapter : ultraMsgAdapter;
  },

  async sendTextMessage(to: string, text: string): Promise<boolean> {
    const primary = this.getPrimaryAdapter();
    const sent = await primary.sendTextMessage(to, text);
    if (sent) return true;

    console.warn(`[whatsappService] Primary ${primary.name} failed text send, falling back to secondary...`);
    const secondary = this.getSecondaryAdapter();
    return await secondary.sendTextMessage(to, text);
  },

  async sendInteractiveButtons(
    to: string,
    bodyText: string,
    buttons: WhatsAppButton[],
    headerText?: string,
    footerText: string = `${BRAND.name} 🤖 • Autonomous Life Vault`
  ): Promise<boolean> {
    const primary = this.getPrimaryAdapter();
    const sent = await primary.sendInteractiveButtons(to, bodyText, buttons, headerText, footerText);
    if (sent) return true;

    const secondary = this.getSecondaryAdapter();
    return await secondary.sendInteractiveButtons(to, bodyText, buttons, headerText, footerText);
  },

  async uploadMedia(buffer: Buffer, mimeType: string, filename: string): Promise<string | null> {
    return `data:${mimeType};base64,${buffer.toString('base64')}`;
  },

  async sendImageByMediaId(to: string, mediaIdOrBase64: string, caption?: string): Promise<boolean> {
    // If base64 data URI
    if (mediaIdOrBase64.startsWith('data:')) {
      const matches = mediaIdOrBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (matches) {
        const mimeType = matches[1];
        const buffer = Buffer.from(matches[2], 'base64');
        return await this.sendImageBuffer(to, buffer, mimeType, caption);
      }
    }

    // Direct UltraMsg send
    return await ultraMsgAdapter.sendImage(to, Buffer.alloc(0), 'image/jpeg', caption);
  },

  async sendDocumentByMediaId(to: string, mediaIdOrBase64: string, filename: string, caption?: string): Promise<boolean> {
    if (mediaIdOrBase64.startsWith('data:')) {
      const matches = mediaIdOrBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (matches) {
        const mimeType = matches[1];
        const buffer = Buffer.from(matches[2], 'base64');
        return await this.sendDocumentBuffer(to, buffer, mimeType, filename, caption);
      }
    }

    return await ultraMsgAdapter.sendDocument(to, Buffer.alloc(0), 'application/pdf', filename, caption);
  },

  async sendImageBuffer(to: string, buffer: Buffer, mimeType: string, caption?: string): Promise<boolean> {
    const primary = this.getPrimaryAdapter();
    const sent = await primary.sendImage(to, buffer, mimeType, caption);
    if (sent) return true;

    const secondary = this.getSecondaryAdapter();
    return await secondary.sendImage(to, buffer, mimeType, caption);
  },

  async sendDocumentBuffer(to: string, buffer: Buffer, mimeType: string, filename: string, caption?: string): Promise<boolean> {
    const primary = this.getPrimaryAdapter();
    const sent = await primary.sendDocument(to, buffer, mimeType, filename, caption);
    if (sent) return true;

    const secondary = this.getSecondaryAdapter();
    return await secondary.sendDocument(to, buffer, mimeType, filename, caption);
  },

  async downloadMedia(mediaIdOrUrl: string): Promise<{ buffer: Buffer; mimeType: string }> {
    const primary = this.getPrimaryAdapter();
    try {
      return await primary.downloadMedia(mediaIdOrUrl);
    } catch (err) {
      console.warn(`[whatsappService] Primary ${primary.name} failed media download, trying secondary...`);
      const secondary = this.getSecondaryAdapter();
      return await secondary.downloadMedia(mediaIdOrUrl);
    }
  },

  async sendUtilityExpiryAlert(
    to: string,
    docTitle: string,
    expiryDate: string,
    daysLeft: number
  ): Promise<boolean> {
    const alertText = `⚠️ ${BRAND.name} Expiry Alert 🤖✨\n\nAapka ${docTitle} agle ${daysLeft} din (${expiryDate}) mein expire ho raha hai.\n\nWaqt rehte renew kar lijiye taaki kisi traffic challan ya loss se bacha ja sake. 🙏`;
    return await this.sendTextMessage(to, alertText);
  },
};
