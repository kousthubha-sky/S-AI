import { useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';

export function AuthInitializer() {
  const { isAuthenticated, getAccessTokenSilently, user } = useAuth0();

  useEffect(() => {
    if (isAuthenticated && user) {
      const initializeAuth = async () => {
        try {
          // Get the access token
          const token = await getAccessTokenSilently();
          
          // Store the token in localStorage (or your preferred storage)
          localStorage.setItem('auth_token', token);
          
          // Log successful authentication
          console.log('User authenticated:', user.email);
          
          // Make a test call to the backend
          const response = await fetch('http://localhost:8000/protected', {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            console.log('Backend authentication successful:', data);
          } else {
            console.error('Backend authentication failed:', await response.text());
          }
        } catch (error) {
          console.error('Error during authentication:', error);
        }
      };

      initializeAuth();
    }
  }, [isAuthenticated, user, getAccessTokenSilently]);

  return null;
}