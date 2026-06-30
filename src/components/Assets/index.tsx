import React, { useState } from 'react';
import { useTranslation } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { Asset, AssetType, LiquidityLevel } from '../../types';
import { formatCurrency } from '../../utils/format';
import { Plus, Edit2, Trash2, X, Sparkles, PiggyBank, Landmark, TrendingUp } from 'lucide-react';

interface AssetsProps {
  assets: Asset[];
  outstandingDebt: number;
  onAdd: (asset: Omit<Asset, 'id' | 'created_at'>) => Promise<void>;
  onEdit: (id: string, updates: Partial<Asset>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export const Assets: React.FC<AssetsProps> = ({ assets, outstandingDebt, onAdd, onEdit, onDelete }) => {
  const { t, language, dir } = useTranslation();
  const { theme } = useTheme();
  const { profile } = useAuth();
  
  const baseCurrency = profile?.main_currency || 'USD';
  const isAr = language === 'ar';

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [assetType, setAssetType] = useState<AssetType>('cash');
  const [currentValue, setCurrentValue] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [currency, setCurrency] = useState('EGP');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [liquidityLevel, setLiquidityLevel] = useState<LiquidityLevel>('high');
  const [notes, setNotes] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !currentValue) return;

    const parsedValue = parseFloat(currentValue);
    const parsedPrice = parseFloat(purchasePrice) || undefined;

    const data = {
      user_id: profile?.id || 'guest-id',
      name,
      asset_type: assetType,
      current_value: parsedValue,
      purchase_price: parsedPrice,
      currency,
      purchase_date: purchaseDate || undefined,
      liquidity_level: liquidityLevel,
      notes: notes || undefined,
    };

    if (editingId) {
      await onEdit(editingId, data);
      setEditingId(null);
    } else {
      await onAdd(data);
      setShowAddForm(false);
    }

    resetForm();
  };

  const startEdit = (asset: Asset) => {
    setEditingId(asset.id);
    setName(asset.name);
    setAssetType(asset.asset_type);
    setCurrentValue(String(asset.current_value));
    setPurchasePrice(asset.purchase_price ? String(asset.purchase_price) : '');
    setCurrency(asset.currency);
    setPurchaseDate(asset.purchase_date || '');
    setLiquidityLevel(asset.liquidity_level);
    setNotes(asset.notes || '');
    setShowAddForm(true);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setShowAddForm(false);
    resetForm();
  };

  const resetForm = () => {
    setName('');
    setAssetType('cash');
    setCurrentValue('');
    setPurchasePrice('');
    setCurrency('EGP');
    setPurchaseDate('');
    setLiquidityLevel('high');
    setNotes('');
  };

  // Calculations
  // Total assets converted to baseCurrency
  // Using Mock rates from context or direct
  const exchangeRates = { USD: 1.0, EGP: 48.0, OMR: 0.385, SAR: 3.75, AED: 3.67 }; // Centralizing rates
  
  const convertToMain = (amt: number, cur: string) => {
    const rateFrom = exchangeRates[cur as keyof typeof exchangeRates] || 1;
    const rateTo = exchangeRates[baseCurrency as keyof typeof exchangeRates] || 1;
    return (amt / rateFrom) * rateTo;
  };

  const totalAssetsValue = assets.reduce((sum, asset) => {
    return sum + convertToMain(asset.current_value, asset.currency);
  }, 0);

  const netWorth = totalAssetsValue - outstandingDebt;

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">{t('assets')}</h2>
          <span className="text-xs opacity-60">
            {language === 'ar' ? 'تتبع أصولك الاستثمارية والادخارية وقيم ثروتك الإجمالية' : 'Track your investments, savings, and evaluate your overall net worth'}
          </span>
        </div>
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:scale-105 active:scale-95 text-white text-xs font-bold shadow-lg shadow-emerald-500/10 transition-all cursor-pointer"
          >
            <Plus className="w-4.5 h-4.5" />
            <span>{t('add')}</span>
          </button>
        )}
      </div>

      {/* Net Worth Summary Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className={`p-5 rounded-3xl border shadow-md flex items-center gap-4.5
          ${theme === 'dark' ? 'bg-slate-900/40 border-slate-800/80' : 'bg-white border-slate-200'}`}
        >
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
            <PiggyBank className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] opacity-60 font-semibold">{t('totalAssets')}</span>
            <h3 className="text-xl font-black mt-0.5">{formatCurrency(totalAssetsValue, baseCurrency, language)}</h3>
          </div>
        </div>

        <div className={`p-5 rounded-3xl border shadow-md flex items-center gap-4.5
          ${theme === 'dark' ? 'bg-slate-900/40 border-slate-800/80' : 'bg-white border-slate-200'}`}
        >
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500">
            <Landmark className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] opacity-60 font-semibold">{t('totalOutstandingDebt')}</span>
            <h3 className="text-xl font-black mt-0.5">{formatCurrency(outstandingDebt, baseCurrency, language)}</h3>
          </div>
        </div>

        <div className={`p-6 rounded-3xl border shadow-lg flex items-center gap-4.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white`}
        >
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] opacity-80 font-bold">{t('netWorth')} (الأصول - الديون)</span>
            <h3 className="text-2xl font-black mt-0.5">{formatCurrency(netWorth, baseCurrency, language)}</h3>
          </div>
        </div>
      </div>

      {/* Form */}
      {showAddForm && (
        <div className={`p-6 rounded-3xl border shadow-lg
          ${theme === 'dark' ? 'bg-slate-900/40 border-slate-800/80' : 'bg-white border-slate-200/80 shadow-sm'}`}
        >
          <div className="flex items-center justify-between mb-6 pb-3 border-b border-slate-800/10">
            <h3 className="font-bold text-sm flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-500" />
              <span>{editingId ? t('edit') : t('add')}</span>
            </h3>
            <button onClick={cancelEdit} className="p-1.5 rounded-lg hover:bg-slate-500/10 text-slate-400">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 text-xs">
            {/* Name */}
            <div className="space-y-1.5">
              <label className="font-bold opacity-80">{t('name')}</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={isAr ? 'حساب التوفير البنكي' : 'Bank Savings Account'}
                className={`w-full p-2.5 rounded-xl border focus:ring-1 focus:ring-emerald-500 focus:outline-none
                  ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
              />
            </div>

            {/* Asset Type */}
            <div className="space-y-1.5">
              <label className="font-bold opacity-80">{t('type')}</label>
              <select
                value={assetType}
                onChange={(e) => setAssetType(e.target.value as any)}
                className={`w-full p-2.5 rounded-xl border focus:ring-1 focus:ring-emerald-500 focus:outline-none
                  ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
              >
                {['cash', 'bank', 'gold', 'investment', 'property', 'vehicle', 'business', 'other'].map(k => (
                  <option key={k} value={k}>{t(k)}</option>
                ))}
              </select>
            </div>

            {/* Current Value */}
            <div className="space-y-1.5">
              <label className="font-bold opacity-80">{isAr ? 'القيمة التقديرية الحالية' : 'Current Estimated Value'}</label>
              <input
                type="number"
                required
                min="0"
                value={currentValue}
                onChange={(e) => setCurrentValue(e.target.value)}
                placeholder="200000"
                className={`w-full p-2.5 rounded-xl border focus:ring-1 focus:ring-emerald-500 focus:outline-none
                  ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
              />
            </div>

            {/* Purchase Price */}
            <div className="space-y-1.5">
              <label className="font-bold opacity-80">{isAr ? 'سعر الشراء الأصلي (اختياري)' : 'Original Purchase Price (Optional)'}</label>
              <input
                type="number"
                min="0"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                placeholder="180000"
                className={`w-full p-2.5 rounded-xl border focus:ring-1 focus:ring-emerald-500 focus:outline-none
                  ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
              />
            </div>

            {/* Currency */}
            <div className="space-y-1.5">
              <label className="font-bold opacity-80">{t('currency')}</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className={`w-full p-2.5 rounded-xl border focus:ring-1 focus:ring-emerald-500 focus:outline-none
                  ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
              >
                {['EGP', 'USD', 'OMR', 'SAR', 'AED'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Purchase Date */}
            <div className="space-y-1.5">
              <label className="font-bold opacity-80">{isAr ? 'تاريخ الشراء' : 'Purchase Date'}</label>
              <input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className={`w-full p-2.5 rounded-xl border focus:ring-1 focus:ring-emerald-500 focus:outline-none
                  ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
              />
            </div>

            {/* Liquidity Level */}
            <div className="space-y-1.5">
              <label className="font-bold opacity-80">{t('liquidity')}</label>
              <select
                value={liquidityLevel}
                onChange={(e) => setLiquidityLevel(e.target.value as any)}
                className={`w-full p-2.5 rounded-xl border focus:ring-1 focus:ring-emerald-500 focus:outline-none
                  ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
              >
                {['high', 'medium', 'low'].map(l => (
                  <option key={l} value={l}>{t(l)}</option>
                ))}
              </select>
            </div>

            {/* Notes */}
            <div className="space-y-1.5 lg:col-span-2">
              <label className="font-bold opacity-80">{t('notes')}</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={isAr ? 'ملاحظات عن الأصل وقيمته...' : 'Asset details...'}
                className={`w-full p-2.5 rounded-xl border focus:ring-1 focus:ring-emerald-500 focus:outline-none h-18 resize-none
                  ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
              />
            </div>

            {/* Actions */}
            <div className="lg:col-span-3 flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={cancelEdit}
                className={`px-4 py-2 rounded-xl font-semibold border transition-all cursor-pointer
                  ${theme === 'dark' 
                    ? 'bg-slate-900 border-slate-800 hover:bg-slate-950' 
                    : 'bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-700'}`}
              >
                {t('cancel')}
              </button>
              
              <button
                type="submit"
                className="px-5 py-2 rounded-xl font-bold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-md shadow-emerald-500/10 cursor-pointer"
              >
                {editingId ? t('save') : t('add')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Assets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {assets.length === 0 ? (
          <div className={`p-8 text-center rounded-3xl border shadow-md md:col-span-3 opacity-60 font-semibold
            ${theme === 'dark' ? 'bg-slate-900/40 border-slate-800/80' : 'bg-white border-slate-200'}`}
          >
            <p>{isAr ? 'لا توجد أي أصول مسجلة حالياً.' : 'No assets recorded.'}</p>
          </div>
        ) : (
          assets.map((asset) => {
            const equiv = convertToMain(asset.current_value, asset.currency);
            
            // Liquidity badge colors
            const getLiqColor = (lvl: string) => {
              if (lvl === 'high') return 'bg-emerald-500/15 border-emerald-500/20 text-emerald-400';
              if (lvl === 'medium') return 'bg-amber-500/15 border-amber-500/20 text-amber-400';
              return 'bg-rose-500/15 border-rose-500/20 text-rose-400';
            };

            return (
              <div
                key={asset.id}
                className={`p-5 rounded-3xl border shadow-lg flex flex-col justify-between transition-all duration-300 hover:shadow-xl
                  ${theme === 'dark' ? 'bg-slate-900/40 border-slate-800/80' : 'bg-white border-slate-200'}`}
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase
                        ${theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'}`}
                      >
                        {t(asset.asset_type)}
                      </span>
                      <h4 className="text-sm font-bold mt-1.5">{asset.name}</h4>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => startEdit(asset)}
                        className="p-1 rounded-lg hover:bg-emerald-500/10 text-emerald-500 cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDelete(asset.id)}
                        className="p-1 rounded-lg hover:bg-rose-500/10 text-rose-500 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 space-y-1">
                    <span className="text-[10px] opacity-60 font-semibold block">{isAr ? 'القيمة الحالية' : 'Current Value'}</span>
                    <span className="text-xl font-black block">{formatCurrency(asset.current_value, asset.currency, language)}</span>
                    {asset.currency !== baseCurrency && (
                      <span className="text-[10px] text-emerald-500 block">
                        ≈ {formatCurrency(equiv, baseCurrency, language)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-5 border-t border-slate-800/10 pt-3 flex items-center justify-between text-[10px]">
                  <div>
                    <span className="opacity-60 block">{t('liquidity')}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border block mt-0.5 ${getLiqColor(asset.liquidity_level)}`}>
                      {t(asset.liquidity_level)}
                    </span>
                  </div>
                  {asset.purchase_date && (
                    <div className="text-end">
                      <span className="opacity-60 block">{isAr ? 'تاريخ الحيازة' : 'Acquired Date'}</span>
                      <span className="font-bold block mt-0.5">{asset.purchase_date}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
