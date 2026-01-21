type RequestMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

interface ApiRequestOptions<TBody = any> {
    endpoint: string;
    method: RequestMethod;
    body?: TBody;
    headers?: Record<string, string>;
    token?: string; // Optional auth token override
}

interface ApiResponse<TResponse = any> {
    data: TResponse | null;
    error: string | null;
    status: number;
}

/**
 * Standardized API Client for making requests to the Next.js API routes
 */
export async function apiClient<TResponse = any, TBody = any>(
    options: ApiRequestOptions<TBody>
): Promise<ApiResponse<TResponse>> {
    const { endpoint, method, body, headers = {}, token } = options;

    // Add leading slash if missing
    const url = endpoint.startsWith('/') ? `/api${endpoint}` : `/api/${endpoint}`;

    const defaultHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        ...headers,
    };

    if (token) {
        defaultHeaders['Authorization'] = `Bearer ${token}`; // If bearer auth is used
    }

    try {
        const response = await fetch(url, {
            method,
            headers: defaultHeaders,
            body: body ? JSON.stringify(body) : undefined,
        });

        if (!response.ok) {
            // Try to parse error message from JSON
            try {
                const errorJson = await response.json();
                return {
                    data: null,
                    error: errorJson.error || errorJson.message || `API Error: ${response.statusText}`,
                    status: response.status
                };
            } catch (e) {
                // Fallback for non-JSON errors
                return {
                    data: null,
                    error: `API Error: ${response.statusText}`,
                    status: response.status
                };
            }
        }

        // Success
        try {
            const data = await response.json();
            return {
                data: data as TResponse,
                error: null,
                status: response.status
            };
        } catch (e) {
            // Successful response but no/invalid JSON body
            return {
                data: null,
                error: null,
                status: response.status
            };
        }

    } catch (error: any) {
        console.error(`API Call Failed [${method} ${url}]:`, error);
        return {
            data: null,
            error: error.message || 'Network request failed',
            status: 0
        };
    }
}

// Helper methods for cleaner usage
export const api = {
    get: <T>(endpoint: string, headers?: Record<string, string>) =>
        apiClient<T>({ endpoint, method: 'GET', headers }),

    post: <T, B>(endpoint: string, body: B, headers?: Record<string, string>) =>
        apiClient<T, B>({ endpoint, method: 'POST', body, headers }),

    put: <T, B>(endpoint: string, body: B, headers?: Record<string, string>) =>
        apiClient<T, B>({ endpoint, method: 'PUT', body, headers }),

    delete: <T>(endpoint: string, headers?: Record<string, string>) =>
        apiClient<T>({ endpoint, method: 'DELETE', headers }),

    patch: <T, B>(endpoint: string, body: B, headers?: Record<string, string>) =>
        apiClient<T, B>({ endpoint, method: 'PATCH', body, headers }),
};
