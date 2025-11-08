// hooks/useAuthApi.ts - IMPROVED VERSION

import { useAuth0 } from '@auth0/auth0-react';
import { useCallback, useRef } from 'react';
import { useToast } from '~/components/ui/toast';

export function useAuthApi() {
  const { getAccessTokenSilently, isAuthenticated, isLoading, loginWithRedirect } = useAuth0();
  const tokenCacheRef = useRef<{ token: string; expiresAt: number } | null>(null);
  const { showToast } = useToast();
  const fetchWithAuth = useCallback(async (url: string, options: RequestInit = {}) => {
    try {
      // ✅ Check if user is authenticated
      if (!isAuthenticated) {
        showToast('User not authenticated. Please log in.', 'error');
        throw new Error('User not authenticated. Please log in.');
      }

      // ✅ Wait if Auth0 is still loading
      if (isLoading) {
        showToast('Authentication in progress, please wait...', 'info');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      let token: string;

      // ✅ Try to use cached token first (if not expired)
      if (tokenCacheRef.current && tokenCacheRef.current.expiresAt > Date.now()) {
       
        token = tokenCacheRef.current.token;
      } else {
        // ✅ Get fresh token from Auth0
        try {
          token = await getAccessTokenSilently({
            authorizationParams: {
              audience: import.meta.env.VITE_AUTH0_API_AUDIENCE,
              scope: 'openid profile email'
            },
            cacheMode: 'on', // Use Auth0's cache
          });

          // ✅ Cache token for 50 minutes (tokens typically expire in 60 minutes)
          tokenCacheRef.current = {
            token,
            expiresAt: Date.now() + (50 * 60 * 1000)
          };

        
        } catch (tokenError: any) {
          console.error('Failed to get access token:', tokenError);
          
          // ✅ Handle specific Auth0 errors
          if (tokenError.error === 'login_required') {
            
            await loginWithRedirect({
              appState: { returnTo: window.location.pathname }
            });
            throw new Error('Login required. Redirecting...');
          }
          
          if (tokenError.error === 'consent_required') {
         
            throw new Error('Additional consent required. Please contact support.');
          }

          throw new Error(`Failed to get authentication token: ${tokenError.message || 'Unknown error'}`);
        }
      }
      
      // ✅ Make API request with token
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
          Authorization: `Bearer ${token}`,
        },
      });

      // ✅ Handle response errors
      if (!response.ok) {
        let errorData: any = null;
        let errorMessage = `HTTP error! status: ${response.status}`;

        try {
          errorData = await response.json();
          errorMessage = errorData?.detail || errorData?.message || errorMessage;
        } catch (parseError) {
          console.warn('Could not parse error response');
        }

        // ✅ Handle 401 - token might be expired
        if (response.status === 401) {
          showToast('Session expired. Redirecting to login...', 'warning');
          tokenCacheRef.current = null; // Clear cached token
          
          // Try once more with fresh token
         
          try {
            token = await getAccessTokenSilently({
              authorizationParams: {
                audience: import.meta.env.VITE_AUTH0_API_AUDIENCE,
                scope: 'openid profile email'
              },
              cacheMode: 'off', // Force fresh token
            });

            // Retry the request
            const retryResponse = await fetch(url, {
              ...options,
              headers: {
                'Content-Type': 'application/json',
                ...options.headers,
                Authorization: `Bearer ${token}`,
              },
            });

            if (retryResponse.ok) {
              
              return await retryResponse.json();
            }
          } catch (retryError) {
            console.error('Retry failed:', retryError);
          }

          // If retry fails, redirect to login
          await loginWithRedirect({
            appState: { returnTo: window.location.pathname }
          });
          throw new Error('Session expired. Please log in again.');
        }

        // ✅ Handle 402 - payment required
        if (response.status === 402) {
          const error = new Error(errorMessage);
          (error as any).status = 402;
          (error as any).data = errorData;
          throw error;
        }

        // ✅ Create detailed error
        const error = new Error(errorMessage);
        (error as any).status = response.status;
        (error as any).statusText = response.statusText;
        (error as any).data = errorData;
        
        console.error('API Error:', {
          url,
          status: response.status,
          statusText: response.statusText,
          data: errorData,
        });
        
        throw error;
      }

      // ✅ Return successful response
      const data = await response.json();
      return data;

    } catch (error: any) {
      console.error('API call failed:', error);
      
      // ✅ Re-throw with more context
      if (error.message) {
        throw error;
      }
      
      throw new Error('An unexpected error occurred. Please try again.');
    }
  }, [getAccessTokenSilently, isAuthenticated, isLoading, loginWithRedirect]);

  return { fetchWithAuth };
}