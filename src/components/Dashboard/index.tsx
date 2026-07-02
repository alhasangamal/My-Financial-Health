import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services/db';
import { FinancialSummary, Debt, Expense, Reminder } from '../../types';
import { formatCurrency, formatPercent, formatNumber } from '../../utils/format';
import { 
  ArrowUpRight, ArrowDownRight, Percent, Calendar, ShieldCheck, 
  AlertTriangle, DollarSign, Wallet, Landmark, PiggyBank, BellRing, TrendingUp, Compass, ChevronRight, MessageSquare
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, 
  PieChart, Pie, Cell, LineChart, Line, BarChart, Bar, Legend, CartesianGrid 
} from 'recharts';
import { motion } from 'framer-motion';

interface DashboardProps {
  summary: FinancialSummary;
  debts: Debt[];
  expenses: Expense[];
  reminders: Reminder[];
  rates: Record<string, number>;
  onNavigate: (tabId: string) => void;
  onCompleteReminder: (id: string) => void;
  selectedMonth?: number;
  selectedYear?: number;
}

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

export const Dashboard: React.FC<DashboardProps> = ({ 
  summary, debts, expenses, reminders, rates, onNavigate, onCompleteReminder,
  selectedMonth, selectedYear
}) => {
  const { t, language, dir } = useTranslation();
  const { theme } = useTheme();
  const { profile, activePortfolio } = useAuth();
  const [chartTab, setChartTab] = useState<'cashflow' | 'expenses' | 'debts' | 'networth' | 'trends' | 'reserveGauge'>('cashflow');

  const baseCurrency = profile?.main_currency || 'USD';
  const isAr = language === 'ar';

  const handleWhatsAppAlert = (rem: Reminder) => {
    const phone = profile?.whatsapp_number || '';
    if (!phone) {
      alert(isAr 
        ? 'يرجى كتابة رقم الواتساب الخاص بك أولاً في صفحة الإعدادات لتفعيل ميزة التنبيهات!' 
        : 'Please enter your WhatsApp phone number in Settings page first to enable alerts!');
      return;
    }
    
    const cleanPhone = phone.replace(/\D/g, '');
    const formattedAmount = rem.amount ? formatCurrency(rem.amount, baseCurrency, language) : '';
    
    const msg = isAr 
      ? `🔔 *تذكير مستحق من صحتِك المالية*\n\n• *الدفعة:* ${rem.title}\n• *المبلغ:* ${formattedAmount}\n• *تاريخ الاستحقاق:* ${rem.due_date}\n\nيرجى تسويتها في الموعد المكتوب لضمان استقرار ميزانيتك.`
      : `🔔 *Financial Reminder from My Financial Health*\n\n• *Payment:* ${rem.title}\n• *Amount:* ${formattedAmount}\n• *Due Date:* ${rem.due_date}\n\nPlease settle it on schedule to maintain your budget health.`;

    const url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  // Background Automated WhatsApp Dispatcher
  useEffect(() => {
    const apiUrl = localStorage.getItem('whatsapp_api_url');
    const apiToken = localStorage.getItem('whatsapp_api_token');
    const phone = profile?.whatsapp_number || '';
    
    if (!apiUrl || !phone || reminders.length === 0) return;

    const cleanPhone = phone.replace(/\D/g, '');
    const todayStr = new Date().toISOString().split('T')[0];
    
    // Read logs of sent notifications to prevent duplicates
    const sentLogs = JSON.parse(localStorage.getItem('sent_reminders_log') || '{}');
    let updatedLogs = { ...sentLogs };
    let didSend = false;

    // Filter active upcoming unpaid reminders
    const activeReminders = reminders.filter(r => !r.is_completed);

    activeReminders.forEach(rem => {
      const daysLeft = Math.ceil((new Date(rem.due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      const isToday = daysLeft === 0;

      if (isToday && sentLogs[rem.id] !== todayStr) {
        // Trigger background API POST call
        const formattedAmount = rem.amount ? formatCurrency(rem.amount, baseCurrency, language) : '';
        const msg = isAr 
          ? `🚨 *تنبيه تلقائي: دفعة مستحقة اليوم!*\n\n• *الدفعة:* ${rem.title}\n• *المبلغ:* ${formattedAmount}\n• *تاريخ الاستحقاق:* ${rem.due_date}\n\nيرجى الدخول لتسويتها.`
          : `🚨 *Auto Alert: Payment Due Today!*\n\n• *Payment:* ${rem.title}\n• *Amount:* ${formattedAmount}\n• *Due Date:* ${rem.due_date}\n\nPlease check My Financial Health.`;

        // Execute fetch in background
        fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            phone: cleanPhone,
            chatId: `${cleanPhone}@c.us`, // GreenAPI standard
            message: msg,
            text: msg, // general webhook support
            token: apiToken,
            apikey: apiToken
          })
        }).catch(err => console.error('Automated WhatsApp dispatch failed:', err));

        updatedLogs[rem.id] = todayStr;
        didSend = true;
      }
    });

    if (didSend) {
      localStorage.setItem('sent_reminders_log', JSON.stringify(updatedLogs));
    }
  }, [reminders, profile?.whatsapp_number, baseCurrency, language, isAr]);

  // Format Status Styling
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Excellent': return 'from-emerald-500 to-teal-400 text-emerald-500';
      case 'Good': return 'from-green-500 to-emerald-400 text-green-500';
      case 'Needs Attention': return 'from-amber-500 to-orange-400 text-amber-500';
      case 'High Risk': return 'from-orange-500 to-rose-400 text-orange-500';
      case 'Critical': return 'from-rose-600 to-red-500 text-rose-500';
      default: return 'from-slate-500 to-slate-400 text-slate-500';
    }
  };

  const getStatusBgLight = (status: string) => {
    switch (status) {
      case 'Excellent': return 'bg-emerald-50 text-emerald-800 border-emerald-100';
      case 'Good': return 'bg-green-50 text-green-800 border-green-100';
      case 'Needs Attention': return 'bg-amber-50 text-amber-800 border-amber-100';
      case 'High Risk': return 'bg-orange-50 text-orange-800 border-orange-100';
      case 'Critical': return 'bg-rose-50 text-rose-800 border-rose-100';
      default: return 'bg-slate-50 text-slate-800 border-slate-100';
    }
  };

  const getStatusBgDark = (status: string) => {
    switch (status) {
      case 'Excellent': return 'bg-emerald-950/20 text-emerald-400 border-emerald-900/30';
      case 'Good': return 'bg-green-950/20 text-green-400 border-green-900/30';
      case 'Needs Attention': return 'bg-amber-950/20 text-amber-400 border-amber-900/30';
      case 'High Risk': return 'bg-orange-950/20 text-orange-400 border-orange-900/30';
      case 'Critical': return 'bg-rose-950/20 text-rose-400 border-rose-900/30';
      default: return 'bg-slate-900/20 text-slate-400 border-slate-800/30';
    }
  };

  // KPI Definition List
  const kpis = [
    {
      id: 'income',
      title: t('totalMonthlyIncome'),
      value: formatCurrency(summary.totalMonthlyIncome, baseCurrency, language),
      icon: DollarSign,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
      action: () => onNavigate('income'),
    },
    {
      id: 'expenses',
      title: t('totalMonthlyExpenses'),
      value: formatCurrency(summary.totalMonthlyExpenses, baseCurrency, language),
      icon: Wallet,
      color: 'text-rose-500',
      bg: 'bg-rose-500/10',
      action: () => onNavigate('expenses'),
    },
    {
      id: 'installments',
      title: t('totalMonthlyInstallments'),
      value: formatCurrency(summary.totalMonthlyInstallments, baseCurrency, language),
      icon: Landmark,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
      action: () => onNavigate('debts'),
    },
    {
      id: 'balance',
      title: t('monthlyRemainingBalance'),
      value: formatCurrency(summary.monthlyRemainingBalance, baseCurrency, language),
      icon: PiggyBank,
      color: summary.monthlyRemainingBalance >= 0 ? 'text-teal-500' : 'text-red-500',
      bg: summary.monthlyRemainingBalance >= 0 ? 'bg-teal-500/10' : 'bg-red-500/10',
      action: () => onNavigate('dashboard'),
    },
    {
      id: 'reserve',
      title: t('totalEmergencyReserve'),
      value: formatCurrency(summary.totalEmergencyReserve, baseCurrency, language),
      icon: ShieldCheck,
      color: 'text-sky-500',
      bg: 'bg-sky-500/10',
      action: () => onNavigate('reserve'),
    },
    {
      id: 'reserve-months',
      title: t('monthsCoveredByReserve'),
      value: `${summary.monthsCoveredByReserve.toFixed(1)} ${t('months')}`,
      icon: ShieldCheck,
      color: summary.monthsCoveredByReserve >= 6 ? 'text-emerald-500' : 'text-orange-500',
      bg: summary.monthsCoveredByReserve >= 6 ? 'bg-emerald-500/10' : 'bg-orange-500/10',
      action: () => onNavigate('reserve'),
    },
    {
      id: 'dti',
      title: t('debtToIncomeRatio'),
      value: formatPercent(summary.debtToIncomeRatio, language),
      icon: Percent,
      color: summary.debtToIncomeRatio < 35 ? 'text-emerald-500' : 'text-rose-500',
      bg: summary.debtToIncomeRatio < 35 ? 'bg-emerald-500/10' : 'bg-rose-500/10',
      action: () => onNavigate('debts'),
    },
    {
      id: 'eti',
      title: t('expenseToIncomeRatio'),
      value: formatPercent(summary.expenseToIncomeRatio, language),
      icon: Percent,
      color: summary.expenseToIncomeRatio < 65 ? 'text-emerald-500' : 'text-orange-500',
      bg: summary.expenseToIncomeRatio < 65 ? 'bg-emerald-500/10' : 'bg-orange-500/10',
      action: () => onNavigate('expenses'),
    },
    {
      id: 'net-worth',
      title: t('netWorth'),
      value: formatCurrency(summary.netWorth, baseCurrency, language),
      icon: TrendingUp,
      color: summary.netWorth >= 0 ? 'text-emerald-500' : 'text-rose-500',
      bg: summary.netWorth >= 0 ? 'bg-emerald-500/10' : 'bg-rose-500/10',
      action: () => onNavigate('assets'),
    }
  ];

  // 1. Expense Pie Chart Data
  const expensesByCategory = expenses.reduce((acc: Record<string, number>, exp) => {
    const amountInBase = getMonthlyExpenseInBase(exp);
    acc[exp.category] = (acc[exp.category] || 0) + amountInBase;
    return acc;
  }, {});

  function getMonthlyExpenseInBase(exp: Expense) {
    let monthlyAmount = exp.amount;
    if (exp.frequency === 'weekly') monthlyAmount = exp.amount * 4.33;
    else if (exp.frequency === 'annual') monthlyAmount = exp.amount / 12;
    else if (exp.frequency === 'one-time') monthlyAmount = exp.amount; // Count one-time expenses fully in the selected month
    
    // convert to base
    const ratesForConv = rates;
    const rateFrom = ratesForConv[exp.currency] || 1;
    const rateTo = ratesForConv[baseCurrency] || 1;
    return (monthlyAmount / rateFrom) * rateTo;
  }

  const pieData = Object.entries(expensesByCategory)
    .map(([cat, val]) => ({
      name: t(cat),
      value: Math.round(val),
    }))
    .filter(d => d.value > 0);

  const COLORS = [
    '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', 
    '#ec4899', '#06b6d4', '#14b8a6', '#6366f1', '#f43f5e'
  ];

  // 2. Mock timeline graph data for Cashflow (last 6 months trend)
  const cashflowTimelineData = [
    { name: isAr ? 'يناير' : 'Jan', income: summary.totalMonthlyIncome, expenses: summary.totalMonthlyExpenses },
    { name: isAr ? 'فبراير' : 'Feb', income: summary.totalMonthlyIncome * 0.95, expenses: summary.totalMonthlyExpenses * 0.9 },
    { name: isAr ? 'مارس' : 'Mar', income: summary.totalMonthlyIncome * 1.05, expenses: summary.totalMonthlyExpenses * 1.1 },
    { name: isAr ? 'أبريل' : 'Apr', income: summary.totalMonthlyIncome, expenses: summary.totalMonthlyExpenses * 1.05 },
    { name: isAr ? 'مايو' : 'May', income: summary.totalMonthlyIncome * 1.1, expenses: summary.totalMonthlyExpenses * 0.95 },
    { name: isAr ? 'يونيو' : 'Jun', income: summary.totalMonthlyIncome, expenses: summary.totalMonthlyExpenses + summary.totalMonthlyInstallments },
  ];

  // 3. Debts amortized simulation data
  const debtTimelineData = debts.flatMap(d => {
    const list = [];
    const remaining = d.total_installments - d.paid_installments;
    // Map monthly schedule
    for (let i = 0; i <= Math.min(12, remaining); i++) {
      list.push({
        month: `${isAr ? 'شهر' : 'M'}${i}`,
        debtAmount: Math.max(0, (remaining - i) * d.monthly_installment)
      });
    }
    return list;
  });

  // Reminders upcoming list (filter incompleted, sorted by date)
  const upcomingReminders = reminders
    .filter(r => !r.is_completed)
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
    .slice(0, 4);

  // SVG Gauge calculations
  // Angle covers 180 degrees from Left (180deg) to Right (0deg)
  // Max months covered is capped at 12 months for visual scale.
  const cappedMonths = Math.min(12, summary.monthsCoveredByReserve);
  const gaugePercentage = cappedMonths / 12;
  const needleRotation = 180 * gaugePercentage; 
  
  // 50/30/20 Rule calculations
  const totalIncome = summary.totalMonthlyIncome;
  const essentialExpenses = summary.totalEssentialExpenses;
  const optionalExpenses = summary.totalOptionalExpenses;
  const savingsAndDebt = Math.max(0, totalIncome - essentialExpenses - optionalExpenses);

  const essentialRatio = totalIncome > 0 ? (essentialExpenses / totalIncome) * 100 : 0;
  const optionalRatio = totalIncome > 0 ? (optionalExpenses / totalIncome) * 100 : 0;
  const savingsRatio = totalIncome > 0 ? (savingsAndDebt / totalIncome) * 100 : 0;

  // Localized advisor string for 50/30/20
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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };
  
  const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } }
  };

  return (
    <motion.div 
      variants={containerVariants} 
      initial="hidden" 
      animate="visible" 
      className="space-y-6"
    >
      {/* Onboarding Welcome Guide for Empty Portfolio */}
      {summary.totalMonthlyIncome === 0 && expenses.length === 0 && (
        <motion.div
          variants={itemVariants}
          className={`p-6 rounded-3xl border shadow-xl space-y-4 relative overflow-hidden text-start
            ${theme === 'dark' 
              ? 'bg-slate-900/60 border-slate-800/80 shadow-slate-950/20' 
              : 'bg-emerald-50/20 border-emerald-100/60 shadow-sm'}`}
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
          
          <div className="space-y-1">
            <h3 className="text-base font-bold flex items-center gap-2">
              <span>👋</span>
              <span>{isAr ? 'مرحباً بك في محفظتك المالية الجديدة!' : 'Welcome to your new Financial Portfolio!'}</span>
            </h3>
            <p className="text-[11px] opacity-70 leading-relaxed font-semibold">
              {isAr 
                ? 'محفظتك الحالية فارغة وجاهزة للإعداد. اتبع هذه الخطوات البسيطة لبدء تحليل صحتك المالية:'
                : 'Your portfolio is empty and ready. Follow these simple steps to begin analyzing your financial health:'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {/* Step 1 */}
            <div className={`p-3.5 rounded-2xl border flex flex-col justify-between gap-3
              ${theme === 'dark' ? 'bg-slate-950/60 border-slate-850' : 'bg-white border-slate-100'}`}>
              <div>
                <span className="text-[9px] font-black text-emerald-500 block uppercase tracking-wide">{isAr ? 'الخطوة الأولى' : 'Step 1'}</span>
                <h4 className="font-bold mt-0.5">{isAr ? 'تأكيد العملة الأساسية' : 'Set Main Currency'}</h4>
                <p className="text-[10px] opacity-60 mt-1 font-medium leading-relaxed">
                  {isAr 
                    ? 'اختر عملة العرض الأساسية من القائمة العلوية لتنسيق كافة الحسابات والرسوم البيانية.'
                    : 'Select your main display currency from the top header to format all charts and values.'}
                </p>
              </div>
              <button 
                onClick={() => onNavigate('settings')}
                className="w-full py-1.5 rounded-xl font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 text-[10px] transition-all cursor-pointer"
              >
                ⚙️ {isAr ? 'تغيير العملة' : 'Configure Currency'}
              </button>
            </div>

            {/* Step 2 */}
            <div className={`p-3.5 rounded-2xl border flex flex-col justify-between gap-3
              ${theme === 'dark' ? 'bg-slate-950/60 border-slate-850' : 'bg-white border-slate-100'}`}>
              <div>
                <span className="text-[9px] font-black text-emerald-500 block uppercase tracking-wide">{isAr ? 'الخطوة الثانية' : 'Step 2'}</span>
                <h4 className="font-bold mt-0.5">{isAr ? 'إدخال مصدر دخلك' : 'Add First Income'}</h4>
                <p className="text-[10px] opacity-60 mt-1 font-medium leading-relaxed">
                  {isAr 
                    ? 'سجل راتبك الأساسي أو استثماراتك الشهرية لتمكين حساب الميزانية ونسب الادخار.'
                    : 'Register your baseline salary or recurring cash inflows to calculate limits.'}
                </p>
              </div>
              <button 
                onClick={() => onNavigate('income')}
                className="w-full py-1.5 rounded-xl font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 text-[10px] transition-all cursor-pointer"
              >
                💵 {isAr ? 'إضافة دخل الآن' : 'Add Income Now'}
              </button>
            </div>

            {/* Step 3 */}
            <div className={`p-3.5 rounded-2xl border flex flex-col justify-between gap-3
              ${theme === 'dark' ? 'bg-slate-950/60 border-slate-850' : 'bg-white border-slate-100'}`}>
              <div>
                <span className="text-[9px] font-black text-emerald-500 block uppercase tracking-wide">{isAr ? 'الخطوة الثالثة' : 'Step 3'}</span>
                <h4 className="font-bold mt-0.5">{isAr ? 'تسجيل المصاريف الأساسية' : 'Add First Expense'}</h4>
                <p className="text-[10px] opacity-60 mt-1 font-medium leading-relaxed">
                  {isAr 
                    ? 'أضف إيجار المنزل أو مصاريف المعيشة للبدء في تتبع سقوف الصرف الشهرية للفئات.'
                    : 'Add rent or living costs to begin tracking category budgeting limits.'}
                </p>
              </div>
              <button 
                onClick={() => onNavigate('expenses')}
                className="w-full py-1.5 rounded-xl font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 text-[10px] transition-all cursor-pointer"
              >
                💳 {isAr ? 'إضافة مصاريف الآن' : 'Add Expense Now'}
              </button>
            </div>
          </div>

          {/* Quick Demo Data Seed Card */}
          <div className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-4
            ${theme === 'dark' ? 'bg-slate-950/30 border-slate-850 animate-pulse' : 'bg-white/60 border-slate-100'}`}
          >
            <div className="space-y-0.5 text-center sm:text-start">
              <h5 className="font-bold">{isAr ? '💡 هل تفضل البدء ببيانات تجريبية؟' : '💡 Prefer starting with demo data?'}</h5>
              <p className="text-[10px] opacity-60 font-medium">
                {isAr 
                  ? 'يمكنك تعبئة هذه المحفظة فوراً بقيم عشوائية لتجربة لوحة التحكم والرسومات البيانية.'
                  : 'Instantly pre-populate this portfolio with realistic dummy data to test all charts.'}
              </p>
            </div>
            
            <button
              onClick={async () => {
                const uId = activePortfolio === 'default' ? 'guest-id' : `guest-id-${activePortfolio}`;
                
                await db.addIncome({
                  user_id: uId,
                  name: isAr ? 'الراتب الأساسي' : 'Base Salary',
                  type: 'inc_salary',
                  amount: 1500,
                  currency: 'USD',
                  exchange_rate: 1.0,
                  frequency: 'monthly',
                  start_date: new Date().toISOString().split('T')[0],
                  is_stable: true,
                  notes: 'Seed salary',
                });

                await db.addExpense({
                  user_id: uId,
                  name: isAr ? 'إيجار ومرافق المنزل' : 'Apartment Rent',
                  category: 'cat_housing',
                  amount: 12000,
                  currency: 'EGP',
                  frequency: 'monthly',
                  due_date: 5,
                  start_date: new Date().toISOString().split('T')[0],
                  is_fixed: true,
                  is_essential: true,
                  notes: 'Seed rent',
                });

                await db.addExpense({
                  user_id: uId,
                  name: isAr ? 'أغذية ومطاعم' : 'Food & Groceries',
                  category: 'cat_food',
                  amount: 5000,
                  currency: 'EGP',
                  frequency: 'monthly',
                  due_date: 10,
                  start_date: new Date().toISOString().split('T')[0],
                  is_fixed: false,
                  is_essential: true,
                  notes: 'Seed food',
                });

                window.location.reload();
              }}
              className="py-2 px-4 rounded-xl font-bold bg-emerald-500 text-white hover:bg-emerald-600 text-[10px] cursor-pointer shadow-md shadow-emerald-500/10 active:scale-95 transition-transform"
            >
              {isAr ? 'تعبئة بيانات تجريبية سريعة' : 'Load Demo Data'}
            </button>
          </div>
        </motion.div>
      )}

      {/* Financial Health Score Banner */}
      <motion.div 
        variants={itemVariants}
        className={`p-6 rounded-3xl border shadow-xl flex flex-col md:flex-row items-center gap-6 hover:shadow-2xl transition-all duration-300 relative overflow-hidden
          ${theme === 'dark' 
            ? 'bg-slate-900/40 border-slate-800/80 shadow-slate-950/20' 
            : 'bg-white border-slate-200 shadow-sm'}`}
      >
        {/* Neon Glow spots for dark mode */}
        {theme === 'dark' && (
          <div className="absolute -top-12 -right-12 w-24 h-24 rounded-full bg-emerald-500/10 blur-xl pointer-events-none" />
        )}

        <div className="relative flex items-center justify-center">
          <svg className="w-28 h-28 transform -rotate-90">
            <circle
              cx="56"
              cy="56"
              r="48"
              className={`fill-none stroke-2.5 ${theme === 'dark' ? 'stroke-slate-800' : 'stroke-slate-100'}`}
            />
            <circle
              cx="56"
              cy="56"
              r="48"
              strokeDasharray={2 * Math.PI * 48}
              strokeDashoffset={2 * Math.PI * 48 * (1 - summary.financialScore / 100)}
              className="fill-none stroke-emerald-500 stroke-3.5 transition-all duration-1000 ease-out"
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className="text-3xl font-extrabold">{formatNumber(summary.financialScore, language)}</span>
            <span className="text-[10px] opacity-60">/ ١٠٠</span>
          </div>
        </div>

        <div className="flex-1 text-center md:text-start space-y-2">
          <div className="flex flex-col md:flex-row items-center gap-3">
            <h2 className="text-xl font-bold">{t('financialCondition')}</h2>
            {selectedMonth && selectedYear && (
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-500 border border-emerald-500/20">
                {MONTHS_NAMES[selectedMonth - 1][language === 'ar' ? 'ar' : 'en']} {selectedYear}
              </span>
            )}
            <span className={`px-3 py-1 rounded-full text-xs font-bold border 
              ${theme === 'dark' ? getStatusBgDark(summary.financialStatus) : getStatusBgLight(summary.financialStatus)}`}
            >
              {t(`status${summary.financialStatus.replace(' ', '')}`)}
            </span>
          </div>
          <p className="text-sm opacity-80 leading-relaxed max-w-2xl font-medium">
            {isAr 
              ? `حالتك المالية العامة مصنفة كـ "${t(`status${summary.financialStatus.replace(' ', '')}`)}". التزامات الديون تمثل ${summary.debtToIncomeRatio.toFixed(0)}% من دخلك الشهري، وصندوق الطوارئ الخاص بك يغطي ما يقارب ${summary.monthsCoveredByReserve.toFixed(1)} شهر من نفقاتك المعيشية الأساسية.`
              : `Your overall financial status is rated "${t(`status${summary.financialStatus.replace(' ', '')}`)}". Monthly debt obligations consume ${summary.debtToIncomeRatio.toFixed(0)}% of your income, while your emergency reserve covers around ${summary.monthsCoveredByReserve.toFixed(1)} months of essential expenditures.`
            }
          </p>
        </div>

        <button
          onClick={() => onNavigate('scenarios')}
          className="px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:scale-105 active:scale-95 text-white font-bold text-sm shadow-lg shadow-emerald-500/20 transition-all cursor-pointer whitespace-nowrap"
        >
          {t('scenarioTitle')}
        </button>
      </motion.div>

      {/* Grid of KPI Cards with glowing shadows */}
      <motion.div 
        variants={itemVariants}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4.5"
      >
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.id}
              onClick={kpi.action}
              className={`p-5 rounded-3xl border shadow-md hover-glow flex flex-col justify-between cursor-pointer group relative overflow-hidden
                ${theme === 'dark' 
                  ? 'bg-slate-900/40 border-slate-800/80 shadow-slate-950/20' 
                  : 'bg-white border-slate-200'}`}
            >
              <div className="flex justify-between items-start">
                <span className="text-xs font-bold text-slate-400">
                  {kpi.title}
                </span>
                <div className={`w-9 h-9 rounded-xl ${kpi.bg} flex items-center justify-center ${kpi.color} group-hover:scale-110 transition-transform`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-2xl font-extrabold tracking-tight group-hover:bg-gradient-to-r group-hover:from-emerald-400 group-hover:to-teal-400 group-hover:bg-clip-text group-hover:text-transparent transition-all">
                  {kpi.value}
                </span>
              </div>
            </div>
          );
        })}
      </motion.div>

      {/* Split section: 3 column grids for stats (Score Vertical Breakdown | 50/30/20 AI | Reminders) */}
      <motion.div 
        variants={itemVariants}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {/* Score Breakdown Column */}
        <div className={`p-6 rounded-3xl border shadow-lg flex flex-col justify-between
          ${theme === 'dark' ? 'bg-slate-900/40 border-slate-800/80' : 'bg-white border-slate-200/80 shadow-sm'}`}
        >
          <div>
            <h3 className="font-bold text-base mb-4 border-b border-slate-800/10 pb-2">{t('scoreBreakdown')}</h3>
            <div className="space-y-4">
              {/* Cash Flow */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span>{t('scoreCashFlow')}</span>
                  <span>{formatNumber(summary.scoreDetails.cashFlowPoints, language)} / ٢٥</span>
                </div>
                <div className={`w-full h-2 rounded-full ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'}`}>
                  <div 
                    className="h-full rounded-full bg-emerald-500 transition-all duration-1000"
                    style={{ width: `${(summary.scoreDetails.cashFlowPoints / 25) * 100}%` }}
                  />
                </div>
              </div>

              {/* Debt Ratio */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span>{t('scoreDebtRatio')}</span>
                  <span>{formatNumber(summary.scoreDetails.debtRatioPoints, language)} / ٢٥</span>
                </div>
                <div className={`w-full h-2 rounded-full ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'}`}>
                  <div 
                    className="h-full rounded-full bg-teal-500 transition-all duration-1000"
                    style={{ width: `${(summary.scoreDetails.debtRatioPoints / 25) * 100}%` }}
                  />
                </div>
              </div>

              {/* Emergency Reserve */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span>{t('scoreReserve')}</span>
                  <span>{formatNumber(summary.scoreDetails.reservePoints, language)} / ٢٥</span>
                </div>
                <div className={`w-full h-2 rounded-full ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'}`}>
                  <div 
                    className="h-full rounded-full bg-sky-500 transition-all duration-1000"
                    style={{ width: `${(summary.scoreDetails.reservePoints / 25) * 100}%` }}
                  />
                </div>
              </div>

              {/* Expense Ratio */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span>{t('scoreExpenseRatio')}</span>
                  <span>{formatNumber(summary.scoreDetails.expensePoints, language)} / ١٥</span>
                </div>
                <div className={`w-full h-2 rounded-full ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'}`}>
                  <div 
                    className="h-full rounded-full bg-amber-500 transition-all duration-1000"
                    style={{ width: `${(summary.scoreDetails.expensePoints / 15) * 100}%` }}
                  />
                </div>
              </div>

              {/* Savings Rate */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span>{t('scoreSavingsRate')}</span>
                  <span>{formatNumber(summary.scoreDetails.savingsPoints, language)} / ١٠</span>
                </div>
                <div className={`w-full h-2 rounded-full ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'}`}>
                  <div 
                    className="h-full rounded-full bg-violet-500 transition-all duration-1000"
                    style={{ width: `${(summary.scoreDetails.savingsPoints / 10) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 50/30/20 Budgeting Rule Card Column */}
        <div className={`p-6 rounded-3xl border shadow-lg flex flex-col justify-between
          ${theme === 'dark' ? 'bg-slate-900/40 border-slate-800/80' : 'bg-white border-slate-200/80 shadow-sm'}`}
        >
          <div>
            <h3 className="font-bold text-base mb-4 border-b border-slate-800/10 pb-2 flex items-center gap-2">
              <Compass className="w-4.5 h-4.5 text-emerald-500" />
              <span>{isAr ? 'الموزع المالي الذكي (50/30/20)' : 'AI Budget Benchmark (50/30/20)'}</span>
            </h3>
            
            <div className="space-y-4 text-xs font-semibold">
              <p className="opacity-70 leading-relaxed text-[11px] font-medium">
                {isAr 
                  ? 'يقسم هذا المعيار دخلك إلى: 50% للاحتياجات الأساسية، 30% للرغبات الاختيارية، و20% للادخار والاستثمار.' 
                  : 'Divides your income into: 50% Essential Needs, 30% Wants, and 20% Savings & Debt paydown.'}
              </p>

              {/* Stacked comparison bar */}
              <div className="space-y-2.5 mt-3">
                <div className="flex justify-between text-[11px] opacity-80">
                  <span>{isAr ? 'توزيع ميزانيتك الحالي:' : 'Your Active Split:'}</span>
                </div>
                <div className="w-full h-5.5 rounded-xl overflow-hidden flex text-[9px] text-white font-black text-center">
                  {essentialRatio > 0 && (
                    <div className="bg-rose-500 flex items-center justify-center transition-all" style={{ width: `${essentialRatio}%` }} title={`Essential: ${essentialRatio.toFixed(0)}%`}>
                      {essentialRatio > 15 && (isAr ? 'أساسي' : 'Needs')}
                    </div>
                  )}
                  {optionalRatio > 0 && (
                    <div className="bg-amber-500 flex items-center justify-center transition-all" style={{ width: `${optionalRatio}%` }} title={`Optional: ${optionalRatio.toFixed(0)}%`}>
                      {optionalRatio > 15 && (isAr ? 'ترفيه' : 'Wants')}
                    </div>
                  )}
                  {savingsRatio > 0 && (
                    <div className="bg-emerald-500 flex items-center justify-center transition-all" style={{ width: `${savingsRatio}%` }} title={`Savings: ${savingsRatio.toFixed(0)}%`}>
                      {savingsRatio > 15 && (isAr ? 'ادخار' : 'Save')}
                    </div>
                  )}
                </div>
                
                {/* Labels legend */}
                <div className="flex flex-wrap gap-3 text-[10px] justify-center mt-2 opacity-80">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-rose-500 rounded-full"></div>
                    <span>{isAr ? `أساسي: ${essentialRatio.toFixed(0)}%` : `Needs: ${essentialRatio.toFixed(0)}%`}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                    <span>{isAr ? `ترفيه: ${optionalRatio.toFixed(0)}%` : `Wants: ${optionalRatio.toFixed(0)}%`}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                    <span>{isAr ? `ادخار: ${savingsRatio.toFixed(0)}%` : `Savings: ${savingsRatio.toFixed(0)}%`}</span>
                  </div>
                </div>
              </div>

              {/* Stacked Ideal benchmark bar */}
              <div className="space-y-1.5 pt-3 border-t border-slate-800/10 dark:border-slate-800/50">
                <div className="flex justify-between text-[11px] opacity-75">
                  <span>{isAr ? 'الموزع المالي المثالي (50/30/20):' : 'Ideal 50/30/20 Split:'}</span>
                </div>
                <div className="w-full h-3 rounded-lg overflow-hidden flex text-[8px] text-white/80 text-center">
                  <div className="bg-rose-500/80 flex items-center justify-center" style={{ width: '50%' }}>50%</div>
                  <div className="bg-amber-500/80 flex items-center justify-center" style={{ width: '30%' }}>30%</div>
                  <div className="bg-emerald-500/80 flex items-center justify-center" style={{ width: '20%' }}>20%</div>
                </div>
              </div>

              {/* AI Advisor message box */}
              <div className={`p-2.5 rounded-xl border leading-relaxed text-[11px] font-semibold mt-2 ${theme === 'dark' ? 'bg-slate-900 border-slate-800/80' : 'bg-slate-50 border-slate-100'}`}>
                {isAr ? ruleAdviceAr : ruleAdviceEn}
              </div>
            </div>
          </div>
        </div>

        {/* Upcoming Reminders Column */}
        <div className={`p-6 rounded-3xl border shadow-lg flex flex-col justify-between
          ${theme === 'dark' ? 'bg-slate-900/40 border-slate-800/80' : 'bg-white border-slate-200/80 shadow-sm'}`}
        >
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-slate-800/10 pb-2">
              <h3 className="font-bold text-base flex items-center gap-2">
                <BellRing className="w-4.5 h-4.5 text-emerald-500 animate-bounce" />
                <span>{t('upcomingPayments')}</span>
              </h3>
              <button 
                onClick={() => onNavigate('settings')} 
                className="text-xs font-semibold text-emerald-500 hover:text-emerald-400"
              >
                + {t('add')}
              </button>
            </div>

            {upcomingReminders.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center">
                <ShieldCheck className="w-9 h-9 text-emerald-500 mb-2 opacity-50" />
                <p className="text-xs opacity-60 font-semibold">{t('noReminders')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingReminders.map((rem) => {
                  const daysLeft = Math.ceil((new Date(rem.due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                  const isToday = daysLeft === 0;
                  const isOverdue = daysLeft < 0;

                  return (
                    <div 
                      key={rem.id}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs
                        ${theme === 'dark' 
                          ? 'bg-slate-900 border-slate-800/60' 
                          : 'bg-slate-50 border-slate-100'}`}
                    >
                      <div className="overflow-hidden">
                        <h4 className="font-bold truncate">{rem.title}</h4>
                        <div className="flex items-center gap-2 mt-1 opacity-70">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{rem.due_date}</span>
                        </div>
                      </div>
                      <div className="text-end flex flex-col items-end gap-1 shrink-0">
                        {rem.amount && (
                          <span className="font-extrabold">
                            {formatCurrency(rem.amount, baseCurrency, language)}
                          </span>
                        )}
                        <div className="flex items-center gap-1">
                          <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold
                            ${isOverdue 
                              ? 'bg-rose-500/15 text-rose-500' 
                              : isToday 
                                ? 'bg-amber-500/15 text-amber-500 animate-pulse' 
                                : 'bg-emerald-500/15 text-emerald-500'}`}
                          >
                            {isOverdue 
                              ? t('overdue') 
                              : isToday 
                                ? t('dueToday') 
                                : t('reminderDaysRemaining', { days: daysLeft })}
                          </span>
                           <button
                             onClick={() => handleWhatsAppAlert(rem)}
                             className="p-1 rounded-md border border-emerald-500/20 hover:border-emerald-500/50 bg-emerald-500/5 text-emerald-500 cursor-pointer flex items-center justify-center hover:scale-105 transition-transform shrink-0"
                             title={isAr ? 'إرسال تذكير عبر الواتساب' : 'Send WhatsApp Reminder'}
                           >
                             <MessageSquare className="w-3 h-3" />
                           </button>
                           <button
                             onClick={() => onCompleteReminder(rem.id)}
                             className="text-[9px] font-bold text-emerald-500 hover:text-emerald-400 border border-emerald-500/20 hover:border-emerald-500/40 px-1.5 py-0.5 rounded-md cursor-pointer whitespace-nowrap shrink-0"
                           >
                             {t('reminderCompleted')}
                           </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Concurrent Charts Row (Split Left-Right) */}
      <motion.div 
        variants={itemVariants}
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        {/* Left Column: Cash Flow comparison graph (col-span-2) */}
        <div className={`p-6 rounded-3xl border shadow-lg space-y-4 lg:col-span-2
          ${theme === 'dark' ? 'bg-slate-900/40 border-slate-800/80 shadow-slate-950/20' : 'bg-white border-slate-200'}`}
        >
          <div className="flex justify-between items-center border-b border-slate-800/10 pb-3">
            <h3 className="font-bold text-sm">{t('incomeVsExpenses')}</h3>
            <span className="text-[10px] opacity-60 font-semibold">{isAr ? 'آخر ٦ أشهر' : 'Last 6 Months'}</span>
          </div>
          <div className="h-80 w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cashflowTimelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorInc" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#1e293b' : '#f1f5f9'} />
                <XAxis dataKey="name" stroke="#64748b" tickLine={false} />
                <YAxis stroke="#64748b" tickLine={false} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff',
                    borderColor: theme === 'dark' ? '#1e293b' : '#e2e8f0',
                    color: theme === 'dark' ? '#f8fafc' : '#0f172a',
                    borderRadius: '12px'
                  }} 
                />
                <Legend verticalAlign="top" height={36} />
                <Area type="monotone" name={t('totalMonthlyIncome')} dataKey="income" stroke="#10b981" fillOpacity={1} fill="url(#colorInc)" strokeWidth={2.5} />
                <Area type="monotone" name={t('totalMonthlyExpenses')} dataKey="expenses" stroke="#ef4444" fillOpacity={1} fill="url(#colorExp)" strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Column: Category Breakdown Pie Chart (col-span-1) */}
        <div className={`p-6 rounded-3xl border shadow-lg space-y-4
          ${theme === 'dark' ? 'bg-slate-900/40 border-slate-800/80 shadow-slate-950/20' : 'bg-white border-slate-200'}`}
        >
          <div className="flex justify-between items-center border-b border-slate-800/10 pb-3">
            <h3 className="font-bold text-sm">{t('expensesByCategory')}</h3>
            <span className="text-[10px] opacity-60 font-semibold">{isAr ? 'توزيع نسبي' : 'Proportional Share'}</span>
          </div>

          <div className="h-60 w-full flex items-center justify-center">
            {pieData.length === 0 ? (
              <div className="text-center opacity-60 py-8 font-semibold text-xs">
                {isAr ? 'لا توجد مصاريف لتصنيفها حالياً' : 'No expenses to categorize'}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff',
                      borderColor: theme === 'dark' ? '#1e293b' : '#e2e8f0',
                      borderRadius: '12px'
                    }} 
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {pieData.length > 0 && (
            <div className="grid grid-cols-2 gap-2 text-[9px] font-semibold border-t border-slate-800/10 dark:border-slate-800/40 pt-3">
              {pieData.slice(0, 4).map((d, index) => (
                <div key={d.name} className="flex items-center gap-1.5 overflow-hidden">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                  <span className="truncate">{d.name}: {formatCurrency(d.value, baseCurrency, language)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      {/* Secondary Graphs Row (Split Left-Right) */}
      <motion.div 
        variants={itemVariants}
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        {/* Left Column: Reserve Gauge adequacy (col-span-1) */}
        <div className={`p-6 rounded-3xl border shadow-lg flex flex-col justify-between
          ${theme === 'dark' ? 'bg-slate-900/40 border-slate-800/80 shadow-slate-950/20' : 'bg-white border-slate-200'}`}
        >
          <div>
            <h4 className="text-sm font-bold border-b border-slate-800/10 pb-2 mb-4">{t('reserveTitle')}</h4>
            <div className="flex flex-col items-center justify-center">
              <div className="relative w-56 h-28 overflow-hidden flex justify-center items-end mt-2">
                <div className="absolute w-56 h-56 rounded-full border-12 border-b-transparent border-r-transparent border-emerald-500/30 transform rotate-45"></div>
                <svg className="w-56 h-28">
                  <defs>
                    <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#f43f5e" />
                      <stop offset="25%" stopColor="#f59e0b" />
                      <stop offset="50%" stopColor="#eab308" />
                      <stop offset="75%" stopColor="#10b981" />
                      <stop offset="100%" stopColor="#059669" />
                    </linearGradient>
                  </defs>
                  <path 
                    d="M 12 112 A 100 100 0 0 1 212 112" 
                    fill="none" 
                    stroke="url(#gaugeGrad)" 
                    strokeWidth="16"
                    strokeLinecap="round"
                  />
                </svg>

                <div 
                  className="absolute bottom-0 w-1 h-24 bg-slate-400 origin-bottom rounded-full transition-transform duration-1000 ease-out"
                  style={{ transform: `rotate(${needleRotation - 90}deg)` }}
                >
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-300 border border-slate-500 absolute -top-1.5 -left-1"></div>
                </div>
              </div>

              <div className="text-center mt-4 space-y-1">
                <span className="text-2xl font-extrabold">
                  {summary.monthsCoveredByReserve.toFixed(1)}
                </span>
                <span className="text-[10px] font-bold opacity-60 block">
                  {t('months')} {t('monthsCoveredByReserve')}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border inline-block mt-2
                  ${summary.monthsCoveredByReserve < 1 
                    ? 'bg-rose-500/15 border-rose-500/20 text-rose-500' 
                    : summary.monthsCoveredByReserve < 3 
                      ? 'bg-orange-500/15 border-orange-500/20 text-orange-500' 
                      : summary.monthsCoveredByReserve < 6 
                        ? 'bg-amber-500/15 border-amber-500/20 text-amber-500' 
                        : 'bg-emerald-500/15 border-emerald-500/20 text-emerald-500'}`}
                >
                  {summary.monthsCoveredByReserve < 1 
                    ? t('reserveStatusCritical') 
                    : summary.monthsCoveredByReserve < 3 
                      ? t('reserveStatusHighRisk') 
                      : summary.monthsCoveredByReserve < 6 
                        ? t('reserveStatusAcceptable') 
                        : summary.monthsCoveredByReserve < 12 
                          ? t('reserveStatusGood') 
                          : t('reserveStatusExcellent')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Debts reduction timeline graph (col-span-2) */}
        <div className={`p-6 rounded-3xl border shadow-lg space-y-4 lg:col-span-2
          ${theme === 'dark' ? 'bg-slate-900/40 border-slate-800/80 shadow-slate-950/20' : 'bg-white border-slate-200'}`}
        >
          <div className="flex justify-between items-center border-b border-slate-800/10 pb-3">
            <h3 className="font-bold text-sm">{t('installmentsOverTime')}</h3>
            <span className="text-[10px] opacity-60 font-semibold">{isAr ? 'محاكاة السداد (١٢ شهر)' : '12-Month Schedule'}</span>
          </div>
          <div className="h-64 w-full text-xs">
            {debts.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <ShieldCheck className="w-10 h-10 text-emerald-500 mb-2 opacity-55" />
                <p className="text-xs opacity-65 font-bold">{isAr ? 'ممتاز، لا توجد قروض أو ديون مسجلة حالياً!' : 'Awesome, no debt records listed yet!'}</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={debtTimelineData.slice(0, 12)}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#1e293b' : '#f1f5f9'} />
                  <XAxis dataKey="month" stroke="#64748b" tickLine={false} />
                  <YAxis stroke="#64748b" tickLine={false} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff',
                      borderColor: theme === 'dark' ? '#1e293b' : '#e2e8f0',
                      borderRadius: '12px'
                    }} 
                  />
                  <Bar dataKey="debtAmount" name={isAr ? 'الدين المتبقي' : 'Outstanding'} fill="#14b8a6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
