import SupabaseDBRead from "./supabase-db-read";
import SupabaseDBWrite from "./supabase-db-write";

// Mix the read methods into the write class so one instance exposes both.
// (Public API remains: `supabaseAPI.method(...)` everywhere.)
class SupabaseAPIClass extends SupabaseDBWrite {}
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
applyMixins(SupabaseAPIClass, [SupabaseDBRead]);

// Small helpers you already had
export const isExerciseMappingReady = (): boolean => true;
export const getMappingStatus = () => ({
  totalMapped: 0,
  availableFrontendIds: [],
  availableDbIds: [],
});

// Export the combined instance (same name you already use)
export const supabaseAPI = new SupabaseAPIClass() as SupabaseDBWrite & SupabaseDBRead;
export type SupabaseAPI = typeof supabaseAPI;

// Re-export types so your existing imports keep working
export * from "./supabase-types";
