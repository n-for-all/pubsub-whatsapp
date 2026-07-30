/**
 * Central API helper for the standalone Whatsappi frontend.
 *
 * All chat data + authentication endpoints (/api/authorize,
 * /api/channels/authorize) live on the MAIN app
 * (e.g. https://pubsub.nextmark.ae). Because this is a separate frontend
 * served from its own origin, every request must be sent to that domain.
 *
 * Configure the target with VITE_API_BASE_URL in your .env. When left empty
 * the calls fall back to same-origin relative paths.
 *
 * NOTE: Cross-origin calls require the main app to send proper CORS headers
 * (Access-Control-Allow-Origin + Allow-Credentials) for this origin.
 */

const API_BASE_URL = ((import.meta as any).env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

/** Build an absolute URL for an API path. */
export function apiUrl(path: string): string {
    if (/^https?:\/\//i.test(path)) return path;
    return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * Fetch API wrapper that targets the configured API base URL.
 * 
 * Supports Bearer token authentication via Authorization header.
 * If a token is provided, it will be used for the request.
 * 
 * @param path - API endpoint path
 * @param init - Request options. Can include 'token' for Bearer authentication.
 * @returns Promise<Response>
 */
export interface ApiFetchOptions extends Omit<RequestInit, 'headers'> {
    headers?: Record<string, string>;
    token?: string;
}

export function apiFetch(path: string, init?: ApiFetchOptions): Promise<Response> {
    const options: RequestInit = {
        // send cookies so session-based endpoints work cross-origin
        credentials: "include",
        ...init,
    };

    // Set up headers
    const headers: Record<string, string> = init?.headers ? { ...init.headers } : {};
    
    // Add Bearer token if provided
    if (init?.token) {
        headers['Authorization'] = `Bearer ${init.token}`;
    }

    if (Object.keys(headers).length > 0) {
        options.headers = headers;
    }

    return fetch(apiUrl(path), options);
}
