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
    const { isAuthenticated, getAccessTokenSilently, isLoading } = useAuth0();
  const tokenRef = useRef<string | null>(null);



  const getToken = async () => {
    try {
      if (!isAuthenticated) {
        tokenRef.current = null;
        return null;
      }

      // If we have a cached token in memory and it's not expired, return it.
      if (tokenRef.current) {
        // (Optionally) check expiry by decoding JWT 'exp' claim here.
        return tokenRef.current;
      }

      const token = await getAccessTokenSilently({
        authorizationParams: {
          audience: import.meta.env.VITE_AUTH0_API_AUDIENCE,
          scope: 'openid profile email'
        }
      });

      tokenRef.current = token as string;
      return tokenRef.current;
    } catch (err) {
      console.error('Error getting token (silent):', err);
      tokenRef.current = null;
      return null;
    }
  };

  // Refresh logic: call getToken periodically but do not persist to localStorage
  useEffect(() => {
    if (!isAuthenticated) return;
    const refresh = async () => { await getToken(); };
    const id = setInterval(refresh, 55 * 60 * 1000);
    return () => clearInterval(id);
  }, [isAuthenticated]);

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
    <AuthStateContext.Provider value={{ isInitialized: !isLoading, hasValidToken: !!tokenRef.current, getToken }}>
      {children}
    </AuthStateContext.Provider>
  );
}

// Export a hook to check if auth is initialized and get token
export const useAuthState = () => useContext(AuthStateContext);