
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { nanoid } from "nanoid";

const LS_KEY = "chatbot_app_configs";
// Mirror of the socket provider's session key — cleared when a shared link
// replaces the apps, so we don't auto-reconnect to the old apps.
const SESSION_KEY = "chatbot_socket_session";

export interface AppConfig {
    id: string;
    label: string;
    appKey: string;
    channel: string;
}

interface AppConfigsContextType {
    configs: AppConfig[];
    add: (config: Omit<AppConfig, "id">) => void;
    remove: (id: string) => void;
    update: (id: string, config: Omit<AppConfig, "id">) => void;
    /** True when one or more configs were just imported from the URL — used to auto-open the connect flow. */
    pendingConnect: boolean;
    clearPendingConnect: () => void;
}

const AppConfigsContext = createContext<AppConfigsContextType>({
    configs: [],
    add: () => {},
    remove: () => {},
    update: () => {},
    pendingConnect: false,
    clearPendingConnect: () => {},
});

export function useAppConfigs() {
    return useContext(AppConfigsContext);
}

function load(): AppConfig[] {
    try { return JSON.parse(localStorage.getItem(LS_KEY) ?? "[]"); } catch { return []; }
}
function persist(configs: AppConfig[]) {
    try { localStorage.setItem(LS_KEY, JSON.stringify(configs)); } catch {}
}

/** Decode a base64 (unicode-safe) string into a JSON value. */
function decodeBase64Json(b64: string): unknown {
    const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
}

/**
 * Read a base64 app-settings payload from the URL (?settings= or ?config=).
 * Payload may be a single { label?, appKey, channel } or an array of them.
 * When present, the shared config(s) REPLACE all existing apps so the chat
 * connects only to what was shared. Returns the resulting configs + whether
 * anything was imported.
 */
function importFromUrl(current: AppConfig[]): { configs: AppConfig[]; imported: boolean } {
    if (typeof window === "undefined") return { configs: current, imported: false };
    try {
        const params = new URLSearchParams(window.location.search);
        const raw = params.get("settings") ?? params.get("config");
        if (raw) {
            const decoded = decodeBase64Json(decodeURIComponent(raw));
            const incoming = (Array.isArray(decoded) ? decoded : [decoded]) as Array<Partial<AppConfig>>;
            const shared: AppConfig[] = [];
            const seen = new Set<string>();
            for (const item of incoming) {
                if (!item?.appKey || !item?.channel) continue;
                const dedupeKey = `${item.appKey}::${item.channel}`;
                if (seen.has(dedupeKey)) continue;
                seen.add(dedupeKey);
                shared.push({ id: nanoid(), label: item.label || item.appKey, appKey: item.appKey, channel: item.channel });
            }

            // Strip the param so a refresh doesn't re-import / re-trigger
            params.delete("settings");
            params.delete("config");
            const qs = params.toString();
            const newUrl = window.location.pathname + (qs ? `?${qs}` : "") + window.location.hash;
            window.history.replaceState({}, "", newUrl);

            if (shared.length > 0) {
                // Replace everything with the shared config(s) and drop any saved
                // socket session bound to the previous apps so we reconnect cleanly.
                persist(shared);
                try { localStorage.removeItem(SESSION_KEY); } catch {}
                return { configs: shared, imported: true };
            }
        }
    } catch {}
    return { configs: current, imported: false };
}

export function AppConfigsProvider({ children }: { children: React.ReactNode }) {
    const [configs, setConfigs] = useState<AppConfig[]>([]);
    const [pendingConnect, setPendingConnect] = useState(false);

    useEffect(() => {
        const { configs: next, imported } = importFromUrl(load());
        setConfigs(next);
        if (imported) setPendingConnect(true);
    }, []);

    const add = useCallback((config: Omit<AppConfig, "id">) => {
        const next = [...load(), { ...config, id: nanoid() }];
        persist(next);
        setConfigs(next);
    }, []);

    const remove = useCallback((id: string) => {
        const next = load().filter(c => c.id !== id);
        persist(next);
        setConfigs(next);
    }, []);

    const update = useCallback((id: string, config: Omit<AppConfig, "id">) => {
        const next = load().map(c => c.id === id ? { ...config, id } : c);
        persist(next);
        setConfigs(next);
    }, []);

    const clearPendingConnect = useCallback(() => setPendingConnect(false), []);

    return (
        <AppConfigsContext.Provider value={{ configs, add, remove, update, pendingConnect, clearPendingConnect }}>
            {children}
        </AppConfigsContext.Provider>
    );
}
