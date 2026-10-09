import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import {
  Camera,
  MapPin,
  RefreshCw,
  ShieldAlert,
  Calculator,
  Building2,
  MessageSquareHeart,
  ArrowRight,
  Sparkles,
  Flame,
  Share2,
  Check,
  PieChart as PieChartIcon,
  TrendingUp,
} from 'lucide-react';
import { MainTab } from './Navigation';
import {
  BUILT_IN_ECO_TIPS,
  BUILT_IN_QUOTES,
  EcoTipItem,
} from '../services/demoData';
import { fetchAiEcoTip } from '../services/geminiService';
import { useCountUp } from './GamificationOverlay';
import { EmissionFactorRow, SavedScanRecord } from '../types/waste';
import { calculateEnvironmentalImpact } from '../services/calculators';

interface HomeViewProps {
  onNavigate: (tab: MainTab, subTab?: string) => void;
  onQuickDemoScan: (demoKey: string) => void;
  demoMode: boolean;
  totalPoints: number;
  streakDays: number;
  completedCount: number;
  scans: SavedScanRecord[];
  emissionFactors: EmissionFactorRow[];
  onOpenStoryCard: () => void;
}

const PIE_COLORS = [
  '#22C55E', // Emerald
  '#38BDF8', // Sky Blue
  '#C6F432', // Electric Lime
  '#FFD84D', // Sunny Yellow
  '#FF6B5E', // Warm Coral
  '#A855F7', // Purple
];

const REFERENCE_STREAM_PIE_DATA = [
  { name: 'Paper & Cardboard', value: 32, category: 'paper' },
  { name: 'Rigid Plastics (PET/HDPE)', value: 24, category: 'plastic' },
  { name: 'E-Waste & Peripherals', value: 18, category: 'e-waste' },
  { name: 'Metals & Cans', value: 12, category: 'metal' },
  { name: 'Glass Containers', value: 8, category: 'glass' },
  { name: 'Batteries (Safe Drop)', value: 6, category: 'battery' },
];

const REALISTIC_BENCHMARK_TREND = [
  { period: 'May', recoveredKg: 3.2, potentialCo2eKg: 4.8, unconfirmedKg: 1.9 },
  { period: 'Jun', recoveredKg: 4.6, potentialCo2eKg: 6.9, unconfirmedKg: 1.5 },
  { period: 'Jul', recoveredKg: 5.4, potentialCo2eKg: 8.3, unconfirmedKg: 1.4 },
  { period: 'Aug', recoveredKg: 7.1, potentialCo2eKg: 11.2, unconfirmedKg: 1.1 },
  { period: 'Sep', recoveredKg: 8.4, potentialCo2eKg: 13.6, unconfirmedKg: 0.9 },
  { period: 'Oct', recoveredKg: 10.2, potentialCo2eKg: 16.4, unconfirmedKg: 0.6 },
];

export const HomeView: React.FC<HomeViewProps> = ({
  onNavigate,
  onQuickDemoScan,
  demoMode,
  totalPoints,
  streakDays,
  completedCount,
  scans,
  emissionFactors,
  onOpenStoryCard,
}) => {
  const [tipIndex, setTipIndex] = useState<number>(0);
  const [customAiTip, setCustomAiTip] = useState<EcoTipItem | null>(null);
  const [loadingTip, setLoadingTip] = useState<boolean>(false);
  const [tipError, setTipError] = useState<string | null>(null);
  const [quoteIndex, setQuoteIndex] = useState<number>(0);
  const [copiedCard, setCopiedCard] = useState<'tip' | 'quote' | null>(null);

  // Toggle states for Home Pie Chart and Realistic Graph
  const [pieSourceMode, setPieSourceMode] = useState<'my_scans' | 'reference'>('my_scans');
  const [trendMode, setTrendMode] = useState<'benchmark_6m' | 'live_7d'>('benchmark_6m');

  const animatedPoints = useCountUp(totalPoints);
  const currentTip = customAiTip || BUILT_IN_ECO_TIPS[tipIndex % BUILT_IN_ECO_TIPS.length];
  const currentQuote = BUILT_IN_QUOTES[quoteIndex % BUILT_IN_QUOTES.length];

  // Compute Pie Chart data from user/demo scans or fallback to clearly labeled reference mix
  const { pieData, usingReferenceFallback, totalPieValue, pieUnitLabel } = useMemo(() => {
    if (pieSourceMode === 'reference' || scans.length === 0) {
      const sum = REFERENCE_STREAM_PIE_DATA.reduce((acc, d) => acc + d.value, 0);
      return {
        pieData: REFERENCE_STREAM_PIE_DATA,
        usingReferenceFallback: true,
        totalPieValue: sum,
        pieUnitLabel: '% share (illustrative)',
      };
    }

    const countsByCat: Record<string, number> = {};
    scans.forEach((s) => {
      const label = s.result.category.toUpperCase();
      countsByCat[label] = Number(((countsByCat[label] || 0) + (s.userWeightKg || 0.25)).toFixed(2));
    });

    const entries = Object.entries(countsByCat).map(([name, value]) => ({
      name,
      value: Number(value.toFixed(2)),
    }));
    const sum = Number(entries.reduce((acc, d) => acc + d.value, 0).toFixed(2));

    return {
      pieData: entries,
      usingReferenceFallback: false,
      totalPieValue: sum,
      pieUnitLabel: 'kg logged',
    };
  }, [pieSourceMode, scans]);

  // Compute 7-Day Live Recovery Curve vs. 6-Month Realistic Benchmark Graph
  const trendGraphData = useMemo(() => {
    if (trendMode === 'benchmark_6m') {
      return REALISTIC_BENCHMARK_TREND;
    }

    // Build 7-day daily series from scans
    return Array.from({ length: 7 }, (_, idx) => {
      const d = new Date(Date.now() - (6 - idx) * 86400000);
      const isoDate = d.toISOString().slice(0, 10);
      const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' });

      const dayScans = scans.filter((s) => s.timestamp.slice(0, 10) === isoDate);
      let recoveredKg = 0;
      let potentialCo2eKg = 0;
      let unconfirmedKg = 0;

      dayScans.forEach((s) => {
        const w = s.userWeightKg || 0.25;
        const isDone =
          s.completedActionType !== null ||
          (s.completedOptions && s.completedOptions.length > 0);
        if (isDone) {
          recoveredKg += w;
        } else {
          unconfirmedKg += w;
        }
        const imp = calculateEnvironmentalImpact(
          s.result.category,
          w,
          emissionFactors,
          s.completedActionType || s.result.bestUse.action
        );
        if (imp.status === 'calculated' && imp.estimatedSavingsKgCO2e !== null) {
          potentialCo2eKg += imp.estimatedSavingsKgCO2e;
        }
      });

      return {
        period: dayLabel,
        recoveredKg: Number(recoveredKg.toFixed(2)),
        potentialCo2eKg: Number(potentialCo2eKg.toFixed(2)),
        unconfirmedKg: Number(unconfirmedKg.toFixed(2)),
      };
    });
  }, [trendMode, scans, emissionFactors]);

  const handleCycleBuiltInTip = () => {
    setCustomAiTip(null);
    setTipError(null);
    setTipIndex((prev) => (prev + 1) % BUILT_IN_ECO_TIPS.length);
  };

  const handleGenerateAiTip = async () => {
    setLoadingTip(true);
    setTipError(null);
    try {
      const tip = await fetchAiEcoTip();
      setCustomAiTip(tip);
    } catch (err) {
      setTipError(
        err instanceof Error
          ? err.message
          : 'Could not generate AI tip right now. Using built-in curated tips.'
      );
    } finally {
      setLoadingTip(false);
    }
  };

  const handleShareText = async (type: 'tip' | 'quote', text: string) => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Econom Daily Drop', text });
        return;
      } catch {
        // fallback to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCard(type);
      setTimeout(() => setCopiedCard(null), 2500);
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-8 pb-10">
      {/* BENTO HERO GRID */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Main Hero Card (7 cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-[#14241B] border border-stone-200/90 dark:border-emerald-900/70 rounded-[28px] p-6 sm:p-9 flex flex-col justify-between space-y-6 shadow-sm">
          <div className="space-y-4">
            <div className="text-xs font-mono font-bold uppercase tracking-wider text-[#10B981] dark:text-[#C6F432] flex flex-wrap items-center gap-2">
              <span>🌱 Smart Circularity Agent</span>
              <span aria-hidden="true">·</span>
              <span>Zero Preachy Vibes</span>
              {demoMode && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-amber-700 dark:text-[#FFD84D]">Demo Data Active</span>
                </>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-sm sm:text-base font-display font-bold text-emerald-700 dark:text-emerald-300">
                Got trash? Let&apos;s make it count.
              </p>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-black tracking-tight text-stone-950 dark:text-white leading-[1.06]">
                Waste Less.{' '}
                <span className="text-[#10B981] dark:text-[#22C55E]">Recover More.</span>
              </h1>
            </div>

            <p className="text-sm sm:text-base text-stone-600 dark:text-stone-300 leading-relaxed max-w-xl">
              Snap a pic of mystery e-waste, old batteries, or everyday packaging. We flag spicy
              battery hazards first, give you DIY reuse ideas, and map verified drop-offs nearby.
            </p>
          </div>

          <div className="space-y-4 pt-2">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <button
                type="button"
                onClick={() => onNavigate('scan')}
                className="min-h-[52px] px-7 py-3.5 rounded-[22px] bg-[#22C55E] hover:bg-[#10B981] text-[#0F1A14] font-display font-extrabold text-base flex items-center justify-center gap-2.5 transition-transform active:scale-95 shadow-md shadow-[#22C55E]/20 whitespace-nowrap shrink-0"
              >
                <Camera className="w-5 h-5 stroke-[2.5]" />
                <span>Scan an Item</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('map')}
                className="min-h-[52px] px-6 py-3.5 rounded-[22px] bg-stone-100 dark:bg-emerald-950/90 hover:bg-stone-200 dark:hover:bg-emerald-900 text-stone-900 dark:text-white font-display font-bold text-base flex items-center justify-center gap-2.5 transition-transform active:scale-95 border border-stone-200 dark:border-emerald-800 whitespace-nowrap shrink-0"
              >
                <MapPin className="w-5 h-5 text-[#10B981] dark:text-[#C6F432]" />
                <span>Find Nearby Facilities</span>
              </button>
            </div>

            <div className="pt-3 border-t border-stone-200/70 dark:border-emerald-900/60 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-stone-500 dark:text-stone-400">
              <span>🔒 Photos never saved</span>
              <span aria-hidden="true">·</span>
              <span>🔋 Lithium-ion safety alerts</span>
              <span aria-hidden="true">·</span>
              <span>🧮 Honest CO2e &amp; scrap math</span>
            </div>
          </div>
        </div>

        {/* Right Column Bento Stack (5 cols): Live Streak/Points Tile + Quick Sample Drops */}
        <div className="lg:col-span-5 flex flex-col gap-5 justify-between">
          {/* Mini Gamification Bento Tile */}
          <div className="bg-[#0F1A14] dark:bg-[#182C21] text-white border border-emerald-900/80 rounded-[28px] p-6 flex items-center justify-between gap-4 shadow-sm">
            <div className="space-y-1">
              <div className="text-[11px] font-mono uppercase tracking-wider text-[#C6F432]">
                YOUR LIVE LOOP STATS {demoMode ? '· DEMO' : ''}
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl sm:text-4xl font-mono font-black tabular-nums text-white">
                  {animatedPoints}
                </span>
                <span className="text-xs font-mono uppercase text-emerald-300">EcoPoints</span>
              </div>
              <div className="text-xs text-emerald-200">
                {completedCount} verified loop(s) completed
              </div>
            </div>

            <div className="flex flex-col items-end gap-2 shrink-0">
              <div className="px-3.5 py-1.5 rounded-2xl bg-white/10 border border-white/15 flex items-center gap-1.5 font-mono font-extrabold text-sm text-[#FFD84D]">
                <Flame className="w-4 h-4 fill-[#FF6B5E] text-[#FF6B5E] animate-flame" />
                <span>{streakDays}d streak</span>
              </div>
              <button
                type="button"
                onClick={onOpenStoryCard}
                className="text-xs font-display font-bold text-[#C6F432] hover:underline flex items-center gap-1"
              >
                <span>Open 9:16 Wrapped</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Instant Demo Sample Drops Card */}
          <div className="bg-white dark:bg-[#14241B] border border-stone-200/90 dark:border-emerald-900/70 rounded-[28px] p-6 space-y-3.5 flex-1 flex flex-col justify-between shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-display font-extrabold text-stone-950 dark:text-white">
                  1-Tap Test Drops
                </h2>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  No trash nearby? Tap a sample to see the verdict deck:
                </p>
              </div>
              <span className="text-[11px] font-mono font-bold text-amber-800 dark:text-[#FFD84D]">
                Demo data
              </span>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => onQuickDemoScan('battery_pack')}
                className="w-full min-h-[48px] p-3 rounded-[20px] bg-stone-50 dark:bg-emerald-950/60 hover:bg-[#FF6B5E]/15 border border-stone-200/90 dark:border-emerald-800/80 hover:border-[#FF6B5E] text-left transition-all flex items-center justify-between gap-3 group active:scale-[0.99]"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl" role="img" aria-label="Battery">
                    🔋
                  </span>
                  <div>
                    <div className="text-xs sm:text-sm font-bold text-stone-950 dark:text-white">
                      Swollen Power Bank (Spicy Pillow)
                    </div>
                    <div className="text-[11px] text-[#FF6B5E] font-semibold">
                      High Hazard · Red Safety Banner Demo
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-stone-400 group-hover:text-[#FF6B5E] shrink-0" />
              </button>

              <button
                type="button"
                onClick={() => onQuickDemoScan('ewaste_board')}
                className="w-full min-h-[48px] p-3 rounded-[20px] bg-stone-50 dark:bg-emerald-950/60 hover:bg-[#10B981]/15 border border-stone-200/90 dark:border-emerald-800/80 hover:border-[#10B981] text-left transition-all flex items-center justify-between gap-3 group active:scale-[0.99]"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl" role="img" aria-label="Motherboard">
                    💻
                  </span>
                  <div>
                    <div className="text-xs sm:text-sm font-bold text-stone-950 dark:text-white">
                      PC Motherboard &amp; Cooling Fan
                    </div>
                    <div className="text-[11px] text-stone-500 dark:text-stone-400">
                      E-Waste · Salvage vs. Smelter Recovery
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-stone-400 group-hover:text-[#10B981] shrink-0" />
              </button>

              <button
                type="button"
                onClick={() => onQuickDemoScan('pet_bottle')}
                className="w-full min-h-[48px] p-3 rounded-[20px] bg-stone-50 dark:bg-emerald-950/60 hover:bg-[#10B981]/15 border border-stone-200/90 dark:border-emerald-800/80 hover:border-[#10B981] text-left transition-all flex items-center justify-between gap-3 group active:scale-[0.99]"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl" role="img" aria-label="Bottle">
                    ♻️
                  </span>
                  <div>
                    <div className="text-xs sm:text-sm font-bold text-stone-950 dark:text-white">
                      Clear PET Beverage Bottle (1L)
                    </div>
                    <div className="text-[11px] text-stone-500 dark:text-stone-400">
                      Plastic · Clean Recycle + 5-Min DIY Hacks
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-stone-400 group-hover:text-[#10B981] shrink-0" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          HOME ANALYTICS BENTO ROW: PIE CHART + REALISTIC RECOVERY GRAPH
         ===================================================================== */}
      <section
        aria-labelledby="home-analytics-heading"
        className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch"
      >
        {/* LEFT 5 COLS: INTERACTIVE WASTE STREAM PIE / DONUT CHART */}
        <div className="lg:col-span-5 bg-white dark:bg-[#14241B] border border-stone-200/90 dark:border-emerald-900/70 rounded-[28px] p-6 sm:p-7 flex flex-col justify-between space-y-5 shadow-xs">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="text-xs font-mono font-bold uppercase text-[#10B981] dark:text-[#C6F432] flex items-center gap-1.5">
                <PieChartIcon className="w-3.5 h-3.5" />
                <span>Material Stream Pie Chart</span>
              </div>
              <h2
                id="home-analytics-heading"
                className="text-lg sm:text-xl font-display font-extrabold text-stone-950 dark:text-white"
              >
                Recoverable Stream Mix
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                {usingReferenceFallback
                  ? 'Illustrative dry-waste & e-waste stream distribution (Demo / Reference)'
                  : `Based on your ${scans.length} logged scan(s) (${
                      demoMode ? 'Demo data' : 'Local history'
                    })`}
              </p>
            </div>

            <div className="flex items-center gap-1 p-1 bg-stone-100 dark:bg-[#0F1A14] rounded-xl border border-stone-200 dark:border-emerald-800">
              <button
                type="button"
                onClick={() => setPieSourceMode('my_scans')}
                className={`min-h-[34px] px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                  pieSourceMode === 'my_scans'
                    ? 'bg-[#22C55E] text-[#0F1A14]'
                    : 'text-stone-600 dark:text-stone-300'
                }`}
              >
                My Scans
              </button>
              <button
                type="button"
                onClick={() => setPieSourceMode('reference')}
                className={`min-h-[34px] px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                  pieSourceMode === 'reference'
                    ? 'bg-[#22C55E] text-[#0F1A14]'
                    : 'text-stone-600 dark:text-stone-300'
                }`}
              >
                Ref Mix
              </button>
            </div>
          </div>

          {/* Recharts Pie Chart with Center Label */}
          <div className="relative h-56 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={56}
                  outerRadius={86}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((_, idx) => (
                    <Cell
                      key={`cell-${idx}`}
                      fill={PIE_COLORS[idx % PIE_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F1A14',
                    color: '#ffffff',
                    borderRadius: '14px',
                    border: '1px solid #22C55E',
                    fontSize: '12px',
                  }}
                  itemStyle={{ color: '#ffffff' }}
                  formatter={(val: number) => [
                    `${val} ${usingReferenceFallback ? '%' : 'kg'}`,
                    'Share',
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Center Donut Readout */}
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-center">
              <span className="text-xl font-mono font-black tabular-nums text-stone-950 dark:text-white leading-none">
                {totalPieValue}
                {usingReferenceFallback ? '%' : ' kg'}
              </span>
              <span className="text-[10px] font-mono uppercase text-stone-500 dark:text-emerald-300 mt-1">
                {usingReferenceFallback ? 'Ref Stream' : 'Logged Mass'}
              </span>
            </div>
          </div>

          {/* Compact Color Legend */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-stone-200/80 dark:border-emerald-900/60">
            {pieData.map((entry, idx) => (
              <div
                key={entry.name}
                className="flex items-center justify-between gap-2 text-xs text-stone-700 dark:text-stone-300"
              >
                <div className="flex items-center gap-1.5 truncate">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}
                  />
                  <span className="truncate font-medium">{entry.name}</span>
                </div>
                <span className="font-mono font-bold tabular-nums text-stone-900 dark:text-white shrink-0">
                  {entry.value}
                  {usingReferenceFallback ? '%' : 'kg'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT 7 COLS: REALISTIC MULTI-SERIES CIRCULARITY RECOVERY & CO2e TREND GRAPH */}
        <div className="lg:col-span-7 bg-white dark:bg-[#14241B] border border-stone-200/90 dark:border-emerald-900/70 rounded-[28px] p-6 sm:p-7 flex flex-col justify-between space-y-5 shadow-xs">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="text-xs font-mono font-bold uppercase text-[#10B981] dark:text-[#C6F432] flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>
                  Circularity Trajectory ·{' '}
                  {trendMode === 'benchmark_6m'
                    ? 'Illustrative 6-Month Benchmark (Demo)'
                    : 'Your 7-Day Activity'}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-display font-extrabold text-stone-950 dark:text-white">
                Recovered Mass (kg) vs. Potential CO2e Saved
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Tracks verified material recovery against estimated potential kg CO2e savings (not
                measured; regional grid factors vary).
              </p>
            </div>

            <div className="flex items-center gap-1 p-1 bg-stone-100 dark:bg-[#0F1A14] rounded-xl border border-stone-200 dark:border-emerald-800">
              <button
                type="button"
                onClick={() => setTrendMode('benchmark_6m')}
                className={`min-h-[34px] px-3 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                  trendMode === 'benchmark_6m'
                    ? 'bg-[#22C55E] text-[#0F1A14]'
                    : 'text-stone-600 dark:text-stone-300'
                }`}
              >
                6M Benchmark
              </button>
              <button
                type="button"
                onClick={() => setTrendMode('live_7d')}
                className={`min-h-[34px] px-3 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                  trendMode === 'live_7d'
                    ? 'bg-[#22C55E] text-[#0F1A14]'
                    : 'text-stone-600 dark:text-stone-300'
                }`}
              >
                7D Live Log
              </button>
            </div>
          </div>

          {/* Realistic Smooth Gradient Area Chart */}
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={trendGraphData}
                margin={{ top: 10, right: 14, left: -16, bottom: 2 }}
              >
                <defs>
                  <linearGradient id="gradCo2e" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22C55E" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#22C55E" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="gradMass" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38BDF8" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#38BDF8" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#57534e"
                  strokeOpacity={0.22}
                  vertical={false}
                />
                <XAxis
                  dataKey="period"
                  tick={{ fontSize: 11, fill: '#10B981', fontWeight: 700 }}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#78716c' }}
                  axisLine={false}
                  unit=" kg"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F1A14',
                    color: '#fafaf9',
                    borderRadius: '16px',
                    border: '1px solid #22C55E',
                    fontSize: '12px',
                  }}
                  itemStyle={{ color: '#fafaf9' }}
                />
                <Area
                  type="monotone"
                  dataKey="potentialCo2eKg"
                  name="Est. Potential Savings (kg CO2e)"
                  stroke="#22C55E"
                  strokeWidth={2.8}
                  fillOpacity={1}
                  fill="url(#gradCo2e)"
                />
                <Area
                  type="monotone"
                  dataKey="recoveredKg"
                  name="Verified Recovered Mass (kg)"
                  stroke="#38BDF8"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#gradMass)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="pt-2 border-t border-stone-200/80 dark:border-emerald-900/60 flex flex-wrap items-center justify-between gap-2 text-xs text-stone-600 dark:text-stone-300">
            <div className="flex flex-wrap items-center gap-4">
              <span className="flex items-center gap-1.5 font-semibold">
                <span className="w-3 h-3 rounded-xs bg-[#22C55E] inline-block" />
                <span>Est. Potential Savings (kg CO2e)</span>
              </span>
              <span className="flex items-center gap-1.5 font-semibold">
                <span className="w-3 h-3 rounded-xs bg-[#38BDF8] inline-block" />
                <span>Verified Recovered Mass (kg)</span>
              </span>
            </div>

            <button
              type="button"
              onClick={() => onNavigate('dashboard')}
              className="font-display font-bold text-[#10B981] dark:text-[#C6F432] hover:underline flex items-center gap-1"
            >
              <span>Open Full Wrapped Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* THREE STEPS BENTO ROW */}
      <section aria-labelledby="how-it-works-heading" className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h2
            id="how-it-works-heading"
            className="text-xl sm:text-2xl font-display font-extrabold text-stone-950 dark:text-white"
          >
            Three Moves. Zero Guesswork.
          </h2>
          <span className="text-xs font-mono text-stone-500 dark:text-stone-400">
            Scan · Sort · Earn
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-white dark:bg-[#14241B] border border-stone-200/90 dark:border-emerald-900/70 rounded-[26px] p-6 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-extrabold text-[#10B981] dark:text-[#C6F432]">
                01 · SCAN IT
              </span>
              <span className="text-2xl" role="img" aria-label="Camera">
                📸
              </span>
            </div>
            <h3 className="text-lg font-display font-extrabold text-stone-950 dark:text-white">
              01. Scan your waste
            </h3>
            <p className="text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
              Snap a quick pic or type what it is. Your photo is analyzed in memory and wiped
              instantly—zero cloud photo hoarding.
            </p>
          </div>

          <div className="bg-white dark:bg-[#14241B] border border-stone-200/90 dark:border-emerald-900/70 rounded-[26px] p-6 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-extrabold text-blue-600 dark:text-sky-400">
                02 · SORT IT
              </span>
              <span className="text-2xl" role="img" aria-label="Sparkles">
                🛠️
              </span>
            </div>
            <h3 className="text-lg font-display font-extrabold text-stone-950 dark:text-white">
              02. Discover its best use
            </h3>
            <p className="text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
              Check red-alert battery warnings first, see approximate material breakdowns, and pick
              repair, DIY reuse, or clean recycling.
            </p>
          </div>

          <div className="bg-white dark:bg-[#14241B] border border-stone-200/90 dark:border-emerald-900/70 rounded-[26px] p-6 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-extrabold text-amber-600 dark:text-[#FFD84D]">
                03 · EARN IT
              </span>
              <span className="text-2xl" role="img" aria-label="Map">
                📍
              </span>
            </div>
            <h3 className="text-lg font-display font-extrabold text-stone-950 dark:text-white">
              03. Find where to take it
            </h3>
            <p className="text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
              Hit up nearby OpenStreetMap e-waste points or copy a prefilled collector message, then
              mark it done to stack EcoPoints.
            </p>
          </div>
        </div>
      </section>

      {/* SHAREABLE DAILY ECO TIP & QUOTE BENTO CARDS */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Stylish Shareable Daily Tip Card (7 cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-[#14241B] border border-stone-200/90 dark:border-emerald-900/70 rounded-[28px] p-6 sm:p-7 flex flex-col justify-between space-y-5 shadow-xs">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-stone-500 dark:text-stone-400">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-[#10B981] dark:text-[#C6F432] uppercase">
                  💡 Daily Eco Tip
                </span>
                <span aria-hidden="true">·</span>
                <span>{currentTip.category}</span>
                <span aria-hidden="true">·</span>
                <span>{currentTip.source}</span>
              </div>

              <button
                type="button"
                onClick={() =>
                  handleShareText(
                    'tip',
                    `💡 Econom Daily Tip — ${currentTip.title}: ${currentTip.tip}`
                  )
                }
                className="min-h-[36px] px-3 py-1 rounded-xl bg-stone-100 dark:bg-emerald-950 hover:bg-stone-200 dark:hover:bg-emerald-900 text-stone-800 dark:text-stone-200 font-semibold flex items-center gap-1.5 transition-transform active:scale-95"
              >
                {copiedCard === 'tip' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#10B981]" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Share Tip</span>
                  </>
                )}
              </button>
            </div>

            <h3 className="text-xl sm:text-2xl font-display font-extrabold text-stone-950 dark:text-white">
              {currentTip.title}
            </h3>

            <p className="text-sm sm:text-base text-stone-700 dark:text-stone-200 leading-relaxed">
              {currentTip.tip}
            </p>

            {tipError && (
              <p className="text-xs text-amber-900 dark:text-[#FFD84D] bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-2xl p-3">
                {tipError}
              </p>
            )}
          </div>

          <div className="pt-4 border-t border-stone-200/70 dark:border-emerald-900/60 flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleCycleBuiltInTip}
              className="min-h-[42px] px-4 py-2 rounded-2xl bg-stone-100 dark:bg-emerald-950/90 hover:bg-stone-200 dark:hover:bg-emerald-900 text-stone-800 dark:text-stone-100 text-xs font-bold flex items-center gap-2 transition-transform active:scale-95"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Next Tip</span>
            </button>

            <button
              type="button"
              onClick={handleGenerateAiTip}
              disabled={loadingTip}
              className="min-h-[42px] px-4 py-2 rounded-2xl bg-[#C6F432] hover:bg-[#b5e422] text-[#0F1A14] text-xs font-extrabold flex items-center gap-2 transition-transform active:scale-95 disabled:opacity-60"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{loadingTip ? 'Cooking up tip...' : 'Fresh AI Tip'}</span>
            </button>
          </div>
        </div>

        {/* Stylish Shareable Quote of the Day Card (5 cols) */}
        <div className="lg:col-span-5 bg-gradient-to-br from-[#0F1A14] via-[#142D20] to-[#0B1710] border border-emerald-800/70 text-white rounded-[28px] p-6 sm:p-7 flex flex-col justify-between space-y-5 shadow-sm">
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono font-bold uppercase text-[#C6F432]">
                ✨ Vibe Check · Verified Quote
              </span>
              <button
                type="button"
                onClick={() =>
                  handleShareText(
                    'quote',
                    `“${currentQuote.quote}” — ${currentQuote.attribution} (via Econom)`
                  )
                }
                className="min-h-[36px] px-3 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold flex items-center gap-1.5 transition-transform active:scale-95"
              >
                {copiedCard === 'quote' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#C6F432]" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Share</span>
                  </>
                )}
              </button>
            </div>

            <blockquote className="text-xl sm:text-2xl font-display font-extrabold text-white leading-snug">
              “{currentQuote.quote}”
            </blockquote>
          </div>

          <div className="pt-4 border-t border-white/15 flex items-center justify-between gap-4">
            <div className="text-xs">
              <div className="font-bold text-[#C6F432]">{currentQuote.attribution}</div>
              <div className="text-emerald-200/80 mt-0.5">{currentQuote.context}</div>
            </div>

            <button
              type="button"
              onClick={() => setQuoteIndex((prev) => (prev + 1) % BUILT_IN_QUOTES.length)}
              className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-transform active:scale-95 whitespace-nowrap shrink-0"
            >
              Next Quote
            </button>
          </div>
        </div>
      </section>

      {/* EXTRA POWER TOOLS BENTO ROW */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <button
          type="button"
          onClick={() => onNavigate('more', 'calculators')}
          className="bg-white dark:bg-[#14241B] hover:border-[#10B981] border border-stone-200/90 dark:border-emerald-900/70 rounded-[26px] p-6 text-left transition-all flex flex-col justify-between gap-4 group active:scale-[0.99]"
        >
          <div className="space-y-2.5">
            <div className="w-11 h-11 rounded-2xl bg-[#10B981]/15 text-[#10B981] dark:text-[#C6F432] flex items-center justify-center">
              <Calculator className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-display font-extrabold text-stone-950 dark:text-white">
              CO2e &amp; Scrap Value Math
            </h3>
            <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
              Check potential kg CO2e saved and illustrative ₹/kg scrap rates with fully editable
              tables.
            </p>
          </div>
          <div className="text-xs font-bold text-[#10B981] dark:text-[#C6F432] flex items-center gap-1">
            <span>Open Calculators</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('more', 'business')}
          className="bg-white dark:bg-[#14241B] hover:border-[#10B981] border border-stone-200/90 dark:border-emerald-900/70 rounded-[26px] p-6 text-left transition-all flex flex-col justify-between gap-4 group active:scale-[0.99]"
        >
          <div className="space-y-2.5">
            <div className="w-11 h-11 rounded-2xl bg-blue-500/15 text-blue-600 dark:text-sky-400 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-display font-extrabold text-stone-950 dark:text-white">
              Econom for Campus &amp; Biz
            </h3>
            <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
              Log bulk hostel, campus, or shop waste batches, get AI improvement tips, and export
              CSV reports.
            </p>
          </div>
          <div className="text-xs font-bold text-[#10B981] dark:text-[#C6F432] flex items-center gap-1">
            <span>Open Bulk Logger</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('more', 'shoutouts')}
          className="bg-white dark:bg-[#14241B] hover:border-[#10B981] border border-stone-200/90 dark:border-emerald-900/70 rounded-[26px] p-6 text-left transition-all flex flex-col justify-between gap-4 group active:scale-[0.99]"
        >
          <div className="space-y-2.5">
            <div className="w-11 h-11 rounded-2xl bg-[#FFD84D]/25 text-amber-800 dark:text-[#FFD84D] flex items-center justify-center">
              <MessageSquareHeart className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-display font-extrabold text-stone-950 dark:text-white">
              Community Shout-Out Wall
            </h3>
            <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
              Drop a quick note on what you repaired or recycled and hype up local circularity wins.
            </p>
          </div>
          <div className="text-xs font-bold text-[#10B981] dark:text-[#C6F432] flex items-center gap-1">
            <span>Join the Feed</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </button>
      </section>

      {/* Footer with Privacy Note and Disclaimer */}
      <footer className="border-t border-stone-200/80 dark:border-emerald-900/60 pt-8 text-xs text-stone-500 dark:text-stone-400 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="font-display font-bold text-stone-800 dark:text-stone-200">
            Econom: Smart Waste &amp; E-Waste Circularity Agent · Waste Less. Recover More.
          </div>
          <button
            type="button"
            onClick={() => onNavigate('more', 'privacy')}
            className="text-[#10B981] dark:text-[#C6F432] hover:underline font-bold self-start"
          >
            Privacy, Security &amp; Deployment Guide
          </button>
        </div>
        <p className="leading-relaxed">
          <strong>Privacy Note:</strong> Uploaded or captured photos are processed in volatile memory
          solely for analysis and are discarded immediately after processing—never saved to disk or
          logged. Geolocation is requested only with your explicit consent to search nearby
          OpenStreetMap facilities, is never stored permanently, and is never sent to the AI.
        </p>
        <p className="leading-relaxed flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 text-[#FF6B5E] shrink-0 mt-0.5" />
          <span>
            <strong>Safety &amp; Accuracy Disclaimer:</strong> Material percentages and
            recyclability scores are approximate AI estimates based on visual appearance—not official
            municipal ratings or chemical assays. Environmental impact figures are potential savings
            based on published reference factors, and scrap values are illustrative estimates. Never
            dismantle batteries, capacitors, or hazardous electronics.
          </span>
        </p>
      </footer>
    </div>
  );
};
