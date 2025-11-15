# Testing Guide: Subscription Tier Fix

## Quick Summary of Changes

### 🔧 Changes Made

#### 1. **backend/main.py** - Fixed `/api/verify-payment` endpoint
- **Added**: Creation of subscription record in `subscriptions` table after payment verification
- **Key Fields**: 
  - `status='active'` (so get_user_usage() finds it)
  - `tier` field stores the subscription tier (starter, pro, pro_plus)
  - `current_end` field for expiration tracking

**Before**: Payment verified → only updated users table ❌  
**After**: Payment verified → updates users table + creates subscriptions record ✅

---

#### 2. **backend/models/supabase_state.py** - Fixed `get_user_usage()` function
- **PRIMARY CHECK**: Look for active subscription in subscriptions table
- **FALLBACK CHECK**: If no subscription record, check users table for is_paid + valid end_date
- **TIER SOURCE**: Always use users table's subscription_tier as source of truth when is_paid=True
- **Added**: Verbose debug logging to identify issues

**Before**: Checked subscriptions table (not found) → reverted to 'free' ❌  
**After**: Checks subscriptions table (found) → uses tier from users table ✅

---

## Testing Checklist

### Phase 1: Backend Verification

#### Step 1: Check Supabase Tables
```sql
-- Check users table structure
SELECT auth0_id, subscription_tier, is_paid, subscription_end_date FROM users LIMIT 1;

-- Check subscriptions table structure
SELECT id, user_id, tier, status, current_end FROM subscriptions LIMIT 1;
```

#### Step 2: Monitor Backend Logs
Run the backend with logging enabled:
```bash
# Watch for messages like:
# ✅ Subscription record created with status='active'
# 📊 FINAL RESULT: is_paid=True, tier=starter
```

---

### Phase 2: Test Payment Flow

#### Step 3: Subscribe to Starter Pack (Manual Testing)
1. Log in to the application
2. Click "Upgrade to Pro" button (goes to payment dialog)
3. Select "Student Starter Pack" - ₹199
4. Enter test payment details:
   - Card: 4111 1111 1111 1111
   - Expiry: Any future date
   - CVV: Any 3 digits
5. Complete payment
6. Wait for verification (~2-3 seconds)

---

### Phase 3: Verify Frontend Response

#### Step 4: Check Dashboard Immediately After Payment
Expected Results:
```
✅ Profile shows tier: "STARTER PLAN"
✅ Models dropdown shows starter models as available
✅ Pro models show 🔒 lock icon
✅ Message count and limits reflect starter tier
```

---

### Phase 4: Verify API Response

#### Step 5: Check /api/usage endpoint
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8000/api/usage
```

Expected Response:
```json
{
  "tier": "starter",
  "is_paid": true,
  "limits": {
    "requests_per_month": 500,
    "tokens_per_month": 500000,
    "is_unlimited": false
  },
  "subscription": {
    "end_date": "2025-12-15T...",
    "days_remaining": 30,
    "is_active": true
  }
}
```

---

### Phase 5: Test Feature Access

#### Step 6: Try Using Starter Models
1. Open chat interface
2. Click model selector
3. Try selecting a "Starter" model (e.g., Claude from starter tier)
4. Expected: ✅ Model selected and ready to use
5. Try selecting a "Pro" model
6. Expected: ✅ Locked with message "🔒 Upgrade to access this model"

---

### Phase 6: Test Model Selector Logic

The model selector uses this hierarchy:
```typescript
hasAccessToModel = (modelTier) => {
  const tierHierarchy = {
    free: 0,
    starter: 1,
    pro: 2,
    pro_plus: 3
  };
  return userLevel >= modelLevel;
}
```

**Testing Matrix:**
| User Tier | Free Model | Starter Model | Pro Model | Pro+ Model |
|-----------|-----------|---------------|-----------|-----------|
| free      | ✅ Access | ❌ Locked     | ❌ Locked | ❌ Locked |
| starter   | ✅ Access | ✅ Access     | ❌ Locked | ❌ Locked |
| pro       | ✅ Access | ✅ Access     | ✅ Access | ❌ Locked |
| pro_plus  | ✅ Access | ✅ Access     | ✅ Access | ✅ Access |

---

## Debugging Guide

### If Still Showing Free Tier After Payment

#### Check 1: Verify subscription table entry
```python
# Backend logs should show:
print(f"✅ Subscription record created with status='active'")

# If not showing, then issue is in payment verification
```

#### Check 2: Verify users table update
```sql
SELECT subscription_tier, is_paid, subscription_end_date 
FROM users 
WHERE auth0_id = 'auth0|...'
LIMIT 1;

-- Should show: subscription_tier='starter', is_paid=true, subscription_end_date='2025-12-15...'
```

#### Check 3: Check get_user_usage() logs
Look for logs like:
```
🔍 Getting usage for user: auth0|...
✅ Active subscription found: tier=starter, expires=2025-12-15...
📊 FINAL RESULT: is_paid=True, tier=starter
```

If you see `tier=free` instead, the subscription detection failed.

#### Check 4: Browser DevTools
```javascript
// Open Console and check the API response
// In dashboard useEffect, after checkUserSubscription()
console.log('User tier:', userTier); // Should be 'starter'
```

---

## Common Issues & Solutions

### Issue 1: Payment verified but tier still shows "free"

**Solution Path:**
1. Check if subscription record was created:
   ```sql
   SELECT * FROM subscriptions WHERE user_id = (SELECT id FROM users WHERE auth0_id = 'auth0|...');
   ```
2. If record exists but status is not 'active', update it:
   ```sql
   UPDATE subscriptions SET status='active' WHERE user_id = ...;
   ```
3. Check users table has correct tier:
   ```sql
   SELECT subscription_tier FROM users WHERE auth0_id = 'auth0|...';
   ```

---

### Issue 2: Models not showing as available

**Solution Path:**
1. Verify model tier definitions in `lib/models.ts`:
   ```typescript
   const AI_MODELS = [
     { id: 'gpt-4', tier: 'pro', ... },
     { id: 'claude-starter', tier: 'starter', ... },
   ];
   ```
2. Check ModelSelector component receives correct userTier prop from dashboard
3. Verify hasAccessToModel() logic in model-selector.tsx

---

### Issue 3: Subscription expired message

If user's subscription_end_date is in the past:
```sql
-- Fix: Update to future date
UPDATE users 
SET subscription_end_date = CURRENT_TIMESTAMP + INTERVAL '30 days'
WHERE auth0_id = 'auth0|...';
```

---

## Post-Fix Validation Checklist

- [ ] Backend creates subscription record on payment verification
- [ ] get_user_usage() returns correct tier ('starter', not 'free')
- [ ] /api/usage endpoint returns is_paid=true
- [ ] Dashboard shows correct tier in profile
- [ ] Model selector allows starter tier access
- [ ] Pro model remains locked for starter users
- [ ] No console errors related to subscription
- [ ] Payment dialog closes after successful verification
- [ ] "Upgrade to Pro" button disappears for paid users

