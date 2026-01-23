# Authentication Components

## Overview

Authentication components for the FCIS Platformer Game Editor, providing OAuth login and user profile management.

## Components

### Login

**File:** `Login.tsx`

OAuth login component with Google sign-in support.

**Features:**
- Google OAuth integration
- Loading states
- Error handling
- Responsive design

**Usage:**
```tsx
import { Login } from '@/components/auth/Login';

<Login />
```

### UserProfile

**File:** `UserProfile.tsx`

Displays current user information and logout functionality.

**Features:**
- User avatar display
- Username and email
- Logout button
- Loading states

**Usage:**
```tsx
import { UserProfile } from '@/components/auth/UserProfile';

<UserProfile />
```

### ProtectedRoute

**File:** `ProtectedRoute.tsx`

Route wrapper that protects routes requiring authentication.

**Features:**
- Automatic redirect to login if not authenticated
- Preserves intended destination
- Integrates with React Router

**Usage:**
```tsx
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

<Route
  path="/dashboard"
  element={
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  }
/>
```

## Related

- [AuthService](../services/authService.ts) - Authentication service
- [AuthStore](../stores/authStore.ts) - Authentication state management
