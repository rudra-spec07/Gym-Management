'use client';

import React, { useState, useEffect } from 'react';
import Script from 'next/script';
import { apiFetch } from '../../lib/api';
import {
  CreditCard,
  ShieldCheck,
  AlertCircle,
  Loader2,
  X,
  CheckCircle2,
  Lock,
} from 'lucide-react';

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface PlanInfo {
  id: string;
  name: string;
  price: number | string;
  durationDays: number;
  description?: string | null;
}

interface RazorpayCheckoutModalProps {
  plan: PlanInfo;
  onClose: () => void;
  onSuccess: () => void;
}

export default function RazorpayCheckoutModal({
  plan,
  onClose,
  onSuccess,
}: RazorpayCheckoutModalProps) {
  const [scriptLoaded, setScriptLoaded] = useState<boolean>(false);
  const [scriptError, setScriptError] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.Razorpay) {
      setScriptLoaded(true);
    }
  }, []);

  const handleScriptLoad = () => {
    setScriptLoaded(true);
  };

  const handleScriptError = () => {
    setScriptError(true);
    setError('Failed to load Razorpay Payment Gateway. Please check your network connection.');
  };

  const handlePayNow = async () => {
    if (isProcessing) return;

    setIsProcessing(true);
    setError(null);
    setStatusMessage('Creating payment order with gateway...');

    try {
      // 1. Create Server-Side Payment Order (never trusting frontend amount)
      const orderRes = await apiFetch('/api/payment/order', {
        method: 'POST',
        body: JSON.stringify({ planId: plan.id }),
      });

      if (!orderRes.success || !orderRes.data) {
        setError(orderRes.error?.message || 'Failed to create payment order.');
        setIsProcessing(false);
        setStatusMessage(null);
        return;
      }

      const orderData = orderRes.data;

      // 2. Fallback check for Razorpay script load
      if (!window.Razorpay) {
        setError('Razorpay SDK is not loaded. Please refresh and try again.');
        setIsProcessing(false);
        setStatusMessage(null);
        return;
      }

      setStatusMessage('Opening secure checkout dialog...');

      // 3. Configure Razorpay Options (key & amount provided by backend)
      const options = {
        key: orderData.keyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_mock',
        amount: orderData.amountInPaise,
        currency: orderData.currency || 'INR',
        name: 'Gym Management',
        description: `Subscription: ${orderData.planName}`,
        order_id: orderData.razorpayOrderId,
        handler: async function (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) {
          setStatusMessage('Verifying payment signature with server...');

          // 4. Client Callback Verification with Server
          const verifyRes = await apiFetch('/api/payment/verify', {
            method: 'POST',
            body: JSON.stringify({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              planId: plan.id,
            }),
          });

          if (verifyRes.success && verifyRes.data) {
            setIsSuccess(true);
            setStatusMessage(null);
            setIsProcessing(false);
            setTimeout(() => {
              onSuccess();
            }, 1800);
          } else {
            setError(
              verifyRes.error?.message ||
                'Payment verification failed. Please contact gym administrator.'
            );
            setIsProcessing(false);
            setStatusMessage(null);
          }
        },
        modal: {
          ondismiss: function () {
            setIsProcessing(false);
            setStatusMessage(null);
            // User cancelled modal
          },
        },
        theme: {
          color: '#4f46e5',
        },
      };

      const razorpayInstance = new window.Razorpay(options);
      razorpayInstance.on('payment.failed', function (response: any) {
        setError(
          response.error?.description || 'Payment was declined or failed at gateway level.'
        );
        setIsProcessing(false);
        setStatusMessage(null);
      });

      razorpayInstance.open();
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during checkout.');
      setIsProcessing(false);
      setStatusMessage(null);
    }
  };

  return (
    <>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        onLoad={handleScriptLoad}
        onError={handleScriptError}
      />

      <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="glass-card p-6 rounded-2xl border border-indigo-500/30 max-w-md w-full relative space-y-5">
          {/* Close Button */}
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800/80 transition disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-500/10 text-indigo-400 rounded-xl flex items-center justify-center border border-indigo-500/20 shrink-0">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Online Checkout</h3>
              <p className="text-xs text-slate-400">Razorpay Encrypted Payment Lifecycle</p>
            </div>
          </div>

          {/* Plan Summary Card */}
          <div className="p-4 bg-slate-900/90 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-white">{plan.name}</span>
              <span className="text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-500/20">
                {plan.durationDays} Days
              </span>
            </div>
            <div className="flex items-baseline justify-between pt-2 border-t border-slate-800">
              <span className="text-xs text-slate-400">Total Membership Fee:</span>
              <span className="text-2xl font-extrabold text-white">₹{plan.price}</span>
            </div>
          </div>

          {/* Success Notification Banner */}
          {isSuccess && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-3 text-emerald-400 text-xs font-semibold animate-pulse">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span>Payment verified successfully! Membership is now ACTIVE.</span>
            </div>
          )}

          {/* Error Message Banner */}
          {error && (
            <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-2.5 text-red-300 text-xs">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Status Progress Indicator */}
          {isProcessing && statusMessage && (
            <div className="flex items-center justify-center gap-2 py-2 text-indigo-300 text-xs font-medium">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
              <span>{statusMessage}</span>
            </div>
          )}

          {/* Security Notice */}
          <div className="flex items-center gap-2 text-[11px] text-slate-400 bg-slate-900/50 p-2.5 rounded-lg border border-slate-800">
            <Lock className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span>Server-enforced price integrity with HMAC-SHA256 signature verification.</span>
          </div>

          {/* CTA Action Button */}
          {!isSuccess && (
            <button
              onClick={handlePayNow}
              disabled={isProcessing || scriptError}
              className="w-full py-3 px-4 gradient-brand text-white font-semibold text-xs rounded-xl shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 hover:opacity-95 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing Checkout...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Proceed to Pay ₹{plan.price}</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </>
  );
}
