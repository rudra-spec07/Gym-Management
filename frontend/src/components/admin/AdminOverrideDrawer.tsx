'use client';

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiFetch } from '../../lib/api';
import {
  X,
  UserCheck,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Loader2,
  FileText,
  Users,
} from 'lucide-react';

const OverrideSchema = z.object({
  userId: z.string().min(1, 'Please select a member'),
  attendanceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  status: z.enum(['PRESENT', 'ABSENT', 'EXCUSED']),
  notes: z.string().min(3, 'Mandatory audit reason (min 3 characters)').max(500, 'Notes max 500 characters'),
});

type OverrideFormData = z.infer<typeof OverrideSchema>;

interface MemberOption {
  id: string;
  name: string;
}

interface AdminOverrideDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function AdminOverrideDrawer({ isOpen, onClose, onSuccess }: AdminOverrideDrawerProps) {
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [isFetchingMembers, setIsFetchingMembers] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<OverrideFormData>({
    resolver: zodResolver(OverrideSchema),
    defaultValues: {
      attendanceDate: todayStr,
      status: 'PRESENT',
      notes: '',
    },
  });

  // Fetch Member Options from Community endpoint
  useEffect(() => {
    if (isOpen) {
      const loadMembers = async () => {
        setIsFetchingMembers(true);
        const res = await apiFetch('/api/user/community');
        if (res.success && Array.isArray(res.data?.leaderboard)) {
          setMembers(res.data.leaderboard.map((m: any) => ({ id: m.id, name: m.name })));
        }
        setIsFetchingMembers(false);
      };
      loadMembers();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const onSubmit = async (data: OverrideFormData) => {
    setServerError(null);
    setSuccessMsg(null);
    setIsSubmitting(true);

    const res = await apiFetch('/api/attendance/manual', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    if (res.success && res.data) {
      setSuccessMsg('Attendance override saved successfully.');
      reset();
      if (onSuccess) onSuccess();
      setTimeout(() => {
        setSuccessMsg(null);
        onClose();
      }, 1200);
    } else {
      setServerError(res.error?.message || 'Failed to submit manual attendance override.');
    }
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-md bg-slate-900 border-l border-slate-800 h-full p-6 flex flex-col justify-between overflow-y-auto">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-indigo-500/10 text-indigo-400 rounded-xl flex items-center justify-center border border-indigo-500/20">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Admin Attendance Override</h2>
                <p className="text-xs text-slate-400">Manual entry & status corrections</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg bg-slate-800 transition"
              aria-label="Close Drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {successMsg && (
            <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {serverError && (
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{serverError}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-6">
            {/* Member Select */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                Select Gym Member <span className="text-red-400">*</span>
              </label>
              {isFetchingMembers ? (
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-400 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                  <span>Loading gym members...</span>
                </div>
              ) : (
                <select
                  {...register('userId')}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 transition"
                >
                  <option value="">-- Choose Member --</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.id.substring(0, 8)})
                    </option>
                  ))}
                </select>
              )}
              {errors.userId && <p className="text-xs text-red-400 mt-1">{errors.userId.message}</p>}
            </div>

            {/* Attendance Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Attendance Date <span className="text-red-400">*</span>
              </label>
              <input
                {...register('attendanceDate')}
                type="date"
                className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 transition"
              />
              {errors.attendanceDate && <p className="text-xs text-red-400 mt-1">{errors.attendanceDate.message}</p>}
            </div>

            {/* Attendance Status */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Override Status <span className="text-red-400">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                <label className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer hover:border-slate-700">
                  <input type="radio" value="PRESENT" {...register('status')} className="accent-emerald-500" />
                  <span className="text-xs font-semibold text-emerald-400">PRESENT</span>
                </label>
                <label className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer hover:border-slate-700">
                  <input type="radio" value="ABSENT" {...register('status')} className="accent-red-500" />
                  <span className="text-xs font-semibold text-red-400">ABSENT</span>
                </label>
                <label className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer hover:border-slate-700">
                  <input type="radio" value="EXCUSED" {...register('status')} className="accent-amber-500" />
                  <span className="text-xs font-semibold text-amber-400">EXCUSED</span>
                </label>
              </div>
              {errors.status && <p className="text-xs text-red-400 mt-1">{errors.status.message}</p>}
            </div>

            {/* Mandatory Reason Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                Mandatory Audit Reason / Notes <span className="text-red-400">*</span>
              </label>
              <textarea
                {...register('notes')}
                rows={3}
                placeholder="Specify administrative reason for manual entry..."
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
              />
              {errors.notes && <p className="text-xs text-red-400 mt-1">{errors.notes.message}</p>}
            </div>

            <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="py-2.5 px-5 gradient-brand hover:opacity-95 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-500/25 transition flex items-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <UserCheck className="w-4 h-4" />
                    <span>Save Override</span>
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
