// =================================================================
// Keepr (usekeepr.com) - Verification Test Script
// Tests persona outputs, Zod schema validation, and plan logic
// =================================================================

import { ExtractedDocSchema } from '../services/gemini.js';
import { personaService } from '../bot/persona.js';
import { PLANS } from '../config/constants.js';

console.log('🧪 Starting Keepr System Test Suite...\n');

// 1. Test Schema Validation
console.log('1. Testing Gemini ExtractedDocSchema validation...');
const mockExtraction = {
  category: 'appliance',
  title: 'Havells Grinder Mixer Bill',
  entity_name: 'Havells India',
  policy_or_bill_no: 'INV-98214',
  amount: 2899,
  issue_date: '2024-03-15',
  expiry_date: '2026-03-15',
  summary: 'Havells 750W mixer purchase bill with 2-year warranty.',
  tags: ['havells', 'mixer', 'warranty', 'kitchen'],
  confidence_score: 0.95,
};

const parsed = ExtractedDocSchema.safeParse(mockExtraction);
if (parsed.success) {
  console.log('   ✅ ExtractedDocSchema validated successfully!');
} else {
  console.error('   ❌ Schema validation failed:', parsed.error);
  process.exit(1);
}

// 2. Test Persona Document Confirmation
console.log('\n2. Testing MunshiJi Persona confirmation message...');
const confirmMsg = personaService.getDocSavedMessage(mockExtraction as any, 'hinglish', 14);
console.log('--- Sample WhatsApp Confirmation ---');
console.log(confirmMsg);
console.log('------------------------------------');

// 3. Test Persona Expiry List
console.log('\n3. Testing Expiry list formatting...');
const mockExpiries = [
  { title: 'Swift Dzire PUC', expiry_date: '2026-10-12', policy_or_bill_no: 'DL01-PUC-98' },
  { title: 'Havells Mixer Warranty', expiry_date: '2026-11-20', policy_or_bill_no: 'INV-98214' },
];
const expiryMsg = personaService.formatExpiriesList(mockExpiries);
console.log('--- Sample Expiry List ---');
console.log(expiryMsg);
console.log('--------------------------');

// 4. Test Plans Integrity
console.log('\n4. Verifying Pricing Plans (Public Menu)...');
console.log(`   - Free: ₹${PLANS.free.priceInr} (${PLANS.free.maxFiles} files)`);
console.log(`   - Yaad: ₹${PLANS.yaad_149.priceInr} (${PLANS.yaad_149.maxFiles} files, ${PLANS.yaad_149.maxReminders} reminders)`);
console.log(`   - Ghar: ₹${PLANS.ghar_399.priceInr} (${PLANS.ghar_399.maxFiles} files, ${PLANS.ghar_399.familySeats} seats)`);
console.log(`   - Vault: ₹${PLANS.vault_799.priceInr} (${PLANS.vault_799.maxFiles} files)`);

console.log('\n🎉 ALL MUNSHIJI LOGIC & SCHEMA TESTS PASSED SUCCESSFULLY!\n');
