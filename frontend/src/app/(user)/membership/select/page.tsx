'use client';

import React, { useEffect, useState } from 'react';
import { apiFetch } from '../../../../lib/api';
import {
  CreditCard,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  ShieldAlert,
  Info,
  X,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

import RazorpayCheckoutModal from '../../../../components/payment/RazorpayCheckoutModal';

interface Plan {
  id: string;
  name: string;
  description?: string | null;
  durationDays: number;
  price: number | string;
  benefits: string[];
  isActive: boolean;
}

interface ActiveMembership {
  id: string;
  status: 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' | 'CANCELLED';
  startDate: string;
  endDate: string;
  plan: {
    id: string;
    name: string;
    price: number | string;
    durationDays: number;
    benefits?: string[];
  };
}

export default function MemberPlanSelectionPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [activeMembership, setActiveMembership] = useState<ActiveMembership | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [checkoutPlan, setCheckoutPlan] = useState<Plan | null>(null);

  const fetchPlansAndMembership = async () => {
    setIsLoading(true);
    setError(null);

    const [plansRes, myMemRes] = await Promise.all([
      apiFetch('/api/membership/plans'),
      apiFetch('/api/membership/my-membership'),
    ]);

    if (plansRes.success && plansRes.data?.plans) {
      setPlans(plansRes.data.plans);
    } else {
      setError(plansRes.error?.message || 'Failed to load membership plans.');
    }

    if (myMemRes.success && myMemRes.data) {
      setActiveMembership(myMemRes.data.activeMembership || null);
    }

    setIsLoading(false);
  };

  useEffect(() => {
    fetchPlansAndMembership();
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
        <p className="text-slate-300 font-medium">Loading Available Membership Plans...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card p-6 rounded-2xl border border-red-500/30 text-center max-w-lg mx-auto">
        <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-white mb-1">Error Loading Plans</h2>
        <p className="text-sm text-slate-400 mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-xl transition"
        >
          Retry Loading
        </button>
      </div>
    );
  }

  // Calculate days remaining on active membership
  let daysRemaining = 0;
  if (activeMembership?.endDate) {
    const endMs = new Date(activeMembership.endDate).getTime();
    const nowMs = new Date().getTime();
    daysRemaining = Math.max(0, Math.ceil((endMs - nowMs) / (1000 * 60 * 60 * 24)));
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <CreditCard className="w-6 h-6 text-indigo-400" />
            Membership Plans & Subscriptions
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Choose a plan tailored to your fitness goals to maintain full gym access.
          </p>
        </div>
      </div>

      {/* Current Active Membership Status Banner */}
      {activeMembership ? (
        <div className="glass-card p-6 rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-indigo-950/40 to-slate-900/80">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                  Current Active Plan
                </span>
                {activeMembership.status === 'EXPIRING_SOON' ? (
                  <span className="px-2.5 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[11px] font-bold rounded-full flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Expiring Soon ({daysRemaining} days left)
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-bold rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Active Subscription
                  </span>
                )}
              </div>
              <h2 className="text-xl font-extrabold text-white">{activeMembership.plan.name}</h2>
              <p className="text-xs text-slate-400 mt-1">
                Valid until <span className="font-semibold text-slate-200">{new Date(activeMembership.endDate).toLocaleDateString()}</span> ({daysRemaining} days remaining)
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold text-indigo-300">
                ₹{activeMembership.plan.price}
              </span>
              <span className="text-xs text-slate-400 font-medium">
                / {activeMembership.plan.durationDays} Days
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="glass-card p-6 rounded-2xl border border-amber-500/30 bg-amber-500/5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-amber-300">No Active Subscription</h3>
            <p className="text-xs text-amber-400/80 mt-0.5">
              Select a membership plan below to activate or extend your gym access.
            </p>
          </div>
        </div>
      )}

      {/* Available Plans Grid */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-400" />
          Select a Membership Plan
        </h2>

        {plans.length === 0 ? (
          <div className="glass-card p-8 rounded-2xl border border-slate-800 text-center">
            <CreditCard className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-sm text-slate-400 font-medium">No active plans currently configured</p>
            <p className="text-xs text-slate-500 mt-1">
              Your gym administrator will publish membership plans shortly.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className="glass-card p-6 rounded-2xl border border-slate-800 flex flex-col justify-between relative group hover:border-indigo-500/40 transition duration-300"
              >
                <div>
                  {/* Plan Title & Duration Badge */}
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-bold text-white group-hover:text-indigo-300 transition">
                      {plan.name}
                    </h3>
                    <span className="px-2.5 py-1 bg-slate-800 text-indigo-400 border border-slate-700 text-xs font-bold rounded-lg">
                      {plan.durationDays} Days
                    </span>
                  </div>

                  {plan.description && (
                    <p className="text-xs text-slate-400 leading-relaxed mb-4">
                      {plan.description}
                    </p>
                  )}

                  {/* Price */}
                  <div className="flex items-baseline gap-1.5 mb-6 pb-4 border-b border-slate-800">
                    <span className="text-3xl font-extrabold text-white">₹{plan.price}</span>
                    <span className="text-xs text-slate-400 font-medium">
                      / {plan.durationDays} Days
                    </span>
                  </div>

                  {/* Benefits List */}
                  {plan.benefits && plan.benefits.length > 0 && (
                    <div className="space-y-2.5 mb-6">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Plan Benefits:
                      </p>
                      <ul className="space-y-2">
                        {plan.benefits.map((benefit, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                            <span>{benefit}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Online Razorpay Checkout Button */}
                <button
                  onClick={() => setCheckoutPlan(plan)}
                  className="w-full py-3 px-4 gradient-brand text-white font-semibold text-xs rounded-xl shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 hover:opacity-95 transition"
                >
                  <span>Pay & Subscribe ({plan.name})</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Razorpay Online Checkout Modal */}
      {checkoutPlan && (
        <RazorpayCheckoutModal
          plan={checkoutPlan}
          onClose={() => setCheckoutPlan(null)}
          onSuccess={() => {
            setCheckoutPlan(null);
            fetchPlansAndMembership();
          }}
        />
      )}
    </div>
  );
}
