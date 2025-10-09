import type { Route } from "./+types/home";
import LoginPage from "./login";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "SAAS" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export default function Home() {
    return <LoginPage />;
}
