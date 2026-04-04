import { createClient } from '@supabase/supabase-js';

function getEnv(name) {
  return (import.meta.env[name] || '').trim();
}

function getSupabaseConfig() {
  return {
    url: getEnv('VITE_SUPABASE_URL'),
    anonKey: getEnv('VITE_SUPABASE_ANON_KEY'),
    bucket: getEnv('VITE_SUPABASE_BUCKET') || 'focusflow-files',
  };
}

let cachedClient = null;
function getSupabaseClient() {
  if (cachedClient) return cachedClient;
  const { url, anonKey } = getSupabaseConfig();
  if (!url || !anonKey) return null;
  cachedClient = createClient(url, anonKey, {
    auth: {
      persistSession: false,
    },
  });
  return cachedClient;
}

export function isCloudStorageConfigured() {
  const { url, anonKey, bucket } = getSupabaseConfig();
  return Boolean(url && anonKey && bucket);
}

export function getFileStorageStatus() {
  return {
    mode: isCloudStorageConfigured() ? 'cloud' : 'local',
    provider: isCloudStorageConfigured() ? 'Supabase' : 'Browser local storage',
  };
}

function createStoragePath(filename) {
  const datePart = new Date().toISOString().slice(0, 10);
  const id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${datePart}/${id}-${filename}`;
}

export async function uploadFileToCloud(file, sanitizedFilename) {
  const client = getSupabaseClient();
  const { bucket } = getSupabaseConfig();
  if (!client || !bucket) {
    throw new Error('Cloud storage is not configured.');
  }

  const path = createStoragePath(sanitizedFilename);
  const uploadResult = await client.storage.from(bucket).upload(path, file, {
    upsert: false,
    contentType: file.type || 'application/octet-stream',
  });

  if (uploadResult.error) {
    throw new Error(uploadResult.error.message || 'Failed to upload file to cloud storage.');
  }

  const publicResult = client.storage.from(bucket).getPublicUrl(path);
  const publicUrl = publicResult?.data?.publicUrl || '';

  return {
    storageProvider: 'supabase',
    storagePath: path,
    data: publicUrl,
  };
}

export async function deleteCloudFile(file) {
  if (!file || file.storageProvider !== 'supabase' || !file.storagePath) {
    return;
  }

  const client = getSupabaseClient();
  const { bucket } = getSupabaseConfig();
  if (!client || !bucket) return;

  const result = await client.storage.from(bucket).remove([file.storagePath]);
  if (result.error) {
    throw new Error(result.error.message || 'Failed to delete cloud file.');
  }
}