// components/auth/AuthInitializer.tsx
import { useEffect, useState,useRef } from 'react';
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
  const { isAuthenticated, getAccessTokenSilently, isLoading, user } = useAuth0();
  const tokenRef = useRef<string | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);



  const getToken = async () => {
    try {
      if (!isAuthenticated) {
        tokenRef.current = null;
        return null;
      }

      // If we have a cached token in memory and user is authenticated, return it.
      if (tokenRef.current) {
        return tokenRef.current;
      }

      // Get fresh token from Auth0 (will use localStorage cache now)
      const token = await getAccessTokenSilently({
        authorizationParams: {
          audience: import.meta.env.VITE_AUTH0_API_AUDIENCE,
          scope: 'openid profile email'
        },
        cacheMode: 'on' // Use cache (now localStorage)
      });

      tokenRef.current = token as string;
      return tokenRef.current;
    } catch (err) {
      console.error('Error getting token (silent):', err);
      tokenRef.current = null;
      return null;
    }
  };

  // Handle authentication state restoration from localStorage
  useEffect(() => {
    if (!isLoading) {
      setIsAuthReady(true);
    }
  }, [isLoading]);

  // Refresh logic: call getToken periodically
  useEffect(() => {
    if (!isAuthenticated) return;
    const refresh = async () => { await getToken(); };
    const id = setInterval(refresh, 55 * 60 * 1000);
    return () => clearInterval(id);
  }, [isAuthenticated]);

// In AuthInitializer.tsx
useEffect(() => {
  const refreshInterval = setInterval(async () => {
    if (isAuthenticated) {
      try {
        await getAccessTokenSilently({ cacheMode: 'off' });
      } catch (error) {
        console.error('Token refresh failed:', error);
      }
    }
  }, 45 * 60 * 1000); // Refresh every 45 minutes
  
  return () => clearInterval(refreshInterval);
}, [isAuthenticated]);

  return (
    <AuthStateContext.Provider value={{ isInitialized: isAuthReady, hasValidToken: !!tokenRef.current, getToken }}>
      {children}
    </AuthStateContext.Provider>
  );
}

// Export a hook to check if auth is initialized and get token
export const useAuthState = () => useContext(AuthStateContext);