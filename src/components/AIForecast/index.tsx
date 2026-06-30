import React from 'react';
import { useTranslation } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { IncomeSource, Expense, Debt, FinancialSnapshot } from '../../types';
import { generateAIForecast } from '../../utils/aiForecasting';
import { formatCurrency, formatPercent, formatNumber } from '../../utils/format';
import { 
  Brain, TrendingUp, TrendingDown, RefreshCw, Sparkles, 
  HelpCircle, ShieldCheck, ShieldAlert, Award, Compass
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, 
  Legend, CartesianGrid, ReferenceLine 
} from 'recharts';

interface AIForecastProps {
  incomes: IncomeSource[];
  expenses: Expense[];
  debts: Debt[];
  snapshots: FinancialSnapshot[];
  rates: Record<string, number>;
}

export const AIForecast: React.FC<AIForecastProps> = ({
  incomes, expenses, debts, snapshots, rates
}) => {
  const { t, language, dir } = useTranslation();
  const { theme } = useTheme();
  const { profile } = useAuth();
  
  const baseCurrency = profile?.main_currency || 'USD';
  const isAr = language === 'ar';

  // Run the AI Forecasting engine
  const forecast = generateAIForecast(snapshots, incomes, expenses, debts, baseCurrency, rates);

  // Compile timeline data for the trend chart
  // Historical snapshots (actuals) + forecasts (dotted)
  const chartData = [
    ...snapshots.map(s => ({
      name: s.snapshot_date.substring(5, 7) + '/' + s.snapshot_date.substring(2, 4),
      type: isAr ? 'فعلي' : 'Actual',
      income: Math.round(s.total_income),
      expenses: Math.round(s.total_expenses + s.total_installments),
    })),
    {
      name: isAr ? 'الشهر الحالي (متوقع)' : 'This Month (Proj)',
      type: isAr ? 'توقع ذكي' : 'AI Forecast',
      income: Math.round(forecast.thisMonth.income),
      expenses: Math.round(forecast.thisMonth.expenses),
    },
    {
      name: isAr ? 'الشهر المقبل (متوقع)' : 'Next Month (Proj)',
      type: isAr ? 'توقع ذكي' : 'AI Forecast',
      income: Math.round(forecast.nextMonth.income),
      expenses: Math.round(forecast.nextMonth.expenses),
    }
  ];

  // Helper colors
  const getTrendColor = (trend: string) => {
    if (trend === 'Improving') return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    if (trend === 'Declining') return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
    return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
  };

  const getLivingColor = (lvl: string) => {
    switch (lvl) {
      case 'Luxurious': return 'text-teal-400 border-teal-500/20 bg-teal-500/5';
      case 'Balanced': return 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5';
      case 'Stressed': return 'text-amber-400 border-amber-500/20 bg-amber-500/5';
      default: return 'text-rose-400 border-rose-500/20 bg-rose-500/5';
    }
  };

  return (
    <div className="space-y-6">
      {/* Dynamic Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/10">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <span>{isAr ? 'التحليلات والتوقعات الذكية (AI Forecast)' : 'AI Predictive Forecasts'}</span>
          </h2>
          <span className="text-xs opacity-60 block mt-1">
            {isAr 
              ? 'نموذج إحصائي ذكي يتوقع نفقاتك المعيشية ونسب الادخار للشهر الحالي والمقبل بناءً على تاريخ معاملاتك' 
              : 'Statistical forecasting engine predicting living standards and savings rates for this and next month'}
          </span>
        </div>

        <div className={`px-3.5 py-1.5 rounded-xl border flex items-center gap-1.5 text-xs font-bold
          ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}
        >
          <Sparkles className="w-4 h-4 text-amber-400 animate-spin-slow" />
          <span>{isAr ? `ثقة النموذج: ${forecast.confidence}%` : `Model Confidence: ${forecast.confidence}%`}</span>
        </div>
      </div>

      {/* AI Explanation Glow card */}
      <div className={`p-6 rounded-3xl border shadow-xl flex flex-col md:flex-row items-start md:items-center gap-5 relative overflow-hidden transition-all duration-300 hover:shadow-emerald-500/5
        ${theme === 'dark' 
          ? 'bg-slate-900/40 border-slate-800/80 shadow-slate-950/20' 
          : 'bg-white border-slate-200 shadow-sm'}`}
      >
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border
          ${getTrendColor(forecast.trend)}`}
        >
          {forecast.trend === 'Improving' ? (
            <TrendingUp className="w-6 h-6" />
          ) : forecast.trend === 'Declining' ? (
            <TrendingDown className="w-6 h-6 animate-pulse" />
          ) : (
            <Compass className="w-6 h-6" />
          )}
        </div>

        <div className="flex-1 space-y-1.5 text-xs">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-sm">{isAr ? 'توصيات المساعد الذكي' : 'AI Recommendation'}</h3>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase ${getTrendColor(forecast.trend)}`}>
              {isAr ? forecast.trendLabelAr : forecast.trendLabelEn}
            </span>
          </div>
          <p className="leading-relaxed opacity-85 text-[13px] font-medium">
            {isAr ? forecast.explanationAr : forecast.explanationEn}
          </p>
        </div>
      </div>

      {/* Side-by-side Forecast grids */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
        {/* Last Month Actuals */}
        <div className={`p-5.5 rounded-3xl border shadow-lg space-y-4 flex flex-col justify-between
          ${theme === 'dark' ? 'bg-slate-900/20 border-slate-800/60 opacity-60' : 'bg-slate-50 border-slate-200/60 opacity-80'}`}
        >
          <div>
            <h4 className="font-bold text-slate-400 border-b border-slate-800/10 pb-2">{isAr ? 'الشهر الماضي (فعلي)' : 'Last Month (Actual)'}</h4>
            {forecast.lastMonth ? (
              <div className="space-y-3.5 font-semibold mt-4">
                <div className="flex justify-between">
                  <span>{t('totalMonthlyIncome')}</span>
                  <span>{formatCurrency(forecast.lastMonth.income, baseCurrency, language)}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('totalMonthlyExpenses')}</span>
                  <span>{formatCurrency(forecast.lastMonth.expenses, baseCurrency, language)}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('monthlyRemainingBalance')}</span>
                  <span className={forecast.lastMonth.savings >= 0 ? 'text-emerald-500' : 'text-rose-500'}>
                    {formatCurrency(forecast.lastMonth.savings, baseCurrency, language)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>{t('scoreSavingsRate')}</span>
                  <span>{forecast.lastMonth.savingsRate.toFixed(0)}%</span>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center opacity-60 font-medium">
                {isAr ? 'لا توجد بيانات سابقة' : 'No historical data'}
              </div>
            )}
          </div>
          {forecast.lastMonth && (
            <div className={`p-2.5 rounded-xl border text-center font-bold mt-4 ${getLivingColor(forecast.lastMonth.livingStandard)}`}>
              {isAr ? forecast.lastMonth.livingStandardLabelAr : forecast.lastMonth.livingStandardLabelEn}
            </div>
          )}
        </div>

        {/* This Month AI Forecast */}
        <div className={`p-6 rounded-3xl border shadow-xl space-y-4 flex flex-col justify-between
          ${theme === 'dark' ? 'bg-slate-900/40 border-slate-800/80 shadow-slate-950/20' : 'bg-white border-slate-200'}`}
        >
          <div>
            <h4 className="font-bold text-sky-400 border-b border-sky-500/20 pb-2 flex items-center gap-1">
              <Sparkles className="w-4 h-4 text-sky-400" />
              <span>{isAr ? 'الشهر الحالي (توقعات)' : 'This Month (Projected)'}</span>
            </h4>
            <div className="space-y-3.5 font-semibold mt-4">
              <div className="flex justify-between">
                <span>{t('totalMonthlyIncome')}</span>
                <span className="font-extrabold">{formatCurrency(forecast.thisMonth.income, baseCurrency, language)}</span>
              </div>
              <div className="flex justify-between">
                <span>{t('totalMonthlyExpenses')}</span>
                <span className="font-extrabold">{formatCurrency(forecast.thisMonth.expenses, baseCurrency, language)}</span>
              </div>
              <div className="flex justify-between">
                <span>{t('monthlyRemainingBalance')}</span>
                <span className={`font-black ${forecast.thisMonth.savings >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {formatCurrency(forecast.thisMonth.savings, baseCurrency, language)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>{t('scoreSavingsRate')}</span>
                <span className="font-extrabold">{forecast.thisMonth.savingsRate.toFixed(0)}%</span>
              </div>
            </div>
          </div>
          <div className={`p-2.5 rounded-xl border text-center font-bold mt-4 ${getLivingColor(forecast.thisMonth.livingStandard)}`}>
            <span>{isAr ? 'مستوى المعيشة المتوقع:' : 'Proj Standard:'}</span>{' '}
            <strong className="block mt-0.5">{isAr ? forecast.thisMonth.livingStandardLabelAr : forecast.thisMonth.livingStandardLabelEn}</strong>
          </div>
        </div>

        {/* Next Month AI Forecast */}
        <div className={`p-6 rounded-3xl border shadow-xl space-y-4 flex flex-col justify-between bg-gradient-to-tr from-slate-950 to-slate-900 border-slate-800 text-white`}
        >
          <div>
            <h4 className="font-bold text-emerald-400 border-b border-white/10 pb-2 flex items-center gap-1.5">
              <Brain className="w-4.5 h-4.5 text-emerald-400" />
              <span>{isAr ? 'الشهر المقبل (توقعات)' : 'Next Month (Projected)'}</span>
            </h4>
            <div className="space-y-3.5 font-semibold mt-4">
              <div className="flex justify-between">
                <span>{t('totalMonthlyIncome')}</span>
                <span className="font-extrabold text-emerald-400">{formatCurrency(forecast.nextMonth.income, baseCurrency, language)}</span>
              </div>
              <div className="flex justify-between">
                <span>{t('totalMonthlyExpenses')}</span>
                <span className="font-extrabold text-rose-400">{formatCurrency(forecast.nextMonth.expenses, baseCurrency, language)}</span>
              </div>
              <div className="flex justify-between">
                <span>{t('monthlyRemainingBalance')}</span>
                <span className={`font-black ${forecast.nextMonth.savings >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {formatCurrency(forecast.nextMonth.savings, baseCurrency, language)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>{t('scoreSavingsRate')}</span>
                <span className="font-extrabold text-sky-400">{forecast.nextMonth.savingsRate.toFixed(0)}%</span>
              </div>
            </div>
          </div>
          <div className={`p-2.5 rounded-xl border text-center font-bold mt-4 ${getLivingColor(forecast.nextMonth.livingStandard)}`}>
            <span>{isAr ? 'مستوى المعيشة المتوقع:' : 'Proj Standard:'}</span>{' '}
            <strong className="block mt-0.5">{isAr ? forecast.nextMonth.livingStandardLabelAr : forecast.nextMonth.livingStandardLabelEn}</strong>
          </div>
        </div>
      </div>

      {/* Visual Chart showing History & Projections */}
      <div className={`p-6 rounded-3xl border shadow-lg space-y-4
        ${theme === 'dark' ? 'bg-slate-900/40 border-slate-800/80 shadow-slate-950/20' : 'bg-white border-slate-200'}`}
      >
        <h3 className="font-bold text-sm border-b border-slate-800/10 pb-2">{isAr ? 'مسار الدخل والمصاريف التنبئي' : 'Predictive Inflows & Outflows Track'}</h3>
        <div className="h-80 w-full text-xs">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorIncFore" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorExpFore" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#1e293b' : '#f1f5f9'} />
              <XAxis dataKey="name" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff',
                  borderColor: theme === 'dark' ? '#1e293b' : '#e2e8f0',
                  borderRadius: '12px'
                }} 
              />
              <Legend verticalAlign="top" height={36} />
              <Area type="monotone" name={t('totalMonthlyIncome')} dataKey="income" stroke="#10b981" fillOpacity={1} fill="url(#colorIncFore)" strokeWidth={2.5} />
              <Area type="monotone" name={t('totalMonthlyExpenses')} dataKey="expenses" stroke="#ef4444" fillOpacity={1} fill="url(#colorExpFore)" strokeWidth={2.5} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
