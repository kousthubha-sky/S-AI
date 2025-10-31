import axios from 'axios';

const apiClient = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || process.env.API_BASE_URL || 'http://localhost:8000',
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true,  // Important for CORS with credentials
});

// Add request interceptor to include auth token
apiClient.interceptors.request.use(
    async (config) => {
        const token = localStorage.getItem('auth_token');
        if (token) {
            // Ensure headers object exists
            config.headers = config.headers || {};
            
            // Set the Authorization header
            config.headers.Authorization = `Bearer ${token}`;
        } else {
            console.warn('No auth token available for request to:', config.url);
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Add response interceptor to handle auth errors
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401 || error.response?.status === 403) {
            // Clear invalid token
            localStorage.removeItem('auth_token');
            
            // Redirect to login if needed
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default apiClient;