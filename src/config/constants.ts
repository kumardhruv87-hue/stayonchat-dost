// =================================================================
// MunshiJi (stayonchat.com) - Core Constants & Business Rules
// Support: info@stayonchat.com
// =================================================================

export const BRAND = {
  name: "DOST",
  displayName: "AI DOST 🤖✨",
  tagline: "Aapka Apna Digital Saathi — Kaagaz Locker, Smart Reminders & Ank Jyotish.",
  domain: "stayonchat.com",
  supportEmail: "info@stayonchat.com",
  supportWhatsApp: "+91-9870530066",
  botPhone: "919870530066",
};

export const REFERRAL_RULES = {
  bonusFilesPerFriend: 5,
  bonusRemindersPerFriend: 3,
  maxReferralsAllowed: 6, // Up to 30 bonus files free
};

export type PlanId = "free" | "yaad_249" | "ghar_499" | "vault_899" | "yaad_149" | "ghar_399" | "vault_799";

export interface PlanDetails {
  id: PlanId;
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
    maxFiles: 5,
    maxReminders: 1,
    familySeats: 1,
    description: "Shuruat ke liye 5 files aur instant search",
    features: [
      "5 files encrypted storage (refer karke 15 tak badhayein)",
      "Instant WhatsApp search (0 ms)",
      "1 free reminder trial",
      "Lifetime free access"
    ]
  },
  yaad_249: {
    id: "yaad_249",
    name: "Yaad Plan",
    priceInr: 249,
    period: "1 Saal",
    maxFiles: 50,
    maxReminders: 25,
    familySeats: 1,
    description: "Challan, penalty aur warranty lapse se mukti (Sirf ₹20/mahina)",
    features: [
      "50 files storage (RC, Bill, Insurance, Parcha)",
      "25 automated reminders / saal",
      "30, 7, aur 1 din pehle WhatsApp alert",
      "Subah 6 baje daily life & safety guide",
      "Saves ₹2,000+ in traffic challans and late fees"
    ]
  },
  ghar_499: {
    id: "ghar_499",
    name: "Ghar Plan (Family Pack)",
    priceInr: 499,
    period: "1 Saal",
    maxFiles: 200,
    maxReminders: 999999, // Unlimited
    familySeats: 4,
    description: "Poore parivaar ke kaagaz ek surakshit jagah (Sirf ₹41/mahina)",
    features: [
      "200 files storage",
      "4 Family Seats (Maa, Papa, Spouse, Aap)",
      "Unlimited WhatsApp expiry reminders",
      "All family expiries ek hi list mein"
    ]
  },
  vault_899: {
    id: "vault_899",
    name: "Vault Plan",
    priceInr: 899,
    period: "1 Saal",
    maxFiles: 500,
    maxReminders: 999999,
    familySeats: 6,
    description: "Property, investments aur CA read-only access (Sirf ₹75/mahina)",
    features: [
      "500 files storage",
      "Family + CA/Advisor read-only access link",
      "Unlimited automated reminders",
      "WarisPath Succession Kit Add-on"
    ]
  },
  // Backward compatibility aliases
  yaad_149: {
    id: "yaad_249",
    name: "Yaad Plan",
    priceInr: 249,
    period: "1 Saal",
    maxFiles: 50,
    maxReminders: 25,
    familySeats: 1,
    description: "Yaad Plan",
    features: []
  },
  ghar_399: {
    id: "ghar_499",
    name: "Ghar Plan",
    priceInr: 499,
    period: "1 Saal",
    maxFiles: 200,
    maxReminders: 999999,
    familySeats: 4,
    description: "Ghar Plan",
    features: []
  },
  vault_799: {
    id: "vault_899",
    name: "Vault Plan",
    priceInr: 899,
    period: "1 Saal",
    maxFiles: 500,
    maxReminders: 999999,
    familySeats: 6,
    description: "Vault Plan",
    features: []
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
