import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

async function sendHelloFromDigitalDost() {
  const url = `https://graph.facebook.com/v20.0/${PHONE_NUMBER_ID}/messages`;
  try {
    const res = await axios.post(
      url,
      {
        messaging_product: 'whatsapp',
        to: '919560931596',
        type: 'template',
        template: {
          name: 'hello_world',
          language: { code: 'en_US' },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );
    console.log('✅ Sent hello_world from DIGITAL DOST successfully:', res.data);
  } catch (err: any) {
    console.error('Error sending message:', err.response?.data || err.message);
  }
}

sendHelloFromDigitalDost();
