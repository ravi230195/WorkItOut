import SupabaseDBRead from "./supabase-db-read";
import SupabaseDBWrite from "./supabase-db-write";

// Mix the read methods into the write class so one instance exposes both.
// (Public API remains: `supabaseAPI.method(...)` everywhere.)
class SupabaseAPI extends SupabaseDBWrite {}
interface SupabaseAPI extends SupabaseDBRead {}
function applyMixins(derivedCtor: any, baseCtors: any[]) {
  baseCtors.forEach((baseCtor) => {
    Object.getOwnPropertyNames(baseCtor.prototype).forEach((name) => {
      if (name !== "constructor") {
        Object.defineProperty(
          derivedCtor.prototype,
          name,
          Object.getOwnPropertyDescriptor(baseCtor.prototype, name) || Object.create(null)
        );
      }
    });
  });
}
applyMixins(SupabaseAPI, [SupabaseDBRead]);

// Small helpers you already had
export const isExerciseMappingReady = (): boolean => true;
export const getMappingStatus = () => ({
  totalMapped: 0,
  availableFrontendIds: [],
  availableDbIds: [],
});

// Export the combined instance (same name you already use)
export const supabaseAPI = new SupabaseAPI();

// Re-export types so your existing imports keep working
export * from "./supabase-types";