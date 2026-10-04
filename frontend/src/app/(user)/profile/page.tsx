'use client';

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiFetch } from '../../../lib/api';
import { useAuth } from '../../../context/AuthContext';
import {
  User,
  Mail,
  Phone,
  ShieldCheck,
  Building2,
  Flame,
  Star,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Target,
  Image as ImageIcon,
} from 'lucide-react';

const ProfileFormSchema = z.object({
  name: z.string().min(2, 'Full name must be at least 2 characters'),
  profilePicUrl: z.string().url('Invalid URL format').optional().or(z.literal('')),
  fitnessGoal: z.string().optional().or(z.literal('')),
});

type ProfileFormData = z.infer<typeof ProfileFormSchema>;

interface ProfileDetails {
  id: string;
  gymId: string;
  gym?: {
    name: string;
    code: string;
    slug: string;
  };
  name: string;
  email: string;
  phone: string;
  role: string;
  status: string;
  profilePicUrl?: string | null;
  fitnessGoal?: string | null;
  currentStreak: number;
  longestStreak: number;
  starScore: number;
}

export default function MemberProfilePage() {
  const { fetchUser } = useAuth();
  const [profile, setProfile] = useState<ProfileDetails | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(ProfileFormSchema),
  });

  useEffect(() => {
    async function loadProfile() {
      setIsLoading(true);
      const res = await apiFetch('/api/user/profile');
      if (res.success && res.data?.profile) {
        const p = res.data.profile;
        setProfile(p);
        reset({
          name: p.name || '',
          profilePicUrl: p.profilePicUrl || '',
          fitnessGoal: p.fitnessGoal || '',
        });
      } else {
        setErrorMessage(res.error?.message || 'Failed to load member profile.');
      }
      setIsLoading(false);
    }

    loadProfile();
  }, [reset]);

  const onSubmit = async (data: ProfileFormData) => {
    setSuccessMessage(null);
    setErrorMessage(null);
    setIsSaving(true);

    // Explicit Allowlist Payload (name, profilePicUrl, fitnessGoal ONLY)
    const payload = {
      name: data.name,
      profilePicUrl: data.profilePicUrl || null,
      fitnessGoal: data.fitnessGoal || null,
    };

    const res = await apiFetch('/api/user/profile', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });

    if (res.success && res.data?.profile) {
      setProfile((prev) => (prev ? { ...prev, ...res.data.profile } : res.data.profile));
      setSuccessMessage('Profile updated successfully.');
      await fetchUser(); // Sync AuthContext
    } else {
      setErrorMessage(res.error?.message || 'Failed to update profile.');
    }
    setIsSaving(false);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
        <p className="text-slate-300 font-medium">Loading Member Profile...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 overflow-hidden flex items-center justify-center font-bold text-indigo-300 text-2xl shrink-0">
            {profile?.profilePicUrl ? (
              <img src={profile.profilePicUrl} alt={profile.name} className="w-full h-full object-cover" />
            ) : (
              profile?.name?.charAt(0) || 'M'
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-white">{profile?.name}</h1>
              <span className="px-2.5 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] font-bold uppercase tracking-wider rounded-md">
                {profile?.role}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-slate-500" />
              {profile?.gym?.name} ({profile?.gym?.code})
            </p>
          </div>
        </div>

        {/* Quick Stats Pill */}
        <div className="flex items-center gap-4 bg-slate-950/80 p-3 rounded-xl border border-slate-800 text-xs">
          <div className="text-center px-2">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Streak</span>
            <span className="font-extrabold text-amber-400 flex items-center gap-1 mt-0.5">
              <Flame className="w-3.5 h-3.5 fill-amber-400" />
              {profile?.currentStreak}d
            </span>
          </div>
          <div className="w-px h-8 bg-slate-800"></div>
          <div className="text-center px-2">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Stars</span>
            <span className="font-extrabold text-yellow-400 flex items-center gap-1 mt-0.5">
              <Star className="w-3.5 h-3.5 fill-yellow-400" />
              {profile?.starScore}
            </span>
          </div>
        </div>
      </div>

      {successMessage && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Form & Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Read-Only Account Metadata Column */}
        <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-4">
          <h3 className="font-bold text-white text-sm uppercase tracking-wider border-b border-slate-800 pb-3 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
            Account Contact Info
          </h3>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Email Address (Immutable)
            </label>
            <div className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-900/80 border border-slate-800 rounded-xl text-xs text-slate-300">
              <Mail className="w-4 h-4 text-slate-500 shrink-0" />
              <span className="truncate">{profile?.email}</span>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Mobile Number (Immutable)
            </label>
            <div className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-900/80 border border-slate-800 rounded-xl text-xs text-slate-300">
              <Phone className="w-4 h-4 text-slate-500 shrink-0" />
              <span>{profile?.phone}</span>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Account Status
            </label>
            <div className="px-3.5 py-2.5 bg-slate-900/80 border border-slate-800 rounded-xl text-xs font-semibold text-emerald-400">
              {profile?.status}
            </div>
          </div>
        </div>

        {/* Editable Profile Form Column */}
        <div className="glass-card p-6 rounded-2xl border border-slate-800 md:col-span-2 space-y-4">
          <h3 className="font-bold text-white text-sm uppercase tracking-wider border-b border-slate-800 pb-3 flex items-center gap-2">
            <User className="w-4 h-4 text-indigo-400" />
            Edit Profile Preferences
          </h3>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Full Name
              </label>
              <input
                {...register('name')}
                type="text"
                className="w-full px-4 py-3 bg-slate-900/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
              />
              {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
                Profile Avatar Image URL (Optional)
              </label>
              <input
                {...register('profilePicUrl')}
                type="text"
                placeholder="https://example.com/avatar.jpg"
                className="w-full px-4 py-3 bg-slate-900/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
              />
              {errors.profilePicUrl && (
                <p className="text-xs text-red-400 mt-1">{errors.profilePicUrl.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-slate-400" />
                Target Fitness Goal
              </label>
              <select
                {...register('fitnessGoal')}
                className="w-full px-4 py-3 bg-slate-900/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 transition"
              >
                <option value="">Select Primary Goal</option>
                <option value="Muscle Gain">Muscle Gain & Hypertrophy</option>
                <option value="Weight Loss">Weight Loss & Shredding</option>
                <option value="Stamina & Endurance">Stamina & Cardio Endurance</option>
                <option value="General Fitness">General Fitness & Mobility</option>
              </select>
            </div>

            <div className="pt-4 border-t border-slate-800 flex justify-end">
              <button
                type="submit"
                disabled={isSaving || !isDirty}
                className="py-3 px-6 gradient-brand hover:opacity-95 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-500/25 transition flex items-center gap-2 disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving Changes...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
