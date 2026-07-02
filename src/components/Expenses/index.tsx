import React, { useState } from 'react';
import { useTranslation } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { Expense, ExpenseFrequency } from '../../types';
import { formatCurrency, formatNumber } from '../../utils/format';
import { Plus, Edit2, Trash2, X, Sparkles, Filter, Info, AlertTriangle, Check, ShieldAlert } from 'lucide-react';
import { getExchangeRates } from '../../services/db';

interface ExpensesProps {
  expenses: Expense[];
  onAdd: (expense: Omit<Expense, 'id' | 'created_at'>) => Promise<void>;
  onEdit: (id: string, updates: Partial<Expense>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  selectedMonth: number;
  selectedYear: number;
}

const CATEGORIES = [
  'cat_living', 'cat_food', 'cat_housing', 'cat_electricity', 'cat_water', 'cat_gas', 
  'cat_internet', 'cat_mobile', 'cat_transportation', 'cat_fuel', 'cat_maintenance', 
  'cat_insurance', 'cat_registration', 'cat_medical', 'cat_education', 'cat_family', 
  'cat_entertainment', 'cat_subscriptions', 'cat_travel', 'cat_charity', 'cat_shopping', 'cat_other'
];

const MONTHS_NAMES = [
  { en: 'January', ar: 'يناير' },
  { en: 'February', ar: 'فبراير' },
  { en: 'March', ar: 'مارس' },
  { en: 'April', ar: 'أبريل' },
  { en: 'May', ar: 'مايو' },
  { en: 'June', ar: 'يونيو' },
  { en: 'July', ar: 'يوليو' },
  { en: 'August', ar: 'أغسطس' },
  { en: 'September', ar: 'سبتمبر' },
  { en: 'October', ar: 'أكتوبر' },
  { en: 'November', ar: 'نوفمبر' },
  { en: 'December', ar: 'ديسمبر' }
];

export const Expenses: React.FC<ExpensesProps> = ({ 
  expenses, onAdd, onEdit, onDelete,
  selectedMonth, selectedYear
}) => {
  const { t, language, dir } = useTranslation();
  const { theme } = useTheme();
  const { profile, updateProfile } = useAuth();
  
  const baseCurrency = profile?.main_currency || 'USD';
  const isAr = language === 'ar';

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingBudgets, setEditingBudgets] = useState<Record<string, string>>({});

  // Filters State
  const [filterEssential, setFilterEssential] = useState<'all' | 'essential' | 'optional'>('all');
  const [filterFixed, setFilterFixed] = useState<'all' | 'fixed' | 'variable'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Form Fields
  const [name, setName] = useState('');
  const [category, setCategory] = useState('cat_living');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('EGP');
  const [frequency, setFrequency] = useState<ExpenseFrequency>('monthly');
  const [dueDate, setDueDate] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [isFixed, setIsFixed] = useState(true);
  const [isEssential, setIsEssential] = useState(true);
  const [notes, setNotes] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !amount) return;

    const parsedAmount = parseFloat(amount);
    const parsedDueDate = parseInt(dueDate) || undefined;

    if (editingId) {
      await onEdit(editingId, {
        name,
        category,
        amount: parsedAmount,
        currency,
        frequency,
        due_date: parsedDueDate,
        start_date: startDate,
        end_date: endDate || undefined,
        is_fixed: isFixed,
        is_essential: isEssential,
        notes: notes || undefined,
      });
      setEditingId(null);
    } else {
      await onAdd({
        user_id: profile?.id || 'guest-id',
        name,
        category,
        amount: parsedAmount,
        currency,
        frequency,
        due_date: parsedDueDate,
        start_date: startDate,
        end_date: endDate || undefined,
        is_fixed: isFixed,
        is_essential: isEssential,
        notes: notes || undefined,
      });
      setShowAddForm(false);
    }

    resetForm();
  };

  const startEdit = (expense: Expense) => {
    setEditingId(expense.id);
    setName(expense.name);
    setCategory(expense.category);
    setAmount(String(expense.amount));
    setCurrency(expense.currency);
    setFrequency(expense.frequency);
    setDueDate(expense.due_date ? String(expense.due_date) : '');
    setStartDate(expense.start_date);
    setEndDate(expense.end_date || '');
    setIsFixed(expense.is_fixed);
    setIsEssential(expense.is_essential);
    setNotes(expense.notes || '');
    setShowAddForm(true);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setShowAddForm(false);
    resetForm();
  };

  const resetForm = () => {
    setName('');
    setCategory('cat_living');
    setAmount('');
    setCurrency('EGP');
    setFrequency('monthly');
    setDueDate('');
    setStartDate(new Date().toISOString().split('T')[0]);
    setEndDate('');
    setIsFixed(true);
    setIsEssential(true);
    setNotes('');
  };

  // Convert current expense item into a monthly average in local currency
  const getMonthlyAverageText = (exp: Expense) => {
    const originalFormatted = formatCurrency(exp.amount, exp.currency, language);
    if (exp.frequency === 'annual') {
      const avg = Math.round(exp.amount / 12);
      const avgFormatted = formatCurrency(avg, exp.currency, language);
      return isAr 
        ? `${originalFormatted} سنوياً ≈ ${avgFormatted} شهرياً (${originalFormatted} / ١٢)`
        : `${originalFormatted} annually ≈ ${avgFormatted} monthly (${originalFormatted} / 12)`;
    }
    if (exp.frequency === 'weekly') {
      const avg = Math.round(exp.amount * 4.33);
      const avgFormatted = formatCurrency(avg, exp.currency, language);
      return isAr
        ? `${originalFormatted} أسبوعياً ≈ ${avgFormatted} شهرياً (${originalFormatted} × ٤.٣٣)`
        : `${originalFormatted} weekly ≈ ${avgFormatted} monthly (${originalFormatted} × 4.33)`;
    }
    if (exp.frequency === 'one-time') {
      return isAr ? `${originalFormatted} (دفعة واحدة غير مكررة)` : `${originalFormatted} (one-time expense)`;
    }
    return originalFormatted;
  };

  // Apply filters
  const filteredExpenses = expenses.filter(exp => {
    if (filterEssential === 'essential' && !exp.is_essential) return false;
    if (filterEssential === 'optional' && exp.is_essential) return false;
    
    if (filterFixed === 'fixed' && !exp.is_fixed) return false;
    if (filterFixed === 'variable' && exp.is_fixed) return false;

    if (filterCategory !== 'all' && exp.category !== filterCategory) return false;

    return true;
  });

  // Budgets calculations & Handlers
  const rates = getExchangeRates();
  const categoryBudgets = profile?.category_budgets || {};

  // Group active expenses by category and sum monthly average in baseCurrency
  const categorySpentMap = expenses.reduce((acc: Record<string, number>, exp) => {
    let monthlyAmount = exp.amount;
    if (exp.frequency === 'weekly') monthlyAmount = exp.amount * 4.33;
    else if (exp.frequency === 'annual') monthlyAmount = exp.amount / 12;
    else if (exp.frequency === 'one-time') monthlyAmount = exp.amount; // Count one-time fully in the month it occurred

    const rateFrom = rates[exp.currency] || 1;
    const rateTo = rates[baseCurrency] || 1;
    const amountInBase = (monthlyAmount / rateFrom) * rateTo;

    acc[exp.category] = (acc[exp.category] || 0) + amountInBase;
    return acc;
  }, {});

  // Determine active categories: categories that either have expenses or have a budget set
  const activeCategories = CATEGORIES.filter(cat => {
    const spent = categorySpentMap[cat] || 0;
    const budget = categoryBudgets[cat] || 0;
    return spent > 0 || budget > 0;
  });

  const handleBudgetChange = (catKey: string, val: string) => {
    setEditingBudgets(prev => ({ ...prev, [catKey]: val }));
  };

  const handleBudgetBlur = async (catKey: string) => {
    const rawVal = editingBudgets[catKey];
    if (rawVal === undefined) return;
    const limit = parseFloat(rawVal);
    const updatedBudgets = { ...categoryBudgets };
    
    if (isNaN(limit) || limit <= 0) {
      delete updatedBudgets[catKey]; // remove if cleared or empty
    } else {
      updatedBudgets[catKey] = limit;
    }
    
    if (updateProfile) {
      await updateProfile({ category_budgets: updatedBudgets });
    }
    // clear local editing state so it reads back from profile
    setEditingBudgets(prev => {
      const copy = { ...prev };
      delete copy[catKey];
      return copy;
    });
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">
            {t('expenses')}{' '}
            <span className="text-emerald-500 text-sm font-semibold">
              ({MONTHS_NAMES[selectedMonth - 1][language === 'ar' ? 'ar' : 'en']} {selectedYear})
            </span>
          </h2>
          <span className="text-xs opacity-60">
            {language === 'ar' ? 'تتبع مصاريفك الدورية وصنفها لتفهم أين تذهب أموالك' : 'Track and categorize your expenses to understand where your money goes'}
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

      {/* Info Card explaining Annual Averages */}
      <div className={`p-4.5 rounded-2xl border text-xs leading-relaxed flex gap-3 items-start
        ${theme === 'dark' ? 'bg-slate-900/20 border-slate-800/60' : 'bg-emerald-50/50 border-emerald-100/60 text-slate-700'}`}
      >
        <Info className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
        <p>
          <strong>{isAr ? 'معلومة تنظيمية:' : 'Budgeting tip:'}</strong>{' '}
          {isAr 
            ? 'يقوم النظام تلقائياً بتحويل المصاريف السنوية (مثل تأمين وترخيص السيارة) والمصاريف الأسبوعية إلى متوسطات شهرية. يسهل هذا حساب المتبقي الشهري بدقة وبناء صندوق طوارئ يغطيك بشكل واقعي.'
            : 'The system automatically converts annual expenses (e.g. car insurance, registrations) and weekly expenses to monthly averages. This helps accurately calculate your monthly cash flow surplus and construct an emergency reserve.'}
        </p>
      </div>

      {/* Category Budgets & Limit Progress bars */}
      <div className={`p-6 rounded-3xl border shadow-lg space-y-4
        ${theme === 'dark' ? 'bg-slate-900/40 border-slate-800/80 shadow-slate-950/20' : 'bg-white border-slate-200 shadow-sm'}`}
      >
        <div>
          <h3 className="font-bold text-base flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-emerald-500" />
            <span>{isAr ? 'ميزانيات وسقوف الصرف الشهرية للفئات' : 'Monthly Category Budgets'}</span>
          </h3>
          <p className="text-[10px] opacity-60 mt-1 font-semibold">
            {isAr 
              ? 'حدد سقفاً مالياً شهرياً لكل فئة لمراقبة النفقات تلقائياً. سيقوم المؤشر بالتغير للبرتقالي أو النبض بالأحمر عند تجاوز السقف المسموح.'
              : 'Set a monthly financial ceiling for each category. Indicators change to amber or pulse red when ceilings are breached.'}
          </p>
        </div>

        {activeCategories.length === 0 ? (
          <div className="py-6 text-center opacity-60 text-xs font-semibold">
            {isAr ? 'أضف مصاريف أولاً لتتمكن من تعيين ميزانيات الفئات.' : 'Add some expenses first to configure category budgets.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4.5">
            {activeCategories.map(cat => {
              const spent = Math.round(categorySpentMap[cat] || 0);
              const budget = categoryBudgets[cat] || 0;
              const hasBudget = budget > 0;
              const percent = hasBudget ? (spent / budget) * 100 : 0;
              const isOver = hasBudget && spent > budget;
              const isWarning = hasBudget && percent >= 80 && percent <= 100;

              return (
                <div 
                  key={cat} 
                  className={`p-3.5 rounded-2xl border flex flex-col gap-2.5 text-xs transition-all
                    ${isOver 
                      ? 'bg-rose-500/5 border-rose-500/20 shadow-rose-950/5' 
                      : isWarning 
                        ? 'bg-amber-500/5 border-amber-500/20' 
                        : theme === 'dark' 
                          ? 'bg-slate-900/80 border-slate-800/60' 
                          : 'bg-slate-50/50 border-slate-100'}`}
                >
                  <div className="flex justify-between items-center gap-2">
                    <span className="font-bold">{t(cat)}</span>
                    
                    {/* Budget limit input */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] opacity-50 font-bold">{isAr ? 'الميزانية:' : 'Limit:'}</span>
                      <div className="relative flex items-center">
                        <input
                          type="number"
                          min="0"
                          placeholder={isAr ? 'غير محدد' : 'Not set'}
                          value={editingBudgets[cat] !== undefined ? editingBudgets[cat] : (budget || '')}
                          onChange={(e) => handleBudgetChange(cat, e.target.value)}
                          onBlur={() => handleBudgetBlur(cat)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              (e.target as HTMLInputElement).blur();
                            }
                          }}
                          className={`w-24 px-2 py-1 rounded-lg border text-center font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500
                            ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'}`}
                        />
                        <span className="text-[9px] opacity-40 font-semibold absolute left-1.5 rtl:right-1.5 rtl:left-auto pointer-events-none">
                          {baseCurrency}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  {hasBudget ? (
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-bold opacity-80">
                        <span className={`${isOver ? 'text-rose-500 font-extrabold animate-pulse' : ''}`}>
                          {formatCurrency(spent, baseCurrency, language)} {isAr ? 'من أصل' : 'of'} {formatCurrency(budget, baseCurrency, language)}
                        </span>
                        <span>{percent.toFixed(0)}%</span>
                      </div>
                      
                      <div className={`w-full h-2 rounded-full overflow-hidden ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-200'}`}>
                        <div 
                          className={`h-full rounded-full transition-all duration-500
                            ${isOver 
                              ? 'bg-rose-500 shadow-md shadow-rose-500/50' 
                              : isWarning 
                                ? 'bg-amber-500' 
                                : 'bg-emerald-500'}`}
                          style={{ width: `${Math.min(100, percent)}%` }}
                        />
                      </div>

                      {isOver && (
                        <div className="flex items-center gap-1 text-[10px] font-bold text-rose-500 mt-1">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>{isAr ? 'تجاوزت الميزانية المحددة لهذه الفئة!' : 'Warning: Budget exceeded for this category!'}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-[10px] opacity-55 font-semibold italic">
                      {isAr 
                        ? `صرفت ${formatCurrency(spent, baseCurrency, language)} هذا الشهر. حدد ميزانية لمراقبة التجاوز.` 
                        : `Spent ${formatCurrency(spent, baseCurrency, language)} this month. Set limit to enable tracking.`}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
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
                placeholder={isAr ? 'فاتورة الكهرباء' : 'Electricity Bill'}
                className={`w-full p-2.5 rounded-xl border focus:ring-1 focus:ring-emerald-500 focus:outline-none
                  ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
              />
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <label className="font-bold opacity-80">{t('category')}</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={`w-full p-2.5 rounded-xl border focus:ring-1 focus:ring-emerald-500 focus:outline-none
                  ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{t(cat)}</option>
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
                placeholder="1000"
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

            {/* Due Date */}
            <div className="space-y-1.5">
              <label className="font-bold opacity-80">{t('dueDate')} ({isAr ? 'يوم من الشهر، مثلاً ٥' : 'Day of month, e.g. 5'})</label>
              <input
                type="number"
                min="1"
                max="31"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                placeholder="5"
                className={`w-full p-2.5 rounded-xl border focus:ring-1 focus:ring-emerald-500 focus:outline-none
                  ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
              />
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

            {/* Fixed vs Variable, Essential vs Optional checkboxes */}
            <div className="flex flex-col gap-3 justify-center pt-2">
              <div className="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  id="isFixed"
                  checked={isFixed}
                  onChange={(e) => setIsFixed(e.target.checked)}
                  className="w-4.5 h-4.5 rounded text-emerald-500 focus:ring-emerald-500"
                />
                <label htmlFor="isFixed" className="font-bold cursor-pointer opacity-80">
                  {isAr ? 'مصروف ثابت شهرياً' : 'Fixed expense amount'}
                </label>
              </div>

              <div className="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  id="isEssential"
                  checked={isEssential}
                  onChange={(e) => setIsEssential(e.target.checked)}
                  className="w-4.5 h-4.5 rounded text-emerald-500 focus:ring-emerald-500"
                />
                <label htmlFor="isEssential" className="font-bold cursor-pointer opacity-80">
                  {isAr ? 'مصروف أساسي معيشي' : 'Essential living expense'}
                </label>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5 lg:col-span-3">
              <label className="font-bold opacity-80">{t('notes')}</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={isAr ? 'تفاصيل إضافية عن المصروف...' : 'Additional notes...'}
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

      {/* Filter Options Bar */}
      <div className={`p-4 rounded-2xl border flex flex-wrap gap-4 items-center justify-between
        ${theme === 'dark' ? 'bg-slate-900/20 border-slate-800/80' : 'bg-slate-50 border-slate-200/50'}`}
      >
        <div className="flex flex-wrap gap-4 items-center text-xs">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Filter className="w-4 h-4" />
            <span>{isAr ? 'تصفية المصاريف:' : 'Filters:'}</span>
          </div>

          {/* Essential vs Optional */}
          <select
            value={filterEssential}
            onChange={(e) => setFilterEssential(e.target.value as any)}
            className={`p-2 rounded-xl border focus:ring-1 focus:ring-emerald-500 focus:outline-none
              ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-700'}`}
          >
            <option value="all">{isAr ? 'كل المصاريف (أساسي + كمالي)' : 'All Priority Types'}</option>
            <option value="essential">{t('essential')}</option>
            <option value="optional">{t('optional')}</option>
          </select>

          {/* Fixed vs Variable */}
          <select
            value={filterFixed}
            onChange={(e) => setFilterFixed(e.target.value as any)}
            className={`p-2 rounded-xl border focus:ring-1 focus:ring-emerald-500 focus:outline-none
              ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-700'}`}
          >
            <option value="all">{isAr ? 'كل التكرارات (ثابت + متغير)' : 'All Cost Types'}</option>
            <option value="fixed">{t('fixed')}</option>
            <option value="variable">{t('variable')}</option>
          </select>

          {/* Category Filter */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className={`p-2 rounded-xl border focus:ring-1 focus:ring-emerald-500 focus:outline-none
              ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-700'}`}
          >
            <option value="all">{isAr ? 'كل الفئات' : 'All Categories'}</option>
            {CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{t(cat)}</option>
            ))}
          </select>
        </div>

        <div className="text-xs font-bold opacity-60">
          {isAr 
            ? `إجمالي المعروض: ${filteredExpenses.length} بند` 
            : `Total Items: ${filteredExpenses.length}`}
        </div>
      </div>

      {/* Expenses Table */}
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
                <th className="p-4 text-start">{t('category')}</th>
                <th className="p-4 text-start">{t('frequency')}</th>
                <th className="p-4 text-start">{t('amount')}</th>
                <th className="p-4 text-start">{isAr ? 'المتوسط الشهري الفعلي' : 'Effective Monthly Average'}</th>
                <th className="p-4 text-start">{t('dueDate')}</th>
                <th className="p-4 text-start">{t('type')}</th>
                <th className="p-4 text-start">{isAr ? 'الأهمية' : 'Priority'}</th>
                <th className="p-4 text-center">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/10 font-medium">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center opacity-60 font-semibold">
                    {isAr ? 'لا توجد مصاريف مطابقة للتصفية حالياً' : 'No expenses match the filter selection'}
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp) => {
                  return (
                    <tr key={exp.id} className={`${theme === 'dark' ? 'hover:bg-slate-900/30' : 'hover:bg-slate-50/50'}`}>
                      <td className="p-4 font-bold">{exp.name}</td>
                      <td className="p-4">{t(exp.category)}</td>
                      <td className="p-4">{t(exp.frequency)}</td>
                      <td className="p-4 font-extrabold">{formatCurrency(exp.amount, exp.currency, language)}</td>
                      <td className="p-4 font-bold text-rose-500">
                        {getMonthlyAverageText(exp)}
                      </td>
                      <td className="p-4 opacity-75">{exp.due_date ? `${t('dueDate')} ${exp.due_date}` : '-'}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border
                          ${exp.is_fixed 
                            ? 'bg-slate-500/10 border-slate-500/20 text-slate-400' 
                            : 'bg-amber-500/10 border-amber-500/20 text-amber-400'}`}
                        >
                          {exp.is_fixed ? t('fixed') : t('variable')}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border
                          ${exp.is_essential 
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                            : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}
                        >
                          {exp.is_essential ? t('essential') : t('optional')}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => startEdit(exp)}
                            className="p-1.5 rounded-lg hover:bg-emerald-500/10 text-emerald-500 cursor-pointer"
                            title={t('edit')}
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          
                          <button
                            onClick={() => onDelete(exp.id)}
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
