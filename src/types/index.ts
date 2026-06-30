export type Language = 'ar' | 'en';
export type CurrencyCode = 'EGP' | 'USD' | 'OMR' | 'SAR' | 'AED' | string;

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  main_currency: CurrencyCode;
  language: Language;
  category_budgets?: Record<string, number>;
  whatsapp_number?: string;
  created_at: string;
}

export type IncomeFrequency = 'monthly' | 'weekly' | 'annual' | 'one-time';

export interface IncomeSource {
  id: string;
  user_id: string;
  name: string;
  type: string; // 'salary', 'freelance', 'business', 'rental', 'investment', 'bonus', 'other'
  amount: number;
  currency: CurrencyCode;
  exchange_rate: number;
  frequency: IncomeFrequency;
  start_date: string;
  end_date?: string;
  is_stable: boolean;
  notes?: string;
  created_at: string;
}

export type ExpenseFrequency = 'monthly' | 'annual' | 'weekly' | 'one-time';

export interface Expense {
  id: string;
  user_id: string;
  name: string;
  category: string; // 'living', 'food', 'housing', etc.
  amount: number;
  currency: CurrencyCode;
  frequency: ExpenseFrequency;
  due_date?: number; // 1-31
  start_date: string;
  end_date?: string;
  is_fixed: boolean;
  is_essential: boolean;
  notes?: string;
  created_at: string;
}

export type DebtType = 'loan' | 'car' | 'property' | 'credit_card' | 'personal';

export interface Debt {
  id: string;
  user_id: string;
  name: string;
  debt_type: DebtType;
  original_price: number;
  down_payment: number;
  financed_amount: number;
  monthly_installment: number;
  total_installments: number;
  paid_installments: number;
  interest_rate: number;
  start_date: string;
  end_date?: string;
  institution?: string;
  balloon_payment: number;
  early_settlement_fee: number;
  notes?: string;
  created_at: string;
}

export type AssetType = 'cash' | 'bank' | 'gold' | 'investment' | 'property' | 'vehicle' | 'business' | 'other';
export type LiquidityLevel = 'high' | 'medium' | 'low';

export interface Asset {
  id: string;
  user_id: string;
  name: string;
  asset_type: AssetType;
  current_value: number;
  purchase_price?: number;
  currency: CurrencyCode;
  purchase_date?: string;
  liquidity_level: LiquidityLevel;
  notes?: string;
  created_at: string;
}

export interface EmergencyReserve {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  currency: CurrencyCode;
  location?: string;
  is_liquid: boolean;
  notes?: string;
  created_at: string;
}

export type GoalPriority = 'high' | 'medium' | 'low';

export interface FinancialGoal {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  target_date: string;
  monthly_contribution: number;
  priority: GoalPriority;
  notes?: string;
  created_at: string;
}

export type ReminderType = 'installment' | 'insurance' | 'registration' | 'utilities' | 'savings' | 'other';
export type ReminderRecurrence = 'one-time' | 'monthly' | 'annually';

export interface Reminder {
  id: string;
  user_id: string;
  title: string;
  reminder_type: ReminderType;
  amount?: number;
  due_date: string;
  recurrence: ReminderRecurrence;
  is_completed: boolean;
  created_at: string;
}

export interface FinancialSnapshot {
  id: string;
  user_id: string;
  snapshot_date: string;
  total_income: number;
  total_expenses: number;
  total_installments: number;
  monthly_surplus: number;
  emergency_reserve: number;
  outstanding_debt: number;
  net_worth: number;
  financial_score: number;
  financial_status: string; // 'Excellent' | 'Good' | 'Needs Attention' | 'High Risk' | 'Critical'
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  transaction_type: 'income' | 'expense' | 'debt_payment' | 'savings_add' | 'other';
  category: string;
  amount: number;
  currency: CurrencyCode;
  transaction_date: string;
  related_record_id?: string;
  notes?: string;
  created_at: string;
}

export interface ScenarioInput {
  name: string;
  type: 'buy_car' | 'new_installment' | 'salary_change' | 'exchange_rate' | 'expense_increase' | 'income_loss' | 'early_debt_payoff' | 'use_reserve';
  salaryChangeAmount?: number; // positive or negative
  newInstallmentAmount?: number;
  newInstallmentDuration?: number;
  downPayment?: number;
  earlySettlementFee?: number;
  assetValue?: number;
  exchangeRateChange?: { [currency: string]: number };
  expenseIncreaseAmount?: number;
  incomeLossPercentage?: number; // 0 to 100
  debtIdToPayOff?: string;
  reserveAmountToUse?: number;
}

export interface SimulationResult {
  before: {
    monthlyRemainingBalance: number;
    financialScore: number;
    debtToIncomeRatio: number;
    monthsCoveredByReserve: number;
    financialStatus: string;
    totalFinancingCost: number;
  };
  after: {
    monthlyRemainingBalance: number;
    financialScore: number;
    debtToIncomeRatio: number;
    monthsCoveredByReserve: number;
    financialStatus: string;
    totalFinancingCost: number;
  };
  impactLevel: 'Low' | 'Medium' | 'High' | 'Severe';
  impactExplanationAr: string;
  impactExplanationEn: string;
}

export interface FinancialSummary {
  totalMonthlyIncome: number;
  totalMonthlyExpenses: number;
  totalEssentialExpenses: number;
  totalOptionalExpenses: number;
  totalMonthlyInstallments: number;
  monthlyRemainingBalance: number;
  totalEmergencyReserve: number;
  debtToIncomeRatio: number;
  expenseToIncomeRatio: number;
  monthsCoveredByReserve: number;
  totalAssets: number;
  totalOutstandingDebt: number;
  netWorth: number;
  financialScore: number;
  financialStatus: 'Excellent' | 'Good' | 'Needs Attention' | 'High Risk' | 'Critical';
  scoreDetails: {
    cashFlowPoints: number;
    debtRatioPoints: number;
    reservePoints: number;
    expensePoints: number;
    savingsPoints: number;
  };
}


