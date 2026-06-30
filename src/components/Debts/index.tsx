import React, { useState } from 'react';
import { useTranslation } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { Debt, DebtType } from '../../types';
import { formatCurrency, formatPercent } from '../../utils/format';
import { Plus, Edit2, Trash2, X, Sparkles, AlertTriangle, Calendar, Award } from 'lucide-react';

interface DebtsProps {
  debts: Debt[];
  monthlyIncome: number;
  onAdd: (debt: Omit<Debt, 'id' | 'created_at'>) => Promise<void>;
  onEdit: (id: string, updates: Partial<Debt>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export const Debts: React.FC<DebtsProps> = ({ debts, monthlyIncome, onAdd, onEdit, onDelete }) => {
  const { t, language, dir } = useTranslation();
  const { theme } = useTheme();
  const { profile } = useAuth();
  
  const baseCurrency = profile?.main_currency || 'USD';
  const isAr = language === 'ar';

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [debtType, setDebtType] = useState<DebtType>('car');
  const [originalPrice, setOriginalPrice] = useState('');
  const [downPayment, setDownPayment] = useState('');
  const [financedAmount, setFinancedAmount] = useState('');
  const [monthlyInstallment, setMonthlyInstallment] = useState('');
  const [totalInstallments, setTotalInstallments] = useState('');
  const [paidInstallments, setPaidInstallments] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [institution, setInstitution] = useState('');
  const [balloonPayment, setBalloonPayment] = useState('');
  const [earlySettlementFee, setEarlySettlementFee] = useState('');
  const [notes, setNotes] = useState('');

  // Auto calculate financed amount = original price - downpayment
  React.useEffect(() => {
    const orig = parseFloat(originalPrice) || 0;
    const down = parseFloat(downPayment) || 0;
    setFinancedAmount(String(Math.max(0, orig - down)));
  }, [originalPrice, downPayment]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !originalPrice || !monthlyInstallment || !totalInstallments) return;

    const orig = parseFloat(originalPrice);
    const down = parseFloat(downPayment) || 0;
    const monthly = parseFloat(monthlyInstallment);
    const total = parseInt(totalInstallments);
    const paid = parseInt(paidInstallments) || 0;
    
    // Auto calculate end date
    const start = new Date(startDate);
    start.setMonth(start.getMonth() + total);
    const computedEndDate = start.toISOString().split('T')[0];

    const data = {
      user_id: profile?.id || 'guest-id',
      name,
      debt_type: debtType,
      original_price: orig,
      down_payment: down,
      financed_amount: orig - down,
      monthly_installment: monthly,
      total_installments: total,
      paid_installments: paid,
      interest_rate: parseFloat(interestRate) || 0,
      start_date: startDate,
      end_date: computedEndDate,
      institution: institution || undefined,
      balloon_payment: parseFloat(balloonPayment) || 0,
      early_settlement_fee: parseFloat(earlySettlementFee) || 0,
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

  const startEdit = (debt: Debt) => {
    setEditingId(debt.id);
    setName(debt.name);
    setDebtType(debt.debt_type);
    setOriginalPrice(String(debt.original_price));
    setDownPayment(String(debt.down_payment));
    setFinancedAmount(String(debt.financed_amount));
    setMonthlyInstallment(String(debt.monthly_installment));
    setTotalInstallments(String(debt.total_installments));
    setPaidInstallments(String(debt.paid_installments));
    setInterestRate(String(debt.interest_rate));
    setStartDate(debt.start_date);
    setEndDate(debt.end_date || '');
    setInstitution(debt.institution || '');
    setBalloonPayment(String(debt.balloon_payment));
    setEarlySettlementFee(String(debt.early_settlement_fee));
    setNotes(debt.notes || '');
    setShowAddForm(true);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setShowAddForm(false);
    resetForm();
  };

  const resetForm = () => {
    setName('');
    setDebtType('car');
    setOriginalPrice('');
    setDownPayment('');
    setFinancedAmount('');
    setMonthlyInstallment('');
    setTotalInstallments('');
    setPaidInstallments('');
    setInterestRate('');
    setStartDate(new Date().toISOString().split('T')[0]);
    setEndDate('');
    setInstitution('');
    setBalloonPayment('');
    setEarlySettlementFee('');
    setNotes('');
  };

  // Convert EGP installment for summary metrics (defaults to EGP here as car installment is EGP)
  const formatEGPVal = (val: number) => {
    return formatCurrency(val, 'EGP', language);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">{t('debts')}</h2>
          <span className="text-xs opacity-60">
            {language === 'ar' ? 'تابع أقساطك وديونك الجارية واحسب خطة سدادها بدقة' : 'Monitor installments, current debts, and schedule your payoffs'}
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
                placeholder={isAr ? 'قسط السيارة' : 'Car Loan'}
                className={`w-full p-2.5 rounded-xl border focus:ring-1 focus:ring-emerald-500 focus:outline-none
                  ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
              />
            </div>

            {/* Type */}
            <div className="space-y-1.5">
              <label className="font-bold opacity-80">{t('type')}</label>
              <select
                value={debtType}
                onChange={(e) => setDebtType(e.target.value as any)}
                className={`w-full p-2.5 rounded-xl border focus:ring-1 focus:ring-emerald-500 focus:outline-none
                  ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
              >
                {['loan', 'car', 'property', 'credit_card', 'personal'].map(k => (
                  <option key={k} value={k}>{t(`debt_${k}`)}</option>
                ))}
              </select>
            </div>

            {/* Institution */}
            <div className="space-y-1.5">
              <label className="font-bold opacity-80">{t('institution')}</label>
              <input
                type="text"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                placeholder="البنك الأهلي"
                className={`w-full p-2.5 rounded-xl border focus:ring-1 focus:ring-emerald-500 focus:outline-none
                  ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
              />
            </div>

            {/* Original Item Price */}
            <div className="space-y-1.5">
              <label className="font-bold opacity-80">{t('originalPrice')} ({isAr ? 'بالجنيه المصري' : 'in EGP'})</label>
              <input
                type="number"
                required
                min="0"
                value={originalPrice}
                onChange={(e) => setOriginalPrice(e.target.value)}
                placeholder="1400000"
                className={`w-full p-2.5 rounded-xl border focus:ring-1 focus:ring-emerald-500 focus:outline-none
                  ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
              />
            </div>

            {/* Down Payment */}
            <div className="space-y-1.5">
              <label className="font-bold opacity-80">{t('downPayment')} ({isAr ? 'بالجنيه المصري' : 'in EGP'})</label>
              <input
                type="number"
                min="0"
                value={downPayment}
                onChange={(e) => setDownPayment(e.target.value)}
                placeholder="445000"
                className={`w-full p-2.5 rounded-xl border focus:ring-1 focus:ring-emerald-500 focus:outline-none
                  ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
              />
            </div>

            {/* Financed Amount */}
            <div className="space-y-1.5">
              <label className="font-bold opacity-80">{t('financedAmount')} ({isAr ? 'تلقائي' : 'Auto'})</label>
              <input
                type="text"
                disabled
                value={financedAmount}
                className={`w-full p-2.5 rounded-xl border opacity-60 bg-slate-800/10 cursor-not-allowed`}
              />
            </div>

            {/* Monthly Installment */}
            <div className="space-y-1.5">
              <label className="font-bold opacity-80">{t('monthlyRemainingBalance')} / {t('totalMonthlyInstallments')} ({isAr ? 'بالجنيه المصري' : 'in EGP'})</label>
              <input
                type="number"
                required
                min="0"
                value={monthlyInstallment}
                onChange={(e) => setMonthlyInstallment(e.target.value)}
                placeholder="25870"
                className={`w-full p-2.5 rounded-xl border focus:ring-1 focus:ring-emerald-500 focus:outline-none
                  ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
              />
            </div>

            {/* Total Installments */}
            <div className="space-y-1.5">
              <label className="font-bold opacity-80">{isAr ? 'إجمالي عدد الأقساط (شهر)' : 'Total Installments (months)'}</label>
              <input
                type="number"
                required
                min="1"
                value={totalInstallments}
                onChange={(e) => setTotalInstallments(e.target.value)}
                placeholder="60"
                className={`w-full p-2.5 rounded-xl border focus:ring-1 focus:ring-emerald-500 focus:outline-none
                  ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
              />
            </div>

            {/* Paid Installments */}
            <div className="space-y-1.5">
              <label className="font-bold opacity-80">{isAr ? 'عدد الأقساط المدفوعة' : 'Paid Installments'}</label>
              <input
                type="number"
                min="0"
                value={paidInstallments}
                onChange={(e) => setPaidInstallments(e.target.value)}
                placeholder="12"
                className={`w-full p-2.5 rounded-xl border focus:ring-1 focus:ring-emerald-500 focus:outline-none
                  ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
              />
            </div>

            {/* Interest Rate */}
            <div className="space-y-1.5">
              <label className="font-bold opacity-80">{t('interestRate')} (%)</label>
              <input
                type="number"
                step="0.1"
                value={interestRate}
                onChange={(e) => setInterestRate(e.target.value)}
                placeholder="12.5"
                className={`w-full p-2.5 rounded-xl border focus:ring-1 focus:ring-emerald-500 focus:outline-none
                  ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
              />
            </div>

            {/* Early Settlement Fee */}
            <div className="space-y-1.5">
              <label className="font-bold opacity-80">{t('earlySettlementFee')} ({isAr ? 'بالجنيه المصري' : 'in EGP'})</label>
              <input
                type="number"
                value={earlySettlementFee}
                onChange={(e) => setEarlySettlementFee(e.target.value)}
                placeholder="15000"
                className={`w-full p-2.5 rounded-xl border focus:ring-1 focus:ring-emerald-500 focus:outline-none
                  ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
              />
            </div>

            {/* Balloon Payment */}
            <div className="space-y-1.5">
              <label className="font-bold opacity-80">{t('balloonPayment')} ({isAr ? 'بالجنيه المصري' : 'in EGP'})</label>
              <input
                type="number"
                value={balloonPayment}
                onChange={(e) => setBalloonPayment(e.target.value)}
                placeholder="0"
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

            {/* Notes */}
            <div className="space-y-1.5 lg:col-span-2">
              <label className="font-bold opacity-80">{t('notes')}</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={isAr ? 'تفاصيل السداد والملاحظات...' : 'Payment schedule details...'}
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

      {/* List of Debts Cards */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {debts.length === 0 ? (
          <div className={`p-12 text-center rounded-3xl border shadow-lg xl:col-span-2 opacity-60 font-semibold
            ${theme === 'dark' ? 'bg-slate-900/40 border-slate-800/80' : 'bg-white border-slate-200'}`}
          >
            <Award className="w-12 h-12 text-emerald-500 mx-auto mb-2 opacity-50" />
            <p>{isAr ? 'خالي من الديون! وضعك المالي ممتاز وخالٍ من الأعباء والالتزامات.' : 'Debt free! You have no outstanding obligations.'}</p>
          </div>
        ) : (
          debts.map((debt) => {
            // Auto Calculations
            const remainingInst = Math.max(0, debt.total_installments - debt.paid_installments);
            const totalRemaining = remainingInst * debt.monthly_installment + debt.balloon_payment;
            const totalPaid = debt.paid_installments * debt.monthly_installment + debt.down_payment;
            
            // credit cost = installments total + down - original price
            const totalFinancingCost = (debt.monthly_installment * debt.total_installments) + debt.down_payment - debt.original_price;
            const financingCostPercent = debt.financed_amount > 0 ? (totalFinancingCost / debt.financed_amount) * 100 : 0;
            
            // % income consumed (need exchange rate conversions)
            // Installment is in EGP. Let's assume income is converted to EGP or vice versa.
            // Income is USD, so convert monthly income to EGP
            const incomeInEGP = monthlyIncome; 
            const pctOfIncome = incomeInEGP > 0 ? (debt.monthly_installment / incomeInEGP) * 100 : 0;

            const progress = (debt.paid_installments / debt.total_installments) * 100;

            return (
              <div
                key={debt.id}
                className={`p-6 rounded-3xl border shadow-lg flex flex-col justify-between transition-all duration-300 hover:shadow-xl
                  ${theme === 'dark' ? 'bg-slate-900/40 border-slate-800/80' : 'bg-white border-slate-200/80'}`}
              >
                <div>
                  {/* Header Title */}
                  <div className="flex items-start justify-between">
                    <div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase
                        ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-amber-400' : 'bg-slate-50 border-slate-200 text-amber-600'}`}
                      >
                        {t(`debt_${debt.debt_type}`)}
                      </span>
                      <h3 className="text-base font-bold mt-1.5">{debt.name}</h3>
                      {debt.institution && (
                        <span className="text-[10px] opacity-60 block">{debt.institution}</span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => startEdit(debt)}
                        className="p-1.5 rounded-lg hover:bg-emerald-500/10 text-emerald-500 cursor-pointer"
                        title={t('edit')}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDelete(debt.id)}
                        className="p-1.5 rounded-lg hover:bg-rose-500/10 text-rose-500 cursor-pointer"
                        title={t('delete')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Repayment progress bar */}
                  <div className="mt-5 space-y-1 text-xs font-semibold">
                    <div className="flex justify-between">
                      <span>{t('progress')} ({debt.paid_installments} / {debt.total_installments} {isAr ? 'قسط' : 'pmts'})</span>
                      <span className="font-extrabold">{progress.toFixed(0)}%</span>
                    </div>
                    <div className={`w-full h-2 rounded-full ${theme === 'dark' ? 'bg-slate-950' : 'bg-slate-100'}`}>
                      <div 
                        className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-1000"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Calculations Grid */}
                  <div className="mt-5 grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="opacity-60 block mb-0.5">{isAr ? 'المتبقي سداده' : 'Remaining Debt'}</span>
                      <span className="font-extrabold text-rose-500">{formatEGPVal(totalRemaining)}</span>
                    </div>
                    <div>
                      <span className="opacity-60 block mb-0.5">{isAr ? 'إجمالي المدفوع' : 'Total Paid'}</span>
                      <span className="font-extrabold text-emerald-500">{formatEGPVal(totalPaid)}</span>
                    </div>
                    <div>
                      <span className="opacity-60 block mb-0.5">{t('totalFinancingCost')}</span>
                      <span className="font-extrabold text-slate-400">
                        {formatEGPVal(Math.max(0, totalFinancingCost))}
                        <span className="text-[10px] text-rose-400 ml-1.5 mr-1.5">({financingCostPercent.toFixed(0)}%)</span>
                      </span>
                    </div>
                    <div>
                      <span className="opacity-60 block mb-0.5">{t('incomePercentageUsed')}</span>
                      <span className="font-extrabold text-amber-500">{pctOfIncome.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>

                {/* Timeline Stepper and Dates */}
                <div className="mt-6 border-t border-slate-800/10 pt-4 flex flex-col gap-3.5">
                  <div className="flex items-center justify-between text-[10px] opacity-75">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{isAr ? 'البداية:' : 'Start:'} {debt.start_date}</span>
                    </div>
                    <div className="flex items-center gap-1 font-bold text-emerald-500">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{isAr ? 'الانتهاء المتوقع:' : 'Completion:'} {debt.end_date}</span>
                    </div>
                  </div>

                  {/* Repayment timeline visualizer */}
                  <div className="flex items-center gap-1 text-[9px] font-bold opacity-60">
                    <span className="shrink-0">{isAr ? 'البداية' : 'Start'}</span>
                    <div className="flex-1 flex gap-0.5">
                      {Array.from({ length: 12 }).map((_, idx) => {
                        const cellProgress = (idx / 11) * 100;
                        const isCompletedCell = progress >= cellProgress;
                        return (
                          <div 
                            key={idx} 
                            className={`h-2.5 flex-1 rounded-sm
                              ${isCompletedCell 
                                ? 'bg-emerald-500/80' 
                                : theme === 'dark' ? 'bg-slate-950' : 'bg-slate-100'}`}
                          />
                        );
                      })}
                    </div>
                    <span className="shrink-0">{isAr ? 'الانتهاء' : 'End'}</span>
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
