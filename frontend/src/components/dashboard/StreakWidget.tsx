'use client';

import React from 'react';
import { Flame, Award, ShieldCheck } from 'lucide-react';

export type StreakWidgetProps = {
  currentStreak: number;
  longestStreak: number;
};

export default function StreakWidget({ currentStreak, longestStreak }: StreakWidgetProps) {
  return (
    <div className="glass-card p-6 rounded-2xl border border-slate-800 relative overflow-hidden group flex flex-col justify-between">
      {/* Background Glow */}
      <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition duration-500 pointer-events-none" />

      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Attendance Streak
          </span>
          <div className="w-10 h-10 bg-amber-500/10 text-amber-400 rounded-xl flex items-center justify-center border border-amber-500/20 shadow-sm">
            <Flame className="w-5 h-5 fill-amber-400 text-amber-400 animate-pulse motion-reduce:animate-none" />
          </div>
        </div>

        {/* Current Streak Count */}
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-4xl font-extrabold text-white tracking-tight">{currentStreak}</span>
          <span className="text-base font-bold text-amber-400">
            {currentStreak === 1 ? 'Day' : 'Days'}
          </span>
        </div>

        {/* Longest Streak Watermark */}
        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium mt-1">
          <Award className="w-3.5 h-3.5 text-indigo-400" />
          <span>Longest Streak:</span>
          <span className="font-bold text-slate-200">{longestStreak} days</span>
        </div>
      </div>

      {/* Sunday Protection Banner */}
      <div className="mt-4 pt-3.5 border-t border-slate-800/80 flex items-center gap-2 text-xs text-amber-300/90 bg-amber-500/5 px-3 py-2 rounded-xl border border-amber-500/10">
        <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
        <span className="font-medium">Sundays do not break your streak!</span>
      </div>
    </div>
  );
}
