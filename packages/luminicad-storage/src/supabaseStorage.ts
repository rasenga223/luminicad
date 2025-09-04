import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { IStorage, Logger } from "luminicad-core";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const SUPABASE_PROJECT_REF = import.meta.env.VITE_SUPABASE_PROJECT_REF;
const DEFAULT_COUNT = 20;

export class SupabaseStorage implements IStorage {
    readonly version: number = 1;
    private supabase: SupabaseClient;

    constructor() {
        const allCookies = document.cookie;
        Logger.info("All available cookies in SupabaseStorage:", allCookies);
        const hasAuthToken = document.cookie.includes(`sb-${SUPABASE_PROJECT_REF}-auth-token`);
        Logger.info(`Auth token cookie found: ${hasAuthToken}`);

        this.supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
            auth: {
                autoRefreshToken: true,
                persistSession: true,
                detectSessionInUrl: true,
                flowType: "pkce",
                storage: {
                    getItem: (key: string) => {
                        Logger.info(`Reading auth cookie: ${key}`);

                        const cookieValue =
                            document.cookie
                                .split("; ")
                                .find((row) => row.startsWith(`${key}=`))
                                ?.split("=")[1] ?? null;

                        Logger.info(`Cookie value for ${key}: ${cookieValue ? "Found" : "Not found"}`);

                        if (key === "sb-access-token" || key === "sb-refresh-token") {
                            const projectRefKey = `sb-${SUPABASE_PROJECT_REF}-auth-token`;
                            const projectRefCookie = document.cookie
                                .split("; ")
                                .find((row) => row.startsWith(`${projectRefKey}=`));

                            if (projectRefCookie) {
                                Logger.info(`Found auth cookie in SSR format: ${projectRefKey}`);

                                try {
                                    const cookieValue = projectRefCookie.split("=")[1];

                                    let jsonStr = cookieValue;
                                    if (jsonStr.startsWith("base64-")) {
                                        jsonStr = atob(jsonStr.substring(7));
                                    }

                                    const tokenData = JSON.parse(jsonStr);

                                    if (key === "sb-access-token" && tokenData.access_token) {
                                        Logger.info(`Successfully extracted access token from SSR cookie`);
                                        return tokenData.access_token;
                                    } else if (key === "sb-refresh-token" && tokenData.refresh_token) {
                                        Logger.info(`Successfully extracted refresh token from SSR cookie`);
                                        return tokenData.refresh_token;
                                    }
                                } catch (e) {
                                    Logger.error(`Error parsing SSR auth cookie: ${e}`);
                                }
                            }

                            const altKey = `sb-${SUPABASE_PROJECT_REF}-auth-token`;
                            const altCookieValue =
                                document.cookie
                                    .split("; ")
                                    .find((row) => row.startsWith(`${altKey}=`))
                                    ?.split("=")[1] ?? null;

                            Logger.info(
                                `Alternative cookie (${altKey}): ${altCookieValue ? "Found" : "Not found"}`,
                            );

                            return cookieValue || altCookieValue;
                        }

                        return cookieValue;
                    },
                    setItem: (key: string, value: string) => {
                        Logger.info(`Setting auth cookie: ${key}`);
                        document.cookie = `${key}=${value}; domain=.luminicad.com; path=/; secure; samesite=lax; max-age=604800`;
                        Logger.info(`Cookie set: ${key}`);
                    },
                    removeItem: (key: string) => {
                        Logger.info(`Removing auth cookie: ${key}`);
                        document.cookie = `${key}=; domain=.luminicad.com; path=/; secure; samesite=lax; expires=Thu, 01 Jan 1970 00:00:00 GMT;`;
                        Logger.info(`Cookie removed: ${key}`);
                    },
                },
            },
        });

        const authCookies = document.cookie
            .split("; ")
            .filter((cookie) => cookie.startsWith("sb-") || cookie.includes("supabase"));

        Logger.info("Auth cookies present:", authCookies.length > 0 ? authCookies : "None found");
    }

    private async getCurrentUser() {
        const authCookie = document.cookie
            .split("; ")
            .find((row) => row.startsWith(`sb-${SUPABASE_PROJECT_REF}-auth-token=`));

        Logger.info(`Auth cookie present: ${!!authCookie}`, authCookie ? "Found" : "Not found");

        if (authCookie) {
            Logger.info("Auth cookie format detected, attempting to use for authentication");
        }

        const {
            data: { user },
            error,
        } = await this.supabase.auth.getUser();

        Logger.info("Auth getCurrentUser response:", { user, error });

        if (error || !user) {
            Logger.error("Unauthorized access in SupabaseStorage", error);
            throw new Error("Unauthorized user");
        }
        return user;
    }

    /**
     * Checks if the user is currently authenticated
     * @returns Result with user data if authenticated
     */
    async isAuthenticated(): Promise<{ data: any; error: any }> {
        Logger.info("Checking authentication status...");

        const ssrAuthCookie = document.cookie
            .split("; ")
            .find((row) => row.startsWith(`sb-${SUPABASE_PROJECT_REF}-auth-token=`));

        if (ssrAuthCookie) {
            Logger.info("Found Supabase SSR auth cookie - parsing...");
            try {
                const cookieValue = ssrAuthCookie.split("=")[1];

                Logger.info(
                    `Auth cookie format: ${cookieValue.startsWith("base64-") ? "base64-encoded" : "plain"}`,
                );

                let jsonStr = cookieValue;
                if (jsonStr.startsWith("base64-")) {
                    Logger.info("Attempting to decode base64 cookie");
                    try {
                        jsonStr = atob(jsonStr.substring(7));
                        Logger.info("Successfully decoded base64 cookie");
                    } catch (e) {
                        Logger.error("Failed to decode base64 cookie:", e);
                    }
                }

                try {
                    const tokenData = JSON.parse(jsonStr);
                    Logger.info("Successfully parsed cookie data:", {
                        hasAccessToken: !!tokenData.access_token,
                        hasRefreshToken: !!tokenData.refresh_token,
                        expiresAt: tokenData.expires_at,
                    });
                } catch (e) {
                    Logger.error("Failed to parse cookie JSON:", e);
                }
            } catch (e) {
                Logger.error("Error analyzing auth cookie:", e);
            }
        } else {
            Logger.info("No SSR auth cookie found");
        }

        try {
            const response = await this.supabase.auth.getUser();
            Logger.info("Auth response:", response);
            return response;
        } catch (error) {
            Logger.error("Authentication check failed:", error);
            return { data: {}, error };
        }
    }

    async get(database: string, table: string, id: string): Promise<any> {
        await this.getCurrentUser();

        const { data, error } = await this.supabase.from(table).select("*").eq("id", id).single();

        if (error) {
            Logger.error(`SupabaseStorage: error getting record ${id} from ${table}`, error);
            throw error;
        }
        Logger.info(`SupabaseStorage: successfully retrieved record ${id} from ${table}`);
        return data;
    }

    async put(database: string, table: string, id: string, value: any): Promise<boolean> {
        await this.getCurrentUser();

        const { data, error } = await this.supabase
            .from(table)
            .upsert({ id, ...value }, { onConflict: "id" });

        if (error) {
            Logger.error(`SupabaseStorage: error putting record ${id} into ${table}`, error);
            throw error;
        }
        Logger.info(`SupabaseStorage: successfully put record ${id} into ${table}`);
        return true;
    }

    /**
     * Delete an item from the specified table by id.
     */
    async delete(database: string, table: string, id: string): Promise<boolean> {
        await this.getCurrentUser();

        const { data, error } = await this.supabase.from(table).delete().eq("id", id);

        if (error) {
            Logger.error(`SupabaseStorage: error deleting record ${id} from ${table}`, error);
            throw error;
        }
        Logger.info(`SupabaseStorage: successfully deleted record ${id} from ${table}`);
        return true;
    }

    async page(database: string, table: string, page: number): Promise<any[]> {
        await this.getCurrentUser();

        const offset = page * DEFAULT_COUNT;
        const { data, error } = await this.supabase
            .from(table)
            .select("*")
            .range(offset, offset + DEFAULT_COUNT - 1);

        if (error) {
            Logger.error(`SupabaseStorage: error getting page ${page} from ${table}`, error);
            throw error;
        }
        Logger.info(`SupabaseStorage: successfully retrieved page ${page} from ${table}`);
        return data || [];
    }
}
