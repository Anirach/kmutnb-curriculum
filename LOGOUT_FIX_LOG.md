# Public User Logout Fix

## Problem
Public users were unable to properly logout and return to the landing page. When clicking the "ออกจากระบบ" (logout) button, the system would get stuck and not navigate back to the landing page.

## Root Cause
The issue was in the Header.tsx logout functionality. The code was using `window.location.href = '/'` to redirect public users back to the landing page, but this wasn't working properly because:

1. React state might persist across navigation
2. The `isAuthenticated` state in CurriculumApp wasn't being properly reset
3. Timing issues with state updates could prevent proper navigation

## Solution
Changed the public user logout logic in `/src/components/dashboard/Header.tsx` from:

```typescript
// Simple redirect for public users
setTimeout(() => {
  window.location.href = '/';
}, 500);
```

To:

```typescript
// Force a complete page reload to reset all state for public users
setTimeout(() => {
  window.location.reload();
}, 500);
```

## Why This Works
Using `window.location.reload()` ensures:

1. All React state is completely reset
2. The page starts fresh from the beginning
3. The CurriculumApp re-initializes and shows the landing page since there's no user in localStorage
4. No timing issues with state updates

## Testing
To test the fix:

1. Go to the landing page
2. Click "สืบค้นข้อมูลหลักสูตร" to enter as a public user
3. Once in the dashboard, click "ออกจากระบบ" (logout)
4. The page should reload and show the landing page with both access buttons available

## Files Modified
- `/src/components/dashboard/Header.tsx` - Updated public user logout logic

## Date
August 6, 2025
