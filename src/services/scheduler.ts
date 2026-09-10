// =================================================================
// RoasSiren (roassiren.com) - Autonomous Watchdog & Scheduler
// 24/7 Ad Link Rot, Out-of-Stock Inspector & Notification Engine
// =================================================================

import cron from 'node-cron';
import { supabase, dbService } from '../db/supabase.js';
import { whatsappService } from './whatsapp.js';
import { watchdogService } from './watchdog.service.js';
import { sirenService } from './siren.service.js';
import { BRAND } from '../config/brand.js';

export const schedulerService = {
  /**
   * Initialize cron jobs
   */
  startScheduler() {
    console.log(`🚨 ${BRAND.name} Autonomous Watchdog Engine running:`);
    console.log('- Every 15 Minutes: Autonomous Shopify Stock & Broken Ad URL Sweep');
    console.log('- 07:00 AM IST: Daily ROAS Protection Briefing');
    console.log('- Every 1 Minute: Real-time Task Reminders');

    // 1. Run every 15 minutes: Autonomous Shopify Stock & Ad Link Check
    cron.schedule('*/15 * * * *', async () => {
      console.log('🛡️ [Watchdog Cron] Running 15-minute Shopify stock & ad link sweep...');
      await this.processWatchdogSweep();
    });

    // 2. Run every day at 07:00 AM IST (01:30 AM UTC): Daily Brief
    cron.schedule('30 1 * * *', async () => {
      console.log('Running daily 07:00 AM IST ROAS Protection Brief...');
      await this.processDailyUnifiedBrief();
    });

    // 3. Run every 1 minute: Real-time user custom reminders
    cron.schedule('* * * * *', async () => {
      await this.processGeneralReminders();
    });
  },

  /**
   * Continuous Watchdog Sweep: Checks all registered ad URLs for out-of-stock or 404 links
   */
  async processWatchdogSweep() {
    try {
      const monitoredItems = watchdogService.getAllMonitoredUrls();
      if (monitoredItems.length === 0) {
        return;
      }

      console.log(`🛡️ [Watchdog Sweep] Checking ${monitoredItems.length} active ad destinations...`);

      for (const item of monitoredItems) {
        if (!item.isActive) continue;

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
   * Send personalized 6:00 AM daily morning Astro & Safety guidance
   */
  async processDailyAstroGuidance() {
    try {
      const astroUsers = await dbService.getAllAstroUsers();
      console.log(`Sending 6:00 AM Astro guidance to ${astroUsers.length} users.`);

      const { geminiService } = await import('./gemini.js');

      for (const user of astroUsers) {
        if (!user.dob) continue;
        const guidance = await geminiService.generateDailyAstroGuide(
          {
            name: user.name,
            dob: user.dob,
            tob: user.tob,
            pob: user.pob,
            rashi: user.rashi,
          },
          user.language || 'hinglish'
        );

        await whatsappService.sendTextMessage(user.phone_number, guidance);
      }
    } catch (err) {
      console.error('Failed to send daily astro guidance:', err);
    }
  },

  /**
   * Send Unified 7:00 AM Morning COO Brief
   * Combines upcoming expiries, health medicines, promises, and road safety into 1 crisp card
   */
  async processDailyUnifiedBrief() {
    try {
      const activeUsers = await dbService.getAllActiveUsers();
      console.log(`Processing 07:00 AM Morning Brief for ${activeUsers.length} users.`);

      const { geminiService } = await import('./gemini.js');

      for (const user of activeUsers) {
        try {
          const memories = await dbService.getUserMemories(user.phone_number);
          const upcomingDocs = await dbService.getUserUpcomingDocuments(user.phone_number, 30);
          const activeReminders = await dbService.getUserActiveReminders(user.phone_number);

          // Only send if user has some data or documents to brief on
          if (memories.length === 0 && upcomingDocs.length === 0 && activeReminders.length === 0) {
            continue;
          }

          const brief = await geminiService.generateUnifiedDailyBrief(
            user.name || 'Friend',
            memories,
            upcomingDocs,
            activeReminders,
            user.language || 'english'
          );

          if (brief && brief.length > 10) {
            await whatsappService.sendTextMessage(user.phone_number, brief);
          }
        } catch (userErr) {
          console.error(`Error sending morning brief to ${user.phone_number}:`, userErr);
        }
      }
    } catch (err) {
      console.error('Failed to process daily morning COO brief:', err);
    }
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
