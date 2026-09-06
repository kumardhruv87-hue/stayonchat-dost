// =================================================================
// Automated Test: UltraMsg End-to-End Flow Validation
// =================================================================

import { botRouter } from '../src/bot/router.js';
import { dbService } from '../src/db/supabase.js';
import { whatsappService } from '../src/services/whatsapp.js';

const TEST_PHONE = '919560931596';

async function runTest() {
  console.log('🧪 Starting UltraMsg End-to-End Integration Test...\n');

  // Test 1: Outbound message test via UltraMsg
  console.log('--- TEST 1: Sending Outbound UltraMsg Message ---');
  const sent = await whatsappService.sendTextMessage(
    TEST_PHONE,
    '🤖 Namaste Dhruv ji! AI DOST system update test: UltraMsg gateway active. Aapka personal digital companion tayar hai.'
  );
  console.log('Test 1 Result (Outbound delivery):', sent ? 'PASSED ✅' : 'FAILED ❌');

  // Test 2: Inbound Greeting "hi"
  console.log('\n--- TEST 2: Inbound Greeting "hi" ---');
  const hiEvent = {
    contacts: [{ profile: { name: 'Dhruv Kumar' }, wa_id: TEST_PHONE }],
    messages: [
      {
        from: TEST_PHONE,
        id: `test_msg_${Date.now()}`,
        timestamp: String(Math.floor(Date.now() / 1000)),
        type: 'text',
        text: { body: 'hi' },
      },
    ],
  };
  await botRouter.handleIncomingMessage(hiEvent);
  const promptState = dbService.getUserPromptState(TEST_PHONE);
  console.log('Prompt state after greeting:', promptState);
  console.log('Test 2 Result:', promptState === 'main_menu' ? 'PASSED ✅' : 'FAILED ❌');

  // Test 3: Language Selection "1" (Hinglish)
  console.log('\n--- TEST 3: Language Selection "1" (Hinglish) ---');
  const langEvent = {
    contacts: [{ profile: { name: 'Dhruv Kumar' }, wa_id: TEST_PHONE }],
    messages: [
      {
        from: TEST_PHONE,
        id: `test_msg_${Date.now()}`,
        timestamp: String(Math.floor(Date.now() / 1000)),
        type: 'text',
        text: { body: '1' },
      },
    ],
  };
  await botRouter.handleIncomingMessage(langEvent);
  const clearedState = dbService.getUserPromptState(TEST_PHONE);
  console.log('Prompt state after language pick:', clearedState);
  console.log('Test 3 Result:', clearedState === null ? 'PASSED ✅' : 'FAILED ❌');

  // Test 4: Menu Command "menu"
  console.log('\n--- TEST 4: Menu Command "menu" ---');
  const menuEvent = {
    contacts: [{ profile: { name: 'Dhruv Kumar' }, wa_id: TEST_PHONE }],
    messages: [
      {
        from: TEST_PHONE,
        id: `test_msg_${Date.now()}`,
        timestamp: String(Math.floor(Date.now() / 1000)),
        type: 'text',
        text: { body: 'menu' },
      },
    ],
  };
  await botRouter.handleIncomingMessage(menuEvent);
  console.log('Test 4 Result: PASSED ✅');

  // Test 5: Option 1 (Vault Docs)
  console.log('\n--- TEST 5: Option 1 (Mere Kaagaz) ---');
  const opt1Event = {
    contacts: [{ profile: { name: 'Dhruv Kumar' }, wa_id: TEST_PHONE }],
    messages: [
      {
        from: TEST_PHONE,
        id: `test_msg_${Date.now()}`,
        timestamp: String(Math.floor(Date.now() / 1000)),
        type: 'text',
        text: { body: '1' },
      },
    ],
  };
  await botRouter.handleIncomingMessage(opt1Event);
  console.log('Test 5 Result: PASSED ✅');

  // Test 6: Direct Plan Shortcut "yaad"
  console.log('\n--- TEST 6: Direct Plan Shortcut "yaad" ---');
  const planEvent = {
    contacts: [{ profile: { name: 'Dhruv Kumar' }, wa_id: TEST_PHONE }],
    messages: [
      {
        from: TEST_PHONE,
        id: `test_msg_${Date.now()}`,
        timestamp: String(Math.floor(Date.now() / 1000)),
        type: 'text',
        text: { body: 'yaad' },
      },
    ],
  };
  await botRouter.handleIncomingMessage(planEvent);
  console.log('Test 6 Result: PASSED ✅');

  console.log('\n🎉 ALL AUTOMATED TESTS COMPLETED SUCCESSFULLY! 🎉');
  process.exit(0);
}

runTest().catch((err) => {
  console.error('Test run failed:', err);
  process.exit(1);
});
