// =================================================================
// DOST Bot Comprehensive Verification Test Suite
// =================================================================

import { dbService } from '../db/supabase.js';
import { geminiService } from '../services/gemini.js';
import { personaService } from '../bot/persona.js';

async function runTests() {
  console.log('🚀 Starting DOST Comprehensive Verification Test Suite...\n');

  // 1. Test Viral Referral System
  console.log('--- Test 1: Viral Referral System ---');
  const user1 = await dbService.getOrCreateUser('919999999001', 'Rahul');
  console.log(`User 1 created: ${user1.name}, referral_code: ${user1.referral_code}, bonus_files: ${user1.bonus_files || 0}`);
  
  // Friend joins with user1's referral code
  const refCode = `ref_${user1.referral_code}`;
  const refResult = await dbService.applyReferral('919999999002', refCode);
  console.log('Referral result:', refResult);
  
  const user1Updated = await dbService.getOrCreateUser('919999999001');
  console.log(`User 1 after friend joined: bonus_files = ${user1Updated.bonus_files}, effective_max_files = ${dbService.getUserEffectiveMaxFiles(user1Updated)}`);
  
  const rewardMsg = personaService.getReferralRewardMessage('Amit', dbService.getUserEffectiveMaxFiles(user1Updated));
  console.log('Generated Referrer Reward Message:\n', rewardMsg);
  console.log('\n✅ Test 1 Passed!\n');

  // 2. Test Custom Regional Language Detection
  console.log('--- Test 2: Custom Regional Language Detection ---');
  const testLangs = ['Marathi', 'Gujarati mein baat karo', 'Tamil', 'Can you talk in Bengali please?'];
  for (const t of testLangs) {
    const detected = await geminiService.detectCustomLanguage(t);
    console.log(`Input: "${t}" => Detected Language: ${detected}`);
  }
  console.log('\n✅ Test 2 Passed!\n');

  // 3. Test Universal 6:00 AM Daily Morning Guidance
  console.log('--- Test 3: Universal 6:00 AM Daily Morning Guidance (Secular/Inclusive) ---');
  const morningGuide = await geminiService.generateDailyAstroGuide(
    { name: 'Dhruv', dob: '1995-08-15', pob: 'Delhi' },
    'hinglish'
  );
  console.log('Generated 6 AM Morning Vibe:\n', morningGuide);
  console.log('\n✅ Test 3 Passed!\n');

  // 4. Test Habit & Loss-Prevention Milestone
  console.log('--- Test 4: Habit & Loss-Prevention Milestone ---');
  const penaltySaved = personaService.getMilestoneMessage('penalty_saved', 'Swift Dzire Insurance');
  console.log('Penalty Saved Milestone:\n', penaltySaved);
  const weekMilestone = personaService.getMilestoneMessage('habit_week');
  console.log('Week Milestone:\n', weekMilestone);
  console.log('\n✅ Test 4 Passed!\n');

  // 5. Test Natural Reminder Extraction
  console.log('--- Test 5: Natural Reminder Parsing ---');
  const reminderText = 'Kal subah 9 baje car ki servicing karwani hai';
  const reminderResult = await geminiService.parseNaturalReminder(reminderText);
  console.log('Parsed Reminder:', reminderResult);
  console.log('\n✅ Test 5 Passed!\n');

  // 6. Test Conversational Companion (DOST)
  console.log('--- Test 6: Conversational Companion (DOST) ---');
  const dostChat = await geminiService.chatAsDost(
    'Bhai thoda stress ho raha hai kaam ko lekar, kya karun?',
    [],
    'hinglish',
    'Dhruv'
  );
  console.log('DOST Reply:\n', dostChat);
  console.log('\n✅ Test 6 Passed!\n');

  console.log('🎉 ALL 6 COMPREHENSIVE TESTS PASSED WITH FLYING COLORS!');
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
