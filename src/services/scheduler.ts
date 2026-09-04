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
    console.log('MunshiJi Daily Scheduler initialized (Cron: 09:00 AM IST)');

    // Run every day at 09:00 AM IST (03:30 AM UTC)
    cron.schedule('30 3 * * *', async () => {
      console.log('Running daily expiry check at 09:00 AM IST...');
      await this.processDailyReminders();
    });
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
          const alertMsg = `⚠️ *MunshiJi Alert*\n\nBhaiya, aapke *${doc.title}* ki expiry *${item.days_before} din* mein hai.\n\nFree Pack mein sirf 1 trial alert tha. Saare kaagzat ke waqt par WhatsApp alerts ke liye *Yaad Plan* (₹149/saal) activate karein:\nhttps://stayonchat.com/pay/yaad_149?phone=${userPhone}`;
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
