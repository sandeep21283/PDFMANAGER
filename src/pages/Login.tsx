import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      navigate('/');
    } catch (error) {
      console.error('Sign-in error:', error);
      toast.error('Failed to sign in. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    try {
      setResetting(true);
      // Set a flag to note that a password reset is in progress
      localStorage.setItem("passwordResetInProgress", "true");
  
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`,
      });
      if (error) throw error;
      
      toast.success('Password reset email sent! Check your inbox.');
    } catch (error) {
      console.error('Password reset error:', error);
      toast.error('Failed to send password reset email. Make sure the email is correct.');
    } finally {
      setResetting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-sm w-full mx-auto">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          Email address
        </label>
        <div className="mt-1">
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md 
                       shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 
                       focus:border-indigo-500 sm:text-sm"
          />
        </div>
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
          Password
        </label>
        <div className="mt-1">
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="appearance-none block w-full px-3 py-2 border border-gray-300 
                       rounded-md shadow-sm placeholder-gray-400 focus:outline-none 
                       focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>
      </div>

      <div>
        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md 
                     shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 
                     focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 
                     disabled:opacity-50"
        >
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </div>

      {/* Forgot Password Link */}
      <div className="text-sm text-center">
        <button
          type="button"
          onClick={handlePasswordReset}
          disabled={!email || resetting}
          className="font-medium text-indigo-600 hover:text-indigo-500 disabled:opacity-50"
        >
          {resetting ? 'Sending reset link...' : 'Forgot your password?'}
        </button>
      </div>

      <div className="text-sm text-center">
        <Link to="/register" className="font-medium text-indigo-600 hover:text-indigo-500">
          Don&apos;t have an account? Sign up
        </Link>
      </div>
    </form>
  );
}
