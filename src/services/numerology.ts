// =================================================================
// Keepr (usekeepr.com) - Universal Numerology Service
// "अंक ज्योतिष विशेषज्ञ" (Universal Number Science for All Faiths)
// =================================================================

export interface NumerologyProfile {
  mulank?: number;         // Day number (1-9)
  bhagyank?: number;       // Life Path / Destiny number (1-9)
  vehicleNumber?: number;  // Vehicle plate total digit (1-9)
  mobileNumber?: number;   // Phone number total digit (1-9)
  luckyColors: string[];
  luckyDays: string[];
  strengths: string[];
  counselAdvice: string;
}

// Number characteristics (Universal, practical, non-religious)
export const NUMBER_ATTRIBUTES: Record<number, {
  ruler: string;
  theme: string;
  colors: string[];
  days: string[];
  drivingTip: string;
  workTip: string;
}> = {
  1: {
    ruler: 'Sun (सूर्य / New Beginnings & Leadership)',
    theme: 'Initiative, Self-confidence, Leadership, Dignity',
    colors: ['Golden', 'Yellow', 'Light Orange'],
    days: ['Sunday', 'Monday'],
    drivingTip: 'Over-speeding aur impatient horn bajane se bachein. Shannt dimaag se drive karein.',
    workTip: 'Naye faisle lene aur team ko guide karne ke liye behtareen urja hai.',
  },
  2: {
    ruler: 'Moon (चंद्र / Harmony & Intuition)',
    theme: 'Calmness, Cooperation, Emotional Balance, Relationships',
    colors: ['White', 'Cream', 'Light Green'],
    days: ['Monday', 'Friday'],
    drivingTip: 'Mood swings ya phone distractions se bachein. Road par focused rahein.',
    workTip: 'Partnerships aur negotiations ke liye din anukool hai.',
  },
  3: {
    ruler: 'Jupiter (गुरु / Wisdom & Growth)',
    theme: 'Knowledge, Expansion, Creativity, Good Fortune',
    colors: ['Yellow', 'Saffron', 'Purple'],
    days: ['Thursday', 'Tuesday'],
    drivingTip: 'Late night ya rush hour mein speed limit ka dhyan rakhein.',
    workTip: 'Planning, financial learning aur naye contracts sign karne ke liye shubh din.',
  },
  4: {
    ruler: 'Uranus/Rahu (Practical Discipline & Order)',
    theme: 'Hard work, Technology, Organization, Unexpected Gains',
    colors: ['Electric Blue', 'Grey', 'Brown'],
    days: ['Saturday', 'Sunday'],
    drivingTip: 'Sudden lane change ya shortcut lene se bachein. Traffic rules follow karein.',
    workTip: 'Documentation aur verification ke liye best din hai. Ek ek bill dhyan se check karein.',
  },
  5: {
    ruler: 'Mercury (बुध / Speed & Business)',
    theme: 'Versatility, Communication, Quick Action, Commerce',
    colors: ['Emerald Green', 'Turquoise', 'Light Grey'],
    days: ['Wednesday', 'Friday'],
    drivingTip: 'Gaadi chalate waqt multi-tasking bilkul na karein.',
    workTip: 'Sales, trading aur networking ke liye zabardast positive vibrations hain.',
  },
  6: {
    ruler: 'Venus (शुक्र / Wealth & Luxury)',
    theme: 'Family, Aesthetics, Comfort, Financial Stability',
    colors: ['White', 'Rose Pink', 'Baby Blue'],
    days: ['Friday', 'Tuesday'],
    drivingTip: 'Late evening drives aaramdaayak rahengi. Music volume normal rakhein.',
    workTip: 'Investments aur parivaar ke sukh-suvidha ke faisle lene ke liye behtareen din.',
  },
  7: {
    ruler: 'Neptune/Ketu (Research & Deep Insight)',
    theme: 'Analysis, Intuition, Calm Reflection, Quality',
    colors: ['Sea Green', 'Light Yellow', 'White'],
    days: ['Monday', 'Thursday'],
    drivingTip: 'Highway par thakan hone par ruk kar chai/paani lein.',
    workTip: 'Deep work, critical problems solve karne aur shodh ke liye uttam urja.',
  },
  8: {
    ruler: 'Saturn (शनि / Structure & Perseverance)',
    theme: 'Patience, Long-term Wealth, Justice, Endurance',
    colors: ['Dark Blue', 'Steel Grey', 'Black'],
    days: ['Saturday', 'Wednesday'],
    drivingTip: 'Gaadi ke tyres, brake oil aur paperwork (PUC/Insurance) hamesha update rakhein.',
    workTip: 'Shortcuts lene se bachein. Mehnat ka result lamba aur pakka milega.',
  },
  9: {
    ruler: 'Mars (मंगल / Energy & Courage)',
    theme: 'Vitality, Boldness, Execution, High Energy',
    colors: ['Coral Red', 'Crimson', 'Maroon'],
    days: ['Tuesday', 'Thursday'],
    drivingTip: 'Road rage ya kisi se race lagane se bachein. Apni lane mein shaanti se chalien.',
    workTip: 'Pending matters ko finish karne aur energy-intensive projects ke liye perfect vibration.',
  },
};

export const numerologyService = {
  // Reduce any number sum to a single digit between 1 and 9
  reduceToSingleDigit(num: number): number {
    while (num > 9) {
      num = num
        .toString()
        .split('')
        .reduce((sum, digit) => sum + parseInt(digit, 10), 0);
    }
    return num === 0 ? 9 : num;
  },

  // Calculate Mulank (मूलांक - Day of birth 1-9)
  calculateMulank(dobStr: string): number | null {
    if (!dobStr) return null;
    const match = dobStr.match(/(\d{4})-(\d{1,2})-(\d{1,2})/) || dobStr.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
    if (!match) return null;

    let day = 1;
    if (dobStr.includes('-') && dobStr.split('-')[0].length === 4) {
      // YYYY-MM-DD
      day = parseInt(dobStr.split('-')[2], 10);
    } else {
      // DD-MM-YYYY
      day = parseInt(match[1], 10);
    }

    if (isNaN(day) || day <= 0 || day > 31) return null;
    return this.reduceToSingleDigit(day);
  },

  // Calculate Bhagyank (भाग्यांक - Full DOB sum 1-9)
  calculateBhagyank(dobStr: string): number | null {
    if (!dobStr) return null;
    const digits = dobStr.replace(/\D/g, '');
    if (digits.length < 6) return null;

    const sum = digits.split('').reduce((acc, d) => acc + parseInt(d, 10), 0);
    return this.reduceToSingleDigit(sum);
  },

  // Calculate Vehicle Number Plate Vibration
  calculateVehicleNumber(plate: string): { totalDigits: number; singleDigit: number; advice: string } {
    const digits = plate.replace(/\D/g, '');
    if (!digits) {
      return { totalDigits: 0, singleDigit: 1, advice: 'General Road Safety' };
    }

    const sum = digits.split('').reduce((acc, d) => acc + parseInt(d, 10), 0);
    const singleDigit = this.reduceToSingleDigit(sum);
    const attr = NUMBER_ATTRIBUTES[singleDigit] || NUMBER_ATTRIBUTES[1];

    return {
      totalDigits: sum,
      singleDigit,
      advice: `Aapki gaadi ka mukhya anka ${singleDigit} hai (${attr.ruler}). ${attr.drivingTip}`,
    };
  },

  // Calculate Mobile Number Vibration
  calculateMobileNumber(phone: string): { totalSum: number; singleDigit: number; nature: string } {
    const digits = phone.slice(-10).replace(/\D/g, '');
    const sum = digits.split('').reduce((acc, d) => acc + parseInt(d, 10), 0);
    const singleDigit = this.reduceToSingleDigit(sum);
    const attr = NUMBER_ATTRIBUTES[singleDigit] || NUMBER_ATTRIBUTES[5];

    return {
      totalSum: sum,
      singleDigit,
      nature: `Aapka mobile number digit ${singleDigit} par vibrate karta hai. Yeh ${attr.theme} ko aakarshit karta hai.`,
    };
  },

  // Generate complete Numerology Profile
  generateProfile(dobStr?: string, carPlate?: string, mobile?: string): NumerologyProfile {
    const mulank = dobStr ? this.calculateMulank(dobStr) || 1 : 1;
    const bhagyank = dobStr ? this.calculateBhagyank(dobStr) || 1 : 1;
    const attr = NUMBER_ATTRIBUTES[mulank] || NUMBER_ATTRIBUTES[1];

    const profile: NumerologyProfile = {
      mulank,
      bhagyank,
      luckyColors: attr.colors,
      luckyDays: attr.days,
      strengths: [attr.theme],
      counselAdvice: attr.workTip,
    };

    if (carPlate) {
      const v = this.calculateVehicleNumber(carPlate);
      profile.vehicleNumber = v.singleDigit;
    }

    if (mobile) {
      const m = this.calculateMobileNumber(mobile);
      profile.mobileNumber = m.singleDigit;
    }

    return profile;
  }
};
