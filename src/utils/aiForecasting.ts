import { FinancialSnapshot, IncomeSource, Expense, Debt } from '../types';
import { calculateFinancialSummary } from './calculations';

export interface ForecastState {
  income: number;
  expenses: number;
  savings: number;
  savingsRate: number;
  livingStandard: 'Luxurious' | 'Balanced' | 'Stressed' | 'Critical';
  livingStandardLabelAr: string;
  livingStandardLabelEn: string;
}

export interface AIForecastResult {
  lastMonth: ForecastState | null;
  thisMonth: ForecastState;
  nextMonth: ForecastState;
  trend: 'Improving' | 'Stable' | 'Declining';
  trendLabelAr: string;
  trendLabelEn: string;
  explanationAr: string;
  explanationEn: string;
  confidence: number; // 0 to 100
}

export const generateAIForecast = (
  snapshots: FinancialSnapshot[],
  incomes: IncomeSource[],
  expenses: Expense[],
  debts: Debt[],
  targetCurrency: string,
  rates: Record<string, number>
): AIForecastResult => {
  // 1. Calculate current active stats as the baseline for "this month"
  const currentSummary = calculateFinancialSummary(incomes, expenses, debts, [], [], targetCurrency, rates);
  
  const currentIncome = currentSummary.totalMonthlyIncome;
  const currentExpenses = currentSummary.totalMonthlyExpenses + currentSummary.totalMonthlyInstallments;
  const currentSavings = currentSummary.monthlyRemainingBalance;
  const currentSavingsRate = currentIncome > 0 ? (currentSavings / currentIncome) * 100 : 0;

  // Living standard classifier
  const classifyLivingStandard = (exp: number, inc: number) => {
    if (inc === 0) return { key: 'Critical' as const, ar: 'حرج جداً', en: 'Critical' };
    const ratio = (exp / inc) * 100;
    if (ratio < 45) return { key: 'Luxurious' as const, ar: 'مترف ومريح', en: 'Luxurious & Comfortable' };
    if (ratio <= 65) return { key: 'Balanced' as const, ar: 'متوازن ومستقر', en: 'Balanced & Stable' };
    if (ratio <= 85) return { key: 'Stressed' as const, ar: 'مضغوط ومتحفظ', en: 'Stressed & Cautious' };
    return { key: 'Critical' as const, ar: 'حرج وعجز مالي', en: 'Critical & Deficit' };
  };

  const activeLiving = classifyLivingStandard(currentExpenses, currentIncome);

  // 2. Analyze historical snapshots to compute MoM trends
  let incomeTrendPct = 0; // 0% MoM
  let expenseTrendPct = 0; // 0% MoM
  let lastMonthState: ForecastState | null = null;
  let confidence = 70; // Base confidence 70%

  if (snapshots.length >= 2) {
    // Sort snapshots chronologically
    const sorted = [...snapshots].sort((a, b) => new Date(a.snapshot_date).getTime() - new Date(b.snapshot_date).getTime());
    
    // Calculate last month state
    const lm = sorted[sorted.length - 1];
    const lmLiving = classifyLivingStandard(lm.total_expenses + lm.total_installments, lm.total_income);
    lastMonthState = {
      income: lm.total_income,
      expenses: lm.total_expenses + lm.total_installments,
      savings: lm.monthly_surplus,
      savingsRate: lm.total_income > 0 ? (lm.monthly_surplus / lm.total_income) * 100 : 0,
      livingStandard: lmLiving.key,
      livingStandardLabelAr: lmLiving.ar,
      livingStandardLabelEn: lmLiving.en,
    };

    // Calculate trends across snapshots
    let totalIncDiff = 0;
    let totalExpDiff = 0;
    
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];
      
      const incDiff = prev.total_income > 0 ? (curr.total_income - prev.total_income) / prev.total_income : 0;
      const expDiff = (prev.total_expenses + prev.total_installments) > 0 
        ? ((curr.total_expenses + curr.total_installments) - (prev.total_expenses + prev.total_installments)) / (prev.total_expenses + prev.total_installments)
        : 0;

      totalIncDiff += incDiff;
      totalExpDiff += expDiff;
    }

    const divisor = sorted.length - 1;
    incomeTrendPct = totalIncDiff / divisor;
    expenseTrendPct = totalExpDiff / divisor;
    
    // Increase confidence with more snapshots
    confidence = Math.min(95, 70 + (snapshots.length * 4));
  } else {
    // Fallback: estimate variation based on variable items
    const variableExpenses = expenses.filter(e => !e.is_fixed).reduce((sum, e) => sum + e.amount, 0);
    // Convert to target base
    const ratesForConv = rates;
    const rateFrom = ratesForConv['EGP'] || 1;
    const rateTo = ratesForConv[targetCurrency] || 1;
    const varExpInBase = (variableExpenses / rateFrom) * rateTo;
    
    // Assume 3% average growth in expenses if no snapshots
    expenseTrendPct = varExpInBase > 0 ? 0.03 : 0.01;
    incomeTrendPct = 0;
    confidence = 55; // lower confidence with no snapshots
  }

  // Cap ridiculous trends
  incomeTrendPct = Math.max(-0.2, Math.min(0.2, incomeTrendPct));
  expenseTrendPct = Math.max(-0.15, Math.min(0.2, expenseTrendPct));

  // Read user-defined expected inflation rate and convert to monthly factor
  const annualInflationPct = parseFloat(localStorage.getItem('my_fin_health_inflation_rate') || '12');
  const monthlyInflationFactor = annualInflationPct > 0 ? (annualInflationPct / 100) / 12 : 0;

  // 3. Project "This Month" (applying half the trend rate + inflation to current active stats)
  const thisMonthIncome = currentIncome * (1 + incomeTrendPct * 0.5);
  const thisMonthExpenses = currentExpenses * (1 + expenseTrendPct * 0.5 + monthlyInflationFactor);
  const thisMonthSavings = thisMonthIncome - thisMonthExpenses;
  const thisMonthSavingsRate = thisMonthIncome > 0 ? (thisMonthSavings / thisMonthIncome) * 100 : 0;
  const thisMonthLiving = classifyLivingStandard(thisMonthExpenses, thisMonthIncome);

  const thisMonth: ForecastState = {
    income: thisMonthIncome,
    expenses: thisMonthExpenses,
    savings: thisMonthSavings,
    savingsRate: thisMonthSavingsRate,
    livingStandard: thisMonthLiving.key,
    livingStandardLabelAr: thisMonthLiving.ar,
    livingStandardLabelEn: thisMonthLiving.en,
  };

  // 4. Project "Next Month" (applying full trend rate + inflation to this month)
  const nextMonthIncome = thisMonthIncome * (1 + incomeTrendPct);
  const nextMonthExpenses = thisMonthExpenses * (1 + expenseTrendPct + monthlyInflationFactor);
  const nextMonthSavings = nextMonthIncome - nextMonthExpenses;
  const nextMonthSavingsRate = nextMonthIncome > 0 ? (nextMonthSavings / nextMonthIncome) * 100 : 0;
  const nextMonthLiving = classifyLivingStandard(nextMonthExpenses, nextMonthIncome);

  const nextMonth: ForecastState = {
    income: nextMonthIncome,
    expenses: nextMonthExpenses,
    savings: nextMonthSavings,
    savingsRate: nextMonthSavingsRate,
    livingStandard: nextMonthLiving.key,
    livingStandardLabelAr: nextMonthLiving.ar,
    livingStandardLabelEn: nextMonthLiving.en,
  };

  // 5. Trend direction & Explanations
  let trend: 'Improving' | 'Stable' | 'Declining' = 'Stable';
  let trendLabelAr = 'مستقر';
  let trendLabelEn = 'Stable';

  if (nextMonthSavingsRate - thisMonthSavingsRate > 2) {
    trend = 'Improving';
    trendLabelAr = 'يتحسن ويرتفع';
    trendLabelEn = 'Improving';
  } else if (thisMonthSavingsRate - nextMonthSavingsRate > 2) {
    trend = 'Declining';
    trendLabelAr = 'يتراجع وينخفض';
    trendLabelEn = 'Declining';
  }

  // Generate localized explanation paragraph
  let explanationAr = '';
  let explanationEn = '';

  const formattedThisIncome = Math.round(thisMonth.income).toLocaleString('ar-EG');
  const formattedNextExpenses = Math.round(nextMonth.expenses).toLocaleString('ar-EG');
  const rateDiff = (nextMonthSavingsRate - thisMonthSavingsRate).toFixed(1);

  if (trend === 'Improving') {
    explanationAr = `تشير التوقعات الذكية إلى تحسن مستمر في صحتك المالية الشهر المقبل. يرجع ذلك إلى استقرار أو زيادة دخلك الشهري بمعدل ${(incomeTrendPct * 100).toFixed(1)}% مع ترشيد النفقات. من المتوقع أن يرتفع معدل ادخارك بنسبة ${Math.abs(parseFloat(rateDiff))}% لتصل إلى ${nextMonth.savingsRate.toFixed(0)}%. ننصحك باستغلال الفائض الإضافي لزيادة صندوق الطوارئ الخاص بك.`;
    explanationEn = `Predictive models indicate an improving trend for next month. This is driven by your income projected to grow by ${(incomeTrendPct * 100).toFixed(1)}% MoM alongside expense optimization. Your savings rate is forecasted to rise by ${Math.abs(parseFloat(rateDiff))}% to settle at ${nextMonth.savingsRate.toFixed(0)}%. We advise directing this surplus into your emergency buffer.`;
  } else if (trend === 'Declining') {
    explanationAr = `تحذير: يتوقع محرك الذكاء الاصطناعي تراجعاً في فائضك المالي الشهر المقبل بنسبة ${Math.abs(parseFloat(rateDiff))}%. تتزايد نفقاتك المعيشية بمعدل ${(expenseTrendPct * 100).toFixed(1)}% شهرياً. للوقاية من العجز، يوصى بتقليص المصاريف الاختيارية وغير الأساسية وتجميد الاشتراكات غير الهامة فوراً لتعديل مسار التدفق النقدي.`;
    explanationEn = `Warning: AI engines project a decline in your financial surplus next month by ${Math.abs(parseFloat(rateDiff))}%. Your cost of living is rising at ${(expenseTrendPct * 100).toFixed(1)}% MoM. To prevent a budget deficit, we highly recommend auditing optional subscriptions and limiting discretionary spending.`;
  } else {
    explanationAr = `تظهر التحليلات استقراراً تاماً في نمط معيشتك ودخلك المالي للفترة المقبلة. الدخل والمصاريف ينموان بنسب متقاربة، مما يحافظ على معدل توفير مستقر حول ${nextMonth.savingsRate.toFixed(0)}%. ننصحك بالبدء في جدولة أهداف مالية متوسطة المدى لاستثمار هذا الاستقرار بشكل أفضل.`;
    explanationEn = `Analytics indicate a stable forecast for your living standard and income. Inflows and outflows are growing at matching rates, maintaining a steady savings rate around ${nextMonth.savingsRate.toFixed(0)}%. We recommend setting medium-term financial goals to utilize this stability.`;
  }

  return {
    lastMonth: lastMonthState,
    thisMonth,
    nextMonth,
    trend,
    trendLabelAr,
    trendLabelEn,
    explanationAr,
    explanationEn,
    confidence
  };
};
