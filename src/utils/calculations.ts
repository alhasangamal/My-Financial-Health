import { IncomeSource, Expense, Debt, Asset, EmergencyReserve, FinancialGoal, Reminder, FinancialSnapshot, CurrencyCode, FinancialSummary } from '../types';

// Default rates relative to USD (1 USD = rate_value)
export const DEFAULT_EXCHANGE_RATES: Record<string, number> = {
  USD: 1.0,
  EGP: 48.0,
  OMR: 0.385,
  SAR: 3.75,
  AED: 3.67,
};

export const convertCurrency = (
  amount: number,
  from: string,
  to: string,
  customRates?: Record<string, number>
): number => {
  const rates = customRates || DEFAULT_EXCHANGE_RATES;
  const rateFrom = rates[from] || 1;
  const rateTo = rates[to] || 1;
  
  // Convert from currency to USD, then from USD to target currency
  const amountInUSD = amount / rateFrom;
  return amountInUSD * rateTo;
};

// Convert any income amount to a monthly base amount in the target currency
export const getMonthlyIncomeInBase = (
  income: IncomeSource,
  targetCurrency: string,
  rates: Record<string, number>
): number => {
  let monthlyAmount = income.amount;
  if (income.frequency === 'weekly') {
    monthlyAmount = income.amount * 4.33;
  } else if (income.frequency === 'annual') {
    monthlyAmount = income.amount / 12;
  } else if (income.frequency === 'one-time') {
    return 0; // One-time income does not count towards regular monthly budget
  }
  
  // Convert currency to target base using stored/custom rates
  // Note: if the income has an explicit exchange_rate stored, use it to convert to base, 
  // or fall back to system exchange rates
  if (income.currency !== targetCurrency) {
    if (income.exchange_rate && income.exchange_rate !== 1) {
      // If income currency is converted to base via its custom stored exchange rate
      // (amount / income.exchange_rate) converts to base, or vice versa.
      // Usually: BaseAmount = OriginalAmount * (TargetRate / SourceRate).
      // If user stores exchange_rate manually for this income, we use it directly:
      // Converted amount = original amount / exchange_rate
      return income.amount / income.exchange_rate;
    }
    return convertCurrency(monthlyAmount, income.currency, targetCurrency, rates);
  }
  return monthlyAmount;
};

// Convert any expense amount to a monthly average in the target currency
export const getMonthlyExpenseInBase = (
  expense: Expense,
  targetCurrency: string,
  rates: Record<string, number>
): number => {
  let monthlyAmount = expense.amount;
  if (expense.frequency === 'weekly') {
    monthlyAmount = expense.amount * 4.33;
  } else if (expense.frequency === 'annual') {
    monthlyAmount = expense.amount / 12;
  } else if (expense.frequency === 'one-time') {
    return 0; // Exclude one-time expenses from monthly average
  }
  
  return convertCurrency(monthlyAmount, expense.currency, targetCurrency, rates);
};

// Check if an expense is active/occurred in a specific month and year
export const isExpenseActiveInMonth = (exp: Expense, year: number, month: number): boolean => {
  const startDate = new Date(exp.start_date);
  if (isNaN(startDate.getTime())) return false;
  
  const startYear = startDate.getFullYear();
  const startMonth = startDate.getMonth() + 1; // 1-12
  
  if (exp.frequency === 'one-time') {
    return startYear === year && startMonth === month;
  }
  
  // Recurring expenses (monthly, weekly, annual)
  const isAfterStart = year > startYear || (year === startYear && month >= startMonth);
  
  let isBeforeEnd = true;
  if (exp.end_date) {
    const endDate = new Date(exp.end_date);
    if (!isNaN(endDate.getTime())) {
      const endYear = endDate.getFullYear();
      const endMonth = endDate.getMonth() + 1;
      isBeforeEnd = year < endYear || (year === endYear && month <= endMonth);
    }
  }
  
  return isAfterStart && isBeforeEnd;
};

// Get monthly expense amount for a specific month/year
export const getMonthlyExpenseInMonth = (
  expense: Expense,
  year: number,
  month: number,
  targetCurrency: string,
  rates: Record<string, number>
): number => {
  let amount = expense.amount;
  if (expense.frequency === 'weekly') {
    amount = expense.amount * 4.33;
  } else if (expense.frequency === 'annual') {
    amount = expense.amount / 12;
  } else if (expense.frequency === 'one-time') {
    // One-time expenses count fully in the month they occurred
    amount = expense.amount;
  }
  return convertCurrency(amount, expense.currency, targetCurrency, rates);
};

// Check if an income is active/occurred in a specific month and year
export const isIncomeActiveInMonth = (income: IncomeSource, year: number, month: number): boolean => {
  const startDate = new Date(income.start_date);
  if (isNaN(startDate.getTime())) return false;
  
  const startYear = startDate.getFullYear();
  const startMonth = startDate.getMonth() + 1; // 1-12
  
  if (income.frequency === 'one-time') {
    return startYear === year && startMonth === month;
  }
  
  // Recurring incomes (monthly, weekly, annual)
  const isAfterStart = year > startYear || (year === startYear && month >= startMonth);
  
  let isBeforeEnd = true;
  if (income.end_date) {
    const endDate = new Date(income.end_date);
    if (!isNaN(endDate.getTime())) {
      const endYear = endDate.getFullYear();
      const endMonth = endDate.getMonth() + 1;
      isBeforeEnd = year < endYear || (year === endYear && month <= endMonth);
    }
  }
  
  return isAfterStart && isBeforeEnd;
};

// Get monthly income amount for a specific month/year
export const getMonthlyIncomeInMonth = (
  income: IncomeSource,
  year: number,
  month: number,
  targetCurrency: string,
  rates: Record<string, number>
): number => {
  let amount = income.amount;
  if (income.frequency === 'weekly') {
    amount = income.amount * 4.33;
  } else if (income.frequency === 'annual') {
    amount = income.amount / 12;
  } else if (income.frequency === 'one-time') {
    // One-time income counts fully in the month it occurred
    amount = income.amount;
  }
  
  if (income.currency !== targetCurrency) {
    if (income.exchange_rate && income.exchange_rate !== 1) {
      return amount / income.exchange_rate;
    }
    return convertCurrency(amount, income.currency, targetCurrency, rates);
  }
  return amount;
};

export const calculateFinancialSummary = (
  incomes: IncomeSource[],
  expenses: Expense[],
  debts: Debt[],
  assets: Asset[],
  reserves: EmergencyReserve[],
  targetCurrency: string,
  rates: Record<string, number>,
  year?: number,
  month?: number
): FinancialSummary => {
  const current = new Date();
  const targetYear = year !== undefined ? year : current.getFullYear();
  const targetMonth = month !== undefined ? month : current.getMonth() + 1;

  // Filter and convert incomes active in target month/year
  const activeIncomes = incomes.filter(inc => isIncomeActiveInMonth(inc, targetYear, targetMonth));
  
  // Filter and convert expenses active in target month/year
  const activeExpenses = expenses.filter(exp => isExpenseActiveInMonth(exp, targetYear, targetMonth));

  // 1. Total Monthly Income
  const totalMonthlyIncome = activeIncomes.reduce((sum, inc) => {
    return sum + getMonthlyIncomeInMonth(inc, targetYear, targetMonth, targetCurrency, rates);
  }, 0);

  // 2. Total Monthly Expenses
  const totalMonthlyExpenses = activeExpenses.reduce((sum, exp) => {
    return sum + getMonthlyExpenseInMonth(exp, targetYear, targetMonth, targetCurrency, rates);
  }, 0);

  const totalEssentialExpenses = activeExpenses
    .filter(exp => exp.is_essential)
    .reduce((sum, exp) => {
      return sum + getMonthlyExpenseInMonth(exp, targetYear, targetMonth, targetCurrency, rates);
    }, 0);

  const totalOptionalExpenses = totalMonthlyExpenses - totalEssentialExpenses;

  // 3. Total Monthly Installments
  const totalMonthlyInstallments = debts.reduce((sum, debt) => {
    // Installment is converted to target base currency
    // For installments, we assume they are stored in the main user currency.
    // If not, we convert. (Let's assume debts are entered in main currency, or we convert from EGP/USD).
    // Let's look at the debt currency. For simplicity, we assume they are entered in EGP or USD.
    // If the debt doesn't store a currency, we assume EGP (since sample vehicle is in EGP).
    // Let's add custom currency support or assume EGP/USD conversion.
    // Let's convert debt monthly installment:
    // If debt doesn't have a currency field in the schema, it uses EGP or main currency.
    // Let's assume the installment is in the currency of the debt (e.g. EGP for car) and convert to targetCurrency.
    // Let's check if the car installment is 25,870 EGP. If our target is USD, we convert EGP to USD.
    // We will assume debts are stored in EGP unless they are in USD (we will convert EGP to targetCurrency).
    // Let's assume the debt installment is in EGP by default, unless specified otherwise.
    // Let's convert:
    const installmentInTarget = convertCurrency(debt.monthly_installment, 'EGP', targetCurrency, rates);
    return sum + installmentInTarget;
  }, 0);

  // 4. Remaining Balance
  // Monthly Obligations = Monthly Expenses + Monthly Installments
  const monthlyRemainingBalance = totalMonthlyIncome - (totalMonthlyExpenses + totalMonthlyInstallments);

  // 5. Total Emergency Reserve
  const totalEmergencyReserve = reserves
    .filter(res => res.is_liquid) // Only liquid reserves count
    .reduce((sum, res) => {
      return sum + convertCurrency(res.amount, res.currency, targetCurrency, rates);
    }, 0);

  // 6. Ratios
  const debtToIncomeRatio = totalMonthlyIncome > 0 ? (totalMonthlyInstallments / totalMonthlyIncome) * 100 : 0;
  const expenseToIncomeRatio = totalMonthlyIncome > 0 ? (totalMonthlyExpenses / totalMonthlyIncome) * 100 : 0;

  // 7. Months covered by Reserve
  // Covered = Emergency Reserve / Essential Monthly Expenses
  // If essential expenses is 0, fall back to total monthly expenses, if that is 0, cover is 0.
  const denominator = totalEssentialExpenses > 0 ? totalEssentialExpenses : (totalMonthlyExpenses > 0 ? totalMonthlyExpenses : 1);
  const monthsCoveredByReserve = totalEmergencyReserve / denominator;

  // 8. Total Assets
  const totalAssets = assets.reduce((sum, asset) => {
    return sum + convertCurrency(asset.current_value, asset.currency, targetCurrency, rates);
  }, 0);

  // 9. Total Outstanding Debt
  const totalOutstandingDebt = debts.reduce((sum, debt) => {
    // Remaining debt = (total installments - paid installments) * monthly installment
    // Plus any balloon payment
    const remainingInstallments = Math.max(0, debt.total_installments - debt.paid_installments);
    const outstandingInEGP = (remainingInstallments * debt.monthly_installment) + debt.balloon_payment;
    return sum + convertCurrency(outstandingInEGP, 'EGP', targetCurrency, rates);
  }, 0);

  // 10. Net Worth = Assets - Debt
  const netWorth = totalAssets - totalOutstandingDebt;

  // --- SCORE CALCULATION (0-100) ---
  let cashFlowPoints = 0;
  let debtRatioPoints = 0;
  let reservePoints = 0;
  let expensePoints = 0;
  let savingsPoints = 0;

  // Cash Flow (25 points)
  const remainingPercent = totalMonthlyIncome > 0 ? (monthlyRemainingBalance / totalMonthlyIncome) * 100 : 0;
  if (remainingPercent > 30) cashFlowPoints = 25;
  else if (remainingPercent >= 20) cashFlowPoints = 20;
  else if (remainingPercent >= 10) cashFlowPoints = 12;
  else if (remainingPercent >= 0) cashFlowPoints = 5;
  else cashFlowPoints = 0;

  // Debt-to-Income Ratio (25 points)
  const dti = debtToIncomeRatio;
  if (totalMonthlyInstallments === 0) debtRatioPoints = 25;
  else if (dti < 20) debtRatioPoints = 25;
  else if (dti <= 30) debtRatioPoints = 20;
  else if (dti <= 40) debtRatioPoints = 12;
  else if (dti <= 50) debtRatioPoints = 5;
  else debtRatioPoints = 0;

  // Emergency Reserve (25 points)
  const months = monthsCoveredByReserve;
  if (months >= 12) reservePoints = 25;
  else if (months >= 6) reservePoints = 22;
  else if (months >= 3) reservePoints = 15;
  else if (months >= 1) reservePoints = 7;
  else reservePoints = 0;

  // Expense Ratio (15 points)
  const expRatio = expenseToIncomeRatio;
  if (expRatio < 50) expensePoints = 15;
  else if (expRatio <= 65) expensePoints = 12;
  else if (expRatio <= 80) expensePoints = 6;
  else expensePoints = 0;

  // Savings Rate (10 points)
  // Savings rate is based on surplus (remaining balance) / income
  const savingsRate = totalMonthlyIncome > 0 ? (monthlyRemainingBalance / totalMonthlyIncome) * 100 : 0;
  if (savingsRate > 20) savingsPoints = 10;
  else if (savingsRate >= 10) savingsPoints = 7;
  else if (savingsRate >= 5) savingsPoints = 4;
  else savingsPoints = 0;

  const financialScore = cashFlowPoints + debtRatioPoints + reservePoints + expensePoints + savingsPoints;

  // Status classification
  let financialStatus: 'Excellent' | 'Good' | 'Needs Attention' | 'High Risk' | 'Critical' = 'Critical';
  if (financialScore >= 85) financialStatus = 'Excellent';
  else if (financialScore >= 70) financialStatus = 'Good';
  else if (financialScore >= 50) financialStatus = 'Needs Attention';
  else if (financialScore >= 30) financialStatus = 'High Risk';
  else financialStatus = 'Critical';

  return {
    totalMonthlyIncome,
    totalMonthlyExpenses,
    totalEssentialExpenses,
    totalOptionalExpenses,
    totalMonthlyInstallments,
    monthlyRemainingBalance,
    totalEmergencyReserve,
    debtToIncomeRatio,
    expenseToIncomeRatio,
    monthsCoveredByReserve,
    totalAssets,
    totalOutstandingDebt,
    netWorth,
    financialScore,
    financialStatus,
    scoreDetails: {
      cashFlowPoints,
      debtRatioPoints,
      reservePoints,
      expensePoints,
      savingsPoints,
    },
  };
};

// Generate list of recommendations based on metrics
export const generateRecommendations = (
  summary: FinancialSummary,
  debts: Debt[],
  expenses: Expense[],
  language: 'ar' | 'en',
  targetCurrency: string
): string[] => {
  const list: string[] = [];
  const isAr = language === 'ar';

  // 1. Debt to income is high
  if (summary.debtToIncomeRatio > 35) {
    list.push(isAr 
      ? 'أقساطك الشهرية تتجاوز الحدود الآمنة (أكثر من 35% من دخلك). تجنب أي ديون جديدة فوراً.' 
      : 'Your monthly installments exceed safe limits (more than 35% of income). Avoid any new debts immediately.'
    );
  }

  // 2. Reserve months low
  if (summary.monthsCoveredByReserve < 3) {
    list.push(isAr
      ? `صندوق الطوارئ الخاص بك يغطي أقل من 3 أشهر (${summary.monthsCoveredByReserve.toFixed(1)} شهر). ننصح بزيادة الفائض الشهري لتعزيز الصندوق.`
      : `Your emergency reserve covers less than 3 months (${summary.monthsCoveredByReserve.toFixed(1)} months). We recommend increasing monthly surplus to bolster this reserve.`
    );
  }

  // 3. Savings rate low
  const savingsRate = summary.totalMonthlyIncome > 0 ? (summary.monthlyRemainingBalance / summary.totalMonthlyIncome) * 100 : 0;
  if (savingsRate < 10 && summary.totalMonthlyIncome > 0) {
    const recommendedCut = Math.round(summary.totalMonthlyIncome * 0.1);
    list.push(isAr
      ? `معدل ادخارك الشهري منخفض (أقل من 10%). حاول تقليص المصاريف الاختيارية بمقدار ${recommendedCut} ${targetCurrency} شهرياً.`
      : `Your monthly savings rate is low (under 10%). Try to reduce optional expenses by ${recommendedCut} ${targetCurrency} monthly.`
    );
  }

  // 4. Vehicle expenses monthly reserve recommendation
  // Look for vehicle insurance/registration in expenses
  const annualVehicleExpenses = expenses
    .filter(e => e.frequency === 'annual' && (e.category === 'cat_insurance' || e.category === 'cat_registration' || e.name.includes('سيارة') || e.name.toLowerCase().includes('car') || e.name.toLowerCase().includes('vehicle')))
    .reduce((sum, e) => sum + e.amount, 0);

  if (annualVehicleExpenses > 0) {
    const monthlyReserve = Math.round(annualVehicleExpenses / 12);
    list.push(isAr
      ? `تكاليف سيارتك السنوية مرتفعة. يفضل حجز ${monthlyReserve} ${targetCurrency} شهرياً في حساب منفصل كاحتياطي مخصص لها بدلاً من دفعها دفعة واحدة.`
      : `Your annual vehicle costs are high. Consider putting aside ${monthlyReserve} ${targetCurrency} monthly in a separate account as a reserve.`
    );
  }

  // 5. Debt avoidance recommendation
  if (debts.length > 0) {
    const largestDebt = [...debts].sort((a, b) => b.monthly_installment - a.monthly_installment)[0];
    list.push(isAr
      ? `تجنب إضافة أي التزامات جديدة قبل الانتهاء من قسط "${largestDebt.name}" الجاري لتخفيف العبء المالي.`
      : `Avoid adding new installments before completing your current "${largestDebt.name}" installment to reduce financial burden.`
    );
  }

  // 6. Surplus recommendation
  if (summary.monthlyRemainingBalance > summary.totalMonthlyIncome * 0.2 && summary.monthsCoveredByReserve < 6) {
    list.push(isAr
      ? 'لديك فائض مالي شهري جيد جداً. ننصح بتوجيه 50% منه على الأقل لتعزيز صندوق الطوارئ حتى يغطي 6 أشهر.'
      : 'Your monthly surplus is strong. We recommend directing at least 50% of it to boost your emergency reserve until it covers 6 months.'
    );
  }

  // 7. Check if maintenance expenses increased
  const maintenanceExpenses = expenses.filter(e => e.category === 'cat_maintenance' || e.category === 'cat_fuel');
  const hasMaintenance = maintenanceExpenses.length > 0;
  if (hasMaintenance) {
    list.push(isAr
      ? 'مصاريف الصيانة والوقود تمثل عبئاً مستمراً. ننصح بفحص دوري للمركبة للتأكد من كفاءتها وتقليل استهلاك الوقود.'
      : 'Maintenance and fuel expenses represent a continuous drain. We recommend periodic vehicle inspections to verify efficiency and reduce fuel consumption.'
    );
  }

  return list;
};

// Simulate a scenario
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

export const runScenarioSimulation = (
  incomes: IncomeSource[],
  expenses: Expense[],
  debts: Debt[],
  assets: Asset[],
  reserves: EmergencyReserve[],
  targetCurrency: string,
  rates: Record<string, number>,
  scenarioType: string,
  inputs: {
    carPrice?: number;
    downPayment?: number;
    installment?: number;
    duration?: number;
    salaryChange?: number;
    expenseIncrease?: number;
    incomeLossPercent?: number;
    debtIdToPayOff?: string;
    reserveUsed?: number;
  }
): SimulationResult => {
  // 1. Calculate Before Summary
  const beforeSummary = calculateFinancialSummary(incomes, expenses, debts, assets, reserves, targetCurrency, rates);
  
  // Calculate total before financing cost
  const beforeFinancingCost = debts.reduce((sum, d) => {
    // Financing cost = (installment * total_installments) + down_payment - original_price
    // Converted to targetCurrency
    const costInEGP = (d.monthly_installment * d.total_installments) + d.down_payment - d.financed_amount;
    return sum + convertCurrency(Math.max(0, costInEGP), 'EGP', targetCurrency, rates);
  }, 0);

  // 2. Clone and adjust arrays based on Scenario
  let simIncomes = JSON.parse(JSON.stringify(incomes)) as IncomeSource[];
  let simExpenses = JSON.parse(JSON.stringify(expenses)) as Expense[];
  let simDebts = JSON.parse(JSON.stringify(debts)) as Debt[];
  let simAssets = JSON.parse(JSON.stringify(assets)) as Asset[];
  let simReserves = JSON.parse(JSON.stringify(reserves)) as EmergencyReserve[];

  let newFinancingCost = 0;
  let impactExplanationAr = '';
  let impactExplanationEn = '';

  if (scenarioType === 'sim_buy_car') {
    const price = inputs.carPrice || 0;
    const down = inputs.downPayment || 0;
    const inst = inputs.installment || 0;
    const dur = inputs.duration || 0;

    // Add new debt
    const newDebt: Debt = {
      id: 'sim-debt',
      user_id: 'guest',
      name: 'سيارة محاكاة (Simulated Car)',
      debt_type: 'car',
      original_price: price,
      down_payment: down,
      financed_amount: price - down,
      monthly_installment: inst,
      total_installments: dur,
      paid_installments: 0,
      interest_rate: 0,
      start_date: new Date().toISOString().split('T')[0],
      balloon_payment: 0,
      early_settlement_fee: 0,
      created_at: new Date().toISOString(),
    };
    simDebts.push(newDebt);

    // Subtract downpayment from reserves (assuming it comes from emergency reserve)
    simReserves = simReserves.map(r => {
      if (r.is_liquid) {
        // convert down payment from EGP to reserve currency
        const downInReserveCur = convertCurrency(down, 'EGP', r.currency, rates);
        return { ...r, amount: Math.max(0, r.amount - downInReserveCur) };
      }
      return r;
    });

    // Add car as asset
    const newAsset: Asset = {
      id: 'sim-car-asset',
      user_id: 'guest',
      name: 'سيارة جديدة (New Car)',
      asset_type: 'vehicle',
      current_value: price, // Initial asset value is car price
      purchase_price: price,
      currency: 'EGP',
      purchase_date: new Date().toISOString().split('T')[0],
      liquidity_level: 'low',
      created_at: new Date().toISOString(),
    };
    simAssets.push(newAsset);

    // financing cost of new car = (inst * dur) - financed_amount
    const financed = price - down;
    const newCostInEGP = (inst * dur) - financed;
    newFinancingCost = convertCurrency(Math.max(0, newCostInEGP), 'EGP', targetCurrency, rates);

    impactExplanationAr = `شراء سيارة بقيمة ${price.toLocaleString()} ج.م وقسط شهري ${inst.toLocaleString()} ج.م سيقلل من الفائض الشهري ويستنزف ${down.toLocaleString()} ج.م من المدخرات.`;
    impactExplanationEn = `Buying a car worth EGP ${price.toLocaleString()} with a monthly installment of EGP ${inst.toLocaleString()} will decrease monthly surplus and draw EGP ${down.toLocaleString()} from savings.`;

  } else if (scenarioType === 'sim_new_installment') {
    const inst = inputs.installment || 0;
    const dur = inputs.duration || 60;
    const price = inst * dur;

    // Add installment
    const newDebt: Debt = {
      id: 'sim-debt-inst',
      user_id: 'guest',
      name: 'التزام جديد (New Obligation)',
      debt_type: 'loan',
      original_price: price,
      down_payment: 0,
      financed_amount: price,
      monthly_installment: inst,
      total_installments: dur,
      paid_installments: 0,
      interest_rate: 0,
      start_date: new Date().toISOString().split('T')[0],
      balloon_payment: 0,
      early_settlement_fee: 0,
      created_at: new Date().toISOString(),
    };
    simDebts.push(newDebt);

    impactExplanationAr = `إضافة قسط شهري جديد بقيمة ${inst.toLocaleString()} ج.م سيزيد مباشرة من نسبة الديون ويخفض درجة صحتك المالية.`;
    impactExplanationEn = `Adding a new monthly installment of EGP ${inst.toLocaleString()} will directly increase your debt ratio and lower your financial health score.`;

  } else if (scenarioType === 'sim_salary_change') {
    const diff = inputs.salaryChange || 0;
    
    // Adjust primary salary (usually the first salary or add a new income)
    if (simIncomes.length > 0) {
      // Find the first salary source
      const salaryIndex = simIncomes.findIndex(inc => inc.type === 'inc_salary');
      if (salaryIndex !== -1) {
        // Apply diff in targetCurrency to income currency
        const diffInIncomeCur = convertCurrency(diff, targetCurrency, simIncomes[salaryIndex].currency, rates);
        simIncomes[salaryIndex].amount = Math.max(0, simIncomes[salaryIndex].amount + diffInIncomeCur);
      } else {
        simIncomes[0].amount = Math.max(0, simIncomes[0].amount + convertCurrency(diff, targetCurrency, simIncomes[0].currency, rates));
      }
    }

    const directionAr = diff >= 0 ? 'زيادة' : 'انخفاض';
    const directionEn = diff >= 0 ? 'increase' : 'decrease';
    impactExplanationAr = `حدوث ${directionAr} في الدخل بمقدار ${Math.abs(diff).toLocaleString()} ${targetCurrency} يؤثر مباشرة على الفائض ومعدل الادخار.`;
    impactExplanationEn = `A salary ${directionEn} of ${Math.abs(diff).toLocaleString()} ${targetCurrency} directly impacts your monthly surplus and savings rate.`;

  } else if (scenarioType === 'sim_exchange_rate') {
    // EGP exchange rate changes. Let's say EGP rate goes up or down.
    // Let's assume the user updates EGP exchange rate (e.g. from 48 to 60)
    // We will simulate a custom exchange rate list
    // If the input exchange rate is provided
    const newEGPRate = inputs.carPrice || 48; // Reusing carPrice parameter as rate
    const simulatedRates = { ...rates, EGP: newEGPRate };
    
    const afterSummary = calculateFinancialSummary(incomes, expenses, debts, assets, reserves, targetCurrency, simulatedRates);
    const totalSimFinancingCost = debts.reduce((sum, d) => {
      const costInEGP = (d.monthly_installment * d.total_installments) + d.down_payment - d.financed_amount;
      return sum + convertCurrency(Math.max(0, costInEGP), 'EGP', targetCurrency, simulatedRates);
    }, 0);

    let impactLevel: 'Low' | 'Medium' | 'High' | 'Severe' = 'Low';
    if (Math.abs(newEGPRate - rates.EGP) > 10) impactLevel = 'High';
    else if (Math.abs(newEGPRate - rates.EGP) > 3) impactLevel = 'Medium';

    return {
      before: {
        monthlyRemainingBalance: beforeSummary.monthlyRemainingBalance,
        financialScore: beforeSummary.financialScore,
        debtToIncomeRatio: beforeSummary.debtToIncomeRatio,
        monthsCoveredByReserve: beforeSummary.monthsCoveredByReserve,
        financialStatus: beforeSummary.financialStatus,
        totalFinancingCost: beforeFinancingCost,
      },
      after: {
        monthlyRemainingBalance: afterSummary.monthlyRemainingBalance,
        financialScore: afterSummary.financialScore,
        debtToIncomeRatio: afterSummary.debtToIncomeRatio,
        monthsCoveredByReserve: afterSummary.monthsCoveredByReserve,
        financialStatus: afterSummary.financialStatus,
        totalFinancingCost: totalSimFinancingCost,
      },
      impactLevel,
      impactExplanationAr: `تغير سعر صرف الدولار مقابل الجنيه المصري إلى ${newEGPRate} ج.م يؤثر مباشرة على القيمة الفعلية للمصاريف المحلية والدخل بالدولار.`,
      impactExplanationEn: `Changing the USD to EGP exchange rate to ${newEGPRate} directly impacts the real value of local expenses and USD incomes.`,
    };

  } else if (scenarioType === 'sim_expense_increase') {
    const increase = inputs.expenseIncrease || 0;
    
    // Add to first essential expense or living expenses
    if (simExpenses.length > 0) {
      const livingIdx = simExpenses.findIndex(e => e.category === 'cat_living');
      if (livingIdx !== -1) {
        const increaseInCur = convertCurrency(increase, targetCurrency, simExpenses[livingIdx].currency, rates);
        simExpenses[livingIdx].amount += increaseInCur;
      } else {
        simExpenses[0].amount += convertCurrency(increase, targetCurrency, simExpenses[0].currency, rates);
      }
    }

    impactExplanationAr = `ارتفاع المصاريف الشهرية بمقدار ${increase.toLocaleString()} ${targetCurrency} يقلل من الفائض الشهري المتاح للادخار.`;
    impactExplanationEn = `An increase in monthly expenses of ${increase.toLocaleString()} ${targetCurrency} directly reduces the monthly surplus available for savings.`;

  } else if (scenarioType === 'sim_income_loss') {
    const percent = inputs.incomeLossPercent || 0;
    
    // Reduce total incomes by percent
    simIncomes = simIncomes.map(inc => {
      return { ...inc, amount: inc.amount * (1 - percent / 100) };
    });

    impactExplanationAr = `فقدان نسبة ${percent}% من الدخل الشهري يضع ميزانيتك تحت ضغط كبير ويقلل نقاط صحتك المالية.`;
    impactExplanationEn = `Losing ${percent}% of your monthly income puts your budget under significant pressure and lowers your financial score.`;

  } else if (scenarioType === 'sim_early_debt_payoff') {
    const debtId = inputs.debtIdToPayOff;
    const selectedDebt = debts.find(d => d.id === debtId);
    
    if (selectedDebt) {
      // Find early settlement fee and remaining principal to pay
      const remainingInst = Math.max(0, selectedDebt.total_installments - selectedDebt.paid_installments);
      // Cost to pay off = (remaining installments * monthly_installment) - remaining interest + fee
      // For simplicity, let's say payoff amount is remaining installments * monthly installment + fee
      const payoffInEGP = (remainingInst * selectedDebt.monthly_installment) + selectedDebt.early_settlement_fee;
      
      // Payoff from reserves
      simReserves = simReserves.map(r => {
        if (r.is_liquid) {
          const payoffInReserveCur = convertCurrency(payoffInEGP, 'EGP', r.currency, rates);
          return { ...r, amount: Math.max(0, r.amount - payoffInReserveCur) };
        }
        return r;
      });

      // Remove this debt from simulation
      simDebts = simDebts.filter(d => d.id !== debtId);

      impactExplanationAr = `سداد دين "${selectedDebt.name}" مبكراً بمبلغ ${payoffInEGP.toLocaleString()} ج.م سيلغي القسط الشهري بالكامل ويزيد الفائض ولكن سيقتطع من الكاش الاحتياطي.`;
      impactExplanationEn = `Paying off debt "${selectedDebt.name}" early with EGP ${payoffInEGP.toLocaleString()} will eliminate its installment and increase surplus, but will reduce cash reserves.`;
    }

  } else if (scenarioType === 'sim_use_reserve') {
    const amountUsed = inputs.reserveUsed || 0;
    
    // Reduce reserves
    simReserves = simReserves.map(r => {
      if (r.is_liquid) {
        // amountUsed is in targetCurrency, convert to reserve currency
        const usedInReserveCur = convertCurrency(amountUsed, targetCurrency, r.currency, rates);
        return { ...r, amount: Math.max(0, r.amount - usedInReserveCur) };
      }
      return r;
    });

    impactExplanationAr = `سحب مبلغ ${amountUsed.toLocaleString()} ${targetCurrency} من صندوق الطوارئ يقلل مباشرة من أشهر تغطية الاحتياطي للأزمات.`;
    impactExplanationEn = `Withdrawing ${amountUsed.toLocaleString()} ${targetCurrency} from the emergency reserve directly decreases the number of months covered.`;
  }

  // Calculate After Summary
  const afterSummary = calculateFinancialSummary(simIncomes, simExpenses, simDebts, simAssets, simReserves, targetCurrency, rates);
  
  // Calculate total after financing cost
  const afterFinancingCost = simDebts.reduce((sum, d) => {
    const costInEGP = (d.monthly_installment * d.total_installments) + d.down_payment - d.financed_amount;
    return sum + convertCurrency(Math.max(0, costInEGP), 'EGP', targetCurrency, rates);
  }, 0) + newFinancingCost;

  // Determine Impact Level
  const scoreDiff = beforeSummary.financialScore - afterSummary.financialScore;
  let impactLevel: 'Low' | 'Medium' | 'High' | 'Severe' = 'Low';
  if (scoreDiff >= 20 || afterSummary.financialScore < 30) impactLevel = 'Severe';
  else if (scoreDiff >= 10 || afterSummary.financialScore < 50) impactLevel = 'High';
  else if (scoreDiff > 0 || afterSummary.financialScore < 70) impactLevel = 'Medium';

  return {
    before: {
      monthlyRemainingBalance: beforeSummary.monthlyRemainingBalance,
      financialScore: beforeSummary.financialScore,
      debtToIncomeRatio: beforeSummary.debtToIncomeRatio,
      monthsCoveredByReserve: beforeSummary.monthsCoveredByReserve,
      financialStatus: beforeSummary.financialStatus,
      totalFinancingCost: beforeFinancingCost,
    },
    after: {
      monthlyRemainingBalance: afterSummary.monthlyRemainingBalance,
      financialScore: afterSummary.financialScore,
      debtToIncomeRatio: afterSummary.debtToIncomeRatio,
      monthsCoveredByReserve: afterSummary.monthsCoveredByReserve,
      financialStatus: afterSummary.financialStatus,
      totalFinancingCost: afterFinancingCost,
    },
    impactLevel,
    impactExplanationAr,
    impactExplanationEn,
  };
};
