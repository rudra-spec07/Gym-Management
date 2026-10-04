'use client';

import React, { useEffect, useState } from 'react';
import { apiFetch } from '../../../lib/api';
import {
  CreditCard,
  Plus,
  Edit,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  X,
  Trash2,
  Sparkles,
} from 'lucide-react';

interface Plan {
  id: string;
  gymId: string;
  name: string;
  description?: string | null;
  durationDays: number;
  price: number | string;
  benefits: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function AdminPlanBuilderPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modal / Form state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    durationDays: 30,
    price: 999,
    benefits: ['Full Gym Access', 'Locker Room'],
  });
  const [benefitInput, setBenefitInput] = useState('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchPlans = async () => {
    setIsLoading(true);
    setError(null);
    const res = await apiFetch('/api/membership/plans?includeInactive=true');
    if (res.success && res.data?.plans) {
      setPlans(res.data.plans);
    } else {
      setError(res.error?.message || 'Failed to fetch membership plans.');
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const openCreateModal = () => {
    setEditingPlan(null);
    setFormData({
      name: '',
      description: '',
      durationDays: 30,
      price: 999,
      benefits: ['Full Gym Access', 'Locker Room'],
    });
    setBenefitInput('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (plan: Plan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      description: plan.description || '',
      durationDays: plan.durationDays,
      price: Number(plan.price),
      benefits: plan.benefits || [],
    });
    setBenefitInput('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const addBenefit = () => {
    if (!benefitInput.trim()) return;
    if (formData.benefits.includes(benefitInput.trim())) return;
    setFormData((prev) => ({
      ...prev,
      benefits: [...prev.benefits, benefitInput.trim()],
    }));
    setBenefitInput('');
  };

  const removeBenefit = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      benefits: prev.benefits.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.name.trim() || formData.name.trim().length < 2) {
      setFormError('Plan name must be at least 2 characters');
      return;
    }

    if (formData.durationDays < 1) {
      setFormError('Duration must be at least 1 day');
      return;
    }

    if (formData.price <= 0) {
      setFormError('Price must be a positive number');
      return;
    }

    setIsSaving(true);

    const payload = {
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      durationDays: Number(formData.durationDays),
      price: Number(formData.price),
      benefits: formData.benefits,
    };

    let res;
    if (editingPlan) {
      res = await apiFetch(`/api/membership/plans/${editingPlan.id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
    } else {
      res = await apiFetch('/api/membership/plans', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    }

    setIsSaving(false);

    if (res.success) {
      setIsModalOpen(false);
      fetchPlans();
    } else {
      setFormError(res.error?.message || 'Failed to save membership plan.');
    }
  };

  const togglePlanActive = async (plan: Plan) => {
    const res = await apiFetch(`/api/membership/plans/${plan.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive: !plan.isActive }),
    });

    if (res.success) {
      fetchPlans();
    } else {
      alert(res.error?.message || 'Failed to update plan active state.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
        <p className="text-slate-300 font-medium">Loading Membership Plans...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <CreditCard className="w-6 h-6 text-indigo-400" />
            Membership Plan Builder
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Configure subscription tiers, pricing, duration, and benefits for your gym tenant.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="px-4 py-2.5 gradient-brand text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-500/20 flex items-center gap-2 hover:opacity-95 transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Plan</span>
        </button>
      </div>

      {error && (
        <div className="glass-card p-6 rounded-2xl border border-red-500/30 text-center max-w-lg mx-auto">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-white mb-1">Error Loading Plans</h2>
          <p className="text-sm text-slate-400 mb-4">{error}</p>
          <button
            onClick={fetchPlans}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-xl transition"
          >
            Retry Loading
          </button>
        </div>
      )}

      {/* Plans List Grid */}
      {plans.length === 0 ? (
        <div className="glass-card p-12 rounded-2xl border border-slate-800 text-center max-w-md mx-auto">
          <CreditCard className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white mb-1">No Membership Plans</h3>
          <p className="text-xs text-slate-400 mb-6">
            Get started by creating your first subscription plan for your gym members.
          </p>
          <button
            onClick={openCreateModal}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition"
          >
            Create Plan
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`glass-card p-6 rounded-2xl border flex flex-col justify-between relative transition duration-300 ${
                plan.isActive ? 'border-slate-800 hover:border-indigo-500/40' : 'border-slate-800/60 opacity-75'
              }`}
            >
              <div>
                {/* Header Badge */}
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-bold text-white">{plan.name}</h3>
                  {plan.isActive ? (
                    <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-bold rounded-full flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Active
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 bg-slate-800 text-slate-400 border border-slate-700 text-[11px] font-bold rounded-full flex items-center gap-1">
                      <XCircle className="w-3 h-3" />
                      Inactive
                    </span>
                  )}
                </div>

                {plan.description && (
                  <p className="text-xs text-slate-400 leading-relaxed mb-4">
                    {plan.description}
                  </p>
                )}

                {/* Price & Duration */}
                <div className="flex items-baseline gap-1.5 mb-6 pb-4 border-b border-slate-800">
                  <span className="text-3xl font-extrabold text-white">₹{plan.price}</span>
                  <span className="text-xs text-slate-400 font-medium">
                    / {plan.durationDays} Days
                  </span>
                </div>

                {/* Benefits List */}
                {plan.benefits && plan.benefits.length > 0 && (
                  <div className="space-y-2 mb-6">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Benefits ({plan.benefits.length}):
                    </p>
                    <ul className="space-y-1.5">
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

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
                <button
                  onClick={() => openEditModal(plan)}
                  className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 flex items-center justify-center gap-1.5 transition"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>

                <button
                  onClick={() => togglePlanActive(plan)}
                  className={`py-2 px-3 text-xs font-semibold rounded-xl border transition ${
                    plan.isActive
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20'
                      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                  }`}
                >
                  {plan.isActive ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Plan Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card p-6 rounded-2xl border border-slate-800 max-w-lg w-full relative space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                {editingPlan ? 'Edit Membership Plan' : 'Create New Membership Plan'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800/80"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* Plan Name */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Plan Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Monthly Gold Membership"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Unlimited gym access & trainer support"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Duration & Price Row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Duration (Days) <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={formData.durationDays}
                    onChange={(e) =>
                      setFormData({ ...formData, durationDays: Number(e.target.value) })
                    }
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Price (₹) <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={formData.price}
                    onChange={(e) =>
                      setFormData({ ...formData, price: Number(e.target.value) })
                    }
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Benefits Input */}
              <div className="space-y-2">
                <label className="block text-slate-300 font-semibold">Plan Benefits</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="e.g. Sauna access"
                    value={benefitInput}
                    onChange={(e) => setBenefitInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addBenefit();
                      }
                    }}
                    className="flex-1 px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={addBenefit}
                    className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl border border-slate-700 transition"
                  >
                    Add
                  </button>
                </div>

                {formData.benefits.length > 0 && (
                  <div className="space-y-1.5 pt-2">
                    {formData.benefits.map((benefit, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 bg-slate-900/80 rounded-lg border border-slate-800 text-slate-300"
                      >
                        <span className="flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          {benefit}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeBenefit(idx)}
                          className="p-1 text-slate-500 hover:text-red-400 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Buttons */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 gradient-brand text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/20 flex items-center gap-2 hover:opacity-95 transition disabled:opacity-50"
                >
                  {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{editingPlan ? 'Save Changes' : 'Create Plan'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
