// components/auth/AuthInitializer.tsx
import { useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';

export function AuthInitializer() {
  const { isAuthenticated, getAccessTokenSilently, user } = useAuth0();

  useEffect(() => {
    if (isAuthenticated) {
      const initializeAuth = async () => {
        try {
          // Get the actual access token (not authorization code)
          const token = await getAccessTokenSilently({
            authorizationParams: {
              audience: import.meta.env.VITE_AUTH0_API_AUDIENCE,
              scope: 'openid profile email'
            }
          });
          
          console.log('Access Token:', token); // Should start with "eyJ"
          
          // Store the token in localStorage
          localStorage.setItem('auth_token', token);
          
          // Verify it's a JWT token
          if (!token.startsWith('eyJ')) {
            console.error('Invalid token format - received:', token.substring(0, 20));
            return;
          }
          
          console.log('Authentication initialized successfully');
          
        } catch (error) {
          console.error('Error during authentication:', error);
        }
      };

      initializeAuth();
    } else {
      // Clear token when not authenticated
      localStorage.removeItem('auth_token');
    }
  }, [isAuthenticated, getAccessTokenSilently]);

  return null;
}