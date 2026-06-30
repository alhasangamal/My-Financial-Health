import React, { useState } from 'react';
import { useTranslation } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { 
  LayoutDashboard, Wallet, CreditCard, PiggyBank, ShieldAlert, 
  Target, BarChart3, TrendingUp, Settings, LogOut, Menu, X, 
  Sun, Moon, Languages, Landmark, Brain, ChevronLeft, ChevronRight
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const { t, language, setLanguage, dir } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const { profile, signOut, activePortfolio, portfolios, setActivePortfolio, addPortfolio } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const collapsed = false;

  const menuItems = [
    { id: 'dashboard', label: t('dashboard'), icon: LayoutDashboard },
    { id: 'income', label: t('income'), icon: Wallet },
    { id: 'expenses', label: t('expenses'), icon: CreditCard },
    { id: 'debts', label: t('debts'), icon: Landmark },
    { id: 'assets', label: t('assets'), icon: PiggyBank },
    { id: 'reserve', label: t('reserve'), icon: ShieldAlert },
    { id: 'goals', label: t('goals'), icon: Target },
    { id: 'scenarios', label: t('scenarios'), icon: TrendingUp },
    { id: 'ai-forecast', label: language === 'ar' ? 'التوقعات الذكية (AI)' : 'AI Forecasts', icon: Brain },
    { id: 'reports', label: t('reports'), icon: BarChart3 },
    { id: 'settings', label: t('settings'), icon: Settings },
  ];

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
    setMobileOpen(false);
  };

  const navClass = `h-screen fixed top-0 bottom-0 z-30 transition-all duration-300 flex flex-col justify-between 
    ${dir === 'rtl' ? 'right-0 border-l' : 'left-0 border-r'} 
    ${collapsed ? 'w-20' : 'w-64'} 
    ${theme === 'dark' 
      ? 'bg-slate-950/80 border-slate-800 text-slate-200' 
      : 'bg-white border-slate-200 text-slate-800'} 
    hidden lg:flex backdrop-blur-md`;

  const mobileNavClass = `fixed inset-0 z-40 transition-transform duration-300 transform lg:hidden flex
    ${mobileOpen 
      ? 'translate-x-0' 
      : dir === 'rtl' ? 'translate-x-full' : '-translate-x-full'}`;

  const sidebarContent = (isMobile = false) => {
    return (
      <div className={`h-full flex flex-col justify-between p-4 w-64 ${theme === 'dark' ? 'bg-slate-950' : 'bg-white'}`}>
        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-6 border-b border-slate-800/20">
            <div className="flex items-center gap-3">
              <img 
                src="/logo.png" 
                alt="My Financial Health Logo" 
                className="w-10 h-10 rounded-xl object-cover shadow-lg shadow-emerald-500/20"
              />
              {(!collapsed || isMobile) && (
                <div>
                  <h1 className="font-bold text-lg leading-tight bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                    {t('appName')}
                  </h1>
                  <span className="text-[10px] opacity-60">Beta</span>
                </div>
              )}
            </div>
            {isMobile && (
              <button onClick={() => setMobileOpen(false)} className="p-2 rounded-lg hover:bg-slate-800/10">
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* User Profile Summary */}
          {(!collapsed || isMobile) && profile && (
            <div className={`mt-6 p-3 rounded-xl flex items-center gap-3 border ${theme === 'dark' ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
              <div className="w-9 h-9 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center font-bold text-emerald-500">
                {profile.full_name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="overflow-hidden">
                <h3 className="font-semibold text-sm truncate">{profile.full_name}</h3>
                <span className="text-[10px] opacity-60 truncate block">{profile.email}</span>
              </div>
            </div>
          )}

          {/* Portfolio Switcher Dropdown */}
          {(!collapsed || isMobile) && (
            <div className="mt-4 px-1 space-y-1.5">
              <label className="text-[9px] opacity-50 block font-bold uppercase tracking-wider text-start">
                {language === 'ar' ? 'المحفظة النشطة:' : 'Active Portfolio:'}
              </label>
              <select
                value={activePortfolio}
                onChange={(e) => {
                  if (e.target.value === 'NEW') {
                    const name = prompt(language === 'ar' ? 'أدخل اسم المحفظة الجديدة (بالأحرف أو الأرقام):' : 'Enter name for the new portfolio:');
                    if (name) addPortfolio(name);
                  } else {
                    setActivePortfolio(e.target.value);
                  }
                }}
                className={`w-full p-2 rounded-xl border text-[11px] font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer
                  ${theme === 'dark' ? 'bg-slate-950 border-slate-850 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'}`}
              >
                {portfolios.map(port => (
                  <option key={port} value={port}>
                    💼 {port === 'default' ? (language === 'ar' ? 'المحفظة الافتراضية' : 'Default Portfolio') : port.toUpperCase()}
                  </option>
                ))}
                <option value="NEW" className="text-emerald-500 font-extrabold">
                  ➕ {language === 'ar' ? 'إضافة محفظة جديدة...' : 'Add New Portfolio...'}
                </option>
              </select>
            </div>
          )}

          {/* Navigation Links */}
          <nav className="mt-6 flex flex-col gap-1.5 overflow-y-auto max-h-[calc(100vh-270px)] pr-2 pl-3">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabClick(item.id)}
                  className={`w-full flex items-center justify-start gap-3.5 px-3.5 py-3 rounded-xl text-sm font-medium transition-all group relative
                    ${isActive 
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/20' 
                      : theme === 'dark' 
                        ? 'hover:bg-slate-900 text-slate-400 hover:text-slate-200' 
                        : 'hover:bg-slate-50 text-slate-600 hover:text-slate-900'}`}
                >
                  <Icon className={`w-5 h-5 transition-transform group-hover:scale-105 ${isActive ? 'text-white' : 'text-emerald-500/80 group-hover:text-emerald-400'}`} />
                  {(!collapsed || isMobile) && <span>{item.label}</span>}
                  
                  {/* Tooltip for collapsed desktop */}
                  {collapsed && !isMobile && (
                    <div className={`absolute ${dir === 'rtl' ? 'right-full mr-2' : 'left-full ml-2'} px-3 py-1.5 rounded-lg text-xs bg-slate-900 text-white opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 whitespace-nowrap shadow-xl z-50`}>
                      {item.label}
                    </div>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer controls */}
        <div className="flex flex-col gap-2 border-t border-slate-800/10 pt-4">
          {/* Quick toggle controls (Theme & Lang) */}
          {(!collapsed || isMobile) ? (
            <div className="flex items-center justify-between px-2 mb-2">
              <button 
                onClick={toggleTheme} 
                className={`p-2 rounded-xl border flex items-center justify-center hover:scale-105 transition-transform ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'}`}
                title="Toggle Theme"
              >
                {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
              </button>
              
              <button 
                onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
                className={`p-2 rounded-xl border flex items-center justify-center hover:scale-105 transition-transform ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'}`}
                title="Change Language"
              >
                <Languages className="w-4 h-4 text-emerald-500" />
                <span className="text-xs font-semibold ml-1.5 mr-1.5">
                  {language === 'ar' ? 'EN' : 'عربي'}
                </span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 mb-2">
              <button onClick={toggleTheme} className="p-2 rounded-xl hover:bg-slate-950 text-slate-400">
                {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-700" />}
              </button>
              <button onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')} className="p-2 rounded-xl hover:bg-slate-950 text-slate-400">
                <Languages className="w-5 h-5 text-emerald-500" />
              </button>
            </div>
          )}

          <button
            onClick={() => signOut()}
            className={`w-full flex items-center justify-start gap-3.5 px-3.5 py-3 rounded-xl text-sm font-medium transition-all group
              ${theme === 'dark' 
                ? 'hover:bg-rose-950/30 text-slate-400' 
                : 'hover:bg-rose-50 text-slate-600'}`}
          >
            <LogOut className="w-5 h-5 text-rose-500/80 group-hover:text-rose-500" />
            {(!collapsed || isMobile) && <span>{t('logout')}</span>}
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Mobile top bar / header */}
      <div className={`lg:hidden fixed top-0 left-0 right-0 z-20 h-16 border-b flex items-center justify-between px-4 backdrop-blur-md
        ${theme === 'dark' ? 'bg-slate-950/80 border-slate-800 text-slate-200' : 'bg-white/80 border-slate-200 text-slate-800'}`}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <ShieldAlert className="w-5 h-5 text-white" />
          </div>
          <h1 className="font-bold text-base leading-tight bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
            {t('appName')}
          </h1>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Mobile Direct Language Toggle */}
          <button 
            onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
            className={`p-2 rounded-xl border flex items-center justify-center gap-1 text-xs font-semibold hover:scale-105 active:scale-95 transition-transform cursor-pointer
              ${theme === 'dark' ? 'bg-slate-900 border-slate-800 text-emerald-400' : 'bg-slate-50 border-slate-200 text-emerald-600'}`}
            title="Change Language"
          >
            <Languages className="w-4.5 h-4.5" />
            <span>{language === 'ar' ? 'EN' : 'AR'}</span>
          </button>

          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-lg hover:bg-slate-500/10 text-slate-400"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Desktop Sidebar Container */}
      <aside className={navClass}>

        {sidebarContent(false)}
      </aside>

      {/* Mobile Drawer (with backdrop overlay) */}
      <div className={mobileNavClass}>
        {/* Overlay backdrop */}
        <div 
          onClick={() => setMobileOpen(false)} 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity duration-300"
        />
        {/* Drawer container */}
        <div className={`relative z-50 h-full w-64 shadow-2xl transition-all duration-300 ${dir === 'rtl' ? 'mr-auto' : 'ml-auto'}`}>
          {sidebarContent(true)}
        </div>
      </div>
    </>
  );
};
