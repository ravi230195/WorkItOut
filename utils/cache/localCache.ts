// src/utils/local-cache.ts
import { logger } from "../logging";
export type CacheEntry<T> = {
    storedAtMs: number; // when stored (ms since epoch)
    value: T;           // cached value
    hintTtlMs?: number; // optional note only; NOT enforced (get uses maxAgeMs)
  };
  
  export class LocalCache {
    constructor(private prefix = "appcache", private debug = false) {}
  
    setDebug(flag: boolean) {
      this.debug = flag;
    }
  
    private prefixedKey(key: string) {
      return `${this.prefix}:${key}`;
    }
  
    get<T>(key: string, maxAgeMs: number): T | null {
      try {
        const storeKey = this.prefixedKey(key);
        const raw = localStorage.getItem(storeKey);
        if (!raw) {
          logger.info("GET (miss)", storeKey);
          return null;
        }
        const entry = JSON.parse(raw) as CacheEntry<T>;
        const ageMs = Date.now() - entry.storedAtMs;
        if (ageMs > maxAgeMs) {
          logger.info("GET (stale)", storeKey, { ageMs, maxAgeMs });
          return null;
        }
        logger.info("GET (hit)", storeKey, { ageMs, maxAgeMs });
        return entry.value;
      } catch {
        logger.info("GET (error parsing)", key);
        return null;
      }
    }
  
    set<T>(key: string, value: T, hintTtlMs?: number) {
      try {
        const storeKey = this.prefixedKey(key);
        const entry: CacheEntry<T> = { storedAtMs: Date.now(), value, hintTtlMs };
        const raw = JSON.stringify(entry);
        localStorage.setItem(storeKey, raw);
        logger.info("SET", storeKey, { bytes: raw.length, hasTTL: !!hintTtlMs });
        if (this.debug) {
            this.debugDumpValuesChunked(); // false = don't print full values, just metadata
        }
      } catch {
        logger.info("SET (failed)", key);
      }
    }
  
    remove(key: string) {
      const storeKey = this.prefixedKey(key);
      try {
        localStorage.removeItem(storeKey);
        logger.info("REMOVE", storeKey);
        if (this.debug) {
            this.debugDumpValuesChunked(); // false = don't print full values, just metadata
        }
      } catch {
        logger.info("REMOVE (failed)", storeKey);
      }
    }
  
    /** Snapshot of everything under this prefix. */
    snapshot(includeValues = false) {
      const out: Record<
        string,
        {
          storedAtMs?: number;
          ageMs?: number;
          hintTtlMs?: number;
          bytes?: number;
          value?: unknown;
          parseError?: boolean;
        }
      > = {};
      const p = `${this.prefix}:`;
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i) ?? "";
          if (!k.startsWith(p)) continue;
          const raw = localStorage.getItem(k) ?? "";
          try {
            const { storedAtMs, hintTtlMs, value } = JSON.parse(raw) as CacheEntry<unknown>;
            out[k] = {
              storedAtMs,
              hintTtlMs,
              ageMs: typeof storedAtMs === "number" ? Date.now() - storedAtMs : undefined,
              bytes: raw.length,
              ...(includeValues ? { value } : {}),
            };
          } catch {
            out[k] = { parseError: true, bytes: raw.length };
          }
        }
      } catch {
        // ignore
      }
      return out;
    }
    peek(key: string, preview = 400) {
      const storeKey = this.prefixedKey(key);
      const raw = localStorage.getItem(storeKey);
      if (!raw) {
        logger.info("PEEK (miss)", storeKey);
        return null;
      }
      try {
        const { value } = JSON.parse(raw) as CacheEntry<unknown>;
        const snap = JSON.stringify(value);
        const out = snap.length > preview ? snap.slice(0, preview) + "…(truncated)" : snap;
        logger.info("👀 [CACHE PEEK]", storeKey, out);
        return value;
      } catch {
        const out = raw.length > preview ? raw.slice(0, preview) + "…(truncated)" : raw;
        logger.info("👀 [CACHE PEEK RAW]", storeKey, out);
        return raw;
      }
    }
    
    private logChunks(label: string, data: unknown, chunkSize = 8000) {
      let s: string;
      try { s = typeof data === "string" ? data : JSON.stringify(data); }
      catch { s = String(data); }
      for (let i = 0; i < s.length; i += chunkSize) {
        const end = Math.min(i + chunkSize, s.length);
        // keep label short; Xcode sometimes truncates very long prefixes too
        logger.info(`${label} [${i}-${end}/${s.length}]`, s.slice(i, end));
      }
    }
    
    /** Print values per cache entry, chunked to avoid console truncation. */
    debugDumpValuesChunked(chunkSize = 8000) {
      const snap = this.snapshot(true); // includes values
      for (const [k, v] of Object.entries(snap)) {
        const val = (v as any).value;
        // small metadata line
        logger.info("🧾 [CACHE ENTRY]", k, {
          storedAtMs: (v as any).storedAtMs,
          ageMs: (v as any).ageMs,
          bytes: (v as any).bytes
        });
        // big value, chunked
        this.logChunks("📦 value", val, chunkSize);
      }
    }
    
  
    /** Print the whole cache (for this prefix) to the logger. */
    debugDump(includeValues = false) {
      const snap = this.snapshot(includeValues);
      const keys = Object.keys(snap);
      logger.info("🧾 [CACHE SNAPSHOT]", {
        prefix: this.prefix,
        count: keys.length,
        entries: snap,
      });
    }
  
    // remove everything under prefix (optionally by a sub-prefix suffix)
    clearPrefix(subPrefix?: string) {
      try {
        const p = subPrefix ? `${this.prefix}:${subPrefix}` : `${this.prefix}:`;
        let removed = 0;
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const k = localStorage.key(i) ?? "";
          if (k.startsWith(p)) {
            localStorage.removeItem(k);
            removed++;
          }
        }
        logger.info("CLEAR_PREFIX", p, { removed });
      } catch {
        logger.info("CLEAR_PREFIX (failed)", subPrefix ?? "");
      }
    }
  }

export const localCache = new LocalCache("workit", true); // debug on/off as you like
