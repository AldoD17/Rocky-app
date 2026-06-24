'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function LoginForm() {
  const params = useSearchParams();
  const hasError = params.get('error') === '1';

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 w-full max-w-sm p-8">
        <div className="mb-6">
          <span className="text-2xl font-bold text-gray-900 tracking-tight">Rocky</span>
          <span className="ml-2 text-xs font-semibold bg-gray-900 text-white rounded-full px-2 py-0.5">ADMIN</span>
          <p className="text-sm text-gray-500 mt-1">Accesso riservato</p>
        </div>

        {hasError && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
            Password errata. Riprova.
          </div>
        )}

        <form action="/api/admin/login" method="POST">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              name="password"
              autoFocus
              autoComplete="current-password"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              placeholder="••••••••••••"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-gray-900 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            Accedi
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
