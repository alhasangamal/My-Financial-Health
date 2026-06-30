import React, { useState } from 'react';
import { useTranslation } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { IncomeSource } from '../../types';
import { formatCurrency } from '../../utils/format';
import { Plus, Edit2, Trash2, Check, X, ShieldAlert, Sparkles } from 'lucide-react';

interface IncomeProps {
  incomes: IncomeSource[];
  onAdd: (income: Omit<IncomeSource, 'id' | 'created_at'>) => Promise<void>;
  onEdit: (id: string, updates: Partial<IncomeSource>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export const Income: React.FC<IncomeProps> = ({ incomes, onAdd, onEdit, onDelete }) => {
  const { t, language, dir } = useTranslation();
  const { theme } = useTheme();
  const { profile } = useAuth();
  
  const baseCurrency = profile?.main_currency || 'USD';
  const isAr = language === 'ar';

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [type, setType] = useState('inc_salary');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('EGP');
  const [exchangeRate, setExchangeRate] = useState('1.0');
  const [frequency, setFrequency] = useState<'monthly' | 'weekly' | 'annual' | 'one-time'>('monthly');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [isStable, setIsStable] = useState(true);
  const [notes, setNotes] = useState('');

  // Auto adjust exchange rate based on currency selection
  React.useEffect(() => {
    if (currency === baseCurrency) {
      setExchangeRate('1.0');
    } else if (currency === 'USD' && baseCurrency === 'EGP') {
      setExchangeRate('0.0208'); // 1/48
    } else if (currency === 'EGP' && baseCurrency === 'USD') {
      setExchangeRate('48.0'); // 48 EGP = 1 USD
    }
  }, [currency, baseCurrency]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !amount) return;

    const parsedAmount = parseFloat(amount);
    const parsedRate = parseFloat(exchangeRate) || 1.0;

    if (editingId) {
      await onEdit(editingId, {
        name,
        type,
        amount: parsedAmount,
        currency,
        exchange_rate: parsedRate,
        frequency,
        start_date: startDate,
        end_date: endDate || undefined,
        is_stable: isStable,
        notes: notes || undefined,
      });
      setEditingId(null);
    } else {
      await onAdd({
        user_id: profile?.id || 'guest-id',
        name,
        type,
        amount: parsedAmount,
        currency,
        exchange_rate: parsedRate,
        frequency,
        start_date: startDate,
        end_date: endDate || undefined,
        is_stable: isStable,
        notes: notes || undefined,
      });
      setShowAddForm(false);
    }

    resetForm();
  };

  const startEdit = (income: IncomeSource) => {
    setEditingId(income.id);
    setName(income.name);
    setType(income.type);
    setAmount(String(income.amount));
    setCurrency(income.currency);
    setExchangeRate(String(income.exchange_rate));
    setFrequency(income.frequency);
    setStartDate(income.start_date);
    setEndDate(income.end_date || '');
    setIsStable(income.is_stable);
    setNotes(income.notes || '');
    setShowAddForm(true);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setShowAddForm(false);
    resetForm();
  };

  const resetForm = () => {
    setName('');
    setType('inc_salary');
    setAmount('');
    setCurrency('EGP');
    setExchangeRate('1.0');
    setFrequency('monthly');
    setStartDate(new Date().toISOString().split('T')[0]);
    setEndDate('');
    setIsStable(true);
    setNotes('');
  };

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">{t('income')}</h2>
          <span className="text-xs opacity-60">
            {language === 'ar' ? 'أضف وتحكم في جميع مصادر دخلك المالي' : 'Add and manage all your financial income streams'}
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

      {/* Form Container */}
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
                placeholder={isAr ? 'الراتب الأساسي' : 'Primary Salary'}
                className={`w-full p-2.5 rounded-xl border focus:ring-1 focus:ring-emerald-500 focus:outline-none 
                  ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
              />
            </div>

            {/* Type */}
            <div className="space-y-1.5">
              <label className="font-bold opacity-80">{t('type')}</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className={`w-full p-2.5 rounded-xl border focus:ring-1 focus:ring-emerald-500 focus:outline-none
                  ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
              >
                {['inc_salary', 'inc_freelance', 'inc_business', 'inc_rental', 'inc_investment', 'inc_bonus', 'inc_other'].map(k => (
                  <option key={k} value={k}>{t(k)}</option>
                ))}
              </select>
            </div>

            {/* Amount */}
            <div className="space-y-1.5">
              <label className="font-bold opacity-80">{t('amount')}</label>
              <input
                type="number"
                required
                min="0"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="1500"
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

            {/* Exchange Rate (Manually editable) */}
            <div className="space-y-1.5">
              <label className="font-bold opacity-80 flex items-center gap-1.5">
                <span>{t('exchangeRate')}</span>
                <span className="text-[10px] text-emerald-500">({isAr ? 'مقابل العملة الأساسية' : `vs ${baseCurrency}`})</span>
              </label>
              <input
                type="number"
                step="0.00001"
                value={exchangeRate}
                onChange={(e) => setExchangeRate(e.target.value)}
                placeholder="1.0"
                className={`w-full p-2.5 rounded-xl border focus:ring-1 focus:ring-emerald-500 focus:outline-none
                  ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
              />
            </div>

            {/* Frequency */}
            <div className="space-y-1.5">
              <label className="font-bold opacity-80">{t('frequency')}</label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as any)}
                className={`w-full p-2.5 rounded-xl border focus:ring-1 focus:ring-emerald-500 focus:outline-none
                  ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
              >
                {['monthly', 'weekly', 'annual', 'one-time'].map(f => (
                  <option key={f} value={f}>{t(f)}</option>
                ))}
              </select>
            </div>

            {/* Start Date */}
            <div className="space-y-1.5">
              <label className="font-bold opacity-80">{t('startDate')}</label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={`w-full p-2.5 rounded-xl border focus:ring-1 focus:ring-emerald-500 focus:outline-none
                  ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
              />
            </div>

            {/* End Date */}
            <div className="space-y-1.5">
              <label className="font-bold opacity-80">{t('endDate')} ({isAr ? 'اختياري' : 'Optional'})</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={`w-full p-2.5 rounded-xl border focus:ring-1 focus:ring-emerald-500 focus:outline-none
                  ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
              />
            </div>

            {/* Is Stable Toggle */}
            <div className="flex items-center gap-3 pt-6">
              <input
                type="checkbox"
                id="isStable"
                checked={isStable}
                onChange={(e) => setIsStable(e.target.checked)}
                className="w-4.5 h-4.5 rounded text-emerald-500 focus:ring-emerald-500"
              />
              <label htmlFor="isStable" className="font-bold cursor-pointer opacity-80">
                {isAr ? 'الدخل مستقر وثابت دورياً' : 'Stable and periodic income'}
              </label>
            </div>

            {/* Notes */}
            <div className="space-y-1.5 lg:col-span-3">
              <label className="font-bold opacity-80">{t('notes')}</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={isAr ? 'ملاحظات وتفاصيل إضافية...' : 'Any details...'}
                className={`w-full p-2.5 rounded-xl border focus:ring-1 focus:ring-emerald-500 focus:outline-none h-18 resize-none
                  ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
              />
            </div>

            {/* Form actions */}
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

      {/* List of Income Sources Table / Grid */}
      <div className={`rounded-3xl border shadow-lg overflow-hidden
        ${theme === 'dark' ? 'bg-slate-900/40 border-slate-800/80' : 'bg-white border-slate-200 shadow-sm'}`}
      >
        <div className="overflow-x-auto text-xs">
          <table className="w-full text-start border-collapse">
            <thead>
              <tr className={`border-b font-bold text-slate-400 text-start
                ${theme === 'dark' ? 'bg-slate-950/60 border-slate-800/60' : 'bg-slate-50 border-slate-100'}`}
              >
                <th className="p-4 text-start">{t('name')}</th>
                <th className="p-4 text-start">{t('type')}</th>
                <th className="p-4 text-start">{t('frequency')}</th>
                <th className="p-4 text-start">{t('amount')}</th>
                <th className="p-4 text-start">{isAr ? 'العملة الأصلية' : 'Original Currency'}</th>
                <th className="p-4 text-start">{isAr ? 'القيمة المعادلة' : `Equivalent (${baseCurrency})`}</th>
                <th className="p-4 text-start">{t('startDate')}</th>
                <th className="p-4 text-start">{isAr ? 'الحالة' : 'Stability'}</th>
                <th className="p-4 text-center">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/10 font-medium">
              {incomes.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center opacity-60 font-semibold">
                    {isAr ? 'لا توجد أي مصادر دخل مسجلة. أضف دخلك الآن!' : 'No income sources recorded. Add your income now!'}
                  </td>
                </tr>
              ) : (
                incomes.map((inc) => {
                  // Converted value in main currency
                  // Converted = amount / exchange_rate
                  const rate = inc.exchange_rate || 1.0;
                  const equiv = inc.amount / rate;

                  return (
                    <tr key={inc.id} className={`${theme === 'dark' ? 'hover:bg-slate-900/30' : 'hover:bg-slate-50/50'}`}>
                      <td className="p-4 font-bold">{inc.name}</td>
                      <td className="p-4">{t(inc.type)}</td>
                      <td className="p-4">{t(inc.frequency)}</td>
                      <td className="p-4 font-extrabold">{formatCurrency(inc.amount, inc.currency, language)}</td>
                      <td className="p-4 opacity-75">{inc.currency}</td>
                      <td className="p-4 font-extrabold text-emerald-500">
                        {formatCurrency(equiv, baseCurrency, language)}
                      </td>
                      <td className="p-4 opacity-75">{inc.start_date}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border
                          ${inc.is_stable 
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                            : 'bg-amber-500/10 border-amber-500/20 text-amber-400'}`}
                        >
                          {inc.is_stable ? t('stable') : t('variable')}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => startEdit(inc)}
                            className="p-1.5 rounded-lg hover:bg-emerald-500/10 text-emerald-500 cursor-pointer"
                            title={t('edit')}
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          
                          <button
                            onClick={() => onDelete(inc.id)}
                            className="p-1.5 rounded-lg hover:bg-rose-500/10 text-rose-500 cursor-pointer"
                            title={t('delete')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
