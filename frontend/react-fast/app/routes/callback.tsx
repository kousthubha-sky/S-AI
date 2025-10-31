import { useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useNavigate } from 'react-router';

export default function Callback() {
  const { isAuthenticated, error } = useAuth0();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      // Get the intended destination from Auth0's state
      const searchParams = new URLSearchParams(window.location.search);
      const state = searchParams.get('state');
      let decodedState;
      
      try {
        decodedState = state ? JSON.parse(atob(state)) : null;
      } catch (e) {
        console.error('Failed to parse state:',e);
        decodedState = null;
      }

      // Navigate to the return URL or fallback to dashboard
      const returnTo = decodedState?.returnTo || '/dashboard';
      navigate(returnTo);
    }
  }, [isAuthenticated, navigate]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-2xl font-bold text-red-600">Oops... {error.message}</h1>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      <p className="mt-4 text-lg">Completing authentication...</p>
    </div>
  );
}