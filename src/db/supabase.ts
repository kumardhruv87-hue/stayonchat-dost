// =================================================================
// Keepr (usekeepr.com) - Supabase Client & Database Services
// Silicon Valley Grade Cloud Database & RLS Layer
// =================================================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import WebSocket from 'ws';
import dotenv from 'dotenv';
import { PLANS, PlanId } from '../config/constants.js';
import { cacheService } from '../services/cache.service.js';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://qopihozjwbxeykefrzpl.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_publishable_10SPMrCpJXbMQhMFAgzi-w_dRWxzxYt';

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
  plan: PlanId;
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
  vehicle_plate?: string;
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

export interface UserMemory {
  id?: string;
  user_phone: string;
  category: 'health' | 'family' | 'finance' | 'home' | 'promise' | 'note' | 'general';
  person?: string;       // e.g. 'Papa', 'Mummy', 'Beti', 'Self', 'Spouse', 'Sharma ji'
  key_fact: string;      // e.g. 'Papa BP medicine: Telma 40 after dinner'
  raw_text?: string;
  due_date?: string;
  amount?: number;
  created_at?: string;
  expires_at?: string;
}

// In-memory caching & resilient fallback store
const inMemoryUsers: Map<string, UserRecord> = new Map();
const inMemoryReminders: GeneralReminder[] = [];
const inMemoryUserMemories: UserMemory[] = [];
const inMemoryChatHistory: Map<string, Array<{ role: 'user' | 'model'; text: string; timestamp: string }>> = new Map();
const inMemoryPendingNaming: Map<string, { docId: string; timestamp: number }> = new Map();
const inMemoryPromptStates: Map<string, { state: string; timestamp: number }> = new Map();
const inMemoryBotSessions: Map<string, number> = new Map();

export const dbService = {
  // Check if user has an active bot session
  isSessionActive(userPhone: string): boolean {
    return cacheService.isSessionActive(userPhone);
  },

  // Start or extend bot session (default 30 mins)
  startSession(userPhone: string, durationMinutes: number = 30): void {
    cacheService.startSession(userPhone, durationMinutes);
  },

  // Stop bot session immediately
  stopSession(userPhone: string): void {
    cacheService.stopSession(userPhone);
  },

  // Track prompt context (e.g. language picker, main menu)
  setUserPromptState(userPhone: string, state: string): void {
    cacheService.setUserPromptState(userPhone, state);
  },

  getUserPromptState(userPhone: string): string | null {
    return cacheService.getUserPromptState(userPhone);
  },

  clearUserPromptState(userPhone: string): void {
    cacheService.clearUserPromptState(userPhone);
  },

  // Set pending naming state for ambiguous doc or photo
  setPendingDocNaming(userPhone: string, docId: string): void {
    cacheService.setPendingDocNaming(userPhone, docId);
  },

  // Get pending doc naming docId if set within last 15 minutes
  getPendingDocNaming(userPhone: string): string | null {
    return cacheService.getPendingDocNaming(userPhone);
  },

  // Clear pending naming
  clearPendingDocNaming(userPhone: string): void {
    cacheService.clearPendingDocNaming(userPhone);
  },

  // Update title and tags of a document
  async updateDocumentTitle(docId: string, newTitle: string): Promise<void> {
    const cleanTitle = newTitle.trim().slice(0, 100);
    try {
      const { data: doc } = await supabase.from('documents').select('tags, raw_extraction').eq('id', docId).maybeSingle();
      const tags = doc?.tags || [];
      const tokens = cleanTitle.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/).filter((w) => w.length > 1);
      const newTags = Array.from(new Set([...tags, ...tokens]));

      await supabase
        .from('documents')
        .update({
          title: cleanTitle,
          tags: newTags,
          raw_extraction: { ...(doc?.raw_extraction || {}), title: cleanTitle, tags: newTags },
          updated_at: new Date().toISOString(),
        })
        .eq('id', docId);
    } catch (err) {
      console.warn('Error updating document title:', err);
    }
  },

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
      name: name || 'Friend',
      language: 'english',
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
  async upgradeUserPlan(userPhone: string, plan: PlanId, razorpayPaymentId?: string) {
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

  // Get all pending general reminders for a user
  async getUserGeneralReminders(userPhone: string): Promise<GeneralReminder[]> {
    const memoryMatches = inMemoryReminders.filter((r) => r.user_phone === userPhone && !r.is_sent);
    try {
      const { data } = await supabase
        .from('general_reminders')
        .select('*')
        .eq('user_phone', userPhone)
        .eq('is_sent', false)
        .order('remind_at', { ascending: true });
      if (data && data.length > 0) return data;
    } catch {
      // In-memory fallback
    }
    return memoryMatches;
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

  // Get all registered active users for daily brief and system broadcasts
  async getAllActiveUsers(): Promise<UserRecord[]> {
    try {
      const { data } = await supabase.from('users').select('*');
      if (data && data.length > 0) {
        return data as UserRecord[];
      }
    } catch {
      // In-memory fallback
    }
    return Array.from(inMemoryUsers.values());
  },

  // Get upcoming documents expiring in next N days for a user
  async getUserUpcomingDocuments(userPhone: string, daysAhead: number = 30): Promise<DocumentRecord[]> {
    const today = new Date().toISOString().split('T')[0];
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + daysAhead);
    const targetStr = targetDate.toISOString().split('T')[0];

    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('user_phone', userPhone)
        .eq('is_active', true)
        .gte('expiry_date', today)
        .lte('expiry_date', targetStr)
        .order('expiry_date', { ascending: true });
      if (!error && data) return data as DocumentRecord[];
    } catch {
      // Fallback
    }
    return [];
  },

  // Get pending tasks/reminders for a user
  async getUserActiveReminders(userPhone: string): Promise<GeneralReminder[]> {
    try {
      const { data, error } = await supabase
        .from('general_reminders')
        .select('*')
        .eq('user_phone', userPhone)
        .eq('is_sent', false)
        .order('remind_at', { ascending: true })
        .limit(10);
      if (!error && data) return data as GeneralReminder[];
    } catch {
      // Fallback
    }
    return inMemoryReminders.filter((r) => r.user_phone === userPhone && !r.is_sent);
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

  // =============================================================
  // LIFE GRAPH: User Memory & Emergency Retrieval
  // =============================================================

  // Save a structured life memory (health fact, promise, school note, home fact)
  async saveUserMemory(memory: UserMemory): Promise<UserMemory> {
    const memWithMeta: UserMemory = {
      ...memory,
      id: memory.id || (await import('crypto')).randomUUID(),
      created_at: memory.created_at || new Date().toISOString(),
    };

    inMemoryUserMemories.push(memWithMeta);

    try {
      // 1. Attempt insert into user_memories table
      const { data, error } = await supabase.from('user_memories').insert(memWithMeta).select('*').single();
      if (!error && data) return data as UserMemory;
    } catch {
      // Ignore if table not created
    }

    // 2. Resilient fallback: store in documents table as SYSTEM_USER_MEMORIES
    try {
      const userList = inMemoryUserMemories.filter((m) => m.user_phone === memory.user_phone);
      const { data: existing } = await supabase
        .from('documents')
        .select('id')
        .eq('user_phone', memory.user_phone)
        .eq('title', 'SYSTEM_USER_MEMORIES')
        .maybeSingle();

      if (existing?.id) {
        await supabase
          .from('documents')
          .update({
            raw_extraction: { memories: userList },
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
      } else {
        await supabase.from('documents').insert({
          user_phone: memory.user_phone,
          storage_path: `system/memories_${memory.user_phone}.json`,
          file_name: 'user_memories.json',
          file_type: 'application/json',
          category: 'general',
          title: 'SYSTEM_USER_MEMORIES',
          raw_extraction: { memories: userList },
          is_active: false,
        });
      }
    } catch (err) {
      console.warn('User memory fallback warning:', err);
    }

    return memWithMeta;
  },

  // Get all active memories for a user (optionally filtered by category)
  async getUserMemories(userPhone: string, category?: string): Promise<UserMemory[]> {
    let list = inMemoryUserMemories.filter((m) => m.user_phone === userPhone);

    if (list.length === 0) {
      try {
        const { data } = await supabase
          .from('documents')
          .select('raw_extraction')
          .eq('user_phone', userPhone)
          .eq('title', 'SYSTEM_USER_MEMORIES')
          .maybeSingle();

        if (data?.raw_extraction?.memories && Array.isArray(data.raw_extraction.memories)) {
          const loaded = data.raw_extraction.memories as UserMemory[];
          loaded.forEach((m) => inMemoryUserMemories.push(m));
          list = loaded;
        }
      } catch {
        // Fallback
      }
    }

    if (category) {
      return list.filter((m) => m.category === category);
    }
    return list;
  },

  // Search memories matching query tokens (e.g. "WiFi password", "Papa BP dawa", "Sharma")
  async searchUserMemories(userPhone: string, query: string): Promise<UserMemory[]> {
    const list = await this.getUserMemories(userPhone);
    if (!query || !query.trim()) return list;

    const cleanTokens = query
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !['mera', 'meri', 'mere', 'kya', 'tha', 'hai', 'kaunsa', 'batana', 'batao'].includes(w));

    if (cleanTokens.length === 0) return list;

    return list.filter((m) => {
      const searchTarget = `${m.key_fact} ${m.person || ''} ${m.category} ${m.raw_text || ''}`.toLowerCase();
      return cleanTokens.some((token) => searchTarget.includes(token));
    });
  },

  // Delete memories matching query or all if "sab bhool ja"
  async deleteUserMemories(userPhone: string, query?: string): Promise<number> {
    const initialCount = inMemoryUserMemories.length;
    if (!query || query.includes('sab') || query.includes('all')) {
      for (let i = inMemoryUserMemories.length - 1; i >= 0; i--) {
        if (inMemoryUserMemories[i].user_phone === userPhone) {
          inMemoryUserMemories.splice(i, 1);
        }
      }
      try {
        await supabase.from('documents').delete().eq('user_phone', userPhone).eq('title', 'SYSTEM_USER_MEMORIES');
      } catch {}
      return initialCount - inMemoryUserMemories.length;
    }

    const matches = await this.searchUserMemories(userPhone, query);
    const matchIds = new Set(matches.map((m) => m.id));

    for (let i = inMemoryUserMemories.length - 1; i >= 0; i--) {
      if (inMemoryUserMemories[i].id && matchIds.has(inMemoryUserMemories[i].id)) {
        inMemoryUserMemories.splice(i, 1);
      }
    }

    return matches.length;
  },

  // Fast Emergency Vehicle Documents (Police checking pack: RC, Insurance, PUC)
  async getEmergencyVehicleDocs(userPhone: string): Promise<DocumentRecord[]> {
    try {
      const { data } = await supabase
        .from('documents')
        .select('*')
        .eq('user_phone', userPhone)
        .eq('is_active', true)
        .or('category.eq.vehicle,title.ilike.%rc%,title.ilike.%insurance%,title.ilike.%puc%,title.ilike.%driving%')
        .order('created_at', { ascending: false })
        .limit(6);

      return (data as DocumentRecord[]) || [];
    } catch {
      return [];
    }
  },

  // Fast Emergency Health Documents & Medical Memories (Doctor/Hospital pack)
  async getEmergencyHealthDocs(userPhone: string): Promise<{ docs: DocumentRecord[]; memories: UserMemory[] }> {
    let docs: DocumentRecord[] = [];
    try {
      const { data } = await supabase
        .from('documents')
        .select('*')
        .eq('user_phone', userPhone)
        .eq('is_active', true)
        .or('category.eq.medical,category.eq.insurance,title.ilike.%health%,title.ilike.%dr%,title.ilike.%parcha%,title.ilike.%hospital%')
        .order('created_at', { ascending: false })
        .limit(6);

      docs = (data as DocumentRecord[]) || [];
    } catch {}

    const memories = await this.getUserMemories(userPhone, 'health');
    return { docs, memories };
  },
};
