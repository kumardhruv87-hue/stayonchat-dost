import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

async function testKeys() {
  console.log('--- Testing Gemini Key ---');
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    for (const m of ['gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-flash']) {
      try {
        const model = genAI.getGenerativeModel({ model: m });
        const res = await model.generateContent('Say hello in one word');
        console.log(`Model ${m} Success:`, res.response.text().trim());
        break;
      } catch (e: any) {
        console.log(`Model ${m} failed:`, e.message);
      }
    }
  } catch (err: any) {
    console.error('Gemini Test Error:', err.message || err);
  }

  console.log('\n--- Testing Supabase Tables ---');
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );
    const { data: users, error: errUsers } = await supabase.from('users').select('*').limit(1);
    if (errUsers) {
      console.log('Users Table NOT FOUND:', errUsers.message);
    } else {
      console.log('✅ Users Table EXISTS!');
    }

    const { data: docs, error: errDocs } = await supabase.from('documents').select('*').limit(1);
    if (errDocs) {
      console.log('Documents Table NOT FOUND:', errDocs.message);
    } else {
      console.log('✅ Documents Table EXISTS!');
    }
  } catch (err: any) {
    console.error('Supabase Test Error:', err.message || err);
  }
}

testKeys();
