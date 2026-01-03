import { useAuth0 } from "@auth0/auth0-react";
import { useNavigate } from "react-router";
import type { ReactNode } from "react";
import { useEffect } from "react";
import  Loader  from "./loader-12";

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth0();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  if (isLoading) {
    return <Loader />;
  }

  if (!isAuthenticated) {
    return <Loader />;
  }

  return <>{children}</>;
}