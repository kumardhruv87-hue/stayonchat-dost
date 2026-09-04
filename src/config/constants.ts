// =================================================================
// MunshiJi (stayonchat.com) - Core Constants & Business Rules
// Support: info@stayonchat.com
// =================================================================

export const BRAND = {
  name: "MunshiJi",
  displayName: "MunshiJi 🧞‍♂️",
  tagline: "Aapka Digital Munshi. Kaagaz sambhale, waqt pe yaad dilaye.",
  domain: "stayonchat.com",
  supportEmail: "info@stayonchat.com",
  supportWhatsApp: "+91-XXXXXXXXXX",
};

export interface PlanDetails {
  id: "free" | "yaad_149" | "ghar_399" | "vault_799";
  name: string;
  priceInr: number;
  period: string;
  maxFiles: number;
  maxReminders: number;
  familySeats: number;
  description: string;
  features: string[];
}

export const PLANS: Record<string, PlanDetails> = {
  free: {
    id: "free",
    name: "Free Pack",
    priceInr: 0,
    period: "Lifetime",
    maxFiles: 15,
    maxReminders: 1, // 1 free reminder trial
    familySeats: 1,
    description: "Shuruat ke liye 15 files aur instant search",
    features: [
      "15 files encrypted storage",
      "Instant WhatsApp search (0 ms)",
      "1 free reminder trial",
      "No auto-debit, no credit card required"
    ]
  },
  yaad_149: {
    id: "yaad_149",
    name: "Yaad Plan",
    priceInr: 149,
    period: "1 Saal",
    maxFiles: 50,
    maxReminders: 20,
    familySeats: 1,
    description: "Challan, penalty aur warranty lapse se mukti",
    features: [
      "50 files storage",
      "20 automated reminders / saal",
      "30, 7, aur 1 din pehle WhatsApp alert",
      "Handwritten bills aur parchas supported"
    ]
  },
  ghar_399: {
    id: "ghar_399",
    name: "Ghar Plan (Family Pack)",
    priceInr: 399,
    period: "1 Saal",
    maxFiles: 200,
    maxReminders: 999999, // Unlimited
    familySeats: 4, // 4 family members
    description: "Poore parivaar ke kaagaz ek surakshit jagah",
    features: [
      "200 files storage",
      "4 Family Seats (Maa, Papa, Spouse, Aap)",
      "Unlimited WhatsApp expiry reminders",
      "All family expiries ek hi list mein"
    ]
  },
  vault_799: {
    id: "vault_799",
    name: "Vault Plan",
    priceInr: 799,
    period: "1 Saal",
    maxFiles: 500,
    maxReminders: 999999,
    familySeats: 6,
    description: "Property, investments aur CA read-only access",
    features: [
      "500 files storage",
      "Family + CA/Advisor read-only access link",
      "Unlimited automated reminders",
      "Priority WarisPath Kit Add-on access"
    ]
  }
};

export const BUSINESS_RULES = {
  // Anti-spam rule: Max 1 upsell / offer message per 7 days per user
  UPSELL_COOLDOWN_DAYS: 7,
  
  // Expiry notification intervals (days before expiry date)
  REMINDER_DAYS_BEFORE: [30, 7, 1, 0],

  // Free trial limits
  FREE_TIER_MAX_FILES: 15,
  FREE_TRIAL_REMINDERS: 1
};
