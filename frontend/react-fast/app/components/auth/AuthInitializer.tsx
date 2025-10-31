// components/auth/AuthInitializer.tsx
import { useEffect, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { createContext, useContext } from 'react';

interface AuthState {
  isInitialized: boolean;
  hasValidToken: boolean;
  getToken: () => Promise<string | null>;
}

export const AuthStateContext = createContext<AuthState>({
  isInitialized: false,
  hasValidToken: false,
  getToken: async () => null,
});

export function AuthInitializer({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, getAccessTokenSilently, isLoading } = useAuth0();
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasValidToken, setHasValidToken] = useState(false);

  const getToken = async () => {
    try {
      if (!isAuthenticated) {
        return null;
      }

      // First try to get from localStorage to avoid unnecessary requests
      const cachedToken = localStorage.getItem('auth_token');
      if (cachedToken?.startsWith('eyJ')) {
        // TODO: Add JWT expiration check here if needed
        return cachedToken;
      }

      // Get a fresh token if cached one is invalid or missing
      const token = await getAccessTokenSilently({
        authorizationParams: {
          audience: import.meta.env.VITE_AUTH0_API_AUDIENCE,
          scope: 'openid profile email'
        },
        detailedResponse: true
      });

      if (token.access_token) {
        localStorage.setItem('auth_token', token.access_token);
        setHasValidToken(true);
        return token.access_token;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting token:', error);
      localStorage.removeItem('auth_token');
      setHasValidToken(false);
      return null;
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        if (!isLoading) {
          if (isAuthenticated) {
            const token = await getToken();
            setHasValidToken(!!token);
          } else {
            localStorage.removeItem('auth_token');
            setHasValidToken(false);
          }
          setIsInitialized(true);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        setIsInitialized(true);
        setHasValidToken(false);
      }
    };

    initializeAuth();
  }, [isAuthenticated, isLoading]);

  // Set up token refresh interval
  useEffect(() => {
    if (!isAuthenticated) return;

    const refreshToken = async () => {
      await getToken();
    };

    // Refresh token every 55 minutes (tokens typically expire in 1 hour)
    const interval = setInterval(refreshToken, 55 * 60 * 1000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  return (
    <AuthStateContext.Provider value={{ isInitialized, hasValidToken, getToken }}>
      {children}
    </AuthStateContext.Provider>
  );
}

// Export a hook to check if auth is initialized and get token
export const useAuthState = () => useContext(AuthStateContext);