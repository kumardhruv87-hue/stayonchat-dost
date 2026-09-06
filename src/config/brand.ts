// =================================================================
// Keepr (usekeepr.com) - Centralized Brand Configuration
// Silicon Valley Grade SaaS Brand Layer
// =================================================================

import dotenv from 'dotenv';
dotenv.config();

export interface BrandConfig {
  name: string;
  displayName: string;
  tagline: string;
  domain: string;
  appUrl: string;
  supportEmail: string;
  supportWhatsApp: string;
  botPhone: string;
  legalEntity: string;
  version: string;
}

const APP_NAME = process.env.APP_NAME || 'Keepr';
const APP_DOMAIN = process.env.APP_DOMAIN || 'usekeepr.com';
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || `care@${APP_DOMAIN}`;
const SUPPORT_PHONE = process.env.SUPPORT_PHONE || '+91 9870530066';
const BOT_PHONE = process.env.BOT_PHONE || '919870530066';

export const BRAND: BrandConfig = {
  name: APP_NAME,
  displayName: `${APP_NAME} 🤖✨`,
  tagline: 'Your Autonomous AI Life Vault & Smart Assistant on WhatsApp.',
  domain: APP_DOMAIN,
  appUrl: `https://${APP_DOMAIN}`,
  supportEmail: SUPPORT_EMAIL,
  supportWhatsApp: SUPPORT_PHONE,
  botPhone: BOT_PHONE,
  legalEntity: `${APP_NAME} AI Technologies Inc.`,
  version: '2.0.0-pro',
};
