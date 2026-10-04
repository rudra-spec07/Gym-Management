'use client';

import React, { useEffect, useState } from 'react';
import { apiFetch } from '../../../lib/api';
import {
  Receipt,
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
  AlertCircle,
  CreditCard,
  RefreshCw,
} from 'lucide-react';

interface PaymentRecord {
  id: string;
  razorpayOrderId: string;
  razorpayPaymentId?: string | null;
  amount: number | string;
  currency: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  createdAt: string;
  membership?: {
    plan?: {
      id: string;
      name: string;
      price: number | string;
      durationDays: number;
    } | null;
  } | null;
}

export default function MemberPaymentHistoryPage() {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPaymentHistory = async () => {
    setIsLoading(true);
    setError(null);

    const res = await apiFetch('/api/payment/history');

    if (res.success && Array.isArray(res.data)) {
      setPayments(res.data);
    } else {
      setError(res.error?.message || 'Failed to load payment history.');
    }

    setIsLoading(false);
  };

  useEffect(() => {
    fetchPaymentHistory();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Receipt className="w-6 h-6 text-indigo-400" />
            Payment & Transaction History
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            View your online membership purchase logs and gateway transaction receipts.
          </p>
        </div>

        <button
          onClick={fetchPaymentHistory}
          disabled={isLoading}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh History</span>
        </button>
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] text-center">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-3" />
          <p className="text-slate-300 font-medium text-sm">Loading Payment Records...</p>
        </div>
      ) : error ? (
        /* Error State */
        <div className="glass-card p-6 rounded-2xl border border-red-500/30 text-center max-w-lg mx-auto">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-white mb-1">Unable to Load Payments</h2>
          <p className="text-sm text-slate-400 mb-4">{error}</p>
          <button
            onClick={fetchPaymentHistory}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition"
          >
            Retry
          </button>
        </div>
      ) : payments.length === 0 ? (
        /* Empty State */
        <div className="glass-card p-10 rounded-2xl border border-slate-800 text-center max-w-md mx-auto space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center mx-auto">
            <CreditCard className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white">No Payment History Yet</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            You have not made any online membership purchases. Select a plan to get started.
          </p>
        </div>
      ) : (
        /* Payments Table / Responsive Cards */
        <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900/80 border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-3.5 px-5">Date & Time</th>
                  <th className="py-3.5 px-5">Plan</th>
                  <th className="py-3.5 px-5">Order ID</th>
                  <th className="py-3.5 px-5">Payment ID</th>
                  <th className="py-3.5 px-5">Amount</th>
                  <th className="py-3.5 px-5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-900/40 transition">
                    <td className="py-4 px-5 text-slate-300 font-medium">
                      {new Date(p.createdAt).toLocaleString()}
                    </td>
                    <td className="py-4 px-5 font-semibold text-white">
                      {p.membership?.plan?.name || 'Membership Plan'}
                    </td>
                    <td className="py-4 px-5 font-mono text-[11px] text-slate-400">
                      {p.razorpayOrderId}
                    </td>
                    <td className="py-4 px-5 font-mono text-[11px] text-slate-400">
                      {p.razorpayPaymentId || '—'}
                    </td>
                    <td className="py-4 px-5 font-extrabold text-white text-sm">
                      ₹{p.amount}
                    </td>
                    <td className="py-4 px-5">
                      {p.status === 'SUCCESS' ? (
                        <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-bold rounded-lg inline-flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          SUCCESS
                        </span>
                      ) : p.status === 'PENDING' ? (
                        <span className="px-2.5 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[11px] font-bold rounded-lg inline-flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          PENDING
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 bg-red-500/10 text-red-400 border border-red-500/20 text-[11px] font-bold rounded-lg inline-flex items-center gap-1.5">
                          <XCircle className="w-3.5 h-3.5" />
                          FAILED
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-slate-800">
            {payments.map((p) => (
              <div key={p.id} className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-white">
                    {p.membership?.plan?.name || 'Membership Plan'}
                  </span>
                  <span className="text-base font-extrabold text-white">₹{p.amount}</span>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>{new Date(p.createdAt).toLocaleDateString()}</span>
                  {p.status === 'SUCCESS' ? (
                    <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold rounded-md flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      SUCCESS
                    </span>
                  ) : p.status === 'PENDING' ? (
                    <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold rounded-md flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      PENDING
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] font-md rounded-md flex items-center gap-1">
                      <XCircle className="w-3 h-3" />
                      FAILED
                    </span>
                  )}
                </div>

                <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 text-[11px] font-mono text-slate-400 space-y-1">
                  <div>
                    <span className="text-slate-500 font-sans font-semibold">Order: </span>
                    {p.razorpayOrderId}
                  </div>
                  {p.razorpayPaymentId && (
                    <div>
                      <span className="text-slate-500 font-sans font-semibold">Payment: </span>
                      {p.razorpayPaymentId}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
