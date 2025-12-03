// Updated Callback.tsx with better error handling
import { useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useNavigate } from 'react-router';
import { useToast } from '~/components/ui/toast';
import Loader from '~/components/loader-12';

export default function Callback() {
  const { isAuthenticated, error, isLoading } = useAuth0();
  const navigate = useNavigate();
  const { showToast } = useToast();

  useEffect(() => {
        
    if (error) {
      showToast(`Authentication error: ${error.message}`, 'error');
      navigate('/login?error=auth_failed');
      return;
    }

    if (!isLoading && isAuthenticated) {
      // Try to get return URL from multiple sources
      const urlParams = new URLSearchParams(window.location.search);
      const stateParam = urlParams.get('state');
      
      let returnTo = '/dashboard'; // Default fallback
      
      try {
        if (stateParam) {
          // Auth0 state is usually base64 encoded JSON
          const decodedState = JSON.parse(atob(stateParam));
          if (decodedState.returnTo) {
            returnTo = decodedState.returnTo;
          }
        }
      } catch (e) {
        console.warn('Could not parse state, using default redirect');
      }

      navigate(returnTo, { replace: true });
    }

    // If not authenticated and not loading, redirect to login
    if (!isLoading && !isAuthenticated) {
      showToast('User not authenticated. Redirecting to login.', 'warning');
      setTimeout(() => navigate('/login'), 2000);
    }
  }, [isAuthenticated, isLoading, error, navigate]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-2xl font-bold text-red-600">Authentication Error</h1>
        <p className="mt-2 text-gray-600">{error.message}</p>
        <button 
          onClick={() => navigate('/login')}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded"
        >
          Return to Login
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black">
      <Loader/>
      Completing Authentication
    </div>
  );
}