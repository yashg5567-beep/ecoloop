import React, { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import {
  Calculator,
  Building2,
  MessageSquareHeart,
  ShieldCheck,
  RotateCcw,
  Download,
  Printer,
  MapPin,
  Sparkles,
  Flag,
  Trash2,
  Plus,
  Loader2,
} from 'lucide-react';
import {
  BusinessWasteEntry,
  EmissionFactorRow,
  ScrapRateRow,
  ShoutOutPost,
  WasteCategory,
  WasteCategoryEnum,
} from '../types/waste';
import {
  calculateEnvironmentalImpact,
  calculateScrapValue,
} from '../services/calculators';
import {
  BusinessAiInsight,
  fetchBusinessAiInsights,
} from '../services/geminiService';

export type MoreSubTab = 'calculators' | 'business' | 'shoutouts' | 'privacy';

interface MoreViewProps {
  activeSubTab: MoreSubTab;
  onSelectSubTab: (sub: MoreSubTab) => void;
  demoMode: boolean;
  emissionFactors: EmissionFactorRow[];
  scrapRates: ScrapRateRow[];
  onUpdateEmissionFactors: (factors: EmissionFactorRow[]) => void;
  onResetEmissionFactors: () => void;
  onUpdateScrapRates: (rates: ScrapRateRow[]) => void;
  onResetScrapRates: () => void;
  businessLogs: BusinessWasteEntry[];
  onAddBusinessLog: (entry: Omit<BusinessWasteEntry, 'id'>) => void;
  onDeleteBusinessLog: (id: string) => void;
  shoutOuts: ShoutOutPost[];
  onAddShoutOut: (
    nickname: string,
    message: string,
    actionTag: ShoutOutPost['actionTag']
  ) => { ok: boolean; error?: string };
  onReactShoutOut: (id: string, type: 'leaf' | 'clap' | 'spark') => void;
  onReportShoutOut: (id: string) => void;
  onNavigateToMap: () => void;
  onOpenClearDataModal: () => void;
}

function getAvatarEmojiAndColor(nickname: string, tag: ShoutOutPost['actionTag']) {
  const emojis: Record<ShoutOutPost['actionTag'], string> = {
    Repaired: '🛠️',
    Reused: '♻️',
    Recycled: '🌱',
    'Safe E-Waste Drop': '🔋',
  };
  const colors = [
    'bg-[#22C55E] text-[#0F1A14]',
    'bg-[#C6F432] text-[#0F1A14]',
    'bg-[#FFD84D] text-[#0F1A14]',
    'bg-sky-400 text-[#0F1A14]',
  ];
  const idx = (nickname.charCodeAt(0) || 0) % colors.length;
  return {
    emoji: emojis[tag] || '🌱',
    initials: (nickname || 'EC').slice(0, 2).toUpperCase(),
    colorClass: colors[idx],
  };
}

export const MoreView: React.FC<MoreViewProps> = ({
  activeSubTab,
  onSelectSubTab,
  demoMode,
  emissionFactors,
  scrapRates,
  onUpdateEmissionFactors,
  onResetEmissionFactors,
  onUpdateScrapRates,
  onResetScrapRates,
  businessLogs,
  onAddBusinessLog,
  onDeleteBusinessLog,
  shoutOuts,
  onAddShoutOut,
  onReactShoutOut,
  onReportShoutOut,
  onNavigateToMap,
  onOpenClearDataModal,
}) => {
  // --- 1. Standalone Calculators State ---
  const [calcCategory, setCalcCategory] = useState<WasteCategory>('metal');
  const [calcWeight, setCalcWeight] = useState<string>('2.5');
  const [calcMaterialDesc, setCalcMaterialDesc] = useState<string>(
    'Clean sorted aluminum beverage cans'
  );

  // --- 2. Business Bulk Logger State ---
  const [bizDate, setBizDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [bizCategory, setBizCategory] = useState<WasteCategory>('paper');
  const [bizMaterial, setBizMaterial] = useState<string>('');
  const [bizWeight, setBizWeight] = useState<string>('15');
  const [bizDept, setBizDept] = useState<string>('Main Office / Receiving');
  const [bizAiInsight, setBizAiInsight] = useState<BusinessAiInsight | null>(null);
  const [bizAiLoading, setBizAiLoading] = useState<boolean>(false);
  const [bizAiError, setBizAiError] = useState<string | null>(null);

  // --- 3. Shout-Out Wall State ---
  const [soNickname, setSoNickname] = useState<string>('');
  const [soMessage, setSoMessage] = useState<string>('');
  const [soTag, setSoTag] = useState<ShoutOutPost['actionTag']>('Recycled');
  const [soError, setSoError] = useState<string | null>(null);
  const [soSuccess, setSoSuccess] = useState<string | null>(null);

  const parsedCalcWeight = parseFloat(calcWeight) || 0;
  const standaloneImpact = calculateEnvironmentalImpact(
    calcCategory,
    parsedCalcWeight,
    emissionFactors,
    'recycle'
  );
  const standaloneScrap = calculateScrapValue(
    calcCategory,
    parsedCalcWeight,
    scrapRates
  );

  const handleFactorChange = (id: string, newVal: string) => {
    const num = newVal.trim() === '' ? null : parseFloat(newVal);
    const updated = emissionFactors.map((row) =>
      row.id === id
        ? {
            ...row,
            factorKgCO2ePerKg:
              num !== null && !Number.isNaN(num) && num >= 0 ? num : null,
          }
        : row
    );
    onUpdateEmissionFactors(updated);
  };

  const handleScrapRateChange = (id: string, newVal: string) => {
    const num = parseFloat(newVal);
    if (Number.isNaN(num) || num < 0) return;
    const updated = scrapRates.map((row) =>
      row.id === id ? { ...row, rateInrPerKg: num } : row
    );
    onUpdateScrapRates(updated);
  };

  const totalBizWeightKg = businessLogs.reduce((sum, b) => sum + b.weightKg, 0);
  let totalBizImpactKgCO2e = 0;
  let totalBizScrapInr = 0;

  const bizByCategory: Record<string, { category: string; weightKg: number }> = {};

  businessLogs.forEach((b) => {
    const imp = calculateEnvironmentalImpact(b.category, b.weightKg, emissionFactors);
    if (imp.status === 'calculated' && imp.estimatedSavingsKgCO2e !== null) {
      totalBizImpactKgCO2e += imp.estimatedSavingsKgCO2e;
    }
    const scr = calculateScrapValue(b.category, b.weightKg, scrapRates);
    totalBizScrapInr += scr.estimatedValueInr;

    const key = b.category.toUpperCase();
    if (!bizByCategory[key]) {
      bizByCategory[key] = { category: key, weightKg: 0 };
    }
    bizByCategory[key].weightKg = Number((bizByCategory[key].weightKg + b.weightKg).toFixed(2));
  });

  const bizChartData = Object.values(bizByCategory);

  const handleAddBizEntry = (e: React.FormEvent) => {
    e.preventDefault();
    const w = parseFloat(bizWeight);
    if (Number.isNaN(w) || w <= 0) return;
    onAddBusinessLog({
      date: bizDate || new Date().toISOString().slice(0, 10),
      category: bizCategory,
      materialDetail: bizMaterial.trim() || `${bizCategory.toUpperCase()} bulk batch`,
      weightKg: w,
      departmentOrSource: bizDept.trim() || 'General Operations',
    });
    setBizMaterial('');
  };

  const handleGenerateBusinessAi = async () => {
    setBizAiError(null);
    if (demoMode) {
      setBizAiInsight({
        executiveSummary:
          'Demo AI Summary: Based on your logged bulk paper (48.5 kg) and IT e-waste (19.2 kg), your facility can cut landfill waste by separating clean corrugated cartons at the receiving bay and scheduling quarterly certified e-waste pickups.',
        recommendations: [
          {
            title: 'Consolidate Receiving Bay Cardboard Bales',
            action:
              'Keep corrugated cartons dry and flat on pallets to maximize recovery efficiency and illustrative scrap value.',
            priority: 'High',
          },
          {
            title: 'Isolate IT Lab UPS Batteries from Peripheral Cables',
            action:
              'Store lead-acid or lithium UPS battery packs separately from keyboards and patch cords before handing over to registered e-waste recyclers.',
            priority: 'High',
          },
          {
            title: 'Switch Cafeteria Hydration to Refill Dispensers',
            action:
              'Reduce recurring PET bottle volume (14 kg logged) by installing filtered refill stations.',
            priority: 'Medium',
          },
        ],
        isAiGenerated: true,
      });
      return;
    }

    setBizAiLoading(true);
    try {
      const insight = await fetchBusinessAiInsights(businessLogs);
      setBizAiInsight(insight);
    } catch (err) {
      setBizAiError(
        err instanceof Error
          ? err.message
          : 'Could not generate AI tips right now. Try Demo Mode or retry later.'
      );
    } finally {
      setBizAiLoading(false);
    }
  };

  const handleDownloadBusinessCsv = () => {
    const headers = [
      'Date',
      'Category',
      'Material Detail',
      'Department / Source',
      'Weight (kg)',
      'Estimated Potential Savings (kg CO2e)',
      'Illustrative Scrap Value (INR)',
      'Record Type',
    ];
    const rows = businessLogs.map((b) => {
      const imp = calculateEnvironmentalImpact(b.category, b.weightKg, emissionFactors);
      const scr = calculateScrapValue(b.category, b.weightKg, scrapRates);
      return [
        b.date,
        b.category,
        `"${b.materialDetail.replace(/"/g, '""')}"`,
        `"${b.departmentOrSource.replace(/"/g, '""')}"`,
        b.weightKg,
        imp.status === 'calculated' ? imp.estimatedSavingsKgCO2e : 'Insufficient data',
        scr.estimatedValueInr,
        b.isDemo ? 'Demo Data' : 'User Logged',
      ].join(',');
    });

    const disclaimerRow = `\n"Disclaimer: CO2e values are estimated potential savings (not measured). Scrap values in INR are illustrative estimates (actual prices vary)."`;
    const csvContent = `${headers.join(',')}\n${rows.join('\n')}${disclaimerRow}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `econom-business-sustainability-report-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePostShoutOut = (e: React.FormEvent) => {
    e.preventDefault();
    setSoError(null);
    setSoSuccess(null);
    const res = onAddShoutOut(soNickname, soMessage, soTag);
    if (!res.ok) {
      setSoError(res.error || 'Could not post shout-out.');
      return;
    }
    setSoMessage('');
    setSoSuccess('Your shout-out is live on the community wall! 🌱');
    setTimeout(() => setSoSuccess(null), 4000);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      {/* Sub-Navigation Segmented Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 no-print">
        <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-stone-200/80 dark:bg-[#14241B] rounded-2xl border border-stone-200 dark:border-emerald-900/70">
          <button
            type="button"
            onClick={() => onSelectSubTab('calculators')}
            className={`min-h-[42px] px-4 py-2 rounded-xl text-xs sm:text-sm font-display font-bold flex items-center gap-2 transition-all whitespace-nowrap shrink-0 ${
              activeSubTab === 'calculators'
                ? 'bg-[#22C55E] text-[#0F1A14] shadow-xs'
                : 'text-stone-600 dark:text-stone-300 hover:text-stone-950 dark:hover:text-white'
            }`}
          >
            <Calculator className="w-4 h-4" />
            <span>Impact &amp; Scrap Math</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectSubTab('business')}
            className={`min-h-[42px] px-4 py-2 rounded-xl text-xs sm:text-sm font-display font-bold flex items-center gap-2 transition-all whitespace-nowrap shrink-0 ${
              activeSubTab === 'business'
                ? 'bg-[#22C55E] text-[#0F1A14] shadow-xs'
                : 'text-stone-600 dark:text-stone-300 hover:text-stone-950 dark:hover:text-white'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Econom for Biz</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectSubTab('shoutouts')}
            className={`min-h-[42px] px-4 py-2 rounded-xl text-xs sm:text-sm font-display font-bold flex items-center gap-2 transition-all whitespace-nowrap shrink-0 ${
              activeSubTab === 'shoutouts'
                ? 'bg-[#22C55E] text-[#0F1A14] shadow-xs'
                : 'text-stone-600 dark:text-stone-300 hover:text-stone-950 dark:hover:text-white'
            }`}
          >
            <MessageSquareHeart className="w-4 h-4" />
            <span>Shout-Out Wall</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectSubTab('privacy')}
            className={`min-h-[42px] px-4 py-2 rounded-xl text-xs sm:text-sm font-display font-bold flex items-center gap-2 transition-all whitespace-nowrap shrink-0 ${
              activeSubTab === 'privacy'
                ? 'bg-[#22C55E] text-[#0F1A14] shadow-xs'
                : 'text-stone-600 dark:text-stone-300 hover:text-stone-950 dark:hover:text-white'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Privacy &amp; Deploy</span>
          </button>
        </div>
      </div>

      {/* =====================================================================
          SUB-TAB 1: ENVIRONMENTAL IMPACT & SCRAP VALUE CALCULATORS
         ===================================================================== */}
      {activeSubTab === 'calculators' && (
        <div className="space-y-8">
          <div className="space-y-1">
            <div className="text-xs font-mono font-bold uppercase text-[#10B981] dark:text-[#C6F432]">
              🧮 Deterministic Calculation Engine · Editable Factor &amp; Rate Tables
            </div>
            <h1 className="text-3xl sm:text-4xl font-display font-black text-stone-950 dark:text-white">
              Impact &amp; Scrap Value Estimators
            </h1>
            <p className="text-sm text-stone-600 dark:text-stone-300 max-w-3xl">
              Check estimated potential emissions savings (kg CO2e) and illustrative local scrap
              value (₹/kg). Every factor and rate is open and editable below.
            </p>
          </div>

          <section className="bg-white dark:bg-[#14241B] border border-stone-200/90 dark:border-emerald-900/70 rounded-[28px] p-6 sm:p-8 space-y-6 shadow-xs">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label
                  htmlFor="calc-cat"
                  className="block text-xs font-bold text-stone-800 dark:text-stone-200 mb-1.5"
                >
                  Waste Category
                </label>
                <select
                  id="calc-cat"
                  value={calcCategory}
                  onChange={(e) => setCalcCategory(e.target.value as WasteCategory)}
                  className="w-full min-h-[46px] px-3.5 py-2 rounded-2xl border border-stone-300 dark:border-emerald-800 bg-[#F7F8F5] dark:bg-[#0F1A14] text-sm font-bold text-stone-900 dark:text-white"
                >
                  {WasteCategoryEnum.options.map((c) => (
                    <option key={c} value={c}>
                      {c.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="calc-weight"
                  className="block text-xs font-bold text-stone-800 dark:text-stone-200 mb-1.5"
                >
                  Approximate Weight (kg)
                </label>
                <input
                  id="calc-weight"
                  type="number"
                  step="0.1"
                  min="0.01"
                  max="10000"
                  value={calcWeight}
                  onChange={(e) => setCalcWeight(e.target.value)}
                  className="w-full min-h-[46px] px-3.5 py-2 rounded-2xl border border-stone-300 dark:border-emerald-800 bg-[#F7F8F5] dark:bg-[#0F1A14] font-mono tabular-nums text-sm font-bold text-stone-900 dark:text-white"
                />
              </div>

              <div>
                <label
                  htmlFor="calc-mat"
                  className="block text-xs font-bold text-stone-800 dark:text-stone-200 mb-1.5"
                >
                  Material Description (Optional)
                </label>
                <input
                  id="calc-mat"
                  type="text"
                  maxLength={100}
                  value={calcMaterialDesc}
                  onChange={(e) => setCalcMaterialDesc(e.target.value)}
                  placeholder="e.g., Clean PET bottles, bundled newspaper..."
                  className="w-full min-h-[46px] px-3.5 py-2 rounded-2xl border border-stone-300 dark:border-emerald-800 bg-[#F7F8F5] dark:bg-[#0F1A14] text-sm text-stone-900 dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div className="p-6 rounded-[24px] bg-[#F7F8F5] dark:bg-[#0F1A14]/70 border border-stone-200 dark:border-emerald-800/80 space-y-3">
                <div className="text-xs font-mono font-bold text-[#10B981] dark:text-[#C6F432] flex items-center justify-between">
                  <span>1. ENVIRONMENTAL IMPACT</span>
                  <span>Deterministic Formula</span>
                </div>

                {standaloneImpact.status === 'calculated' ? (
                  <div>
                    <div className="text-3xl font-mono font-black tabular-nums text-[#10B981] dark:text-[#C6F432]">
                      ~{standaloneImpact.estimatedSavingsKgCO2e} {standaloneImpact.units}
                    </div>
                    <div className="text-xs font-bold text-stone-800 dark:text-emerald-200 mt-0.5">
                      Nice! That&apos;s {standaloneImpact.estimatedSavingsKgCO2e} kg CO2e
                      potentially saved (estimated potential savings, not measured)
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-300 text-xs font-bold text-amber-950 dark:text-[#FFD84D]">
                    Insufficient data — Cannot calculate standardized CO2e savings for{' '}
                    {calcCategory.toUpperCase()}.
                  </div>
                )}

                <div className="text-xs font-mono tabular-nums text-stone-700 dark:text-stone-300 space-y-1 pt-2 border-t border-stone-200 dark:border-emerald-900/60">
                  <div>Assumed Weight: {standaloneImpact.weightKg} kg</div>
                  <div>
                    Factor:{' '}
                    {standaloneImpact.factorKgCO2ePerKg !== null
                      ? `${standaloneImpact.factorKgCO2ePerKg} kg CO2e / kg`
                      : 'Null (Insufficient data)'}
                  </div>
                  <div className="font-sans">Source: {standaloneImpact.source}</div>
                </div>

                <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
                  <strong>Assumptions:</strong> {standaloneImpact.assumptions}{' '}
                  {standaloneImpact.regionalDisclaimer}
                </p>
              </div>

              <div className="p-6 rounded-[24px] bg-[#F7F8F5] dark:bg-[#0F1A14]/70 border border-stone-200 dark:border-emerald-800/80 space-y-3">
                <div className="text-xs font-mono font-bold text-amber-700 dark:text-[#FFD84D] flex items-center justify-between">
                  <span>2. SCRAP VALUE ESTIMATOR (INR)</span>
                  <span>Editable Rate Table</span>
                </div>

                <div>
                  <div className="text-3xl font-mono font-black tabular-nums text-stone-950 dark:text-white">
                    ₹{standaloneScrap.estimatedValueInr.toFixed(2)}
                  </div>
                  <div className="text-xs font-bold text-amber-800 dark:text-[#FFD84D] mt-0.5">
                    Illustrative estimate - actual prices vary
                  </div>
                </div>

                <div className="text-xs font-mono tabular-nums text-stone-700 dark:text-stone-300 space-y-1 pt-2 border-t border-stone-200 dark:border-emerald-900/60">
                  <div>Assumed Weight: {standaloneScrap.weightKg} kg</div>
                  <div>Illustrative Rate: ₹{standaloneScrap.rateInrPerKg} / kg</div>
                  <div className="font-sans">Stream: {standaloneScrap.materialLabel}</div>
                </div>

                <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
                  <strong>Note:</strong> {standaloneScrap.notes} {standaloneScrap.disclaimer}
                </p>
              </div>
            </div>
          </section>

          {/* Editable Tables */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <section className="lg:col-span-7 bg-white dark:bg-[#14241B] border border-stone-200/90 dark:border-emerald-900/70 rounded-[28px] p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-base sm:text-lg font-display font-extrabold text-stone-950 dark:text-white">
                    Configurable Emission Factors Table (kg CO2e / kg)
                  </h2>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    Leave blank for categories with insufficient data.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onResetEmissionFactors}
                  className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-stone-100 dark:bg-emerald-950 text-stone-800 dark:text-stone-100 text-xs font-bold flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Defaults</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-stone-200 dark:border-emerald-800 text-stone-500 dark:text-stone-400">
                      <th className="py-2.5 pr-3 font-bold">Category</th>
                      <th className="py-2.5 px-3 font-bold">Factor (kg CO2e/kg)</th>
                      <th className="py-2.5 pl-3 font-bold">Reference Source &amp; Assumptions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200/70 dark:divide-emerald-900/60">
                    {emissionFactors.map((row) => (
                      <tr key={row.id} className="align-top">
                        <td className="py-3 pr-3 font-mono font-bold text-stone-900 dark:text-white uppercase whitespace-nowrap">
                          {row.category}
                        </td>
                        <td className="py-3 px-3">
                          <input
                            type="number"
                            step="0.05"
                            min="0"
                            aria-label={`Emission factor for ${row.category}`}
                            value={
                              row.factorKgCO2ePerKg !== null ? String(row.factorKgCO2ePerKg) : ''
                            }
                            placeholder="Null"
                            onChange={(e) => handleFactorChange(row.id, e.target.value)}
                            className="w-20 px-2 py-1 rounded-xl border border-stone-300 dark:border-emerald-800 bg-[#F7F8F5] dark:bg-[#0F1A14] font-mono tabular-nums text-xs text-stone-900 dark:text-white"
                          />
                        </td>
                        <td className="py-3 pl-3 text-stone-600 dark:text-stone-300 space-y-0.5">
                          <div className="font-bold text-stone-800 dark:text-stone-100">
                            {row.source}
                          </div>
                          <div className="text-[11px] text-stone-500 dark:text-stone-400">
                            {row.assumptions}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="lg:col-span-5 bg-white dark:bg-[#14241B] border border-stone-200/90 dark:border-emerald-900/70 rounded-[28px] p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-base sm:text-lg font-display font-extrabold text-stone-950 dark:text-white">
                    Editable Scrap Rate Table (₹ / kg)
                  </h2>
                  <p className="text-xs text-amber-800 dark:text-[#FFD84D] font-bold">
                    Illustrative estimate - actual prices vary
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onResetScrapRates}
                  className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-stone-100 dark:bg-emerald-950 text-stone-800 dark:text-stone-100 text-xs font-bold flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Rates</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-stone-200 dark:border-emerald-800 text-stone-500 dark:text-stone-400">
                      <th className="py-2.5 pr-2 font-bold">Category</th>
                      <th className="py-2.5 px-2 font-bold">Rate (₹/kg)</th>
                      <th className="py-2.5 pl-2 font-bold">Material Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200/70 dark:divide-emerald-900/60">
                    {scrapRates.map((row) => (
                      <tr key={row.id} className="align-top">
                        <td className="py-3 pr-2 font-mono font-bold text-stone-900 dark:text-white uppercase whitespace-nowrap">
                          {row.category}
                        </td>
                        <td className="py-3 px-2">
                          <input
                            type="number"
                            step="1"
                            min="0"
                            aria-label={`Scrap rate in rupees for ${row.category}`}
                            value={row.rateInrPerKg}
                            onChange={(e) => handleScrapRateChange(row.id, e.target.value)}
                            className="w-20 px-2 py-1 rounded-xl border border-stone-300 dark:border-emerald-800 bg-[#F7F8F5] dark:bg-[#0F1A14] font-mono tabular-nums text-xs text-stone-900 dark:text-white"
                          />
                        </td>
                        <td className="py-3 pl-2 text-stone-600 dark:text-stone-300">
                          <div className="font-bold text-stone-800 dark:text-stone-100">
                            {row.materialLabel}
                          </div>
                          <div className="text-[11px] text-stone-500 dark:text-stone-400">
                            {row.notes}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </div>
      )}

      {/* =====================================================================
          SUB-TAB 2: ECOLOOP FOR BUSINESS (SHOPS, OFFICES & CAMPUSES)
         ===================================================================== */}
      {activeSubTab === 'business' && (
        <div className="space-y-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="space-y-1">
              <div className="text-xs font-mono font-bold uppercase text-[#10B981] dark:text-[#C6F432] flex items-center gap-2">
                <span>🏢 Econom for Business · Shops, Offices &amp; Campuses</span>
                {demoMode && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="font-bold text-[#0F1A14] bg-[#FFD84D] px-2.5 py-0.5 rounded-lg">
                      Demo data
                    </span>
                  </>
                )}
              </div>
              <h1 className="text-3xl sm:text-4xl font-display font-black text-stone-950 dark:text-white">
                Bulk Waste Log &amp; Monthly Report
              </h1>
              <p className="text-sm text-stone-600 dark:text-stone-300">
                Log bulk recyclable and e-waste streams, view monthly category totals, get AI
                improvement tips, and export a CSV or printable sustainability report.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 no-print">
              <button
                type="button"
                onClick={onNavigateToMap}
                className="min-h-[42px] px-4 py-2 rounded-2xl bg-white dark:bg-[#14241B] border border-stone-300 dark:border-emerald-800 text-stone-900 dark:text-white text-xs sm:text-sm font-bold flex items-center gap-2"
              >
                <MapPin className="w-4 h-4 text-[#10B981]" />
                <span>Find Scrap Buyers / Collectors</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadBusinessCsv}
                disabled={businessLogs.length === 0}
                className="min-h-[42px] px-4 py-2 rounded-2xl bg-[#C6F432] hover:bg-[#b5e422] disabled:opacity-50 text-[#0F1A14] text-xs sm:text-sm font-display font-extrabold flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>Download CSV</span>
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="min-h-[42px] px-4 py-2 rounded-2xl bg-[#22C55E] hover:bg-[#10B981] text-[#0F1A14] text-xs sm:text-sm font-display font-extrabold flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                <span>Print Report</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-[#14241B] border border-stone-200/90 dark:border-emerald-900/70 rounded-[24px] p-5 space-y-1">
              <div className="text-xs font-mono font-bold text-stone-500 dark:text-stone-400">
                TOTAL LOGGED BULK MASS
              </div>
              <div className="text-3xl font-mono font-black tabular-nums text-stone-950 dark:text-white">
                {totalBizWeightKg.toFixed(1)} kg
              </div>
              <div className="text-xs text-stone-500 dark:text-stone-400">
                Across {businessLogs.length} logged batch(es)
              </div>
            </div>

            <div className="bg-white dark:bg-[#14241B] border border-stone-200/90 dark:border-emerald-900/70 rounded-[24px] p-5 space-y-1">
              <div className="text-xs font-mono font-bold text-[#10B981] dark:text-[#C6F432]">
                ESTIMATED POTENTIAL SAVINGS
              </div>
              <div className="text-3xl font-mono font-black tabular-nums text-[#10B981] dark:text-[#22C55E]">
                ~{totalBizImpactKgCO2e.toFixed(2)} kg CO2e
              </div>
              <div className="text-xs text-stone-500 dark:text-stone-400">
                Estimated potential savings (not measured)
              </div>
            </div>

            <div className="bg-white dark:bg-[#14241B] border border-stone-200/90 dark:border-emerald-900/70 rounded-[24px] p-5 space-y-1">
              <div className="text-xs font-mono font-bold text-amber-800 dark:text-[#FFD84D]">
                ILLUSTRATIVE SCRAP VALUE
              </div>
              <div className="text-3xl font-mono font-black tabular-nums text-stone-950 dark:text-white">
                ₹{totalBizScrapInr.toFixed(0)}
              </div>
              <div className="text-xs text-amber-800 dark:text-[#FFD84D]">
                Illustrative estimate - actual prices vary
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            <form
              onSubmit={handleAddBizEntry}
              className="lg:col-span-5 bg-white dark:bg-[#14241B] border border-stone-200/90 dark:border-emerald-900/70 rounded-[28px] p-6 space-y-4 no-print"
            >
              <h2 className="text-lg font-display font-extrabold text-stone-950 dark:text-white">
                Log Bulk Waste Batch
              </h2>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="biz-date"
                    className="block text-xs font-bold text-stone-800 dark:text-stone-200 mb-1"
                  >
                    Date
                  </label>
                  <input
                    id="biz-date"
                    type="date"
                    required
                    value={bizDate}
                    onChange={(e) => setBizDate(e.target.value)}
                    className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-stone-300 dark:border-emerald-800 bg-[#F7F8F5] dark:bg-[#0F1A14] text-xs font-mono"
                  />
                </div>

                <div>
                  <label
                    htmlFor="biz-cat"
                    className="block text-xs font-bold text-stone-800 dark:text-stone-200 mb-1"
                  >
                    Category
                  </label>
                  <select
                    id="biz-cat"
                    value={bizCategory}
                    onChange={(e) => setBizCategory(e.target.value as WasteCategory)}
                    className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-stone-300 dark:border-emerald-800 bg-[#F7F8F5] dark:bg-[#0F1A14] text-xs font-bold"
                  >
                    {WasteCategoryEnum.options.map((c) => (
                      <option key={c} value={c}>
                        {c.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="biz-weight"
                    className="block text-xs font-bold text-stone-800 dark:text-stone-200 mb-1"
                  >
                    Weight (kg) *
                  </label>
                  <input
                    id="biz-weight"
                    type="number"
                    step="0.1"
                    min="0.1"
                    required
                    value={bizWeight}
                    onChange={(e) => setBizWeight(e.target.value)}
                    className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-stone-300 dark:border-emerald-800 bg-[#F7F8F5] dark:bg-[#0F1A14] text-xs font-mono font-bold"
                  />
                </div>

                <div>
                  <label
                    htmlFor="biz-dept"
                    className="block text-xs font-bold text-stone-800 dark:text-stone-200 mb-1"
                  >
                    Department / Zone
                  </label>
                  <input
                    id="biz-dept"
                    type="text"
                    maxLength={60}
                    value={bizDept}
                    onChange={(e) => setBizDept(e.target.value)}
                    placeholder="e.g., Cafeteria, IT Lab"
                    className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-stone-300 dark:border-emerald-800 bg-[#F7F8F5] dark:bg-[#0F1A14] text-xs"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="biz-mat"
                  className="block text-xs font-bold text-stone-800 dark:text-stone-200 mb-1"
                >
                  Material Description
                </label>
                <input
                  id="biz-mat"
                  type="text"
                  maxLength={100}
                  value={bizMaterial}
                  onChange={(e) => setBizMaterial(e.target.value)}
                  placeholder="e.g., Flattened corrugated cartons, old monitors..."
                  className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-stone-300 dark:border-emerald-800 bg-[#F7F8F5] dark:bg-[#0F1A14] text-xs"
                />
              </div>

              <button
                type="submit"
                className="w-full min-h-[46px] px-4 py-2.5 rounded-2xl bg-[#22C55E] hover:bg-[#10B981] text-[#0F1A14] text-xs sm:text-sm font-display font-extrabold flex items-center justify-center gap-2 transition-transform active:scale-95"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Add Bulk Batch to Log</span>
              </button>
            </form>

            <section className="lg:col-span-7 bg-white dark:bg-[#14241B] border border-stone-200/90 dark:border-emerald-900/70 rounded-[28px] p-6 space-y-4 flex flex-col justify-between">
              <div>
                <h2 className="text-lg font-display font-extrabold text-stone-950 dark:text-white">
                  Bulk Waste Summary by Category (kg)
                </h2>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Aggregated mass across logged organizational batches.
                </p>
              </div>

              {bizChartData.length === 0 ? (
                <div className="h-56 rounded-2xl bg-[#F7F8F5] dark:bg-[#0F1A14]/60 border border-stone-200 dark:border-emerald-800 flex items-center justify-center text-xs text-stone-500">
                  Log a bulk waste entry on the left (or enable Demo Mode) to view the chart.
                </div>
              ) : (
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={bizChartData} margin={{ top: 8, right: 12, left: -10, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#57534e" strokeOpacity={0.25} vertical={false} />
                      <XAxis dataKey="category" tick={{ fontSize: 11, fill: '#10B981', fontWeight: 700 }} axisLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#78716c' }} axisLine={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0F1A14',
                          color: '#fafaf9',
                          borderRadius: '14px',
                          border: '1px solid #22C55E',
                          fontSize: '12px',
                        }}
                      />
                      <Bar dataKey="weightKg" name="Weight (kg)" fill="#22C55E" radius={[10, 10, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </section>
          </div>

          <section className="bg-white dark:bg-[#14241B] border border-stone-200/90 dark:border-emerald-900/70 rounded-[28px] p-6 sm:p-7 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs font-mono font-bold text-[#10B981] dark:text-[#C6F432]">
                  ✨ Clearly Marked AI-Generated Summary · Based on Your Bulk Log
                </div>
                <h2 className="text-lg font-display font-extrabold text-stone-950 dark:text-white">
                  AI Circularity &amp; Waste-Reduction Improvement Tips
                </h2>
              </div>

              <button
                type="button"
                onClick={handleGenerateBusinessAi}
                disabled={bizAiLoading || businessLogs.length === 0}
                className="min-h-[42px] px-4 py-2 rounded-2xl bg-[#C6F432] hover:bg-[#b5e422] disabled:opacity-50 text-[#0F1A14] text-xs font-display font-extrabold flex items-center gap-2 no-print"
              >
                {bizAiLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                <span>Generate AI Improvement Tips</span>
              </button>
            </div>

            {bizAiError && (
              <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 text-xs text-amber-950 dark:text-[#FFD84D]">
                {bizAiError}
              </div>
            )}

            {bizAiInsight ? (
              <div className="space-y-4 pt-2">
                <div className="p-4 rounded-[22px] bg-[#22C55E]/15 border border-[#22C55E]/35 text-xs sm:text-sm text-stone-900 dark:text-white leading-relaxed">
                  <strong className="text-[#10B981] dark:text-[#C6F432] block mb-1">
                    AI-Generated Executive Summary:
                  </strong>
                  {bizAiInsight.executiveSummary}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {bizAiInsight.recommendations.map((rec, i) => (
                    <div
                      key={i}
                      className="p-4 rounded-[22px] bg-[#F7F8F5] dark:bg-[#0F1A14]/70 border border-stone-200 dark:border-emerald-800 space-y-1.5"
                    >
                      <div className="text-xs font-mono text-[#10B981] dark:text-[#C6F432] font-bold">
                        Priority: {rec.priority} · AI-Generated
                      </div>
                      <h3 className="text-sm font-display font-extrabold text-stone-950 dark:text-white">
                        {rec.title}
                      </h3>
                      <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                        {rec.action}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Tap “Generate AI Improvement Tips” to analyze your logged batches for source
                reduction, segregation, and safe e-waste handling opportunities.
              </p>
            )}
          </section>

          <section className="bg-white dark:bg-[#14241B] border border-stone-200/90 dark:border-emerald-900/70 rounded-[28px] p-6 space-y-4">
            <h2 className="text-lg font-display font-extrabold text-stone-950 dark:text-white">
              Logged Bulk Waste Batches ({businessLogs.length})
            </h2>

            {businessLogs.length === 0 ? (
              <p className="text-xs text-stone-500">No bulk entries logged yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-stone-200 dark:border-emerald-800 text-stone-500 dark:text-stone-400">
                      <th className="py-2.5 pr-3">Date</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3">Material &amp; Source</th>
                      <th className="py-2.5 px-3 text-right">Weight (kg)</th>
                      <th className="py-2.5 px-3 text-right">Est. Savings (CO2e)</th>
                      <th className="py-2.5 px-3 text-right">Illustrative Scrap</th>
                      <th className="py-2.5 pl-3 text-right no-print">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200/70 dark:divide-emerald-900/60">
                    {businessLogs.map((b) => {
                      const imp = calculateEnvironmentalImpact(
                        b.category,
                        b.weightKg,
                        emissionFactors
                      );
                      const scr = calculateScrapValue(b.category, b.weightKg, scrapRates);
                      return (
                        <tr key={b.id}>
                          <td className="py-3 pr-3 font-mono tabular-nums text-stone-700 dark:text-stone-300">
                            {b.date}
                          </td>
                          <td className="py-3 px-3 font-mono font-bold uppercase text-stone-900 dark:text-white">
                            {b.category}
                            {b.isDemo ? ' (Demo data)' : ''}
                          </td>
                          <td className="py-3 px-3 text-stone-700 dark:text-stone-300">
                            <div className="font-bold text-stone-900 dark:text-white">
                              {b.materialDetail}
                            </div>
                            <div className="text-stone-500 dark:text-stone-400">
                              {b.departmentOrSource}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right font-mono tabular-nums font-bold">
                            {b.weightKg.toFixed(1)} kg
                          </td>
                          <td className="py-3 px-3 text-right font-mono tabular-nums text-[#10B981] dark:text-[#C6F432]">
                            {imp.status === 'calculated'
                              ? `~${imp.estimatedSavingsKgCO2e} kg`
                              : 'Insufficient data'}
                          </td>
                          <td className="py-3 px-3 text-right font-mono tabular-nums text-stone-800 dark:text-stone-200">
                            ₹{scr.estimatedValueInr.toFixed(0)}
                          </td>
                          <td className="py-3 pl-3 text-right no-print">
                            {!b.isDemo && (
                              <button
                                type="button"
                                onClick={() => onDeleteBusinessLog(b.id)}
                                className="text-stone-400 hover:text-[#FF6B5E] p-1"
                                title="Delete entry"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}

      {/* =====================================================================
          SUB-TAB 3: COMMUNITY SHOUT-OUT WALL (SOCIAL FEED WITH AVATARS & CHIPS)
         ===================================================================== */}
      {activeSubTab === 'shoutouts' && (
        <div className="space-y-8">
          <div className="space-y-1">
            <div className="text-xs font-mono font-bold uppercase text-[#10B981] dark:text-[#C6F432]">
              💬 Community Circularity Feed · Profanity &amp; PII Filtered
            </div>
            <h1 className="text-3xl sm:text-4xl font-display font-black text-stone-950 dark:text-white">
              Community Shout-Out Wall
            </h1>
            <p className="text-sm text-stone-600 dark:text-stone-300 max-w-2xl">
              Flex what you repaired, upcycled, or safely dropped off. Keep it anonymous—no phone
              numbers, emails, or personal info.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Post Form */}
            <form
              onSubmit={handlePostShoutOut}
              className="lg:col-span-5 bg-white dark:bg-[#14241B] border border-stone-200/90 dark:border-emerald-900/70 rounded-[28px] p-6 space-y-4 shadow-xs"
            >
              <h2 className="text-xl font-display font-extrabold text-stone-950 dark:text-white">
                Drop a Shout-Out ✨
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Saved locally in your browser. Please never include personal contact details.
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="so-nick"
                    className="block text-xs font-bold text-stone-800 dark:text-stone-200 mb-1"
                  >
                    Handle / Nickname
                  </label>
                  <input
                    id="so-nick"
                    type="text"
                    maxLength={28}
                    value={soNickname}
                    onChange={(e) => setSoNickname(e.target.value)}
                    placeholder="e.g., Rohan_Loops"
                    className="w-full min-h-[44px] px-3 py-2 rounded-2xl border border-stone-300 dark:border-emerald-800 bg-[#F7F8F5] dark:bg-[#0F1A14] text-xs text-stone-900 dark:text-white"
                  />
                </div>

                <div>
                  <label
                    htmlFor="so-tag"
                    className="block text-xs font-bold text-stone-800 dark:text-stone-200 mb-1"
                  >
                    Vibe / Move
                  </label>
                  <select
                    id="so-tag"
                    value={soTag}
                    onChange={(e) => setSoTag(e.target.value as ShoutOutPost['actionTag'])}
                    className="w-full min-h-[44px] px-3 py-2 rounded-2xl border border-stone-300 dark:border-emerald-800 bg-[#F7F8F5] dark:bg-[#0F1A14] text-xs font-bold text-stone-900 dark:text-white"
                  >
                    <option value="Repaired">🛠️ Repaired</option>
                    <option value="Reused">♻️ Reused</option>
                    <option value="Recycled">🌱 Recycled</option>
                    <option value="Safe E-Waste Drop">🔋 Safe E-Waste Drop</option>
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="so-msg"
                  className="block text-xs font-bold text-stone-800 dark:text-stone-200 mb-1"
                >
                  What did you keep out of the landfill? *
                </label>
                <textarea
                  id="so-msg"
                  rows={3}
                  maxLength={220}
                  required
                  value={soMessage}
                  onChange={(e) => setSoMessage(e.target.value)}
                  placeholder="e.g., Taped 4 old Li-ion batteries and dropped them at our ward e-waste kiosk!"
                  className="w-full p-3.5 rounded-2xl border border-stone-300 dark:border-emerald-800 bg-[#F7F8F5] dark:bg-[#0F1A14] text-xs sm:text-sm text-stone-900 dark:text-white"
                />
              </div>

              {soError && (
                <div className="p-3.5 rounded-2xl bg-[#FF6B5E]/15 border border-[#FF6B5E] text-xs text-stone-950 dark:text-white font-bold">
                  {soError}
                </div>
              )}

              {soSuccess && (
                <div className="p-3.5 rounded-2xl bg-[#C6F432] text-[#0F1A14] text-xs font-extrabold">
                  {soSuccess}
                </div>
              )}

              <button
                type="submit"
                className="w-full min-h-[48px] px-5 py-2.5 rounded-2xl bg-[#22C55E] hover:bg-[#10B981] text-[#0F1A14] text-sm font-display font-extrabold transition-transform active:scale-95"
              >
                Post to Wall 🚀
              </button>
            </form>

            {/* Friendly Social Feed */}
            <div className="lg:col-span-7 space-y-4">
              {shoutOuts
                .filter((p) => !p.reported)
                .map((post) => {
                  const avatar = getAvatarEmojiAndColor(post.nickname, post.actionTag);
                  return (
                    <div
                      key={post.id}
                      className="bg-white dark:bg-[#14241B] border border-stone-200/90 dark:border-emerald-900/70 rounded-[26px] p-5 sm:p-6 space-y-3.5 shadow-xs"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          {/* Rounded Emoji + Initials Avatar */}
                          <div
                            className={`w-11 h-11 rounded-2xl ${avatar.colorClass} flex items-center justify-center font-display font-black text-base shrink-0 shadow-xs`}
                          >
                            <span role="img" aria-label={post.actionTag}>
                              {avatar.emoji}
                            </span>
                          </div>

                          <div>
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                              <span className="font-display font-extrabold text-sm text-stone-950 dark:text-white">
                                @{post.nickname}
                              </span>
                              <span aria-hidden="true" className="text-stone-400">
                                ·
                              </span>
                              <span className="font-mono font-bold text-[#10B981] dark:text-[#C6F432]">
                                {post.actionTag}
                              </span>
                              {post.isSample && (
                                <>
                                  <span aria-hidden="true" className="text-stone-400">
                                    ·
                                  </span>
                                  <span className="font-mono font-bold text-[#0F1A14] bg-[#FFD84D] px-2 py-0.5 rounded-lg text-[10px]">
                                    Sample
                                  </span>
                                </>
                              )}
                            </div>
                            <div className="text-[11px] text-stone-400">
                              {new Date(post.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => onReportShoutOut(post.id)}
                          className="min-h-[34px] px-2.5 py-1 rounded-xl text-stone-400 hover:text-[#FF6B5E] hover:bg-red-50/50 dark:hover:bg-red-950/30 flex items-center gap-1 text-[11px] font-semibold"
                          title="Report and hide this post"
                        >
                          <Flag className="w-3 h-3" />
                          <span>Report</span>
                        </button>
                      </div>

                      <p className="text-sm sm:text-base text-stone-800 dark:text-stone-100 leading-relaxed pl-1">
                        {post.message}
                      </p>

                      {/* Reaction Chips */}
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => onReactShoutOut(post.id, 'leaf')}
                          className="min-h-[38px] px-3.5 py-1.5 rounded-2xl bg-[#F7F8F5] dark:bg-[#0F1A14] hover:border-[#22C55E] border border-stone-200 dark:border-emerald-800 text-xs font-mono font-bold flex items-center gap-1.5 transition-transform active:scale-95"
                        >
                          <span>🌱</span>
                          <span>{post.reactions.leaf}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onReactShoutOut(post.id, 'clap')}
                          className="min-h-[38px] px-3.5 py-1.5 rounded-2xl bg-[#F7F8F5] dark:bg-[#0F1A14] hover:border-[#22C55E] border border-stone-200 dark:border-emerald-800 text-xs font-mono font-bold flex items-center gap-1.5 transition-transform active:scale-95"
                        >
                          <span>👏</span>
                          <span>{post.reactions.clap}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onReactShoutOut(post.id, 'spark')}
                          className="min-h-[38px] px-3.5 py-1.5 rounded-2xl bg-[#F7F8F5] dark:bg-[#0F1A14] hover:border-[#22C55E] border border-stone-200 dark:border-emerald-800 text-xs font-mono font-bold flex items-center gap-1.5 transition-transform active:scale-95"
                        >
                          <span>✨</span>
                          <span>{post.reactions.spark}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          SUB-TAB 4: PRIVACY, DATA CONTROL & SECURE DEPLOYMENT GUIDE
         ===================================================================== */}
      {activeSubTab === 'privacy' && (
        <div className="max-w-4xl space-y-6">
          <div className="space-y-1">
            <div className="text-xs font-mono font-bold uppercase text-[#10B981] dark:text-[#C6F432]">
              🔒 Privacy Architecture, Local Data Control &amp; Deployment Guide
            </div>
            <h1 className="text-3xl sm:text-4xl font-display font-black text-stone-950 dark:text-white">
              Privacy, Security &amp; Deployment
            </h1>
          </div>

          <section className="bg-white dark:bg-[#14241B] border border-stone-200/90 dark:border-emerald-900/70 rounded-[28px] p-6 sm:p-8 space-y-4">
            <h2 className="text-xl font-display font-extrabold text-stone-950 dark:text-white">
              1. Privacy &amp; Local Data Control
            </h2>
            <ul className="list-disc pl-5 space-y-2 text-sm text-stone-700 dark:text-stone-200 leading-relaxed">
              <li>
                <strong>Zero Persistent Image Storage:</strong> Uploaded or camera-captured photos
                are converted to a temporary in-memory buffer solely for the duration of the Gemini
                API call and immediately discarded. Images are never saved to{' '}
                <code className="font-mono">localStorage</code>, disk, or server logs.
              </li>
              <li>
                <strong>Geolocation Consent &amp; Isolation:</strong> Browser location is requested
                only when you explicitly click “Use My Location” on the Map tab. Coordinates are
                used strictly to query OpenStreetMap Overpass in your browser and are{' '}
                <strong>never sent to the AI</strong> or persisted in{' '}
                <code className="font-mono">localStorage</code>.
              </li>
              <li>
                <strong>One-Click Data Wipe:</strong> Your saved scans, EcoPoints, business logs,
                and custom tables are stored in browser{' '}
                <code className="font-mono">localStorage</code> through a modular storage service.
                You can wipe everything at any time below.
              </li>
            </ul>
            <div className="pt-2">
              <button
                type="button"
                onClick={onOpenClearDataModal}
                className="min-h-[46px] px-5 py-2.5 rounded-2xl bg-[#FF6B5E] hover:bg-red-500 text-[#0F1A14] text-xs sm:text-sm font-display font-extrabold flex items-center gap-2 transition-transform active:scale-95"
              >
                <Trash2 className="w-4 h-4" />
                <span>Clear All My Local Data Now</span>
              </button>
            </div>
          </section>

          <section className="bg-white dark:bg-[#14241B] border border-stone-200/90 dark:border-emerald-900/70 rounded-[28px] p-6 sm:p-8 space-y-4">
            <h2 className="text-xl font-display font-extrabold text-stone-950 dark:text-white">
              2. How to Add Your Gemini API Key Securely &amp; Deploy Econom
            </h2>
            <div className="space-y-3 text-sm text-stone-700 dark:text-stone-200 leading-relaxed">
              <p>
                <strong>Server-Side Key Protection:</strong> Econom executes all{' '}
                <code className="font-mono">@google/genai</code> calls on the Node.js/Express
                backend (<code className="font-mono">server.ts</code>). The API key is read from{' '}
                <code className="font-mono bg-stone-100 dark:bg-emerald-950 px-1.5 py-0.5 rounded">
                  process.env.GEMINI_API_KEY
                </code>{' '}
                on the server and is never bundled into client-side JavaScript or exposed to the
                browser.
              </p>
              <p>
                <strong>Single Configurable Model Constant:</strong> The model name is defined in a
                single constant{' '}
                <code className="font-mono bg-stone-100 dark:bg-emerald-950 px-1.5 py-0.5 rounded">
                  GEMINI_MODEL_NAME = &apos;gemini-3.8-flash&apos;
                </code>{' '}
                inside{' '}
                <code className="font-mono bg-stone-100 dark:bg-emerald-950 px-1.5 py-0.5 rounded">
                  src/types/waste.ts
                </code>
                .
              </p>
              <ol className="list-decimal pl-5 space-y-2">
                <li>
                  <strong>In Google AI Studio:</strong> Open the{' '}
                  <strong>Settings &gt; Secrets</strong> panel in AI Studio and set{' '}
                  <code className="font-mono bg-stone-100 dark:bg-emerald-950 px-1.5 py-0.5 rounded">
                    GEMINI_API_KEY
                  </code>
                  . AI Studio automatically injects this secret into the server environment at
                  runtime.
                </li>
                <li>
                  <strong>For Local Development:</strong> Copy{' '}
                  <code className="font-mono bg-stone-100 dark:bg-emerald-950 px-1.5 py-0.5 rounded">
                    .env.example
                  </code>{' '}
                  to{' '}
                  <code className="font-mono bg-stone-100 dark:bg-emerald-950 px-1.5 py-0.5 rounded">
                    .env
                  </code>{' '}
                  (which is git-ignored) and set{' '}
                  <code className="font-mono bg-stone-100 dark:bg-emerald-950 px-1.5 py-0.5 rounded">
                    GEMINI_API_KEY=&quot;your_real_key_here&quot;
                  </code>
                  , then run{' '}
                  <code className="font-mono bg-stone-100 dark:bg-emerald-950 px-1.5 py-0.5 rounded">
                    npm run dev
                  </code>
                  .
                </li>
                <li>
                  <strong>For Cloud Run / Production Deployment:</strong> Run{' '}
                  <code className="font-mono bg-stone-100 dark:bg-emerald-950 px-1.5 py-0.5 rounded">
                    npm run build
                  </code>{' '}
                  to compile the Vite frontend into <code className="font-mono">dist/</code>, inject{' '}
                  <code className="font-mono bg-stone-100 dark:bg-emerald-950 px-1.5 py-0.5 rounded">
                    GEMINI_API_KEY
                  </code>{' '}
                  as a server environment secret in Cloud Run / Render / Railway, and start the
                  server with{' '}
                  <code className="font-mono bg-stone-100 dark:bg-emerald-950 px-1.5 py-0.5 rounded">
                    NODE_ENV=production npm start
                  </code>
                  .
                </li>
              </ol>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
