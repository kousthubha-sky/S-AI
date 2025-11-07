// services/userService.ts - Improved version
import apiClient from '../../api';

interface Auth0User {
  sub?: string;
  email: string;
  name?: string;
  picture?: string;
  [key: string]: any; // Allow other properties from Auth0
}

interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

export class UserService {
  static async getOrCreateUser(auth0User: Auth0User): Promise<User> {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      throw new Error('No authentication token available');
    }

    try {
      console.log('Attempting to get existing user profile...');
      // First, try to get the current user
      try {
        const profileResponse = await apiClient.get('/api/profile');
        console.log('Profile response:', profileResponse.data);
        if (profileResponse.data?.id) {
          return profileResponse.data;
        }
      } catch (getError: any) {
        console.log('Profile fetch error:', getError.response?.data || getError.message);
        console.log('Profile not found, will create new user...');
      }

      console.log('Creating new user with data:', {
        email: auth0User.email,
        name: auth0User.name || auth0User.email?.split('@')[0] || 'User',
        sub: auth0User.sub
      });

      // Create user with Auth0 data
      const createResponse = await apiClient.post('/api/users', {
        email: auth0User.email,
        name: auth0User.name || auth0User.email?.split('@')[0] || 'User',
        picture: auth0User.picture,
        auth0_id: auth0User.sub // Make sure to include the Auth0 ID
      });
      
      console.log('Create user response:', createResponse.data);
      
      if (!createResponse.data?.id) {
        throw new Error('Created user response missing ID');
      }
      
      return createResponse.data;

    } catch (error: any) {
      console.error('Error in getOrCreateUser:', error);
      
      // Handle specific error cases
      if (error.response?.status === 409) {
        // User already exists, try to get profile again
        const profileResponse = await apiClient.get('/api/profile', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        return profileResponse.data;
      }
      
      if (error.response?.status === 401 || error.response?.status === 403) {
        localStorage.removeItem('auth_token');
        throw new Error('Authentication failed');
      }
      
      throw new Error(`Failed to get or create user: ${error.message}`);
    }
  }
}