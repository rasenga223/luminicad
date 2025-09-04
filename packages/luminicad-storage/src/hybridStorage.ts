import { Constants, IStorage, Logger } from "luminicad-core";
import { IndexedDBStorage } from "./indexedDBStorage";
import { SupabaseStorage } from "./supabaseStorage";

/**
 * HybridStorage provides a unified storage interface that switches between
 * local IndexedDB storage and cloud Supabase storage based on authentication status.
 *
 * When a user is logged in, data is stored both locally and in the cloud.
 * When offline or logged out, data is only stored locally.
 */
export class HybridStorage implements IStorage {
    readonly version: number = 1;
    private localStorage: IndexedDBStorage;
    private cloudStorage: SupabaseStorage;
    private isAuthenticated: boolean = false;

    constructor() {
        this.localStorage = new IndexedDBStorage();
        this.cloudStorage = new SupabaseStorage();

        this.checkAuthStatus();

        Logger.info("HybridStorage initialized with both local and cloud storage capabilities");
    }

    /**
     * Checks if the user is authenticated with Supabase
     * Gracefully falls back to local storage if authentication fails
     */
    private async checkAuthStatus(): Promise<void> {
        try {
            const { data, error } = await this.cloudStorage.isAuthenticated();

            Logger.info("Auth check response:", { data, error });

            if (error) {
                Logger.error("Authentication error:", error);
                this.isAuthenticated = false;
            } else {
                const user = data?.user;
                this.isAuthenticated = !!user;

                if (this.isAuthenticated) {
                    Logger.info(`User authenticated: ${user.email} (ID: ${user.id})`);
                } else {
                    Logger.info("No authenticated user found - using local storage only");
                }
            }

            Logger.info(`Storage mode: ${this.isAuthenticated ? "HYBRID (local + cloud)" : "LOCAL ONLY"}`);
        } catch (error) {
            this.isAuthenticated = false;
            Logger.error("Failed to check authentication status", error);
            Logger.info("Falling back to local storage only due to auth check failure");
        }
    }

    /**
     * Retrieves an item from storage
     * - If authenticated, tries cloud first, falls back to local
     * - If not authenticated, uses local only
     */
    async get(database: string, table: string, id: string): Promise<any> {
        await this.checkAuthStatus();

        if (this.isAuthenticated) {
            try {
                Logger.info(`Attempting to get ${id} from cloud storage (${table})`);
                const data = await this.cloudStorage.get(database, table, id);
                if (data) {
                    Logger.info(`Successfully retrieved ${id} from cloud storage`);
                    await this.localStorage.put(database, table, id, data);
                    return data;
                }
                Logger.info(`No data found in cloud storage for ${id}, falling back to local`);
            } catch (error) {
                Logger.warn(`Cloud storage get failed for ${id}, falling back to local: ${error}`);
            }
        } else {
            Logger.info(`Using local storage for get operation (${id}) - user not authenticated`);
        }

        return await this.localStorage.get(database, table, id);
    }

    /**
     * Stores an item in storage
     * - If authenticated, stores in both cloud and local
     * - If not authenticated, stores only locally
     */
    async put(database: string, table: string, id: string, value: any): Promise<boolean> {
        await this.checkAuthStatus();

        Logger.info(`Storing ${id} in local storage (${table})`);
        const localResult = await this.localStorage.put(database, table, id, value);

        if (this.isAuthenticated) {
            try {
                Logger.info(`Storing ${id} in cloud storage (${table})`);
                await this.cloudStorage.put(database, table, id, value);
                Logger.info(`Successfully saved ${id} to cloud storage`);
            } catch (error) {
                Logger.error(`Failed to save ${id} to cloud storage: ${error}`);
            }
        } else {
            Logger.info(`Skipping cloud storage for ${id} - user not authenticated`);
        }

        return localResult;
    }

    /**
     * Deletes an item from storage
     * - If authenticated, deletes from both cloud and local
     * - If not authenticated, deletes only locally
     */
    async delete(database: string, table: string, id: string): Promise<boolean> {
        await this.checkAuthStatus();

        Logger.info(`Deleting ${id} from local storage (${table})`);
        const localResult = await this.localStorage.delete(database, table, id);

        if (this.isAuthenticated) {
            try {
                Logger.info(`Deleting ${id} from cloud storage (${table})`);
                await this.cloudStorage.delete(database, table, id);
                Logger.info(`Successfully deleted ${id} from cloud storage`);
            } catch (error) {
                Logger.error(`Failed to delete ${id} from cloud storage: ${error}`);
            }
        } else {
            Logger.info(`Skipping cloud deletion for ${id} - user not authenticated`);
        }

        return localResult;
    }

    /**
     * Retrieves a page of items from storage
     * - If authenticated, gets from cloud first, falls back to local
     * - If not authenticated, gets from local only
     */
    async page(database: string, table: string, pageNumber: number): Promise<any[]> {
        await this.checkAuthStatus();

        if (this.isAuthenticated) {
            try {
                Logger.info(`Retrieving page ${pageNumber} from cloud storage (${table})`);
                const data = await this.cloudStorage.page(database, table, pageNumber);
                if (data && data.length > 0) {
                    Logger.info(`Successfully retrieved ${data.length} items from cloud storage`);
                    return data;
                }
                Logger.info(`No data found in cloud storage for page ${pageNumber}, falling back to local`);
            } catch (error) {
                Logger.warn(`Cloud storage page retrieval failed, falling back to local: ${error}`);
            }
        } else {
            Logger.info(`Using local storage for page operation (${pageNumber}) - user not authenticated`);
        }

        return await this.localStorage.page(database, table, pageNumber);
    }

    /**
     * Synchronizes local data with cloud storage
     * This can be called manually to force a sync operation
     */
    async syncToCloud(): Promise<void> {
        await this.checkAuthStatus();

        if (!this.isAuthenticated) {
            Logger.warn("Cannot sync to cloud: User not authenticated");
            return;
        }

        try {
            Logger.info("Starting synchronization of local data to cloud storage");

            const documents = await this.localStorage.page(Constants.DBName, Constants.DocumentTable, 0);
            Logger.info(`Found ${documents.length} documents to sync`);

            for (const doc of documents) {
                Logger.info(`Syncing document: ${doc.id}`);
                await this.cloudStorage.put(Constants.DBName, Constants.DocumentTable, doc.id, doc);
            }

            const recents = await this.localStorage.page(Constants.DBName, Constants.RecentTable, 0);
            Logger.info(`Found ${recents.length} recent documents to sync`);

            for (const recent of recents) {
                Logger.info(`Syncing recent document: ${recent.id}`);
                await this.cloudStorage.put(Constants.DBName, Constants.RecentTable, recent.id, recent);
            }

            Logger.info("Successfully synchronized all local data to cloud storage");
        } catch (error) {
            Logger.error("Failed to synchronize data to cloud", error);
            throw error;
        }
    }
}
