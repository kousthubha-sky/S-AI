export const auth0Config = {
  domain: import.meta.env.VITE_AUTH0_DOMAIN || 'your-auth0-domain.auth0.com',
  clientId: import.meta.env.VITE_AUTH0_CLIENT_ID || 'your-client-id',
  authorizationParams: {
    redirect_uri: window.location.origin,
    audience: import.meta.env.VITE_AUTH0_AUDIENCE || 'your-api-audience',
  },
};