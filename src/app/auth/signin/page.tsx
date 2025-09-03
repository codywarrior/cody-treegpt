'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSignIn, useSignUp } from '@/hooks/use-conversations';
import { useToast } from '@/components/Toast';

export default function SignInPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const router = useRouter();
  const toast = useToast();
  const signInMutation = useSignIn();
  const signUpMutation = useSignUp();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const mutation = isSignUp ? signUpMutation : signInMutation;
    const data = isSignUp
      ? { email, password, displayName }
      : { email, password };

    mutation.mutate(data, {
      onSuccess: () => {
        router.push('/');
        router.refresh();
      },
      onError: (error) => {
        toast.error(
          'Authentication Error',
          error instanceof Error ? error.message : 'Authentication failed'
        );
      },
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-purple-50 via-blue-50 to-teal-50 dark:from-gray-900 dark:to-gray-800">
      {/* Background Logo */}
      <div className="absolute inset-0 flex items-center justify-center opacity-30 dark:opacity-20">
        <img
          src="/GPTreeLogo.png"
          alt="GPTree Logo Background"
          className="w-9/10 h-9/10 object-contain"
        />
      </div>
      
      {/* Auth Form */}
      <div className="relative z-10 max-w-md w-full space-y-8 p-8 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-xl shadow-xl border border-white/30 dark:border-gray-700/50">
        <div className="text-center">
       <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            GPTree
          </h1>
          <h2 className="text-xl text-gray-600 dark:text-gray-300">
            {isSignUp ? 'Create your account' : 'Sign in to your account'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {isSignUp && (
            <div>
              <label
                htmlFor="displayName"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Display Name (optional)
              </label>
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          )}

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>


          <button
            type="submit"
            disabled={signInMutation.isPending || signUpMutation.isPending}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {(signInMutation.isPending || signUpMutation.isPending) ? 'Loading...' : isSignUp ? 'Sign Up' : 'Sign In'}
          </button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-blue-600 hover:text-blue-500 text-sm"
            >
              {isSignUp
                ? 'Already have an account? Sign in'
                : "Don't have an account? Sign up"}
            </button>
          </div>
        </form>
      </div>
      <toast.ToastContainer />
    </div>
  );
}
