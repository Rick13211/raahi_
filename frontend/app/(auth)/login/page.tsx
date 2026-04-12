'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Button from '@/components/UI/Button';

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
    <main className="min-h-screen w-full bg-white flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-3xl border border-[#e5e7eb] bg-white shadow-[0_8px_40px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="px-6 sm:px-8 pt-10 pb-2 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-[#111827]">Welcome back</h1>
          <p className="text-base text-[#6b7280] mt-2">Sign in to your Raahi account</p>
        </div>

        <form onSubmit={handleSubmit} className="px-6 sm:px-8 py-8 space-y-5">
          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-[#111827] mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-xl border border-[#e5e7eb] bg-[#f9fafb] px-4 py-3 text-sm text-[#111827] focus:outline-none focus:bg-white focus:ring-4 focus:ring-[#2563eb]/10 focus:border-[#2563eb] transition-all"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-[#111827] mb-2">
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
              className="w-full rounded-xl border border-[#e5e7eb] bg-[#f9fafb] px-4 py-3 text-sm text-[#111827] focus:outline-none focus:bg-white focus:ring-4 focus:ring-[#2563eb]/10 focus:border-[#2563eb] transition-all"
              placeholder="Enter your password"
            />
          </div>

          {errorMsg ? (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {errorMsg}
            </p>
          ) : null}

          <div className="pt-2">
            <Button
              type="submit"
              disabled={status === 'submitting'}
              className="w-full"
            >
              {status === 'submitting' ? 'Signing in...' : 'Sign In'}
            </Button>
          </div>

          <p className="text-sm text-[#6b7280] text-center pt-4">
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
