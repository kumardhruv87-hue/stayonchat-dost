// =================================================================
// RoasSiren (roassiren.com) - WhatsApp Siren Dispatch Service
// 60-Second Emergency Ad Waste Alert Protocol for Founders & Media Buyers
// =================================================================

import { whatsappService } from './whatsapp.js';
import { webhookService } from './webhook.service.js';
import { DiagnosticResult, MonitoredUrl } from './watchdog.service.js';
import { BRAND } from '../config/brand.js';
import { WATCHDOG_RULES } from '../config/constants.js';

export class SirenService {
  private alertHistory: Map<string, { lastAlertTime: number; lastStatus: string }> = new Map();

  /**
   * Dispatch Emergency Ad Waste Siren Alert via WhatsApp & Webhooks
   */
  public async dispatchAdWasteSiren(
    targetPhone: string,
    monitored: MonitoredUrl,
    diag: DiagnosticResult
  ): Promise<boolean> {
    const cleanPhone = targetPhone.replace(/[^0-9]/g, '');
    const key = `${cleanPhone}_${monitored.url}`;
    const now = Date.now();

    // Check cooldown: Don't repeat identical alert within cooldown hours unless resolved/changed
    const existing = this.alertHistory.get(key);
    if (
      existing &&
      existing.lastStatus === diag.status &&
      now - existing.lastAlertTime < WATCHDOG_RULES.ALERT_COOLDOWN_HOURS * 60 * 60 * 1000
    ) {
      console.log(`[Siren] Suppressing duplicate siren for ${monitored.url} to ${cleanPhone} (Cooldown active)`);
      return false;
    }

    const timeStr = new Date().toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    let sirenBody = '';

    const isQuickCommerce = diag.platform === 'BLINKIT' || monitored.platform === 'BLINKIT';

    if (isQuickCommerce && (diag.status === 'CRITICAL_OUT_OF_STOCK' || !diag.isAvailable)) {
      sirenBody = `⚡ *[ROASSIREN] QUICK COMMERCE STOCKOUT ALERT!* ⚡
━━━━━━━━━━━━━━━━━━━━
⚠️ *DARK STORE OUT-OF-STOCK DETECTED!*

🏬 *Platform:* Blinkit Quick Commerce
📦 *Product:* ${diag.productTitle}
🏷️ *Brand:* ${monitored.brandName}
❌ *Stock Status:* OUT OF STOCK IN DARK STORE
🔗 *Product URL:* ${monitored.url}
🕒 *Detected:* ${timeStr} IST
💸 *Risk:* Lost 10-Minute GMV & Algorithm Search Rank Demotion

⚡ *IMMEDIATE ACTION REQUIRED:*
1. Alert regional FMCG distributor / dark store inventory manager immediately.
2. In-store restock required to reclaim top 3 search placement.
━━━━━━━━━━━━━━━━━━━━
_Protected 24/7 by ${BRAND.name} Quick Commerce Engine (roassiren.com)_`;
    } else if (diag.status === 'DEAD_LINK_404') {
      sirenBody = `🚨 *[ROASSIREN EMERGENCY] DEAD AD LINK DETECTED!* 🚨
━━━━━━━━━━━━━━━━━━━━
⚠️ *CRITICAL: YOUR AD IS SENDING TRAFFIC TO A 404!*

🏬 *Store:* ${monitored.brandName}
🔗 *Ad Target:* ${monitored.url}
❌ *HTTP Status:* 404 Not Found (Page Deleted / Renamed)
🕒 *Detected:* ${timeStr} IST
💸 *Estimated Waste:* ~₹${diag.adWasteRisk.hourlyBurnRateInr}/hr

⚡ *IMMEDIATE ACTION REQUIRED:*
1. Pause Meta AdSet immediately in Ads Manager.
2. Update creative destination URL to active product page.
━━━━━━━━━━━━━━━━━━━━
_Protected 24/7 by ${BRAND.name} (roassiren.com)_`;
    } else if (diag.status === 'CRITICAL_OUT_OF_STOCK') {
      const oosSummary = diag.totalVariants > 1 
        ? `All ${diag.totalVariants} variants sold out` 
        : 'Out of stock';

      sirenBody = `🚨 *[ROASSIREN SIREN] AD DESTINATION SOLD OUT!* 🚨
━━━━━━━━━━━━━━━━━━━━
⚠️ *STOP BURNING AD BUDGET ON ZERO INVENTORY!*

🏬 *Brand:* ${monitored.brandName}
📦 *Product:* ${diag.productTitle}
❌ *Stock Status:* SOLD OUT (${oosSummary})
🔗 *URL:* ${monitored.url}
🕒 *Detected:* ${timeStr} IST
💸 *Burning:* ~₹${diag.adWasteRisk.hourlyBurnRateInr}/hr (₹${diag.adWasteRisk.estimatedDailySpend}/day budget)

⚡ *RECOMMENDED ACTIONS:*
1. *PAUSE* active Meta / Instagram Adset running to this SKU.
2. Or redirect ad traffic to an in-stock alternative.
━━━━━━━━━━━━━━━━━━━━
_We will notify you immediately once this SKU is restocked._`;
    } else if (diag.status === 'PARTIAL_OUT_OF_STOCK') {
      const oosVariantNames = diag.variants
        .filter((v) => !v.available)
        .map((v) => v.title)
        .slice(0, 4)
        .join(', ');

      sirenBody = `⚠️ *[ROASSIREN WARNING] POPULAR SIZES SOLD OUT!*
━━━━━━━━━━━━━━━━━━━━
🏬 *Brand:* ${monitored.brandName}
📦 *Product:* ${diag.productTitle}
⚠️ *Inventory:* ${diag.inStockVariants}/${diag.totalVariants} variants available
❌ *Sold Out:* ${oosVariantNames}
🔗 *URL:* ${monitored.url}
🕒 *Time:* ${timeStr} IST
💸 *Wasted Click Risk:* ~${diag.adWasteRisk.estimatedWastePct}% of traffic bouncing

💡 *ADVICE:* If your ad creative highlights a sold-out size or color, update ad copy or restock ASAP.
━━━━━━━━━━━━━━━━━━━━
_${BRAND.name} Autonomous Watchdog_`;
    }

    if (!sirenBody) return false;

    console.log(`🚨 [Siren Dispatch] Sending emergency WhatsApp alert to ${cleanPhone} for ${monitored.url}`);
    const success = await whatsappService.sendTextMessage(cleanPhone, sirenBody);

    // Multi-buyer phones (Growth & Agency tiers)
    if (monitored.alertRecipients && monitored.alertRecipients.length > 0) {
      for (const extraPhone of monitored.alertRecipients) {
        const cleanExtra = extraPhone.replace(/[^0-9]/g, '');
        if (cleanExtra && cleanExtra !== cleanPhone) {
          whatsappService.sendTextMessage(cleanExtra, sirenBody).catch((e) => console.warn('Extra phone alert failed:', e));
        }
      }
    }

    // Omnichannel Webhook Dispatch (Slack / Discord)
    if (monitored.webhookUrl) {
      webhookService.dispatchWebhookAlert(monitored.webhookUrl, monitored, diag).catch((e) => console.warn('Webhook alert failed:', e));
    }

    if (success) {
      this.alertHistory.set(key, { lastAlertTime: now, lastStatus: diag.status });
    }

    return success;
  }

  /**
   * Dispatch Restock Recovery Alert when an OOS product is back in stock
   */
  public async dispatchRestockRecovery(
    targetPhone: string,
    monitored: MonitoredUrl,
    diag: DiagnosticResult
  ): Promise<boolean> {
    const cleanPhone = targetPhone.replace(/[^0-9]/g, '');
    const timeStr = new Date().toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    const isQuickCommerce = diag.platform === 'BLINKIT' || monitored.platform === 'BLINKIT';

    const msg = isQuickCommerce
      ? `🟢 *[ROASSIREN] QUICK COMMERCE RESTOCKED!* 🟢
━━━━━━━━━━━━━━━━━━━━
🎉 *Good news! Your product is back in stock on Blinkit.*

🏬 *Platform:* Blinkit Quick Commerce
📦 *Product:* ${diag.productTitle}
🏷️ *Brand:* ${monitored.brandName}
✅ *Status:* IN STOCK & AVAILABLE FOR 10-MIN DELIVERY
🔗 *URL:* ${monitored.url}
🕒 *Time:* ${timeStr} IST

💡 *Action:* Dark store inventory restored. Search rank recovering!
━━━━━━━━━━━━━━━━━━━━
_${BRAND.name} Quick Commerce Radar (roassiren.com)_`
      : `🟢 *[ROASSIREN UPDATE] INVENTORY RESTOCKED!* 🟢
━━━━━━━━━━━━━━━━━━━━
🎉 *Good news! Your ad destination is back in stock.*

🏬 *Store:* ${monitored.brandName}
📦 *Product:* ${diag.productTitle}
✅ *Status:* IN STOCK (${diag.inStockVariants}/${diag.totalVariants} variants available)
🔗 *URL:* ${monitored.url}
🕒 *Time:* ${timeStr} IST

💡 *Action:* You can now safely reactivate or scale your Meta AdSet!
━━━━━━━━━━━━━━━━━━━━
_${BRAND.name} 24/7 Watchdog Radar_`;

    console.log(`🟢 [Restock Siren] Sending recovery WhatsApp alert to ${cleanPhone} for ${monitored.url}`);
    const success = await whatsappService.sendTextMessage(cleanPhone, msg);

    if (success) {
      const key = `${cleanPhone}_${monitored.url}`;
      this.alertHistory.set(key, { lastAlertTime: Date.now(), lastStatus: 'SAFE_IN_STOCK' });
    }

    return success;
  }

  /**
   * Send a live test siren (used by the Landing Page Live Demo)
   */
  public async sendTestSiren(targetPhone: string, storeUrl?: string): Promise<{ success: boolean; message: string }> {
    const cleanPhone = targetPhone.replace(/[^0-9]/g, '');
    const sampleUrl = storeUrl || 'https://shop.snitch.co.in/products/air-mesh-oversized-tee';

    const testMsg = `🚨 *[ROASSIREN DEMO SIREN] 60-SECOND ALERT TEST* 🚨
━━━━━━━━━━━━━━━━━━━━
This is an authentic demonstration of your 24/7 WhatsApp Siren.

🏬 *Brand:* Snitch Apparel (Demo)
📦 *Product:* Oversized Acid Washed Tee
❌ *Stock Status:* CRITICAL OUT OF STOCK (All 5 Sizes Sold Out)
🔗 *Ad Target:* ${sampleUrl}
🕒 *Detected:* Just Now (${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })})
💸 *Burn Rate:* ~₹125/hour (₹3,000/day adset)

⚡ *With RoasSiren Active:*
Your ad is flagged at 3:14 AM. You or your media buyer pauses the ad in seconds instead of waking up at 10 AM to ₹2,500 burned on dead clicks!

🛡️ *Your store is now protected.*
━━━━━━━━━━━━━━━━━━━━
_Powered by ${BRAND.name} Autonomous Engine_`;

    const success = await whatsappService.sendTextMessage(cleanPhone, testMsg);
    return {
      success,
      message: success ? 'Siren delivered successfully via Meta WhatsApp Cloud API' : 'Failed to deliver message via WhatsApp gateway',
    };
  }
}

export const sirenService = new SirenService();
