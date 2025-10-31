// services/userService.ts
import apiClient from '../../api'

export class UserService {
  static async getOrCreateUser(auth0User: any): Promise<any> {
    try {
      // First, ensure the user exists in our backend
      const profileResponse = await apiClient.get('/api/profile');
      return profileResponse.data;
    } catch (error: any) {
      console.error('Error in getOrCreateUser:', error);
      
      // If profile fails, try to create the user explicitly
      if (error.response?.status === 500 || error.response?.status === 404) {
        try {
          const createResponse = await apiClient.post('/api/users');
          return createResponse.data.user;
        } catch (createError) {
          console.error('Failed to create user:', createError);
          throw createError;
        }
      }
      throw error;
    }
  }

  static async getCurrentUser(): Promise<any> {
    try {
      const response = await apiClient.get('/api/users/me');
      return response.data;
    } catch (error) {
      console.error('Error getting current user:', error);
      throw error;
    }
  }
}