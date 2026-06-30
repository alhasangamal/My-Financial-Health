import React, { useState } from 'react';
import { useTranslation } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { FinancialSummary, Expense, IncomeSource, Debt, FinancialSnapshot } from '../../types';
import { formatCurrency, formatPercent, formatNumber } from '../../utils/format';
import { getExchangeRates } from '../../services/db';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  AreaChart, Area, Legend, LineChart, Line, CartesianGrid 
} from 'recharts';
import { Calendar, Download, FileText, Filter, Table, Info, X, Sparkles, TrendingUp, Coins, Target, Award, Activity, RefreshCw } from 'lucide-react';

const CATEGORIES = [
  'cat_living', 'cat_food', 'cat_housing', 'cat_electricity', 'cat_water', 'cat_gas', 
  'cat_internet', 'cat_mobile', 'cat_transportation', 'cat_fuel', 'cat_maintenance', 
  'cat_insurance', 'cat_registration', 'cat_medical', 'cat_education', 'cat_family', 
  'cat_entertainment', 'cat_subscriptions', 'cat_travel', 'cat_charity', 'cat_shopping', 'cat_other'
];

interface ReportsProps {
  summary: FinancialSummary;
  incomes: IncomeSource[];
  expenses: Expense[];
  debts: Debt[]; // array of debts
  snapshots: FinancialSnapshot[];
}

export const Reports: React.FC<ReportsProps> = ({ 
  summary, incomes, expenses, debts, snapshots 
}) => {
  const { t, language } = useTranslation();
  const { theme } = useTheme();
  const { profile } = useAuth();
  
  const baseCurrency = profile?.main_currency || 'USD';
  const isAr = language === 'ar';

  // Filters State
  const [range, setRange] = useState<'monthly' | 'annual' | '5year'>('monthly');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterEssential, setFilterEssential] = useState<'all' | 'essential' | 'optional'>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [showMonthlySummary, setShowMonthlySummary] = useState(false);

  // Filter expenses list by Category, Priority, and Dates
  const filteredExpenses = expenses.filter(exp => {
    // 1. Category Filter
    if (filterCategory !== 'all' && exp.category !== filterCategory) return false;
    
    // 2. Priority Filter
    if (filterEssential === 'essential' && !exp.is_essential) return false;
    if (filterEssential === 'optional' && exp.is_essential) return false;

    // 3. Date Filters
    if (startDate && exp.start_date < startDate) return false;
    if (endDate && exp.start_date > endDate) return false;

    return true;
  });

  // Export to CSV Function
  const exportToCSV = () => {
    // Compile data into a CSV string
    const headers = isAr
      ? 'الاسم,الفئة,النوع,المبلغ,العملة,التكرار,الأهمية\n'
      : 'Name,Category,Type,Amount,Currency,Frequency,Importance\n';
      
    const rows = filteredExpenses.map(e => {
      const imp = e.is_essential ? t('essential') : t('optional');
      const type = e.is_fixed ? t('fixed') : t('variable');
      return `"${e.name}","${t(e.category)}","${type}",${e.amount},"${e.currency}","${t(e.frequency)}","${imp}"`;
    }).join('\n');

    const csvContent = '\uFEFF' + headers + rows; // Add UTF-8 BOM for Arabic excel compatibility
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `financial_report_${range}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export to Excel (using CSV formatted tab-separated values download)
  const exportToExcel = () => {
    const headers = isAr
      ? 'المؤشر المالي\tالقيمة الفعالة\tالعملة\n'
      : 'Financial Indicator\tValue\tCurrency\n';

    const rows = [
      [t('totalMonthlyIncome'), Math.round(summary.totalMonthlyIncome)],
      [t('totalMonthlyExpenses'), Math.round(summary.totalMonthlyExpenses)],
      [t('totalMonthlyInstallments'), Math.round(summary.totalMonthlyInstallments)],
      [t('monthlyRemainingBalance'), Math.round(summary.monthlyRemainingBalance)],
      [t('totalEmergencyReserve'), Math.round(summary.totalEmergencyReserve)],
      [t('netWorth'), Math.round(summary.netWorth)],
    ].map(r => `${r[0]}\t${r[1]}\t${baseCurrency}`).join('\n');

    const excelContent = '\uFEFF' + headers + rows;
    const blob = new Blob([excelContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `financial_summary_${range}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export to PDF (Native print layout)
  const printReport = () => {
    window.print();
  };

  // Format historical trend data for charts
  const historyData = snapshots.map(s => ({
    date: s.snapshot_date,
    netWorth: s.net_worth,
    score: s.financial_score,
    surplus: s.monthly_surplus,
  }));

  const expenseCategoriesData = Object.entries(
    filteredExpenses.reduce((acc: Record<string, number>, exp) => {
      let val = exp.amount;
      if (exp.frequency === 'annual') val = exp.amount / 12;
      else if (exp.frequency === 'weekly') val = exp.amount * 4.33;
      else if (exp.frequency === 'one-time') return acc;
      
      // Convert to main currency dynamically
      const rates = getExchangeRates();
      const rateFrom = rates[exp.currency] || 1;
      const rateTo = rates[baseCurrency] || 1;
      const valInBase = (val / rateFrom) * rateTo;

      acc[exp.category] = (acc[exp.category] || 0) + valInBase;
      return acc;
    }, {})
  ).map(([cat, val]) => ({
    category: t(cat),
    amount: Math.round(val),
  })).filter(d => d.amount > 0);

  const categoryBudgets = profile?.category_budgets || {};

  const categorySpentMap = filteredExpenses.reduce((acc: Record<string, number>, exp) => {
    let val = exp.amount;
    if (exp.frequency === 'annual') val = exp.amount / 12;
    else if (exp.frequency === 'weekly') val = exp.amount * 4.33;
    else if (exp.frequency === 'one-time') return acc;
    
    const rates = getExchangeRates();
    const rateFrom = rates[exp.currency] || 1;
    const rateTo = rates[baseCurrency] || 1;
    const valInBase = (val / rateFrom) * rateTo;

    acc[exp.category] = (acc[exp.category] || 0) + valInBase;
    return acc;
  }, {} as Record<string, number>);

  const totalIncome = summary.totalMonthlyIncome;
  const essentialExpenses = summary.totalEssentialExpenses;
  const optionalExpenses = summary.totalOptionalExpenses;
  const savingsAndDebt = Math.max(0, totalIncome - essentialExpenses - optionalExpenses);

  const essentialRatio = totalIncome > 0 ? (essentialExpenses / totalIncome) * 100 : 0;
  const optionalRatio = totalIncome > 0 ? (optionalExpenses / totalIncome) * 100 : 0;
  const savingsRatio = totalIncome > 0 ? (savingsAndDebt / totalIncome) * 100 : 0;

  let ruleAdviceAr = '';
  let ruleAdviceEn = '';
  if (essentialRatio > 55) {
    ruleAdviceAr = 'تنبيه: نفقاتك الأساسية تتجاوز الحد الموصى به (50%). يفضل ترشيد الاشتراكات ومحاولة تقليل المصاريف المعيشية الثابتة.';
    ruleAdviceEn = 'Warning: Your essential needs exceed the recommended 50% threshold. Try auditing fixed utility contracts and living costs.';
  } else if (optionalRatio > 35) {
    ruleAdviceAr = 'تنبيه: نفقات الكماليات والترفيه مرتفعة وتتجاوز (30%). ننصح بوضع سقف محدد للأنشطة غير الأساسية.';
    ruleAdviceEn = 'Warning: Your discretionary wants exceed 30% of your income. Consider capping entertainment and luxury subscriptions.';
  } else if (savingsRatio < 15) {
    ruleAdviceAr = 'تنبيه: نسبة ادخارك منخفضة (أقل من 20%). يرجى تقليل المصاريف الاختيارية لبناء رصيد أمان كافٍ.';
    ruleAdviceEn = 'Warning: Your savings rate is below the ideal 20%. Try cutting back on optional items to build your emergency reserves.';
  } else {
    ruleAdviceAr = 'ممتاز: توزيعك المالي ممتاز ومتوافق تماماً مع المعايير المالية السليمة!';
    ruleAdviceEn = 'Excellent: Your financial distribution is highly aligned with standard budgeting guidelines!';
  }

  // Reports KPI Calculations
  const totalSpentInBase = Object.values(categorySpentMap).reduce((sum, v) => sum + v, 0);
  const dailyAverageSpent = totalSpentInBase / 30;

  let highestCategory = '';
  let highestAmount = 0;
  Object.entries(categorySpentMap).forEach(([cat, val]) => {
    if (val > highestAmount) {
      highestAmount = val;
      highestCategory = cat;
    }
  });

  const budgetedCats = CATEGORIES.filter(cat => (categoryBudgets[cat] || 0) > 0);
  const compliantCats = budgetedCats.filter(cat => (categorySpentMap[cat] || 0) <= categoryBudgets[cat]);
  const compliancePercent = budgetedCats.length > 0 ? (compliantCats.length / budgetedCats.length) * 100 : 100;

  return (
    <div className="space-y-6 print:p-0">
      {/* Title */}
      <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-xl font-bold">{t('reportTitle')}</h2>
          <span className="text-xs opacity-60">
            {isAr ? 'عرض تقارير الأداء وتصديرها كملفات للطباعة أو الجداول' : 'Analyze performance trends and export records to spreadsheet sheets'}
          </span>
        </div>

        {/* Download Buttons */}
        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={exportToCSV}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border hover:scale-105 active:scale-95 transition-all cursor-pointer
              ${theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-700'}`}
          >
            <Download className="w-4 h-4 text-emerald-500" />
            <span>{t('csvExport')}</span>
          </button>
          
          <button
            onClick={exportToExcel}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border hover:scale-105 active:scale-95 transition-all cursor-pointer
              ${theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-700'}`}
          >
            <Table className="w-4 h-4 text-sky-500" />
            <span>{t('excelExport')}</span>
          </button>

          <button
            onClick={printReport}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border hover:scale-105 active:scale-95 transition-all cursor-pointer
              ${theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-700'}`}
          >
            <FileText className="w-4 h-4 text-emerald-500" />
            <span>{t('pdfExport')}</span>
          </button>

          <button
            onClick={() => setShowMonthlySummary(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-md shadow-emerald-500/10 cursor-pointer hover:scale-105 transition-transform"
          >
            <Sparkles className="w-4 h-4 animate-pulse" />
            <span>{isAr ? 'ملخص الشهر التحليلي (AI)' : 'Monthly Summary Report (AI)'}</span>
          </button>
        </div>
      </div>

      {/* Financial IQ KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4.5 print:hidden">
        {/* Daily average card */}
        <div className={`p-4.5 rounded-3xl border shadow-lg flex items-center justify-between gap-3 hover:scale-[1.02] transition-transform
          ${theme === 'dark' ? 'bg-slate-900/40 border-slate-800/80 shadow-slate-950/20' : 'bg-white border-slate-200 shadow-sm'}`}
        >
          <div className="space-y-1">
            <span className="text-[10px] opacity-60 font-bold block uppercase tracking-wider text-start">
              {isAr ? 'متوسط الصرف اليومي' : 'Daily Average Spent'}
            </span>
            <span className={`text-lg font-black tracking-tight block text-start ${theme === 'dark' ? 'text-slate-50' : 'text-slate-900'}`}>
              {formatCurrency(Math.round(dailyAverageSpent), baseCurrency, language)}
            </span>
          </div>
          <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-500">
            <Coins className="w-5 h-5" />
          </div>
        </div>

        {/* Highest Category card */}
        <div className={`p-4.5 rounded-3xl border shadow-lg flex items-center justify-between gap-3 hover:scale-[1.02] transition-transform
          ${theme === 'dark' ? 'bg-slate-900/40 border-slate-800/80 shadow-slate-950/20' : 'bg-white border-slate-200 shadow-sm'}`}
        >
          <div className="space-y-1 overflow-hidden text-start">
            <span className="text-[10px] opacity-60 font-bold block uppercase tracking-wider">
              {isAr ? 'أعلى فئة نفقات' : 'Top Spending Category'}
            </span>
            <span className="text-base font-extrabold text-rose-500 truncate block">
              {highestCategory ? t(highestCategory) : (isAr ? 'لا توجد' : 'None')}
            </span>
          </div>
          <div className="p-2.5 rounded-2xl bg-rose-500/10 text-rose-500 shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        {/* Savings Rate card */}
        <div className={`p-4.5 rounded-3xl border shadow-lg flex items-center justify-between gap-3 hover:scale-[1.02] transition-transform
          ${theme === 'dark' ? 'bg-slate-900/40 border-slate-800/80 shadow-slate-950/20' : 'bg-white border-slate-200 shadow-sm'}`}
        >
          <div className="space-y-1 text-start">
            <span className="text-[10px] opacity-60 font-bold block uppercase tracking-wider">
              {isAr ? 'معدل الادخار الفعلي' : 'Current Savings Rate'}
            </span>
            <span className={`text-base font-extrabold block ${savingsRatio >= 20 ? 'text-emerald-500' : 'text-amber-500'}`}>
              {savingsRatio.toFixed(0)}%
            </span>
          </div>
          <div className="p-2.5 rounded-2xl bg-sky-500/10 text-sky-500">
            <Target className="w-5 h-5" />
          </div>
        </div>

        {/* Budget Compliance card */}
        <div className={`p-4.5 rounded-3xl border shadow-lg flex items-center justify-between gap-3 hover:scale-[1.02] transition-transform
          ${theme === 'dark' ? 'bg-slate-900/40 border-slate-800/80 shadow-slate-950/20' : 'bg-white border-slate-200 shadow-sm'}`}
        >
          <div className="space-y-1 text-start">
            <span className="text-[10px] opacity-60 font-bold block uppercase tracking-wider">
              {isAr ? 'الالتزام بالميزانية' : 'Budget Compliance'}
            </span>
            <span className={`text-base font-extrabold block ${compliancePercent >= 80 ? 'text-emerald-500' : 'text-rose-500'}`}>
              {compliancePercent.toFixed(0)}%
            </span>
          </div>
          <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-500">
            <Award className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Print ONLY header */}
      <div className="hidden print:block text-center space-y-2 border-b pb-4 mb-6">
        <h1 className="text-2xl font-black text-slate-800">{t('appName')}</h1>
        <p className="text-xs text-slate-500">{isAr ? 'تقرير الحالة المالية الشامل' : 'Comprehensive Financial Health Report'}</p>
        <span className="text-[10px] text-slate-400">{isAr ? 'تاريخ التوليد:' : 'Generated on:'} {new Date().toLocaleDateString()}</span>
      </div>

      {/* Filter Bar */}
      <div className={`p-4 rounded-2xl border flex flex-wrap gap-4 items-center justify-between print:hidden
        ${theme === 'dark' ? 'bg-slate-900/20 border-slate-800/80' : 'bg-white border-slate-200 shadow-sm'}`}
      >
        <div className="flex flex-wrap gap-3.5 items-center text-xs">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Filter className="w-4 h-4" />
            <span>{t('reportFilter')}:</span>
          </div>

          {/* Date range selection */}
          <div className="flex rounded-xl overflow-hidden border border-slate-800/10">
            {[
              { id: 'monthly', label: t('reportMonthly') },
              { id: 'annual', label: t('reportAnnual') },
              { id: '5year', label: t('reportFiveYears') },
            ].map(b => (
              <button
                key={b.id}
                onClick={() => setRange(b.id as any)}
                className={`px-3 py-1.5 font-bold transition-colors cursor-pointer
                  ${range === b.id 
                    ? 'bg-emerald-500 text-white' 
                    : theme === 'dark' ? 'bg-slate-950 text-slate-400 hover:bg-slate-900' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
              >
                {b.label}
              </button>
            ))}
          </div>

          {/* Essential vs Optional filter */}
          <select
            value={filterEssential}
            onChange={(e) => setFilterEssential(e.target.value as any)}
            className={`p-2 rounded-xl border focus:outline-none focus:ring-1 focus:ring-emerald-500
              ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-700'}`}
          >
            <option value="all">{isAr ? 'الأولويات (الكل)' : 'All Priorities'}</option>
            <option value="essential">{t('essential')}</option>
            <option value="optional">{t('optional')}</option>
          </select>

          {/* Category Filter */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className={`p-2 rounded-xl border focus:outline-none focus:ring-1 focus:ring-emerald-500
              ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-700'}`}
          >
            <option value="all">{isAr ? 'كل الفئات' : 'All Categories'}</option>
            {[
              'cat_living', 'cat_food', 'cat_housing', 'cat_electricity', 'cat_water', 'cat_gas', 
              'cat_internet', 'cat_mobile', 'cat_transportation', 'cat_fuel', 'cat_maintenance', 
              'cat_insurance', 'cat_registration', 'cat_medical', 'cat_education', 'cat_family', 
              'cat_entertainment', 'cat_subscriptions', 'cat_travel', 'cat_charity', 'cat_shopping', 'cat_other'
            ].map(cat => (
              <option key={cat} value={cat}>{t(cat)}</option>
            ))}
          </select>

          {/* Start Date */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] opacity-60">{isAr ? 'من:' : 'From:'}</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={`p-1.5 rounded-lg border text-[10px] focus:outline-none focus:ring-1 focus:ring-emerald-500
                ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-700'}`}
            />
          </div>

          {/* End Date */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] opacity-60">{isAr ? 'إلى:' : 'To:'}</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className={`p-1.5 rounded-lg border text-[10px] focus:outline-none focus:ring-1 focus:ring-emerald-500
                ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-700'}`}
            />
          </div>

          {/* Reset Filters button */}
          {(filterCategory !== 'all' || filterEssential !== 'all' || startDate !== '' || endDate !== '' || range !== 'monthly') && (
            <button
              onClick={() => {
                setFilterCategory('all');
                setFilterEssential('all');
                setStartDate('');
                setEndDate('');
                setRange('monthly');
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[10px] font-bold text-rose-500 border-rose-500/20 hover:border-rose-500/50 bg-rose-500/5 cursor-pointer hover:scale-105 transition-transform shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{isAr ? 'إعادة ضبط' : 'Reset'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Grid of Report summaries */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Category breakdown bar chart */}
        <div className={`p-5 rounded-3xl border shadow-lg space-y-4
          ${theme === 'dark' ? 'bg-slate-900/40 border-slate-800/80' : 'bg-white border-slate-200 shadow-sm'}`}
        >
          <h3 className="font-bold text-sm border-b border-slate-800/10 pb-2">{t('expensesByCategory')}</h3>
          <div className="h-64 w-full text-xs">
            {expenseCategoriesData.length === 0 ? (
              <div className="h-full flex items-center justify-center opacity-60 font-semibold">
                {isAr ? 'لا توجد بيانات مصاريف كافية للعرض' : 'No expenses match the filter selection'}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={expenseCategoriesData} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="barGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.85} />
                      <stop offset="100%" stopColor="#ef4444" stopOpacity={0.95} />
                    </linearGradient>
                  </defs>
                  <XAxis type="number" stroke="#64748b" />
                  <YAxis dataKey="category" type="category" stroke="#64748b" width={80} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff',
                      borderColor: theme === 'dark' ? '#1e293b' : '#e2e8f0',
                      borderRadius: '12px'
                    }} 
                  />
                  <Bar dataKey="amount" name={t('amount')} fill="url(#barGrad)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Historical Net Worth Trend */}
        <div className={`p-5 rounded-3xl border shadow-lg space-y-4
          ${theme === 'dark' ? 'bg-slate-900/40 border-slate-800/80' : 'bg-white border-slate-200 shadow-sm'}`}
        >
          <h3 className="font-bold text-sm border-b border-slate-800/10 pb-2">{t('netWorthTrend')}</h3>
          <div className="h-64 w-full text-xs">
            {historyData.length === 0 ? (
              <div className="h-full flex items-center justify-center opacity-60 font-semibold">
                {isAr ? 'لا توجد بيانات تاريخية كافية حالياً' : 'Insufficient historical snapshots'}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={historyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorWorth" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#1e293b' : '#f1f5f9'} />
                  <XAxis dataKey="date" stroke="#64748b" />
                  <YAxis stroke="#64748b" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff',
                      borderColor: theme === 'dark' ? '#1e293b' : '#e2e8f0',
                      borderRadius: '12px'
                    }} 
                  />
                  <Area type="monotone" name={t('netWorth')} dataKey="netWorth" stroke="#10b981" fillOpacity={1} fill="url(#colorWorth)" strokeWidth={2.5} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Score History */}
        <div className={`p-5 rounded-3xl border shadow-lg space-y-4 md:col-span-2
          ${theme === 'dark' ? 'bg-slate-900/40 border-slate-800/80' : 'bg-white border-slate-200 shadow-sm'}`}
        >
          <h3 className="font-bold text-sm border-b border-slate-800/10 pb-2">سجل نقاط الصحة المالية (Score History)</h3>
          <div className="h-64 w-full text-xs">
            {historyData.length === 0 ? (
              <div className="h-full flex items-center justify-center opacity-60 font-semibold">
                {isAr ? 'لا توجد بيانات تاريخية كافية حالياً' : 'Insufficient historical snapshots'}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={historyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#1e293b' : '#f1f5f9'} />
                  <XAxis dataKey="date" stroke="#64748b" />
                  <YAxis stroke="#64748b" domain={[0, 100]} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff',
                      borderColor: theme === 'dark' ? '#1e293b' : '#e2e8f0',
                      borderRadius: '12px'
                    }} 
                  />
                  <Line type="monotone" name="درجة الصحة المالية" dataKey="score" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Detailed Transactions List */}
      <div className={`p-6 rounded-3xl border shadow-lg space-y-4 print:block
        ${theme === 'dark' ? 'bg-slate-900/40 border-slate-800/80 shadow-slate-950/20' : 'bg-white border-slate-200 shadow-sm'}`}
      >
        <h3 className="font-bold text-sm border-b border-slate-800/10 pb-2 flex items-center justify-between">
          <span>{isAr ? 'سجل المعاملات المصفّاة تفصيلياً' : 'Detailed Log of Filtered Transactions'}</span>
          <span className="text-[10px] opacity-60 font-semibold">
            {isAr ? `إجمالي القيود: ${filteredExpenses.length}` : `Total entries: ${filteredExpenses.length}`}
          </span>
        </h3>

        {filteredExpenses.length === 0 ? (
          <div className="py-8 text-center opacity-60 text-xs font-semibold">
            {isAr ? 'لا توجد معاملات تطابق خيارات التصفية الحالية.' : 'No transactions match the selected filters.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start border-collapse text-[10px] font-semibold">
              <thead>
                <tr className="opacity-60 border-b border-slate-800/10 text-[9px] uppercase tracking-wider">
                  <th className="py-2 text-start">{t('name')}</th>
                  <th className="py-2 text-start">{t('category')}</th>
                  <th className="py-2 text-start">{t('type')}</th>
                  <th className="py-2 text-start">{t('frequency')}</th>
                  <th className="py-2 text-start">{isAr ? 'الأولوية' : 'Priority'}</th>
                  <th className="py-2 text-end">{t('amount')}</th>
                  <th className="py-2 text-end">{isAr ? 'المعادل بالأساسية' : 'Base Equiv'}</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.map((exp) => {
                  const rates = getExchangeRates();
                  const rateFrom = rates[exp.currency] || 1;
                  const rateTo = rates[baseCurrency] || 1;
                  const amountInBase = (exp.amount / rateFrom) * rateTo;

                  return (
                    <tr 
                      key={exp.id} 
                      className="border-b border-slate-800/5 hover:bg-slate-500/5 transition-colors"
                    >
                      <td className="py-2.5 font-bold text-start">{exp.name}</td>
                      <td className="py-2.5 text-start opacity-90">{t(exp.category)}</td>
                      <td className="py-2.5 text-start opacity-80">{exp.is_fixed ? (isAr ? 'ثابت' : 'Fixed') : (isAr ? 'متغير' : 'Variable')}</td>
                      <td className="py-2.5 text-start opacity-80">{t(exp.frequency)}</td>
                      <td className="py-2.5 text-start">
                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold
                          ${exp.is_essential 
                            ? 'bg-emerald-500/10 text-emerald-500' 
                            : 'bg-amber-500/10 text-amber-500'}`}
                        >
                          {exp.is_essential ? t('essential') : t('optional')}
                        </span>
                      </td>
                      <td className="py-2.5 text-end font-semibold">{formatCurrency(exp.amount, exp.currency, language)}</td>
                      <td className="py-2.5 text-end font-bold text-slate-900 dark:text-slate-100">
                        {formatCurrency(amountInBase, baseCurrency, language)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showMonthlySummary && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 print:p-0 print:static print:bg-transparent">
          <div className={`w-full max-w-4xl p-6 rounded-3xl border shadow-2xl relative space-y-6 print:border-none print:shadow-none print:p-0 print:static
            ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}
          >
            {/* Modal Close Button */}
            <button 
              onClick={() => setShowMonthlySummary(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-slate-500/10 text-slate-400 print:hidden cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Report Header */}
            <div className="text-center space-y-2 border-b border-slate-800/10 pb-4">
              <h2 className="text-xl font-black text-emerald-500">{t('appName')}</h2>
              <h3 className="text-base font-bold">{isAr ? 'التقرير المالي التحليلي الشامل لملخص الشهر' : 'Comprehensive Monthly Performance Summary'}</h3>
              <p className="text-[10px] opacity-60 font-semibold">{isAr ? 'تاريخ التوليد:' : 'Date generated:'} {new Date().toLocaleDateString()}</p>
            </div>

            {/* Income & Expenses Quick Card Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div className={`p-3 rounded-2xl border ${theme === 'dark' ? 'bg-slate-950/50 border-slate-850' : 'bg-slate-50/50 border-slate-100'}`}>
                <span className="text-[10px] opacity-60 font-bold block">{t('totalMonthlyIncome')}</span>
                <span className="text-sm font-extrabold text-emerald-500">{formatCurrency(summary.totalMonthlyIncome, baseCurrency, language)}</span>
              </div>
              <div className={`p-3 rounded-2xl border ${theme === 'dark' ? 'bg-slate-950/50 border-slate-850' : 'bg-slate-50/50 border-slate-100'}`}>
                <span className="text-[10px] opacity-60 font-bold block">{t('totalMonthlyExpenses')}</span>
                <span className="text-sm font-extrabold text-rose-500">{formatCurrency(summary.totalMonthlyExpenses, baseCurrency, language)}</span>
              </div>
              <div className={`p-3 rounded-2xl border ${theme === 'dark' ? 'bg-slate-950/50 border-slate-850' : 'bg-slate-50/50 border-slate-100'}`}>
                <span className="text-[10px] opacity-60 font-bold block">{t('totalMonthlyInstallments')}</span>
                <span className="text-sm font-extrabold text-amber-500">{formatCurrency(summary.totalMonthlyInstallments, baseCurrency, language)}</span>
              </div>
              <div className={`p-3 rounded-2xl border ${theme === 'dark' ? 'bg-slate-950/50 border-slate-850' : 'bg-slate-50/50 border-slate-100'}`}>
                <span className="text-[10px] opacity-60 font-bold block">{t('monthlyRemainingBalance')}</span>
                <span className={`text-sm font-extrabold ${summary.monthlyRemainingBalance >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {formatCurrency(summary.monthlyRemainingBalance, baseCurrency, language)}
                </span>
              </div>
            </div>

            {/* Income Sources list */}
            <div className="space-y-2">
              <h4 className="font-bold border-b border-slate-800/10 pb-1 text-xs text-start">{isAr ? 'مصادر الدخل الواردة الفعالة:' : 'Active Inflow Incomes:'}</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-[10px] text-start border-collapse">
                  <thead>
                    <tr className="opacity-60 border-b border-slate-800/10">
                      <th className="py-2 text-start">{t('name')}</th>
                      <th className="py-2 text-start">{isAr ? 'النوع' : 'Type'}</th>
                      <th className="py-2 text-end">{t('amount')}</th>
                      <th className="py-2 text-end">{isAr ? 'بالعملة الأساسية' : 'Base Val'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {incomes.map(inc => {
                      const rates = getExchangeRates();
                      const rateFrom = rates[inc.currency] || 1;
                      const rateTo = rates[baseCurrency] || 1;
                      const amtInBase = (inc.amount / rateFrom) * rateTo;
                      return (
                        <tr key={inc.id} className="border-b border-slate-800/5">
                          <td className="py-2 font-bold text-start">{inc.name}</td>
                          <td className="py-2 opacity-80 text-start">{t(`income_type_${inc.type}`)}</td>
                          <td className="py-2 text-end font-semibold">{formatCurrency(inc.amount, inc.currency, language)}</td>
                          <td className="py-2 text-end font-bold">{formatCurrency(amtInBase, baseCurrency, language)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Budget performance comparison */}
            <div className="space-y-2">
              <h4 className="font-bold border-b border-slate-800/10 pb-1 text-xs text-start">{isAr ? 'مقارنة الصرف بالميزانية المحددة للفئات:' : 'Category Budgets Performance:'}</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-[10px] text-start border-collapse">
                  <thead>
                    <tr className="opacity-60 border-b border-slate-800/10">
                      <th className="py-2 text-start">{t('category')}</th>
                      <th className="py-2 text-end">{isAr ? 'الصرف الفعلي' : 'Spent'}</th>
                      <th className="py-2 text-end">{isAr ? 'الميزانية المحددة' : 'Budget Limit'}</th>
                      <th className="py-2 text-end">{isAr ? 'الالتزام والفرق' : 'Status & Diff'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {CATEGORIES.map(cat => {
                      const spent = Math.round(categorySpentMap[cat] || 0);
                      const budget = categoryBudgets[cat] || 0;
                      if (spent === 0 && budget === 0) return null; // skip inactive
                      const hasBudget = budget > 0;
                      const diff = budget - spent;
                      const isOver = hasBudget && spent > budget;
                      return (
                        <tr key={cat} className="border-b border-slate-800/5">
                          <td className="py-2 font-bold text-start">{t(cat)}</td>
                          <td className="py-2 text-end font-semibold">{formatCurrency(spent, baseCurrency, language)}</td>
                          <td className="py-2 text-end opacity-75">{hasBudget ? formatCurrency(budget, baseCurrency, language) : (isAr ? 'غير محدد' : 'Not set')}</td>
                          <td className={`py-2 text-end font-bold ${isOver ? 'text-rose-500 animate-pulse' : hasBudget ? 'text-emerald-500' : 'opacity-60'}`}>
                            {hasBudget ? (
                              isOver 
                                ? `${isAr ? 'تجاوز بـ' : 'Over by'} ${formatCurrency(Math.abs(diff), baseCurrency, language)}`
                                : `${isAr ? 'وفر' : 'Saved'} ${formatCurrency(diff, baseCurrency, language)}`
                            ) : (isAr ? 'صرف غير محدد بحد' : 'No Limit')}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* AI insights panel */}
            <div className={`p-4 rounded-2xl border text-[11px] leading-relaxed space-y-2 text-start
              ${theme === 'dark' ? 'bg-slate-950 border-slate-850' : 'bg-emerald-50/20 border-emerald-100/50 text-slate-700'}`}
            >
              <h4 className="font-bold text-xs text-emerald-500">{isAr ? 'تحليلات ونظرات صحتِك المالية الذكية:' : 'My Financial Health AI Insights:'}</h4>
              <ul className="list-disc pl-4 rtl:pl-0 rtl:pr-4 space-y-1 opacity-90 font-medium">
                <li>{isAr ? ruleAdviceAr : ruleAdviceEn}</li>
                <li>
                  {summary.monthlyRemainingBalance >= 0 
                    ? (isAr 
                        ? `لقد نجحت في الحفاظ على فائض نقدي بقيمة ${formatCurrency(summary.monthlyRemainingBalance, baseCurrency, language)} هذا الشهر. ننصح بتحويل هذا الفائض تلقائياً إلى صندوق الطوارئ أو الأهداف الادخارية.`
                        : `You successfully maintained a monthly surplus of ${formatCurrency(summary.monthlyRemainingBalance, baseCurrency, language)} this month. Consider auto-allocating this surplus to your emergency reserve.`)
                    : (isAr 
                        ? 'تنبيه: ميزانيتك تعاني من عجز مالي شهري. يرجى مراجعة الاشتراكات والترفيه فوراً لتفادي السحب المكشوف.'
                        : 'Warning: You have a monthly cash deficit. Please review optional subscriptions and leisure costs immediately.')
                  }
                </li>
                <li>
                  {summary.debtToIncomeRatio < 35 
                    ? (isAr 
                        ? `نسبة الديون الحالية (${summary.debtToIncomeRatio.toFixed(0)}%) آمنة وممتازة وضمن النطاق الموصى به عالمياً (أقل من ٣٥%).`
                        : `Your debt-to-income ratio (${summary.debtToIncomeRatio.toFixed(0)}%) is healthy and sits below the standard 35% safe boundary.`)
                    : (isAr 
                        ? `تنبيه: تلتهم الديون والأقساط ${summary.debtToIncomeRatio.toFixed(0)}% من دخلك. هذه النسبة مرتفعة وقد تعوق قدرتك على الادخار. تجنب أي ديون جديدة.`
                        : `Warning: Debt installments consume ${summary.debtToIncomeRatio.toFixed(0)}% of your monthly inflow. Avoid opening new installment channels.`)
                  }
                </li>
              </ul>
            </div>

            {/* Print and Close controls */}
            <div className="flex justify-end gap-3 pt-2 print:hidden">
              <button
                onClick={() => setShowMonthlySummary(false)}
                className={`px-4 py-2 rounded-xl font-semibold border transition-all cursor-pointer text-xs
                  ${theme === 'dark' 
                    ? 'bg-slate-900 border-slate-800 hover:bg-slate-950 text-slate-200' 
                    : 'bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-700'}`}
              >
                {isAr ? 'إغلاق' : 'Close'}
              </button>
              
              <button
                onClick={printReport}
                className="px-5 py-2 rounded-xl font-bold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-md shadow-emerald-500/10 cursor-pointer text-xs"
              >
                {isAr ? 'طباعة التقرير الشامل' : 'Print Full Report'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
