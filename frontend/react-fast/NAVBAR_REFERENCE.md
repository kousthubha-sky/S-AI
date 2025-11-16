# Navbar Components Reference

## Navbar Component Structure

### Desktop View
```
┌─────────────────────────────────────────────────────────────────────┐
│ [S] SkyGPT    Pricing  Enterprise  About    [Login] [Get Started]   │
└─────────────────────────────────────────────────────────────────────┘
```

### Mobile View (Collapsed)
```
┌──────────────────────────────────────┐
│ [S] SkyGPT                      [≡]  │
└──────────────────────────────────────┘
```

### Mobile View (Expanded)
```
┌──────────────────────────────────────┐
│ [S] SkyGPT                      [✕]  │
├──────────────────────────────────────┤
│ Pricing                              │
│ Enterprise                           │
│ About                                │
├──────────────────────────────────────┤
│ [Login]                              │
│ [Get Started]                        │
└──────────────────────────────────────┘
```

## Navbar States

### State 1: Not Scrolled (Public Pages)
- Background: Transparent
- Text Color: White
- Logo: Visible with gradient background
- Buttons: Light colored with hover effects
- Mobile Menu: Dark background with transparency

### State 2: Scrolled (Public Pages)
- Background: White with backdrop blur
- Text Color: Gray/Black
- Logo: Visible with gradient background
- Buttons: Darker text with gray hover effects
- Mobile Menu: White background

### State 3: Authenticated (Dashboard)
- Navbar still available at top
- Buttons change to: [Logout]
- Same scroll effects as above
- All page links still functional

## Button States

### Before Authentication
```tsx
// Desktop
[Login Button] [Get Started - Gradient Button]

// Mobile
[Login Button]
[Get Started - Gradient Button]
```

### After Authentication
```tsx
// Desktop & Mobile
[Logout Button - Red Text]
```

## Color Scheme

### Gradient Buttons
- From: Blue (#3B82F6)
- To: Purple (#7C3AED)
- Hover: Darker shades of same gradient

### Text Colors
- Primary: White (default), Black (when scrolled)
- Secondary: Gray-300 to Gray-700 depending on scroll state
- Accent: Blue-400, Purple-400

### Hover States
- Links: Slightly brighter color
- Buttons: Slightly darker/brighter gradient

## Navigation Links

1. **Pricing** → `/pricing`
2. **Enterprise** → `/enterprise`
3. **About** → `/about`

All links are authenticated-neutral (visible before and after login).

## Logo

- Component: Single letter "S" in gradient background
- Dimensions: 32x32px
- Text: "SkyGPT" next to logo
- Link: Points to home page (`/`)

## Responsive Breakpoints

- **Mobile**: < 768px (md breakpoint)
  - Hamburger menu shown
  - Navigation items hidden
  - Links displayed in expanded menu

- **Desktop**: ≥ 768px (md breakpoint)
  - Hamburger menu hidden
  - Navigation items visible
  - Buttons inline with nav

## Animation Details

1. **Mobile Menu**: 
   - Slide down animation
   - Opacity fade in/out
   - Border color transitions

2. **Scroll Effect**:
   - Background transitions smoothly
   - Text color changes gradually
   - Backdrop blur effect

3. **Button Hover**:
   - Gradient shift on hover
   - Smooth color transitions

4. **Route Changes**:
   - Mobile menu automatically closes
   - Navigation smooth transitions

## Auth0 Integration Points

### Login Flow
```tsx
loginWithRedirect({
  appState: { returnTo: "/dashboard" },
})
```

### Signup Flow
```tsx
loginWithRedirect({
  appState: { returnTo: "/dashboard" },
  authorizationParams: {
    screen_hint: "signup",
  },
})
```

### Logout Flow
```tsx
logout({ logoutParams: { returnTo: window.location.origin } })
```

## Usage Example

### Import in any public page
```tsx
import Navbar from "~/components/layout/navbar";

export default function YourPage() {
  return (
    <div>
      <Navbar />
      {/* Your page content */}
    </div>
  );
}
```

### Dashboard (already has protected route)
- The navbar is not included in dashboard
- Dashboard has its own internal navigation (sidebar)
- Navbar appears on public pages only

## Accessibility Features

- Proper semantic HTML (nav element)
- Keyboard navigation support
- Proper link roles and labels
- Contrast ratios meet WCAG standards
- Mobile menu closes on route changes

## Performance Optimizations

- Uses `useState` for menu state management
- Scroll listener cleaned up in useEffect
- Memoized navigation links
- No unnecessary re-renders
- Smooth CSS transitions (GPU accelerated)
