# Subscription Tier Bug Report & Fix

## Issue Summary
After purchasing the Starter Pack subscription, users cannot access starter-tier features. The dashboard shows "free" tier even after successful payment verification.

## Root Causes Identified

### 1. **Subscription Record Not Created**
- **Location**: `backend/main.py` - `/api/verify-payment` endpoint (line ~579)
- **Problem**: Payment verification updates the `users` table with `subscription_tier` and `is_paid`, but does NOT create a record in the `subscriptions` table
- **Impact**: `get_user_usage()` in `supabase_state.py` checks `subscriptions` table first for active subscription, finds nothing, and reverts user to "free" tier

### 2. **Subscription Detection Logic Flaw**
- **Location**: `backend/models/supabase_state.py` - `get_user_usage()` function
- **Problem**: 
  - Only checks `subscriptions` table with status='active' (line ~37)
  - Backup check (line ~67) requires BOTH `not is_paid` AND `user.get('is_paid')` to be true (impossible condition)
  - Falls back to user's `subscription_tier` from table only if no subscription record found
- **Impact**: Tier from users table is ignored during normal flow

### 3. **Data Inconsistency**
- **Location**: Multiple tables storing similar data
- **Problem**: 
  - `users` table has: `subscription_tier`, `is_paid`, `subscription_end_date`
  - `user_usage` table has the same fields
  - `subscriptions` table exists but isn't always populated
  - Payment verification updates users + user_usage but not subscriptions

### 4. **Response Not Showing Correct Tier**
- **Location**: `dashboard.tsx` - `checkUserSubscription()` function
- **Problem**: Reads `is_paid` and `subscription_tier` from `/api/usage` response
- **Impact**: Even if tier is stored, if `get_user_usage()` returns "free", frontend shows free

## Data Flow Breakdown

```
User pays → /api/verify-payment endpoint
    ↓
Updates: users table with tier='starter', is_paid=True, subscription_end_date
Updates: user_usage table (current month only)
Does NOT create: subscription record
    ↓
Frontend calls: /api/usage
    ↓
Which calls: get_user_usage(user_id)
    ↓
get_user_usage() checks:
  1. subscriptions table with status='active' → NOT FOUND ❌
  2. Falls back to user.get('subscription_tier') from users table
  3. But has wrong logic for backup check
    ↓
Returns: subscription_tier='free' (incorrect!)
    ↓
Frontend receives tier='free' and shows free tier features
```

## The Fix

We need to fix THREE files:

### File 1: backend/main.py (fix verify-payment endpoint)
- Create proper subscription record in subscriptions table
- Ensure subscription has status='active'

### File 2: backend/models/supabase_state.py (fix get_user_usage logic)
- Fix the subscription detection logic
- Properly prioritize subscription_tier from users table

### File 3: backend/services/supabase_database.py (add missing method)
- Ensure get_user_by_id method exists if using user IDs instead of auth0_id
