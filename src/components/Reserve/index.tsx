import React, { useState } from 'react';
import { useTranslation } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { EmergencyReserve } from '../../types';
import { formatCurrency, formatPercent } from '../../utils/format';
import { Plus, Edit2, Trash2, X, Sparkles, ShieldCheck, ShieldAlert, HeartHandshake, Info } from 'lucide-react';

interface ReserveProps {
  reserves: EmergencyReserve[];
  essentialExpenses: number;
  onAdd: (reserve: Omit<EmergencyReserve, 'id' | 'created_at'>) => Promise<void>;
  onEdit: (id: string, updates: Partial<EmergencyReserve>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export const Reserve: React.FC<ReserveProps> = ({ 
  reserves, essentialExpenses, onAdd, onEdit, onDelete 
}) => {
  const { t, language, dir } = useTranslation();
  const { theme } = useTheme();
  const { profile } = useAuth();
  
  const baseCurrency = profile?.main_currency || 'USD';
  const isAr = language === 'ar';

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('EGP');
  const [location, setLocation] = useState('');
  const [isLiquid, setIsLiquid] = useState(true);
  const [notes, setNotes] = useState('');

  // Target Reserve configurations (Users can override or we default to 6 months of essential expenses)
  const defaultTargetMonths = 6;
  const recommendedTarget = essentialExpenses * defaultTargetMonths; // In local base currency

  // Calculations
  const exchangeRates = { USD: 1.0, EGP: 48.0, OMR: 0.385, SAR: 3.75, AED: 3.67 };
  const convertToMain = (amt: number, cur: string) => {
    const rateFrom = exchangeRates[cur as keyof typeof exchangeRates] || 1;
    const rateTo = exchangeRates[baseCurrency as keyof typeof exchangeRates] || 1;
    return (amt / rateFrom) * rateTo;
  };

  const totalReserve = reserves
    .filter(r => r.is_liquid)
    .reduce((sum, r) => sum + convertToMain(r.amount, r.currency), 0);

  const monthsCovered = essentialExpenses > 0 ? totalReserve / essentialExpenses : 0;
  const diffFromTarget = totalReserve - recommendedTarget;

  // Status Evaluation
  const getReserveStatus = (m: number) => {
    if (m < 1) return { key: 'reserveStatusCritical', color: 'text-rose-500 bg-rose-500/10 border-rose-500/20' };
    if (m < 3) return { key: 'reserveStatusHighRisk', color: 'text-orange-500 bg-orange-500/10 border-orange-500/20' };
    if (m < 6) return { key: 'reserveStatusAcceptable', color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' };
    if (m < 12) return { key: 'reserveStatusGood', color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' };
    return { key: 'reserveStatusExcellent', color: 'text-teal-500 bg-teal-500/10 border-teal-500/20' };
  };

  const statusInfo = getReserveStatus(monthsCovered);
  const progressPercent = recommendedTarget > 0 ? Math.min(100, (totalReserve / recommendedTarget) * 100) : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !amount) return;

    const parsedAmount = parseFloat(amount);

    const data = {
      user_id: profile?.id || 'guest-id',
      name,
      amount: parsedAmount,
      currency,
      location: location || undefined,
      is_liquid: isLiquid,
      notes: notes || undefined,
    };

    if (editingId) {
      await onEdit(editingId, data);
      setEditingId(null);
    } else {
      await onAdd(data);
      setShowAddForm(false);
    }

    resetForm();
  };

  const startEdit = (res: EmergencyReserve) => {
    setEditingId(res.id);
    setName(res.name);
    setAmount(String(res.amount));
    setCurrency(res.currency);
    setLocation(res.location || '');
    setIsLiquid(res.is_liquid);
    setNotes(res.notes || '');
    setShowAddForm(true);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setShowAddForm(false);
    resetForm();
  };

  const resetForm = () => {
    setName('');
    setAmount('');
    setCurrency('EGP');
    setLocation('');
    setIsLiquid(true);
    setNotes('');
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">{t('reserve')}</h2>
          <span className="text-xs opacity-60">
            {language === 'ar' ? 'قم ببناء درع حماية كاش لتغطية النفقات في حالات الطوارئ أو الأزمات المفاجئة' : 'Build a cash buffer to cover unexpected expenses or job losses'}
          </span>
        </div>
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:scale-105 active:scale-95 text-white text-xs font-bold shadow-lg shadow-emerald-500/10 transition-all cursor-pointer"
          >
            <Plus className="w-4.5 h-4.5" />
            <span>{t('add')}</span>
          </button>
        )}
      </div>

      {/* Main Metric & Recommendation Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Core Status Card */}
        <div className={`p-6 rounded-3xl border shadow-lg lg:col-span-2 flex flex-col justify-between
          ${theme === 'dark' ? 'bg-slate-900/40 border-slate-800/80' : 'bg-white border-slate-200'}`}
        >
          <div className="space-y-4">
            <h3 className="font-bold text-base flex items-center gap-2">
              <ShieldCheck className="w-5.5 h-5.5 text-emerald-500" />
              <span>{t('reserveTitle')}</span>
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-[10px] opacity-60 font-semibold block">{isAr ? 'قيمة الاحتياطي المتوفرة' : 'Current Reserve Value'}</span>
                <span className="text-2xl font-black text-emerald-500">{formatCurrency(totalReserve, baseCurrency, language)}</span>
              </div>
              <div>
                <span className="text-[10px] opacity-60 font-semibold block">{isAr ? 'أشهر التغطية المتوفرة' : 'Coverage Months'}</span>
                <span className="text-2xl font-black text-sky-500">{monthsCovered.toFixed(1)} {t('months')}</span>
              </div>
            </div>

            <div className="space-y-1.5 text-xs font-semibold pt-2">
              <div className="flex justify-between">
                <span>{isAr ? 'التقدم نحو الهدف المستهدف' : 'Progress towards target'}</span>
                <span className="font-extrabold">{progressPercent.toFixed(0)}%</span>
              </div>
              <div className={`w-full h-3 rounded-full ${theme === 'dark' ? 'bg-slate-950' : 'bg-slate-100'}`}>
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-1000"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>

          <div className={`mt-6 p-4 rounded-2xl border text-xs font-semibold flex items-center gap-2.5 ${statusInfo.color}`}>
            <ShieldAlert className="w-5 h-5 shrink-0" />
            <p>{t(statusInfo.key)}</p>
          </div>
        </div>

        {/* Dynamic Targets Summary */}
        <div className={`p-6 rounded-3xl border shadow-lg flex flex-col justify-between
          ${theme === 'dark' ? 'bg-slate-900/40 border-slate-800/80' : 'bg-white border-slate-200'}`}
        >
          <div className="space-y-4 text-xs font-semibold">
            <h4 className="font-bold text-sm text-slate-400 mb-3">{isAr ? 'المستهدفات والتوصيات' : 'Target & Thresholds'}</h4>
            
            <div className="pb-3.5 border-b border-slate-800/10">
              <span className="opacity-60 block mb-0.5">{t('reserveRecommendation')}</span>
              <span className="font-extrabold text-sm text-amber-500">{formatCurrency(recommendedTarget, baseCurrency, language)}</span>
            </div>

            <div className="pb-3.5 border-b border-slate-800/10">
              <span className="opacity-60 block mb-0.5">{t('reserveDifference')}</span>
              <span className={`font-extrabold text-sm ${diffFromTarget >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                {diffFromTarget >= 0 ? '+' : ''}{formatCurrency(diffFromTarget, baseCurrency, language)}
              </span>
            </div>

            <div>
              <span className="opacity-60 block mb-0.5">{isAr ? 'النفقات الأساسية الشهرية المعتمدة' : 'Essential Monthly Expenses'}</span>
              <span className="font-bold text-slate-400">{formatCurrency(essentialExpenses, baseCurrency, language)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      {showAddForm && (
        <div className={`p-6 rounded-3xl border shadow-lg
          ${theme === 'dark' ? 'bg-slate-900/40 border-slate-800/80' : 'bg-white border-slate-200/80 shadow-sm'}`}
        >
          <div className="flex items-center justify-between mb-6 pb-3 border-b border-slate-800/10">
            <h3 className="font-bold text-sm flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-500" />
              <span>{editingId ? t('edit') : t('add')}</span>
            </h3>
            <button onClick={cancelEdit} className="p-1.5 rounded-lg hover:bg-slate-500/10 text-slate-400">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 text-xs">
            {/* Name */}
            <div className="space-y-1.5">
              <label className="font-bold opacity-80">{t('name')}</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={isAr ? 'صندوق طوارئ البنك' : 'Bank Emergency Reserve'}
                className={`w-full p-2.5 rounded-xl border focus:ring-1 focus:ring-emerald-500 focus:outline-none
                  ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
              />
            </div>

            {/* Amount */}
            <div className="space-y-1.5">
              <label className="font-bold opacity-80">{t('amount')}</label>
              <input
                type="number"
                required
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="50000"
                className={`w-full p-2.5 rounded-xl border focus:ring-1 focus:ring-emerald-500 focus:outline-none
                  ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
              />
            </div>

            {/* Currency */}
            <div className="space-y-1.5">
              <label className="font-bold opacity-80">{t('currency')}</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className={`w-full p-2.5 rounded-xl border focus:ring-1 focus:ring-emerald-500 focus:outline-none
                  ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
              >
                {['EGP', 'USD', 'OMR', 'SAR', 'AED'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Location */}
            <div className="space-y-1.5">
              <label className="font-bold opacity-80">{t('reserveLocation')}</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="البنك العربي الأفريقي"
                className={`w-full p-2.5 rounded-xl border focus:ring-1 focus:ring-emerald-500 focus:outline-none
                  ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
              />
            </div>

            {/* Is Liquid checkbox */}
            <div className="flex items-center gap-2.5 pt-6">
              <input
                type="checkbox"
                id="isLiquid"
                checked={isLiquid}
                onChange={(e) => setIsLiquid(e.target.checked)}
                className="w-4.5 h-4.5 rounded text-emerald-500 focus:ring-emerald-500"
              />
              <label htmlFor="isLiquid" className="font-bold cursor-pointer opacity-80">
                {t('reserveIsLiquid')}
              </label>
            </div>

            {/* Notes */}
            <div className="space-y-1.5 lg:col-span-3">
              <label className="font-bold opacity-80">{t('notes')}</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={isAr ? 'ملاحظات عن الصندوق...' : 'Details...'}
                className={`w-full p-2.5 rounded-xl border focus:ring-1 focus:ring-emerald-500 focus:outline-none h-18 resize-none
                  ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
              />
            </div>

            {/* Actions */}
            <div className="lg:col-span-3 flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={cancelEdit}
                className={`px-4 py-2 rounded-xl font-semibold border transition-all cursor-pointer
                  ${theme === 'dark' 
                    ? 'bg-slate-900 border-slate-800 hover:bg-slate-950' 
                    : 'bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-700'}`}
              >
                {t('cancel')}
              </button>
              
              <button
                type="submit"
                className="px-5 py-2 rounded-xl font-bold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-md shadow-emerald-500/10 cursor-pointer"
              >
                {editingId ? t('save') : t('add')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Reserves List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reserves.map((res) => {
          const equiv = convertToMain(res.amount, res.currency);

          return (
            <div
              key={res.id}
              className={`p-5 rounded-3xl border shadow-lg flex flex-col justify-between transition-all duration-300 hover:shadow-xl
                ${theme === 'dark' ? 'bg-slate-900/40 border-slate-800/80' : 'bg-white border-slate-200'}`}
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase
                      ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200'}`}
                    >
                      {res.is_liquid ? t('high') : t('low')}
                    </span>
                    <h4 className="text-sm font-bold mt-1.5">{res.name}</h4>
                    {res.location && (
                      <span className="text-[10px] opacity-60 block">{res.location}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => startEdit(res)}
                      className="p-1 rounded-lg hover:bg-emerald-500/10 text-emerald-500 cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDelete(res.id)}
                      className="p-1 rounded-lg hover:bg-rose-500/10 text-rose-500 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="mt-4 space-y-1">
                  <span className="text-[10px] opacity-60 font-semibold block">{t('amount')}</span>
                  <span className="text-xl font-black block">{formatCurrency(res.amount, res.currency, language)}</span>
                  {res.currency !== baseCurrency && (
                    <span className="text-[10px] text-emerald-500 block">
                      ≈ {formatCurrency(equiv, baseCurrency, language)}
                    </span>
                  )}
                </div>
              </div>

              {res.notes && (
                <div className="mt-4 border-t border-slate-800/10 pt-2 text-[10px] opacity-75">
                  <p className="line-clamp-2">{res.notes}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
