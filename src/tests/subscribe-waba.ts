import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const WABA_ID = '27328872026797430';

async function checkAndSubscribeWaba() {
  console.log('1. Checking current subscribed apps for WABA:', WABA_ID);
  try {
    const res = await axios.get(
      `https://graph.facebook.com/v20.0/${WABA_ID}/subscribed_apps`,
      {
        headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` },
      }
    );
    console.log('Current Subscribed Apps:', JSON.stringify(res.data, null, 2));
  } catch (err: any) {
    console.error('Error fetching subscribed apps:', err.response?.data || err.message);
  }

  console.log('\n2. Subscribing App to WABA...');
  try {
    const subRes = await axios.post(
      `https://graph.facebook.com/v20.0/${WABA_ID}/subscribed_apps`,
      {},
      {
        headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` },
      }
    );
    console.log('✅ Subscription Success:', JSON.stringify(subRes.data, null, 2));
  } catch (err: any) {
    console.error('Error subscribing app:', err.response?.data || err.message);
  }
}

checkAndSubscribeWaba();
