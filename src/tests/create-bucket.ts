import { supabase } from '../db/supabase.js';

async function setupBucket() {
  console.log('Checking and creating Supabase bucket: munshiji-vault...');
  const { data: buckets, error: listErr } = await supabase.storage.listBuckets();
  console.log('Existing buckets:', buckets);

  const exists = buckets?.some(b => b.name === 'munshiji-vault');
  if (!exists) {
    console.log('Creating bucket: munshiji-vault');
    const { data, error } = await supabase.storage.createBucket('munshiji-vault', {
      public: true,
      fileSizeLimit: 52428800, // 50MB
    });
    if (error) {
      console.error('Failed to create bucket:', error.message);
    } else {
      console.log('✅ Bucket created successfully:', data);
    }
  } else {
    console.log('✅ Bucket munshiji-vault already exists!');
  }
}

setupBucket();
