import { Outlet, Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

export default function AuthLayout() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  // LoginPage has its own full-page layout
  return <Outlet />;
}
