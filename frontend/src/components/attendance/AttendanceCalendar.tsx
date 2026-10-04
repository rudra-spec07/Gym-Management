'use client';

import React, { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
} from 'lucide-react';

interface AttendanceRecord {
  id: string;
  attendanceDate: string; // YYYY-MM-DD
  status: 'PRESENT' | 'ABSENT' | 'EXCUSED';
  scanMethod: 'QR_SCAN' | 'MANUAL_ADMIN';
  timestamp: string;
  notes?: string | null;
}

export default function AttendanceCalendar() {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [attendanceMap, setAttendanceMap] = useState<Record<string, AttendanceRecord>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDayRecord, setSelectedDayRecord] = useState<{ dateStr: string; record?: AttendanceRecord } | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  // Calculate start & end dates of month in YYYY-MM-DD
  const firstDayOfMonth = new Date(Date.UTC(year, month, 1));
  const lastDayOfMonth = new Date(Date.UTC(year, month + 1, 0));

  const fromStr = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const toStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDayOfMonth.getUTCDate()).padStart(2, '0')}`;

  const monthName = currentDate.toLocaleString('default', { month: 'long' });

  useEffect(() => {
    async function fetchHistory() {
      setIsLoading(true);
      setError(null);

      const res = await apiFetch(`/api/attendance/history?from=${fromStr}&to=${toStr}&limit=100`);

      if (res.success && res.data?.attendance) {
        const map: Record<string, AttendanceRecord> = {};
        res.data.attendance.forEach((rec: AttendanceRecord) => {
          map[rec.attendanceDate] = rec;
        });
        setAttendanceMap(map);
      } else {
        setError(res.error?.message || 'Failed to load attendance history.');
      }
      setIsLoading(false);
    }

    fetchHistory();
  }, [fromStr, toStr]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDayRecord(null);
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDayRecord(null);
  };

  // Build Calendar Days
  const daysInMonth = lastDayOfMonth.getUTCDate();
  const startingDayOfWeek = firstDayOfMonth.getUTCDay(); // 0 (Sun) to 6 (Sat)

  const calendarDays = [];
  // Empty slots for padding before first day
  for (let i = 0; i < startingDayOfWeek; i++) {
    calendarDays.push(null);
  }
  // Days 1..daysInMonth
  for (let day = 1; day <= daysInMonth; day++) {
    const dayDate = new Date(Date.UTC(year, month, day));
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayOfWeek = dayDate.getUTCDay(); // 0 is Sunday
    const isSunday = dayOfWeek === 0;
    const record = attendanceMap[dateStr];

    calendarDays.push({
      dayNumber: day,
      dateStr,
      isSunday,
      record,
    });
  }

  return (
    <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-4">
      {/* Header & Month Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-500/10 text-indigo-400 rounded-xl flex items-center justify-center border border-indigo-500/20">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              Attendance History Grid
            </h2>
            <p className="text-xs text-slate-400">Monthly check-in records & status visualization</p>
          </div>
        </div>

        {/* Month Picker Controls */}
        <div className="flex items-center gap-2 bg-slate-900/80 p-1.5 rounded-xl border border-slate-800 self-start sm:self-auto">
          <button
            onClick={handlePrevMonth}
            aria-label="Previous Month"
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-bold text-white min-w-[120px] text-center">
            {monthName} {year}
          </span>
          <button
            onClick={handleNextMonth}
            aria-label="Next Month"
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Legend Bar */}
      <div className="flex flex-wrap items-center gap-3 text-xs pt-1 pb-2">
        <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Present
        </span>
        <span className="flex items-center gap-1.5 text-red-400 font-medium">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span> Absent
        </span>
        <span className="flex items-center gap-1.5 text-amber-400 font-medium">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Excused
        </span>
        <span className="flex items-center gap-1.5 text-slate-400 font-medium">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-600"></span> Sunday
        </span>
        <span className="flex items-center gap-1.5 text-slate-500 font-medium">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-800 border border-slate-700"></span> No Record
        </span>
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center min-h-[220px] text-center">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-2" />
          <p className="text-xs text-slate-400">Loading attendance data...</p>
        </div>
      ) : error ? (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-center text-xs text-red-400">
          <AlertCircle className="w-5 h-5 mx-auto mb-1 text-red-400" />
          <span>{error}</span>
        </div>
      ) : (
        /* Calendar Grid Table */
        <div className="space-y-2">
          {/* Weekday Labels */}
          <div className="grid grid-cols-7 text-center text-[11px] font-bold text-slate-400 uppercase tracking-wider py-1 border-b border-slate-800">
            <span>Sun</span>
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1.5">
            {calendarDays.map((item, idx) => {
              if (!item) {
                return <div key={`empty-${idx}`} className="h-14 sm:h-16 rounded-xl bg-slate-950/20"></div>;
              }

              const { dayNumber, dateStr, isSunday, record } = item;

              let cellStyle = 'bg-slate-900/40 border-slate-800/80 text-slate-300';
              let badgeText = '';
              let badgeColor = '';

              if (record) {
                if (record.status === 'PRESENT') {
                  cellStyle = 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300';
                  badgeText = 'PRESENT';
                  badgeColor = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
                } else if (record.status === 'ABSENT') {
                  cellStyle = 'bg-red-500/10 border-red-500/30 text-red-300';
                  badgeText = 'ABSENT';
                  badgeColor = 'bg-red-500/20 text-red-400 border-red-500/40';
                } else if (record.status === 'EXCUSED') {
                  cellStyle = 'bg-amber-500/10 border-amber-500/30 text-amber-300';
                  badgeText = 'EXCUSED';
                  badgeColor = 'bg-amber-500/20 text-amber-400 border-amber-500/40';
                }
              } else if (isSunday) {
                cellStyle = 'bg-slate-800/50 border-slate-700/50 text-slate-500';
                badgeText = 'SUNDAY';
                badgeColor = 'bg-slate-800 text-slate-400 border-slate-700';
              }

              return (
                <button
                  key={dateStr}
                  onClick={() => setSelectedDayRecord({ dateStr, record })}
                  className={`h-14 sm:h-16 p-1.5 sm:p-2 rounded-xl border flex flex-col justify-between items-start transition hover:border-indigo-500/50 focus:outline-none focus:border-indigo-500 ${cellStyle}`}
                >
                  <span className="text-xs font-bold">{dayNumber}</span>
                  {badgeText ? (
                    <span
                      className={`text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded border uppercase truncate max-w-full ${badgeColor}`}
                    >
                      {badgeText}
                    </span>
                  ) : (
                    <span className="text-[9px] text-slate-600 font-medium">--</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Selected Day Detail Card */}
      {selectedDayRecord && (
        <div className="mt-4 p-4 bg-slate-900 rounded-xl border border-slate-800 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="font-bold text-white text-sm">
              Date: <span className="text-indigo-400">{selectedDayRecord.dateStr}</span>
            </p>
            {selectedDayRecord.record ? (
              <div className="space-y-1 mt-1 text-slate-300">
                <p>
                  Status:{' '}
                  <span className="font-bold uppercase text-emerald-400">
                    {selectedDayRecord.record.status}
                  </span>{' '}
                  • Scan Method: <span className="font-semibold">{selectedDayRecord.record.scanMethod}</span>
                </p>
                {selectedDayRecord.record.notes && (
                  <p className="text-slate-400 italic">Notes: "{selectedDayRecord.record.notes}"</p>
                )}
              </div>
            ) : (
              <p className="text-slate-400 mt-1">No check-in record for this date.</p>
            )}
          </div>
          <button
            onClick={() => setSelectedDayRecord(null)}
            className="px-3 py-1.5 bg-slate-800 text-slate-300 hover:text-white rounded-lg text-xs font-medium self-end sm:self-center"
          >
            Close Detail
          </button>
        </div>
      )}
    </div>
  );
}
