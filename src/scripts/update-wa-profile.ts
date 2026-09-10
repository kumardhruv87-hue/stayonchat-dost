// =================================================================
// RoasSiren - Direct WhatsApp Business Profile & Logo Sync CLI
// Run via: npm run update:wa-profile
// =================================================================

import dotenv from 'dotenv';
dotenv.config();

import { whatsappProfileService } from '../services/whatsapp-profile.service.js';

async function main() {
  console.log('🚨 [RoasSiren] Starting WhatsApp Business Profile & Logo Sync on Meta...');

  // 1. Update text metadata
  console.log('1️⃣ Updating About, Description, Websites, Email & Category...');
  const textResult = await whatsappProfileService.updateProfile();
  console.log('Text Update Result:', textResult);

  // 2. Update profile picture / logo
  console.log('2️⃣ Uploading and setting RoasSiren official logo...');
  const logoResult = await whatsappProfileService.updateProfilePicture();
  console.log('Logo Update Result:', logoResult);

  // 3. Read back verified profile & display name
  console.log('3️⃣ Fetching live verified profile & display name from Meta Graph API...');
  const live = await whatsappProfileService.getProfile();
  const phone = await whatsappProfileService.getPhoneDetails();
  console.log('Live Meta Profile:', JSON.stringify(live, null, 2));
  console.log('Live Meta Phone & Display Name:', JSON.stringify(phone, null, 2));

  console.log('✅ [RoasSiren] WhatsApp Profile, Name & Logo Sync Complete!');
}

main().catch((err) => {
  console.error('Fatal error during sync:', err);
  process.exit(1);
});
