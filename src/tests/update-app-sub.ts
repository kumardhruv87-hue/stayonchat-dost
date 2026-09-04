import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const APP_ID = '1697758974496184';
const NEW_WEBHOOK_URL = 'https://specified-affecting-shopzilla-supplied.trycloudflare.com/webhook';
const VERIFY_TOKEN = 'munshiji_secure_verify_token_2026';

async function updateAppSubscription() {
  console.log('Checking app subscriptions for App:', APP_ID);
  try {
    const res = await axios.get(
      `https://graph.facebook.com/v20.0/${APP_ID}/subscriptions`,
      { headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` } }
    );
    console.log('Current Subscriptions:', JSON.stringify(res.data, null, 2));
  } catch (err: any) {
    console.log('Error fetching app subscriptions:', err.response?.data?.error?.message || err.message);
  }

  console.log('\nUpdating Webhook on App directly...');
  try {
    const postRes = await axios.post(
      `https://graph.facebook.com/v20.0/${APP_ID}/subscriptions`,
      {
        object: 'whatsapp_business_account',
        callback_url: NEW_WEBHOOK_URL,
        verify_token: VERIFY_TOKEN,
        fields: ['messages'],
      },
      { headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` } }
    );
    console.log('Update App Subscription Success:', postRes.data);
  } catch (err: any) {
    console.log('Update failed:', err.response?.data?.error?.message || err.message);
  }
}

updateAppSubscription();
