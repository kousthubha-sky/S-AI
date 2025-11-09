import axios from 'axios';

const apiClient = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || process.env.API_BASE_URL ,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true,
});

// ✅ REMOVED token interceptor - tokens handled by useAuthApi hook
// Request interceptor is now simplified
apiClient.interceptors.request.use(
    async (config) => {
        // No localStorage access - tokens added per-request by useAuthApi
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// ✅ IMPROVED response interceptor - no localStorage removal
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401 || error.response?.status === 403) {
            // Don't clear tokens - Auth0 SDK handles this
            // Just redirect to login
            if (window.location.pathname !== '/login' && window.location.pathname !== '/callback') {
                console.warn('Auth error, redirecting to login');
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default apiClient;