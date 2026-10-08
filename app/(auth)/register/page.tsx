'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Button from '@/components/UI/Button';

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
    <main className="min-h-screen w-full bg-white flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-3xl border border-[#e5e7eb] bg-white shadow-[0_8px_40px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="px-6 sm:px-8 pt-10 pb-2 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-[#111827]">Create Account</h1>
          <p className="text-base text-[#6b7280] mt-2">Join Raahi and navigate with confidence.</p>
        </div>

        <form onSubmit={handleSubmit} className="px-6 sm:px-8 py-8 space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-semibold text-[#111827] mb-2">
              Name
            </label>
            <input
              id="name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-[#e5e7eb] bg-[#f9fafb] px-4 py-3 text-sm text-[#111827] focus:outline-none focus:bg-white focus:ring-4 focus:ring-[#2563eb]/10 focus:border-[#2563eb] transition-all"
              placeholder="Your name"
            />
          </div>

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
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full rounded-xl border border-[#e5e7eb] bg-[#f9fafb] px-4 py-3 text-sm text-[#111827] focus:outline-none focus:bg-white focus:ring-4 focus:ring-[#2563eb]/10 focus:border-[#2563eb] transition-all"
              placeholder="At least 6 characters"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-semibold text-[#111827] mb-2">
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
              className="w-full rounded-xl border border-[#e5e7eb] bg-[#f9fafb] px-4 py-3 text-sm text-[#111827] focus:outline-none focus:bg-white focus:ring-4 focus:ring-[#2563eb]/10 focus:border-[#2563eb] transition-all"
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

          <div className="pt-2">
            <Button
              type="submit"
              disabled={status === 'submitting'}
              className="w-full"
            >
              {status === 'submitting' ? 'Creating account...' : 'Sign Up'}
            </Button>
          </div>

          <p className="text-sm text-[#6b7280] text-center pt-4">
            Already have an account?{' '}
            <Link href="/login" className="text-[#2563eb] font-semibold hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
