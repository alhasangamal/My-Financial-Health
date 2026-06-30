export const formatCurrency = (value: number, currency: string, lang: 'ar' | 'en'): string => {
  const locale = lang === 'ar' ? 'ar-EG' : 'en-US';
  
  // Custom display for common currencies in Arabic to look clean
  const currencyLabels: Record<string, Record<string, string>> = {
    EGP: { ar: 'ج.م', en: 'EGP' },
    USD: { ar: '$', en: 'USD' },
    OMR: { ar: 'ر.ع.', en: 'OMR' },
    SAR: { ar: 'ر.س', en: 'SAR' },
    AED: { ar: 'د.إ', en: 'AED' },
  };

  const cleanVal = Math.round(value);
  const formattedNumber = cleanVal.toLocaleString(locale);
  const label = currencyLabels[currency]?.[lang] || currency;

  if (lang === 'ar') {
    return `${formattedNumber} ${label}`;
  } else {
    return `${label} ${formattedNumber}`;
  }
};

export const formatPercent = (value: number, lang: 'ar' | 'en'): string => {
  const locale = lang === 'ar' ? 'ar-EG' : 'en-US';
  return `${parseFloat(value.toFixed(1)).toLocaleString(locale)}%`;
};

export const formatNumber = (value: number, lang: 'ar' | 'en'): string => {
  const locale = lang === 'ar' ? 'ar-EG' : 'en-US';
  return value.toLocaleString(locale);
};
