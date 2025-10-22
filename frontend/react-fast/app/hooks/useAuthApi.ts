import { useAuth0 } from '@auth0/auth0-react';
import { useCallback } from 'react';

export function useAuthApi() {
  const { getAccessTokenSilently } = useAuth0();

  const fetchWithAuth = useCallback(async (url: string, options: RequestInit = {}) => {
    try {
      const token = await getAccessTokenSilently();
      
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.detail || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API call failed:', error);
      throw error;
    }
  }, [getAccessTokenSilently]);

  return { fetchWithAuth };
}