// =================================================================
// MunshiJi (stayonchat.com) - Daily Expiry & Reminder Scheduler
// Runs every morning at 09:00 AM IST to send timely WhatsApp alerts
// =================================================================

import cron from 'node-cron';
import { supabase, dbService } from '../db/supabase.js';
import { whatsappService } from './whatsapp.js';

export const schedulerService = {
  /**
   * Initialize cron jobs
   */
  startScheduler() {
    console.log('DOST Multi-tier Scheduler initialized:');
    console.log('- 06:00 AM IST: Daily Astro & Morning Vibe Check');
    console.log('- 09:00 AM IST: Document Expiry Alerts');
    console.log('- Every 1 Minute: Real-time General Task Reminders');

    // 1. Run every day at 06:00 AM IST (00:30 AM UTC): Daily Astro & Morning Guidance
    cron.schedule('30 0 * * *', async () => {
      console.log('Running daily 06:00 AM IST Astro & Morning Guidance...');
      await this.processDailyAstroGuidance();
    });

    // 2. Run every day at 09:00 AM IST (03:30 AM UTC): Document Expiries
    cron.schedule('30 3 * * *', async () => {
      console.log('Running daily expiry check at 09:00 AM IST...');
      await this.processDailyReminders();
    });

    // 3. Run every 1 minute: Real-time user custom reminders
    cron.schedule('* * * * *', async () => {
      await this.processGeneralReminders();
    });
  },

  /**
   * Check and deliver real-time user-defined general reminders
   */
  async processGeneralReminders() {
    try {
      const dueReminders = await dbService.getDueGeneralReminders();
      for (const r of dueReminders) {
        console.log(`Delivering general reminder to ${r.user_phone}: ${r.task}`);
        const msg = `⏰ AI DOST Reminder! 🤖✨\n\n📌 ${r.task}\n\nAapne bola tha is samay yaad dilane ko. Kripya dekh lijiye!`;
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
          const alertMsg = `⚠️ AI DOST Alert 🤖✨\n\nDhruv ji, aapke ${doc.title} ki expiry ${item.days_before} din mein hai.\n\nFree Pack mein 1 trial alert tha. Saare kaagzat ke waqt par WhatsApp alerts ke liye Yaad Plan (₹149/saal) activate karein:\nhttps://stayonchat.com/pay/yaad_149?phone=${userPhone}`;
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
