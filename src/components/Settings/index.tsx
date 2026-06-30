import React, { useState } from 'react';
import { useTranslation } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { getExchangeRates, saveExchangeRates } from '../../services/db';
import { Sparkles, Save, ShieldAlert, Globe, Coins, ShieldCheck, Database, Info } from 'lucide-react';
import { DEFAULT_EXCHANGE_RATES } from '../../utils/calculations';

interface SettingsProps {
  onRefreshData: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ onRefreshData }) => {
  const { t, language, setLanguage, dir } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const { profile, updateProfile, isGuest } = useAuth();

  // Profile Form States
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [email, setEmail] = useState(profile?.email || '');
  const [baseCurrency, setBaseCurrency] = useState(profile?.main_currency || 'USD');
  const [whatsappNumber, setWhatsappNumber] = useState(profile?.whatsapp_number || '');
  const [whatsappApiUrl, setWhatsappApiUrl] = useState(() => localStorage.getItem('whatsapp_api_url') || '');
  const [whatsappApiToken, setWhatsappApiToken] = useState(() => localStorage.getItem('whatsapp_api_token') || '');

  // Exchange Rates State
  const [rates, setRates] = useState<Record<string, string>>(() => {
    const currentRates = getExchangeRates();
    const formatted: Record<string, string> = {};
    Object.entries(currentRates).forEach(([k, v]) => {
      formatted[k] = String(v);
    });
    return formatted;
  });

  // Supabase Custom Config Keys
  const [supabaseUrl, setSupabaseUrl] = useState(() => localStorage.getItem('supabase_custom_url') || '');
  const [supabaseKey, setSupabaseKey] = useState(() => localStorage.getItem('supabase_custom_key') || '');
  
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg(null);
    setLoading(true);

    try {
      // 1. Update Profile (Name & Currency & Lang)
      await updateProfile({
        full_name: fullName,
        email: email,
        main_currency: baseCurrency,
        language: language,
        whatsapp_number: whatsappNumber,
      });

      // 2. Save Custom Exchange Rates
      const parsedRates: Record<string, number> = {};
      Object.entries(rates).forEach(([k, v]) => {
        parsedRates[k] = parseFloat(v) || DEFAULT_EXCHANGE_RATES[k] || 1.0;
      });
      saveExchangeRates(parsedRates);

      // Save Automated WhatsApp API Configuration
      localStorage.setItem('whatsapp_api_url', whatsappApiUrl.trim());
      localStorage.setItem('whatsapp_api_token', whatsappApiToken.trim());

      // 3. Save Supabase credentials to LocalStorage
      const oldUrl = localStorage.getItem('supabase_custom_url') || '';
      const oldKey = localStorage.getItem('supabase_custom_key') || '';
      
      if (supabaseUrl.trim() !== '' && supabaseKey.trim() !== '') {
        localStorage.setItem('supabase_custom_url', supabaseUrl.trim());
        localStorage.setItem('supabase_custom_key', supabaseKey.trim());
        
        // Expose credentials to Vite variables by mapping custom fields
        localStorage.setItem('is_supabase_custom_configured', 'true');
      } else {
        localStorage.removeItem('supabase_custom_url');
        localStorage.removeItem('supabase_custom_key');
        localStorage.removeItem('is_supabase_custom_configured');
      }

      setSuccessMsg(
        language === 'ar'
          ? 'تم حفظ الإعدادات بنجاح!'
          : 'Settings saved successfully!'
      );

      // If Supabase keys changed, trigger a reload to reset client connection
      if (oldUrl !== supabaseUrl.trim() || oldKey !== supabaseKey.trim()) {
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      }

      onRefreshData();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRateChange = (currencyCode: string, value: string) => {
    setRates(prev => ({
      ...prev,
      [currencyCode]: value
    }));
  };

  const isAr = language === 'ar';

  return (
    <div className="space-y-6 text-xs font-semibold">
      {/* Title */}
      <div>
        <h2 className="text-xl font-bold">{t('settingTitle')}</h2>
        <span className="text-xs opacity-60">
          {isAr ? 'اضبط تفضيلات اللغة، العملة الافتراضية، وربط قواعد البيانات' : 'Configure base metrics, manually alter conversion rates and coordinate data synchronizations'}
        </span>
      </div>

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
          {successMsg} {supabaseUrl.trim() !== '' && (isAr ? 'سيتم إعادة تحميل النظام لتفعيل ربط Supabase الجديد.' : 'System will reload to configure new Supabase integrations.')}
        </div>
      )}

      <form onSubmit={handleSaveSettings} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile and System Preferences */}
        <div className={`p-6 rounded-3xl border shadow-lg space-y-5 lg:col-span-2
          ${theme === 'dark' ? 'bg-slate-900/40 border-slate-800/80' : 'bg-white border-slate-200'}`}
        >
          <h3 className="font-bold text-sm border-b border-slate-800/10 pb-3 flex items-center gap-2">
            <Globe className="w-5 h-5 text-emerald-500" />
            <span>{isAr ? 'التفضيلات الشخصية والنظام' : 'Personal & System Preferences'}</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Full Name */}
            <div className="space-y-1.5">
              <label className="opacity-80">{t('profileName')}</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className={`w-full p-2.5 rounded-xl border focus:ring-1 focus:ring-emerald-500 focus:outline-none
                  ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
              />
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="opacity-80">{t('profileEmail')}</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full p-2.5 rounded-xl border focus:ring-1 focus:ring-emerald-500 focus:outline-none
                  ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
              />
            </div>

            {/* Base Currency */}
            <div className="space-y-1.5">
              <label className="opacity-80">{t('currencySetting')}</label>
              <select
                value={baseCurrency}
                onChange={(e) => setBaseCurrency(e.target.value)}
                className={`w-full p-2.5 rounded-xl border focus:ring-1 focus:ring-emerald-500 focus:outline-none
                  ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-200 font-bold' : 'bg-slate-50 border-slate-200 text-slate-700 font-bold'}`}
              >
                {['EGP', 'USD', 'OMR', 'SAR', 'AED'].map(c => (
                  <option key={c} value={c}>{t(`currency_${c}`)}</option>
                ))}
              </select>
            </div>

            {/* Language Selection */}
            <div className="space-y-1.5">
              <label className="opacity-80">{t('languageSetting')}</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as any)}
                className={`w-full p-2.5 rounded-xl border focus:ring-1 focus:ring-emerald-500 focus:outline-none
                  ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-700'}`}
              >
                <option value="ar">العربية (RTL)</option>
                <option value="en">English (LTR)</option>
              </select>
            </div>

            {/* WhatsApp Phone Number */}
            <div className="space-y-1.5">
              <label className="opacity-80">{isAr ? 'رقم الواتساب المستلم (مثل 2010...)' : 'Recipient WhatsApp (e.g. 2010...)'}</label>
              <input
                type="text"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                placeholder="201012345678"
                className={`w-full p-2.5 rounded-xl border focus:ring-1 focus:ring-emerald-500 focus:outline-none
                  ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
              />
            </div>

            {/* WhatsApp Automated API URL */}
            <div className="space-y-1.5">
              <label className="opacity-80">{isAr ? 'رابط بوابة الإرسال التلقائي (WhatsApp API Webhook URL)' : 'WhatsApp Automated Gateway URL (API Webhook)'}</label>
              <input
                type="text"
                value={whatsappApiUrl}
                onChange={(e) => setWhatsappApiUrl(e.target.value)}
                placeholder="https://api.green-api.com/waInstance/.../sendMessage/..."
                className={`w-full p-2.5 rounded-xl border focus:ring-1 focus:ring-emerald-500 focus:outline-none
                  ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
              />
            </div>

            {/* WhatsApp Automated API Token */}
            <div className="space-y-1.5">
              <label className="opacity-80">{isAr ? 'رمز مصادقة البوابة (API Secret / Token)' : 'Gateway API Secret Token'}</label>
              <input
                type="password"
                value={whatsappApiToken}
                onChange={(e) => setWhatsappApiToken(e.target.value)}
                placeholder="••••••••••••••••••••••••"
                className={`w-full p-2.5 rounded-xl border focus:ring-1 focus:ring-emerald-500 focus:outline-none
                  ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
              />
            </div>
          </div>

          {/* Supabase connection details */}
          <div className="pt-6 border-t border-slate-800/10 space-y-4">
            <h4 className="font-bold text-xs flex items-center gap-2">
              <Database className="w-4.5 h-4.5 text-emerald-500" />
              <span>{t('supabaseSetting')}</span>
            </h4>
            
            <div className={`p-4.5 rounded-2xl border flex gap-3 items-start
              ${theme === 'dark' ? 'bg-slate-950 border-slate-900 text-slate-400' : 'bg-slate-50 border-slate-100 text-slate-600'}`}
            >
              <Info className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                {t('supabaseHelp')}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="opacity-80">{t('supabaseUrl')}</label>
                <input
                  type="text"
                  value={supabaseUrl}
                  onChange={(e) => setSupabaseUrl(e.target.value)}
                  placeholder="https://xyz.supabase.co"
                  className={`w-full p-2.5 rounded-xl border focus:ring-1 focus:ring-emerald-500 focus:outline-none
                    ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                />
              </div>
              <div className="space-y-1.5">
                <label className="opacity-80">{t('supabaseKey')}</label>
                <input
                  type="password"
                  value={supabaseKey}
                  onChange={(e) => setSupabaseKey(e.target.value)}
                  placeholder="eyJhbGciOi..."
                  className={`w-full p-2.5 rounded-xl border focus:ring-1 focus:ring-emerald-500 focus:outline-none
                    ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Currency Conversion Table */}
        <div className={`p-6 rounded-3xl border shadow-lg flex flex-col justify-between
          ${theme === 'dark' ? 'bg-slate-900/40 border-slate-800/80' : 'bg-white border-slate-200'}`}
        >
          <div className="space-y-4">
            <h3 className="font-bold text-sm border-b border-slate-800/10 pb-3 flex items-center gap-2">
              <Coins className="w-5 h-5 text-emerald-500" />
              <span>{isAr ? 'أسعار الصرف مقابل الدولار' : 'Exchange Rates vs USD'}</span>
            </h3>

            <div className={`p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 leading-normal flex gap-2 items-start`}>
              <ShieldAlert className="w-4.5 h-4.5 shrink-0 mt-0.5" />
              <p className="text-[10px]">{t('manualExchangeWarning')}</p>
            </div>

            {/* Input list */}
            <div className="space-y-3.5 pt-2">
              {['EGP', 'OMR', 'SAR', 'AED'].map(cur => (
                <div key={cur} className="flex items-center justify-between gap-4">
                  <span className="font-bold">{cur}</span>
                  <div className="flex items-center gap-1.5 w-32 shrink-0">
                    <input
                      type="number"
                      step="0.0001"
                      value={rates[cur] || ''}
                      onChange={(e) => handleRateChange(cur, e.target.value)}
                      className={`w-full p-2 rounded-lg border text-center font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500
                        ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-6">
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-1.5 py-3 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
            >
              <Save className="w-5 h-5" />
              <span>{loading ? '...' : t('saveSettings')}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
