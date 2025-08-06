# Public User Auto-Login Prevention Fix

## Problem
When public users click "ออกจากระบบ" (logout), the system shows the landing page briefly but then automatically returns to the dashboard. This creates a confusing user experience where logout doesn't actually log the user out.

## Root Cause Analysis
The issue was in the `CurriculumApp.tsx` initialization logic:

1. **Public Logout**: Cleared `localStorage` and `sessionStorage` but not `encryptedStorage`
2. **Page Reload**: After logout redirect, `initializeApp()` function runs
3. **Auto-Login**: System finds stored tokens in `encryptedStorage` from previous admin login
4. **Re-authentication**: Automatically logs user back in with found credentials

The problematic code in `CurriculumApp.tsx`:
```typescript
// If we have user data and tokens, set user state immediately
const { refreshToken, accessToken } = encryptedStorage.getTokens();
if (userData && refreshToken) {
  setUser({ ...userData, role: userData.role as UserRole });
  setIsAuthenticated(true);
}
```

## Solution
Modified the public user logout logic in `/src/components/dashboard/Header.tsx` to completely clear all storage including encrypted storage:

```typescript
if (isPublicUser) {
  // Clear user from context
  setUser(null);
  
  // Clear all storage completely
  localStorage.clear();
  sessionStorage.clear();
  
  // IMPORTANT: Also clear encrypted storage to prevent auto-login
  encryptedStorage.clearUserData();
  
  // Clear tokens and OAuth settings completely for public logout
  try {
    const keys = ['userData', 'tokens', 'oauthSettings', 'accessToken', 'refreshToken', 'clientId', 'clientSecret', 'driveUrl'];
    keys.forEach(key => {
      localStorage.removeItem(`encrypted_${key}`);
    });
  } catch (error) {
    console.log('Error clearing encrypted storage:', error);
  }
  
  // Immediate redirect
  window.location.href = '/';
  return;
}
```

## What This Fixes
1. **Complete Storage Clearing**: Removes all traces of admin credentials
2. **Prevents Auto-Login**: No stored tokens for `initializeApp()` to find
3. **Clean Landing Page**: User stays on landing page after logout
4. **Proper Logout Flow**: Logout actually logs the user out

## Expected Behavior After Fix
1. Public user clicks "สืบค้นข้อมูลหลักสูตร" → enters dashboard
2. Public user clicks "ออกจากระบบ" → logout function runs
3. All storage (including encrypted) is cleared completely
4. Page redirects to landing page (`/`)
5. User stays on landing page with both access options available
6. No automatic re-login occurs

## Impact on Admin Users
- Admin logout logic remains unchanged
- Admin credentials are still preserved for future public access (as intended)
- Only public user logout now does complete storage clearing

## Testing Steps
1. Admin login → verify it works
2. Admin logout → verify credentials preserved
3. Public access → verify dashboard loads
4. Public logout → verify stays on landing page (NO auto-return to dashboard)
5. Try public access again → should work normally

## Files Modified
- `/src/components/dashboard/Header.tsx` - Enhanced public user logout logic

## Date Fixed
August 6, 2025
