import React, { useState } from 'react';
import { useTranslation } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { FinancialGoal, GoalPriority } from '../../types';
import { formatCurrency, formatPercent } from '../../utils/format';
import { Plus, Edit2, Trash2, X, Sparkles, Target, AlertTriangle, CheckCircle, Info } from 'lucide-react';

interface GoalsProps {
  goals: FinancialGoal[];
  monthlySurplus: number; // monthly remaining balance in main baseCurrency
  onAdd: (goal: Omit<FinancialGoal, 'id' | 'created_at'>) => Promise<void>;
  onEdit: (id: string, updates: Partial<FinancialGoal>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export const Goals: React.FC<GoalsProps> = ({ 
  goals, monthlySurplus, onAdd, onEdit, onDelete 
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
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [targetDate, setTargetDate] = useState(new Date().toISOString().split('T')[0]);
  const [monthlyContribution, setMonthlyContribution] = useState('');
  const [priority, setPriority] = useState<GoalPriority>('medium');
  const [notes, setNotes] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !targetAmount || !targetDate) return;

    const targetVal = parseFloat(targetAmount);
    const currentVal = parseFloat(currentAmount) || 0;
    const monthlyVal = parseFloat(monthlyContribution) || 0;

    const data = {
      user_id: profile?.id || 'guest-id',
      name,
      target_amount: targetVal,
      current_amount: currentVal,
      target_date: targetDate,
      monthly_contribution: monthlyVal,
      priority,
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

  const startEdit = (goal: FinancialGoal) => {
    setEditingId(goal.id);
    setName(goal.name);
    setTargetAmount(String(goal.target_amount));
    setCurrentAmount(String(goal.current_amount));
    setTargetDate(goal.target_date);
    setMonthlyContribution(String(goal.monthly_contribution));
    setPriority(goal.priority);
    setNotes(goal.notes || '');
    setShowAddForm(true);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setShowAddForm(false);
    resetForm();
  };

  const resetForm = () => {
    setName('');
    setTargetAmount('');
    setCurrentAmount('');
    setTargetDate(new Date().toISOString().split('T')[0]);
    setMonthlyContribution('');
    setPriority('medium');
    setNotes('');
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">{t('goals')}</h2>
          <span className="text-xs opacity-60">
            {language === 'ar' ? 'حدد أهدافك المالية واحسب خطة ادخار شهرية لتحقيقها بنجاح' : 'Define your savings milestones and auto-calculate monthly contributions'}
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
                placeholder={isAr ? 'شراء سيارة جديدة' : 'Buy a New Car'}
                className={`w-full p-2.5 rounded-xl border focus:ring-1 focus:ring-emerald-500 focus:outline-none
                  ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
              />
            </div>

            {/* Target Amount */}
            <div className="space-y-1.5">
              <label className="font-bold opacity-80">{isAr ? 'المبلغ المستهدف' : 'Target Amount'} ({isAr ? 'بالعملة الأساسية' : `in ${baseCurrency}`})</label>
              <input
                type="number"
                required
                min="1"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                placeholder="250000"
                className={`w-full p-2.5 rounded-xl border focus:ring-1 focus:ring-emerald-500 focus:outline-none
                  ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
              />
            </div>

            {/* Current Amount */}
            <div className="space-y-1.5">
              <label className="font-bold opacity-80">{isAr ? 'المبلغ المتوفر حالياً' : 'Current Saved Amount'} ({isAr ? 'بالعملة الأساسية' : `in ${baseCurrency}`})</label>
              <input
                type="number"
                min="0"
                value={currentAmount}
                onChange={(e) => setCurrentAmount(e.target.value)}
                placeholder="40000"
                className={`w-full p-2.5 rounded-xl border focus:ring-1 focus:ring-emerald-500 focus:outline-none
                  ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
              />
            </div>

            {/* Target Date */}
            <div className="space-y-1.5">
              <label className="font-bold opacity-80">{isAr ? 'التاريخ المستهدف للإنجاز' : 'Target Accomplish Date'}</label>
              <input
                type="date"
                required
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className={`w-full p-2.5 rounded-xl border focus:ring-1 focus:ring-emerald-500 focus:outline-none
                  ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
              />
            </div>

            {/* Monthly Contribution */}
            <div className="space-y-1.5">
              <label className="font-bold opacity-80">{isAr ? 'الادخار الشهري المخطط' : 'Planned Monthly Contribution'} ({isAr ? 'بالعملة الأساسية' : `in ${baseCurrency}`})</label>
              <input
                type="number"
                min="0"
                value={monthlyContribution}
                onChange={(e) => setMonthlyContribution(e.target.value)}
                placeholder="5000"
                className={`w-full p-2.5 rounded-xl border focus:ring-1 focus:ring-emerald-500 focus:outline-none
                  ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
              />
            </div>

            {/* Priority */}
            <div className="space-y-1.5">
              <label className="font-bold opacity-80">{t('priority')}</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className={`w-full p-2.5 rounded-xl border focus:ring-1 focus:ring-emerald-500 focus:outline-none
                  ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
              >
                {['high', 'medium', 'low'].map(p => (
                  <option key={p} value={p}>{t(`${p}Priority`)}</option>
                ))}
              </select>
            </div>

            {/* Notes */}
            <div className="space-y-1.5 lg:col-span-3">
              <label className="font-bold opacity-80">{t('notes')}</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={isAr ? 'ملاحظات وتفاصيل...' : 'Goal notes...'}
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

      {/* Goals Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {goals.length === 0 ? (
          <div className={`p-8 text-center rounded-3xl border shadow-md md:col-span-2 opacity-60 font-semibold
            ${theme === 'dark' ? 'bg-slate-900/40 border-slate-800/80' : 'bg-white border-slate-200'}`}
          >
            <p>{isAr ? 'لا توجد أي أهداف مالية مسجلة حالياً.' : 'No financial goals recorded yet.'}</p>
          </div>
        ) : (
          goals.map((goal) => {
            // Calculations
            const remainingAmt = Math.max(0, goal.target_amount - goal.current_amount);
            const progress = (goal.current_amount / goal.target_amount) * 100;
            
            // Calculate remaining months
            const targetDateObj = new Date(goal.target_date);
            const currentDateObj = new Date();
            const yearDiff = targetDateObj.getFullYear() - currentDateObj.getFullYear();
            const monthDiff = targetDateObj.getMonth() - currentDateObj.getMonth();
            const monthsRemaining = Math.max(1, yearDiff * 12 + monthDiff);
            
            const requiredMonthly = remainingAmt / monthsRemaining;
            
            // Feasibility check: is required savings <= monthly surplus?
            const isFeasible = requiredMonthly <= monthlySurplus;

            // Expected completion based on current monthly contribution
            let expectedCompletionStr = '-';
            if (goal.monthly_contribution > 0) {
              const monthsToComplete = remainingAmt / goal.monthly_contribution;
              const dateClone = new Date();
              dateClone.setMonth(dateClone.getMonth() + Math.ceil(monthsToComplete));
              expectedCompletionStr = dateClone.toISOString().split('T')[0];
            }

            const getPriorityColor = (p: string) => {
              if (p === 'high') return 'bg-rose-500/15 border-rose-500/20 text-rose-400';
              if (p === 'medium') return 'bg-amber-500/15 border-amber-500/20 text-amber-400';
              return 'bg-emerald-500/15 border-emerald-500/20 text-emerald-400';
            };

            return (
              <div
                key={goal.id}
                className={`p-6 rounded-3xl border shadow-lg flex flex-col justify-between transition-all duration-300 hover:shadow-xl
                  ${theme === 'dark' ? 'bg-slate-900/40 border-slate-800/80' : 'bg-white border-slate-200'}`}
              >
                <div>
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase ${getPriorityColor(goal.priority)}`}>
                        {t(`${goal.priority}Priority`)}
                      </span>
                      <h4 className="text-sm font-bold mt-1.5">{goal.name}</h4>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => startEdit(goal)}
                        className="p-1 rounded-lg hover:bg-emerald-500/10 text-emerald-500 cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDelete(goal.id)}
                        className="p-1 rounded-lg hover:bg-rose-500/10 text-rose-500 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-5 space-y-1 text-xs font-semibold">
                    <div className="flex justify-between">
                      <span>{t('progress')}</span>
                      <span>{progress.toFixed(0)}%</span>
                    </div>
                    <div className={`w-full h-2.5 rounded-full ${theme === 'dark' ? 'bg-slate-950' : 'bg-slate-100'}`}>
                      <div 
                        className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-1000"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Calculations Details */}
                  <div className="mt-5 grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="opacity-60 block mb-0.5">{t('target')}</span>
                      <span className="font-extrabold">{formatCurrency(goal.target_amount, baseCurrency, language)}</span>
                    </div>
                    <div>
                      <span className="opacity-60 block mb-0.5">{t('current')}</span>
                      <span className="font-extrabold text-emerald-500">{formatCurrency(goal.current_amount, baseCurrency, language)}</span>
                    </div>
                    <div>
                      <span className="opacity-60 block mb-0.5">{t('requiredMonthly')}</span>
                      <span className="font-extrabold text-amber-500">
                        {formatCurrency(requiredMonthly, baseCurrency, language)}
                        <span className="text-[9px] opacity-75 block font-normal">({isAr ? `خلال ${monthsRemaining} شهر` : `in ${monthsRemaining} mos`})</span>
                      </span>
                    </div>
                    <div>
                      <span className="opacity-60 block mb-0.5">{isAr ? 'الادخار المخطط' : 'Planned Contribution'}</span>
                      <span className="font-extrabold text-sky-500">
                        {goal.monthly_contribution > 0 ? formatCurrency(goal.monthly_contribution, baseCurrency, language) : '-'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Feasibility alerts & dates */}
                <div className="mt-6 border-t border-slate-800/10 pt-4 flex flex-col gap-3.5">
                  {/* Achievability status indicator */}
                  <div className={`p-3.5 rounded-2xl border text-[11px] font-semibold flex items-start gap-2
                    ${isFeasible 
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                      : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}
                  >
                    {isFeasible ? (
                      <>
                        <CheckCircle className="w-4 h-4 shrink-0" />
                        <p>{t('goalAchievable')}</p>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <p>
                          {isAr 
                            ? `فائضك الحالي (${formatCurrency(monthlySurplus, baseCurrency, language)}) أقل من الادخار المطلـوب (${formatCurrency(requiredMonthly, baseCurrency, language)}). يرجى خفض المصاريف.`
                            : `Your surplus (${formatCurrency(monthlySurplus, baseCurrency, language)}) is less than required (${formatCurrency(requiredMonthly, baseCurrency, language)}). Consider cutting costs.`
                          }
                        </p>
                      </>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[10px] opacity-75">
                    <div className="flex items-center gap-1">
                      <span>{isAr ? 'التاريخ المستهدف:' : 'Target Date:'}</span>
                      <span className="font-bold">{goal.target_date}</span>
                    </div>
                    {goal.monthly_contribution > 0 && (
                      <div className="flex items-center gap-1">
                        <span>{isAr ? 'الانتهاء المتوقع:' : 'Expected Accomplish:'}</span>
                        <span className="font-bold text-emerald-500">{expectedCompletionStr}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
