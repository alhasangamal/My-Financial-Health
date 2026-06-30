import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { Profile, Language, CurrencyCode } from '../types';

interface AuthContextProps {
  user: any | null;
  profile: Profile | null;
  loading: boolean;
  isGuest: boolean;
  activePortfolio: string;
  portfolios: string[];
  setActivePortfolio: (portfolio: string) => void;
  addPortfolio: (name: string) => void;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

const GUEST_PROFILE: Profile = {
  id: 'guest-id',
  full_name: 'ضيف كريم',
  email: 'guest@financialhealth.com',
  main_currency: 'EGP',
  language: 'ar',
  created_at: new Date().toISOString(),
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(true);

  // Multi-Portfolio States
  const [activePortfolio, setActivePortfolioState] = useState<string>(() => localStorage.getItem('active_portfolio') || 'default');
  const [portfolios, setPortfolios] = useState<string[]>(() => {
    const list = localStorage.getItem('portfolios_list');
    return list ? JSON.parse(list) : ['default'];
  });

  const getProfileForPortfolio = (portfolio: string): Profile => {
    const stored = localStorage.getItem(`guest_profile_${portfolio}`);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        // Fallback below
      }
    }
    
    // Create new profile instance for this portfolio
    const newProf: Profile = {
      id: portfolio === 'default' ? 'guest-id' : `guest-id-${portfolio}`,
      full_name: portfolio === 'default' ? 'ضيف كريم' : `محفظة: ${portfolio}`,
      email: `${portfolio}@financialhealth.com`,
      main_currency: 'EGP',
      language: 'ar',
      created_at: new Date().toISOString(),
    };
    localStorage.setItem(`guest_profile_${portfolio}`, JSON.stringify(newProf));
    return newProf;
  };

  // Sync profile when activePortfolio changes
  useEffect(() => {
    const prof = getProfileForPortfolio(activePortfolio);
    setProfile(prof);
    
    const uId = activePortfolio === 'default' ? 'guest-id' : `guest-id-${activePortfolio}`;
    setUser({ id: uId, email: `${activePortfolio}@financialhealth.com` });
    setIsGuest(true);
    setLoading(false);
  }, [activePortfolio]);

  const setActivePortfolio = (port: string) => {
    localStorage.setItem('active_portfolio', port);
    setActivePortfolioState(port);
  };

  const addPortfolio = (name: string) => {
    const cleaned = name.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    if (!cleaned || portfolios.includes(cleaned)) return;
    const updated = [...portfolios, cleaned];
    setPortfolios(updated);
    localStorage.setItem('portfolios_list', JSON.stringify(updated));
    setActivePortfolio(cleaned);
  };

  const signOut = async () => {
    if (isGuest) {
      setUser(null);
      setProfile(null);
      localStorage.removeItem(`guest_profile_${activePortfolio}`);
      return;
    }

    if (supabase) {
      await supabase.auth.signOut();
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (isGuest || !supabase) {
      const updated = { ...profile, ...updates } as Profile;
      setProfile(updated);
      localStorage.setItem(`guest_profile_${activePortfolio}`, JSON.stringify(updated));
      return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user?.id);

      if (error) throw error;
      setProfile((prev) => (prev ? { ...prev, ...updates } : null));
    } catch (e) {
      console.error('Failed to update profile', e);
      throw e;
    }
  };

  const refreshProfile = async () => {
    if (isGuest) {
      const prof = getProfileForPortfolio(activePortfolio);
      setProfile(prof);
      return;
    }
    if (user?.id && supabase) {
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (data) setProfile(data);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        isGuest,
        activePortfolio,
        portfolios,
        setActivePortfolio,
        addPortfolio,
        signOut,
        updateProfile,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
