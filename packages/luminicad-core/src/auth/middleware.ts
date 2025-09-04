import { Logger } from "../foundation/logger";
import { supabase } from "./supabase";

export async function checkAuth() {
    try {
        const {
            data: { user },
            error,
        } = await supabase.auth.getUser();

        if (error) {
            Logger.warn("Auth check error:", error);
            return null;
        }

        return user;
    } catch (error) {
        Logger.error("Auth check failed:", error);

        return null;
    }
}

export async function requireAuth() {
    const user = await checkAuth();
    if (!user) {
        throw new Error("Authentication required");
    }
    return user;
}
