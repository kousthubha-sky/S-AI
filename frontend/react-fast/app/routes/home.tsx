// routes/home.tsx
import type { Route } from "./+types/home";
import { useAuth0 } from "@auth0/auth0-react";
import { Navigate } from "react-router";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "SAAS Dashboard" },
    { name: "description", content: "Welcome to our SAAS platform!" },
  ];
}

export default function Home() {
  const { isAuthenticated, isLoading } = useAuth0();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  // Redirect to dashboard if authenticated, otherwise to login
  return isAuthenticated ? <Navigate to="/dashboard" /> : <Navigate to="/login" />;
}