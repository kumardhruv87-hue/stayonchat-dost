// =================================================================
// RoasSiren (roassiren.com) - Centralized Brand Configuration
// Silicon Valley Grade B2B SaaS Brand Layer
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

const APP_NAME = process.env.APP_NAME || 'RoasSiren';
const APP_DOMAIN = process.env.APP_DOMAIN || 'keepr-bot.onrender.com';
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || `siren@${APP_DOMAIN}`;
const SUPPORT_PHONE = process.env.SUPPORT_PHONE || '+91 9870530066';
const BOT_PHONE = process.env.BOT_PHONE || '919870530066';

export const BRAND: BrandConfig = {
  name: APP_NAME,
  displayName: `${APP_NAME} 🚨`,
  tagline: 'Autonomous Meta Ad Waste & Out-of-Stock Watchdog for Shopify Brands',
  domain: APP_DOMAIN,
  appUrl: `https://${APP_DOMAIN}`,
  supportEmail: SUPPORT_EMAIL,
  supportWhatsApp: SUPPORT_PHONE,
  botPhone: BOT_PHONE,
  legalEntity: `${APP_NAME} Technologies Inc.`,
  version: '3.0.0-watchdog',
};

