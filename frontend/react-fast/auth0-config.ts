export const auth0Config = {
  domain: import.meta.env.VITE_AUTH0_DOMAIN || 'your-auth0-domain.auth0.com',
  clientId: import.meta.env.VITE_AUTH0_CLIENT_ID || 'your-client-id',
  audience: import.meta.env.VITE_AUTH0_API_AUDIENCE || 'your-api-audience',
  authorizationParams: {
    redirect_uri: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173',
    // Remove audience if you don't need API access right away
  },
};