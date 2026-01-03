// routes/home.tsx
import type { Route } from "./+types/home";
import { useNavigate } from "react-router";
import { useEffect } from "react";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "XCORE-AI Dashboard" },
    { name: "description", content: "Welcome to our XCORE platform!" },
  ];
}

export default function Home() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/dashboard', { replace: true });
  }, [navigate]);

  return null;
}