'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';

export interface UserProfile {
  id: string;
  gymId: string;
  gym?: {
    id: string;
    name: string;
    code: string;
    slug: string;
  };
  name: string;
  email: string;
  phone: string;
  role: 'SUPER_ADMIN' | 'GYM_ADMIN' | 'MEMBER';
  status: 'PENDING_MEMBERSHIP' | 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  currentStreak: number;
  longestStreak: number;
  starScore: number;
  hasActiveMembership: boolean;
  activeMembership?: {
    id: string;
    planId: string;
    planName: string;
    status: string;
    startDate: string;
    endDate: string;
  } | null;
}

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  fetchUser: () => Promise<void>;
  setUser: (user: UserProfile | null) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchUser = async () => {
    setIsLoading(true);
    const res = await apiFetch('/api/auth/me');
    if (res.success && res.data?.user) {
      setUser(res.data.user);
    } else {
      setUser(null);
    }
    setIsLoading(false);
  };

  const logout = async () => {
    await apiFetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    window.location.href = '/login';
  };

  useEffect(() => {
    fetchUser();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        fetchUser,
        setUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
