// =================================================================
// RoasSiren (roassiren.com) - Autonomous Watchdog & Scheduler
// 24/7 Ad Link Rot, Out-of-Stock Inspector & Notification Engine
// =================================================================

import cron from 'node-cron';
import { supabase, dbService } from '../db/supabase.js';
import { whatsappService } from './whatsapp.js';
import { watchdogService } from './watchdog.service.js';
import { sirenService } from './siren.service.js';
import { growthAgentService } from './growth-agent.service.js';
import { BRAND } from '../config/brand.js';
import { PLANS } from '../config/constants.js';

export const schedulerService = {
  /**
   * Initialize cron jobs
   */
  startScheduler() {
    console.log(`🚨 ${BRAND.name} Autonomous Watchdog Engine running:`);
    console.log('- Every 5 Minutes: Tier-Aware Autonomous Radar Sweep (5m Growth/Agency, 15m Starter)');
    console.log('- Every 30 Minutes: 24/7 Autonomous Prospect Ad Bleed & OOS Strike Radar');
    console.log('- 08:30 AM IST: Daily ROAS Protection Intelligence Briefing');
    console.log('- Monday 09:00 AM IST: Weekly Agency Fleet ROI Audit Briefing');
    console.log('- Every 1 Minute: Real-time Task Reminders');

    // 1. Run every 5 minutes: Tier-Aware Autonomous Watchdog Sweep
    cron.schedule('*/5 * * * *', async () => {
      console.log('🛡️ [Watchdog Cron] Running 5-minute autonomous radar sweep...');
      await this.processWatchdogSweep();
    });

    // 2. Run every 30 minutes: 24x7 Autonomous Prospect Strike Radar
    cron.schedule('*/30 * * * *', async () => {
      console.log('⚡ [StrikeEngine Cron] Running 30-minute autonomous prospect radar...');
      try {
        await growthAgentService.runAutonomousProspectRadar();
      } catch (err) {
        console.warn('Error in autonomous prospect radar cron:', err);
      }
    });

    // 3. Run every day at 08:30 AM IST (03:00 AM UTC): Daily ROAS Brief
    cron.schedule('0 3 * * *', async () => {
      console.log('📊 [Watchdog Cron] Running daily 08:30 AM IST ROAS Protection Brief...');
      await this.processDailyRoasDigest();
    });

    // 4. Run every Monday at 09:00 AM IST (03:30 AM UTC): Weekly Agency Fleet Audit
    cron.schedule('30 3 * * 1', async () => {
      console.log('📊 [Watchdog Cron] Running weekly Agency Fleet Ad Waste Saved audit...');
      await this.processWeeklyAgencyDigest();
    });

    // 5. Run every 1 minute: Real-time user custom reminders
    cron.schedule('* * * * *', async () => {
      await this.processGeneralReminders();
    });
  },

  /**
   * Continuous Watchdog Sweep: Checks all registered ad URLs for out-of-stock or 404 links
   * Enforces 5-minute radar for Growth & Agency, and 15-minute radar for Starter!
   */
  async processWatchdogSweep() {
    try {
      const monitoredItems = watchdogService.getAllMonitoredUrls();
      if (monitoredItems.length === 0) {
        return;
      }

      console.log(`🛡️ [Watchdog Sweep] Evaluating ${monitoredItems.length} active ad destinations...`);

      for (const item of monitoredItems) {
        if (!item.isActive) continue;

        // Tier-Based Frequency Check
        try {
          const cleanPhone = item.userPhone.replace(/\D/g, '');
          const user = await dbService.getOrCreateUser(cleanPhone);
          const planKey = user?.plan || 'starter_1999';
          const planDetail = PLANS[planKey] || PLANS.starter_1999;
          const frequencyMinutes = planDetail.scanFrequencyMinutes || 15;

          if (item.lastCheckedAt) {
            const elapsedMs = Date.now() - new Date(item.lastCheckedAt).getTime();
            if (elapsedMs < (frequencyMinutes - 1) * 60 * 1000) {
              // Interval hasn't passed yet for this plan tier
              continue;
            }
          }
        } catch (planCheckErr) {
          // If error looking up plan, proceed with scan
        }

        try {
          const diag = await watchdogService.scanUrl(item.url, item.dailyAdSpend);
          const previousStatus = item.lastStatus;

          console.log(`[Watchdog] Scanned ${item.url} -> ${diag.status} (Previous: ${previousStatus})`);

          // 1. Transition into Critical Out-of-Stock or 404 Broken Link -> DISPATCH EMERGENCY SIREN
          if (
            (diag.status === 'CRITICAL_OUT_OF_STOCK' || diag.status === 'DEAD_LINK_404') &&
            previousStatus !== diag.status
          ) {
            console.log(`🚨 [WATCHDOG TRIGGER] Ad destination failure detected for ${item.url}! Dispatching siren...`);
            const sent = await sirenService.dispatchAdWasteSiren(item.userPhone, item, diag);
            watchdogService.updateMonitoredStatus(item.id, diag.status, sent);
          }
          // 2. Transition back to Safe In Stock -> DISPATCH RESTOCK RECOVERY
          else if (
            diag.status === 'SAFE_IN_STOCK' &&
            (previousStatus === 'CRITICAL_OUT_OF_STOCK' || previousStatus === 'DEAD_LINK_404')
          ) {
            console.log(`🟢 [WATCHDOG TRIGGER] Product restocked for ${item.url}! Dispatching recovery...`);
            await sirenService.dispatchRestockRecovery(item.userPhone, item, diag);
            watchdogService.updateMonitoredStatus(item.id, diag.status, false);
          }
          // 3. Status unchanged or normal
          else {
            watchdogService.updateMonitoredStatus(item.id, diag.status, false);
          }
        } catch (scanErr) {
          console.error(`Error scanning monitored URL ${item.url}:`, scanErr);
        }
      }
    } catch (err) {
      console.error('Error during autonomous watchdog sweep:', err);
    }
  },

  /**
   * Process and dispatch Weekly Agency Fleet ROI Audit Briefing (Every Monday 09:00 AM IST)
   */
  async processWeeklyAgencyDigest() {
    try {
      const allUrls = watchdogService.getAllMonitoredUrls();
      if (allUrls.length === 0) return;
      const agencyPhones = new Set<string>();
      for (const item of allUrls) {
        const cleanPhone = item.userPhone.replace(/\D/g, '');
        if (!cleanPhone) continue;
        const user = await dbService.getOrCreateUser(cleanPhone);
        if (user && (user.plan === 'agency_9999' || user.plan === 'growth_4999')) {
          agencyPhones.add(cleanPhone);
        }
      }

      for (const phone of agencyPhones) {
        const items = watchdogService.getMonitoredUrlsByPhone(phone);
        const protectedSum = items.reduce((acc, curr) => acc + (curr.dailyAdSpend || 3000), 0) * 7;
        const report = `📊 *[ROASSIREN WEEKLY ROI REPORT]* 🛡️\n━━━━━━━━━━━━━━━━━━━━\nHere is your 7-Day Ad Waste Prevention Executive Briefing:\n\n🏬 *Total Client SKUs Shielded:* ${items.length}\n💰 *Ad Spend Protected (7 Days):* ~₹${protectedSum.toLocaleString('en-IN')}\n⚡ *Radar Frequency:* Continuous 5-Minute Watchdog Active\n\nShare this report with your brand clients to demonstrate agency ROI!\n━━━━━━━━━━━━━━━━━━━━\n_Delivered by RoasSiren Fleet Engine (roassiren.com)_`;
        await whatsappService.sendTextMessage(phone, report);
      }
    } catch (err) {
      console.error('Error in weekly agency digest:', err);
    }
  },


  /**
   * Check and deliver real-time user-defined general reminders
   */
  async processGeneralReminders() {
    try {
      const dueReminders = await dbService.getDueGeneralReminders();
      for (const r of dueReminders) {
        console.log(`Delivering general reminder to ${r.user_phone}: ${r.task}`);
        const msg = `⏰ ${BRAND.displayName} Reminder!\n\n📌 ${r.task}\n\nAapne bola tha is samay yaad dilane ko. Kripya dekh lijiye!`;
        await whatsappService.sendTextMessage(r.user_phone, msg);
        await dbService.markGeneralReminderSent(r.id);
      }
    } catch (err) {
      console.error('Error processing general reminders:', err);
    }
  },

  /**
   * Process and dispatch 08:30 AM Daily ROAS & Ad Spend Protection Intelligence Briefing
   */
  async processDailyRoasDigest() {
    try {
      const allUrls = watchdogService.getAllMonitoredUrls();
      if (allUrls.length === 0) return;

      // Group URLs by subscriber phone
      const phoneMap = new Map<string, any[]>();
      for (const item of allUrls) {
        if (!item.isActive) continue;
        const cleanPhone = item.userPhone.replace(/\D/g, '');
        if (!cleanPhone) continue;
        const list = phoneMap.get(cleanPhone) || [];
        list.push(item);
        phoneMap.set(cleanPhone, list);
      }

      console.log(`📊 [Daily Digest] Dispatching 08:30 AM intelligence briefings to ${phoneMap.size} subscribers...`);

      for (const [phone, urls] of phoneMap.entries()) {
        try {
          const brief = this.generateUserDigestText(phone, urls);
          await whatsappService.sendTextMessage(phone, brief);
        } catch (phoneErr) {
          console.error(`Error sending digest to ${phone}:`, phoneErr);
        }
      }
    } catch (err) {
      console.error('Failed to dispatch daily ROAS digest:', err);
    }
  },

  /**
   * Helper to format executive digest text for a user
   */
  generateUserDigestText(phone: string, urls: any[]): string {
    const totalCount = urls.length;
    const critical = urls.filter(u => u.lastStatus === 'CRITICAL_OUT_OF_STOCK' || u.lastStatus === 'DEAD_LINK_404');
    const safe = urls.filter(u => u.lastStatus === 'SAFE_IN_STOCK');
    const partial = urls.filter(u => u.lastStatus === 'PARTIAL_OUT_OF_STOCK');

    const totalDailySpend = urls.reduce((acc, u) => acc + (u.dailyAdSpend || 3000), 0);
    const totalMonthlyProtected = totalDailySpend * 30;
    const activeHourlyBurn = critical.reduce((acc, u) => acc + Math.round((u.dailyAdSpend || 3000) / 24), 0);

    const integrityScore = totalCount > 0 ? Math.round((safe.length / totalCount) * 100) : 100;

    let text = `📊 *[ROASSIREN DAILY EXECUTIVE INTELLIGENCE]* 🛡️\n━━━━━━━━━━━━━━━━━━━━\nGood morning! Here is your 24-hour ad protection status:\n\n`;
    text += `🛡️ *Monitored SKUs:* ${totalCount} Destinations Active\n`;
    text += `💰 *Daily Ad Budget on Radar:* ₹${totalDailySpend.toLocaleString('en-IN')}/day (₹${totalMonthlyProtected.toLocaleString('en-IN')}/mo)\n`;
    text += `📈 *Inventory Integrity Score:* ${integrityScore}%\n`;
    text += `• 🟢 Safe & Converting: ${safe.length} SKUs\n`;
    text += `• 🟡 Partial Variant Stockouts: ${partial.length} SKUs\n`;
    text += `• 🔴 Sold Out / 404 Alerts: ${critical.length} SKUs\n`;

    if (critical.length > 0) {
      text += `\n🚨 *ATTENTION: ${critical.length} ACTIVE AD(S) LANDING ON ZERO STOCK!*\n`;
      text += `💸 You are currently burning ~₹${activeHourlyBurn.toLocaleString('en-IN')}/hour on dead clicks:\n`;
      critical.forEach((item, idx) => {
        text += `${idx + 1}. *${item.brandName}* — ${item.lastStatus.replace(/_/g, ' ')}\n   🔗 ${item.url}\n`;
      });
      text += `\n⚡ *Immediate Action:* Pause the corresponding Meta ad sets now to save your ROAS.\n`;
    } else {
      text += `\n🛡️ *100% HEALTHY:* Zero active ad spend is being wasted on sold-out products. Safe to scale campaigns.\n`;
    }

    text += `\n━━━━━━━━━━━━━━━━━━━━\n⚡ *Quick Actions:*\n• Add new SKU: \`monitor <url>\`\n• View live dashboard: https://keepr-bot.onrender.com/dashboard\n• Check quota: \`plan\``;

    return text;
  },

  /**
   * Process all reminders due for today
   */
  async processDailyReminders() {
    const today = new Date().toISOString().split('T')[0];

    try {
      // Fetch pending reminders for today with document and user details
      const { data: pendingReminders, error } = await supabase
        .from('reminders')
        .select(`
          id,
          user_phone,
          days_before,
          reminder_date,
          documents (
            id,
            title,
            entity_name,
            expiry_date,
            category
          )
        `)
        .eq('reminder_date', today)
        .eq('status', 'pending');

      if (error) {
        console.error('Error fetching today reminders:', error);
        return;
      }

      if (!pendingReminders || pendingReminders.length === 0) {
        console.log('No reminders due for today.');
        return;
      }

      console.log(`Processing ${pendingReminders.length} reminders for today.`);

      for (const item of pendingReminders) {
        const userPhone = item.user_phone;
        const doc: any = item.documents;
        if (!doc) continue;

        const user = await dbService.getOrCreateUser(userPhone);

        // Check if user is on free tier and already used their 1 free trial reminder
        if (user.plan === 'free' && user.reminder_count >= 1) {
          // Free tier exhausted reminders - send a respectful upgrade reminder
          const alertMsg = `⚠️ ${BRAND.displayName} Alert 🔔\n\n${user.name || 'Ji'}, aapke ${doc.title} ki expiry ${item.days_before} din mein hai.\n\nFree Pack mein 1 trial alert tha. Saare kaagzat aur gaadiyon ke waqt par WhatsApp alerts ke liye Yaad Plan (₹249/saal — sirf ₹20/mahina) activate karein:\nhttps://rzp.io/rzp/ukMXxGY\n\n(Challan aur penalty se bachane ke liye ${BRAND.displayName} hamesha aapke saath hai! 🙏)`;
          await whatsappService.sendTextMessage(userPhone, alertMsg);
        } else {
          // Paid user OR first free trial reminder
          await whatsappService.sendUtilityExpiryAlert(
            userPhone,
            doc.title,
            doc.expiry_date,
            item.days_before
          );

          // Increment reminder count
          await supabase
            .from('users')
            .update({ reminder_count: (user.reminder_count || 0) + 1 })
            .eq('phone_number', userPhone);
        }

        // Mark reminder as sent
        await supabase
          .from('reminders')
          .update({ status: 'sent', sent_at: new Date().toISOString() })
          .eq('id', item.id);
      }
    } catch (err) {
      console.error('Failed to process daily reminders:', err);
    }
  }
};
