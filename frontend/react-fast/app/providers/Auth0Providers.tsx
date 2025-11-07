import { Auth0Provider } from '@auth0/auth0-react';
import { auth0Config } from '../../auth0-config';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { AuthInitializer } from '../components/auth/AuthInitializer';

interface AuthProviderProps {
  children: ReactNode;
}

export default function AuthProvider({ children }: AuthProviderProps) {
  const navigate = useNavigate();

  if (typeof window === 'undefined') {
    return <>{children}</>;
  }

  const onRedirectCallback = (appState: any) => {
    navigate(appState?.returnTo || '/dashboard');
  };

  // Log Auth0 configuration
  console.log('Auth0 Config:', {
    domain: auth0Config.domain,
    clientId: auth0Config.clientId.substring(0, 8) + '...',
    audience: import.meta.env.VITE_AUTH0_API_AUDIENCE,
    redirect_uri: `${window.location.origin}/callback`
  });

  return (
    <Auth0Provider
      domain={auth0Config.domain}
      clientId={auth0Config.clientId}
      authorizationParams={{
        redirect_uri: `${window.location.origin}/callback`,
        audience: import.meta.env.VITE_AUTH0_API_AUDIENCE,
        scope: 'openid profile email offline_access'
      }}
      cacheLocation="localstorage"
      useRefreshTokens={true}
      useRefreshTokensFallback={true}
      onRedirectCallback={onRedirectCallback}
    >
      <AuthInitializer>
        {children}
      </AuthInitializer>
    </Auth0Provider>
  );
}