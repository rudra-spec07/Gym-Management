'use client';

import React, { useEffect, useState } from 'react';
import { apiFetch } from '../../../lib/api';
import {
  Users,
  Flame,
  Star,
  Trophy,
  Award,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Search,
} from 'lucide-react';

interface LeaderboardMember {
  id: string;
  name: string;
  profilePicUrl?: string | null;
  currentStreak: number;
  starScore: number;
}

export default function MemberCommunityPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardMember[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    async function loadCommunityData() {
      setIsLoading(true);
      setError(null);
      const res = await apiFetch('/api/user/community');
      if (res.success && Array.isArray(res.data?.leaderboard)) {
        setLeaderboard(res.data.leaderboard);
      } else {
        setError(res.error?.message || 'Failed to load community leaderboard data.');
      }
      setIsLoading(false);
    }

    loadCommunityData();
  }, []);

  const filteredMembers = leaderboard.filter((m) =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
        <p className="text-slate-300 font-medium">Loading Community Leaderboard...</p>
        <p className="text-xs text-slate-500 mt-1">Fetching privacy-sanitized tenant streaks</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-white">Member Community Leaderboard</h1>
            <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold uppercase tracking-wider rounded-md flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              Privacy Safeguarded
            </span>
          </div>
          <p className="text-sm text-slate-400">
            Compare fitness streaks & stars with gym peers. Personal contact details remain strictly confidential.
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search member..."
            className="w-full pl-9 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
          />
        </div>
      </div>

      {error && (
        <div className="glass-card p-6 rounded-2xl border border-red-500/30 text-center max-w-lg mx-auto">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-white mb-1">Leaderboard Error</h2>
          <p className="text-sm text-slate-400 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-xl transition"
          >
            Retry Loading
          </button>
        </div>
      )}

      {/* Top 3 Podium Highlights if enough members exist */}
      {!error && leaderboard.length >= 3 && !searchQuery && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {/* Rank 2 */}
          <div className="glass-card p-5 rounded-2xl border border-slate-800 text-center flex flex-col items-center justify-between order-2 sm:order-1">
            <div className="w-10 h-10 rounded-full bg-slate-800 text-slate-300 font-bold text-sm flex items-center justify-center border border-slate-700 mb-2">
              🥈 2nd
            </div>
            <div className="w-14 h-14 rounded-full bg-slate-800 border-2 border-slate-700 overflow-hidden mb-2 flex items-center justify-center font-bold text-slate-300 text-lg">
              {leaderboard[1].profilePicUrl ? (
                <img src={leaderboard[1].profilePicUrl} alt={leaderboard[1].name} className="w-full h-full object-cover" />
              ) : (
                leaderboard[1].name.charAt(0)
              )}
            </div>
            <p className="font-bold text-white text-sm">{leaderboard[1].name}</p>
            <div className="flex items-center gap-3 text-xs mt-2">
              <span className="text-amber-400 font-semibold flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 fill-amber-400" />
                {leaderboard[1].currentStreak}d
              </span>
              <span className="text-yellow-400 font-semibold flex items-center gap-1">
                <Star className="w-3.5 h-3.5 fill-yellow-400" />
                {leaderboard[1].starScore}
              </span>
            </div>
          </div>

          {/* Rank 1 Podium */}
          <div className="glass-card p-6 rounded-2xl border-2 border-amber-500/40 text-center flex flex-col items-center justify-between order-1 sm:order-2 bg-gradient-to-b from-amber-500/10 to-transparent">
            <div className="w-12 h-12 rounded-full gradient-accent text-white font-extrabold text-base flex items-center justify-center shadow-lg shadow-amber-500/20 mb-2">
              🏆 1st
            </div>
            <div className="w-16 h-16 rounded-full bg-slate-800 border-2 border-amber-400 overflow-hidden mb-2 flex items-center justify-center font-bold text-amber-400 text-xl shadow-md">
              {leaderboard[0].profilePicUrl ? (
                <img src={leaderboard[0].profilePicUrl} alt={leaderboard[0].name} className="w-full h-full object-cover" />
              ) : (
                leaderboard[0].name.charAt(0)
              )}
            </div>
            <p className="font-extrabold text-white text-base">{leaderboard[0].name}</p>
            <div className="flex items-center gap-3 text-xs mt-2 bg-slate-900/80 px-3 py-1.5 rounded-full border border-slate-800">
              <span className="text-amber-400 font-bold flex items-center gap-1">
                <Flame className="w-4 h-4 fill-amber-400" />
                {leaderboard[0].currentStreak} Days
              </span>
              <span>•</span>
              <span className="text-yellow-400 font-bold flex items-center gap-1">
                <Star className="w-4 h-4 fill-yellow-400" />
                {leaderboard[0].starScore} Stars
              </span>
            </div>
          </div>

          {/* Rank 3 */}
          <div className="glass-card p-5 rounded-2xl border border-slate-800 text-center flex flex-col items-center justify-between order-3">
            <div className="w-10 h-10 rounded-full bg-slate-800 text-amber-600 font-bold text-sm flex items-center justify-center border border-slate-700 mb-2">
              🥉 3rd
            </div>
            <div className="w-14 h-14 rounded-full bg-slate-800 border-2 border-slate-700 overflow-hidden mb-2 flex items-center justify-center font-bold text-slate-300 text-lg">
              {leaderboard[2].profilePicUrl ? (
                <img src={leaderboard[2].profilePicUrl} alt={leaderboard[2].name} className="w-full h-full object-cover" />
              ) : (
                leaderboard[2].name.charAt(0)
              )}
            </div>
            <p className="font-bold text-white text-sm">{leaderboard[2].name}</p>
            <div className="flex items-center gap-3 text-xs mt-2">
              <span className="text-amber-400 font-semibold flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 fill-amber-400" />
                {leaderboard[2].currentStreak}d
              </span>
              <span className="text-yellow-400 font-semibold flex items-center gap-1">
                <Star className="w-3.5 h-3.5 fill-yellow-400" />
                {leaderboard[2].starScore}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Member Grid */}
      {!error && filteredMembers.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredMembers.map((member, index) => (
            <div
              key={member.id}
              className="glass-card p-5 rounded-2xl border border-slate-800 hover:border-slate-700 transition flex items-center gap-4 group"
            >
              {/* Rank Index Pill */}
              <div className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                #{index + 1}
              </div>

              {/* Avatar */}
              <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 overflow-hidden flex items-center justify-center font-bold text-indigo-300 text-base shrink-0">
                {member.profilePicUrl ? (
                  <img src={member.profilePicUrl} alt={member.name} className="w-full h-full object-cover" />
                ) : (
                  member.name.charAt(0)
                )}
              </div>

              {/* Details */}
              <div className="overflow-hidden flex-1">
                <p className="font-semibold text-white text-sm truncate group-hover:text-indigo-300 transition">
                  {member.name}
                </p>

                <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                  <span className="flex items-center gap-1 text-amber-400 font-medium">
                    <Flame className="w-3.5 h-3.5 fill-amber-400" />
                    {member.currentStreak}d
                  </span>
                  <span className="flex items-center gap-1 text-yellow-400 font-medium">
                    <Star className="w-3.5 h-3.5 fill-yellow-400" />
                    {member.starScore}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : !error ? (
        <div className="glass-card p-8 rounded-2xl text-center border border-slate-800">
          <Users className="w-10 h-10 text-slate-600 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-300">No members found</p>
          <p className="text-xs text-slate-500 mt-1">Try refining your search parameter.</p>
        </div>
      ) : null}
    </div>
  );
}
