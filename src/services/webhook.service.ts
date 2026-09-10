// =================================================================
// RoasSiren (roassiren.com) - Omnichannel Webhook Dispatcher
// Instant Slack & Discord Ad Waste Incident Alerts for Agencies
// =================================================================

import axios from 'axios';
import { DiagnosticResult, MonitoredUrl } from './watchdog.service.js';
import { BRAND } from '../config/brand.js';

export class WebhookService {
  /**
   * Dispatch Siren Alert to Slack or Discord Webhook
   */
  public async dispatchWebhookAlert(
    webhookUrl: string,
    monitored: MonitoredUrl,
    diag: DiagnosticResult
  ): Promise<boolean> {
    if (!webhookUrl || !webhookUrl.startsWith('http')) return false;

    const isSlack = webhookUrl.includes('slack.com');
    const isDiscord = webhookUrl.includes('discord.com');

    try {
      if (isSlack) {
        return await this.sendSlackAlert(webhookUrl, monitored, diag);
      } else if (isDiscord) {
        return await this.sendDiscordAlert(webhookUrl, monitored, diag);
      } else {
        // Generic JSON webhook
        const payload = {
          event: 'ad_destination_alert',
          brand: monitored.brandName,
          product: diag.productTitle,
          status: diag.status,
          url: monitored.url,
          hourlyBurnRateInr: diag.adWasteRisk.hourlyBurnRateInr,
          adWasteRisk: diag.adWasteRisk,
          timestamp: new Date().toISOString(),
        };
        await axios.post(webhookUrl, payload, { timeout: 6000 });
        return true;
      }
    } catch (err: any) {
      console.error(`[Webhook] Failed to dispatch alert to ${webhookUrl}:`, err.message);
      return false;
    }
  }

  /**
   * Format & Send Slack Block-Kit Siren Card
   */
  private async sendSlackAlert(
    webhookUrl: string,
    monitored: MonitoredUrl,
    diag: DiagnosticResult
  ): Promise<boolean> {
    const is404 = diag.status === 'DEAD_LINK_404';
    const statusHeadline = is404 
      ? '🚨 DEAD AD DESTINATION (404 NOT FOUND)' 
      : '🚨 AD DESTINATION SOLD OUT (ZERO STOCK)';

    const oosVariants = diag.variants
      .filter((v) => !v.available)
      .map((v) => v.title)
      .slice(0, 5)
      .join(', ') || 'All Variants';

    const blocks: any[] = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `🚨 [ROASSIREN ALERT] ${monitored.brandName.toUpperCase()} BLEEDING AD SPEND`,
          emoji: true,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${statusHeadline}*\n*Product:* ${diag.productTitle}\n*URL:* <${monitored.url}|${monitored.url}>\n*Burning:* ~₹${diag.adWasteRisk.hourlyBurnRateInr}/hour (Budget: ₹${diag.adWasteRisk.estimatedDailySpend}/day)`,
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Status:*\n${diag.status}`,
          },
          {
            type: 'mrkdwn',
            text: `*Stock Availability:*\n${diag.inStockVariants}/${diag.totalVariants} in stock`,
          },
          {
            type: 'mrkdwn',
            text: `*Sold Out Sizes/Colors:*\n${oosVariants}`,
          },
          {
            type: 'mrkdwn',
            text: `*Action Required:*\nPause Meta Adset Immediately`,
          },
        ],
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'Inspect Landing Page',
              emoji: true,
            },
            url: monitored.url,
            style: 'primary',
          },
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'Open Ads Manager',
              emoji: true,
            },
            url: 'https://adsmanager.facebook.com/adsmanager/',
            style: 'danger',
          },
        ],
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `_Protected 24/7 by ${BRAND.name} (roassiren.com) • Detected at ${new Date().toLocaleTimeString('en-IN')}_`,
          },
        ],
      },
    ];

    if (diag.productImage) {
      blocks[1].accessory = {
        type: 'image',
        image_url: diag.productImage,
        alt_text: diag.productTitle,
      };
    }

    await axios.post(webhookUrl, { blocks }, { timeout: 6000 });
    return true;
  }

  /**
   * Format & Send Discord Rich Embed Card
   */
  private async sendDiscordAlert(
    webhookUrl: string,
    monitored: MonitoredUrl,
    diag: DiagnosticResult
  ): Promise<boolean> {
    const is404 = diag.status === 'DEAD_LINK_404';

    const embed = {
      title: `🚨 [ROASSIREN ALERT] ${monitored.brandName} Ad Destination Bleeding!`,
      url: monitored.url,
      color: 0xf43f5e, // Crimson alert color
      description: is404
        ? `**CRITICAL: Ad destination is returning 404 Not Found!**\nEvery click is landing on a broken page.`
        : `**CRITICAL: Hero SKU is 100% Sold Out!**\nEvery ad click is producing 0 conversions.`,
      fields: [
        {
          name: '📦 Product',
          value: diag.productTitle,
          inline: true,
        },
        {
          name: '💸 Burn Rate',
          value: `~₹${diag.adWasteRisk.hourlyBurnRateInr}/hr`,
          inline: true,
        },
        {
          name: '🛒 Inventory',
          value: `${diag.inStockVariants}/${diag.totalVariants} Variants Available`,
          inline: true,
        },
        {
          name: '⚡ Immediate Mitigation',
          value: `Pause Meta Adset or redirect creative URL now.`,
          inline: false,
        },
      ],
      thumbnail: diag.productImage ? { url: diag.productImage } : undefined,
      footer: {
        text: `RoasSiren Autonomous Radar • ${new Date().toLocaleTimeString('en-IN')}`,
      },
      timestamp: new Date().toISOString(),
    };

    await axios.post(webhookUrl, { embeds: [embed] }, { timeout: 6000 });
    return true;
  }

  /**
   * Send Test Webhook Ping
   */
  public async sendTestWebhook(webhookUrl: string): Promise<{ success: boolean; message: string }> {
    try {
      const mockMonitored: MonitoredUrl = {
        id: 'test_sample',
        url: 'https://snitch.co.in/products/air-mesh-oversized-tee',
        brandName: 'Snitch Apparel (Demo)',
        userPhone: '919560931596',
        dailyAdSpend: 4000,
        lastStatus: 'CRITICAL_OUT_OF_STOCK',
        lastCheckedAt: new Date().toISOString(),
        consecutiveFailures: 0,
        isActive: true,
        createdAt: new Date().toISOString(),
      };

      const mockDiag: DiagnosticResult = {
        url: mockMonitored.url,
        domain: 'snitch.co.in',
        brandName: 'Snitch',
        httpStatus: 200,
        status: 'CRITICAL_OUT_OF_STOCK',
        isAvailable: false,
        productTitle: 'Air Mesh Oversized Tee (Black)',
        currency: 'INR',
        price: 1299,
        totalVariants: 5,
        inStockVariants: 0,
        outOfStockVariants: 5,
        variants: [
          { id: 1, title: 'S', available: false, price: 1299 },
          { id: 2, title: 'M', available: false, price: 1299 },
          { id: 3, title: 'L', available: false, price: 1299 },
          { id: 4, title: 'XL', available: false, price: 1299 },
          { id: 5, title: 'XXL', available: false, price: 1299 },
        ],
        adWasteRisk: {
          level: 'CRITICAL',
          estimatedDailySpend: 4000,
          hourlyBurnRateInr: 167,
          estimatedWastePct: 100,
          actionHeadline: '🚨 100% SOLD OUT — BURNING AD BUDGET',
          actionAdvice: 'Pause active Meta Adset immediately.',
        },
        scannedAt: new Date().toISOString(),
        responseTimeMs: 98,
      };

      const ok = await this.dispatchWebhookAlert(webhookUrl, mockMonitored, mockDiag);
      return {
        success: ok,
        message: ok ? 'Test webhook incident delivered successfully!' : 'Webhook delivery failed.',
      };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  }
}

export const webhookService = new WebhookService();
