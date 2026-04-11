'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { supabase } from '@/lib/supabase';

function getReadableSignUpError(message: string): string {
  const normalized = message.toLowerCase();
  if (normalized.includes('email rate limit exceeded') || normalized.includes('rate limit')) {
    return 'Too many signup attempts were made recently. Please wait a few minutes before trying again, or use a different email.';
  }
  return message;
}

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMsg('');

    if (password !== confirmPassword) {
      setStatus('error');
      setErrorMsg('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setStatus('error');
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    setStatus('submitting');

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          name: name.trim() || null,
        },
      },
    });

    if (error) {
      setStatus('error');
      setErrorMsg(getReadableSignUpError(error.message));
      return;
    }

    if (data.session) {
      router.push('/map');
      router.refresh();
      return;
    }

    setStatus('success');
  };

  return (
    <main className="min-h-screen w-full bg-[#fff7ed] flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-[#fed7aa] bg-white shadow-[0_20px_60px_rgba(124,45,18,0.08)] overflow-hidden">
        <div className="px-6 sm:px-8 pt-8 pb-6 bg-gradient-to-r from-[#9a3412] to-[#ea580c] text-white">
          <h1 className="text-2xl font-bold tracking-tight">Create Account</h1>
          <p className="text-sm text-orange-100 mt-1">Join Raahi and start contributing real-time safety reports.</p>
        </div>

        <form onSubmit={handleSubmit} className="px-6 sm:px-8 py-6 space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-[#7c2d12] mb-1.5">
              Name
            </label>
            <input
              id="name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-[#fdba74] bg-white px-4 py-2.5 text-sm text-[#431407] focus:outline-none focus:ring-4 focus:ring-[#fb923c]/20 focus:border-[#ea580c]"
              placeholder="Your name"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-[#7c2d12] mb-1.5">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-xl border border-[#fdba74] bg-white px-4 py-2.5 text-sm text-[#431407] focus:outline-none focus:ring-4 focus:ring-[#fb923c]/20 focus:border-[#ea580c]"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-[#7c2d12] mb-1.5">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full rounded-xl border border-[#fdba74] bg-white px-4 py-2.5 text-sm text-[#431407] focus:outline-none focus:ring-4 focus:ring-[#fb923c]/20 focus:border-[#ea580c]"
              placeholder="At least 6 characters"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-[#7c2d12] mb-1.5">
              Confirm password
            </label>
            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              className="w-full rounded-xl border border-[#fdba74] bg-white px-4 py-2.5 text-sm text-[#431407] focus:outline-none focus:ring-4 focus:ring-[#fb923c]/20 focus:border-[#ea580c]"
              placeholder="Repeat password"
            />
          </div>

          {errorMsg ? (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {errorMsg}
            </p>
          ) : null}

          {status === 'success' ? (
            <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
              Account created. Check your email to verify, then sign in.
            </p>
          ) : null}

          <button
            type="submit"
            disabled={status === 'submitting'}
            className="w-full rounded-xl bg-[#ea580c] hover:bg-[#c2410c] disabled:bg-[#fdba74] text-white text-sm font-semibold py-3 transition-colors"
          >
            {status === 'submitting' ? 'Creating account...' : 'Sign Up'}
          </button>

          <p className="text-sm text-[#7c2d12] text-center pt-2">
            Already have an account?{' '}
            <Link href="/login" className="text-[#ea580c] font-semibold hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
