import { useAuth0 } from "@auth0/auth0-react";
import { Navigate } from "react-router";
import type { ReactNode } from "react";
import  Loader  from "./loader-12";

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth0();

  if (isLoading) {
    return <Loader />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return <>{children}</>;
}