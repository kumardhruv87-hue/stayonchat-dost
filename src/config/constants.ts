// =================================================================
// RoasSiren (roassiren.com) - Core Constants & Business Rules
// Silicon Valley Grade B2B Watchdog Configuration Layer
// =================================================================

export { BRAND, type BrandConfig } from './brand.js';

export type PlanId = 
  | "starter_1999" 
  | "growth_4999" 
  | "agency_9999"
  | "free_scan"
  // Legacy aliases
  | "free" | "yaad_249" | "ghar_499" | "vault_899" | "yaad_149" | "ghar_399" | "vault_799";

export interface PlanDetails {
  id: PlanId;
  name: string;
  priceInr: number;
  period: string;
  maxMonitoredUrls: number;
  scanFrequencyMinutes: number;
  maxAlertRecipients: number;
  description: string;
  features: string[];
  // Backwards compatibility for existing user db records & tests
  maxFiles?: number;
  maxReminders?: number;
  familySeats?: number;
}

export const PLANS: Record<string, PlanDetails> = {
  free_scan: {
    id: "free_scan",
    name: "Free Diagnostic",
    priceInr: 0,
    period: "Lifetime",
    maxMonitoredUrls: 1,
    scanFrequencyMinutes: 60,
    maxAlertRecipients: 1,
    maxFiles: 15,
    maxReminders: 1,
    familySeats: 1,
    description: "Instant one-off Shopify & ad destination health check",
    features: [
      "Instant real-time stock & HTTP status scan",
      "Full variant availability breakdown",
      "ROAS burn calculation",
      "1 ad URL WhatsApp alert test"
    ]
  },
  starter_1999: {
    id: "starter_1999",
    name: "Starter D2C",
    priceInr: 1999,
    period: "1 Month",
    maxMonitoredUrls: 15,
    scanFrequencyMinutes: 15,
    maxAlertRecipients: 1,
    maxFiles: 50,
    maxReminders: 25,
    familySeats: 1,
    description: "For emerging D2C brands spending ₹50k–₹3L / mo on Meta ads",
    features: [
      "Up to 15 active ad landing page URLs monitored 24/7",
      "15-minute background automated scan frequency",
      "Instant 60-second WhatsApp Siren to Founder / Media Buyer",
      "Broken link (404/redirect) & Out-of-Stock detection",
      "Zero Shopify app install required (100% native)",
      "Saves ~₹25,000+ in monthly wasted ad spend"
    ]
  },
  growth_4999: {
    id: "growth_4999",
    name: "Growth Brand",
    priceInr: 4999,
    period: "1 Month",
    maxMonitoredUrls: 50,
    scanFrequencyMinutes: 5,
    maxAlertRecipients: 3,
    maxFiles: 200,
    maxReminders: 999999,
    familySeats: 4,
    description: "For scaling D2C brands spending ₹3L–₹25L / mo on Meta & Google ads",
    features: [
      "Up to 50 active ad landing page URLs monitored",
      "Ultra-fast 5-minute autonomous scan frequency",
      "Multi-buyer sirens: WhatsApp alerts to up to 3 team members",
      "Variant-level inventory exhaustion alerts (e.g. Size M Sold Out)",
      "Automatic Restock Recovery notifications",
      "Estimated monthly ad spend savings: ₹75,000+"
    ]
  },
  agency_9999: {
    id: "agency_9999",
    name: "Agency Fleet",
    priceInr: 9999,
    period: "1 Month",
    maxMonitoredUrls: 200,
    scanFrequencyMinutes: 5,
    maxAlertRecipients: 10,
    maxFiles: 500,
    maxReminders: 999999,
    familySeats: 10,
    description: "For Performance Marketing Agencies managing multiple Shopify clients",
    features: [
      "Monitor up to 200 active ad URLs across 10 client stores",
      "5-minute continuous watchdog radar",
      "Client-tagged WhatsApp siren routing",
      "Weekly Ad Waste Audit PDF reports to show agency ROI",
      "Dedicated agency Slack/WhatsApp webhook bridge",
      "Stops client churn due to burnt ad budgets"
    ]
  },

  // Legacy mappings for backwards compatibility
  free: {
    id: "free_scan",
    name: "Free Diagnostic",
    priceInr: 0,
    period: "Lifetime",
    maxMonitoredUrls: 1,
    scanFrequencyMinutes: 60,
    maxAlertRecipients: 1,
    description: "Free instant diagnostic scan",
    features: ["Instant stock & HTTP scan"]
  },
  yaad_249: {
    id: "starter_1999",
    name: "Starter D2C",
    priceInr: 1999,
    period: "1 Month",
    maxMonitoredUrls: 15,
    scanFrequencyMinutes: 15,
    maxAlertRecipients: 1,
    description: "Starter D2C",
    features: []
  },
  ghar_499: {
    id: "growth_4999",
    name: "Growth Brand",
    priceInr: 4999,
    period: "1 Month",
    maxMonitoredUrls: 50,
    scanFrequencyMinutes: 5,
    maxAlertRecipients: 3,
    description: "Growth Brand",
    features: []
  },
  vault_899: {
    id: "agency_9999",
    name: "Agency Fleet",
    priceInr: 9999,
    period: "1 Month",
    maxMonitoredUrls: 200,
    scanFrequencyMinutes: 5,
    maxAlertRecipients: 10,
    description: "Agency Fleet",
    features: []
  }
};

export const WATCHDOG_RULES = {
  DEFAULT_CHECK_INTERVAL_MINS: 15,
  MIN_CHECK_INTERVAL_MINS: 5,
  ALERT_COOLDOWN_HOURS: 4, // Don't spam repeated siren for the same URL within 4h unless state changes
  DEFAULT_ESTIMATED_DAILY_BUDGET: 3000, // ₹3,000 / adset
};

