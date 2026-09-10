// =================================================================
// RoasSiren™ (roassiren.com) - Persona, Voice & B2B WhatsApp Copy
// The Autonomous Meta Ad Waste & Quick Commerce Watchdog
// "Never waste ad spend on sold out SKUs or broken landing pages."
// =================================================================

import { PLANS, BRAND } from '../config/constants.js';

export const personaService = {
  /**
   * Zero-Friction Executive Greeting for RoasSiren
   */
  getHumanGreeting(userName: string = 'Founder', language: string = 'english'): string {
    return `🚨 *I'm RoasSiren™* — The Autonomous Meta Ad Waste & Out-of-Stock Watchdog for Shopify Brands.

Stop burning ad spend on "Sold Out" products, demoted Quick Commerce SKUs, and dead 404 landing pages.

⚡ *Instant Commands:*
1. Send *any Shopify product URL* (or \`scan <url>\`) for an instant stock & ad waste audit.
2. Type \`monitor <url>\` to lock an active ad destination on 24/7 radar.
3. Type \`audit <brand.com>\` to scan an entire store catalog.
4. Type \`list\` to view your active monitored ad URLs.
5. Type \`test\` to receive a sample WhatsApp emergency siren.`;
  },

  /**
   * Backward compatible greetings
   */
  getLanguageSelectionMessage(): string {
    return this.getHumanGreeting();
  },

  getIntroMessage(userName: string = 'Founder', language: string = 'english'): string {
    return this.getHumanGreeting(userName, language);
  },

  getWelcomeMessage(userName: string = 'Founder', language: string = 'english'): string {
    return this.getHumanGreeting(userName, language);
  },

  getPhotoNamingPrompt(userName: string = 'Founder', language: string = 'english'): string {
    return `📸 Creative asset received. To audit stock levels and set up 24/7 ad spend protection, paste its product URL.`;
  },

  getMenuMessage(userName: string = 'Founder', language: string = 'english'): { text: string; buttons: { id: string; title: string }[] } {
    return {
      text: `🚨 *RoasSiren Watchdog Controls*\n\nAutonomous Meta Ad Spend Protection for D2C Brands:\n\n• Send any Shopify URL to run an instant inventory audit\n• Monitor ad URLs 24/7 to stop ad waste at midnight`,
      buttons: [
        { id: 'btn_test_siren', title: '🚨 Test Siren Alert' },
        { id: 'btn_my_monitors', title: '📡 Monitored URLs' },
        { id: 'btn_plans', title: `📋 B2B Plans` },
      ],
    };
  },

  /**
   * Diagnostic Receipt for Saved Creative or Product Asset
   */
  getDocSavedMessage(
    doc: any,
    language: string = 'english'
  ): string {
    return `📦 *Asset Indexed:* ${doc.title || 'Product Creative'} ✅\nTo put this SKU on 24/7 siren radar, reply:\n\`monitor <destination-url>\``;
  },

  formatSearchResults(
    query: string,
    items: any[],
    language: string = 'english'
  ): string {
    if (!items || items.length === 0) {
      return `🔍 No monitored SKUs found matching "${query}". Reply \`list\` to view all active radars.`;
    }

    let res = `📡 *Found ${items.length} Monitored Destinations:*\n\n`;
    items.forEach((item, idx) => {
      res += `${idx + 1}. *${item.brandName || item.title}*\n   🔗 ${item.url}\n   📊 Status: ${item.lastStatus || 'MONITORING'}\n\n`;
    });
    return res;
  },

  getReminderSavedMessage(
    task: string,
    remindAtIso: string,
    language: string = 'english'
  ): string {
    const formattedDate = new Date(remindAtIso).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    return `⏰ *Scheduled Sweep Locked!* 🚨\n\n• Target: ${task}\n• Execution Time: ${formattedDate}\n\nRoasSiren will dispatch an emergency WhatsApp siren if inventory drops to zero!`;
  },

  getAstroSavedMessage(
    _data: any,
    _language: string = 'english'
  ): string {
    return `🌅 *Daily ROAS Digest Configured!* 📊\n\nStarting tomorrow at 08:30 AM IST, RoasSiren will deliver your executive ad spend protection briefing directly on WhatsApp!`;
  },

  formatExpiriesList(items: any[], _language: string = 'english'): string {
    if (!items || items.length === 0) {
      return `✨ *All Systems Healthy!* All monitored Meta ad landing pages are 100% in stock.`;
    }

    let msg = `⚠️ *Critical Out-of-Stock Watchlist:* 🚨\n\n`;
    items.forEach((item, index) => {
      msg += `${index + 1}. *${item.brandName || item.title}*\n   🔗 ${item.url}\n   💸 Potential Waste: ~₹3,000/day\n\n`;
    });
    msg += `Reply \`pausead <adSetId>\` to kill the active adset and halt budget bleed.`;
    return msg;
  },

  getQuotaFullUpsell(userPhone: string): { text: string; buttons: { id: string; title: string }[] } {
    return {
      text: `⚠️ *Radar Capacity Reached!* 🚨\n\nYou have utilized all allocated ad landing page slots.\n\nExpand your radar capacity:\n• *Growth Brand (₹4,999/mo)*: 50 URLs + 5-min sweeps\n• *Agency Fleet (₹9,999/mo)*: 200 URLs + Slack webhooks`,
      buttons: [
        { id: `upgrade_growth`, title: 'Growth (₹4,999)' },
        { id: `upgrade_agency`, title: 'Agency (₹9,999)' },
      ],
    };
  },

  getExpiryUpsell(userPhone: string, productTitle: string, status: string): { text: string; buttons: { id: string; title: string }[] } {
    return {
      text: `🚨 *Ad Waste Alert:* ${productTitle} is currently ${status}!\n\nAutomate 24/7 Meta ad set pausing before burning more budget with our Growth Plan.`,
      buttons: [
        { id: `upgrade_growth`, title: 'Upgrade to Growth' },
        { id: 'dismiss_upsell', title: 'Dismiss' },
      ],
    };
  },

  getWarisPathInfo(): string {
    return `🛡️ *RoasSiren Agency Fleet Protection*\n\nManaging multiple D2C brand clients? Agency Fleet provides:\n• 200 monitored landing pages\n• Multi-brand team logins & Slack sirens\n• Read-only client transparency links\n\nReply \`buy agency\` to activate.`;
  },

  getReferralShareMessage(userPhone: string, referralCode: string): string {
    const shareLink = `https://wa.me/${BRAND.botPhone}?text=Hi%20RoasSiren%20ref_${referralCode}`;
    return `🎁 *RoasSiren Founder Invite Link* 🚨\n\nInvite fellow brand founders or performance marketers to RoasSiren. When they connect, you both unlock +5 extra monitored SKU slots free!\n\n🔗 *Invite Link:* ${shareLink}`;
  },

  getReferralRewardMessage(friendName: string, totalSlots: number): string {
    return `🎉 *Referral Activated!* 🚀\n\nYour peer (${friendName}) joined RoasSiren!\n\nYou unlocked +5 Extra Monitored Ad URLs. Total active radar capacity: ${totalSlots} SKUs.`;
  },

  getMilestoneMessage(type: 'penalty_saved' | 'five_files' | 'habit_week', data?: string): string {
    if (type === 'penalty_saved') {
      return `🚨 *RoasSiren Ad Shield:* By halting ad delivery to this sold-out SKU, you successfully prevented ~₹${data || '15,000'} in wasted ad spend! 💸🛡️`;
    }
    if (type === 'five_files') {
      return `🏆 *Radar Milestone:* 5 High-Value Hero SKUs protected 24/7. Your ad budget is safe from midnight stockouts!`;
    }
    return `✨ *1 Week Protected:* RoasSiren has been autonomously guarding your ad spend 24/7 for 7 days.`;
  },
};
