// sign-in.tsx
'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth0 } from "@auth0/auth0-react";
import { Navigate } from "react-router";
import { Link } from "react-router";
import {
  AppleIcon,
  AtSignIcon,
  ChevronLeftIcon,
  GithubIcon,
  Grid2x2PlusIcon,
} from 'lucide-react';

export function SignInPage() {
  const [email, setEmail] = useState('');
  const { loginWithRedirect, isAuthenticated } = useAuth0();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" />;
  }

  // Handle email authentication (handles both login AND signup)
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await loginWithRedirect({
        authorizationParams: {
          redirect_uri: `${window.location.origin}/callback`,
          // Remove screen_hint to let Auth0 handle both login and signup
          connection: "Username-Password-Authentication",
          login_hint: email,
        },
        appState: { 
          returnTo: "/dashboard"
        },
      });
    } catch (error) {
      console.error("Auth error:", error);
    }
  };

  // Handle social authentication (handles both login AND signup)
  const handleSocialAuth = async (connection: string) => {
    try {
      await loginWithRedirect({
        authorizationParams: {
          connection,
          redirect_uri: `${window.location.origin}/callback`,
          // Auth0 automatically handles new users vs existing users
        },
        appState: { 
          returnTo: "/dashboard",
          provider: connection 
        },
      });
    } catch (error) {
      console.error(`${connection} auth error:`, error);
    }
  };

  return (
    <main className="relative min-h-screen md:h-screen md:overflow-hidden lg:grid lg:grid-cols-2">
      {/* Left Side - Auth Form */}
      <div className="relative flex min-h-screen flex-col justify-center border-[#252525] lg:border-r-2 bg-gradient-to-l from-[#0a0a0a] via-[#000000] to-[#000000] p-4">
        <div
          aria-hidden
          className="absolute inset-0 isolate contain-strict -z-10 opacity-40"
        >
          <div className="absolute top-0 right-0 h-80 w-56 -translate-y-22 rounded-full bg-[radial-gradient(68.54%_68.72%_at_55.02%_31.46%,rgba(255,255,255,.04)_0,rgba(255,255,255,.01)_50%,transparent_80%)]" />
          <div className="absolute top-0 right-0 h-80 w-24 rounded-full bg-[radial-gradient(50%_50%_at_50%_50%,rgba(255,255,255,.03)_0,rgba(255,255,255,.01)_80%,transparent_100%)] [translate:5%_-50%]" />
          <div className="absolute top-0 right-0 h-80 w-24 -translate-y-22 rounded-full bg-[radial-gradient(50%_50%_at_50%_50%,rgba(255,255,255,.03)_0,rgba(255,255,255,.01)_80%,transparent_100%)]" />
        </div>
        
        <a 
          href="/dashboard"
          className="absolute top-7 left-5 flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-400 hover:text-white transition-colors"
        >
          <ChevronLeftIcon className='size-4' />
          Home
        </a>
        
        <div className="mx-auto w-full space-y-6 sm:max-w-sm">
          {/* Header */}
          <div className="flex items-center gap-2 lg:hidden">
            <Grid2x2PlusIcon className="size-6 text-white" />
            <p className="text-xl font-semibold text-white">XCORE-AI</p>
          </div>
          
          <div className="flex flex-col space-y-2">
            <h1 className="text-3xl font-bold tracking-wide text-white">
              Sign In or Join Now!
            </h1>
            <p className="text-base text-gray-400">
              Login or create your Xcore-ai account.
            </p>
          </div>

          {/* Social Auth Buttons */}
          <div className="space-y-3">
            <button 
              type="button"
              className="flex w-full items-center justify-center gap-3 rounded-lg bg-white py-3 px-4 text-sm font-medium text-[#0a0a0a] transition-colors hover:bg-gray-100"
              onClick={() => handleSocialAuth('google-oauth2')}
            >
              <GoogleIcon className='size-5' />
              Continue with Google
            </button>
            <button 
              type="button"
              className="flex w-full items-center justify-center gap-3 rounded-lg bg-white py-3 px-4 text-sm font-medium text-[#0a0a0a] transition-colors hover:bg-gray-100"
              onClick={() => handleSocialAuth('apple')}
            >
              <AppleIcon className='size-5' />
              Continue with Apple
            </button>
            <button 
              type="button"
              className="flex w-full items-center justify-center gap-3 rounded-lg bg-white py-3 px-4 text-sm font-medium text-[#0a0a0a] transition-colors hover:bg-gray-100"
              onClick={() => handleSocialAuth('github')}
            >
              <GithubIcon className='size-5' />
              Continue with GitHub
            </button>
          </div>

          <AuthSeparator />

          {/* Email Form */}
          <form className="space-y-3" onSubmit={handleEmailAuth}>
            <p className="text-xs text-gray-500">
              Enter your email address to sign in or create an account
            </p>
            <div className="relative h-max">
              <input
                placeholder="your.email@example.com"
                className="peer w-full rounded-lg border border-[#3a3a3a] bg-[#0a0a0a] py-3 ps-10 pr-4 text-sm text-white placeholder:text-gray-600 focus:border-gray-700 focus:outline-none"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3 text-gray-600 peer-disabled:opacity-50">
                <AtSignIcon className="size-4" aria-hidden="true" />
              </div>
            </div>

            <button 
              type="submit" 
              className="w-full rounded-lg bg-white py-3 px-4 text-sm font-medium text-[#0a0a0a] transition-colors hover:bg-gray-100"
            >
              Continue With Email
            </button>
          </form>

          {/* Terms */}
          <p className="text-xs text-gray-500">
            By clicking continue, you agree to our{' '}
            <a
              href="/terms"
              className="text-gray-400 underline underline-offset-4 hover:text-white"
            >
              Terms of Service
            </a>{' '}
            and{' '}
            <a
              href="/privacy"
              className="text-gray-400 underline underline-offset-4 hover:text-white"
            >
              Privacy Policy
            </a>
            .
          </p>

          {/* Navigation Links */}
          <div className="flex flex-wrap justify-center gap-4 text-xs text-gray-500">
            <a
              href="/features"
              className="text-gray-400 underline underline-offset-4 hover:text-white"
            >
              Features
            </a>
            <a
              href="/pricing"
              className="text-gray-400 underline underline-offset-4 hover:text-white"
            >
              Pricing
            </a>
            <a
              href="/about"
              className="text-gray-400 underline underline-offset-4 hover:text-white"
            >
              About
            </a>
          </div>
        </div>
      </div>

      {/* Right Side - Branding & Visuals */}
      <div className="relative hidden h-full flex-col bg-gradient-to-t from-[#0a0a0a] via-[#141414] to-[#222121] p-10 lg:flex">
        <div className="absolute inset-0 z-10 bg-gradient-to-b from-transparent to-black/10" />
        
        <div className="z-20 flex items-center gap-2">
          <Grid2x2PlusIcon className="size-6 text-white" />
          <p className="text-xl font-semibold text-white">XCORE-AI</p>
        </div>
        
        <div className="z-20 mt-auto">
          <blockquote className="space-y-2">
            <p className="text-xl text-white">
              &ldquo;This Platform has helped me to save time and serve my
              clients faster than ever before.&rdquo;
            </p>
            <footer className="font-mono text-sm font-semibold text-white">
              ~ Ali Hassan
            </footer>
          </blockquote>
        </div>
        
        <div className="absolute inset-0">
          <FloatingPaths position={1} />
          <FloatingPaths position={-1} />
        </div>
        
      </div>
    </main>
  );
}

// Floating animated paths
function FloatingPaths({ position }: { position: number }) {
  const paths = Array.from({ length: 36 }, (_, i) => ({
    id: i,
    d: `M-${380 - i * 5 * position} -${189 + i * 6}C-${
        380 - i * 5 * position
      } -${189 + i * 6} -${312 - i * 5 * position} ${216 - i * 6} ${
        152 - i * 5 * position
      } ${343 - i * 6}C${616 - i * 5 * position} ${470 - i * 6} ${
        684 - i * 5 * position
      } ${875 - i * 6} ${684 - i * 5 * position} ${875 - i * 6}`,
    width: 0.5 + i * 0.03,
  }));

  return (
    <div className="pointer-events-none absolute inset-0">
      <svg
        className="h-full w-full text-white"
        viewBox="0 0 696 316"
        fill="none"
      >
        <title>Background Paths</title>
        {paths.map((path) => (
          <motion.path
            key={path.id}
            d={path.d}
            stroke="currentColor"
            strokeWidth={path.width}
            strokeOpacity={0.3 + path.id * 0.002}
            initial={{ pathLength: 0.3, opacity: 0.4 }}
            animate={{
              pathLength: 1,
              opacity: [1, 0.4, 0.2],
              pathOffset: [0, 1, 0],
            }}
            transition={{
              duration: 20 + Math.random() * 10,
              repeat: Number.POSITIVE_INFINITY,
              ease: 'linear',
            }}
          />
        ))}
      </svg>
    </div>
  );
}

const GoogleIcon = (props: React.ComponentProps<'svg'>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    {...props}
  >
    <g>
      <path d="M12.479,14.265v-3.279h11.049c0.108,0.571,0.164,1.247,0.164,1.979c0,2.46-0.672,5.502-2.84,7.669   C18.744,22.829,16.051,24,12.483,24C5.869,24,0.308,18.613,0.308,12S5.869,0,12.483,0c3.659,0,6.265,1.436,8.223,3.307L18.392,5.62   c-1.404-1.317-3.307-2.341-5.913-2.341C7.65,3.279,3.873,7.171,3.873,12s3.777,8.721,8.606,8.721c3.132,0,4.916-1.258,6.059-2.401   c0.927-0.927,1.537-2.251,1.777-4.059L12.479,14.265z" />
    </g>
  </svg>
);

const AuthSeparator = () => {
  return (
    <div className="flex w-full items-center justify-center">
      <div className="h-px w-full bg-[#2a2a2a]" />
      <span className="px-3 text-xs text-gray-500">OR</span>
      <div className="h-px w-full bg-[#2a2a2a]" />
    </div>
  );
};