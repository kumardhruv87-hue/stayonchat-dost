// =================================================================
// MunshiJi (stayonchat.com) - Supabase Client & Database Services
// =================================================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import WebSocket from 'ws';
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
    realtime: {
      transport: WebSocket as any,
    },
  }
);

export interface UserRecord {
  phone_number: string;
  name: string;
  language: string;
  plan: 'free' | 'yaad_149' | 'ghar_399' | 'vault_799';
  plan_activated_at?: string;
  plan_expires_at?: string;
  file_count: number;
  reminder_count: number;
  referral_code?: string;
  referred_by?: string;
  referral_count?: number;
  bonus_files?: number;
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
const inMemoryChatHistory: Map<string, Array<{ role: 'user' | 'model'; text: string; timestamp: string }>> = new Map();

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
      referral_code: phoneNumber.slice(-6),
      referral_count: 0,
      bonus_files: 0,
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

  // Smart search user's documents & photos with stopword filtering & synonym matching
  async searchDocuments(userPhone: string, query: string, limit: number = 5) {
    const rawQ = (query || '').trim().toLowerCase();
    if (!rawQ) {
      // Return recent docs if query is empty
      const { data } = await supabase
        .from('documents')
        .select('*')
        .eq('user_phone', userPhone)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(limit);
      return data || [];
    }

    // Check if query is asking for a photo / pic / image
    const isPhotoIntent = /\b(pic|photo|image|tasveer|picture|snap|camera|photo wapas|pic bhej|photo bhej|pic dikha|photo dikha)\b/i.test(rawQ);

    if (isPhotoIntent) {
      // Check if user specifically named an entity or place (e.g. "tarangi photo" or "wedding pic")
      const stripped = rawQ
        .replace(/\b(pic|photo|image|tasveer|picture|snap|mera|meri|mere|apna|apni|mujhe|wapas|de|do|bhej|bhejo|dikha|dikhao|kahan|hai|send|chahiye|ki|ka|ke|wali|wala|wale)\b/gi, '')
        .trim();

      if (stripped.length >= 2) {
        const { data: specificData } = await supabase
          .from('documents')
          .select('*')
          .eq('user_phone', userPhone)
          .eq('is_active', true)
          .or(`title.ilike.%${stripped}%,entity_name.ilike.%${stripped}%,summary.ilike.%${stripped}%`)
          .order('created_at', { ascending: false })
          .limit(limit);
        if (specificData && specificData.length > 0) return specificData;
      }

      // Return recent photos
      const { data: photoData } = await supabase
        .from('documents')
        .select('*')
        .eq('user_phone', userPhone)
        .eq('is_active', true)
        .or('file_type.ilike.%image%,title.ilike.%photo%,category.eq.general')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (photoData && photoData.length > 0) return photoData;
    }

    // Remove stop words to find the core subject (e.g. "mera pan card bhej do" => "pan")
    const cleanTokens = rawQ
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => !['mera', 'meri', 'mere', 'apna', 'apni', 'mujhe', 'bhai', 'dost', 'bhej', 'bhejo', 'dikha', 'dikhao', 'kahan', 'kaha', 'hai', 'h', 'send', 'wapas', 'de', 'do', 'chahiye', 'ka', 'ki', 'ke', 'wali', 'wala', 'wale', 'the', 'is', 'ko', 'karo', 'karein'].includes(w))
      .filter((w) => w.length > 1);

    // Search by extracted core tokens
    for (const token of cleanTokens) {
      const { data: tokenData } = await supabase
        .from('documents')
        .select('*')
        .eq('user_phone', userPhone)
        .eq('is_active', true)
        .or(`title.ilike.%${token}%,entity_name.ilike.%${token}%,summary.ilike.%${token}%,policy_or_bill_no.ilike.%${token}%`)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (tokenData && tokenData.length > 0) return tokenData;
    }

    // Fallback: search full query string
    const { data: ilikeData } = await supabase
      .from('documents')
      .select('*')
      .eq('user_phone', userPhone)
      .eq('is_active', true)
      .or(`title.ilike.%${rawQ}%,entity_name.ilike.%${rawQ}%,summary.ilike.%${rawQ}%`)
      .order('created_at', { ascending: false })
      .limit(limit);

    return ilikeData || [];
  },

  // Get user's most recently uploaded photo
  async getLatestUserPhoto(userPhone: string): Promise<DocumentRecord | null> {
    const { data } = await supabase
      .from('documents')
      .select('*')
      .eq('user_phone', userPhone)
      .eq('is_active', true)
      .or('file_type.ilike.%image%,title.ilike.%photo%,category.eq.general')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    return data as DocumentRecord | null;
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
  async setUserLanguage(phoneNumber: string, language: string): Promise<void> {
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
  },

  // Effective max files including base plan + referral bonuses
  getUserEffectiveMaxFiles(user: UserRecord): number {
    const base = PLANS[user.plan]?.maxFiles || 10;
    return base + (user.bonus_files || 0);
  },

  // Apply viral referral reward when a friend clicks an invite link
  async applyReferral(
    newPhoneNumber: string,
    refCode: string
  ): Promise<{ success: boolean; referrerPhone?: string; referrerName?: string; newTotalBonus?: number }> {
    const cleanRef = refCode.replace('ref_', '').trim();
    let referrer = Array.from(inMemoryUsers.values()).find(
      (u) => (u.referral_code && u.referral_code === cleanRef) || u.phone_number.endsWith(cleanRef)
    );

    if (!referrer) {
      try {
        const { data } = await supabase
          .from('users')
          .select('*')
          .or(`referral_code.eq.${cleanRef},phone_number.ilike.%${cleanRef}%`)
          .limit(1)
          .single();
        if (data) referrer = data as UserRecord;
      } catch {
        // Fallback
      }
    }

    if (!referrer || referrer.phone_number === newPhoneNumber) {
      return { success: false };
    }

    let newUser = inMemoryUsers.get(newPhoneNumber);
    if (!newUser) {
      newUser = await dbService.getOrCreateUser(newPhoneNumber);
    }

    if (newUser && !newUser.referred_by) {
      newUser.referred_by = referrer.phone_number;
      inMemoryUsers.set(newPhoneNumber, newUser);

      // Reward referrer +5 files
      referrer.referral_count = (referrer.referral_count || 0) + 1;
      referrer.bonus_files = Math.min((referrer.bonus_files || 0) + 5, 30);
      inMemoryUsers.set(referrer.phone_number, referrer);

      try {
        await supabase.from('users').update({ referred_by: referrer.phone_number }).eq('phone_number', newPhoneNumber);
        await supabase.from('users').update({
          referral_count: referrer.referral_count,
          bonus_files: referrer.bonus_files,
        }).eq('phone_number', referrer.phone_number);
      } catch {
        // Ignore fallback
      }

      return {
        success: true,
        referrerPhone: referrer.phone_number,
        referrerName: referrer.name,
        newTotalBonus: (PLANS[referrer.plan]?.maxFiles || 15) + referrer.bonus_files,
      };
    }

    return { success: false };
  },

  // Get user profile data (DOB, vehicle plate, preferred name)
  async getUserProfile(userPhone: string): Promise<{ dob?: string; vehiclePlate?: string; preferredName?: string }> {
    try {
      const { data } = await supabase
        .from('documents')
        .select('raw_extraction')
        .eq('user_phone', userPhone)
        .eq('title', 'SYSTEM_USER_PROFILE')
        .maybeSingle();

      if (data?.raw_extraction) {
        return data.raw_extraction;
      }
    } catch {
      // Fallback
    }
    return {};
  },

  // Save user profile data
  async saveUserProfile(userPhone: string, profile: { dob?: string; vehiclePlate?: string; preferredName?: string }): Promise<void> {
    try {
      const existing = await this.getUserProfile(userPhone);
      const updated = { ...existing, ...profile };

      const { data: found } = await supabase
        .from('documents')
        .select('id')
        .eq('user_phone', userPhone)
        .eq('title', 'SYSTEM_USER_PROFILE')
        .maybeSingle();

      if (found?.id) {
        await supabase
          .from('documents')
          .update({ raw_extraction: updated, updated_at: new Date().toISOString() })
          .eq('id', found.id);
      } else {
        await supabase
          .from('documents')
          .insert({
            user_phone: userPhone,
            storage_path: `system/profile_${userPhone}.json`,
            file_name: 'profile.json',
            file_type: 'application/json',
            category: 'general',
            title: 'SYSTEM_USER_PROFILE',
            raw_extraction: updated,
            is_active: false,
          });
      }
    } catch (err) {
      console.warn('Error saving user profile:', err);
    }
  },

  // Get rich numerology data for user from documents, profile, and phone number
  async getUserNumerologyData(userPhone: string): Promise<{
    dob?: string;
    vehiclePlate?: string;
    mobile: string;
    profileContext: string;
  }> {
    let dob: string | undefined;
    let vehiclePlate: string | undefined;

    // 1. Check user profile
    const profile = await this.getUserProfile(userPhone);
    if (profile.dob) dob = profile.dob;
    if (profile.vehiclePlate) vehiclePlate = profile.vehiclePlate;

    // 2. Scan active documents if not in profile
    try {
      const { data: docs } = await supabase
        .from('documents')
        .select('title, category, policy_or_bill_no, raw_extraction, summary')
        .eq('user_phone', userPhone)
        .eq('is_active', true);

      if (docs && docs.length > 0) {
        for (const doc of docs) {
          // Extract DOB if present in PAN/Aadhaar/Identity doc
          if (!dob && doc.raw_extraction?.dob) {
            dob = doc.raw_extraction.dob;
          }
          // Extract vehicle plate
          if (!vehiclePlate) {
            if (doc.raw_extraction?.vehicle_number) {
              vehiclePlate = doc.raw_extraction.vehicle_number;
            } else if (doc.category === 'vehicle' && doc.policy_or_bill_no) {
              vehiclePlate = doc.policy_or_bill_no;
            } else {
              const textToSearch = `${doc.title} ${doc.summary || ''} ${doc.policy_or_bill_no || ''}`;
              const match = textToSearch.match(/\b([A-Z]{2}\s*[-]?\s*[0-9]{1,2}\s*[-]?\s*[A-Z]{0,3}\s*[-]?\s*[0-9]{4})\b/i);
              if (match) {
                vehiclePlate = match[1].replace(/[\s-]/g, '').toUpperCase();
              }
            }
          }
        }
      }
    } catch (err) {
      console.warn('Error querying docs for numerology data:', err);
    }

    // 3. Generate profile using universal numerologyService
    const { numerologyService } = await import('../services/numerology.js');
    const numProfile = numerologyService.generateProfile(dob, vehiclePlate, userPhone);

    let context = `Mobile Number: ${userPhone} (Vibration Number: ${numProfile.mobileNumber || 8})\n`;
    if (dob) {
      context += `Date of Birth: ${dob}\n`;
      context += `Mulank (मूलांक - Day Vibration): ${numProfile.mulank} (Theme: ${numProfile.strengths.join(', ')})\n`;
      context += `Bhagyank (भाग्यांक - Destiny Vibration): ${numProfile.bhagyank}\n`;
      context += `Lucky Colors: ${numProfile.luckyColors.join(', ')}\n`;
      context += `Favorable Days: ${numProfile.luckyDays.join(', ')}\n`;
      context += `Counsel & Work Vibration: ${numProfile.counselAdvice}\n`;
    }
    if (vehiclePlate) {
      context += `Vehicle Plate: ${vehiclePlate} (Vehicle Number Vibration: ${numProfile.vehicleNumber})\n`;
      const vehicleAdv = numerologyService.calculateVehicleNumber(vehiclePlate);
      context += `Road Safety & Driving Tip: ${vehicleAdv.advice}\n`;
    }

    return { dob, vehiclePlate, mobile: userPhone, profileContext: context.trim() };
  },

  // Save chat message for conversation continuity (persisted to Supabase documents)
  async saveChatMessage(userPhone: string, role: 'user' | 'model', text: string): Promise<void> {
    const list = inMemoryChatHistory.get(userPhone) || [];
    list.push({ role, text, timestamp: new Date().toISOString() });
    if (list.length > 20) list.shift(); // Sliding window of last 20 messages
    inMemoryChatHistory.set(userPhone, list);

    try {
      const { data: existing } = await supabase
        .from('documents')
        .select('id')
        .eq('user_phone', userPhone)
        .eq('title', 'SYSTEM_CHAT_MEMORY')
        .maybeSingle();

      if (existing?.id) {
        await supabase
          .from('documents')
          .update({
            raw_extraction: { history: list },
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('documents')
          .insert({
            user_phone: userPhone,
            storage_path: `system/memory_${userPhone}.json`,
            file_name: 'chat_memory.json',
            file_type: 'application/json',
            category: 'general',
            title: 'SYSTEM_CHAT_MEMORY',
            raw_extraction: { history: list },
            is_active: false,
          });
      }
    } catch (err) {
      console.warn('Chat memory persistence warning:', err);
    }
  },

  // Get recent chat history for intelligent conversation context
  async getRecentChatHistory(userPhone: string, limit: number = 8): Promise<Array<{ role: string; text: string }>> {
    let list = inMemoryChatHistory.get(userPhone);
    if (!list || list.length === 0) {
      try {
        const { data } = await supabase
          .from('documents')
          .select('raw_extraction')
          .eq('user_phone', userPhone)
          .eq('title', 'SYSTEM_CHAT_MEMORY')
          .maybeSingle();

        if (data?.raw_extraction?.history && Array.isArray(data.raw_extraction.history)) {
          const loadedList = data.raw_extraction.history as Array<{ role: 'user' | 'model'; text: string; timestamp: string }>;
          list = loadedList;
          inMemoryChatHistory.set(userPhone, loadedList);
        }
      } catch {
        // Fallback
      }
    }

    if (list && list.length > 0) {
      return list.slice(-limit).map((m: any) => ({ role: m.role, text: m.text }));
    }

    return [];
  },
};
