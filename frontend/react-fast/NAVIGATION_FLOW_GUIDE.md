# Navigation Flow Diagram

## User Journey - Unauthenticated

```
┌─────────────────────────────────────────────────────┐
│                    LANDING PAGE                      │
│  Navbar: [SkyGPT Logo] [Pricing] [Enterprise] [About]│
│          [Login] [Get Started]                       │
└─────────────────────────────────────────────────────┘
                          │
                 ┌────────┴────────┐
                 │                 │
         Click "Pricing"    Click "Get Started"
                 │                 │
                 ▼                 ▼
        ┌─────────────────┐  ┌──────────────────┐
        │ PRICING PAGE    │  │ SIGNUP PAGE      │
        │ [Navbar]        │  │ [Auth0 Form]     │
        │ [Plans]         │  │ [Create Account] │
        └─────────────────┘  └──────────────────┘
                                      │
                                      │ Success
                                      ▼
                            ┌──────────────────┐
                            │ DASHBOARD        │
                            │ (Authenticated)  │
                            │ [Sidebar Nav]    │
                            │ [Chat Interface] │
                            └──────────────────┘
```

## Navigation Structure

### Header/Navbar Layer
```
┌─────────────────────────────────────────────────────────┐
│ [Logo] SkyGPT  [Pricing] [Enterprise] [About]           │
│                                      [Login] [Started]   │
└─────────────────────────────────────────────────────────┘
```

### Public Pages
```
Home Page        Pricing Page       Enterprise Page       About Page
├─ Navbar        ├─ Navbar          ├─ Navbar            ├─ Navbar
├─ Hero          ├─ Plans           ├─ Features          ├─ Mission
├─ CTA           ├─ Comparison      ├─ Pricing           ├─ Values
├─ Footer        ├─ FAQ             ├─ Contact           ├─ Timeline
                 └─ Footer          └─ Footer            └─ Footer

Login Page       Signup Page
├─ Navbar        ├─ Navbar
├─ Form          ├─ Form
└─ Footer        └─ Footer
```

### Protected Pages
```
Dashboard
├─ Sidebar (Internal Navigation)
├─ Chat Interface
└─ Profile Settings
(No top navbar - has internal sidebar nav)
```

## Route Hierarchy

```
/
├─ /login
│  └─ Navbar: [Login] [Get Started]
├─ /signup
│  └─ Navbar: [Login] [Get Started]
├─ /pricing
│  └─ Navbar: [Pricing] [Enterprise] [About]
├─ /enterprise
│  └─ Navbar: [Pricing] [Enterprise] [About]
├─ /about
│  └─ Navbar: [Pricing] [Enterprise] [About]
├─ /dashboard (Protected)
│  └─ Internal Sidebar (No Navbar)
├─ /terms
├─ /privacy
├─ /refund
└─ /callback (Auth0)
```

## Authentication Flow

```
User Not Logged In
       │
       ├─→ Click "Login" ──→ Auth0 Login Page ──→ Authenticate ──→ /dashboard
       │
       ├─→ Click "Get Started" ──→ Auth0 Signup Page ──→ Create Account ──→ /dashboard
       │
       └─→ Navigate Public Pages (No restrictions)

User Logged In
       │
       ├─→ Navbar shows "Logout" button
       │
       ├─→ Can access /dashboard
       │
       ├─→ Can still view /pricing, /enterprise, /about
       │
       └─→ Click "Logout" ──→ Cleared Session ──→ Redirect to home
```

## Navbar Button States

### State 1: Not Authenticated (Before Login)
```
┌────────────────────────────────────────────────────┐
│ [Logo] SkyGPT                                      │
│                                                    │
│ [Pricing]  [Enterprise]  [About]  |  [Login] [Get Started]
│                                                    │
└────────────────────────────────────────────────────┘
```

### State 2: Authenticated (After Login)
```
┌────────────────────────────────────────────────────┐
│ [Logo] SkyGPT                                      │
│                                                    │
│ [Pricing]  [Enterprise]  [About]  |  [Logout]
│                                                    │
└────────────────────────────────────────────────────┘
```

### State 3: Mobile Menu (Collapsed)
```
┌──────────────────────────────┐
│ [Logo] SkyGPT         [≡]    │
└──────────────────────────────┘
```

### State 4: Mobile Menu (Expanded)
```
┌──────────────────────────────┐
│ [Logo] SkyGPT         [✕]    │
├──────────────────────────────┤
│ Pricing                      │
│ Enterprise                   │
│ About                        │
├──────────────────────────────┤
│ [Login Button]               │
│ [Get Started Button]         │
└──────────────────────────────┘
```

## Component Tree

```
App (root.tsx)
│
├─ AuthProvider
│  │
│  ├─ Router
│  │  │
│  │  ├─ Home Route
│  │  │  └─ No Navbar (Redirects)
│  │  │
│  │  ├─ Public Routes
│  │  │  ├─ Login
│  │  │  │  ├─ Navbar Component ✅
│  │  │  │  ├─ SignInPage
│  │  │  │  └─ Footer
│  │  │  │
│  │  │  ├─ Signup
│  │  │  │  ├─ Navbar Component ✅
│  │  │  │  ├─ SignupForm
│  │  │  │  └─ Footer
│  │  │  │
│  │  │  ├─ Pricing
│  │  │  │  ├─ Navbar Component ✅
│  │  │  │  ├─ PricingContent
│  │  │  │  └─ Footer
│  │  │  │
│  │  │  ├─ Enterprise
│  │  │  │  ├─ Navbar Component ✅
│  │  │  │  ├─ EnterpriseContent
│  │  │  │  └─ Footer
│  │  │  │
│  │  │  └─ About
│  │  │     ├─ Navbar Component ✅
│  │  │     ├─ AboutContent
│  │  │     └─ Footer
│  │  │
│  │  └─ Protected Routes
│  │     ├─ Dashboard
│  │     │  └─ ProtectedRoute
│  │     │     └─ DashboardContent
│  │     │        ├─ Sidebar (Internal Nav)
│  │     │        └─ ChatInterface
│  │     │
│  │     └─ Other Protected Routes
│  │
│  └─ ToastProvider
│     └─ ShortcutProvider
```

## Data Flow

### Authentication State
```
Auth0 Context
     │
     ├─ isAuthenticated (boolean)
     ├─ user (Auth0User)
     ├─ login() (function)
     ├─ logout() (function)
     └─ getAccessTokenSilently() (function)
     
Used by:
├─ Navbar Component
│  ├─ Shows/hides Login/Get Started/Logout
│  ├─ Handles Auth0 flows
│  └─ Manages redirect
└─ Dashboard Component
   └─ Protected by ProtectedRoute
```

### Navigation State
```
React Router Context
     │
     ├─ Current Route
     ├─ Route Parameters
     ├─ Navigation History
     └─ Query Parameters

Routes:
├─ /login
├─ /signup
├─ /pricing
├─ /enterprise
├─ /about
├─ /dashboard (protected)
└─ Others...
```

## Conditional Rendering

### In Navbar Component
```jsx
if (!isAuthenticated) {
  show [Login] [Get Started] buttons
} else {
  show [Logout] button
}
```

### In ProtectedRoute Component
```jsx
if (!isAuthenticated) {
  redirect to /login
} else {
  show protected content
}
```

## URL Routes Map

```
HTTP Request Flow:

GET / ──→ Redirects to /dashboard (if auth) or /login (if not)
GET /login ──→ SignInPage with Navbar
GET /signup ──→ SignupForm with Navbar
GET /pricing ──→ PricingPage with Navbar
GET /enterprise ──→ EnterprisePage with Navbar
GET /about ──→ AboutPage with Navbar
GET /dashboard ──→ DashboardContent (Protected)
GET /terms ──→ TermsPage
GET /privacy ──→ PrivacyPage
GET /refund ──→ RefundPage
POST /api/auth/login ──→ Auth0 Handled
POST /api/auth/logout ──→ Auth0 Handled
```

## Mobile Responsiveness

### Breakpoints
```
< 768px (md)       ≥ 768px (md)
─────────────      ──────────────
Mobile View        Desktop View
├─ Hamburger       ├─ Full Menu
├─ Stack Layout    ├─ Inline Layout
├─ Touch Friendly  ├─ Keyboard/Mouse
└─ Vertical Menu   └─ Horizontal Menu
```

### Navbar Responsive Behavior
```
Viewport < 768px
└─ Mobile Menu
   ├─ Hamburger Icon Shows
   ├─ Navbar Links Hidden
   ├─ Expanded Menu Full Width
   └─ Stack Buttons Vertically

Viewport ≥ 768px
└─ Desktop Menu
   ├─ Hamburger Icon Hidden
   ├─ Navbar Links Visible
   ├─ Inline Layout
   └─ Buttons Inline
```

---

## Quick Reference

| Scenario | Action | Result |
|----------|--------|--------|
| User visits /login | Not authenticated | Navbar with Login/Get Started |
| User clicks Get Started | Triggers signup | Auth0 signup flow |
| User creates account | Success | Redirected to /dashboard |
| User in /dashboard | Authenticated | Internal sidebar nav, no top navbar |
| User clicks Logout | From navbar | Cleared session, back to home |
| User clicks Pricing link | From navbar | Navigate to /pricing page |
| Mobile, width < 768px | Any page | Hamburger menu appears |
| User scrolls page | Any page | Navbar background changes color |
