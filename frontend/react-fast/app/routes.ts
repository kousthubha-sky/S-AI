// routes.ts
import { type RouteConfig, index, route } from "@react-router/dev/routes";


export default [
    index("routes/home.tsx"),
    route("signup", "routes/signup.tsx"),
    route("login", "routes/login.tsx"),
    route("dashboard", "routes/dashboard.tsx"),
    route("callback", "routes/callback.tsx"),
    route("terms", "routes/terms.tsx"),
    route("privacy", "routes/privacy.tsx"),
    route("refund", "routes/refund.tsx"),
    route("about", "routes/about.tsx"),
    route("features", "routes/features.tsx"),
    route("pricing", "routes/pricing.tsx"),
] satisfies RouteConfig;