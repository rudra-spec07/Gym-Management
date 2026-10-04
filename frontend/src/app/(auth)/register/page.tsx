'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiFetch } from '../../../lib/api';
import { useAuth } from '../../../context/AuthContext';
import { Dumbbell, ShieldCheck, AlertCircle, ArrowRight, Loader2 } from 'lucide-react';

const RegisterSchema = z.object({
  name: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Invalid email address format'),
  phone: z
    .string()
    .regex(/^[0-9]{10}$/, 'Mobile number must be exactly 10 digits'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Must contain 1 uppercase, 1 lowercase letter, and 1 number'
    ),
  fitnessGoal: z.string().optional(),
});

type RegisterFormData = z.infer<typeof RegisterSchema>;

function RegisterContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { fetchUser } = useAuth();

  const tokenParam = searchParams.get('token') || '';
  const gymCodeParam = searchParams.get('gym') || 'GYM-001';

  const [isVerifyingToken, setIsVerifyingToken] = useState<boolean>(true);
  const [tokenValid, setTokenValid] = useState<boolean>(false);
  const [gymInfo, setGymInfo] = useState<{ id: string; name: string; code: string } | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(RegisterSchema),
  });

  // Verify Onboarding QR Token Dynamically
  useEffect(() => {
    async function verifyToken() {
      if (!tokenParam) {
        setIsVerifyingToken(false);
        setTokenValid(false);
        setServerError('No registration onboarding QR token detected. Please scan the official Gym QR code.');
        return;
      }

      setIsVerifyingToken(true);
      const res = await apiFetch(`/api/auth/verify-token?token=${encodeURIComponent(tokenParam)}&gymCode=${encodeURIComponent(gymCodeParam)}`);

      if (res.success && res.data?.valid) {
        setTokenValid(true);
        setGymInfo(res.data.gym);
      } else {
        setTokenValid(false);
        setServerError(res.error?.message || 'Invalid or expired registration QR onboarding token.');
      }
      setIsVerifyingToken(false);
    }

    verifyToken();
  }, [tokenParam, gymCodeParam]);

  const onSubmit = async (data: RegisterFormData) => {
    setServerError(null);
    setIsSubmitting(true);

    const payload = {
      ...data,
      token: tokenParam,
      gymCode: gymInfo?.code || gymCodeParam,
    };

    const res = await apiFetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (res.success && res.data) {
      await fetchUser(); // Refresh auth state
      router.push(res.data.redirectTo || '/user/membership/select');
    } else {
      if (res.error?.details && Array.isArray(res.error.details)) {
        res.error.details.forEach((d) => {
          if (d.field === 'email' || d.field === 'phone' || d.field === 'password' || d.field === 'name') {
            setError(d.field as any, { message: d.message });
          }
        });
      }
      setServerError(res.error?.message || 'Registration failed. Please check your information.');
    }
    setIsSubmitting(false);
  };

  if (isVerifyingToken) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
        <p className="text-slate-300 font-medium">Validating Gym Registration QR Token...</p>
        <p className="text-xs text-slate-500 mt-1">Connecting to Gym Tenant System</p>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="max-w-md w-full glass-card p-8 rounded-2xl text-center border border-red-500/30">
        <div className="w-14 h-14 bg-red-500/10 text-red-400 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Invalid Onboarding Token</h2>
        <p className="text-sm text-slate-400 mb-6">{serverError}</p>
        <div className="p-4 bg-slate-900/60 rounded-xl text-xs text-slate-400 mb-6 text-left">
          <p className="font-semibold text-slate-300 mb-1">To register your account:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Scan the physical QR code displayed at the gym front desk.</li>
            <li>Ensure you have active internet connectivity.</li>
          </ol>
        </div>
        <button
          onClick={() => router.push('/login')}
          className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-xl transition text-sm flex items-center justify-center gap-2"
        >
          Go to Member Login
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-lg w-full glass-card p-8 rounded-2xl shadow-2xl border border-slate-700/50">
      {/* Dynamic Header */}
      <div className="flex items-center gap-3 mb-6 pb-6 border-b border-slate-800">
        <div className="w-12 h-12 gradient-brand text-white rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <Dumbbell className="w-7 h-7" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white">{gymInfo?.name || 'Gym Center'}</h1>
            <span className="text-[10px] uppercase font-bold tracking-widest bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full border border-indigo-500/30">
              {gymInfo?.code || gymCodeParam}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">Member Self-Registration Portal</p>
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
            Full Name <span className="text-red-400">*</span>
          </label>
          <input
            {...register('name')}
            type="text"
            placeholder="e.g. Alex Rivera"
            className="w-full px-4 py-3 bg-slate-900/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
          />
          {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name.message}</p>}
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
            Email Address <span className="text-red-400">*</span>
          </label>
          <input
            {...register('email')}
            type="email"
            placeholder="alex@example.com"
            className="w-full px-4 py-3 bg-slate-900/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
          />
          {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email.message}</p>}
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
            Mobile Number (10 Digits) <span className="text-red-400">*</span>
          </label>
          <input
            {...register('phone')}
            type="tel"
            maxLength={10}
            placeholder="9876543210"
            className="w-full px-4 py-3 bg-slate-900/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
          />
          {errors.phone && <p className="text-xs text-red-400 mt-1">{errors.phone.message}</p>}
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
            Create Password <span className="text-red-400">*</span>
          </label>
          <input
            {...register('password')}
            type="password"
            placeholder="Min 8 chars (1 Upper, 1 Lower, 1 Number)"
            className="w-full px-4 py-3 bg-slate-900/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
          />
          {errors.password && <p className="text-xs text-red-400 mt-1">{errors.password.message}</p>}
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
            Target Fitness Goal (Optional)
          </label>
          <select
            {...register('fitnessGoal')}
            className="w-full px-4 py-3 bg-slate-900/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
          >
            <option value="">Select Primary Goal</option>
            <option value="Muscle Gain">Muscle Gain & Hypertrophy</option>
            <option value="Weight Loss">Weight Loss & Shredding</option>
            <option value="Stamina & Endurance">Stamina & Cardio Endurance</option>
            <option value="General Fitness">General Fitness & Mobility</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full mt-2 py-3.5 px-4 gradient-brand hover:opacity-95 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/25 transition flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Creating Account...</span>
            </>
          ) : (
            <>
              <span>Create Account & Choose Plan</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      <div className="mt-6 pt-6 border-t border-slate-800 text-center text-xs text-slate-400">
        Already registered?{' '}
        <button
          onClick={() => router.push(`/login?gym=${gymInfo?.code || gymCodeParam}`)}
          className="text-indigo-400 hover:text-indigo-300 font-semibold underline underline-offset-2"
        >
          Log in here
        </button>
      </div>
    </div>
  );
}

export default function RegisterPage() {
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
        <RegisterContent />
      </Suspense>
    </div>
  );
}
