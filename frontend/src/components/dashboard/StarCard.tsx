'use client';

import React from 'react';
import { Star, Sparkles } from 'lucide-react';

export type StarCardProps = {
  starScore: number;
};

export default function StarCard({ starScore }: StarCardProps) {
  // Render visual rating indicator (1 to 5 stars)
  const displayStars = Math.min(5, Math.max(1, Math.ceil(starScore / 5)));

  return (
    <div className="glass-card p-6 rounded-2xl border border-slate-800 relative overflow-hidden group flex flex-col justify-between">
      {/* Background Glow */}
      <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-yellow-500/10 rounded-full blur-2xl group-hover:bg-yellow-500/20 transition duration-500 pointer-events-none" />

      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Performance Score
          </span>
          <div className="w-10 h-10 bg-yellow-500/10 text-yellow-400 rounded-xl flex items-center justify-center border border-yellow-500/20 shadow-sm">
            <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
          </div>
        </div>

        {/* Star Score Count */}
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-4xl font-extrabold text-white tracking-tight">{starScore}</span>
          <span className="text-base font-bold text-yellow-400">
            {starScore === 1 ? 'Star' : 'Stars'}
          </span>
        </div>

        {/* Visual Star Rating */}
        <div className="flex items-center gap-1.5 mt-2">
          {Array.from({ length: 5 }).map((_, idx) => (
            <Star
              key={idx}
              className={`w-4 h-4 ${
                idx < displayStars
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-slate-700 fill-slate-800'
              }`}
            />
          ))}
          <span className="text-xs text-slate-400 font-medium ml-1">Performance Rank</span>
        </div>
      </div>

      {/* Attendance Performance Description */}
      <div className="mt-4 pt-3.5 border-t border-slate-800/80 flex items-center gap-2 text-xs text-yellow-300/90 bg-yellow-500/5 px-3 py-2 rounded-xl border border-yellow-500/10">
        <Sparkles className="w-4 h-4 text-yellow-400 shrink-0" />
        <span className="font-medium">+1 Star per check-in (-2 stars for missed days)</span>
      </div>
    </div>
  );
}
