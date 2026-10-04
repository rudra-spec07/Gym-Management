'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiFetch } from '../../../lib/api';
import { useAuth } from '../../../context/AuthContext';
import { Dumbbell, LogIn, AlertCircle, Loader2, KeyRound } from 'lucide-react';

const LoginSchema = z.object({
  gymCode: z.string().optional(),
  identifier: z.string().min(1, 'Email or 10-digit mobile number is required'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof LoginSchema>;

function LoginContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { fetchUser } = useAuth();

  const gymParam = searchParams.get('gym') || 'GYM-001';

  const [gymInfo, setGymInfo] = useState<{ name: string; code: string } | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(LoginSchema),
    defaultValues: {
      gymCode: gymParam,
    },
  });

  // Fetch Public Gym Details if gymCode exists
  useEffect(() => {
    async function fetchGym() {
      if (gymParam) {
        const res = await apiFetch(`/api/auth/gyms/${encodeURIComponent(gymParam)}`);
        if (res.success && res.data?.gym) {
          setGymInfo(res.data.gym);
          setValue('gymCode', res.data.gym.code);
        }
      }
    }
    fetchGym();
  }, [gymParam, setValue]);

  const onSubmit = async (data: LoginFormData) => {
    setServerError(null);
    setIsSubmitting(true);

    const res = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    if (res.success && res.data) {
      await fetchUser();
      const rawRedirect = res.data.redirectTo;
      const redirectUrl = (rawRedirect === '/user/dashboard' || !rawRedirect)
        ? (res.data.user.role === 'GYM_ADMIN' || res.data.user.role === 'SUPER_ADMIN' ? '/admin/dashboard' : '/dashboard')
        : rawRedirect;
      router.push(redirectUrl);
    } else {
      setServerError(res.error?.message || 'Invalid email/phone or password. Please try again.');
    }
    setIsSubmitting(false);
  };

  return (
    <div className="max-w-md w-full glass-card p-8 rounded-2xl shadow-2xl border border-slate-700/50">
      {/* Dynamic Gym Header */}
      <div className="flex items-center gap-3 mb-6 pb-6 border-b border-slate-800">
        <div className="w-12 h-12 gradient-brand text-white rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <Dumbbell className="w-7 h-7" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">{gymInfo?.name || 'Gym Management'}</h1>
          <p className="text-xs text-slate-400 mt-0.5">Member & Staff Access Portal</p>
        </div>
      </div>

      {serverError && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{serverError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
            Gym Code
          </label>
          <input
            {...register('gymCode')}
            type="text"
            placeholder="e.g. GYM-001"
            className="w-full px-4 py-3 bg-slate-900/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 uppercase font-mono focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
            Email or Mobile Number <span className="text-red-400">*</span>
          </label>
          <input
            {...register('identifier')}
            type="text"
            placeholder="registered@email.com or 9876543210"
            className="w-full px-4 py-3 bg-slate-900/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
          />
          {errors.identifier && <p className="text-xs text-red-400 mt-1">{errors.identifier.message}</p>}
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Password <span className="text-red-400">*</span>
            </label>
          </div>
          <input
            {...register('password')}
            type="password"
            placeholder="••••••••"
            className="w-full px-4 py-3 bg-slate-900/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
          />
          {errors.password && <p className="text-xs text-red-400 mt-1">{errors.password.message}</p>}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full mt-2 py-3.5 px-4 gradient-brand hover:opacity-95 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/25 transition flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Authenticating...</span>
            </>
          ) : (
            <>
              <LogIn className="w-4 h-4" />
              <span>Sign In to Portal</span>
            </>
          )}
        </button>
      </form>

      <div className="mt-6 pt-6 border-t border-slate-800 text-center text-xs text-slate-400">
        New Member? Scan Gym Registration QR Code or{' '}
        <button
          onClick={() => router.push(`/register?token=gym-qr-reg-secret-2026&gym=${gymInfo?.code || gymParam}`)}
          className="text-indigo-400 hover:text-indigo-300 font-semibold underline underline-offset-2"
        >
          Register online
        </button>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      <Suspense
        fallback={
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
            <span>Loading...</span>
          </div>
        }
      >
        <LoginContent />
      </Suspense>
    </div>
  );
}
