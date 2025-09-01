import { localCache } from "../cache/localCache";
import type { AuthUser } from "./supabase-types";
import {
  fullCacheKeyExercises,
  fullCacheKeyExercise,
  fullCacheKeyProfile,
  fullCacheKeyRoutineExercises,
  fullCacheKeyRoutineExercisesWithDetails,
  fullCacheKeyRoutineSets,
  fullCacheKeyUserRoutines,
  fullCacheKeySteps,
} from "./cache-keys";
import { logger } from "../logging";

// Config
export const SUPABASE_URL = "https://lledulwstlcejiholstu.supabase.co";
export const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxsZWR1bHdzdGxjZWppaG9sc3R1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4NzYyNjQsImV4cCI6MjA3MDQ1MjI2NH0.c8-ZOMk76dUOhWiekUks04KFAn52F3_OOvNM28ZmjdU";

// TTLs and read strategy
export const CACHE_TTL = {
  exercises: 24 * 60 * 60 * 1000, // 24h
  routines: 60 * 60 * 1000,
  routineExercises: 60 * 60 * 1000,
  routineExercisesWithDetails: 60 * 60 * 1000,
  routineSets: 60 * 60 * 1000,
  profile: 60 * 60 * 1000,
  steps: 60 * 60 * 1000,
};

export const PREFER_CACHE_ON_READ = true;

// Cache status enum
export enum CacheStatus {
  CACHE_HIT = 'CACHE_HIT',
  FRESH_FETCH = 'FRESH_FETCH'
}

export class SupabaseBase {
  protected userToken: string | null = null;

  setToken(token: string | null) {
    this.userToken = token;
    
    if (token) {
      // 🔐 [DBG] Token set - Clear cache for fresh user session
      logger.info("🔐 [DBG] Token set - Clearing cache for fresh user session");
      localCache.clearPrefix();
    } else {
      // 🔐 [DBG] Token cleared - Clear cache on sign out
      logger.info("🔐 [DBG] Token cleared - Clearing cache on sign out");
      localCache.clearPrefix();
    }
  }

  protected getHeaders(includeAuth = false, includePrefer = false, preferValue = "return=representation") {
    const headers: Record<string, string> = {
      apikey: SUPABASE_ANON_KEY,
      "Content-Type": "application/json",
    };
    if (includeAuth && this.userToken) headers.Authorization = `Bearer ${this.userToken}`;
    if (includePrefer) headers.Prefer = preferValue;
    return headers;
  }

  protected async fetchJson<T>(
    url: string,
    includeAuth = true,
    method: "GET" | "POST" | "PATCH" = "GET",
    body?: any,
    prefer?: string
  ): Promise<T> {
    const res = await fetch(url, {
      method,
      headers: this.getHeaders(includeAuth, !!prefer, prefer ?? "return=representation"),
      body: body ? JSON.stringify(body) : undefined,
    });
  
    // Read text once; needed to safely handle 204 + error payloads
    const isNoContent = res.status === 204;
    const text = isNoContent ? "" : await res.text();
  
    if (!res.ok) {
      // include server error text when present
      throw new Error(`HTTP ${res.status}: ${res.statusText}${text ? ` — ${text}` : ""}`);
    }
  
    // No content is fine (e.g., return=minimal)
    if (!text) return undefined as unknown as T;
  
    try {
      return JSON.parse(text) as T;
    } catch {
      // In rare cases Supabase might return plain text; pass it through
      return text as unknown as T;
    }
  }

  /** Read-through cache helper: serve cache if valid; on miss/TTL fetch then cache; fallback to last-known-good on network errors. */
  protected async getOrFetchAndCache<T>(
    url: string,
    cacheKey: string,
    ttlMs: number,
    includeAuth = true,
    postFilter?: (data: T) => T
  ): Promise<{ data: T; status: CacheStatus }> {  // ✅ Return data and enum status
    
    // Check cache first
    const hit = localCache.get<T>(cacheKey, ttlMs);
    if (hit != null) {
      logger.info("🔍 [CACHE ACCESS] Cache hit", cacheKey, " TTL:", ttlMs, "ms");
      
      if (postFilter) {
        const filtered = postFilter(hit);
        logger.info("🔍 [CACHE ACCESS] Post-filter applied to cache hit - Original:", (hit as any).length, "Filtered:", (filtered as any).length);
        return { data: filtered, status: CacheStatus.CACHE_HIT };  // ✅ Cache hit
      }
      return { data: hit, status: CacheStatus.CACHE_HIT };  // ✅ Cache hit
    }

    // Cache miss - fetch from network
    logger.info("🔍 [CACHE ACCESS] Cache miss - fetching from:", url);
    const data = await this.fetchJson<T>(url, includeAuth);
    
    if (postFilter) {
      const filtered = postFilter(data);
      logger.info("🔍 [CACHE ACCESS] Post-filter applied to fresh data - Original:", (data as any).length, "Filtered:", (filtered as any).length);
      localCache.set(cacheKey, filtered, ttlMs);
      return { data: filtered, status: CacheStatus.FRESH_FETCH };  // ✅ Fresh fetch
    }
    
    localCache.set(cacheKey, data, ttlMs);
    return { data, status: CacheStatus.FRESH_FETCH };  // ✅ Fresh fetch
  }

  // ---------- Auth shared ----------
  async getCurrentUser(): Promise<AuthUser> {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: this.getHeaders(true),
    });
    if (!response.ok) throw new Error(`Failed to get current user: ${response.statusText}`);
    const user = await response.json();
    return { id: user.id, email: user.email };
  }

  // ---------- Refreshers (keep cache == DB after any write) ----------
  protected async refreshRoutines(userId: string) {
    try {
      // Debug: Log who's calling this refresh function
      const stackTrace = new Error().stack;
      logger.info("🔍 [CACHE REFRESH TRIGGER] refreshRoutines called by:", stackTrace);
      logger.info("🔍 [CACHE REFRESH TRIGGER] User ID:", userId);
      
      // encode the UUID and use is.true for boolean
      const url =`${SUPABASE_URL}/rest/v1/user_routines` +`?user_id=eq.${encodeURIComponent(userId)}` +`&is_active=is.true&select=*`;
      const key = fullCacheKeyUserRoutines(userId);
      logger.info("🔍 [CACHE REFRESH TRIGGER] Cache key:", key);
      logger.info("🔍 [CACHE REFRESH TRIGGER] URL:", url);
      
      const rows = await this.fetchJson<any[]>(url, true);
      localCache.set(key, rows);
      logger.info("♻️ [CACHE REFRESH] routines", key);
      logger.info("🔍 [CACHE REFRESH COMPLETE] Routines refreshed, count:", rows.length);
    } catch (e) {
      // Do not break the UI flow if a refresh fails
      logger.warn("⚠️ [CACHE REFRESH routines] skipped due to error:", e);
      logger.info("🔍 [CACHE REFRESH ERROR] Stack trace:", new Error().stack);
    }
  }
  protected async refreshRoutineExercises(userId: string, rtId: number) {
    const stackTrace = new Error().stack;
    logger.info("🔍 [CACHE REFRESH TRIGGER] refreshRoutineExercises called by:", stackTrace);
    logger.info("🔍 [CACHE REFRESH TRIGGER] User ID:", userId, "Routine ID:", rtId);
    
    const url = `${SUPABASE_URL}/rest/v1/user_routine_exercises_data?routine_template_id=eq.${rtId}&is_active=is.true&select=*`;
    const key = fullCacheKeyRoutineExercises(userId, rtId);
    logger.info("🔍 [CACHE REFRESH TRIGGER] Cache key:", key);
    logger.info("🔍 [CACHE REFRESH TRIGGER] URL:", url);
    
    const rows = await this.fetchJson<any[]>(url, true);
    localCache.set(key, rows);
    logger.info("♻️ [CACHE REFRESH] routine exercises", key);
    logger.info("🔍 [CACHE REFRESH COMPLETE] Routine exercises refreshed, count:", rows.length);
  }
  protected async refreshRoutineExercisesWithDetails(userId: string, rtId: number) {
    const stackTrace = new Error().stack;
    logger.info("🔍 [CACHE REFRESH TRIGGER] refreshRoutineExercisesWithDetails called by:", stackTrace);
    logger.info("🔍 [CACHE REFRESH TRIGGER] User ID:", userId, "Routine ID:", rtId);
    
    const url = `${SUPABASE_URL}/rest/v1/user_routine_exercises_data?routine_template_id=eq.${rtId}&is_active=is.true&select=*,exercises(name,category)`;
    const key = fullCacheKeyRoutineExercisesWithDetails(userId, rtId);
    logger.info("🔍 [CACHE REFRESH TRIGGER] Cache key:", key);
    logger.info("🔍 [CACHE REFRESH TRIGGER] URL:", url);
    
    const raw = await this.fetchJson<any[]>(url, true);
    const flattened = raw.map((ex: any) => ({
      ...ex,
      exercise_name: ex.exercises?.name || "Unknown Exercise",
      category: ex.exercises?.category || "Unknown",
    }));
    localCache.set(key, flattened);
    logger.info("♻️ [CACHE REFRESH] routine exercises+details", key);
    logger.info("🔍 [CACHE REFRESH COMPLETE] Routine exercises+details refreshed, count:", flattened.length);
  }
  protected async refreshRoutineSets(userId: string, rtexId: number) {
    const stackTrace = new Error().stack;
    logger.info("🔍 [CACHE REFRESH TRIGGER] refreshRoutineSets called by:", stackTrace);
    logger.info("🔍 [CACHE REFRESH TRIGGER] User ID:", userId, "Routine Exercise ID:", rtexId);
    
    const url = `${SUPABASE_URL}/rest/v1/user_routine_exercises_set_data?routine_template_exercise_id=eq.${rtexId}&is_active=eq.true&order=set_order`;
    const key = fullCacheKeyRoutineSets(userId, rtexId);
    logger.info("🔍 [CACHE REFRESH TRIGGER] Cache key:", key);
    logger.info("🔍 [CACHE REFRESH TRIGGER] URL:", url);
    
    const rows = await this.fetchJson<any[]>(url, true);
    localCache.set(key, rows);
    logger.info("♻️ [CACHE REFRESH] routine sets", key);
    logger.info("🔍 [CACHE REFRESH COMPLETE] Routine sets refreshed, count:", rows.length);
  }
  protected async refreshProfile(userId: string) {
    const stackTrace = new Error().stack;
    logger.info("🔍 [CACHE REFRESH TRIGGER] refreshProfile called by:", stackTrace);
    logger.info("🔍 [CACHE REFRESH TRIGGER] User ID:", userId);
    
    const url = `${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${userId}&select=*`;
    const key = fullCacheKeyProfile(userId);
    logger.info("🔍 [CACHE REFRESH TRIGGER] Cache key:", key);
    logger.info("🔍 [CACHE REFRESH TRIGGER] URL:", url);
    
    const rows = await this.fetchJson<any[]>(url, true);
    localCache.set(key, rows);
    logger.info("♻️ [CACHE REFRESH] profile", key);
    logger.info("🔍 [CACHE REFRESH COMPLETE] Profile refreshed, count:", rows.length);
  }
  
  protected async refreshSteps(userId: string) {
    const stackTrace = new Error().stack;
    logger.info("🔍 [CACHE REFRESH TRIGGER] refreshSteps called by:", stackTrace);
    logger.info("🔍 [CACHE REFRESH TRIGGER] User ID:", userId);
    
    const url = `${SUPABASE_URL}/rest/v1/user_steps?user_id=eq.${userId}&select=goal`;
    const key = fullCacheKeySteps(userId);
    logger.info("🔍 [CACHE REFRESH TRIGGER] Cache key:", key);
    logger.info("🔍 [CACHE REFRESH TRIGGER] URL:", url);
    
    const rows = await this.fetchJson<any[]>(url, true);
    localCache.set(key, rows);
    logger.info("♻️ [CACHE REFRESH] steps", key);
    logger.info("🔍 [CACHE REFRESH COMPLETE] Steps refreshed, count:", rows.length);
  }

  // ---------- Common keys (exported so reads/writes can use) ----------
  protected keyExercises = () => fullCacheKeyExercises();
  protected keyExercise = (id: number) => fullCacheKeyExercise(id);
  protected keyUserRoutines = (userId: string) => fullCacheKeyUserRoutines(userId);
  protected keyRoutineExercises = (userId: string, rtId: number) => fullCacheKeyRoutineExercises(userId, rtId);
  protected keyRoutineExercisesWithDetails = (userId: string, rtId: number) => fullCacheKeyRoutineExercisesWithDetails(userId, rtId);
  protected keyRoutineSets = (userId: string, rtexId: number) => fullCacheKeyRoutineSets(userId, rtexId);
  protected keyProfile = (userId: string) => fullCacheKeyProfile(userId);
  protected keySteps = (userId: string) => fullCacheKeySteps(userId);
}
