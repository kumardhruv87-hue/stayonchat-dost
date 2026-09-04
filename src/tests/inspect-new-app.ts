import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;

async function inspectNewToken() {
  console.log('Inspecting new token...');
  try {
    const res = await axios.get(`https://graph.facebook.com/v20.0/app`, {
      headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` },
    });
    console.log('✅ New App Details:', JSON.stringify(res.data, null, 2));
  } catch (err: any) {
    console.error('Error inspecting app:', err.response?.data || err.message);
  }
}

inspectNewToken();
