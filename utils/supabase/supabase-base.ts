import { localCache } from "../cache/localCache";
import type { AuthUser } from "./supabase-types";
import {
  fullCacheKeyExercises,
  fullCacheKeyProfile,
  fullCacheKeyRoutineExercises,
  fullCacheKeyRoutineExercisesWithDetails,
  fullCacheKeyRoutineSets,
  fullCacheKeyUserRoutines,
  fullCacheKeySteps,
} from "./cache-keys";

// Config
export const SUPABASE_URL = "https://lledulwstlcejiholstu.supabase.co";
export const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxsZWR1bHdzdGxjZWppaG9sc3R1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4NzYyNjQsImV4cCI6MjA3MDQ1MjI2NH0.c8-ZOMk76dUOhWiekUks04KFAn52F3_OOvNM28ZmjdU";

// TTLs and read strategy
export const CACHE_TTL = {
  exercises: 24 * 60 * 60 * 1000, // 24h
  routines: 60 * 1000,            // 60s
  routineExercises: 60 * 1000,
  routineExercisesWithDetails: 60 * 1000,
  routineSets: 60 * 1000,
  profile: 60 * 1000,
  steps: 60 * 1000,
};

export const PREFER_CACHE_ON_READ = true;

export class SupabaseBase {
  protected userToken: string | null = null;

  setToken(token: string | null) {
    this.userToken = token;
    console.log(token ? "🔐 [DBG] Token set" : "🔐 [DBG] Token cleared");
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
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`HTTP ${res.status}: ${res.statusText}. ${t}`);
    }
    return res.json();
  }

  /** Read-through cache helper: serve cache if valid; on miss/TTL fetch then cache; fallback to last-known-good on network errors. */
  protected async getOrFetchAndCache<T>(
    url: string,
    cacheKey: string,
    ttlMs: number,
    includeAuth = true
  ): Promise<T> {
    if (PREFER_CACHE_ON_READ) {
      const hit = localCache.get<T>(cacheKey, ttlMs);
      if (hit != null) {
        console.log("🗂️ [CACHE HIT]", cacheKey);
        return hit;
      }
    }
    try {
      console.log("🌐 [FETCH]", url);
      const data = await this.fetchJson<T>(url, includeAuth);
      localCache.set(cacheKey, data); // write-through after read
      console.log("🗂️ [CACHE WRITE] →", cacheKey);
      return data;
    } catch (err) {
      const fallback = localCache.get<T>(cacheKey, Number.MAX_SAFE_INTEGER);
      if (fallback != null) {
        console.warn("⚠️ [FETCH FAIL → CACHE FALLBACK]", cacheKey, err);
        return fallback;
      }
      throw err;
    }
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
    const url = `${SUPABASE_URL}/rest/v1/user_routines?user_id=eq.${userId}&is_active=eq.true&select=*`;
    const key = fullCacheKeyUserRoutines(userId);
    const rows = await this.fetchJson<any[]>(url, true);
    localCache.set(key, rows);
    console.log("♻️ [CACHE REFRESH] routines", key);
  }
  protected async refreshRoutineExercises(userId: string, rtId: number) {
    const url = `${SUPABASE_URL}/rest/v1/user_routine_exercises_data?routine_template_id=eq.${rtId}&select=*`;
    const key = fullCacheKeyRoutineExercises(userId, rtId);
    const rows = await this.fetchJson<any[]>(url, true);
    localCache.set(key, rows);
    console.log("♻️ [CACHE REFRESH] routine exercises", key);
  }
  protected async refreshRoutineExercisesWithDetails(userId: string, rtId: number) {
    const url = `${SUPABASE_URL}/rest/v1/user_routine_exercises_data?routine_template_id=eq.${rtId}&select=*,exercises(name,category)`;
    const key = fullCacheKeyRoutineExercisesWithDetails(userId, rtId);
    const raw = await this.fetchJson<any[]>(url, true);
    const flattened = raw.map((ex: any) => ({
      ...ex,
      exercise_name: ex.exercises?.name || "Unknown Exercise",
      category: ex.exercises?.category || "Unknown",
    }));
    localCache.set(key, flattened);
    console.log("♻️ [CACHE REFRESH] routine exercises+details", key);
  }
  protected async refreshRoutineSets(userId: string, rtexId: number) {
    const url = `${SUPABASE_URL}/rest/v1/user_routine_exercises_set_data?routine_template_exercise_id=eq.${rtexId}&is_active=eq.true&order=set_order`;
    const key = fullCacheKeyRoutineSets(userId, rtexId);
    const rows = await this.fetchJson<any[]>(url, true);
    localCache.set(key, rows);
    console.log("♻️ [CACHE REFRESH] routine sets", key);
  }
  protected async refreshProfile(userId: string) {
    const url = `${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${userId}&select=*`;
    const key = fullCacheKeyProfile(userId);
    const rows = await this.fetchJson<any[]>(url, true);
    localCache.set(key, rows);
    console.log("♻️ [CACHE REFRESH] profile", key);
  }
  protected async refreshSteps(userId: string) {
    const url = `${SUPABASE_URL}/rest/v1/user_steps?user_id=eq.${userId}&select=goal`;
    const key = fullCacheKeySteps(userId);
    const rows = await this.fetchJson<any[]>(url, true);
    localCache.set(key, rows);
    console.log("♻️ [CACHE REFRESH] steps", key);
  }

  // ---------- Common keys (exported so reads/writes can use) ----------
  protected keyExercises = () => fullCacheKeyExercises();
  protected keyUserRoutines = (userId: string) => fullCacheKeyUserRoutines(userId);
  protected keyRoutineExercises = (userId: string, rtId: number) => fullCacheKeyRoutineExercises(userId, rtId);
  protected keyRoutineExercisesWithDetails = (userId: string, rtId: number) =>
    fullCacheKeyRoutineExercisesWithDetails(userId, rtId);
  protected keyRoutineSets = (userId: string, rtexId: number) => fullCacheKeyRoutineSets(userId, rtexId);
  protected keyProfile = (userId: string) => fullCacheKeyProfile(userId);
  protected keySteps = (userId: string) => fullCacheKeySteps(userId);
}
