import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const NEW_WEBHOOK_URL = 'https://specified-affecting-shopzilla-supplied.trycloudflare.com/webhook';
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'keepr_secure_verify_token_2026';

async function testParams() {
  const attempts = [
    { webhook_configuration: { callback_url: NEW_WEBHOOK_URL, verify_token: VERIFY_TOKEN } },
    { webhook_url: NEW_WEBHOOK_URL },
    { callback_url: NEW_WEBHOOK_URL, verify_token: VERIFY_TOKEN },
    { override_callback_uri: NEW_WEBHOOK_URL, verify_token: VERIFY_TOKEN },
  ];

  for (const payload of attempts) {
    try {
      console.log('Testing payload:', Object.keys(payload));
      const res = await axios.post(
        `https://graph.facebook.com/v20.0/${PHONE_NUMBER_ID}`,
        payload,
        { headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` } }
      );
      console.log('SUCCESS:', res.data);
      break;
    } catch (e: any) {
      console.log('Failed:', e.response?.data?.error?.message || e.message);
    }
  }
}

testParams();
