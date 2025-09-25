import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

interface ProtectedRouteProps {
  children?: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
        <p className="text-gray-700 dark:text-gray-300">Loading authentication status...</p>
      </div>
    );
  }

  if (!user) {
    // User is not authenticated, redirect to the register page
    return <Navigate to="/register" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;