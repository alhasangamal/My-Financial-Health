import React from 'react';
import { useTranslation } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { CurrencyCode } from '../../types';
import { Sun, Moon, Coins, Languages, Calendar, Cloud, CloudOff, HardDrive } from 'lucide-react';

type SyncStatus = 'connected' | 'degraded' | 'local';

interface HeaderProps {
  activeTab: string;
  currentCurrency: CurrencyCode;
  onCurrencyChange: (currency: CurrencyCode) => void;
  selectedMonth: number;
  selectedYear: number;
  onMonthChange: (month: number) => void;
  onYearChange: (year: number) => void;
  syncStatus: SyncStatus;
}

const MONTHS = [
  { value: 1, en: 'January', ar: 'يناير' },
  { value: 2, en: 'February', ar: 'فبراير' },
  { value: 3, en: 'March', ar: 'مارس' },
  { value: 4, en: 'April', ar: 'أبريل' },
  { value: 5, en: 'May', ar: 'مايو' },
  { value: 6, en: 'June', ar: 'يونيو' },
  { value: 7, en: 'July', ar: 'يوليو' },
  { value: 8, en: 'August', ar: 'أغسطس' },
  { value: 9, en: 'September', ar: 'سبتمبر' },
  { value: 10, en: 'October', ar: 'أكتوبر' },
  { value: 11, en: 'November', ar: 'نوفمبر' },
  { value: 12, en: 'December', ar: 'ديسمبر' }
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 7 }, (_, i) => currentYear - 3 + i);

const SYNC_CONFIG: Record<SyncStatus, { color: string; pulse: boolean; labelAr: string; labelEn: string; Icon: React.FC<any> }> = {
  connected: { color: 'bg-emerald-400', pulse: true, labelAr: 'متصل بالسحابة', labelEn: 'Cloud Synced', Icon: Cloud },
  degraded: { color: 'bg-amber-400', pulse: true, labelAr: 'حفظ محلي مؤقت', labelEn: 'Local Fallback', Icon: CloudOff },
  local: { color: 'bg-slate-400', pulse: false, labelAr: 'وضع الضيف (محلي)', labelEn: 'Guest Mode', Icon: HardDrive },
};

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  currentCurrency,
  onCurrencyChange,
  selectedMonth,
  selectedYear,
  onMonthChange,
  onYearChange,
  syncStatus,
}) => {
  const { t, language, setLanguage, dir } = useTranslation();
  const { theme, toggleTheme } = useTheme();

  const isAr = language === 'ar';

  // Map of active tab titles
  const tabTitles: Record<string, { ar: string; en: string }> = {
    dashboard: { ar: 'لوحة التحكم الجارية', en: 'Financial Dashboard' },
    income: { ar: 'إدارة مصادر الدخل', en: 'Income Management' },
    expenses: { ar: 'المصاريف والنفقات الشهرية', en: 'Expenses Tracker' },
    debts: { ar: 'الأقساط والالتزامات والديون', en: 'Installments & Debts' },
    assets: { ar: 'الأصول والمدخرات العقارية', en: 'Assets & Net Worth' },
    reserve: { ar: 'صندوق الطوارئ الاحتياطي', en: 'Emergency Reserves' },
    goals: { ar: 'الأهداف المالية والمدخرات', en: 'Financial Goals' },
    scenarios: { ar: 'محاكي السيناريوهات المالية', en: 'Scenario Simulator' },
    'ai-forecast': { ar: 'التحليلات والتوقعات بالذكاء الاصطناعي', en: 'AI Predictive Forecasts' },
    reports: { ar: 'التقارير المالية المطبوعة', en: 'Financial Reports' },
    settings: { ar: 'إعدادات الحساب والنظام', en: 'System Settings' },
  };

  const currentTitle = tabTitles[activeTab] ? (isAr ? tabTitles[activeTab].ar : tabTitles[activeTab].en) : '';

  return (
    <header className={`mb-6 p-4 rounded-3xl border shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 transition-all duration-300
      ${theme === 'dark' 
        ? 'bg-slate-900/30 border-slate-800/80 shadow-slate-950/20 backdrop-blur-md' 
        : 'bg-white/80 border-slate-200/60 shadow-slate-200/10 backdrop-blur-md'}`}
    >
      {/* Page Title */}
      <div className="text-center sm:text-start">
        <h1 className="text-lg font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
          {currentTitle}
        </h1>
        <span className="text-[10px] opacity-60 font-medium block mt-0.5">
          {isAr ? 'صحتك المالية تحت السيطرة دائماً' : 'Your financial health is always under control'}
        </span>
      </div>

      {/* Header Actions (Sync Status, Date, Currency, Theme, Language) */}
      <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-center sm:justify-end text-xs">
        {/* Sync Status Indicator */}
        {(() => {
          const cfg = SYNC_CONFIG[syncStatus];
          const SyncIcon = cfg.Icon;
          return (
            <div className="flex items-center gap-1.5 group relative cursor-default" title={isAr ? cfg.labelAr : cfg.labelEn}>
              <div className="relative">
                <span className={`block w-2.5 h-2.5 rounded-full ${cfg.color} ${cfg.pulse ? 'animate-pulse' : ''}`} />
              </div>
              <SyncIcon className={`w-3.5 h-3.5 ${syncStatus === 'connected' ? 'text-emerald-500' : syncStatus === 'degraded' ? 'text-amber-500' : 'text-slate-400'}`} />
              <span className={`text-[10px] font-semibold ${syncStatus === 'connected' ? 'text-emerald-500' : syncStatus === 'degraded' ? 'text-amber-500' : 'text-slate-400'}`}>
                {isAr ? cfg.labelAr : cfg.labelEn}
              </span>
            </div>
          );
        })()}

        {/* Divider */}
        <div className="h-6 w-px bg-slate-800/10 dark:bg-slate-800/60" />
        {/* Month/Year Selector */}
        <div className="flex items-center gap-1.5">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/10">
            <Calendar className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-1">
            <select
              value={selectedMonth}
              onChange={(e) => onMonthChange(Number(e.target.value))}
              className={`px-2 py-1.5 rounded-xl border font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer
                ${theme === 'dark' 
                  ? 'bg-slate-900 border-slate-800 text-slate-200 focus:border-emerald-500' 
                  : 'bg-slate-50 border-slate-200 text-slate-700 focus:border-emerald-500'}`}
            >
              {MONTHS.map(m => (
                <option key={m.value} value={m.value}>{isAr ? m.ar : m.en}</option>
              ))}
            </select>

            <select
              value={selectedYear}
              onChange={(e) => onYearChange(Number(e.target.value))}
              className={`px-2 py-1.5 rounded-xl border font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer
                ${theme === 'dark' 
                  ? 'bg-slate-900 border-slate-800 text-slate-200 focus:border-emerald-500' 
                  : 'bg-slate-50 border-slate-200 text-slate-700 focus:border-emerald-500'}`}
            >
              {YEARS.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Divider */}
        <div className="h-6 w-px bg-slate-800/10 dark:bg-slate-800/60" />

        {/* Currency Switcher */}
        <div className="flex items-center gap-1.5">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/10">
            <Coins className="w-4 h-4" />
          </div>
          <select
            value={currentCurrency}
            onChange={(e) => onCurrencyChange(e.target.value)}
            className={`px-2.5 py-1.5 rounded-xl border font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer
              ${theme === 'dark' 
                ? 'bg-slate-900 border-slate-800 text-slate-200 focus:border-emerald-500' 
                : 'bg-slate-50 border-slate-200 text-slate-700 focus:border-emerald-500'}`}
          >
            <option value="EGP">EGP (ج.م)</option>
            <option value="USD">USD ($)</option>
            <option value="OMR">OMR (ر.ع.)</option>
            <option value="SAR">SAR (ر.س)</option>
            <option value="AED">AED (د.إ)</option>
          </select>
        </div>

        {/* Divider */}
        <div className="h-6 w-px bg-slate-800/10 dark:bg-slate-800/60" />

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className={`p-2 rounded-xl border flex items-center justify-center hover:scale-105 active:scale-95 transition-transform cursor-pointer
            ${theme === 'dark' 
              ? 'bg-slate-900 border-slate-800 text-amber-400' 
              : 'bg-slate-50 border-slate-200 text-slate-600'}`}
          title={isAr ? 'تبديل المظهر' : 'Toggle Theme'}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Language Toggle */}
        <button
          onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
          className={`p-2 rounded-xl border flex items-center justify-center gap-1 font-semibold hover:scale-105 active:scale-95 transition-transform cursor-pointer
            ${theme === 'dark' 
              ? 'bg-slate-900 border-slate-800 text-emerald-400' 
              : 'bg-slate-50 border-slate-200 text-emerald-600'}`}
          title={isAr ? 'Switch to English' : 'تحويل للعربية'}
        >
          <Languages className="w-4 h-4" />
          <span className="text-[10px] uppercase">{language === 'ar' ? 'EN' : 'AR'}</span>
        </button>
      </div>
    </header>
  );
};
