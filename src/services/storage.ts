// =================================================================
// Keepr (usekeepr.com) - Secure Storage & Encryption Service
// AES-256 GCM client-side encryption before cloud storage
// =================================================================

import crypto from 'crypto';
import { supabase } from '../db/supabase.js';

const ENCRYPTION_SECRET = process.env.ENCRYPTION_SECRET || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
const BUCKET_NAME = process.env.SUPABASE_STORAGE_BUCKET || 'keepr-vault';

// 32-byte key derived from secret
const algorithm = 'aes-256-gcm';
const key = crypto.scryptSync(ENCRYPTION_SECRET, 'keepr_salt_2026', 32);

export const storageService = {
  // Encrypt file buffer
  encryptBuffer(buffer: Buffer): { encrypted: Buffer; iv: Buffer; authTag: Buffer } {
    const iv = crypto.randomBytes(12); // GCM recommended 12-byte IV
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return { encrypted, iv, authTag };
  },

  // Decrypt file buffer
  decryptBuffer(encryptedBuffer: Buffer, iv: Buffer, authTag: Buffer): Buffer {
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(encryptedBuffer), decipher.final()]);
  },

  // Upload document to Supabase Storage
  async uploadDocument(
    userPhone: string,
    fileName: string,
    fileBuffer: Buffer,
    mimeType: string
  ): Promise<{ storagePath: string; publicUrl?: string }> {
    const timestamp = Date.now();
    const safeFileName = `${timestamp}_${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const storagePath = `${userPhone}/${safeFileName}`;

    // Try Supabase Storage first, fallback to local disk if bucket not configured
    try {
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(storagePath, fileBuffer, {
          contentType: mimeType,
          upsert: true,
        });

      if (!error) {
        const { data: signedData } = await supabase.storage
          .from(BUCKET_NAME)
          .createSignedUrl(storagePath, 3600);

        return { storagePath, publicUrl: signedData?.signedUrl };
      }
      console.warn('Supabase storage warning, falling back to local vault:', error.message);
    } catch (sErr: any) {
      console.warn('Supabase storage exception, falling back to local vault:', sErr.message);
    }

    // Local disk fallback
    const fs = await import('fs');
    const path = await import('path');
    const userDir = path.join(process.cwd(), 'vault', userPhone);
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
    const localFilePath = path.join(userDir, safeFileName);
    fs.writeFileSync(localFilePath, fileBuffer);

    return {
      storagePath: `vault/${userPhone}/${safeFileName}`,
      publicUrl: undefined,
    };
  },

  // Download document buffer from storage (supports local vault, database base64 fallback, and Supabase)
  async downloadDocument(storagePath: string): Promise<Buffer> {
    if (storagePath.startsWith('vault/')) {
      const fs = await import('fs');
      const path = await import('path');
      const localFilePath = path.join(process.cwd(), storagePath);
      if (fs.existsSync(localFilePath)) {
        return fs.readFileSync(localFilePath);
      }
    }

    // Try recovering from database backup in raw_extraction
    try {
      const { data: docData } = await supabase
        .from('documents')
        .select('raw_extraction')
        .eq('storage_path', storagePath)
        .maybeSingle();

      if (docData?.raw_extraction?.base64_data) {
        return Buffer.from(docData.raw_extraction.base64_data, 'base64');
      }
    } catch {
      // Continue to Supabase storage attempt
    }

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .download(storagePath);

    if (error || !data) {
      console.error('Storage download failed:', error);
      throw error;
    }

    const arrayBuffer = await data.arrayBuffer();
    return Buffer.from(arrayBuffer);
  },

  // Get temporary download URL for user to view/download on WhatsApp
  async getDownloadUrl(storagePath: string): Promise<string | null> {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(storagePath, 3600); // 1 hour validity

    if (error || !data) {
      console.error('Signed URL generation failed:', error);
      return null;
    }
    return data.signedUrl;
  }
};
