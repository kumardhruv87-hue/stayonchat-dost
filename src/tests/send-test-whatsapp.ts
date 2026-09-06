import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

export async function sendTestMessage(recipientPhone: string) {
  // Clean phone number: remove +, -, spaces
  const cleanPhone = recipientPhone.replace(/\D/g, '');
  console.log(`Sending MunshiJi test greeting to +${cleanPhone}...`);

  const url = `https://graph.facebook.com/v20.0/${PHONE_NUMBER_ID}/messages`;

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: cleanPhone,
    type: 'text',
    text: {
      body: `Pranam! 🙏\n\nMain hoon *Keepr 🤖* (usekeepr.com)!\n\nAapka WhatsApp bot successfully connect ho gaya hai.\n\nAb aap yahan koi bhi bill, warranty card ya RC ki photo bhej kar test kar sakte hain! 📄✨`,
    },
  };

  try {
    const res = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });
    console.log('✅ Message sent successfully! Response:', res.data);
    return res.data;
  } catch (err: any) {
    console.error('❌ Failed to send message:', JSON.stringify(err.response?.data || err.message, null, 2));
    throw err;
  }
}

// If run directly from CLI with argument
const phoneArg = process.argv[2];
if (phoneArg) {
  sendTestMessage(phoneArg);
}
