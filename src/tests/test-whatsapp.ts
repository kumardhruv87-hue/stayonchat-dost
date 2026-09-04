import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

async function checkWhatsAppCredentials() {
  console.log('Testing Meta WhatsApp Cloud API credentials...');
  try {
    const res = await axios.get(
      `https://graph.facebook.com/v20.0/${PHONE_NUMBER_ID}/phone_numbers`,
      {
        headers: {
          Authorization: `Bearer ${WHATSAPP_TOKEN}`,
        },
      }
    );
    console.log('✅ Meta API Success! Registered Phone Numbers:', JSON.stringify(res.data, null, 2));
  } catch (err: any) {
    console.error('❌ Meta API Error:', err.response?.data || err.message);
  }
}

checkWhatsAppCredentials();
