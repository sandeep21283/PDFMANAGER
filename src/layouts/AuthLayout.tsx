import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { FileText } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export default function AuthLayout() {
  const { user } = useAuth();
  const location = useLocation();

  if (user && location.pathname !== '/update-password') {
    return <Navigate to="/" state={{ from: location }} replace />;
  }


  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <FileText className="h-12 w-12 text-indigo-600" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          PDF Management System
        </h2>
      </div>
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <Outlet />
        </div>
      </div>
    </div>
  );
}