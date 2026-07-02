import { supabase, isSupabaseConfigured } from './supabase';
import { DEFAULT_EXCHANGE_RATES } from '../utils/calculations';
import { 
  IncomeSource, Expense, Debt, Asset, EmergencyReserve, 
  FinancialGoal, Reminder, FinancialSnapshot, Profile, CurrencyCode 
} from '../types';

// Storage Keys for LocalStorage Mode
const KEYS = {
  INCOMES: 'my_fin_health_incomes',
  EXPENSES: 'my_fin_health_expenses',
  DEBTS: 'my_fin_health_debts',
  ASSETS: 'my_fin_health_assets',
  RESERVES: 'my_fin_health_reserves',
  GOALS: 'my_fin_health_goals',
  REMINDERS: 'my_fin_health_reminders',
  SNAPSHOTS: 'my_fin_health_snapshots',
  RATES: 'my_fin_health_rates',
};

// Seed Data matching the user's specific scenario
const SEED_DATA = {
  incomes: [
    {
      id: 'seed-income-1',
      user_id: 'guest-id',
      name: 'الراتب الأساسي (Salary)',
      type: 'inc_salary',
      amount: 1500,
      currency: 'USD',
      exchange_rate: 1.0,
      frequency: 'monthly',
      start_date: '2026-01-01',
      is_stable: true,
      notes: 'الدخل الأساسي بالعملة الأجنبية',
      created_at: new Date().toISOString(),
    }
  ] as IncomeSource[],
  
  expenses: [
    {
      id: 'seed-exp-1',
      user_id: 'guest-id',
      name: 'المصاريف المعيشية (Living Expenses)',
      category: 'cat_living',
      amount: 10000,
      currency: 'EGP',
      frequency: 'monthly',
      due_date: 1,
      start_date: '2026-01-01',
      is_fixed: false,
      is_essential: true,
      notes: 'مأكل ومشرب وفواتير متنوعة',
      created_at: new Date().toISOString(),
    },
    {
      id: 'seed-exp-2',
      user_id: 'guest-id',
      name: 'قسط الشقة والمرافق (Apartment & Utilities)',
      category: 'cat_housing',
      amount: 4000,
      currency: 'EGP',
      frequency: 'monthly',
      due_date: 10,
      start_date: '2026-01-01',
      is_fixed: true,
      is_essential: true,
      notes: 'قسط الشقة الشهري مع فواتير الخدمات',
      created_at: new Date().toISOString(),
    },
    {
      id: 'seed-exp-3',
      user_id: 'guest-id',
      name: 'المواصلات ووقود (Transport & Fuel)',
      category: 'cat_fuel',
      amount: 5000,
      currency: 'EGP',
      frequency: 'monthly',
      due_date: 15,
      start_date: '2026-01-01',
      is_fixed: false,
      is_essential: true,
      notes: 'مصاريف الوقود والمواصلات الشهرية',
      created_at: new Date().toISOString(),
    }
  ] as Expense[],

  debts: [] as Debt[],

  reserves: [
    {
      id: 'seed-reserve-1',
      user_id: 'guest-id',
      name: 'صندوق الطوارئ (Emergency Reserve)',
      amount: 284000,
      currency: 'EGP',
      location: 'حساب توفير بالبنك العربي الأفريقي',
      is_liquid: true,
      notes: 'مخزون حماية كاش سهل السحب الفوري',
      created_at: new Date().toISOString(),
    }
  ] as EmergencyReserve[],

  assets: [
    {
      id: 'seed-asset-2',
      user_id: 'guest-id',
      name: 'حساب توفير الطوارئ (Savings)',
      asset_type: 'bank',
      current_value: 284000,
      purchase_price: 284000,
      currency: 'EGP',
      purchase_date: '2026-01-15',
      liquidity_level: 'high',
      notes: 'قيمة صندوق الطوارئ السائل',
      created_at: new Date().toISOString(),
    }
  ] as Asset[],

  goals: [
    {
      id: 'seed-goal-1',
      user_id: 'guest-id',
      name: 'توفير مقدم لشراء سيارة (Save for Car Down Payment)',
      target_amount: 445000,
      current_amount: 100000,
      target_date: '2027-06-30',
      monthly_contribution: 10000,
      priority: 'high',
      notes: 'توفير قيمة الدفعة الأولى للسيارة لشراءها لاحقاً بتمويل مالي آمن',
      created_at: new Date().toISOString(),
    }
  ] as FinancialGoal[],

  reminders: [
    {
      id: 'seed-rem-2',
      user_id: 'guest-id',
      title: 'فاتورة الكهرباء وقسط الشقة',
      reminder_type: 'utilities',
      amount: 4000,
      due_date: '2026-07-10',
      recurrence: 'monthly',
      is_completed: false,
      created_at: new Date().toISOString(),
    }
  ] as Reminder[],

  snapshots: [
    {
      id: 'seed-snap-1',
      user_id: 'guest-id',
      snapshot_date: '2026-04-30',
      total_income: 1500, // USD
      total_expenses: 395.8, // In USD (~19,000 EGP converted)
      total_installments: 0,
      monthly_surplus: 1104.2,
      emergency_reserve: 284000,
      outstanding_debt: 0,
      net_worth: 284000,
      financial_score: 88,
      financial_status: 'Excellent',
      created_at: new Date(Date.now() - 60*24*60*60*1000).toISOString(),
    },
    {
      id: 'seed-snap-2',
      user_id: 'guest-id',
      snapshot_date: '2026-05-31',
      total_income: 1500,
      total_expenses: 395.8,
      total_installments: 0,
      monthly_surplus: 1104.2,
      emergency_reserve: 284000,
      outstanding_debt: 0,
      net_worth: 284000,
      financial_score: 88,
      financial_status: 'Excellent',
      created_at: new Date(Date.now() - 30*24*60*60*1000).toISOString(),
    },
    {
      id: 'seed-snap-3',
      user_id: 'guest-id',
      snapshot_date: '2026-06-30',
      total_income: 1500,
      total_expenses: 395.8,
      total_installments: 0,
      monthly_surplus: 1104.2,
      emergency_reserve: 284000,
      outstanding_debt: 0,
      net_worth: 284000,
      financial_score: 88,
      financial_status: 'Excellent',
      created_at: new Date().toISOString(),
    }
  ] as FinancialSnapshot[]
};

// Seeding Engine
export const initializeDatabase = () => {
  // Migrate existing guest profile if it was set to USD
  const storedProfile = localStorage.getItem('guest_profile');
  if (storedProfile) {
    try {
      const parsed = JSON.parse(storedProfile);
      if (parsed && parsed.main_currency === 'USD') {
        parsed.main_currency = 'EGP';
        localStorage.setItem('guest_profile', JSON.stringify(parsed));
      }
    } catch (e) {
      console.error('Failed to migrate guest profile currency', e);
    }
  }

  // Force seed reset for version 3 clean starting state (without car purchased yet)
  const isV3Seeded = localStorage.getItem('my_fin_health_seed_version_3');
  if (!isV3Seeded) {
    Object.keys(KEYS).forEach(tableKey => {
      const key = KEYS[tableKey as keyof typeof KEYS];
      if (key && key !== KEYS.RATES) {
        localStorage.removeItem(key);
      }
    });
    localStorage.setItem('my_fin_health_seed_version_3', 'true');
  }

  // Seed exchange rates
  if (!localStorage.getItem(KEYS.RATES)) {
    localStorage.setItem(KEYS.RATES, JSON.stringify(DEFAULT_EXCHANGE_RATES));
  }
  // Seed other tables if empty
  Object.entries(SEED_DATA).forEach(([table, seedItems]) => {
    const key = KEYS[table.toUpperCase() as keyof typeof KEYS];
    if (key && !localStorage.getItem(key)) {
      localStorage.setItem(key, JSON.stringify(seedItems));
    }
  });
};

// Initialize right away
initializeDatabase();

// Exchange Rates Management
export const getExchangeRates = (): Record<string, number> => {
  const stored = localStorage.getItem(KEYS.RATES);
  return stored ? JSON.parse(stored) : DEFAULT_EXCHANGE_RATES;
};

export const saveExchangeRates = (rates: Record<string, number>) => {
  localStorage.setItem(KEYS.RATES, JSON.stringify(rates));
};

export const fetchLiveExchangeRates = async (): Promise<Record<string, number> | null> => {
  try {
    const cachedTime = localStorage.getItem('my_fin_health_rates_timestamp');
    
    // If cached within the last 24 hours, don't fetch to avoid rate limits
    if (cachedTime) {
      const parsedTime = parseInt(cachedTime, 10);
      if (Date.now() - parsedTime < 24 * 60 * 60 * 1000) {
        const stored = localStorage.getItem(KEYS.RATES);
        if (stored) return JSON.parse(stored);
      }
    }

    const response = await fetch('https://open.er-api.com/v6/latest/USD');
    if (!response.ok) throw new Error('API request failed');
    const data = await response.json();
    
    if (data && data.result === 'success' && data.rates) {
      const rates = data.rates;
      const updatedRates = {
        USD: 1.0,
        EGP: rates.EGP || 48.0,
        OMR: rates.OMR || 0.385,
        SAR: rates.SAR || 3.75,
        AED: rates.AED || 3.67,
      };
      localStorage.setItem(KEYS.RATES, JSON.stringify(updatedRates));
      localStorage.setItem('my_fin_health_rates_timestamp', String(Date.now()));
      return updatedRates;
    }
  } catch (e) {
    console.error('Failed to fetch live exchange rates, falling back to cached/default rates:', e);
  }
  return null;
};

// Helper: read local storage table
const readLocal = <T>(key: string): T[] => {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
};

// Helper: write local storage table
const writeLocal = <T>(key: string, items: T[]) => {
  localStorage.setItem(key, JSON.stringify(items));
};

// ─── Cloud Sync Status Tracking ───────────────────────────────────────────────
type SyncStatus = 'connected' | 'degraded' | 'local';
type SyncListener = (status: SyncStatus) => void;
type Awaitable<T> = T | PromiseLike<T>;

let _syncStatus: SyncStatus = isSupabaseConfigured() ? 'connected' : 'local';
const _syncListeners: SyncListener[] = [];

const setSyncStatus = (status: SyncStatus) => {
  if (_syncStatus !== status) {
    _syncStatus = status;
    _syncListeners.forEach(fn => fn(status));
  }
};

export const getSyncStatus = (): SyncStatus => _syncStatus;

export const subscribeToSyncStatus = (listener: SyncListener): (() => void) => {
  _syncListeners.push(listener);
  return () => {
    const idx = _syncListeners.indexOf(listener);
    if (idx >= 0) _syncListeners.splice(idx, 1);
  };
};

// Helper: Try a Supabase operation and fall back to LocalStorage on failure.
// For "get" (read) operations, pass a localFallback that returns the data.
// For "write" operations, pass a localFallback that performs the write.
const trySupabase = async <T>(
  supabaseOp: () => Awaitable<{ data: T | null; error: any }>,
  localFallback: () => T
): Promise<T> => {
  if (!isSupabaseConfigured() || !supabase) {
    return localFallback();
  }
  try {
    const { data, error } = await supabaseOp();
    if (error) {
      console.warn('Supabase operation failed, falling back to LocalStorage:', error.message);
      setSyncStatus('degraded');
      return localFallback();
    }
    setSyncStatus('connected');
    return data as T;
  } catch (err: any) {
    console.warn('Supabase exception, falling back to LocalStorage:', err?.message || err);
    setSyncStatus('degraded');
    return localFallback();
  }
};

// Helper for write operations that don't return data
const trySupabaseWrite = async (
  supabaseOp: () => Awaitable<{ error: any }>,
  localFallback: () => void
): Promise<void> => {
  if (!isSupabaseConfigured() || !supabase) {
    localFallback();
    return;
  }
  try {
    const { error } = await supabaseOp();
    if (error) {
      console.warn('Supabase write failed, falling back to LocalStorage:', error.message);
      setSyncStatus('degraded');
      localFallback();
      return;
    }
    setSyncStatus('connected');
  } catch (err: any) {
    console.warn('Supabase write exception, falling back to LocalStorage:', err?.message || err);
    setSyncStatus('degraded');
    localFallback();
  }
};

// Repository Functions
export const db = {
  // Profiles
  async getProfile(userId: string): Promise<Profile | null> {
    return trySupabase<Profile | null>(
      () => supabase!.from('profiles').select('*').eq('id', userId).single(),
      () => { const p = localStorage.getItem('guest_profile'); return p ? JSON.parse(p) : null; }
    );
  },

  // Income Sources
  async getIncomes(userId: string): Promise<IncomeSource[]> {
    return trySupabase<IncomeSource[]>(
      () => supabase!.from('income_sources').select('*').eq('user_id', userId),
      () => readLocal<IncomeSource>(KEYS.INCOMES)
    );
  },

  async addIncome(income: Omit<IncomeSource, 'id' | 'created_at'>): Promise<IncomeSource> {
    const localFallback = () => {
      const list = readLocal<IncomeSource>(KEYS.INCOMES);
      const newIncome: IncomeSource = { ...income, id: `inc-${Date.now()}`, created_at: new Date().toISOString() };
      list.push(newIncome);
      writeLocal(KEYS.INCOMES, list);
      return newIncome;
    };
    return trySupabase<IncomeSource>(
      () => supabase!.from('income_sources').insert([income]).select().single(),
      localFallback
    );
  },

  async updateIncome(id: string, updates: Partial<IncomeSource>): Promise<void> {
    return trySupabaseWrite(
      () => supabase!.from('income_sources').update(updates).eq('id', id),
      () => { const list = readLocal<IncomeSource>(KEYS.INCOMES); writeLocal(KEYS.INCOMES, list.map(item => item.id === id ? { ...item, ...updates } : item)); }
    );
  },

  async deleteIncome(id: string): Promise<void> {
    return trySupabaseWrite(
      () => supabase!.from('income_sources').delete().eq('id', id),
      () => { const list = readLocal<IncomeSource>(KEYS.INCOMES); writeLocal(KEYS.INCOMES, list.filter(item => item.id !== id)); }
    );
  },

  // Expenses
  async getExpenses(userId: string): Promise<Expense[]> {
    return trySupabase<Expense[]>(
      () => supabase!.from('expenses').select('*').eq('user_id', userId),
      () => readLocal<Expense>(KEYS.EXPENSES)
    );
  },
  async addExpense(expense: Omit<Expense, 'id' | 'created_at'>): Promise<Expense> {
    return trySupabase<Expense>(
      () => supabase!.from('expenses').insert([expense]).select().single(),
      () => { const list = readLocal<Expense>(KEYS.EXPENSES); const n: Expense = { ...expense, id: `exp-${Date.now()}`, created_at: new Date().toISOString() }; list.push(n); writeLocal(KEYS.EXPENSES, list); return n; }
    );
  },
  async updateExpense(id: string, updates: Partial<Expense>): Promise<void> {
    return trySupabaseWrite(
      () => supabase!.from('expenses').update(updates).eq('id', id),
      () => { const list = readLocal<Expense>(KEYS.EXPENSES); writeLocal(KEYS.EXPENSES, list.map(i => i.id === id ? { ...i, ...updates } : i)); }
    );
  },
  async deleteExpense(id: string): Promise<void> {
    return trySupabaseWrite(
      () => supabase!.from('expenses').delete().eq('id', id),
      () => { const list = readLocal<Expense>(KEYS.EXPENSES); writeLocal(KEYS.EXPENSES, list.filter(i => i.id !== id)); }
    );
  },

  // Debts
  async getDebts(userId: string): Promise<Debt[]> {
    return trySupabase<Debt[]>(
      () => supabase!.from('debts').select('*').eq('user_id', userId),
      () => readLocal<Debt>(KEYS.DEBTS)
    );
  },
  async addDebt(debt: Omit<Debt, 'id' | 'created_at'>): Promise<Debt> {
    return trySupabase<Debt>(
      () => supabase!.from('debts').insert([debt]).select().single(),
      () => { const list = readLocal<Debt>(KEYS.DEBTS); const n: Debt = { ...debt, id: `debt-${Date.now()}`, created_at: new Date().toISOString() }; list.push(n); writeLocal(KEYS.DEBTS, list); return n; }
    );
  },
  async updateDebt(id: string, updates: Partial<Debt>): Promise<void> {
    return trySupabaseWrite(
      () => supabase!.from('debts').update(updates).eq('id', id),
      () => { const list = readLocal<Debt>(KEYS.DEBTS); writeLocal(KEYS.DEBTS, list.map(i => i.id === id ? { ...i, ...updates } : i)); }
    );
  },
  async deleteDebt(id: string): Promise<void> {
    return trySupabaseWrite(
      () => supabase!.from('debts').delete().eq('id', id),
      () => { const list = readLocal<Debt>(KEYS.DEBTS); writeLocal(KEYS.DEBTS, list.filter(i => i.id !== id)); }
    );
  },

  // Assets
  async getAssets(userId: string): Promise<Asset[]> {
    return trySupabase<Asset[]>(
      () => supabase!.from('assets').select('*').eq('user_id', userId),
      () => readLocal<Asset>(KEYS.ASSETS)
    );
  },
  async addAsset(asset: Omit<Asset, 'id' | 'created_at'>): Promise<Asset> {
    return trySupabase<Asset>(
      () => supabase!.from('assets').insert([asset]).select().single(),
      () => { const list = readLocal<Asset>(KEYS.ASSETS); const n: Asset = { ...asset, id: `asset-${Date.now()}`, created_at: new Date().toISOString() }; list.push(n); writeLocal(KEYS.ASSETS, list); return n; }
    );
  },
  async updateAsset(id: string, updates: Partial<Asset>): Promise<void> {
    return trySupabaseWrite(
      () => supabase!.from('assets').update(updates).eq('id', id),
      () => { const list = readLocal<Asset>(KEYS.ASSETS); writeLocal(KEYS.ASSETS, list.map(i => i.id === id ? { ...i, ...updates } : i)); }
    );
  },
  async deleteAsset(id: string): Promise<void> {
    return trySupabaseWrite(
      () => supabase!.from('assets').delete().eq('id', id),
      () => { const list = readLocal<Asset>(KEYS.ASSETS); writeLocal(KEYS.ASSETS, list.filter(i => i.id !== id)); }
    );
  },

  // Reserves
  async getReserves(userId: string): Promise<EmergencyReserve[]> {
    return trySupabase<EmergencyReserve[]>(
      () => supabase!.from('emergency_reserves').select('*').eq('user_id', userId),
      () => readLocal<EmergencyReserve>(KEYS.RESERVES)
    );
  },
  async addReserve(reserve: Omit<EmergencyReserve, 'id' | 'created_at'>): Promise<EmergencyReserve> {
    return trySupabase<EmergencyReserve>(
      () => supabase!.from('emergency_reserves').insert([reserve]).select().single(),
      () => { const list = readLocal<EmergencyReserve>(KEYS.RESERVES); const n: EmergencyReserve = { ...reserve, id: `res-${Date.now()}`, created_at: new Date().toISOString() }; list.push(n); writeLocal(KEYS.RESERVES, list); return n; }
    );
  },
  async updateReserve(id: string, updates: Partial<EmergencyReserve>): Promise<void> {
    return trySupabaseWrite(
      () => supabase!.from('emergency_reserves').update(updates).eq('id', id),
      () => { const list = readLocal<EmergencyReserve>(KEYS.RESERVES); writeLocal(KEYS.RESERVES, list.map(i => i.id === id ? { ...i, ...updates } : i)); }
    );
  },
  async deleteReserve(id: string): Promise<void> {
    return trySupabaseWrite(
      () => supabase!.from('emergency_reserves').delete().eq('id', id),
      () => { const list = readLocal<EmergencyReserve>(KEYS.RESERVES); writeLocal(KEYS.RESERVES, list.filter(i => i.id !== id)); }
    );
  },

  // Goals
  async getGoals(userId: string): Promise<FinancialGoal[]> {
    return trySupabase<FinancialGoal[]>(
      () => supabase!.from('financial_goals').select('*').eq('user_id', userId),
      () => readLocal<FinancialGoal>(KEYS.GOALS)
    );
  },
  async addGoal(goal: Omit<FinancialGoal, 'id' | 'created_at'>): Promise<FinancialGoal> {
    return trySupabase<FinancialGoal>(
      () => supabase!.from('financial_goals').insert([goal]).select().single(),
      () => { const list = readLocal<FinancialGoal>(KEYS.GOALS); const n: FinancialGoal = { ...goal, id: `goal-${Date.now()}`, created_at: new Date().toISOString() }; list.push(n); writeLocal(KEYS.GOALS, list); return n; }
    );
  },
  async updateGoal(id: string, updates: Partial<FinancialGoal>): Promise<void> {
    return trySupabaseWrite(
      () => supabase!.from('financial_goals').update(updates).eq('id', id),
      () => { const list = readLocal<FinancialGoal>(KEYS.GOALS); writeLocal(KEYS.GOALS, list.map(i => i.id === id ? { ...i, ...updates } : i)); }
    );
  },
  async deleteGoal(id: string): Promise<void> {
    return trySupabaseWrite(
      () => supabase!.from('financial_goals').delete().eq('id', id),
      () => { const list = readLocal<FinancialGoal>(KEYS.GOALS); writeLocal(KEYS.GOALS, list.filter(i => i.id !== id)); }
    );
  },

  // Reminders
  async getReminders(userId: string): Promise<Reminder[]> {
    return trySupabase<Reminder[]>(
      () => supabase!.from('reminders').select('*').eq('user_id', userId),
      () => readLocal<Reminder>(KEYS.REMINDERS)
    );
  },
  async addReminder(reminder: Omit<Reminder, 'id' | 'created_at'>): Promise<Reminder> {
    return trySupabase<Reminder>(
      () => supabase!.from('reminders').insert([reminder]).select().single(),
      () => { const list = readLocal<Reminder>(KEYS.REMINDERS); const n: Reminder = { ...reminder, id: `rem-${Date.now()}`, created_at: new Date().toISOString() }; list.push(n); writeLocal(KEYS.REMINDERS, list); return n; }
    );
  },
  async updateReminder(id: string, updates: Partial<Reminder>): Promise<void> {
    return trySupabaseWrite(
      () => supabase!.from('reminders').update(updates).eq('id', id),
      () => { const list = readLocal<Reminder>(KEYS.REMINDERS); writeLocal(KEYS.REMINDERS, list.map(i => i.id === id ? { ...i, ...updates } : i)); }
    );
  },
  async deleteReminder(id: string): Promise<void> {
    return trySupabaseWrite(
      () => supabase!.from('reminders').delete().eq('id', id),
      () => { const list = readLocal<Reminder>(KEYS.REMINDERS); writeLocal(KEYS.REMINDERS, list.filter(i => i.id !== id)); }
    );
  },

  // Snapshots
  async getSnapshots(userId: string): Promise<FinancialSnapshot[]> {
    return trySupabase<FinancialSnapshot[]>(
      () => supabase!.from('financial_snapshots').select('*').eq('user_id', userId).order('snapshot_date', { ascending: true }),
      () => { const list = readLocal<FinancialSnapshot>(KEYS.SNAPSHOTS); return list.sort((a, b) => new Date(a.snapshot_date).getTime() - new Date(b.snapshot_date).getTime()); }
    );
  },
  async addSnapshot(snapshot: Omit<FinancialSnapshot, 'id' | 'created_at'>): Promise<FinancialSnapshot> {
    return trySupabase<FinancialSnapshot>(
      () => supabase!.from('financial_snapshots').insert([snapshot]).select().single(),
      () => { const list = readLocal<FinancialSnapshot>(KEYS.SNAPSHOTS); const n: FinancialSnapshot = { ...snapshot, id: `snap-${Date.now()}`, created_at: new Date().toISOString() }; list.push(n); writeLocal(KEYS.SNAPSHOTS, list); return n; }
    );
  },
  async deleteSnapshot(id: string): Promise<void> {
    return trySupabaseWrite(
      () => supabase!.from('financial_snapshots').delete().eq('id', id),
      () => { const list = readLocal<FinancialSnapshot>(KEYS.SNAPSHOTS); writeLocal(KEYS.SNAPSHOTS, list.filter(i => i.id !== id)); }
    );
  }
};
