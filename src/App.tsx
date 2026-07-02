import React, { useState, useEffect } from 'react';
import { useTranslation, LanguageProvider } from './context/LanguageContext';
import { useTheme, ThemeProvider } from './context/ThemeContext';
import { useAuth, AuthProvider } from './context/AuthContext';
import { Sidebar } from './components/Layout/Sidebar';
import { Auth } from './components/Auth';
import { Dashboard } from './components/Dashboard';
import { Income } from './components/Income';
import { Expenses } from './components/Expenses';
import { Debts } from './components/Debts';
import { Assets } from './components/Assets';
import { Reserve } from './components/Reserve';
import { Goals } from './components/Goals';
import { Scenarios } from './components/Scenarios';
import { Reports } from './components/Reports';
import { Settings } from './components/Settings';
import { AIForecast } from './components/AIForecast';
import { Header } from './components/Layout/Header';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';

import { db, getExchangeRates, fetchLiveExchangeRates, getSyncStatus, subscribeToSyncStatus } from './services/db';
import { calculateFinancialSummary, isExpenseActiveInMonth, isIncomeActiveInMonth, convertCurrency } from './utils/calculations';
import { formatCurrency } from './utils/format';
import { 
  IncomeSource, Expense, Debt, Asset, EmergencyReserve, 
  FinancialGoal, Reminder, FinancialSnapshot, FinancialSummary 
} from './types';

const MainAppContent: React.FC = () => {
  const { t, language, dir } = useTranslation();
  const { theme } = useTheme();
  const { user, profile, loading, activePortfolio } = useAuth();
  
  const [activeTab, setActiveTab] = useState('dashboard');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [displayCurrency, setDisplayCurrency] = useState<string>('EGP');

  // Global Month and Year filtering states (default to current local month/year)
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  // Rollover notifications queue
  const [rolloverAlerts, setRolloverAlerts] = useState<string[]>([]);

  // Cloud sync status tracking
  const [syncStatus, setSyncStatus] = useState<'connected' | 'degraded' | 'local'>(getSyncStatus());
  useEffect(() => {
    return subscribeToSyncStatus((newStatus) => setSyncStatus(newStatus));
  }, []);

  useEffect(() => {
    if (profile?.main_currency) {
      setDisplayCurrency(profile.main_currency);
    }
  }, [profile?.main_currency]);

  const { updateProfile } = useAuth();

  const handleCurrencyChange = async (currency: string) => {
    setDisplayCurrency(currency);
    if (profile) {
      try {
        await updateProfile({ main_currency: currency });
      } catch (e) {
        console.error('Failed to update profile currency', e);
      }
    }
  };

  // Core Data Tables States
  const [incomes, setIncomes] = useState<IncomeSource[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [reserves, setReserves] = useState<EmergencyReserve[]>([]);
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [snapshots, setSnapshots] = useState<FinancialSnapshot[]>([]);

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

  const checkAndProcessMonthlyRollover = async (
    currentIncomes: IncomeSource[],
    currentExpenses: Expense[],
    currentDebts: Debt[],
    currentReserves: EmergencyReserve[],
    currentAssets: Asset[],
    userId: string
  ) => {
    try {
      const storageKey = `my_fin_health_rolled_over_months_v2_${userId}`;
      let rolledOverMonths: string[] = JSON.parse(localStorage.getItem(storageKey) || '[]');
      
      // If the reserve is at the seed value (284000) and we have rolledOverMonths cached, it means the database was reset but the cache remained. Let's clear the cache so it rolls over again!
      const totalLiquidReserveAmount = currentReserves.filter(r => r.is_liquid).reduce((sum, r) => sum + r.amount, 0);
      if (totalLiquidReserveAmount === 284000 && rolledOverMonths.length > 0) {
        rolledOverMonths = [];
        localStorage.removeItem(storageKey);
      }
      
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1; // 1-12

      let didChange = false;
      const notifications: string[] = [];

      // We start checking from January 2026 up to the month prior to the current month.
      let year = 2026;
      let month = 1;

      while (year < currentYear || (year === currentYear && month < currentMonth)) {
        const monthStr = `${year}-${String(month).padStart(2, '0')}`;
        
        if (!rolledOverMonths.includes(monthStr)) {
          // Verify if there is any active data in this month to avoid seeding empty placeholder months
          const hasData = currentIncomes.some(inc => isIncomeActiveInMonth(inc, year, month)) || 
                          currentExpenses.some(exp => isExpenseActiveInMonth(exp, year, month));
                          
          if (hasData) {
            const rates = getExchangeRates();
            const monthSummary = calculateFinancialSummary(
              currentIncomes,
              currentExpenses,
              currentDebts,
              currentAssets,
              currentReserves,
              displayCurrency,
              rates,
              year,
              month
            );

            const surplus = monthSummary.monthlyRemainingBalance;
            if (surplus > 0) {
              const liquidReserve = currentReserves.find(r => r.is_liquid);
              const formattedSurplus = formatCurrency(surplus, displayCurrency, language);

              if (liquidReserve) {
                // Convert surplus from baseCurrency to the reserve's currency
                const convertedSurplus = convertCurrency(surplus, displayCurrency, liquidReserve.currency, rates);
                const newAmount = liquidReserve.amount + convertedSurplus;
                
                await db.updateReserve(liquidReserve.id, { amount: newAmount });
                // Update in-memory reserve to accumulate subsequent months correctly
                liquidReserve.amount = newAmount;

                // Also update any matching asset (with the same name or type bank/cash)
                const matchingAsset = currentAssets.find(a => a.name === liquidReserve.name || a.asset_type === 'bank' || a.asset_type === 'cash');
                if (matchingAsset) {
                  const convertedAssetSurplus = convertCurrency(surplus, displayCurrency, matchingAsset.currency, rates);
                  const newAssetValue = matchingAsset.current_value + convertedAssetSurplus;
                  await db.updateAsset(matchingAsset.id, { current_value: newAssetValue });
                  // Update in-memory asset value
                  matchingAsset.current_value = newAssetValue;
                }

                notifications.push(
                  language === 'ar'
                    ? `🎉 بدأ شهر جديد! تم حساب فائض شهر ${MONTHS_NAMES[month - 1].ar} ${year} وهو ${formattedSurplus} وتم ترحيله تلقائياً إلى مدخراتك في "${liquidReserve.name}".`
                    : `🎉 A new month has started! The surplus for ${MONTHS_NAMES[month - 1].en} ${year} (${formattedSurplus}) has been calculated and automatically added to your savings in "${liquidReserve.name}".`
                );
              } else {
                // Create a new reserve
                const newRes = await db.addReserve({
                  user_id: userId,
                  name: language === 'ar' ? 'المدخرات التلقائية (Auto Savings)' : 'Auto Savings Reserve',
                  amount: surplus,
                  currency: displayCurrency,
                  is_liquid: true,
                  notes: `رصيد مدخر تلقائي لشهر ${year}-${month}`
                });
                
                // Push to in-memory reserves list so subsequent months can find it
                currentReserves.push(newRes);

                // Create a matching asset
                const newAsset = await db.addAsset({
                  user_id: userId,
                  name: newRes.name,
                  asset_type: 'cash',
                  current_value: surplus,
                  currency: displayCurrency,
                  liquidity_level: 'high',
                  notes: `مدخرات تلقائية مرحلة لشهر ${year}-${month}`
                });
                
                // Push to in-memory assets list
                currentAssets.push(newAsset);

                notifications.push(
                  language === 'ar'
                    ? `🎉 بدأ شهر جديد! تم حساب فائض شهر ${MONTHS_NAMES[month - 1].ar} ${year} وهو ${formattedSurplus} وتم إنشاء حساب مدخرات تلقائي له بقيمة الرصيد.`
                    : `🎉 A new month has started! The surplus for ${MONTHS_NAMES[month - 1].en} ${year} (${formattedSurplus}) has been calculated and a new Auto Savings account has been created for it.`
                );
              }
              didChange = true;
            }
          }
          
          // Mark as rolled over
          rolledOverMonths.push(monthStr);
        }

        // Increment month
        month++;
        if (month > 12) {
          month = 1;
          year++;
        }
      }

      if (didChange || rolledOverMonths.length > JSON.parse(localStorage.getItem(storageKey) || '[]').length) {
        localStorage.setItem(storageKey, JSON.stringify(rolledOverMonths));
        if (notifications.length > 0) {
          setRolloverAlerts(prev => [...prev, ...notifications]);
        }
        if (didChange) {
          refreshData();
        }
      }
    } catch (e) {
      console.error('Error during monthly savings rollover process:', e);
    }
  };

  // Fetch Tables
  useEffect(() => {
    if (!user) return;
    
    const fetchData = async () => {
      try {
        // Fetch live exchange rates from public API
        await fetchLiveExchangeRates();

        const userId = activePortfolio === 'default' ? 'guest-id' : `guest-id-${activePortfolio}`;
        const incData = await db.getIncomes(userId);
        const expData = await db.getExpenses(userId);
        const debtData = await db.getDebts(userId);
        const assetData = await db.getAssets(userId);
        const resData = await db.getReserves(userId);
        const goalData = await db.getGoals(userId);
        const remData = await db.getReminders(userId);
        const snapData = await db.getSnapshots(userId);

        setIncomes(incData);
        setExpenses(expData);
        setDebts(debtData);
        setAssets(assetData);
        setReserves(resData);
        setGoals(goalData);
        setReminders(remData);
        setSnapshots(snapData);

        // Run automatic rollover of previous month's surplus to savings
        await checkAndProcessMonthlyRollover(incData, expData, debtData, resData, assetData, userId);
      } catch (err) {
        console.error('Error loading finance tables:', err);
      }
    };

    fetchData();
  }, [user, activePortfolio, refreshTrigger]);

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center font-bold text-sm
        ${theme === 'dark' ? 'bg-slate-950 text-slate-400' : 'bg-slate-50 text-slate-600'}`}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <span>{language === 'ar' ? 'جاري تحميل البيانات...' : 'Loading Financial Profile...'}</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  // Calculate dynamic financial summaries instantly for the selected month & year
  const rates = getExchangeRates();
  const baseCurrency = displayCurrency;
  const summary: FinancialSummary = calculateFinancialSummary(
    incomes,
    expenses,
    debts,
    assets,
    reserves,
    baseCurrency,
    rates,
    selectedYear,
    selectedMonth
  );

  // Filter incomes and expenses lists for active views based on selected month & year
  const activeIncomes = incomes.filter(inc => isIncomeActiveInMonth(inc, selectedYear, selectedMonth));
  const activeExpenses = expenses.filter(exp => isExpenseActiveInMonth(exp, selectedYear, selectedMonth));

  // Trigger data updates
  const refreshData = () => setRefreshTrigger(prev => prev + 1);

  // Database Action Wrapper with Error Alerting
  const handleDbAction = async (action: () => Promise<any>) => {
    try {
      await action();
      refreshData();
    } catch (err: any) {
      console.error('Database operation failed:', err);
      alert(language === 'ar' 
        ? `⚠️ فشل الاتصال أو الحفظ في قاعدة البيانات:\n${err.message || err.details || JSON.stringify(err)}\n\nتأكد من إعداد الجداول بشكل صحيح في Supabase وتعطيل حماية RLS لتمكين الوصول العام للضيف (Guest).`
        : `⚠️ Database action failed:\n${err.message || err.details || JSON.stringify(err)}\n\nMake sure Supabase tables are created and RLS is disabled to allow public guest access.`);
    }
  };

  // CRUDS Triggers
  const handleAddIncome = (inc: Omit<IncomeSource, 'id' | 'created_at'>) => 
    handleDbAction(() => db.addIncome(inc));
  const handleEditIncome = (id: string, updates: Partial<IncomeSource>) => 
    handleDbAction(() => db.updateIncome(id, updates));
  const handleDeleteIncome = (id: string) => 
    handleDbAction(() => db.deleteIncome(id));

  const handleAddExpense = (exp: Omit<Expense, 'id' | 'created_at'>) => 
    handleDbAction(() => db.addExpense(exp));
  const handleEditExpense = (id: string, updates: Partial<Expense>) => 
    handleDbAction(() => db.updateExpense(id, updates));
  const handleDeleteExpense = (id: string) => 
    handleDbAction(() => db.deleteExpense(id));

  const handleAddDebt = (debt: Omit<Debt, 'id' | 'created_at'>) => 
    handleDbAction(() => db.addDebt(debt));
  const handleEditDebt = (id: string, updates: Partial<Debt>) => 
    handleDbAction(() => db.updateDebt(id, updates));
  const handleDeleteDebt = (id: string) => 
    handleDbAction(() => db.deleteDebt(id));

  const handleAddAsset = (asset: Omit<Asset, 'id' | 'created_at'>) => 
    handleDbAction(() => db.addAsset(asset));
  const handleEditAsset = (id: string, updates: Partial<Asset>) => 
    handleDbAction(() => db.updateAsset(id, updates));
  const handleDeleteAsset = (id: string) => 
    handleDbAction(() => db.deleteAsset(id));

  const handleAddReserve = (res: Omit<EmergencyReserve, 'id' | 'created_at'>) => 
    handleDbAction(() => db.addReserve(res));
  const handleEditReserve = (id: string, updates: Partial<EmergencyReserve>) => 
    handleDbAction(() => db.updateReserve(id, updates));
  const handleDeleteReserve = (id: string) => 
    handleDbAction(() => db.deleteReserve(id));

  const handleAddGoal = (goal: Omit<FinancialGoal, 'id' | 'created_at'>) => 
    handleDbAction(() => db.addGoal(goal));
  const handleEditGoal = (id: string, updates: Partial<FinancialGoal>) => 
    handleDbAction(() => db.updateGoal(id, updates));
  const handleDeleteGoal = (id: string) => 
    handleDbAction(() => db.deleteGoal(id));

  const handleCompleteReminder = (id: string) => 
    handleDbAction(() => db.updateReminder(id, { is_completed: true }));

  // Convert EGP installment for summary metrics (needs to be converted to baseCurrency)
  // Re-fetch EGP rate
  const egpRate = rates.EGP || 48.0;
  const incomeInEGP = baseCurrency === 'EGP' ? summary.totalMonthlyIncome : summary.totalMonthlyIncome * egpRate;

  // Custom Page Component Router switch
  const renderActiveView = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard 
            summary={summary} 
            debts={debts} 
            expenses={activeExpenses}
            reminders={reminders}
            rates={rates}
            onNavigate={(id) => setActiveTab(id)}
            onCompleteReminder={handleCompleteReminder}
          />
        );
      case 'income':
        return (
          <Income 
            incomes={activeIncomes} 
            onAdd={handleAddIncome} 
            onEdit={handleEditIncome} 
            onDelete={handleDeleteIncome}
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
          />
        );
      case 'expenses':
        return (
          <Expenses 
            expenses={activeExpenses} 
            onAdd={handleAddExpense} 
            onEdit={handleEditExpense} 
            onDelete={handleDeleteExpense}
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
          />
        );
      case 'debts':
        return (
          <Debts 
            debts={debts} 
            monthlyIncome={incomeInEGP}
            onAdd={handleAddDebt} 
            onEdit={handleEditDebt} 
            onDelete={handleDeleteDebt} 
          />
        );
      case 'assets':
        return (
          <Assets 
            assets={assets} 
            outstandingDebt={summary.totalOutstandingDebt}
            onAdd={handleAddAsset} 
            onEdit={handleEditAsset} 
            onDelete={handleDeleteAsset} 
          />
        );
      case 'reserve':
        return (
          <Reserve 
            reserves={reserves} 
            essentialExpenses={summary.totalEssentialExpenses}
            onAdd={handleAddReserve} 
            onEdit={handleEditReserve} 
            onDelete={handleDeleteReserve} 
          />
        );
      case 'goals':
        return (
          <Goals 
            goals={goals} 
            monthlySurplus={summary.monthlyRemainingBalance}
            onAdd={handleAddGoal} 
            onEdit={handleEditGoal} 
            onDelete={handleDeleteGoal} 
          />
        );
      case 'scenarios':
        return (
          <Scenarios 
            incomes={activeIncomes} 
            expenses={activeExpenses} 
            debts={debts} 
            assets={assets} 
            reserves={reserves} 
            rates={rates} 
          />
        );
      case 'reports':
        return (
          <Reports 
            summary={summary} 
            incomes={activeIncomes} 
            expenses={activeExpenses} 
            debts={debts} 
            snapshots={snapshots} 
          />
        );
      case 'ai-forecast':
        return (
          <AIForecast 
            incomes={incomes}
            expenses={expenses}
            debts={debts}
            snapshots={snapshots}
            rates={rates}
          />
        );
      case 'settings':
        return (
          <Settings 
            onRefreshData={refreshData} 
          />
        );
      default:
        return <div>View Empty</div>;
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${dir === 'rtl' ? 'rtl' : 'ltr'}
      ${theme === 'dark' ? 'bg-transparent text-slate-100' : 'bg-slate-50/30 text-slate-800'}`}
    >
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
      />
      
      {/* Main content viewport */}
      <main className={`transition-all duration-300 pt-20 pb-10 px-4 sm:px-6 lg:pt-8 lg:px-8
        ${dir === 'rtl' ? 'lg:pr-72 lg:pl-8' : 'lg:pl-72 lg:pr-8'}`}
      >
        <div className="max-w-6xl mx-auto">
          <Header 
            activeTab={activeTab}
            currentCurrency={baseCurrency}
            onCurrencyChange={handleCurrencyChange}
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
            onMonthChange={setSelectedMonth}
            onYearChange={setSelectedYear}
            syncStatus={syncStatus}
          />

          {/* Degraded Sync Warning Banner */}
          {syncStatus === 'degraded' && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`mb-4 p-3 rounded-2xl border flex items-center gap-3 text-xs font-semibold
                ${theme === 'dark'
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                  : 'bg-amber-50 border-amber-200 text-amber-700'}`}
            >
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>
                {language === 'ar'
                  ? 'تعذّر الاتصال بالسحابة. يتم حفظ بياناتك محلياً مؤقتاً حتى تعود السحابة.'
                  : 'Cloud connection issue. Your data is being saved locally until the connection is restored.'}
              </span>
            </motion.div>
          )}

          {/* Page transition */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
            >
              {renderActiveView()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Monthly Rollover Notification Modal */}
      {rolloverAlerts.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className={`w-full max-w-md p-6 rounded-3xl border shadow-2xl space-y-4 text-center relative overflow-hidden transition-all duration-300 transform scale-100
            ${theme === 'dark' 
              ? 'bg-slate-900 border-slate-800 text-slate-100 shadow-slate-950/50' 
              : 'bg-white border-slate-100 text-slate-800 shadow-slate-200/50'}`}
          >
            {/* Confetti or Glow spots */}
            <div className="absolute -top-12 -right-12 w-24 h-24 rounded-full bg-emerald-500/10 blur-xl pointer-events-none" />
            <div className="absolute -bottom-12 -left-12 w-24 h-24 rounded-full bg-teal-500/10 blur-xl pointer-events-none" />
            
            <div className="flex justify-center">
              <div className="w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center text-2xl animate-bounce">
                🎉
              </div>
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base font-bold">
                {language === 'ar' ? 'ترحيل الفوائض تلقائياً!' : 'Automated Monthly Rollover!'}
              </h3>
              <p className="text-[11px] opacity-70 leading-relaxed font-semibold">
                {language === 'ar' 
                  ? 'لقد بدأ شهر جديد وتم ترحيل فوائض الأشهر السابقة تلقائياً إلى حسابات المدخرات الخاصة بك:'
                  : 'A new month has started and your previous monthly surpluses have been rolled over to your savings:'}
              </p>
            </div>

            <div className="max-h-48 overflow-y-auto space-y-2 py-2 pr-1 text-xs text-start">
              {rolloverAlerts.map((alertText, idx) => (
                <div 
                  key={idx} 
                  className={`p-3 rounded-2xl border leading-relaxed font-semibold transition-all
                    ${theme === 'dark' ? 'bg-slate-950/40 border-slate-850' : 'bg-slate-50 border-slate-100'}`}
                >
                  {alertText}
                </div>
              ))}
            </div>

            <button
              onClick={() => setRolloverAlerts([])}
              className="w-full py-2.5 rounded-xl font-bold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-md shadow-emerald-500/20 transition-all cursor-pointer text-xs"
            >
              {language === 'ar' ? 'رائع، شكراً لك' : 'Great, Thank You'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

function App() {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <AuthProvider>
          <MainAppContent />
        </AuthProvider>
      </ThemeProvider>
    </LanguageProvider>
  );
}

export default App;
