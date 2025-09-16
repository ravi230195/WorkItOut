import { SupabaseBase, SUPABASE_URL, CACHE_TTL } from "./supabase-base";
import type { UserRoutine, UserRoutineExercise, UserRoutineExerciseSet, Profile, Workout, WorkoutExercise, Set, BodyMeasurement } from "./supabase-types";
import { logger } from "../logging";
import { performanceTimer } from "../performanceTimer";

type OAuthProvider = "Apple" | "Google";
type OAuthProviderSlug = Lowercase<OAuthProvider>;

type ListenerHandle = { remove: () => Promise<void> | void };

const SUPPORTED_OAUTH_PROVIDERS = new Set<OAuthProviderSlug>(["apple", "google"]);

type ProviderConfig = {
    queryParams?: Record<string, string>;
};

const OAUTH_PROVIDER_CONFIG: Record<OAuthProviderSlug, ProviderConfig> = {
    google: {
        queryParams: {
            access_type: "offline",
            prompt: "consent",
        },
    },
    apple: {
        queryParams: {
            // Apple only returns the user's full name and email on the very first
            // authorization unless we request them explicitly. Send both scope keys
            // because GoTrue historically accepted either "scope" or "scopes".
            scope: "name email",
            scopes: "name email",
        },
    },
};

const NATIVE_PROTOCOLS = new Set(["capacitor:", "ionic:", "ms-appx:", "ms-appx-web:"]); 
const HTTP_PROTOCOLS = new Set(["http:", "https:"]); 
const BLOCKED_REDIRECT_PROTOCOLS = new Set(["javascript:", "vbscript:", "data:"]);
const CUSTOM_SCHEME_PATTERN = /^[a-z][a-z0-9+\-.]*:$/i;

const coerceString = (value: unknown): string | null => {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
};

const readConfiguredOAuthRedirect = (): string | null => {
    if (typeof import.meta !== "undefined") {
        const candidate = coerceString((import.meta as any)?.env?.VITE_SUPABASE_OAUTH_REDIRECT);
        if (candidate) return candidate;
    }

    if (typeof process !== "undefined" && typeof process.env === "object") {
        const candidate = coerceString((process.env as Record<string, string | undefined>).VITE_SUPABASE_OAUTH_REDIRECT);
        if (candidate) return candidate;
    }

    if (typeof globalThis !== "undefined") {
        const candidate = coerceString((globalThis as any).VITE_SUPABASE_OAUTH_REDIRECT);
        if (candidate) return candidate;
    }

    return null;
};

const normalizeRedirectUrl = (url: string, sourceLabel: string): string => {
    try {
        const parsed = new URL(url);
        const protocol = parsed.protocol?.toLowerCase();

        if (!protocol || !CUSTOM_SCHEME_PATTERN.test(protocol)) {
            throw new Error();
        }

        if (BLOCKED_REDIRECT_PROTOCOLS.has(protocol)) {
            throw new Error();
        }

        parsed.hash = "";
        return parsed.toString();
    } catch {
        throw new Error(
            `${sourceLabel} must be an absolute URL that uses http(s) or a custom app scheme like myapp://auth. Update it before retrying.`
        );
    }
};

const resolveOAuthRedirectTarget = (explicit?: string): string => {
    const direct = coerceString(explicit);
    if (direct) {
        return direct;
    }

    const configured = readConfiguredOAuthRedirect();
    if (configured) {
        return normalizeRedirectUrl(configured, "VITE_SUPABASE_OAUTH_REDIRECT");
    }

    if (typeof window === "undefined") {
        throw new Error(
            "Supabase OAuth needs a browser context to determine redirect_to. Set VITE_SUPABASE_OAUTH_REDIRECT to a web URL that you've whitelisted under Authentication → URL Configuration in Supabase."
        );
    }

    const { protocol, origin, pathname, search } = window.location;
    const normalizedProtocol = protocol?.toLowerCase() ?? "";
    const candidate = `${origin}${pathname}${search}`;

    try {
        return normalizeRedirectUrl(candidate, "window.location");
    } catch (error) {
        if (NATIVE_PROTOCOLS.has(normalizedProtocol)) {
            throw new Error(
                "Set VITE_SUPABASE_OAUTH_REDIRECT to your app's deep link (for example capacitor://localhost/auth/callback) and whitelist it under Supabase Authentication → URL Configuration so native builds can complete the OAuth hand-off."
            );
        }

        throw error instanceof Error ? error : new Error(String(error));
    }
};

const dispatchAuthEvent = <T>(eventName: string, detail: T) => {
    if (typeof window === "undefined" || typeof window.dispatchEvent !== "function") return;
    window.dispatchEvent(new CustomEvent(eventName, { detail }));
};

const dispatchAuthSuccess = (provider: OAuthProvider, token: string, refreshToken: string) => {
    const providerSlug = provider.toLowerCase() as OAuthProviderSlug;
    dispatchAuthEvent("auth-success", { provider, providerSlug, token, refreshToken });
};

const dispatchAuthError = (provider: OAuthProvider, message: string) => {
    const providerSlug = provider.toLowerCase() as OAuthProviderSlug;
    dispatchAuthEvent("auth-error", { provider, providerSlug, message });
};

const dispatchAuthCancelled = (provider: OAuthProvider) => {
    const providerSlug = provider.toLowerCase() as OAuthProviderSlug;
    dispatchAuthEvent("auth-cancelled", { provider, providerSlug });
};

const ensureNativeRedirectScheme = (url: string): string => {
    const parsed = new URL(url);
    const protocol = parsed.protocol?.toLowerCase() ?? "";

    if (HTTP_PROTOCOLS.has(protocol)) {
        throw new Error(
            "Native social sign-in requires a custom deep link redirect (for example workouttracker://auth/callback). Update VITE_SUPABASE_OAUTH_REDIRECT or pass a redirectTo that uses your app's scheme before trying again."
        );
    }

    return parsed.toString();
};

const createRedirectMatcher = (redirectUrl: string) => {
    const normalizedPrefix = redirectUrl.toLowerCase();
    const prefixLength = redirectUrl.length;

    return (candidate: string): boolean => {
        if (typeof candidate !== "string" || candidate.length < prefixLength) {
            return false;
        }

        return candidate.slice(0, prefixLength).toLowerCase() === normalizedPrefix;
    };
};

const formatOAuthErrorMessage = (provider: OAuthProvider, rawMessage?: string | null): string => {
    const fallback = `We couldn't finish signing you in with ${provider}. Please try again.`;
    if (!rawMessage) return fallback;

    const normalized = rawMessage.toLowerCase();

    if (provider === "Apple" && (normalized.includes("invalid_scope") || normalized.includes("missing scope"))) {
        return "Apple sign-in requires the name and email scopes. Enable them in Supabase's Apple provider settings and try again.";
    }

    if (normalized.includes("provider is not enabled")) {
        return `${provider} sign-in isn't configured yet. Enable it in Supabase and try again.`;
    }

    if (normalized === "access_denied" || normalized.includes("access denied")) {
        return "The sign-in flow was canceled before completion.";
    }

    return rawMessage;
};

export class SupabaseDBWrite extends SupabaseBase {
    // Auth
    async signInWithOAuth(provider: OAuthProvider, redirectTo?: string): Promise<void> {
        if (typeof window === "undefined") {
            throw new Error("Social sign-in can only be initiated in a browser environment.");
        }

        const providerSlug = provider.toLowerCase() as OAuthProviderSlug;
        if (!SUPPORTED_OAUTH_PROVIDERS.has(providerSlug)) {
            throw new Error(`Unsupported OAuth provider: ${provider}`);
        }

        const capacitor = (window as any).Capacitor;
        const isNativePlatform =
            !!capacitor && typeof capacitor.isNativePlatform === "function" && capacitor.isNativePlatform();
        const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : "";
        const isIOSSimulator = /iphone/i.test(userAgent) && /safari/i.test(userAgent) && !isNativePlatform;
        const shouldUseMobileFlow = isNativePlatform || isIOSSimulator;
        
        const redirectUrl = shouldUseMobileFlow 
            ? 'workouttracker://auth/callback'
            : resolveOAuthRedirectTarget(redirectTo);
        const params = new URLSearchParams({
            provider: providerSlug,
            redirect_to: redirectUrl
        });

        const providerConfig = OAUTH_PROVIDER_CONFIG[providerSlug];
        if (providerConfig?.queryParams) {
            for (const [key, value] of Object.entries(providerConfig.queryParams)) {
                if (typeof value === "string" && value.length > 0) {
                    params.set(key, value);
                }
            }
        }

        const authUrl = `${SUPABASE_URL}/auth/v1/authorize?${params.toString()}`;

        // Check if we're in a Capacitor environment (mobile app)
        console.log('Platform check:', { 
            hasCapacitor: !!(window as any).Capacitor, 
            isNativePlatform,
            isIOSSimulator,
            shouldUseMobileFlow,
            redirectUrl,
            queryParams: providerConfig?.queryParams ?? null,
        });
        
        if (shouldUseMobileFlow) {
            try {
                const { Browser } = await import('@capacitor/browser');
                const { App } = await import('@capacitor/app');
                
                // Listen for the deep link redirect
                const urlListener = await App.addListener('appUrlOpen', async (event) => {
                    console.log('Deep link received:', event.url);
                    
                    // Handle workouttracker://auth/callback URLs
                    if (event.url.startsWith('workouttracker://auth/callback')) {
                        try {
                            const url = new URL(event.url);
                            const hash = url.hash.substring(1); // Remove the # from the fragment
                            const params = new URLSearchParams(hash);
                            
                            const accessToken = params.get('access_token');
                            const refreshToken = params.get('refresh_token');
                            const error = params.get('error');
                            
                            if (error) {
                                console.error('OAuth error:', error);
                                return;
                            }
                            
                            if (accessToken) {
                                console.log('OAuth success! Access token received');
                                // Store the session directly
                                this.setToken(accessToken);
                                
                                // Close the browser
                                try {
                                    await Browser.close();
                                } catch (err) {
                                    console.warn('Failed to close browser:', err);
                                }
                                
                                // Trigger auth success callback
                                window.dispatchEvent(new CustomEvent('auth-success', { 
                                    detail: { 
                                        token: accessToken, 
                                        refreshToken: refreshToken 
                                    } 
                                }));
                                
                                urlListener.remove();
                            }
                        } catch (err) {
                            console.error('Error parsing OAuth response:', err);
                        }
                    }
                });

                // Open OAuth URL in browser
                await Browser.open({ url: authUrl });
            } catch (importError) {
                console.warn('Capacitor plugins not available, falling back to window.location:', importError);
                // Fallback to window.location if Capacitor plugins aren't available
                window.location.assign(authUrl);
            }
        } else {
            // Fallback for web browsers
            window.location.assign(authUrl);
        }
    }

    async exchangeCodeForSession(code: string): Promise<void> {
        try {
            const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=pkce`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    code,
                    code_verifier: 'your-code-verifier', // You'll need to implement PKCE properly
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to exchange code for session');
            }

            const data = await response.json();
            
            // Store the session
            if (data.access_token) {
                this.setToken(data.access_token);
                // Trigger auth success callback
                window.dispatchEvent(new CustomEvent('auth-success', {
                    detail: {
                        provider: "Google" as OAuthProvider,
                        providerSlug: "google" as OAuthProviderSlug,
                        token: data.access_token,
                        refreshToken: data.refresh_token
                    }
                }));
            }
        } catch (error) {
            console.error('Error exchanging code for session:', error);
            throw error;
        }
    }

    async signUp(email: string, password: string): Promise<{ token?: string; refresh_token?: string; needsSignIn?: boolean }> {
        return performanceTimer.timeAsync(
            `[SUPABASE] signUp(${email})`,
            async () => {
                const data = await this.fetchJson<any>(
                    `${SUPABASE_URL}/auth/v1/signup`,
                    false,
                    "POST",
                    { email, password }
                );
                if (data.error) throw new Error(data.error.message);
                if (data.access_token || data.session?.access_token) {
                    return { 
                        token: data.access_token || data.session!.access_token,
                        refresh_token: data.refresh_token || data.session?.refresh_token
                    };
                }
                return { needsSignIn: true };
            }
        );
    }

    async signIn(email: string, password: string): Promise<{ access_token: string; refresh_token: string }> {
        return performanceTimer.timeAsync(
            `[SUPABASE] signIn(${email})`,
            async () => {
                const data = await this.fetchJson<any>(
                    `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
                    false,
                    "POST",
                    { email, password }
                );
                if (data.error) throw new Error(data.error.message);
                if (!data.access_token) throw new Error("No access token received");
                if (!data.refresh_token) throw new Error("No refresh token received");
                
                return { 
                    access_token: data.access_token, 
                    refresh_token: data.refresh_token 
                };
            }
        );
    }

    async refreshToken(refreshToken: string): Promise<string> {
        return performanceTimer.timeAsync(
            `[SUPABASE] refreshToken`,
            async () => {
                const data = await this.fetchJson<any>(
                    `${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`,
                    false,
                    "POST",
                    { refresh_token: refreshToken }
                );
                
                if (data.error) throw new Error(data.error.message);
                if (!data.access_token) throw new Error("No access token received");
                
                return data.access_token;
            }
        );
    }

    async signOut(): Promise<void> {
        return performanceTimer.timeAsync(
            `[SUPABASE] signOut`,
            async () => {
                try {
                    // Only attempt logout if we have a token
                    if (this.userToken) {
                        await this.fetchJson(`${SUPABASE_URL}/auth/v1/logout`, true, "POST");
                    }
                } catch (error) {
                    // Log the error but don't throw - we still want to clear local state
                    logger.warn("Supabase logout failed, but continuing with local sign out:", error);
                } finally {
                    // Always clear local token state
                    this.setToken(null);
                }
            }
        );
    }

    // Routines
    async createUserRoutine(name: string): Promise<UserRoutine | null> {
        return performanceTimer.timeAsync(
            `[SUPABASE] createUserRoutine(${name})`,
            async () => {
                const userId = await this.getUserId();
                const rows = await this.fetchJson<UserRoutine[]>(
                    `${SUPABASE_URL}/rest/v1/user_routines`,
                    true,
                    "POST",
                    { user_id: userId, name: name.trim(), version: 1, is_active: true, exercise_count: 0 },
                    "return=representation"
                );
                await this.refreshRoutines(userId);
                return rows[0] ?? null;
            }
        );
    }

    // supabase-db-write.ts
    async renameRoutine(routineTemplateId: number, newName: string): Promise<void> {
        return performanceTimer.timeAsync(
            `[SUPABASE] renameRoutine(${routineTemplateId}, ${newName})`,
            async () => {
                const userId = await this.getUserId();

                await this.fetchJson(
                    `${SUPABASE_URL}/rest/v1/user_routines?routine_template_id=eq.${routineTemplateId}`,
                    true, "PATCH", { name: newName.trim() }, "return=representation"
                    // ask PostgREST to return the updated row (avoids 204)
                );
                await this.refreshRoutines(userId);
            }
        );
    }


    async deleteRoutine(routineTemplateId: number): Promise<void> {
        return performanceTimer.timeAsync(
            `[SUPABASE] deleteRoutine(${routineTemplateId})`,
            async () => {
                const userId = await this.getUserId();
                await this.fetchJson(
                    `${SUPABASE_URL}/rest/v1/user_routines?routine_template_id=eq.${routineTemplateId}`,
                    true, "PATCH", { is_active: false }, "return=representation");
                await this.refreshRoutines(userId);
            }
        );
    }

    async hardDeleteRoutine(routineTemplateId: number): Promise<void> {
        return performanceTimer.timeAsync(
            `[SUPABASE] hardDeleteRoutine(${routineTemplateId})`,
            async () => {
                const userId = await this.getUserId();

                // Load all exercises for this routine (prefer cache)
                const exercisesUrl = `${SUPABASE_URL}/rest/v1/user_routine_exercises_data?routine_template_id=eq.${routineTemplateId}&is_active=is.true&select=routine_template_exercise_id`;
                const exercisesKey = this.keyRoutineExercises(userId, routineTemplateId);
                logger.db("🔍 [DELETE ROUTINE] Cache key:", exercisesKey)
                const { data: exercises } = await this.getOrFetchAndCache<
                    Array<{ routine_template_exercise_id: number }>
                >(exercisesUrl, exercisesKey, CACHE_TTL.routineExercises, true);
                // Delegate deletion of each exercise (and its sets)
                for (const { routine_template_exercise_id: exId } of exercises) {
                    await this.hardDeleteRoutineExercise(exId, { skipSummaryUpdate: true });
                }

                // Delete the routine itself
                await this.fetchJson(
                    `${SUPABASE_URL}/rest/v1/user_routines?routine_template_id=eq.${routineTemplateId}`,
                    true,
                    "DELETE"
                );

                // Refresh caches for the now-removed routine
                await Promise.all([
                    this.refreshRoutines(userId),
                    this.refreshRoutineExercises(userId, routineTemplateId),
                    this.refreshRoutineExercisesWithDetails(userId, routineTemplateId),
                ]);
            }
        );
    }

    // Routine exercises and sets
    async addExerciseToRoutine(
        routineTemplateId: number,
        exerciseId: number,
        exerciseOrder: number,
        opts: { skipSummaryUpdate?: boolean } = {}
    ): Promise<UserRoutineExercise | null> {
        return performanceTimer.timeAsync(
            `[SUPABASE] addExerciseToRoutine(${routineTemplateId}, ${exerciseId}, ${exerciseOrder})`,
            async () => {
                const { skipSummaryUpdate = false } = opts;
                const userId = await this.getUserId();
                const rows = await this.fetchJson<UserRoutineExercise[]>(
                    `${SUPABASE_URL}/rest/v1/user_routine_exercises_data`,
                    true,
                    "POST",
                    { routine_template_id: routineTemplateId, exercise_id: exerciseId, exercise_order: exerciseOrder, is_active: true },
                    "return=representation"
                );
                await Promise.all([
                    this.refreshRoutineExercises(userId, routineTemplateId),
                    this.refreshRoutineExercisesWithDetails(userId, routineTemplateId),
                ]);

                if (!skipSummaryUpdate) {
                    try {
                        await this.recomputeAndSaveRoutineMuscleSummary(routineTemplateId);
                    } catch (err) {
                        logger.warn(
                            "Failed to recompute routine summary after adding exercise",
                            routineTemplateId,
                            err
                        );
                    }
                }
                return rows[0] ?? null;
            }
        );
    }

    async addExerciseSetsToRoutine(
        routineTemplateExerciseId: number,
        exerciseId: number,
        setsData: { reps: number; weight: number; set_order?: number }[]
    ): Promise<UserRoutineExerciseSet[]> {
        return performanceTimer.timeAsync(
            `[SUPABASE] addExerciseSetsToRoutine(${routineTemplateExerciseId}, ${exerciseId}, ${setsData.length} sets)`,
            async () => {
                const userId = await this.getUserId();
                const setsToInsert = setsData.map((set, index) => ({
                    routine_template_exercise_id: routineTemplateExerciseId,
                    exercise_id: exerciseId,
                    set_order: set.set_order ?? index + 1,
                    is_active: true,
                    planned_reps: set.reps > 0 ? set.reps : null,
                    planned_weight_kg: set.weight > 0 ? set.weight : null,
                }));

                const rows = await this.fetchJson<UserRoutineExerciseSet[]>(
                    `${SUPABASE_URL}/rest/v1/user_routine_exercises_set_data`,
                    true,
                    "POST",
                    setsToInsert,
                    "return=representation"
                );

                await this.refreshRoutineSets(userId, routineTemplateExerciseId);
                return rows;
            }
        );
    }

    // Helper function to find routine ID for an exercise
    private async findRoutineIdForExercise(routineTemplateExerciseId: number): Promise<number> {
        const url = `${SUPABASE_URL}/rest/v1/user_routine_exercises_data?routine_template_exercise_id=eq.${routineTemplateExerciseId}&select=routine_template_id`;
        const cacheKey = `rtex:${routineTemplateExerciseId}:routine`;
        const { data: lookup } = await this.getOrFetchAndCache<Array<{ routine_template_id: number }>>(
            url,
            cacheKey,
            CACHE_TTL.routineExercises,
            true
        );
        const routineId = lookup[0]?.routine_template_id;
        if (!routineId) {
            throw new Error(`Could not find routine ID for exercise ${routineTemplateExerciseId}`);
        }
        return routineId;
    }

    // Soft delete routine exercise (sets is_active = false)
    async deleteRoutineExercise(
        routineTemplateExerciseId: number,
        opts: { skipSummaryUpdate?: boolean } = {}
    ): Promise<void> {
        return performanceTimer.timeAsync(
            `[SUPABASE] deleteRoutineExercise(${routineTemplateExerciseId})`,
            async () => {
                const userId = await this.getUserId();
                const { skipSummaryUpdate = false } = opts;

                // Soft delete the exercise row
                await this.fetchJson(
                    `${SUPABASE_URL}/rest/v1/user_routine_exercises_data?routine_template_exercise_id=eq.${routineTemplateExerciseId}`,
                    true,
                    "PATCH",
                    { is_active: false },
                    "return=minimal"
                );

                // Also soft delete all associated sets
                await this.fetchJson(
                    `${SUPABASE_URL}/rest/v1/user_routine_exercises_set_data?routine_template_exercise_id=eq.${routineTemplateExerciseId}`,
                    true,
                    "PATCH",
                    { is_active: false },
                    "return=minimal"
                );

                const routineId = await this.findRoutineIdForExercise(routineTemplateExerciseId);

                // Refresh the data
                await Promise.all([
                    this.refreshRoutineExercises(userId, routineId),        // Routine ID
                    this.refreshRoutineExercisesWithDetails(userId, routineId), // Routine ID
                ]);

                if (!skipSummaryUpdate) {
                    try {
                        await this.recomputeAndSaveRoutineMuscleSummary(routineId);
                    } catch (err) {
                        logger.warn(
                            "Failed to recompute routine summary after deleting exercise",
                            routineId,
                            err
                        );
                    }
                }
            }
        );
    }

    async hardDeleteRoutineExercise(
        routineTemplateExerciseId: number,
        opts: { skipSummaryUpdate?: boolean } = {}
    ): Promise<void> {
        return performanceTimer.timeAsync(
            `[SUPABASE] hardDeleteRoutineExercise(${routineTemplateExerciseId})`,
            async () => {
                const userId = await this.getUserId();
                const { skipSummaryUpdate = false } = opts;

                // Determine parent routine before deleting rows
                const routineId = await this.findRoutineIdForExercise(
                    routineTemplateExerciseId
                );

                // Load all set IDs for this exercise (prefer cache) and delete via helper
                const setsUrl = `${SUPABASE_URL}/rest/v1/user_routine_exercises_set_data?routine_template_exercise_id=eq.${routineTemplateExerciseId}&is_active=is.true&select=routine_template_exercise_set_id`;
                const setsKey = this.keyRoutineSets(userId, routineTemplateExerciseId);

                const { data: sets } = await this.getOrFetchAndCache<
                    Array<{ routine_template_exercise_set_id: number }>
                >(setsUrl, setsKey, CACHE_TTL.routineSets, true);
                for (const { routine_template_exercise_set_id: setId } of sets) {
                    await this.hardDeleteExerciseSet(setId, routineTemplateExerciseId);
                }

                // Delete the exercise row itself
                await this.fetchJson(
                    `${SUPABASE_URL}/rest/v1/user_routine_exercises_data?routine_template_exercise_id=eq.${routineTemplateExerciseId}`,
                    true,
                    "DELETE"
                );

                await Promise.all([
                    this.refreshRoutineExercises(userId, routineId),
                    this.refreshRoutineExercisesWithDetails(userId, routineId),
                ]);

                if (!skipSummaryUpdate) {
                    try {
                        await this.recomputeAndSaveRoutineMuscleSummary(routineId);
                    } catch (err) {
                        logger.warn(
                            "Failed to recompute routine summary after hard deleting exercise",
                            routineId,
                            err
                        );
                    }
                }
            }
        );
    }

    // ----- Workout flows -----
    async startWorkout(routineTemplateId: number): Promise<Workout> {
        return performanceTimer.timeAsync(
            `[SUPABASE] startWorkout(${routineTemplateId})`,
            async () => {
                const userId = await this.getUserId();
                const rows = await this.fetchJson<Workout[]>(
                    `${SUPABASE_URL}/rest/v1/workouts`,
                    true,
                    "POST",
                    { template_id: routineTemplateId, started_at: new Date().toISOString(), user_id: userId },
                    "return=representation"
                );
                return rows[0];
            }
        );
    }

    async endWorkout(workoutId: string): Promise<void> {
        return performanceTimer.timeAsync(
            `[SUPABASE] endWorkout(${workoutId})`,
            async () => {
                await this.fetchJson(
                    `${SUPABASE_URL}/rest/v1/workouts?id=eq.${workoutId}`,
                    true,
                    "PATCH",
                    { ended_at: new Date().toISOString() },
                    "return=minimal"
                );
            }
        );
    }

    async addWorkoutExercise(workoutId: string, exerciseId: number, order_index: number): Promise<WorkoutExercise> {
        return performanceTimer.timeAsync(
            `[SUPABASE] addWorkoutExercise(${workoutId}, ${exerciseId}, ${order_index})`,
            async () => {
                const rows = await this.fetchJson<WorkoutExercise[]>(
                    `${SUPABASE_URL}/rest/v1/workout_exercises`,
                    true,
                    "POST",
                    { workout_id: workoutId, exercise_id: exerciseId, order_index },
                    "return=representation"
                );
                return rows[0];
            }
        );
    }

    async addWorkoutSet(
        workoutExerciseId: string,
        set_index: number,
        reps: number,
        weight: number,
        completed_at?: string
    ): Promise<Set> {
        return performanceTimer.timeAsync(
            `[SUPABASE] addWorkoutSet(${workoutExerciseId}, ${set_index}, ${reps}, ${weight})`,
            async () => {
                const rows = await this.fetchJson<Set[]>(
                    `${SUPABASE_URL}/rest/v1/sets`,
                    true,
                    "POST",
                    { workout_exercise_id: workoutExerciseId, set_index, reps, weight, completed_at },
                    "return=representation"
                );
                return rows[0];
            }
        );
    }

    async updateWorkoutSet(
        setId: string,
        patch: Partial<Pick<Set, "reps" | "weight" | "completed_at">>
    ): Promise<Set> {
        return performanceTimer.timeAsync(
            `[SUPABASE] updateWorkoutSet(${setId})`,
            async () => {
                const rows = await this.fetchJson<Set[]>(
                    `${SUPABASE_URL}/rest/v1/sets?id=eq.${setId}`,
                    true,
                    "PATCH",
                    patch,
                    "return=representation"
                );
                return rows[0];
            }
        );
    }

    async updateExerciseSet(
        routineTemplateExerciseSetId: number,
        plannedReps?: number,
        plannedWeightKg?: number
    ): Promise<UserRoutineExerciseSet | null> {
        return performanceTimer.timeAsync(
            `[SUPABASE] updateExerciseSet(${routineTemplateExerciseSetId})`,
            async () => {
                const userId = await this.getUserId();

                // find parent rtex id to know which cache to refresh
                const lookup = await this.fetchJson<Array<{ routine_template_exercise_id: number }>>(
                    `${SUPABASE_URL}/rest/v1/user_routine_exercises_set_data?routine_template_exercise_set_id=eq.${routineTemplateExerciseSetId}&select=routine_template_exercise_id`,
                    true
                );
                const parentId = lookup[0]?.routine_template_exercise_id;

                const rows = await this.fetchJson<UserRoutineExerciseSet[]>(
                    `${SUPABASE_URL}/rest/v1/user_routine_exercises_set_data?routine_template_exercise_set_id=eq.${routineTemplateExerciseSetId}`,
                    true,
                    "PATCH",
                    {
                        planned_reps: plannedReps && plannedReps > 0 ? plannedReps : null,
                        planned_weight_kg: plannedWeightKg && plannedWeightKg > 0 ? plannedWeightKg : null,
                    },
                    "return=representation"
                );
                if (parentId) await this.refreshRoutineSets(userId, parentId);
                return rows[0] ?? null;
            }
        );
    }

    async updateExerciseSetOrder(
        routineTemplateExerciseSetId: number,
        newOrder: number
    ): Promise<void> {
        return performanceTimer.timeAsync(
            `[SUPABASE] updateExerciseSetOrder(${routineTemplateExerciseSetId}, ${newOrder})`,
            async () => {
                const userId = await this.getUserId();

                const lookup = await this.fetchJson<Array<{ routine_template_exercise_id: number }>>(
                    `${SUPABASE_URL}/rest/v1/user_routine_exercises_set_data?routine_template_exercise_set_id=eq.${routineTemplateExerciseSetId}&select=routine_template_exercise_id`,
                    true
                );
                const parentId = lookup[0]?.routine_template_exercise_id;

                await this.fetchJson(
                    `${SUPABASE_URL}/rest/v1/user_routine_exercises_set_data?routine_template_exercise_set_id=eq.${routineTemplateExerciseSetId}`,
                    true,
                    "PATCH",
                    { set_order: newOrder },
                    "return=minimal"
                );
                if (parentId) await this.refreshRoutineSets(userId, parentId);
            }
        );
    }

    async deleteExerciseSet(routineTemplateExerciseSetId: number): Promise<void> {
        return performanceTimer.timeAsync(
            `[SUPABASE] deleteExerciseSet(${routineTemplateExerciseSetId})`,
            async () => {
                const userId = await this.getUserId();

                const lookup = await this.fetchJson<Array<{ routine_template_exercise_id: number }>>(
                    `${SUPABASE_URL}/rest/v1/user_routine_exercises_set_data?routine_template_exercise_set_id=eq.${routineTemplateExerciseSetId}&select=routine_template_exercise_id`,
                    true
                );
                const parentId = lookup[0]?.routine_template_exercise_id;

                await this.fetchJson(
                    `${SUPABASE_URL}/rest/v1/user_routine_exercises_set_data?routine_template_exercise_set_id=eq.${routineTemplateExerciseSetId}`,
                    true,
                    "PATCH",
                    { is_active: false },
                    "return=minimal"
                );
                if (parentId) await this.refreshRoutineSets(userId, parentId);
            }
        );
    }

    async hardDeleteExerciseSet(
        routineTemplateExerciseSetId: number,
        routineTemplateExerciseId?: number
    ): Promise<void> {
        return performanceTimer.timeAsync(
            `[SUPABASE] hardDeleteExerciseSet(${routineTemplateExerciseSetId})`,
            async () => {
                const userId = await this.getUserId();

                let parentId = routineTemplateExerciseId;
                if (!parentId) {
                    const url = `${SUPABASE_URL}/rest/v1/user_routine_exercises_set_data?routine_template_exercise_set_id=eq.${routineTemplateExerciseSetId}&select=routine_template_exercise_id`;
                    const cacheKey = `rtexset:${routineTemplateExerciseSetId}:parent`;
                    const { data: lookup } = await this.getOrFetchAndCache<
                        Array<{ routine_template_exercise_id: number }>
                    >(url, cacheKey, CACHE_TTL.routineSets, true);
                    parentId = lookup[0]?.routine_template_exercise_id;
                }

                await this.fetchJson(
                    `${SUPABASE_URL}/rest/v1/user_routine_exercises_set_data?routine_template_exercise_set_id=eq.${routineTemplateExerciseSetId}`,
                    true,
                    "DELETE"
                );
                if (parentId) await this.refreshRoutineSets(userId, parentId);
            }
        );
    }

    // Profile write
    async upsertProfile(
        firstName: string,
        lastName: string,
        displayName: string,
        heightCm?: number,
        weightKg?: number,
        userId?: string
    ): Promise<Profile | null> {
        return performanceTimer.timeAsync(
            `[SUPABASE] upsertProfile(${displayName})`,
            async () => {
                const id = userId ?? await this.getUserId();
                const rows = await this.fetchJson<Profile[]>(
                    `${SUPABASE_URL}/rest/v1/profiles`,
                    true,
                    "POST",
                    {
                        user_id: id,
                        first_name: firstName,
                        last_name: lastName,
                        display_name: displayName,
                        height_cm: heightCm,
                        weight_kg: weightKg,
                    },
                    "resolution=merge-duplicates, return=representation"
                );
                await this.refreshProfile(id);
                return rows.length > 0 ? rows[0] : null;
            }
        );
    }

    // Steps write
    async createUserStepGoal(goal: number = 10000): Promise<number> {
        return performanceTimer.timeAsync(
            `[SUPABASE] createUserStepGoal(${goal})`,
            async () => {
                const userId = await this.getUserId();
                const rows = await this.fetchJson<{ goal: number }[]>(
                    `${SUPABASE_URL}/rest/v1/user_steps`,
                    true,
                    "POST",
                    { user_id: userId, goal },
                    "return=representation"
                );
                await this.refreshSteps(userId);
                return rows[0]?.goal ?? goal;
            }
        );
    }

    async upsertBodyMeasurement(data: Partial<BodyMeasurement> & { measured_on: string }): Promise<BodyMeasurement | null> {
        return performanceTimer.timeAsync(
            `[SUPABASE] upsertBodyMeasurement(${data.measured_on})`,
            async () => {
                const userId = await this.getUserId();
                const payload = [{ ...data, user_id: userId }];
                // Use PostgREST upsert semantics: when a measurement already exists for
                // the same user + date, the unique constraint on
                // (user_id, measured_on) will trigger and `resolution=merge-duplicates`
                // tells Supabase to update that row instead of inserting a new one.
                const rows = await this.fetchJson<BodyMeasurement[]>(
                    `${SUPABASE_URL}/rest/v1/user_body_measurements?on_conflict=user_id,measured_on`,
                    true,
                    "POST",
                    payload,
                    "resolution=merge-duplicates, return=representation"
                );
                await this.refreshBodyMeasurements(userId);
                return rows[0] ?? null;
            }
        );
    }

    async deleteBodyMeasurement(measured_on: string): Promise<void> {
        return performanceTimer.timeAsync(
            `[SUPABASE] deleteBodyMeasurement(${measured_on})`,
            async () => {
                const userId = await this.getUserId();
                await this.fetchJson(
                    `${SUPABASE_URL}/rest/v1/user_body_measurements?user_id=eq.${userId}&measured_on=eq.${measured_on}`,
                    true,
                    "DELETE"
                );
                await this.refreshBodyMeasurements(userId);
            }
        );
    }

    async recomputeAndSaveRoutineMuscleSummary(routineTemplateId: number): Promise<{
        muscle_group_summary: string | null;
        exercise_count: number;
    }> {
        return performanceTimer.timeAsync(
            `[SUPABASE] recomputeAndSaveRoutineMuscleSummary(${routineTemplateId})`,
            async () => {
                logger.db("🔍 DGB [MUSCLE SUMMARY] Starting recompute for routine:", routineTemplateId);

                // Load active exercises → muscle groups
                const urlEx =
                    `${SUPABASE_URL}/rest/v1/user_routine_exercises_data` +
                    `?routine_template_id=eq.${routineTemplateId}&is_active=eq.true` +
                    `&select=exercises(muscle_group)`;

                logger.db("🔍 DGB [MUSCLE SUMMARY] Fetching exercises from URL:", urlEx);
                const rows = await this.fetchJson<Array<{ exercises?: { muscle_group?: string } }>>(urlEx, true);
                const exerciseCount = rows.length;
                logger.db("🔍 DGB [MUSCLE SUMMARY] Found exercises:", exerciseCount);
                if (exerciseCount === 0) {
                    logger.db(
                        "🔍 DGB [MUSCLE SUMMARY] No active exercises found, clearing summary and count",
                        routineTemplateId
                    );
                }

                // Count frequency of each muscle group
                const muscleGroupCounts = new Map<string, number>();
                rows.forEach(r => {
                    const muscleGroup = (r.exercises?.muscle_group ?? "").trim();
                    if (muscleGroup) {
                        muscleGroupCounts.set(muscleGroup, (muscleGroupCounts.get(muscleGroup) || 0) + 1);
                    }
                });

                logger.db("🔍 DGB [MUSCLE SUMMARY] Muscle group counts:", Object.fromEntries(muscleGroupCounts));

                // Sort by frequency (descending) and take top 3
                const topMuscleGroups = Array.from(muscleGroupCounts.entries())
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 3)
                    .map(([group]) => group);

                logger.db("🔍 DGB [MUSCLE SUMMARY] Top 3 muscle groups:", topMuscleGroups);

                // Use NULL when no groups (avoids DB pattern/CHECK failures on empty string)
                const summary = topMuscleGroups.length ? topMuscleGroups.join(" • ") : null;
                logger.db("🔍 DGB [MUSCLE SUMMARY] Final summary:", summary);

                // Patch base table (retrying with legacy column name if needed)
                const urlPatch = `${SUPABASE_URL}/rest/v1/user_routines?routine_template_id=eq.${routineTemplateId}`;
                logger.db("🔍 DGB [MUSCLE SUMMARY] Patching routine with URL:", urlPatch);

                let patched = false;
                let lastError: unknown = null;
                try {
                    await this.fetchJson<any[]>(
                        urlPatch,
                        true,
                        "PATCH",
                        [{ muscle_group_summary: summary, exercise_count: exerciseCount }],
                        "return=representation"
                    );
                    patched = true;
                } catch (err) {
                    lastError = err;
                    logger.warn(
                        "Failed to patch routine summary with exercise_count column, attempting legacy fallback",
                        routineTemplateId,
                        err
                    );
                }

                if (!patched) {
                    try {
                        await this.fetchJson<any[]>(
                            urlPatch,
                            true,
                            "PATCH",
                            [{ muscle_group_summary: summary, exersise_count: exerciseCount }],
                            "return=representation"
                        );
                        patched = true;
                        lastError = null;
                    } catch (legacyErr) {
                        lastError = legacyErr;
                    }
                }

                if (!patched) {
                    throw lastError instanceof Error ? lastError : new Error(String(lastError));
                }

                // Refresh routines cache so UI reflects changes
                logger.db("🔍 DGB [MUSCLE SUMMARY] Refreshing routines cache...");
                const userId = await this.getUserId();
                logger.db("🔍 DGB [MUSCLE SUMMARY] User ID for cache refresh:", userId);
                await this.refreshRoutines(userId);
                logger.db("🔍 DGB [MUSCLE SUMMARY] Cache refresh completed");

                return { muscle_group_summary: summary, exercise_count: exerciseCount };
            }
        );
    }

    // Used to cleanup test user
    async deleteProfile(userId?: string): Promise<void> {
        const id = userId ?? await this.getUserId();
        await this.fetchJson(
            `${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${id}`,
            true,
            "DELETE"
        );
        await this.refreshProfile(id);
    }
    /**
     * Log a message to the database logger table
     * @param level - Log level (INFO, DEBUG, etc.)
     * @param message - Log message
     * @param args - Additional arguments
     */
    async logToDatabase(level: string, message: string, args: any[] = []): Promise<void> {
        return performanceTimer.timeAsync(
            `[SUPABASE] logToDatabase(${level})`,
            async () => {
                try {
                    const userId = await this.getUserId();
                    const logEntry = {
                        level,
                        message,
                        args: args.length > 0 ? JSON.stringify(args) : null,
                        timestamp: new Date().toISOString(),
                        user_id: userId
                    };

                    const url = `${SUPABASE_URL}/rest/v1/logger`;
                    await this.fetchJson<any[]>(
                        url,
                        true,
                        "POST",
                        [logEntry],
                        "return=minimal"
                    );
                } catch (error) {
                    // Don't log database logging errors to avoid infinite loops
                    logger.error("Failed to log to database:", error);
                }
            }
        );
    }
}


export default SupabaseDBWrite;
