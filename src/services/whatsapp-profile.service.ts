// =================================================================
// RoasSiren™ (roassiren.com) - WhatsApp Business Profile Service
// Manages Meta WhatsApp Business Profile Details & Logo Sync
// =================================================================

import fs from 'fs';
import path from 'path';
import { getWhatsAppToken, getWhatsAppPhoneId } from './whatsapp.js';

export interface WhatsAppProfileData {
  about?: string;
  description?: string;
  email?: string;
  websites?: string[];
  vertical?: string;
}

const DEFAULT_PROFILE: WhatsAppProfileData = {
  about: 'RoasSiren™ 🚨 24/7 Meta Ad Waste & Shopify Stock Watchdog',
  description:
    'RoasSiren™ autonomously monitors Meta ad landing pages & Shopify / Blinkit dark stores 24/7. Halts ad bleed within 60s when products sell out or links break.',
  email: 'support@roassiren.com',
  websites: ['https://roassiren.com', 'https://keepr-bot.onrender.com'],
  vertical: 'PROF_SERVICES',
};

export const whatsappProfileService = {
  /**
   * Fetch current WhatsApp Business Profile from Meta Graph API
   */
  async getProfile(): Promise<any> {
    const token = getWhatsAppToken();
    const phoneId = getWhatsAppPhoneId();

    const url = `https://graph.facebook.com/v19.0/${phoneId}/whatsapp_business_profile?fields=about,address,description,email,profile_picture_url,websites,vertical`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return (await res.json()) as any;
  },

  /**
   * Fetch WhatsApp phone number details including verified display name
   */
  async getPhoneDetails(): Promise<any> {
    const token = getWhatsAppToken();
    const phoneId = getWhatsAppPhoneId();
    const url = `https://graph.facebook.com/v19.0/${phoneId}?fields=display_phone_number,verified_name,code_verification_status,quality_rating,name_status,new_name_status`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return (await res.json()) as any;
  },

  /**
   * Request and apply new WhatsApp Business Display Name on Meta
   */
  async updateDisplayName(newName: string = 'RoasSiren', pin: string = '123456'): Promise<{ success: boolean; data?: any; error?: string }> {
    const token = getWhatsAppToken();
    const phoneId = getWhatsAppPhoneId();

    try {
      // 1. Submit new display name
      const nameRes = await fetch(`https://graph.facebook.com/v19.0/${phoneId}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ new_display_name: newName, pin }),
      });
      const nameData = (await nameRes.json()) as any;

      // 2. Re-register phone number to apply name immediately
      const regRes = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/register`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messaging_product: 'whatsapp', pin }),
      });
      const regData = (await regRes.json()) as any;

      return { success: regData.success === true, data: { nameData, regData } };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  /**
   * Update WhatsApp Business Profile text fields (About, Description, Websites, Email, Category)
   */
  async updateProfile(custom?: WhatsAppProfileData): Promise<{ success: boolean; data?: any; error?: string }> {
    const token = getWhatsAppToken();
    const phoneId = getWhatsAppPhoneId();

    const payload = {
      messaging_product: 'whatsapp',
      about: (custom?.about || DEFAULT_PROFILE.about)!.substring(0, 139),
      description: (custom?.description || DEFAULT_PROFILE.description)!.substring(0, 512),
      email: custom?.email || DEFAULT_PROFILE.email,
      websites: custom?.websites || DEFAULT_PROFILE.websites,
      vertical: custom?.vertical || DEFAULT_PROFILE.vertical,
    };

    try {
      const url = `https://graph.facebook.com/v19.0/${phoneId}/whatsapp_business_profile`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as any;

      if (data.success) {
        console.log('[WhatsAppProfileService] Successfully updated business profile on Meta!');
        return { success: true, data };
      } else {
        console.error('[WhatsAppProfileService] Failed to update profile:', data);
        return { success: false, error: data.error?.message || JSON.stringify(data) };
      }
    } catch (err: any) {
      console.error('[WhatsAppProfileService] Exception updating profile:', err.message);
      return { success: false, error: err.message };
    }
  },

  /**
   * Upload and set official RoasSiren logo as WhatsApp Business profile picture
   */
  async updateProfilePicture(imageBufferOrPath?: Buffer | string): Promise<{ success: boolean; error?: string }> {
    const token = getWhatsAppToken();
    const phoneId = getWhatsAppPhoneId();

    try {
      // 1. Resolve image buffer
      let buffer: Buffer;
      if (Buffer.isBuffer(imageBufferOrPath)) {
        buffer = imageBufferOrPath;
      } else if (typeof imageBufferOrPath === 'string' && fs.existsSync(imageBufferOrPath)) {
        buffer = fs.readFileSync(imageBufferOrPath);
      } else {
        const publicLogo = path.resolve(process.cwd(), 'public', 'roassiren-logo.jpg');
        if (fs.existsSync(publicLogo)) {
          buffer = fs.readFileSync(publicLogo);
        } else {
          return { success: false, error: 'Logo file not found in public/roassiren-logo.jpg' };
        }
      }

      // 2. Resolve App ID from token debug
      const debugRes = await fetch(`https://graph.facebook.com/debug_token?input_token=${token}&access_token=${token}`);
      const debugData = (await debugRes.json()) as any;
      const appId = debugData.data?.app_id || '1600556035054977';

      // 3. Create upload session on Meta Graph API
      const sessionRes = await fetch(
        `https://graph.facebook.com/v19.0/${appId}/uploads?file_length=${buffer.length}&file_type=image/jpeg&access_token=${token}`,
        { method: 'POST' }
      );
      const sessionData = (await sessionRes.json()) as any;
      if (!sessionData.id) {
        return { success: false, error: `Upload session creation failed: ${JSON.stringify(sessionData)}` };
      }

      // 4. Upload binary image bytes
      const uploadRes = await fetch(`https://graph.facebook.com/v19.0/${sessionData.id}`, {
        method: 'POST',
        headers: {
          Authorization: `OAuth ${token}`,
          file_offset: '0',
          'Content-Type': 'application/octet-stream',
        },
        body: buffer,
      });
      const uploadData = (await uploadRes.json()) as any;
      if (!uploadData.h) {
        return { success: false, error: `Upload binary bytes failed: ${JSON.stringify(uploadData)}` };
      }

      // 5. Apply file handle to WhatsApp Business Profile
      const applyRes = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/whatsapp_business_profile`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          profile_picture_handle: uploadData.h,
        }),
      });
      const applyData = (await applyRes.json()) as any;
      if (applyData.success) {
        console.log('[WhatsAppProfileService] Successfully updated WhatsApp profile picture on Meta!');
        return { success: true };
      }
      return { success: false, error: JSON.stringify(applyData) };
    } catch (err: any) {
      console.error('[WhatsAppProfileService] Exception updating profile picture:', err.message);
      return { success: false, error: err.message };
    }
  },
};
