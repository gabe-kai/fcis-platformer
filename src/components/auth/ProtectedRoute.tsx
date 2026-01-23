import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { logger } from '@/utils/logger';
import { ReactNode, useEffect } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, checkAuth } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    // Check auth status on mount
    checkAuth();
  }, [checkAuth]);

  if (!isAuthenticated) {
    logger.debug('Redirecting to login - not authenticated', {
      component: 'ProtectedRoute',
      operation: 'check_auth',
    });
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
