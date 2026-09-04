import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const NEW_WEBHOOK_URL = 'https://specified-affecting-shopzilla-supplied.trycloudflare.com/webhook';
const VERIFY_TOKEN = 'munshiji_secure_verify_token_2026';

async function fixWebhook() {
  console.log('Attempting to update phone number webhook override directly via Graph API...');
  
  // Try 1: Delete custom webhook override from phone number
  try {
    const delRes = await axios.delete(
      `https://graph.facebook.com/v20.0/${PHONE_NUMBER_ID}/webhook`,
      { headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` } }
    );
    console.log('Delete Webhook Result:', delRes.data);
  } catch (err: any) {
    console.log('Delete attempt 1 response:', err.response?.data?.error?.message || err.message);
  }

  // Try 2: Update webhook configuration on phone number
  try {
    const postRes = await axios.post(
      `https://graph.facebook.com/v20.0/${PHONE_NUMBER_ID}`,
      {
        webhook_configuration: {
          application: NEW_WEBHOOK_URL
        }
      },
      { headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` } }
    );
    console.log('Update Webhook Result:', postRes.data);
  } catch (err: any) {
    console.log('Update attempt 2 response:', err.response?.data?.error?.message || err.message);
  }
}

fixWebhook();
