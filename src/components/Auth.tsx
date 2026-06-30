import React, { useState } from 'react';
import { useTranslation } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { ShieldAlert, Mail, Lock, User, LogIn, ArrowRight } from 'lucide-react';

export const Auth: React.FC = () => {
  const { t, language, setLanguage, dir } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    if (!isSupabaseConfigured() || !supabase) {
      setErrorMsg(language === 'ar' ? 'نظام Supabase غير مبرمج بعد. يرجى الاستمرار كضيف.' : 'Supabase is not configured yet. Please continue as guest.');
      setLoading(false);
      return;
    }

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            },
          },
        });

        if (error) throw error;
        
        // Seed user profile
        if (data.user) {
          await supabase.from('profiles').insert([
            {
              id: data.user.id,
              full_name: fullName,
              email: email,
              main_currency: 'USD',
              language: language,
            },
          ]);
        }

        setSuccessMsg(
          language === 'ar'
            ? 'تم إنشاء الحساب! تفقد بريدك الإلكتروني لتأكيد التسجيل.'
            : 'Account created! Please check your email for confirmation.'
        );
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  const handleGuestMode = () => {
    // Setting guest indicator triggers AuthContext update
    localStorage.setItem('is_guest_mode', 'true');
    window.location.reload();
  };

  return (
    <div className={`min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 transition-colors duration-300
      ${theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'}`}
    >
      <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
        <button 
          onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
          className={`px-3 py-1.5 rounded-lg border text-xs font-semibold hover:scale-105 transition-transform
            ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}
        >
          {language === 'ar' ? 'English' : 'العربية'}
        </button>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-xl shadow-emerald-500/20">
            <ShieldAlert className="w-10 h-10 text-white animate-pulse" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
          {t('authWelcome')}
        </h2>
        <p className="mt-2 text-center text-sm opacity-70 px-4">
          {t('authIntro')}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className={`py-8 px-4 sm:px-10 rounded-3xl border shadow-xl backdrop-blur-md
          ${theme === 'dark' ? 'bg-slate-900/60 border-slate-800/80 shadow-slate-950/50' : 'bg-white border-slate-200/80 shadow-slate-200/50'}`}
        >
          <h3 className="text-xl font-bold mb-6 text-center">
            {isSignUp ? t('signup') : t('login')}
          </h3>

          {errorMsg && (
            <div className="mb-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
              {successMsg}
            </div>
          )}

          <form className="space-y-5" onSubmit={handleAuth}>
            {isSignUp && (
              <div>
                <label className="block text-xs font-semibold mb-1.5 opacity-80">{t('fullname')}</label>
                <div className="relative">
                  <div className={`absolute inset-y-0 ${dir === 'rtl' ? 'right-0 pr-3' : 'left-0 pl-3'} flex items-center pointer-events-none text-slate-400`}>
                    <User className="h-4.5 w-4.5" />
                  </div>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className={`block w-full rounded-xl text-sm border focus:ring-2 focus:ring-emerald-500 focus:outline-none py-2.5 
                      ${dir === 'rtl' ? 'pr-10 pl-4' : 'pl-10 pr-4'}
                      ${theme === 'dark' 
                        ? 'bg-slate-950 border-slate-800 text-slate-100 placeholder-slate-600 focus:border-slate-700' 
                        : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-slate-300'}`}
                    placeholder="Alhassan Gamal"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold mb-1.5 opacity-80">{t('email')}</label>
              <div className="relative">
                <div className={`absolute inset-y-0 ${dir === 'rtl' ? 'right-0 pr-3' : 'left-0 pl-3'} flex items-center pointer-events-none text-slate-400`}>
                  <Mail className="h-4.5 w-4.5" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`block w-full rounded-xl text-sm border focus:ring-2 focus:ring-emerald-500 focus:outline-none py-2.5
                    ${dir === 'rtl' ? 'pr-10 pl-4' : 'pl-10 pr-4'}
                    ${theme === 'dark' 
                      ? 'bg-slate-950 border-slate-800 text-slate-100 placeholder-slate-600' 
                      : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'}`}
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5 opacity-80">{t('password')}</label>
              <div className="relative">
                <div className={`absolute inset-y-0 ${dir === 'rtl' ? 'right-0 pr-3' : 'left-0 pl-3'} flex items-center pointer-events-none text-slate-400`}>
                  <Lock className="h-4.5 w-4.5" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`block w-full rounded-xl text-sm border focus:ring-2 focus:ring-emerald-500 focus:outline-none py-2.5
                    ${dir === 'rtl' ? 'pr-10 pl-4' : 'pl-10 pr-4'}
                    ${theme === 'dark' 
                      ? 'bg-slate-950 border-slate-800 text-slate-100 placeholder-slate-600' 
                      : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'}`}
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-xl text-sm font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-emerald-500/10 cursor-pointer"
              >
                {loading ? '...' : (isSignUp ? t('signup') : t('login'))}
              </button>
            </div>
          </form>

          <div className="mt-6 border-t border-slate-800/10 pt-4 flex flex-col gap-3">
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-xs font-semibold text-emerald-500 hover:text-emerald-400 text-center w-full focus:outline-none cursor-pointer"
            >
              {isSignUp ? t('haveAccount') : t('noAccount')}
            </button>
            
            <div className="relative flex items-center justify-center my-1.5">
              <span className={`absolute px-3 text-[10px] font-bold uppercase ${theme === 'dark' ? 'bg-slate-900 text-slate-500' : 'bg-white text-slate-400'}`}>
                {language === 'ar' ? 'أو' : 'OR'}
              </span>
              <div className="w-full border-t border-slate-800/10"></div>
            </div>

            <button
              onClick={handleGuestMode}
              className={`w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-xs font-bold border transition-colors cursor-pointer
                ${theme === 'dark' 
                  ? 'bg-slate-950 border-slate-800 text-emerald-500 hover:bg-slate-900' 
                  : 'bg-slate-50 border-slate-200 text-emerald-600 hover:bg-slate-100'}`}
            >
              <span>{t('orContinueLocalStorage')}</span>
              <ArrowRight className={`w-3.5 h-3.5 ${dir === 'rtl' ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
