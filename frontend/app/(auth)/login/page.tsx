'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus('submitting');
    setErrorMsg('');

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setErrorMsg(error.message);
      setStatus('error');
      return;
    }

    router.push('/map');
    router.refresh();
  };

  return (
    <main className="min-h-screen w-full bg-[#f8fafc] flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-[#e2e8f0] bg-white shadow-[0_20px_60px_rgba(15,23,42,0.08)] overflow-hidden">
        <div className="px-6 sm:px-8 pt-8 pb-6 bg-gradient-to-r from-[#0f172a] to-[#1e293b] text-white">
          <h1 className="text-2xl font-bold tracking-tight">Sign In</h1>
          <p className="text-sm text-slate-300 mt-1">Access your Raahi account and submit safety reports.</p>
        </div>

        <form onSubmit={handleSubmit} className="px-6 sm:px-8 py-6 space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-[#334155] mb-1.5">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-xl border border-[#cbd5e1] bg-white px-4 py-2.5 text-sm text-[#0f172a] focus:outline-none focus:ring-4 focus:ring-[#3b82f6]/15 focus:border-[#3b82f6]"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-[#334155] mb-1.5">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full rounded-xl border border-[#cbd5e1] bg-white px-4 py-2.5 text-sm text-[#0f172a] focus:outline-none focus:ring-4 focus:ring-[#3b82f6]/15 focus:border-[#3b82f6]"
              placeholder="Enter your password"
            />
          </div>

          {errorMsg ? (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {errorMsg}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={status === 'submitting'}
            className="w-full rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] disabled:bg-[#93c5fd] text-white text-sm font-semibold py-3 transition-colors"
          >
            {status === 'submitting' ? 'Signing in...' : 'Sign In'}
          </button>

          <p className="text-sm text-[#475569] text-center pt-2">
            New here?{' '}
            <Link href="/register" className="text-[#2563eb] font-semibold hover:underline">
              Create an account
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
