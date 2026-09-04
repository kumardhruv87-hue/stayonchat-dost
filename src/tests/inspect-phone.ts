import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

async function inspectPhoneWebhook() {
  const res = await axios.get(
    `https://graph.facebook.com/v20.0/${PHONE_NUMBER_ID}?fields=webhook_configuration,verified_name,display_phone_number`,
    {
      headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` },
    }
  );
  console.log('Phone details & Webhook:', JSON.stringify(res.data, null, 2));
}

inspectPhoneWebhook();
