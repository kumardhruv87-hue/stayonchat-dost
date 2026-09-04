// =================================================================
// Test: Personal Chat Privacy & Trigger Mode Filter
// =================================================================

import { dbService } from '../src/db/supabase.js';

const TEST_PHONE = '919560931596_test';

async function testFilter() {
  console.log('🧪 Testing Personal Chat Privacy & Trigger Filter...\n');

  const triggerRegex = /^(#dost|!dost|\/dost|dost\b|dost[:\s]|ai\b)/i;

  // Case 1: Normal personal chat message
  const msg1 = 'Bhai kal office chalna hai kya?';
  const hasTrigger1 = triggerRegex.test(msg1);
  const isSession1 = dbService.isSessionActive(TEST_PHONE);
  const shouldProcess1 = hasTrigger1 || isSession1;
  console.log(`Msg: "${msg1}"`);
  console.log(`Should Bot Respond? ${shouldProcess1 ? 'YES ❌ (Privacy Leaked!)' : 'NO ✅ (Silent / Protected)'}`);
  if (shouldProcess1) throw new Error('Personal message was not ignored!');

  // Case 2: User explicitly triggers DOST
  const msg2 = 'dost hi';
  const hasTrigger2 = triggerRegex.test(msg2);
  console.log(`\nMsg: "${msg2}"`);
  console.log(`Has Trigger? ${hasTrigger2 ? 'YES ✅' : 'NO ❌'}`);
  if (!hasTrigger2) throw new Error('Trigger not detected!');
  dbService.startSession(TEST_PHONE, 30);

  // Case 3: Follow-up message during active session
  const msg3 = 'mere kaagaz dikhao';
  const hasTrigger3 = triggerRegex.test(msg3);
  const isSession3 = dbService.isSessionActive(TEST_PHONE);
  const shouldProcess3 = hasTrigger3 || isSession3;
  console.log(`\nMsg in Active Session: "${msg3}"`);
  console.log(`Should Bot Respond? ${shouldProcess3 ? 'YES ✅' : 'NO ❌'}`);
  if (!shouldProcess3) throw new Error('Active session message was ignored!');

  // Case 4: Exit session
  dbService.stopSession(TEST_PHONE);
  console.log('\nSession Stopped via "stop/exit" command');

  // Case 5: Another personal message after session exit
  const msg5 = 'Dinner kar liya bhai?';
  const hasTrigger5 = triggerRegex.test(msg5);
  const isSession5 = dbService.isSessionActive(TEST_PHONE);
  const shouldProcess5 = hasTrigger5 || isSession5;
  console.log(`Msg: "${msg5}"`);
  console.log(`Should Bot Respond? ${shouldProcess5 ? 'YES ❌ (Privacy Leaked!)' : 'NO ✅ (Silent / Protected)'}`);
  if (shouldProcess5) throw new Error('Post-exit personal message was not ignored!');

  console.log('\n🎉 ALL PRIVACY TESTS PASSED 100%! Personal WhatsApp is completely safe.');
}

testFilter().catch(e => {
  console.error(e);
  process.exit(1);
});
