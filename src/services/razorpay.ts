// =================================================================
// Keepr (usekeepr.com) - Razorpay Subscriptions & Payment Links
// =================================================================

import Razorpay from 'razorpay';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { PLANS, PlanDetails, BRAND } from '../config/constants.js';
import { dbService } from '../db/supabase.js';

import { whatsappService } from './whatsapp.js';

dotenv.config();

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_live_TY25t7Ul2SDY2v';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'adoI8E18s8hax1YxiQg34azF';
const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || 'keepr_rzp_secure_webhook_2026';

// Razorpay client instance (lazily initialized if keys present)
let rzp: Razorpay | null = null;
if (RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET) {
  rzp = new Razorpay({
    key_id: RAZORPAY_KEY_ID,
    key_secret: RAZORPAY_KEY_SECRET,
  });
}

export type PaidPlanKey = 
  | 'starter_1999' 
  | 'growth_4999' 
  | 'agency_9999' 
  | 'yaad_249' 
  | 'ghar_499' 
  | 'vault_899' 
  | 'yaad_149' 
  | 'ghar_399' 
  | 'vault_799';

export const paymentService = {
  /**
   * Generate an instant Razorpay Payment Link for a user & plan
   */
  async createPaymentLink(userPhone: string, planKey: PaidPlanKey): Promise<string> {
    const plan: PlanDetails = PLANS[planKey];
    if (!plan) throw new Error('Invalid plan selected');

    // Direct checkout payment links
    const directLinks: Record<string, string> = {
      starter_1999: 'https://rzp.io/rzp/ukMXxGY',
      growth_4999: 'https://rzp.io/rzp/OOIVXyJ',
      agency_9999: 'https://rzp.io/rzp/SjNJKT0',
      yaad_249: 'https://rzp.io/rzp/ukMXxGY',
      ghar_499: 'https://rzp.io/rzp/OOIVXyJ',
      vault_899: 'https://rzp.io/rzp/SjNJKT0',
      yaad_149: 'https://rzp.io/rzp/ukMXxGY',
      ghar_399: 'https://rzp.io/rzp/OOIVXyJ',
      vault_799: 'https://rzp.io/rzp/SjNJKT0',
    };

    // If Razorpay keys are not configured yet (e.g. testing mode)
    if (!rzp) {
      return directLinks[planKey] || 'https://rzp.io/rzp/ukMXxGY';
    }

    try {
      const response = await rzp.paymentLink.create({
        amount: plan.priceInr * 100, // Amount in paise
        currency: 'INR',
        accept_partial: false,
        description: `RoasSiren ${plan.name} - 1 Month Subscription`,
        customer: {
          name: 'AI DOST User',
          contact: `+${userPhone.replace(/\D/g, '')}`,
        },
        notify: {
          sms: false,
          email: false,
        },
        reminder_enable: false,
        notes: {
          phone_number: userPhone,
          plan: planKey,
        },
        callback_url: `https://wa.me/919870530066?text=Payment%20Done`,
        callback_method: 'get',
      });

      return response.short_url;
    } catch (err: any) {
      console.error('Failed to create Razorpay payment link:', err);
      // Fallback to verified direct link
      return directLinks[planKey] || 'https://rzp.io/rzp/ukMXxGY';
    }
  },

  /**
   * Verify and process incoming Razorpay Webhook event
   */
  async handleWebhook(body: string, signature: string): Promise<boolean> {
    if (!RAZORPAY_WEBHOOK_SECRET) {
      console.warn('RAZORPAY_WEBHOOK_SECRET not set, skipping signature verification');
      return true;
    }

    const expectedSignature = crypto
      .createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)
      .update(body)
      .digest('hex');

    if (expectedSignature !== signature) {
      console.error('Invalid Razorpay webhook signature');
      return false;
    }

    const payload = JSON.parse(body);
    const event = payload.event;

    // Check for payment link paid or payment captured
    if (event === 'payment_link.paid') {
      const paymentLink = payload.payload.payment_link.entity;
      const userPhone = paymentLink.notes?.phone_number;
      const planKey = paymentLink.notes?.plan as PaidPlanKey;
      const paymentId = paymentLink.payment_id;

      if (userPhone && planKey) {
        await dbService.upgradeUserPlan(userPhone, planKey, paymentId);
        console.log(`User ${userPhone} successfully upgraded to ${planKey} via Razorpay`);

        const plan = PLANS[planKey];
        const planName = plan?.name || 'RoasSiren Pro';
        const celebrationMsg = `🎉 *[PAYMENT CONFIRMED — ROASSIREN ACTIVATED]* 🚨\n━━━━━━━━━━━━━━━━━━━━\nWelcome to the *${planName}* Tier!\n\n🛡️ *Your 24/7 Autonomous Radar is Live:*\n• Monitored SKUs: Up to ${plan?.maxMonitoredUrls || 15} Destinations\n• Radar Sweep Frequency: Every ${plan?.scanFrequencyMinutes || 15} Minutes\n• 60-Second WhatsApp Sirens: Active 24/7\n• Ad Bleed Protection: Saving ~₹25,000 to ₹1,50,000+ monthly\n\n⚡ *Next Steps:*\nReply: \`monitor <product-url>\` to lock your active ad destinations.\nReply: \`plan\` or \`account\` anytime to view your active subscription and radar usage.\n━━━━━━━━━━━━━━━━━━━━\n_${BRAND.name} Autonomous Engine • roassiren.com_`;
        await whatsappService.sendTextMessage(userPhone, celebrationMsg);
      }
    }

    return true;
  }
};
