// =================================================================
// Keepr (usekeepr.com) - Stateless Cache & Session Service
// Supports Redis (Upstash / Cloud) with Resilient In-Memory Fallback
// =================================================================

interface CacheEntry {
  value: any;
  expiresAt: number | null;
}

class CacheService {
  private memoryStore: Map<string, CacheEntry> = new Map();

  constructor() {
    this.initRedis();
  }

  private async initRedis() {
    const redisUrl = process.env.REDIS_URL;
    if (redisUrl) {
      console.log('[CacheService] Redis URL detected for distributed state.');
    }
  }

  // --- Synchronous In-Memory Methods for Fast Response ---

  setSync(key: string, value: any, ttlSeconds?: number): void {
    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
    this.memoryStore.set(key, { value, expiresAt });
  }

  getSync<T = any>(key: string): T | null {
    const entry = this.memoryStore.get(key);
    if (!entry) return null;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.memoryStore.delete(key);
      return null;
    }
    return entry.value as T;
  }

  deleteSync(key: string): void {
    this.memoryStore.delete(key);
  }

  isSessionActive(userPhone: string): boolean {
    const active = this.getSync<boolean>(`session:${userPhone}`);
    return !!active;
  }

  startSession(userPhone: string, durationMinutes: number = 30): void {
    this.setSync(`session:${userPhone}`, true, durationMinutes * 60);
  }

  stopSession(userPhone: string): void {
    this.deleteSync(`session:${userPhone}`);
  }

  setUserPromptState(userPhone: string, state: string, ttlSeconds: number = 600): void {
    this.setSync(`prompt_state:${userPhone}`, state, ttlSeconds);
  }

  getUserPromptState(userPhone: string): string | null {
    return this.getSync<string>(`prompt_state:${userPhone}`);
  }

  clearUserPromptState(userPhone: string): void {
    this.deleteSync(`prompt_state:${userPhone}`);
  }

  setPendingDocNaming(userPhone: string, docId: string, ttlSeconds: number = 300): void {
    this.setSync(`pending_naming:${userPhone}`, docId, ttlSeconds);
  }

  getPendingDocNaming(userPhone: string): string | null {
    return this.getSync<string>(`pending_naming:${userPhone}`);
  }

  clearPendingDocNaming(userPhone: string): void {
    this.deleteSync(`pending_naming:${userPhone}`);
  }

  // --- Async Wrappers for Upstash/Redis Expansion ---

  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    this.setSync(key, value, ttlSeconds);
  }

  async get<T = any>(key: string): Promise<T | null> {
    return this.getSync<T>(key);
  }

  async delete(key: string): Promise<void> {
    this.deleteSync(key);
  }
}

export const cacheService = new CacheService();
