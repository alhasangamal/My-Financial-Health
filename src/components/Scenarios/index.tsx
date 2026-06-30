import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { IncomeSource, Expense, Debt, Asset, EmergencyReserve, SimulationResult } from '../../types';
import { runScenarioSimulation } from '../../utils/calculations';
import { formatCurrency, formatPercent, formatNumber } from '../../utils/format';
import { 
  TrendingUp, TrendingDown, HelpCircle, ShieldAlert, 
  ArrowRightLeft, BadgeAlert, ArrowUpRight, ArrowDownRight, RefreshCw
} from 'lucide-react';

interface ScenariosProps {
  incomes: IncomeSource[];
  expenses: Expense[];
  debts: Debt[];
  assets: Asset[];
  reserves: EmergencyReserve[];
  rates: Record<string, number>;
}

export const Scenarios: React.FC<ScenariosProps> = ({
  incomes, expenses, debts, assets, reserves, rates
}) => {
  const { t, language, dir } = useTranslation();
  const { theme } = useTheme();
  const { profile } = useAuth();
  
  const baseCurrency = profile?.main_currency || 'USD';
  const isAr = language === 'ar';

  // State: selected scenario type
  const [scenarioType, setScenarioType] = useState<string>('sim_buy_car');

  // Input states
  const [carPrice, setCarPrice] = useState('1400000');
  const [downPayment, setDownPayment] = useState('445000');
  const [installment, setInstallment] = useState('25870');
  const [duration, setDuration] = useState('60');
  
  const [salaryChange, setSalaryChange] = useState('300'); // positive or negative in baseCurrency
  const [expenseIncrease, setExpenseIncrease] = useState('2000'); // in EGP usually
  const [incomeLossPercent, setIncomeLossPercent] = useState('20');
  const [debtIdToPayOff, setDebtIdToPayOff] = useState('');
  const [reserveUsed, setReserveUsed] = useState('100000'); // in EGP usually

  // Simulation result state
  const [result, setResult] = useState<SimulationResult | null>(null);

  // Run simulation whenever inputs or type change
  useEffect(() => {
    // Determine which debt is selected if early payoff
    const targetPayoffDebtId = debtIdToPayOff || (debts[0]?.id || '');
    if (scenarioType === 'sim_early_debt_payoff' && !debtIdToPayOff && debts.length > 0) {
      setDebtIdToPayOff(debts[0].id);
    }

    const simResult = runScenarioSimulation(
      incomes,
      expenses,
      debts,
      assets,
      reserves,
      baseCurrency,
      rates,
      scenarioType,
      {
        carPrice: parseFloat(carPrice) || 0,
        downPayment: parseFloat(downPayment) || 0,
        installment: parseFloat(installment) || 0,
        duration: parseInt(duration) || 0,
        salaryChange: parseFloat(salaryChange) || 0,
        expenseIncrease: parseFloat(expenseIncrease) || 0,
        incomeLossPercent: parseFloat(incomeLossPercent) || 0,
        debtIdToPayOff: targetPayoffDebtId,
        reserveUsed: parseFloat(reserveUsed) || 0,
      }
    );

    setResult(simResult);
  }, [
    scenarioType, carPrice, downPayment, installment, duration, 
    salaryChange, expenseIncrease, incomeLossPercent, debtIdToPayOff, 
    reserveUsed, incomes, expenses, debts, assets, reserves, baseCurrency, rates
  ]);

  const getImpactColor = (lvl: string) => {
    switch (lvl) {
      case 'Severe': return 'text-rose-500 bg-rose-500/10 border-rose-500/20';
      case 'High': return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
      case 'Medium': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
      default: return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-emerald-500';
    if (score >= 70) return 'text-green-500';
    if (score >= 50) return 'text-amber-500';
    if (score >= 30) return 'text-orange-500';
    return 'text-rose-500';
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-xl font-bold">{t('scenarioTitle')}</h2>
        <p className="text-xs opacity-60 mt-1">
          {t('scenarioIntro')}
        </p>
      </div>

      {/* Simulator Interface split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-xs">
        {/* Scenario Config Form */}
        <div className={`p-6 rounded-3xl border shadow-lg flex flex-col justify-between
          ${theme === 'dark' ? 'bg-slate-900/40 border-slate-800/80' : 'bg-white border-slate-200/80'}`}
        >
          <div className="space-y-5">
            <h3 className="font-bold text-sm border-b border-slate-800/10 pb-3 flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-emerald-500" />
              <span>{isAr ? 'مدخلات السيناريو' : 'Scenario Inputs'}</span>
            </h3>

            {/* Quick Presets */}
            <div className="space-y-2.5 pt-1">
              <label className="font-bold opacity-75 block text-[10px] uppercase tracking-wide">
                {isAr ? 'نماذج محاكاة جاهزة بنقرة واحدة:' : 'One-click Quick Presets:'}
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    setScenarioType('sim_buy_car');
                    setCarPrice('1400000');
                    setDownPayment('445000');
                    setInstallment('25870');
                    setDuration('60');
                  }}
                  className={`px-3 py-1.5 rounded-lg border font-bold hover:scale-105 active:scale-95 transition-all cursor-pointer text-[10px]
                    ${scenarioType === 'sim_buy_car' && carPrice === '1400000'
                      ? 'bg-emerald-500/15 border-emerald-500 text-emerald-500'
                      : theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'}`}
                >
                  🚗 {isAr ? 'شراء سيارة بتمويل' : 'Buy Car Financed'}
                </button>
                
                <button
                  onClick={() => {
                    setScenarioType('sim_buy_car');
                    setCarPrice('700000');
                    setDownPayment('200000');
                    setInstallment('12000');
                    setDuration('60');
                  }}
                  className={`px-3 py-1.5 rounded-lg border font-bold hover:scale-105 active:scale-95 transition-all cursor-pointer text-[10px]
                    ${scenarioType === 'sim_buy_car' && carPrice === '700000'
                      ? 'bg-emerald-500/15 border-emerald-500 text-emerald-500'
                      : theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'}`}
                >
                  🚗 {isAr ? 'سيارة اقتصادية' : 'Economic Car'}
                </button>

                <button
                  onClick={() => {
                    setScenarioType('sim_income_loss');
                    setIncomeLossPercent('20');
                  }}
                  className={`px-3 py-1.5 rounded-lg border font-bold hover:scale-105 active:scale-95 transition-all cursor-pointer text-[10px]
                    ${scenarioType === 'sim_income_loss' && incomeLossPercent === '20'
                      ? 'bg-emerald-500/15 border-emerald-500 text-emerald-500'
                      : theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'}`}
                >
                  📉 {isAr ? 'تراجع الدخل ٢٠٪' : '20% Income Loss'}
                </button>

                <button
                  onClick={() => {
                    setScenarioType('sim_income_loss');
                    setIncomeLossPercent('40');
                  }}
                  className={`px-3 py-1.5 rounded-lg border font-bold hover:scale-105 active:scale-95 transition-all cursor-pointer text-[10px]
                    ${scenarioType === 'sim_income_loss' && incomeLossPercent === '40'
                      ? 'bg-emerald-500/15 border-emerald-500 text-emerald-500'
                      : theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'}`}
                >
                  🚨 {isAr ? 'تراجع الدخل ٤٠٪ (حرج)' : '40% Drop (Critical)'}
                </button>
              </div>
            </div>

            {/* Select Scenario Category */}
            <div className="space-y-1.5">
              <label className="font-bold opacity-80">{t('selectScenario')}</label>
              <select
                value={scenarioType}
                onChange={(e) => setScenarioType(e.target.value)}
                className={`w-full p-2.5 rounded-xl border focus:ring-1 focus:ring-emerald-500 focus:outline-none font-bold
                  ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-700'}`}
              >
                {[
                  'sim_buy_car', 'sim_new_installment', 'sim_salary_change', 
                  'sim_expense_increase', 'sim_income_loss', 'sim_early_debt_payoff', 'sim_use_reserve'
                ].map(s => (
                  <option key={s} value={s}>{t(s)}</option>
                ))}
              </select>
            </div>

            {/* Conditionally Render Inputs based on Selected Scenario */}
            {scenarioType === 'sim_buy_car' && (
              <>
                <div className="space-y-1.5">
                  <label className="font-bold opacity-80">{t('sim_price')} ({isAr ? 'ج.م' : 'EGP'})</label>
                  <input
                    type="number"
                    value={carPrice}
                    onChange={(e) => setCarPrice(e.target.value)}
                    placeholder="1400000"
                    className={`w-full p-2.5 rounded-xl border focus:outline-none focus:ring-1 focus:ring-emerald-500
                      ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-bold opacity-80">{t('sim_downpayment')} ({isAr ? 'ج.م' : 'EGP'})</label>
                  <input
                    type="number"
                    value={downPayment}
                    onChange={(e) => setDownPayment(e.target.value)}
                    placeholder="445000"
                    className={`w-full p-2.5 rounded-xl border focus:outline-none focus:ring-1 focus:ring-emerald-500
                      ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-bold opacity-80">{t('sim_monthly_inst')} ({isAr ? 'ج.م' : 'EGP'})</label>
                  <input
                    type="number"
                    value={installment}
                    onChange={(e) => setInstallment(e.target.value)}
                    placeholder="25870"
                    className={`w-full p-2.5 rounded-xl border focus:outline-none focus:ring-1 focus:ring-emerald-500
                      ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-bold opacity-80">{t('sim_duration')} ({isAr ? 'شهر' : 'Months'})</label>
                  <input
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder="60"
                    className={`w-full p-2.5 rounded-xl border focus:outline-none focus:ring-1 focus:ring-emerald-500
                      ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                  />
                </div>
              </>
            )}

            {scenarioType === 'sim_new_installment' && (
              <>
                <div className="space-y-1.5">
                  <label className="font-bold opacity-80">{t('sim_monthly_inst')} ({isAr ? 'ج.م' : 'EGP'})</label>
                  <input
                    type="number"
                    value={installment}
                    onChange={(e) => setInstallment(e.target.value)}
                    placeholder="5000"
                    className={`w-full p-2.5 rounded-xl border focus:outline-none focus:ring-1 focus:ring-emerald-500
                      ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-bold opacity-80">{t('sim_duration')} ({isAr ? 'شهر' : 'Months'})</label>
                  <input
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder="36"
                    className={`w-full p-2.5 rounded-xl border focus:outline-none focus:ring-1 focus:ring-emerald-500
                      ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                  />
                </div>
              </>
            )}

            {scenarioType === 'sim_salary_change' && (
              <div className="space-y-1.5">
                <label className="font-bold opacity-80">{t('sim_salary_diff')} ({isAr ? 'زيادة بالموجب أو نقصان بالسالب' : '+ increase or - decrease'} in {baseCurrency})</label>
                <input
                  type="number"
                  value={salaryChange}
                  onChange={(e) => setSalaryChange(e.target.value)}
                  placeholder="300"
                  className={`w-full p-2.5 rounded-xl border focus:outline-none focus:ring-1 focus:ring-emerald-500
                    ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                />
              </div>
            )}

            {scenarioType === 'sim_expense_increase' && (
              <div className="space-y-1.5">
                <label className="font-bold opacity-80">{t('sim_expense_diff')} ({isAr ? 'ج.م' : 'EGP'})</label>
                <input
                  type="number"
                  value={expenseIncrease}
                  onChange={(e) => setExpenseIncrease(e.target.value)}
                  placeholder="2000"
                  className={`w-full p-2.5 rounded-xl border focus:outline-none focus:ring-1 focus:ring-emerald-500
                    ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                />
              </div>
            )}

            {scenarioType === 'sim_income_loss' && (
              <div className="space-y-1.5">
                <label className="font-bold opacity-80">{t('sim_loss_percent')}</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={incomeLossPercent}
                  onChange={(e) => setIncomeLossPercent(e.target.value)}
                  placeholder="20"
                  className={`w-full p-2.5 rounded-xl border focus:outline-none focus:ring-1 focus:ring-emerald-500
                    ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                />
              </div>
            )}

            {scenarioType === 'sim_early_debt_payoff' && (
              <div className="space-y-1.5">
                <label className="font-bold opacity-80">{t('sim_debt_to_pay')}</label>
                {debts.length === 0 ? (
                  <p className="text-[10px] text-rose-500">{isAr ? 'لا توجد ديون مسجلة حالياً لسدادها.' : 'No active debts to payoff.'}</p>
                ) : (
                  <select
                    value={debtIdToPayOff}
                    onChange={(e) => setDebtIdToPayOff(e.target.value)}
                    className={`w-full p-2.5 rounded-xl border focus:outline-none focus:ring-1 focus:ring-emerald-500
                      ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-700'}`}
                  >
                    {debts.map(d => (
                      <option key={d.id} value={d.id}>{d.name} ({formatCurrency(d.monthly_installment, 'EGP', language)})</option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {scenarioType === 'sim_use_reserve' && (
              <div className="space-y-1.5">
                <label className="font-bold opacity-80">{t('sim_reserve_used')} ({isAr ? 'بالعملة الأساسية' : `in ${baseCurrency}`})</label>
                <input
                  type="number"
                  value={reserveUsed}
                  onChange={(e) => setReserveUsed(e.target.value)}
                  placeholder="5000"
                  className={`w-full p-2.5 rounded-xl border focus:outline-none focus:ring-1 focus:ring-emerald-500
                    ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                />
              </div>
            )}
          </div>
        </div>

        {/* Before and After Visual Comparisons */}
        {result && (
          <div className="lg:col-span-2 space-y-6">
            {/* Impact Explanation block */}
            <div className={`p-4.5 rounded-2xl border font-semibold flex items-center gap-3.5
              ${getImpactColor(result.impactLevel)}`}
            >
              <ShieldAlert className="w-6 h-6 shrink-0" />
              <div>
                <span className="text-[10px] uppercase font-bold block opacity-75">{t('scenarioImpact')}: {result.impactLevel}</span>
                <p className="mt-0.5 leading-relaxed">{isAr ? result.impactExplanationAr : result.impactExplanationEn}</p>
              </div>
            </div>

            {/* Split cards before / after */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Before Card */}
              <div className={`p-5 rounded-3xl border shadow-lg space-y-4
                ${theme === 'dark' ? 'bg-slate-900/30 border-slate-800/80 opacity-75' : 'bg-white border-slate-200 shadow-sm opacity-85'}`}
              >
                <h4 className="font-bold text-slate-400 border-b border-slate-800/10 pb-2">{t('scenarioBefore')}</h4>
                
                <div className="space-y-3.5 font-semibold">
                  <div className="flex justify-between">
                    <span>{isAr ? 'النقاط الإجمالية' : 'Overall Score'}</span>
                    <span className={`font-black ${getScoreColor(result.before.financialScore)}`}>
                      {formatNumber(result.before.financialScore, language)} / ١٠٠
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span>{t('monthlyRemainingBalance')}</span>
                    <span className="font-black text-slate-300">{formatCurrency(result.before.monthlyRemainingBalance, baseCurrency, language)}</span>
                  </div>

                  <div className="flex justify-between">
                    <span>{t('debtToIncomeRatio')}</span>
                    <span>{formatPercent(result.before.debtToIncomeRatio, language)}</span>
                  </div>

                  <div className="flex justify-between">
                    <span>{t('monthsCoveredByReserve')}</span>
                    <span>{result.before.monthsCoveredByReserve.toFixed(1)} {t('months')}</span>
                  </div>

                  <div className="flex justify-between">
                    <span>{isAr ? 'تكلفة التمويل والديون' : 'Total Debt Liability'}</span>
                    <span>{formatCurrency(result.before.totalFinancingCost, baseCurrency, language)}</span>
                  </div>
                </div>
              </div>

              {/* After Card (Simulated) */}
              <div className={`p-6 rounded-3xl border shadow-xl space-y-4 bg-gradient-to-tr from-slate-950 to-slate-900 border-slate-800 text-white`}
              >
                <h4 className="font-bold text-emerald-400 border-b border-white/10 pb-2 flex items-center justify-between">
                  <span>{t('scenarioAfter')}</span>
                  <ArrowRightLeft className="w-4 h-4 text-emerald-400" />
                </h4>
                
                <div className="space-y-3.5 font-semibold">
                  {/* Score */}
                  <div className="flex justify-between">
                    <span>{isAr ? 'النقاط المقترحة' : 'Simulated Score'}</span>
                    <span className={`font-black ${getScoreColor(result.after.financialScore)}`}>
                      {formatNumber(result.after.financialScore, language)} / ١٠٠
                    </span>
                  </div>

                  {/* Surplus */}
                  <div className="flex justify-between">
                    <span>{t('monthlyRemainingBalance')}</span>
                    <span className={`font-black flex items-center gap-1 ${result.after.monthlyRemainingBalance >= result.before.monthlyRemainingBalance ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {formatCurrency(result.after.monthlyRemainingBalance, baseCurrency, language)}
                      {result.after.monthlyRemainingBalance >= result.before.monthlyRemainingBalance ? (
                        <ArrowUpRight className="w-4.5 h-4.5 shrink-0" />
                      ) : (
                        <ArrowDownRight className="w-4.5 h-4.5 shrink-0" />
                      )}
                    </span>
                  </div>

                  {/* Debt Ratio */}
                  <div className="flex justify-between">
                    <span>{t('debtToIncomeRatio')}</span>
                    <span className={result.after.debtToIncomeRatio > result.before.debtToIncomeRatio ? 'text-rose-400' : 'text-emerald-400'}>
                      {formatPercent(result.after.debtToIncomeRatio, language)}
                    </span>
                  </div>

                  {/* Reserve Coverage */}
                  <div className="flex justify-between">
                    <span>{t('monthsCoveredByReserve')}</span>
                    <span className={result.after.monthsCoveredByReserve < result.before.monthsCoveredByReserve ? 'text-rose-400' : 'text-emerald-400'}>
                      {result.after.monthsCoveredByReserve.toFixed(1)} {t('months')}
                    </span>
                  </div>

                  {/* Financing Cost */}
                  <div className="flex justify-between">
                    <span>{isAr ? 'تكلفة التمويل والديون' : 'Total Debt Liability'}</span>
                    <span className={result.after.totalFinancingCost > result.before.totalFinancingCost ? 'text-rose-400' : 'text-emerald-400'}>
                      {formatCurrency(result.after.totalFinancingCost, baseCurrency, language)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
