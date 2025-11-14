import React, { useState } from "react"
import { Link, Navigate } from "react-router"
import { useAuth0 } from "@auth0/auth0-react"


interface SignInPageProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  heroImageSrc?: string;

}


// --- SUB-COMPONENTS ---

const GlassInputWrapper = ({ children }: { children: React.ReactNode }) => (
  <div className="rounded-2xl border border-border bg-foreground/5 backdrop-blur-sm transition-colors focus-within:border-violet-400/70 focus-within:bg-violet-500/10">
    {children}
  </div>
);

const GoogleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 48 48">
    <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s12-5.373 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-2.641-.21-5.236-.611-7.743z" />
    <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
    <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
    <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C42.022 35.026 44 30.038 44 24c0-2.641-.21-5.236-.611-7.743z" />
  </svg>
);

const FacebookIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 48 48">
    <path fill="#1976D2" d="M24 4C12.954 4 4 12.954 4 24s8.954 20 20 20 20-8.954 20-20S35.046 4 24 4z" />
    <path fill="#FFFFFF" d="M26.707 29.301h5.176l.813-5.58h-5.989v-2.566c0-1.554.471-2.627 2.61-2.627h2.966V11.271c-.576-.078-1.797-.248-3.684-.248-3.65 0-6.155 2.437-6.155 6.905v3.289h-4.13v5.58h4.13V36h5.263v-6.699z" />
  </svg>
);
const GithubIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 48 48">
    <path fill="#000000" d="M24 4A20 20 0 1 0 24 44A20 20 0 1 0 24 4Z" />
    <path fill="#FFFFFF" d="M24 14.6c-5.1 0-9.3 4.2-9.3 9.3c0 4.1 2.6 7.6 6.2 8.9c.5.1.6-.2.6-.4v-1.5c-2.5.5-3.1-1.1-3.1-1.1c-.4-.9-1-1.2-1-1.2c-.8-.5.1-.5.1-.5c.9.1 1.4 1 1.4 1c.8 1.4 2.2 1 2.7.8c.1-.6.3-1 .6-1.3c-2-.2-4.1-1-4.1-4.6c0-1 .4-1.9 1-2.6c-.1-.2-.4-1.2.1-2.4c0 0 .8-.3 2.6 1c.8-.2 1.6-.3 2.4-.3s1.6.1 2.4.3c1.8-1.3 2.6-1 2.6-1c.5 1.2.2 2.2.1 2.4c.6.7 1 1.6 1 2.6c0 3.6-2.1 4.4-4.1 4.6c.3.3.6.9.6 1.8v2.6c0 .2.1.5.6.4c3.7-1.3 6.2-4.8 6.2-8.9c0-5.1-4.2-9.3-9.3-9.3z"/>
  </svg>
);



export const SignupPage: React.FC<SignInPageProps> = ({
  title = <span className="font-light text-foreground tracking-tighter">Welcome Back</span>,
  description = "Access your account and continue your journey with us",
  heroImageSrc = "https://images.unsplash.com/photo-1618005198919-d3d4b5a92ead?w=800&auto=format&fit=crop",
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [slideImage, setSlideImage] = useState(false);
  const { loginWithRedirect, isAuthenticated } = useAuth0();


  if (isAuthenticated) {
    return <Navigate to="/dashboard" />;
  }

  const handleSignup = async () => {
    try {
      await loginWithRedirect({
        authorizationParams: {
          redirect_uri: `${window.location.origin}/callback`,
          screen_hint: "signup",
          connection: "Username-Password-Authentication",
        },
        appState: { returnTo: "/dashboard", type: "signup" },
      });
    } catch (error) {
      console.error("Signup error:", error);
    }
  };

  const handleGoogleSignup = async () => {
    try {
      await loginWithRedirect({
        authorizationParams: {
          connection: "google-oauth2",
          redirect_uri: `${window.location.origin}/callback`,
          screen_hint: "signup",
        },
        appState: { returnTo: "/dashboard", type: "signup", provider: "google" },
      });
    } catch (error) {
      console.error("Google signup error:", error);
    }
  };

  const handleFacebookSignup = async () => {
    try {
      await loginWithRedirect({
        authorizationParams: {
          connection: "facebook",
          redirect_uri: `${window.location.origin}/callback`,
          screen_hint: "signup",
        },
        appState: { returnTo: "/dashboard", type: "signup", provider: "facebook" },
      });
    } catch (error) {
      console.error("Facebook signup error:", error);
    }
  };

  const handleGithubSignup = async () => {
    try {
      await loginWithRedirect({
        authorizationParams: {
          connection: "github",
          redirect_uri: `${window.location.origin}/callback`,
          screen_hint: "signup",
        },
        appState: { returnTo: "/dashboard", type: "signup", provider: "github" },
      });
    } catch (error) {
      console.error("Github signup error:", error);
    }
  };

  const handleAuth0Login = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    handleSignup();
  };

  return (
      <div className="h-[100dvh] flex flex-col md:flex-row font-geist w-[100dvw] overflow-hidden">
        <style>{`
          @keyframes slideImageLeft {
            from { transform: translateX(0); }
            to { transform: translateX(-100%); }
          }
          .slide-image-left {
            animation: slideImageLeft 0.8s ease-in-out forwards;
          }
        `}</style>
        {/* Right column: hero image that slides left */}
        {heroImageSrc && (
          <section className="hidden md:block flex-1 relative p-4">
            <div 
              className={`absolute inset-4 rounded-3xl bg-cover bg-center ${slideImage ? 'slide-image-left' : ''}`}
              style={{ backgroundImage: `url(${heroImageSrc})` }}
            ></div>
          </section>
        )}
        {/* Left column: sign-in form */}
        <section className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-md">
            <div className="flex flex-col gap-6">
              <h1 className="animate-element animate-delay-100 text-4xl md:text-5xl font-semibold leading-tight">{title}</h1>
              <p className="animate-element animate-delay-200 text-muted-foreground">{description}</p>
  
              <form className="space-y-5" onSubmit={handleAuth0Login}>
                <div className="animate-element animate-delay-300">
                  <label className="text-sm font-medium text-muted-foreground">Email Address</label>
                  <GlassInputWrapper>
                    <input 
                      name="email" 
                      type="email" 
                      placeholder="Enter your email address" 
                      className="w-full bg-transparent text-sm p-4 rounded-2xl focus:outline-none" 
                      required
                    />
                  </GlassInputWrapper>
                </div>
  
  
  
                <button 
                  type="submit" 
                  className="animate-element animate-delay-600 w-full rounded-2xl bg-primary py-4 font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  Sign In
                </button>
              </form>
  
              <div className="animate-element animate-delay-700 relative flex items-center justify-center">
                <span className="w-full border-t border-border"></span>
                <span className="px-4 text-sm text-muted-foreground bg-background absolute">Or continue with</span>
              </div>
  
              <button 
                onClick={handleGoogleSignup} 
                type="button"
                className="animate-element animate-delay-800 w-full flex items-center justify-center gap-3 border border-border rounded-2xl py-4 hover:bg-secondary transition-colors"
              >
                <GoogleIcon />
                Continue with Google
              </button>
  
              <button 
                onClick={handleFacebookSignup} 
                type="button"
                className="animate-element animate-delay-900 w-full flex items-center justify-center gap-3 border border-border rounded-2xl py-4 hover:bg-secondary transition-colors"
              >
                <FacebookIcon />
                Continue with Facebook
              </button>
              <button 
                onClick={handleGithubSignup} 
                type="button"
                className="animate-element animate-delay-900 w-full flex items-center justify-center gap-3 border border-border rounded-2xl py-4 hover:bg-secondary transition-colors"
              >
                <GithubIcon />
                Continue with Github
              </button> 
              <p className="animate-element animate-delay-1100 text-center text-sm text-muted-foreground">
                Already a User?{" "}
                <Link to={"/Login"}
                  
                  className="text-violet-400 hover:underline transition-colors"
                >
                  Login
                </Link>
              </p>
  
              {/* Footer Links */}
              <div className="animate-element animate-delay-1200 flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground pt-4 border-t border-border/30">
                <div className="flex items-center gap-1">
                  <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Secured by Auth0</span>
                </div>
                <Link to="/terms" className="hover:text-violet-400 transition-colors">Terms</Link>
                <Link to="/privacy" className="hover:text-violet-400 transition-colors">Privacy</Link>
                <Link to="/refund" className="hover:text-violet-400 transition-colors">Refund Policy</Link>
              </div>
            </div>
          </div>
        </section>
  
        
      </div>
    );
  };