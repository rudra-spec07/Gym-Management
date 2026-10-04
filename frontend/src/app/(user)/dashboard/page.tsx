'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '../../../lib/api';
import {
  Flame,
  Star,
  Award,
  Calendar,
  CreditCard,
  Utensils,
  QrCode,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Clock,
  Loader2,
  ShieldAlert,
  UserCheck,
} from 'lucide-react';
import AttendanceCalendar from '../../../components/attendance/AttendanceCalendar';
import AdminOverrideDrawer from '../../../components/admin/AdminOverrideDrawer';
import StreakWidget from '../../../components/dashboard/StreakWidget';
import StarCard from '../../../components/dashboard/StarCard';

interface ProfileData {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  status: string;
  fitnessGoal?: string | null;
  currentStreak: number;
  longestStreak: number;
  starScore: number;
  gym?: {
    name: string;
    code: string;
  };
  memberships?: Array<{
    id: string;
    startDate: string;
    endDate: string;
    status: string;
    plan: {
      name: string;
      price: string;
      durationDays: number;
    };
  }>;
  dietAssignments?: Array<{
    id: string;
    dietPlan: {
      title: string;
      targetCalories: number;
      proteinGrams: number;
      carbsGrams: number;
      fatsGrams: number;
      dietItems?: Array<{
        id: string;
        mealType: string;
        foodName: string;
        quantity: string;
        calories: number;
      }>;
    };
  }>;
}

export default function MemberDashboardPage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdminOverrideOpen, setIsAdminOverrideOpen] = useState<boolean>(false);

  useEffect(() => {
    async function loadDashboardData() {
      setIsLoading(true);
      const res = await apiFetch('/api/user/profile');
      if (res.success && res.data?.profile) {
        setProfile(res.data.profile);
      } else {
        setError(res.error?.message || 'Failed to load member profile data.');
      }
      setIsLoading(false);
    }

    loadDashboardData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
        <p className="text-slate-300 font-medium">Loading Dashboard Metrics...</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="glass-card p-6 rounded-2xl border border-red-500/30 text-center max-w-lg mx-auto">
        <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-white mb-1">Dashboard Error</h2>
        <p className="text-sm text-slate-400 mb-4">{error || 'Profile could not be loaded.'}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-xl transition"
        >
          Retry Loading
        </button>
      </div>
    );
  }

  const activeMembership = profile.memberships && profile.memberships.length > 0 ? profile.memberships[0] : null;

  // Calculate days remaining in active membership
  let daysRemaining = 0;
  if (activeMembership?.endDate) {
    const end = new Date(activeMembership.endDate).getTime();
    const now = new Date().getTime();
    const diffTime = end - now;
    daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  }

  const activeDiet = profile.dietAssignments && profile.dietAssignments.length > 0 ? profile.dietAssignments[0].dietPlan : null;

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-white">Welcome back, {profile.name}!</h1>
          <p className="text-sm text-slate-400 mt-1">
            {profile.fitnessGoal ? `Target Goal: ${profile.fitnessGoal}` : 'Track your fitness streak & progress'}
          </p>
        </div>

        {/* Status & Admin Action Badges */}
        <div className="flex items-center gap-3 flex-wrap">
          {profile.role === 'GYM_ADMIN' || profile.role === 'SUPER_ADMIN' ? (
            <button
              onClick={() => setIsAdminOverrideOpen(true)}
              className="px-3.5 py-1.5 gradient-brand text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-500/20 flex items-center gap-1.5 hover:opacity-95 transition"
            >
              <UserCheck className="w-3.5 h-3.5" />
              Admin Manual Override
            </button>
          ) : null}

          {profile.status === 'ACTIVE' ? (
            <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold rounded-full flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Active Member
            </span>
          ) : (
            <span className="px-3 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-semibold rounded-full flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5" />
              Pending Membership
            </span>
          )}
        </div>
      </div>

      {/* 1. STREAK ENGINE & PERFORMANCE STAR SCORE WIDGETS (MODULE 04) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <StreakWidget
          currentStreak={profile.currentStreak}
          longestStreak={profile.longestStreak}
        />
        <StarCard starScore={profile.starScore} />
      </div>

      {/* 2. ATTENDANCE CALENDAR GRID (ATT-002) */}
      <AttendanceCalendar />

      {/* 3. CHECK-IN STATUS WIDGET & MEMBERSHIP BANNER GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Checkin Status Widget */}
        <div className="glass-card p-6 rounded-2xl border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <QrCode className="w-5 h-5 text-indigo-400" />
                Daily QR Attendance Check-in
              </h3>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-400 px-2.5 py-1 rounded-md border border-slate-700">
                Module 03 Feature
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              Daily gym check-ins require scanning the dynamic front-desk QR code at the premises to increment your consecutive streak and star rating.
            </p>
          </div>

          <div className="p-4 bg-slate-900/80 rounded-xl border border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-slate-800 text-slate-400 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-300">QR Check-in Status</p>
                <p className="text-[11px] text-slate-500">Scanning engine will unlock in Module 03</p>
              </div>
            </div>
            <button
              disabled
              className="px-4 py-2 bg-slate-800 text-slate-500 text-xs font-semibold rounded-lg border border-slate-700 cursor-not-allowed opacity-60"
            >
              Scan QR
            </button>
          </div>
        </div>

        {/* Active Membership Banner */}
        <div className="glass-card p-6 rounded-2xl border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-400" />
                Active Membership Plan
              </h3>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-400 px-2.5 py-1 rounded-md border border-slate-700">
                Module 05 & 06
              </span>
            </div>

            {activeMembership ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-white">{activeMembership.plan.name}</span>
                  <span className="text-xs font-semibold text-emerald-400">
                    ₹{activeMembership.plan.price} / {activeMembership.plan.durationDays} Days
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                  <span>Expires: {new Date(activeMembership.endDate).toLocaleDateString()}</span>
                  <span className="font-semibold text-amber-400">{daysRemaining} Days Remaining</span>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300 mb-2">
                <p className="font-semibold mb-0.5">No Active Subscription</p>
                <p className="text-amber-400/80">Your account is in PENDING_MEMBERSHIP state. Please select a plan to activate full access.</p>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-500">Online renewal via Razorpay</span>
            <button
              disabled
              className="px-4 py-2 bg-slate-800 text-slate-500 text-xs font-semibold rounded-lg border border-slate-700 cursor-not-allowed opacity-60"
            >
              Renew Plan (Module 06)
            </button>
          </div>
        </div>
      </div>

      {/* 3. ASSIGNED DIET PREVIEW */}
      <div className="glass-card p-6 rounded-2xl border border-slate-800">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-indigo-500/10 text-indigo-400 rounded-lg flex items-center justify-center border border-indigo-500/20">
              <Utensils className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Assigned Diet Plan Preview</h3>
              <p className="text-xs text-slate-400">Personalized macro targets assigned by gym trainer</p>
            </div>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-400 px-2.5 py-1 rounded-md border border-slate-700">
            Module 07
          </span>
        </div>

        {activeDiet ? (
          <div className="space-y-4">
            <div className="p-4 bg-slate-900/80 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-white">{activeDiet.title}</p>
                <p className="text-xs text-slate-400 mt-0.5">Target Daily Calories: <span className="text-indigo-400 font-semibold">{activeDiet.targetCalories} kcal</span></p>
              </div>

              {/* Macro Pills */}
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-medium rounded-lg">
                  Protein: {activeDiet.proteinGrams}g
                </span>
                <span className="px-3 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-medium rounded-lg">
                  Carbs: {activeDiet.carbsGrams}g
                </span>
                <span className="px-3 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-medium rounded-lg">
                  Fats: {activeDiet.fatsGrams}g
                </span>
              </div>
            </div>

            {/* Meal Items if available */}
            {activeDiet.dietItems && activeDiet.dietItems.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {activeDiet.dietItems.map((item) => (
                  <div key={item.id} className="p-3 bg-slate-900/40 rounded-xl border border-slate-800/80 text-xs">
                    <span className="text-[10px] uppercase font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">
                      {item.mealType}
                    </span>
                    <p className="font-semibold text-slate-200 mt-1.5">{item.foodName}</p>
                    <p className="text-slate-400 text-[11px] mt-0.5">{item.quantity} • {item.calories} kcal</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">Detailed meal items will be managed in Module 07.</p>
            )}
          </div>
        ) : (
          <div className="p-6 bg-slate-900/50 rounded-xl border border-slate-800 text-center">
            <Utensils className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-xs text-slate-400 font-medium">No diet plan assigned yet</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Your gym admin will assign a custom nutrition plan based on your fitness goals.</p>
          </div>
        )}
      </div>

      {/* Admin Attendance Override Drawer (ATT-003) */}
      <AdminOverrideDrawer
        isOpen={isAdminOverrideOpen}
        onClose={() => setIsAdminOverrideOpen(false)}
        onSuccess={() => window.location.reload()}
      />
    </div>
  );
}
