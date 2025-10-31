// services/userService.ts
import apiClient from '../../api';
import { useAuthState } from '../components/auth/AuthInitializer';

export class UserService {
  static async getOrCreateUser(auth0User: any): Promise<any> {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      console.error('No auth token available');
      throw new Error('Authentication not initialized');
    }

    try {
      // Always try to create the user first
      try {
        const createResponse = await apiClient.post('/api/users', {
          email: auth0User.email,
          name: auth0User.name
        }, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        return createResponse.data.user;
      } catch (createError: any) {
        // If user already exists (409), proceed to get profile
        if (createError.response?.status !== 409) {
          console.error('Unexpected error creating user:', createError);
        }
      }

      // Get or return existing profile
      const profileResponse = await apiClient.get('/api/profile', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      return profileResponse.data;
    } catch (error: any) {
      console.error('Error in getOrCreateUser:', error);
      
      // Handle auth errors
      if (error.response?.status === 403 || error.response?.status === 401) {
        console.error('Authentication error - token might be invalid');
        localStorage.removeItem('auth_token');
        throw new Error('Authentication required');
      }
      
      throw error;
    }
  }

  static async getCurrentUser(): Promise<any> {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      console.error('No auth token available');
      throw new Error('Authentication not initialized');
    }

    try {
      const response = await apiClient.get('/api/users/me', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error getting current user:', error);
      throw error;
    }
  }
}