// =================================================================
// MunshiJi (stayonchat.com) - Supabase Client & Database Services
// =================================================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { PLANS } from '../config/constants.js';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const supabase: SupabaseClient = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

export interface UserRecord {
  phone_number: string;
  name: string;
  language: 'en' | 'hi' | 'hinglish';
  plan: 'free' | 'yaad_149' | 'ghar_399' | 'vault_799';
  plan_activated_at?: string;
  plan_expires_at?: string;
  file_count: number;
  reminder_count: number;
  dob?: string;
  tob?: string;
  pob?: string;
  rashi?: string;
  last_offer_sent_at?: string;
  created_at: string;
}

export interface GeneralReminder {
  id: string;
  user_phone: string;
  task: string;
  remind_at: string; // ISO string
  is_sent: boolean;
  created_at: string;
}

export interface DocumentRecord {
  id?: string;
  user_phone: string;
  storage_path: string;
  file_name: string;
  file_type: string;
  file_size_bytes?: number;
  category: string;
  title: string;
  entity_name?: string;
  policy_or_bill_no?: string;
  amount?: number;
  issue_date?: string;
  expiry_date?: string;
  summary?: string;
  tags?: string[];
  raw_extraction?: any;
  is_encrypted?: boolean;
  is_active?: boolean;
  created_at?: string;
}

// In-memory caching & resilient fallback store
const inMemoryUsers: Map<string, UserRecord> = new Map();
const inMemoryReminders: GeneralReminder[] = [];

export const dbService = {
  // Get or auto-register user on first WhatsApp message
  async getOrCreateUser(phoneNumber: string, name?: string): Promise<UserRecord> {
    // Check in-memory first for ultra-fast response
    if (inMemoryUsers.has(phoneNumber)) {
      return inMemoryUsers.get(phoneNumber)!;
    }

    try {
      const { data: existingUser, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('phone_number', phoneNumber)
        .single();

      if (existingUser && !fetchError) {
        const user = existingUser as UserRecord;
        inMemoryUsers.set(phoneNumber, user);
        return user;
      }
    } catch {
      // Supabase unavailable or table error, continue to fallback creation
    }

    const defaultUser: UserRecord = {
      phone_number: phoneNumber,
      name: name || 'Bhai',
      language: 'hinglish',
      plan: 'free',
      file_count: 0,
      reminder_count: 0,
      created_at: new Date().toISOString(),
    };

    try {
      const { data: insertedUser, error: insertError } = await supabase
        .from('users')
        .insert(defaultUser)
        .select('*')
        .single();

      if (!insertError && insertedUser) {
        const user = insertedUser as UserRecord;
        inMemoryUsers.set(phoneNumber, user);
        return user;
      }
    } catch {
      // Supabase insert failed, use in-memory
    }

    inMemoryUsers.set(phoneNumber, defaultUser);
    return defaultUser;
  },

  // Save extracted document and update file_count
  async saveDocument(doc: DocumentRecord): Promise<DocumentRecord> {
    const { data, error } = await supabase
      .from('documents')
      .insert(doc)
      .select('*')
      .single();

    if (error) {
      console.warn('Supabase saveDocument warning (RLS or table):', error.message);
      return { ...doc, id: (await import('crypto')).randomUUID() };
    }

    // Increment user file count
    try {
      const { error: rpcError } = await supabase.rpc('increment_file_count', { p_phone: doc.user_phone });
      if (rpcError) {
        // Fallback if stored procedure not created
        const { data: u } = await supabase.from('users').select('file_count').eq('phone_number', doc.user_phone).single();
        if (u) {
          await supabase.from('users').update({ file_count: (u.file_count || 0) + 1 }).eq('phone_number', doc.user_phone);
        }
      }
    } catch {
      // Ignore increment error
    }

    return data as DocumentRecord;
  },

  // Create reminders for a document with expiry date
  async createReminders(userPhone: string, docId: string, expiryDateStr: string) {
    const expiryDate = new Date(expiryDateStr);
    if (isNaN(expiryDate.getTime())) return;

    const daysList = [30, 7, 1];
    const remindersToInsert = [];

    for (const days of daysList) {
      const remDate = new Date(expiryDate);
      remDate.setDate(remDate.getDate() - days);

      // Only add future dates
      if (remDate.getTime() > Date.now()) {
        remindersToInsert.push({
          user_phone: userPhone,
          document_id: docId,
          reminder_date: remDate.toISOString().split('T')[0],
          days_before: days,
          status: 'pending',
        });
      }
    }

    if (remindersToInsert.length > 0) {
      const { error } = await supabase.from('reminders').insert(remindersToInsert);
      if (error) console.error('Error scheduling reminders:', error);
    }
  },

  // Fuzzy search user's documents
  async searchDocuments(userPhone: string, query: string, limit: number = 5) {
    // 1. Try PostgreSQL function `search_user_documents`
    const { data: rpcData, error: rpcError } = await supabase.rpc('search_user_documents', {
      p_user_phone: userPhone,
      p_query: query,
      p_limit: limit,
    });

    if (!rpcError && rpcData && rpcData.length > 0) {
      return rpcData;
    }

    // 2. Fallback to ILIKE search if pg_trgm function is not loaded
    const { data: ilikeData } = await supabase
      .from('documents')
      .select('*')
      .eq('user_phone', userPhone)
      .eq('is_active', true)
      .or(`title.ilike.%${query}%,entity_name.ilike.%${query}%,summary.ilike.%${query}%`)
      .order('created_at', { ascending: false })
      .limit(limit);

    return ilikeData || [];
  },

  // Get all active expiries for a user
  async getUserExpiries(userPhone: string) {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('documents')
      .select('id, title, category, entity_name, expiry_date, policy_or_bill_no')
      .eq('user_phone', userPhone)
      .eq('is_active', true)
      .not('expiry_date', 'is', null)
      .gte('expiry_date', today)
      .order('expiry_date', { ascending: true });

    if (error) {
      console.error('Error fetching expiries:', error);
      return [];
    }
    return data || [];
  },

  // Update user subscription plan
  async upgradeUserPlan(userPhone: string, plan: 'yaad_149' | 'ghar_399' | 'vault_799', razorpayPaymentId?: string) {
    const oneYearLater = new Date();
    oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);

    const { data, error } = await supabase
      .from('users')
      .update({
        plan,
        plan_activated_at: new Date().toISOString(),
        plan_expires_at: oneYearLater.toISOString(),
      })
      .eq('phone_number', userPhone)
      .select('*')
      .single();

    if (error) {
      console.error('Error upgrading user plan:', error);
      throw error;
    }

    // Log payment record
    const planDetail = PLANS[plan];
    if (planDetail) {
      await supabase.from('payments').insert({
        user_phone: userPhone,
        razorpay_payment_id: razorpayPaymentId || 'manual',
        amount_inr: planDetail.priceInr,
        plan: plan,
        status: 'paid',
      });
    }

    return data;
  },

  // Check if upsell message is allowed by cooldown rules (max 1 per 7 days)
  canSendUpsell(user: UserRecord): boolean {
    if (!user.last_offer_sent_at) return true;
    const lastOfferTime = new Date(user.last_offer_sent_at).getTime();
    const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
    return Date.now() - lastOfferTime > sevenDaysInMs;
  },

  // Mark upsell sent
  async markUpsellSent(userPhone: string) {
    await supabase
      .from('users')
      .update({ last_offer_sent_at: new Date().toISOString() })
      .eq('phone_number', userPhone);
  },

  // Set user language preference
  async setUserLanguage(phoneNumber: string, language: 'en' | 'hi' | 'hinglish'): Promise<void> {
    const user = inMemoryUsers.get(phoneNumber);
    if (user) {
      user.language = language;
      inMemoryUsers.set(phoneNumber, user);
    }
    try {
      await supabase.from('users').update({ language }).eq('phone_number', phoneNumber);
    } catch {
      // Ignore fallback
    }
  },

  // Set user astrology birth profile
  async setUserAstro(phoneNumber: string, astro: { dob: string; tob?: string; pob?: string; rashi?: string }): Promise<void> {
    const user = inMemoryUsers.get(phoneNumber);
    if (user) {
      user.dob = astro.dob;
      if (astro.tob) user.tob = astro.tob;
      if (astro.pob) user.pob = astro.pob;
      if (astro.rashi) user.rashi = astro.rashi;
      inMemoryUsers.set(phoneNumber, user);
    }
    try {
      await supabase.from('users').update({
        dob: astro.dob,
        tob: astro.tob,
        pob: astro.pob,
        rashi: astro.rashi,
      }).eq('phone_number', phoneNumber);
    } catch {
      // Ignore fallback
    }
  },

  // Add general natural reminder
  async addGeneralReminder(userPhone: string, task: string, remindAtIso: string): Promise<GeneralReminder> {
    const { randomUUID } = await import('crypto');
    const reminder: GeneralReminder = {
      id: randomUUID(),
      user_phone: userPhone,
      task,
      remind_at: remindAtIso,
      is_sent: false,
      created_at: new Date().toISOString(),
    };
    inMemoryReminders.push(reminder);

    try {
      await supabase.from('general_reminders').insert(reminder);
    } catch {
      // In-memory fallback is active
    }

    return reminder;
  },

  // Get due general reminders that need to be delivered right now
  async getDueGeneralReminders(): Promise<GeneralReminder[]> {
    const now = new Date().toISOString();
    return inMemoryReminders.filter((r) => !r.is_sent && r.remind_at <= now);
  },

  // Mark general reminder as sent
  async markGeneralReminderSent(reminderId: string): Promise<void> {
    const rem = inMemoryReminders.find((r) => r.id === reminderId);
    if (rem) {
      rem.is_sent = true;
    }
    try {
      await supabase.from('general_reminders').update({ is_sent: true }).eq('id', reminderId);
    } catch {
      // In-memory fallback
    }
  },

  // Get all users who have an Astro profile for daily 6:00 AM morning guidance
  async getAllAstroUsers(): Promise<UserRecord[]> {
    const usersWithDob = Array.from(inMemoryUsers.values()).filter((u) => !!u.dob);
    try {
      const { data } = await supabase.from('users').select('*').not('dob', 'is', null);
      if (data && data.length > 0) {
        return data as UserRecord[];
      }
    } catch {
      // In-memory fallback
    }
    return usersWithDob;
  }
};
