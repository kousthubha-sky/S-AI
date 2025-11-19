// routes/home.tsx
import type { Route } from "./+types/home";
import { Navigate } from "react-router";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "XCORE-AI Dashboard" },
    { name: "description", content: "Welcome to our XCORE platform!" },
  ];
}

export default function Home() {
  // Always redirect to dashboard regardless of authentication
  return <Navigate to="/dashboard" />;
}