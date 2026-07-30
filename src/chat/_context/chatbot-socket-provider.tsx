
import {
    createContext,
    PropsWithChildren,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import Pusher, { Channel } from "pusher-js";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";
import { useAppConfigs } from "./app-configs-provider";
import { useTab } from "../_hooks/use-tab";
import { toast } from "sonner";
import { apiUrl } from "@/lib/api";

const LS_KEY = "chatbot_socket_session";

type SessionData = { appKey: string; token: string; channel: string }[];

function saveSession(sessions: SessionData) {
    try { localStorage.setItem(LS_KEY, JSON.stringify(sessions)); } catch { }
}
function loadSession(): SessionData | null {
    try {
        const raw = JSON.parse(localStorage.getItem(LS_KEY) ?? "null");
        if (!raw || !Array.isArray(raw)) return null;
        return raw as SessionData;
    } catch { return null; }
}
function clearSession() {
    try { localStorage.removeItem(LS_KEY); } catch { }
}
function decodeUserId(token: string): string | null {
    try { return JSON.parse(atob(token.split(".")[1])).userId ?? null; } catch { return null; }
}

export type ChatbotSocketContextType = {
    channel: Channel | null;
    channels: Channel[];
    connectionState: "disconnected" | "connecting" | "connected";
    connected: boolean;
    connecting: boolean;
    /** Auth token for the first app (legacy compatibility) */
    authToken: string | null;
    /** Map of appKey → authToken for all connected apps */
    authTokens: Map<string, string>;
    /** ChannelUser.id decoded from the first JWT — null when not authenticated */
    agentId: string | null;
    /** First app key (legacy compatibility) */
    appKey: string;
    /** All connected app keys */
    appKeys: string[];
    activeLabel: string;
    disconnect: () => void;
    openDialog: () => void;
};

export const ChatbotSocketContext = createContext<ChatbotSocketContextType>({
    channel: null,
    channels: [],
    connectionState: "disconnected",
    connected: false,
    connecting: false,
    authToken: null,
    authTokens: new Map(),
    agentId: null,
    appKey: "",
    appKeys: [],
    activeLabel: "",
    disconnect: () => { },
    openDialog: () => { },
});

export function useChatbotSocket() {
    return useContext(ChatbotSocketContext);
}

type Props = PropsWithChildren<{
    socketServerUrl: string;
}>;

export default function ChatbotSocketProvider({ children, socketServerUrl }: Props) {
    const { configs, pendingConnect, clearPendingConnect } = useAppConfigs();
    const { selectTab } = useTab();

    const [connectionState, setConnectionState] = useState<"disconnected" | "connecting" | "connected">("disconnected");
    const [channels, setChannels] = useState<Channel[]>([]);
    const [authenticated, setAuthenticated] = useState(false);
    const [hydrated, setHydrated] = useState(false);
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [authError, setAuthError] = useState("");
    const [dismissed, setDismissed] = useState(false);
    const authTokensRef = useRef<Map<string, string>>(new Map());
    const pusherInstancesRef = useRef<Map<string, Pusher>>(new Map());
    const connectionErrorToastIdRef = useRef<string | number | null>(null);
    const connectingToastIdRef = useRef<string | number | null>(null);
    const didInitRef = useRef(false);

    const startMultiPusher = async (appsToConnect: typeof configs, skipSignin = false) => {
        if (appsToConnect.length === 0) return;

        const allChannels: Channel[] = [];
        const authResults: Array<{ appKey: string; success: boolean; error?: string; token?: string }> = [];
        let signinCount = 0;
        let subscriptionCount = 0;
        const expectedSignins = skipSignin ? 0 : appsToConnect.length;
        let expectedSubscriptions = 0;

        const handleSubError = (channelName: string, err: any) => {
            clearSession();
            authTokensRef.current.clear();
            setChannels([]);
            setAuthenticated(false);
            setConnectionState("disconnected");
            setDismissed(false);
            pusherInstancesRef.current.forEach(p => p.disconnect());
            pusherInstancesRef.current.clear();
            
            // Check for 403 authorization errors
            const status = err?.status ?? err?.error?.status;
            const msg = status === 403 
                ? `You are not authorized to access these channels. Please contact your admin to authorize access to channel "${channelName}".`
                : err?.error || err?.message || "Subscription error";
            
            setAuthError(msg);
            
            // Show toast notification for subscription error
            toast.error("Connection Error", {
                description: msg,
            });
        };

        for (const config of appsToConnect) {
            const { appKey, channel: pusherChannel } = config;
            const rawUrl = (socketServerUrl ?? "").replace("{appId}", appKey);
            const u = new URL(rawUrl);

            console.log("Pusher config:", {
                appKey,
                socketServerUrl,
                rawUrl,
                hostname: u.hostname,
                port: u.port,
                protocol: u.protocol
            });

            const useTLS = u.protocol === 'wss:';

            const pusher = new Pusher(appKey, {
                wsHost: u.hostname,
                wsPort: Number(u.port),
                wssPort: Number(u.port),
                forceTLS: useTLS,
                disableStats: true,
                enabledTransports: ['ws', 'wss'],
                disabledTransports: ['sockjs', 'xhr_streaming', 'xhr_polling'],
                cluster: "mt1",
                userAuthentication: {
                    customHandler: async (params: any, callback: (error: any, data: any) => void) => {
                        try {
                            const res = await fetch(apiUrl("/api/authorize"), {
                                method: "POST",
                                credentials: "include",
                                headers: {
                                    "Content-Type": "application/json",
                                    "X-APP-Key": appKey,
                                },
                                body: JSON.stringify({
                                    socket_id: params.socketId,
                                    username: username.trim(),
                                    password,
                                }),
                            });
                            const data = await res.json();
                            if (!res.ok) {
                                const msg = data?.error || `Authentication failed for ${appKey}`;
                                authResults.push({ appKey, success: false, error: msg });
                                
                                // Immediately update UI state
                                setAuthError(msg);
                                setConnectionState("disconnected");
                                setDismissed(false);
                                if (connectingToastIdRef.current !== null) {
                                    toast.dismiss(connectingToastIdRef.current);
                                    connectingToastIdRef.current = null;
                                }
                                
                                callback(new Error(msg), null);
                                return;
                            }
                            callback(null, data);
                        } catch (e: any) {
                            const msg = e?.message || `Network error for ${appKey}`;
                            authResults.push({ appKey, success: false, error: msg });
                            
                            // Immediately update UI state
                            setAuthError(msg);
                            setConnectionState("disconnected");
                            setDismissed(false);
                            if (connectingToastIdRef.current !== null) {
                                toast.dismiss(connectingToastIdRef.current);
                                connectingToastIdRef.current = null;
                            }
                            
                            callback(e, null);
                        }
                    },
                } as any,
                channelAuthorization: {
                    endpoint: apiUrl("/api/channels/authorize"),
                    transport: "ajax",
                    headersProvider: () => ({
                        Authorization: authTokensRef.current.get(appKey) ? `Bearer ${authTokensRef.current.get(appKey)}` : "",
                        "X-APP-Key": appKey,
                    }),
                },
            } as any);

            pusherInstancesRef.current.set(appKey, pusher);

            console.log("[PubSub] Setting up connection for", appKey);
            console.log("[PubSub] Initial connection state:", pusher.connection.state);

            // Unbind any existing listeners first to prevent duplicates
            pusher.connection.unbind("state_change");
            pusher.connection.unbind("connecting");
            pusher.connection.unbind("connected");
            pusher.connection.unbind("error");
            pusher.connection.unbind("failed");
            pusher.connection.unbind("unavailable");
            pusher.connection.unbind("disconnected");
            pusher.unbind("pusher:signin_success");
            pusher.unbind("pusher:error");

            // Listen to ALL state changes
            pusher.connection.bind("state_change", (states: any) => {
                console.log("[PubSub] State change for", appKey, ":", states.previous, "->", states.current);
            });

            pusher.connection.bind("connecting", () => {
                console.log("[PubSub] Connecting for", appKey);
            });

            pusher.connection.bind("connected", () => {
                console.log("[PubSub] Connected for", appKey);
                
                // Dismiss connecting toast if it exists
                if (connectingToastIdRef.current !== null) {
                    toast.dismiss(connectingToastIdRef.current);
                    connectingToastIdRef.current = null;
                }
                
                // Dismiss connection error toast if it exists
                if (connectionErrorToastIdRef.current !== null) {
                    toast.dismiss(connectionErrorToastIdRef.current);
                    connectionErrorToastIdRef.current = null;
                }
                
                if (skipSignin) {
                    // Session restore: we already have valid tokens, so immediately mark as authenticated
                    const token = authTokensRef.current.get(appKey);
                    const userId = token ? decodeUserId(token) : null;
                    const chNames = [pusherChannel, ...(userId ? [`private-user-${userId}`] : [])];
                    
                    // Subscribe to channels but don't wait for subscription success
                    // The channels will connect in the background
                    chNames.forEach(chName => {
                        const ch = pusher.subscribe(chName);
                        allChannels.push(ch);
                        ch.bind("pusher:subscription_error", (err: any) => handleSubError(ch.name, err));
                    });
                    
                    // Mark authenticated immediately since we have valid tokens from session
                    subscriptionCount = chNames.length;
                    expectedSubscriptions = chNames.length;
                    setChannels(allChannels);
                    setAuthenticated(true);
                    setConnectionState("connected");
                } else {
                    pusher.signin();
                }
            });

            pusher.bind("pusher:signin_success", (data: any) => {
                signinCount++;
                let userId: string | null = null;
                try {
                    const parsed = typeof data.user_data === "string" ? JSON.parse(data.user_data) : data.user_data;
                    if (parsed?.token) {
                        authTokensRef.current.set(appKey, parsed.token);
                        authResults.push({ appKey, success: true, token: parsed.token });
                        userId = decodeUserId(parsed.token);
                    }
                } catch { }

                const chNames = [pusherChannel, ...(userId ? [`private-user-${userId}`] : [])];
                expectedSubscriptions += chNames.length;

                chNames.forEach(chName => {
                    const ch = pusher.subscribe(chName);
                    ch.bind("pusher:subscription_error", (err: any) => handleSubError(ch.name, err));
                    ch.bind("pusher:subscription_succeeded", () => {
                        allChannels.push(ch);
                        subscriptionCount++;

                        // Only set authenticated when ALL subscriptions succeed
                        if (subscriptionCount === expectedSubscriptions) {
                            const failures = authResults.filter(r => !r.success);
                            if (failures.length > 0) {
                                pusherInstancesRef.current.forEach(p => p.disconnect());
                                pusherInstancesRef.current.clear();
                                authTokensRef.current.clear();
                                setAuthError(`Authentication failed for: ${failures.map(f => f.appKey).join(", ")} - ${failures[0].error}`);
                                setConnectionState("disconnected");
                                // Dismiss connecting toast on failure
                                if (connectingToastIdRef.current !== null) {
                                    toast.dismiss(connectingToastIdRef.current);
                                    connectingToastIdRef.current = null;
                                }
                            } else {
                                const sessions: SessionData = authResults.map(r => ({
                                    appKey: r.appKey,
                                    token: r.token!,
                                    channel: appsToConnect.find(a => a.appKey === r.appKey)!.channel
                                }));
                                saveSession(sessions);
                                setChannels(allChannels);
                                setAuthenticated(true);
                                setConnectionState("connected");
                                // Dismiss connecting toast on successful connection
                                if (connectingToastIdRef.current !== null) {
                                    toast.dismiss(connectingToastIdRef.current);
                                    connectingToastIdRef.current = null;
                                }
                            }
                        }
                    });
                });

                // Check if all apps signed in (but DON'T set authenticated yet - wait for subscriptions)
                if (signinCount === expectedSignins) {
                    const failures = authResults.filter(r => !r.success);
                    if (failures.length > 0) {
                        pusherInstancesRef.current.forEach(p => p.disconnect());
                        pusherInstancesRef.current.clear();
                        authTokensRef.current.clear();
                        setAuthError(`Authentication failed for: ${failures.map(f => f.appKey).join(", ")} - ${failures[0].error}`);
                        setConnectionState("disconnected");
                        // Dismiss connecting toast on failure
                        if (connectingToastIdRef.current !== null) {
                            toast.dismiss(connectingToastIdRef.current);
                            connectingToastIdRef.current = null;
                        }
                    }
                    // Don't set authenticated here - wait for subscriptions to complete
                }
            });

            pusher.bind("pusher:error", (err: any) => {
                console.log("[PubSub] pusher:error event for", appKey, err);
                const msg = err?.data?.message || err?.message || `Authentication error for ${appKey}`;
                authResults.push({ appKey, success: false, error: msg });
                setAuthError(msg);
                setConnectionState("disconnected");
                setDismissed(false);
                
                // Dismiss connecting toast on error
                if (connectingToastIdRef.current !== null) {
                    toast.dismiss(connectingToastIdRef.current);
                    connectingToastIdRef.current = null;
                }
                
                // Only show error toast once per connection attempt, not repeatedly
                if (connectionErrorToastIdRef.current === null) {
                    connectionErrorToastIdRef.current = toast.error("Connection Error", {
                        description: msg,
                    });
                }
            });

            pusher.connection.bind("error", (err: any) => {
                console.log("[PubSub] connection error event for", appKey, err);
                const msg = err?.error?.data?.message || err?.data?.message || err?.message || "Connection failed";
                authResults.push({ appKey, success: false, error: msg });
                setAuthError(msg);
                setConnectionState("disconnected");
                setDismissed(false); // Ensure dialog reopens to show error
                
                // Dismiss connecting toast on error
                if (connectingToastIdRef.current !== null) {
                    toast.dismiss(connectingToastIdRef.current);
                    connectingToastIdRef.current = null;
                }
                
                // Only show error toast once per connection attempt
                if (connectionErrorToastIdRef.current === null) {
                    connectionErrorToastIdRef.current = toast.error("Connection Error", {
                        description: msg,
                    });
                }
            });

            pusher.connection.bind("failed", () => {
                console.log("[PubSub] connection FAILED event for", appKey);
                const msg = "Connection failed";
                setConnectionState("disconnected");
                setDismissed(false); // Ensure dialog reopens
                setAuthError(msg);
                
                // Dismiss connecting toast on failure
                if (connectingToastIdRef.current !== null) {
                    toast.dismiss(connectingToastIdRef.current);
                    connectingToastIdRef.current = null;
                }
                
                // Only show error toast once per connection attempt
                if (connectionErrorToastIdRef.current === null) {
                    connectionErrorToastIdRef.current = toast.error("Connection Failed", {
                        description: msg,
                    });
                }
            });

            pusher.connection.bind("unavailable", () => {
                console.log("[PubSub] connection UNAVAILABLE event for", appKey);
                const msg = "Server unavailable";
                setConnectionState("disconnected");
                
                // Dismiss connecting toast
                if (connectingToastIdRef.current !== null) {
                    toast.dismiss(connectingToastIdRef.current);
                    connectingToastIdRef.current = null;
                }
                
                // Only show error toast once per connection attempt
                if (connectionErrorToastIdRef.current === null) {
                    connectionErrorToastIdRef.current = toast.error("Server Unavailable", {
                        description: msg,
                        duration: Infinity,
                    });
                }
            });

            pusher.connection.bind("disconnected", () => {
                console.log("[PubSub] disconnected event for", appKey);
                setConnectionState("disconnected");
                
                // Only show toast if was previously authenticated
                if (authenticated) {
                    toast.warning("Disconnected", {
                        description: "Connection lost",
                    });
                }
            });
        }
    };

    // On mount: if session exists, restore tokens and auto-connect.
    // BUT if the URL carries a shared `?settings=`/`?config=` payload, skip the
    // restore — the configs provider is replacing the apps and we must reconnect
    // to only the shared app(s), not the previously-saved session.
    useEffect(() => {
        // Guard against React StrictMode running this effect twice in dev,
        // which would create two Pusher instances and two orphaned toasts.
        if (didInitRef.current) {
            console.log("[Socket] Init guard active, skipping duplicate initialization");
            return;
        }
        didInitRef.current = true;

        console.log("[Socket] First initialization running");

        let sharedLink = false;
        try {
            const params = new URLSearchParams(window.location.search);
            sharedLink = params.has("settings") || params.has("config");
        } catch {}

        const sessions = sharedLink ? null : loadSession();
        if (sessions && sessions.length > 0) {
            console.log("[Socket] Restoring session with", sessions.length, "app(s)");
            // Restore tokens
            sessions.forEach(s => authTokensRef.current.set(s.appKey, s.token));
            // Rebuild app configs from sessions
            const appsToRestore = sessions.map(s => ({
                id: s.appKey,
                appKey: s.appKey,
                channel: s.channel,
                label: configs.find(c => c.appKey === s.appKey)?.label || s.appKey
            }));

            setConnectionState("connecting");

            // Show persistent connecting toast
            const toastId = toast.loading("Connecting to server...", {
                description: "Attempting to establish connection",
                duration: Infinity,
            });
            connectingToastIdRef.current = toastId;

            // Safety: dismiss the connecting toast if connection doesn't settle in 30s
            const timeoutId = setTimeout(() => {
                if (connectingToastIdRef.current !== null) {
                    console.warn("[Socket] Connection attempt timed out after 30s, dismissing toast");
                    toast.dismiss(connectingToastIdRef.current);
                    connectingToastIdRef.current = null;
                }
            }, 30000);

            void startMultiPusher(appsToRestore, true);

            setHydrated(true);
            return () => clearTimeout(timeoutId);
        } else {
            console.log("[Socket] No previous session found");
        }
        setHydrated(true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Cleanup on unmount: disconnect all pusher instances
    useEffect(() => {
        return () => {
            console.log("[Socket] Component unmounting, disconnecting all instances");
            pusherInstancesRef.current.forEach(p => {
                try {
                    p.disconnect();
                } catch (e) {
                    console.error("[Socket] Error disconnecting pusher:", e);
                }
            });
        };
    }, []);

    // When configs were imported from the URL (?settings=), make sure the connect
    // dialog is shown so the user can authenticate the freshly-added app(s).
    useEffect(() => {
        if (pendingConnect) {
            setDismissed(false);
            selectTab("chats");
            clearPendingConnect();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pendingConnect]);

    // Whenever we reach a settled state, make sure the "Connecting…" toast is gone.
    // This is a reactive safety net for any race where the Pusher "connected"
    // event fires before/around the toast id being stored in the ref.
    useEffect(() => {
        if (connectionState !== "connecting" && connectingToastIdRef.current !== null) {
            toast.dismiss(connectingToastIdRef.current);
            connectingToastIdRef.current = null;
        }
    }, [connectionState]);

    const handleConnect = async (e: React.FormEvent) => {
        e.preventDefault();
        if (configs.length === 0 || !username.trim()) return;

        // Clean up any existing failed connections first
        pusherInstancesRef.current.forEach(p => p.disconnect());
        pusherInstancesRef.current.clear();

        // Reset error toasts for new attempt
        if (connectionErrorToastIdRef.current !== null) {
            toast.dismiss(connectionErrorToastIdRef.current);
            connectionErrorToastIdRef.current = null;
        }

        setConnectionState("connecting");
        setAuthError("");
        
        // Show persistent connecting toast
        const toastId = toast.loading("Connecting to server...", {
            description: "Authenticating and establishing connection",
            duration: Infinity,
        });
        connectingToastIdRef.current = toastId;

        // Let Pusher handle authentication - it validates username/password
        void startMultiPusher(configs, false);
    };

    const handleDisconnect = () => {
        clearSession();
        pusherInstancesRef.current.forEach(p => p.disconnect());
        pusherInstancesRef.current.clear();
        authTokensRef.current.clear();
        setAuthenticated(false);
        setChannels([]);
        setConnectionState("disconnected");
        setAuthError("");
        setUsername("");
        setPassword("");
        setDismissed(false);
        
        // Dismiss all toasts
        if (connectingToastIdRef.current !== null) {
            toast.dismiss(connectingToastIdRef.current);
            connectingToastIdRef.current = null;
        }
        if (connectionErrorToastIdRef.current !== null) {
            toast.dismiss(connectionErrorToastIdRef.current);
            connectionErrorToastIdRef.current = null;
        }
    };

    const showDialog = hydrated && !authenticated && !dismissed && connectionState === "disconnected";

    // When the dialog is shown (user needs to authenticate), clear the old error toast
    // so they can see fresh error messages from new attempts
    useEffect(() => {
        if (showDialog && connectionErrorToastIdRef.current !== null) {
            toast.dismiss(connectionErrorToastIdRef.current);
            connectionErrorToastIdRef.current = null;
        }
    }, [showDialog]);

    // Get first token for legacy compatibility
    const firstToken = authTokensRef.current.size > 0 ? Array.from(authTokensRef.current.values())[0] : null;
    const firstAppKey = authTokensRef.current.size > 0 ? Array.from(authTokensRef.current.keys())[0] : "";

    return (
        <ChatbotSocketContext.Provider value={{
            channel: channels[0] ?? null,
            channels,
            connectionState,
            connected: connectionState === "connected",
            connecting: connectionState === "connecting",
            authToken: firstToken,
            authTokens: authTokensRef.current,
            agentId: (() => {
                try {
                    if (!firstToken) return null;
                    const payload = JSON.parse(atob(firstToken.split(".")[1]));
                    return payload.userId ?? null;
                } catch { return null; }
            })(),
            appKey: firstAppKey,
            appKeys: Array.from(authTokensRef.current.keys()),
            activeLabel: configs.map(c => c.label || c.appKey).join(", ") || "No apps",
            disconnect: handleDisconnect,
            openDialog: () => setDismissed(false),
        }}>
            <Dialog open={showDialog}>
                <DialogContent className="sm:max-w-sm" onInteractOutside={(e) => e.preventDefault()}>
                    <DialogHeader>
                        <DialogTitle>Connect to Chat</DialogTitle>
                        <DialogDescription>Enter your socket account credentials.</DialogDescription>
                        <button
                            type="button"
                            onClick={() => setDismissed(true)}
                            disabled={connectionState === "connecting"}
                            className="absolute transition-opacity rounded-sm right-4 top-4 opacity-70 hover:opacity-100 disabled:opacity-40 disabled:cursor-not-allowed"
                            aria-label="Cancel"
                        >
                            <X className="size-4" />
                        </button>
                    </DialogHeader>
                    {configs.length === 0 ? (
                        <div className="flex flex-col gap-4">
                            <div className="p-3 text-sm border rounded-md border-amber-200 bg-amber-50 dark:border-amber-800/50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300">
                                No apps configured. Go to <strong>Settings</strong> and add at least one app to connect.
                            </div>
                            <DialogFooter>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="w-full"
                                    onClick={() => {
                                        setDismissed(true);
                                        selectTab("settings");
                                    }}
                                >
                                    Open Settings
                                </Button>
                            </DialogFooter>
                        </div>
                    ) : (
                        <form onSubmit={handleConnect} className="flex flex-col gap-4">
                            <div className="p-3 text-sm border rounded-md border-blue-100 bg-blue-50 dark:border-blue-800/50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 [word-break:break-word]">
                                <p className="font-medium mb-1">Connecting to {configs.length} app{configs.length !== 1 ? "s" : ""}:</p>
                                <ul className="text-xs space-y-0.5">
                                    {configs.map(c => (
                                        <li key={c.id}>• {c.label || c.appKey}</li>
                                    ))}
                                </ul>
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="sock-user">Username</Label>
                                <Input
                                    id="sock-user"
                                    autoFocus
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="socket username"
                                    disabled={connectionState === "connecting"}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="sock-pass">Password</Label>
                                <Input
                                    id="sock-pass"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="socket password"
                                    disabled={connectionState === "connecting"}
                                />
                            </div>
                            {authError && (
                                <div className="p-3 text-sm border rounded-md border-red-200 bg-red-50 dark:border-red-800/50 dark:bg-red-900/20 text-red-800 dark:text-red-300 [word-break:break-word]">
                                    <p className="font-medium">⚠️ {authError}</p>
                                </div>
                            )}
                            <DialogFooter>
                                <Button type="submit" disabled={!username.trim() || connectionState === "connecting"} className="w-full">
                                    {connectionState === "connecting" ? "Connecting to all apps…" : "Connect"}
                                </Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>
            {children}
        </ChatbotSocketContext.Provider>
    );
}
