// services/userService.ts - REPLACE ENTIRE FILE

interface Auth0User {
  sub?: string;
  email: string;
  name?: string;
  picture?: string;
}

interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
  subscription_tier?: string;
}

export class UserService {
  static async getOrCreateUser(
    auth0User: Auth0User,
    getToken: () => Promise<string>
  ): Promise<User> {
    try {
      const token = await getToken();
      
      if (!token) {
        throw new Error('No authentication token available');
      }

      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/api/users`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            email: auth0User.email,
            name: auth0User.name,
            picture: auth0User.picture,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to create user');
      }

      return await response.json();
    } catch (error: any) {
      // If user already exists, fetch their data
      if (error.message?.includes('409') || error.message?.includes('400')) {
        try {
          const token = await getToken();
          const response = await fetch(
            `${import.meta.env.VITE_API_BASE_URL}/api/users/me`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );
          
          if (!response.ok) {
            throw new Error('Failed to fetch user');
          }
          
          return await response.json();
        } catch (fetchError) {
          console.error('Failed to fetch existing user:', fetchError);
          throw fetchError;
        }
      }
      
      console.error('Failed to get or create user:', error);
      throw error;
    }
  }

  static async getUserById(
    userId: string,
    getToken: () => Promise<string>
  ): Promise<User> {
    try {
      const token = await getToken();
      
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/api/users/${userId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch user');
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch user:', error);
      throw error;
    }
  }

  static async updateUser(
    userId: string,
    updates: Partial<User>,
    getToken: () => Promise<string>
  ): Promise<User> {
    try {
      const token = await getToken();
      
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/api/users/${userId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(updates),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update user');
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to update user:', error);
      throw error;
    }
  }
}