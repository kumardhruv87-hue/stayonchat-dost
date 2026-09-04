import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const WABA_ID = '27328872026797430';

async function subscribeNewApp() {
  console.log('Subscribing DIGITAL DOST app to WABA:', WABA_ID);
  try {
    const res = await axios.post(
      `https://graph.facebook.com/v20.0/${WABA_ID}/subscribed_apps`,
      {},
      { headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` } }
    );
    console.log('✅ Subscription Success:', res.data);
  } catch (err: any) {
    console.error('Subscription error:', err.response?.data || err.message);
  }
}

subscribeNewApp();
