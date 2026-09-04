import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const WABA_ID = '27328872026797430';
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

async function checkDetails() {
  try {
    const wabaRes = await axios.get(
      `https://graph.facebook.com/v20.0/${WABA_ID}?fields=id,name,message_template_namespace`,
      { headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` } }
    );
    console.log('WABA Details:', wabaRes.data);
  } catch (e: any) {
    console.error('WABA Error:', e.response?.data || e.message);
  }
}

checkDetails();
