import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const SUPABASE_PROJECT_REF = import.meta.env.VITE_SUPABASE_PROJECT_REF;

const allCookies = document.cookie;
console.log("All available cookies:", allCookies);

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: "pkce",
        storage: {
            getItem: (key: string) => {
                console.log(`Reading auth cookie: ${key}`);

                const cookieValue =
                    document.cookie
                        .split("; ")
                        .find((row) => row.startsWith(`${key}=`))
                        ?.split("=")[1] ?? null;

                console.log(`Cookie value for ${key}: ${cookieValue ? "Found" : "Not found"}`);

                if (key === "sb-access-token" || key === "sb-refresh-token") {
                    const altKey = `sb-${SUPABASE_PROJECT_REF}-auth-token`;
                    const altCookieValue =
                        document.cookie
                            .split("; ")
                            .find((row) => row.startsWith(`${altKey}=`))
                            ?.split("=")[1] ?? null;

                    console.log(`Alternative cookie (${altKey}): ${altCookieValue ? "Found" : "Not found"}`);

                    return cookieValue || altCookieValue;
                }

                return cookieValue;
            },
            setItem: (key: string, value: string) => {
                console.log(`Setting auth cookie: ${key}`);

                document.cookie = `${key}=${value}; domain=.luminicad.com; path=/; secure; samesite=lax; max-age=604800`;
                console.log(`Cookie set: ${key}`);
            },
            removeItem: (key: string) => {
                console.log(`Removing auth cookie: ${key}`);
                document.cookie = `${key}=; domain=.luminicad.com; path=/; secure; samesite=lax; expires=Thu, 01 Jan 1970 00:00:00 GMT;`;
                console.log(`Cookie removed: ${key}`);
            },
        },
    },
});
