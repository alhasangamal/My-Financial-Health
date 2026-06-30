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

import { db, getExchangeRates, fetchLiveExchangeRates } from './services/db';
import { calculateFinancialSummary } from './utils/calculations';
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

  // Calculate dynamic financial summaries instantly
  const rates = getExchangeRates();
  const baseCurrency = displayCurrency;
  const summary: FinancialSummary = calculateFinancialSummary(
    incomes,
    expenses,
    debts,
    assets,
    reserves,
    baseCurrency,
    rates
  );

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
            expenses={expenses}
            reminders={reminders}
            rates={rates}
            onNavigate={(id) => setActiveTab(id)}
            onCompleteReminder={handleCompleteReminder}
          />
        );
      case 'income':
        return (
          <Income 
            incomes={incomes} 
            onAdd={handleAddIncome} 
            onEdit={handleEditIncome} 
            onDelete={handleDeleteIncome} 
          />
        );
      case 'expenses':
        return (
          <Expenses 
            expenses={expenses} 
            onAdd={handleAddExpense} 
            onEdit={handleEditExpense} 
            onDelete={handleDeleteExpense} 
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
            incomes={incomes} 
            expenses={expenses} 
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
            incomes={incomes} 
            expenses={expenses} 
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
          />
          {renderActiveView()}
        </div>
      </main>
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
