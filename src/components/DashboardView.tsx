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
  Award,
  CheckCircle2,
  Clock,
  Flame,
  Scale,
  ScanLine,
  ArrowRight,
  Info,
  Share2,
  Target,
  Sparkles,
} from 'lucide-react';
import {
  EcoPointEvent,
  EmissionFactorRow,
  SavedScanRecord,
} from '../types/waste';
import { calculateEnvironmentalImpact } from '../services/calculators';
import {
  calculateStreakDays,
  computeBadgesAndLevel,
} from '../services/storageService';
import { useCountUp } from './GamificationOverlay';

interface DashboardViewProps {
  demoMode: boolean;
  scans: SavedScanRecord[];
  pointEvents: EcoPointEvent[];
  emissionFactors: EmissionFactorRow[];
  onSelectScan: (scan: SavedScanRecord) => void;
  onMarkActionCompleted: (
    scanId: string,
    actionType: 'repair' | 'reuse' | 'recycle' | 'special_disposal'
  ) => void;
  onStartNewScan: () => void;
  onOpenStoryCard: () => void;
}

/**
 * Custom Geometric Illustrations for Collectible Badges (Battery Guardian, Plastic Slayer, etc.)
 */
const BadgeIllustration: React.FC<{ badgeId: string; unlocked: boolean }> = ({
  badgeId,
  unlocked,
}) => {
  const strokeColor = unlocked ? '#0F1A14' : '#78716c';
  const accentFill = unlocked ? '#C6F432' : '#d6d3d1';

  if (badgeId === 'battery-guardian') {
    return (
      <svg width="44" height="44" viewBox="0 0 44 44" fill="none" aria-hidden="true">
        <rect x="4" y="4" width="36" height="36" rx="14" fill={accentFill} />
        <rect
          x="13"
          y="14"
          width="18"
          height="18"
          rx="3"
          stroke={strokeColor}
          strokeWidth="2.5"
        />
        <path d="M18 11H26" stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" />
        <path
          d="M23 18L19 23H25L21 28"
          stroke={strokeColor}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (badgeId === 'plastic-slayer') {
    return (
      <svg width="44" height="44" viewBox="0 0 44 44" fill="none" aria-hidden="true">
        <rect
          x="4"
          y="4"
          width="36"
          height="36"
          rx="14"
          fill={unlocked ? '#FFD84D' : '#d6d3d1'}
        />
        <path
          d="M18 12H26V16L29 20V31C29 32.1 28.1 33 27 33H17C15.9 33 15 32.1 15 31V20L18 16V12Z"
          stroke={strokeColor}
          strokeWidth="2.4"
          strokeLinejoin="round"
        />
        <path
          d="M12 30L32 14"
          stroke={unlocked ? '#FF6B5E' : strokeColor}
          strokeWidth="2.8"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (badgeId === 'repair-reuse-champion') {
    return (
      <svg width="44" height="44" viewBox="0 0 44 44" fill="none" aria-hidden="true">
        <rect
          x="4"
          y="4"
          width="36"
          height="36"
          rx="14"
          fill={unlocked ? '#38BDF8' : '#d6d3d1'}
        />
        <path
          d="M15 29L26 18M26 18C24.5 15 26 12 29 12C29 15 26 16.5 29 18C30.5 19.5 32 18 32 18C32 21 29 22.5 26 18Z"
          stroke={strokeColor}
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg width="44" height="44" viewBox="0 0 44 44" fill="none" aria-hidden="true">
      <rect
        x="4"
        y="4"
        width="36"
        height="36"
        rx="14"
        fill={unlocked ? '#22C55E' : '#d6d3d1'}
      />
      <circle cx="22" cy="22" r="9" stroke={strokeColor} strokeWidth="2.5" />
      <path
        d="M18.5 22L21 24.5L26 19.5"
        stroke={strokeColor}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export const DashboardView: React.FC<DashboardViewProps> = ({
  demoMode,
  scans,
  pointEvents,
  emissionFactors,
  onSelectScan,
  onMarkActionCompleted,
  onStartNewScan,
  onOpenStoryCard,
}) => {
  const [historyFilter, setHistoryFilter] = useState<'all' | 'completed' | 'pending'>('all');
  const [chartMetric, setChartMetric] = useState<'count' | 'weight'>('count');
  const [dailyGoalTarget, setDailyGoalTarget] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('ecoloop_daily_goal_v1');
      return saved ? Number(saved) || 50 : 50;
    } catch {
      return 50;
    }
  });

  const handleSelectDailyGoal = (goal: number) => {
    setDailyGoalTarget(goal);
    try {
      localStorage.setItem('ecoloop_daily_goal_v1', String(goal));
    } catch {
      // ignore
    }
  };

  const completedScans = scans.filter((s) => s.completedActionType !== null);
  const pendingSuggestedScans = scans.filter((s) => s.completedActionType === null);

  let totalCompletedSavingsKgCO2e = 0;
  let totalCompletedWeightKg = 0;
  let completedCalculableCount = 0;

  completedScans.forEach((s) => {
    totalCompletedWeightKg += s.userWeightKg;
    const calc = calculateEnvironmentalImpact(
      s.result.category,
      s.userWeightKg,
      emissionFactors,
      s.completedActionType
    );
    if (calc.status === 'calculated' && calc.estimatedSavingsKgCO2e !== null) {
      totalCompletedSavingsKgCO2e += calc.estimatedSavingsKgCO2e;
      completedCalculableCount++;
    }
  });

  let potentialPendingSavingsKgCO2e = 0;
  pendingSuggestedScans.forEach((s) => {
    const calc = calculateEnvironmentalImpact(
      s.result.category,
      s.userWeightKg,
      emissionFactors,
      s.result.bestUse.action
    );
    if (calc.status === 'calculated' && calc.estimatedSavingsKgCO2e !== null) {
      potentialPendingSavingsKgCO2e += calc.estimatedSavingsKgCO2e;
    }
  });

  const { totalPoints, levelName, nextLevelPoints, badges } = computeBadgesAndLevel(
    scans,
    pointEvents
  );
  const animatedTotalPoints = useCountUp(totalPoints);
  const streakDays = calculateStreakDays(pointEvents);
  const unlockedBadgeCount = badges.filter((b) => b.unlocked).length;

  const levelProgressPct = Math.min(
    100,
    Math.round((totalPoints / Math.max(1, nextLevelPoints)) * 100)
  );

  // Today's EcoPoints for the Circular Progress Ring
  const todayIso = new Date().toISOString().slice(0, 10);
  const todayPoints = pointEvents
    .filter((ev) => ev.timestamp.slice(0, 10) === todayIso)
    .reduce((sum, ev) => sum + ev.points, 0);

  const dailyGoalPct = Math.min(
    100,
    Math.round((todayPoints / Math.max(1, dailyGoalTarget)) * 100)
  );
  const dailyGoalReached = todayPoints >= dailyGoalTarget;

  // SVG Circular Ring Geometry (Outer = Daily Goal, Inner = Level Progress)
  const ringSize = 148;
  const outerStroke = 12;
  const outerRadius = (ringSize - outerStroke) / 2;
  const outerCirc = 2 * Math.PI * outerRadius;
  const outerOffset = outerCirc - (dailyGoalPct / 100) * outerCirc;

  const innerRadius = outerRadius - 16;
  const innerCirc = 2 * Math.PI * innerRadius;
  const innerOffset = innerCirc - (levelProgressPct / 100) * innerCirc;

  const last7Days = Array.from({ length: 7 }, (_, idx) => {
    const d = new Date(Date.now() - (6 - idx) * 86400000);
    const isoDate = d.toISOString().slice(0, 10);
    const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2);
    const dayNum = d.getDate();
    const hasActivity = pointEvents.some((ev) => ev.timestamp.slice(0, 10) === isoDate);
    return { isoDate, dayLabel, dayNum, hasActivity };
  });

  const categoryStats: Record<
    string,
    {
      category: string;
      completedCount: number;
      suggestedCount: number;
      completedWeightKg: number;
      suggestedWeightKg: number;
    }
  > = {};

  scans.forEach((s) => {
    const cat = s.result.category;
    if (!categoryStats[cat]) {
      categoryStats[cat] = {
        category: cat.toUpperCase(),
        completedCount: 0,
        suggestedCount: 0,
        completedWeightKg: 0,
        suggestedWeightKg: 0,
      };
    }
    if (s.completedActionType) {
      categoryStats[cat].completedCount += 1;
      categoryStats[cat].completedWeightKg = Number(
        (categoryStats[cat].completedWeightKg + s.userWeightKg).toFixed(2)
      );
    } else {
      categoryStats[cat].suggestedCount += 1;
      categoryStats[cat].suggestedWeightKg = Number(
        (categoryStats[cat].suggestedWeightKg + s.userWeightKg).toFixed(2)
      );
    }
  });

  const chartData = Object.values(categoryStats);

  const visibleHistoryScans = scans.filter((s) => {
    if (historyFilter === 'completed') return s.completedActionType !== null;
    if (historyFilter === 'pending') return s.completedActionType === null;
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-14">
      {/* Top Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1.5">
          <div className="text-xs font-mono font-bold uppercase tracking-wider text-[#10B981] dark:text-[#C6F432] flex flex-wrap items-center gap-2">
            <span>⚡ Personal Impact Studio</span>
            <span aria-hidden="true">·</span>
            <span>Verified Loop Ledger</span>
            {demoMode && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-mono font-bold text-[#0F1A14] bg-[#FFD84D] px-2.5 py-0.5 rounded-lg">
                  Demo data
                </span>
              </>
            )}
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-black tracking-tight text-stone-950 dark:text-white">
            Your Circularity Wrapped
          </h1>
          <p className="text-sm text-stone-600 dark:text-stone-300 max-w-2xl">
            Zero inflated stats: AI suggestions, your verified completed actions, and deterministic
            CO2e estimates stay in separate lanes.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onOpenStoryCard}
            className="min-h-[46px] px-4 py-2.5 rounded-2xl bg-[#C6F432] hover:bg-[#b5e422] text-[#0F1A14] text-xs sm:text-sm font-display font-extrabold flex items-center gap-2 transition-transform active:scale-95 whitespace-nowrap shrink-0 shadow-sm"
          >
            <Share2 className="w-4 h-4" />
            <span>9:16 Impact Story Card</span>
          </button>

          <button
            type="button"
            onClick={onStartNewScan}
            className="min-h-[46px] px-5 py-2.5 rounded-2xl bg-[#22C55E] hover:bg-[#10B981] text-[#0F1A14] text-xs sm:text-sm font-display font-extrabold flex items-center gap-2 transition-transform active:scale-95 whitespace-nowrap shrink-0"
          >
            <ScanLine className="w-4 h-4 stroke-[2.5]" />
            <span>Drop New Scan</span>
          </button>
        </div>
      </div>

      {/* HERO BENTO GRID: Gen-Z Circularity Passport (Dual Concentric Rings) + 3 Strictly Separated Impact Pillars */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Left 6 Cols: Tactile Dark "Circularity Passport" Card */}
        <div className="lg:col-span-6 bg-gradient-to-br from-[#0F1A14] via-[#13291E] to-[#0B140F] text-stone-100 rounded-[28px] p-6 sm:p-7 flex flex-col justify-between space-y-6 border border-emerald-800/80 shadow-md">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="text-xs font-mono uppercase tracking-wider text-[#C6F432] flex items-center gap-2">
                <span>Circularity Passport</span>
                {demoMode && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="text-[#FFD84D]">Demo data</span>
                  </>
                )}
              </div>
              <h2 className="text-2xl sm:text-3xl font-display font-black text-white tracking-tight">
                {levelName}
              </h2>
              <div className="text-xs text-emerald-200/90 flex items-center gap-2">
                <span>Balance:</span>
                <strong className="font-mono text-lg text-[#C6F432] tabular-nums">
                  {animatedTotalPoints} EcoPoints
                </strong>
                <span>· Next rank: {nextLevelPoints} pts</span>
              </div>
            </div>

            {/* Animated Streak Flame Badge */}
            <div className="px-3.5 py-2 rounded-2xl bg-white/10 border border-white/15 text-right shrink-0">
              <div className="flex items-center justify-end gap-1.5 text-[#FFD84D] font-mono font-black text-lg tabular-nums">
                <Flame className="w-5 h-5 fill-[#FF6B5E] text-[#FF6B5E] animate-flame" />
                <span>{streakDays}d</span>
              </div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-200">
                Daily Streak
              </div>
            </div>
          </div>

          {/* Dual Concentric SVG Progress Rings (Outer = Daily Goal, Inner = Rank Level XP) */}
          <div className="bg-white/5 border border-white/10 rounded-[24px] p-4 sm:p-5 flex flex-col sm:flex-row items-center gap-5">
            <div
              className="relative flex items-center justify-center shrink-0"
              style={{ width: ringSize, height: ringSize }}
            >
              <svg
                width={ringSize}
                height={ringSize}
                viewBox={`0 0 ${ringSize} ${ringSize}`}
                className="-rotate-90 transform"
                role="img"
                aria-label={`Daily EcoPoint Goal: ${todayPoints} of ${dailyGoalTarget} points (${dailyGoalPct}%). Level Progress: ${levelProgressPct}%`}
              >
                {/* Outer Track (Daily Goal) */}
                <circle
                  cx={ringSize / 2}
                  cy={ringSize / 2}
                  r={outerRadius}
                  fill="transparent"
                  stroke="rgba(198, 244, 50, 0.16)"
                  strokeWidth={outerStroke}
                />
                {/* Outer Progress Arc */}
                <circle
                  cx={ringSize / 2}
                  cy={ringSize / 2}
                  r={outerRadius}
                  fill="transparent"
                  stroke={dailyGoalReached ? '#C6F432' : '#22C55E'}
                  strokeWidth={outerStroke}
                  strokeDasharray={outerCirc}
                  strokeDashoffset={outerOffset}
                  strokeLinecap="round"
                  className="transition-all duration-300 ease-out"
                />

                {/* Inner Track (Level Progress) */}
                <circle
                  cx={ringSize / 2}
                  cy={ringSize / 2}
                  r={innerRadius}
                  fill="transparent"
                  stroke="rgba(56, 189, 248, 0.16)"
                  strokeWidth={8}
                />
                {/* Inner Progress Arc */}
                <circle
                  cx={ringSize / 2}
                  cy={ringSize / 2}
                  r={innerRadius}
                  fill="transparent"
                  stroke="#38BDF8"
                  strokeWidth={8}
                  strokeDasharray={innerCirc}
                  strokeDashoffset={innerOffset}
                  strokeLinecap="round"
                  className="transition-all duration-300 ease-out"
                />
              </svg>

              {/* Center Readout */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-mono font-black tabular-nums text-white leading-none">
                  {todayPoints}
                  <span className="text-xs font-normal text-emerald-300">/{dailyGoalTarget}</span>
                </span>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#C6F432] mt-1">
                  {dailyGoalReached ? 'RING CLOSED!' : `${dailyGoalPct}% TODAY`}
                </span>
                <span className="text-[9px] font-mono text-sky-300 mt-0.5">
                  LVL {levelProgressPct}%
                </span>
              </div>
            </div>

            {/* Interactive Goal Controls */}
            <div className="flex-1 space-y-3 text-center sm:text-left w-full">
              <div className="space-y-1">
                <div className="text-xs font-mono uppercase text-[#C6F432] font-bold flex items-center justify-center sm:justify-start gap-1.5">
                  <Target className="w-3.5 h-3.5" />
                  <span>Daily Goal &amp; Rank Rings</span>
                </div>
                <p className="text-xs text-emerald-100 leading-relaxed">
                  {dailyGoalReached
                    ? `Boom! You closed your ${dailyGoalTarget} pt daily ring! Up the stakes below or keep stacking.`
                    : `Outer ring: ${Math.max(
                        0,
                        dailyGoalTarget - todayPoints
                      )} pts left today. Inner blue ring: ${levelProgressPct}% to next rank.`}
                </p>
              </div>

              <div className="space-y-1.5">
                <div className="text-[11px] font-mono text-emerald-300">
                  Pick Daily Target Pace:
                </div>
                <div className="flex items-center justify-center sm:justify-start gap-1.5">
                  {[
                    { pts: 30, label: '30 · Chill' },
                    { pts: 50, label: '50 · Daily' },
                    { pts: 100, label: '100 · Max' },
                  ].map((preset) => (
                    <button
                      key={preset.pts}
                      type="button"
                      onClick={() => handleSelectDailyGoal(preset.pts)}
                      className={`min-h-[36px] px-3 py-1 rounded-xl font-mono text-xs font-bold transition-transform active:scale-95 whitespace-nowrap shrink-0 border ${
                        dailyGoalTarget === preset.pts
                          ? 'bg-[#C6F432] text-[#0F1A14] border-[#C6F432]'
                          : 'bg-white/5 text-emerald-200 border-white/15 hover:bg-white/10'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 7-Day Activity Habit Strip */}
          <div className="pt-1 space-y-2">
            <div className="flex items-center justify-between text-xs text-emerald-200">
              <span className="font-bold">7-Day Loop Check-In</span>
              <span className="font-mono text-[11px] text-[#C6F432]">
                {unlockedBadgeCount}/{badges.length} badges unlocked
              </span>
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {last7Days.map((day) => (
                <div
                  key={day.isoDate}
                  className={`py-2 rounded-2xl text-center border transition-colors ${
                    day.hasActivity
                      ? 'bg-[#C6F432] border-[#C6F432] text-[#0F1A14] font-black'
                      : 'bg-white/5 border-white/10 text-emerald-400'
                  }`}
                >
                  <div className="text-[10px] font-mono uppercase">{day.dayLabel}</div>
                  <div className="text-xs font-mono font-bold tabular-nums mt-0.5">
                    {day.dayNum}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right 6 Cols: 3 Visually Separated Cards (Verified Actions, Deterministic Impact, Pending AI Suggestions) */}
        <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Card A: Verified Completed Actions */}
          <div className="bg-white dark:bg-[#14241B] border border-stone-200/90 dark:border-emerald-900/70 rounded-[28px] p-6 flex flex-col justify-between space-y-4 shadow-xs">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono uppercase text-[#10B981] dark:text-[#C6F432] font-bold">
                <span>01 · Verified By You</span>
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div className="text-4xl font-mono font-black tabular-nums text-stone-950 dark:text-white">
                {completedScans.length}
                <span className="text-base font-sans font-bold text-stone-500 dark:text-stone-400 ml-1.5">
                  completed loops
                </span>
              </div>
              <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                Only counted after you explicitly mark a repair, reuse, recycle, or safe drop-off
                as done.
              </p>
            </div>

            <div className="pt-3 border-t border-stone-200/80 dark:border-emerald-900/60 flex items-center justify-between text-xs text-stone-600 dark:text-stone-300 font-mono tabular-nums">
              <span>Verified Mass Sorted</span>
              <strong className="text-stone-950 dark:text-white">
                {totalCompletedWeightKg.toFixed(2)} kg
              </strong>
            </div>
          </div>

          {/* Card B: Deterministic Estimated Impact (Completed Only) */}
          <div className="bg-white dark:bg-[#14241B] border border-stone-200/90 dark:border-emerald-900/70 rounded-[28px] p-6 flex flex-col justify-between space-y-4 shadow-xs">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono uppercase text-emerald-800 dark:text-emerald-300 font-bold">
                <span>02 · Deterministic Math</span>
                <Scale className="w-4 h-4 text-[#10B981]" />
              </div>
              <div className="text-4xl font-mono font-black tabular-nums text-[#10B981] dark:text-[#22C55E]">
                ~{totalCompletedSavingsKgCO2e.toFixed(2)}
                <span className="text-base font-sans font-bold ml-1.5">kg CO2e</span>
              </div>
              <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                Nice! That&apos;s{' '}
                <strong>estimated potential savings (not measured)</strong> across{' '}
                {completedCalculableCount} calculable completed item(s).
              </p>
            </div>

            <div className="pt-3 border-t border-stone-200/80 dark:border-emerald-900/60 flex items-center justify-between text-xs text-stone-500 dark:text-stone-400">
              <span>Regional grid savings vary</span>
              <span className="font-mono">Non-AI formula</span>
            </div>
          </div>

          {/* Card C: Pending AI Suggestions (Kept Visually Separate across full bottom span) */}
          <div className="sm:col-span-2 bg-stone-100/90 dark:bg-[#182C21] border border-stone-200/90 dark:border-emerald-800/80 rounded-[28px] p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-xs font-mono uppercase text-stone-600 dark:text-emerald-300 font-bold flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-[#FFD84D]" />
                <span>03 · Unconfirmed AI Suggestions (Kept Separate)</span>
              </div>
              <div className="text-sm sm:text-base font-display font-extrabold text-stone-950 dark:text-white">
                {pendingSuggestedScans.length} scanned item(s) waiting for your action confirmation
              </div>
              <p className="text-xs text-stone-600 dark:text-stone-300">
                Completing these pending items could save an estimated{' '}
                <span className="font-mono font-bold text-stone-900 dark:text-[#C6F432] tabular-nums">
                  ~{potentialPendingSavingsKgCO2e.toFixed(2)} kg CO2e
                </span>
                . Confirming one below triggers confetti &amp; fills your Daily Ring!
              </p>
            </div>

            {pendingSuggestedScans.length > 0 && (
              <button
                type="button"
                onClick={() => setHistoryFilter('pending')}
                className="min-h-[42px] px-4 py-2 rounded-2xl bg-white dark:bg-[#0F1A14] hover:bg-stone-50 border border-stone-300 dark:border-emerald-700 text-xs font-display font-bold text-stone-900 dark:text-white whitespace-nowrap shrink-0"
              >
                Review Pending ({pendingSuggestedScans.length})
              </button>
            )}
          </div>
        </div>
      </section>

      {/* MIDDLE BENTO ROW: Interactive Analytics Chart + Illustrated Collectible Badges */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Category Breakdown Chart */}
        <section className="lg:col-span-7 bg-white dark:bg-[#14241B] border border-stone-200/90 dark:border-emerald-900/70 rounded-[28px] p-6 sm:p-7 space-y-5 flex flex-col justify-between shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="text-xs font-mono uppercase text-[#10B981] dark:text-[#C6F432] font-bold">
                Material Stream Breakdown
              </div>
              <h2 className="text-lg sm:text-xl font-display font-extrabold text-stone-950 dark:text-white">
                Verified Completed vs. AI Suggested
              </h2>
            </div>

            <div className="flex items-center gap-1 p-1 bg-stone-100 dark:bg-[#0F1A14] rounded-xl border border-stone-200/80 dark:border-emerald-800 self-start">
              <button
                type="button"
                onClick={() => setChartMetric('count')}
                className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0 ${
                  chartMetric === 'count'
                    ? 'bg-[#22C55E] text-[#0F1A14]'
                    : 'text-stone-600 dark:text-stone-300'
                }`}
              >
                By Item Count
              </button>
              <button
                type="button"
                onClick={() => setChartMetric('weight')}
                className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0 ${
                  chartMetric === 'weight'
                    ? 'bg-[#22C55E] text-[#0F1A14]'
                    : 'text-stone-600 dark:text-stone-300'
                }`}
              >
                By Mass (kg)
              </button>
            </div>
          </div>

          {chartData.length === 0 ? (
            <div className="h-64 rounded-[22px] bg-[#F7F8F5] dark:bg-[#0F1A14]/60 border border-stone-200/80 dark:border-emerald-800 flex flex-col items-center justify-center p-6 text-center space-y-3">
              <p className="text-sm font-display font-bold text-stone-900 dark:text-white">
                No material streams logged yet
              </p>
              <p className="text-xs text-stone-500 dark:text-stone-400 max-w-sm">
                Scan your first waste item or switch Demo Mode ON in the top toolbar to unlock your
                stream breakdown chart.
              </p>
              <button
                type="button"
                onClick={onStartNewScan}
                className="min-h-[42px] px-4 py-2 rounded-xl bg-[#22C55E] text-[#0F1A14] text-xs font-display font-extrabold"
              >
                Start First Scan
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    margin={{ top: 10, right: 12, left: -16, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#57534e" strokeOpacity={0.25} vertical={false} />
                    <XAxis
                      dataKey="category"
                      tick={{ fontSize: 11, fill: '#10B981', fontWeight: 700 }}
                      axisLine={false}
                    />
                    <YAxis
                      allowDecimals={chartMetric === 'weight'}
                      tick={{ fontSize: 11, fill: '#78716c' }}
                      axisLine={false}
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
                    <Bar
                      dataKey={
                        chartMetric === 'count' ? 'completedCount' : 'completedWeightKg'
                      }
                      name={
                        chartMetric === 'count'
                          ? 'Verified Completed (items)'
                          : 'Verified Completed (kg)'
                      }
                      fill="#22C55E"
                      radius={[10, 10, 0, 0]}
                    />
                    <Bar
                      dataKey={
                        chartMetric === 'count' ? 'suggestedCount' : 'suggestedWeightKg'
                      }
                      name={
                        chartMetric === 'count'
                          ? 'Pending AI Suggestion (items)'
                          : 'Pending AI Suggestion (kg)'
                      }
                      fill="#94a3b8"
                      radius={[10, 10, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-stone-200/80 dark:border-emerald-900/60 text-xs text-stone-600 dark:text-stone-300">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5 font-semibold">
                    <span className="w-3 h-3 rounded-xs bg-[#22C55E] inline-block" />
                    <span>Verified Completed</span>
                  </span>
                  <span className="flex items-center gap-1.5 font-semibold">
                    <span className="w-3 h-3 rounded-xs bg-slate-400 inline-block" />
                    <span>Pending AI Suggestion</span>
                  </span>
                </div>
                <span className="font-mono text-[11px] text-stone-500 dark:text-stone-400">
                  {scans.length} total scan record(s)
                </span>
              </div>
            </div>
          )}
        </section>

        {/* Illustrated Collectible Badges Vault ("Battery Guardian", "Plastic Slayer", etc.) */}
        <section className="lg:col-span-5 bg-white dark:bg-[#14241B] border border-stone-200/90 dark:border-emerald-900/70 rounded-[28px] p-6 sm:p-7 space-y-5 flex flex-col justify-between shadow-xs">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-mono uppercase text-[#10B981] dark:text-[#C6F432] font-bold">
                  Collectible Stickers
                </div>
                <h2 className="text-lg sm:text-xl font-display font-extrabold text-stone-950 dark:text-white">
                  Achievement Vault
                </h2>
              </div>
              <span className="text-xs font-mono font-black text-[#0F1A14] bg-[#C6F432] px-3 py-1 rounded-xl tabular-nums">
                {unlockedBadgeCount}/{badges.length} Unlocked
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {badges.map((b) => (
                <div
                  key={b.id}
                  className={`p-4 rounded-[22px] border transition-all flex flex-col justify-between space-y-3 ${
                    b.unlocked
                      ? 'bg-[#0F1A14] dark:bg-[#0B140E] text-white border-[#22C55E]/60 shadow-xs'
                      : 'bg-[#F7F8F5] dark:bg-[#0F1A14]/40 text-stone-400 border-stone-200/90 dark:border-emerald-900/40'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <BadgeIllustration badgeId={b.id} unlocked={b.unlocked} />
                    <span
                      className={`font-mono text-[10px] uppercase tracking-wider font-extrabold ${
                        b.unlocked ? 'text-[#C6F432]' : 'text-stone-400'
                      }`}
                    >
                      {b.unlocked ? 'UNLOCKED' : 'LOCKED'}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div
                      className={`text-sm font-display font-extrabold leading-snug ${
                        b.unlocked ? 'text-white' : 'text-stone-600 dark:text-stone-400'
                      }`}
                    >
                      {b.name}
                    </div>
                    <p
                      className={`text-[11px] leading-relaxed ${
                        b.unlocked ? 'text-emerald-200/90' : 'text-stone-400 dark:text-stone-500'
                      }`}
                    >
                      {b.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3.5 rounded-[20px] bg-[#F7F8F5] dark:bg-[#0F1A14] border border-stone-200 dark:border-emerald-800/80 text-xs text-stone-600 dark:text-stone-300 flex items-start gap-2">
            <Info className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
            <span>
              <strong>In-App Recognition Only:</strong> EcoPoints, ranks, and collectible badges are
              in-app sustainability milestones and carry{' '}
              <strong>no cash or monetary value</strong>.
            </span>
          </div>
        </section>
      </div>

      {/* BOTTOM BENTO ROW: Interactive Filterable Scan Feed & EcoPoints Receipt Ledger */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Filterable Scan History */}
        <section className="lg:col-span-7 bg-white dark:bg-[#14241B] border border-stone-200/90 dark:border-emerald-900/70 rounded-[28px] p-6 sm:p-7 space-y-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg sm:text-xl font-display font-extrabold text-stone-950 dark:text-white">
                Scan &amp; Recovery Feed ({visibleHistoryScans.length})
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Tap any item to reopen its verdict deck, or mark a pending action done for confetti!
              </p>
            </div>

            <div className="flex items-center gap-1 p-1 bg-stone-100 dark:bg-[#0F1A14] rounded-xl border border-stone-200/80 dark:border-emerald-800 self-start">
              <button
                type="button"
                onClick={() => setHistoryFilter('all')}
                className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0 ${
                  historyFilter === 'all'
                    ? 'bg-[#22C55E] text-[#0F1A14]'
                    : 'text-stone-600 dark:text-stone-300'
                }`}
              >
                All ({scans.length})
              </button>
              <button
                type="button"
                onClick={() => setHistoryFilter('completed')}
                className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0 ${
                  historyFilter === 'completed'
                    ? 'bg-[#22C55E] text-[#0F1A14]'
                    : 'text-stone-600 dark:text-stone-300'
                }`}
              >
                Verified ({completedScans.length})
              </button>
              <button
                type="button"
                onClick={() => setHistoryFilter('pending')}
                className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0 ${
                  historyFilter === 'pending'
                    ? 'bg-[#FFD84D] text-[#0F1A14]'
                    : 'text-stone-600 dark:text-stone-300'
                }`}
              >
                Pending ({pendingSuggestedScans.length})
              </button>
            </div>
          </div>

          {visibleHistoryScans.length === 0 ? (
            <div className="p-8 rounded-[22px] bg-[#F7F8F5] dark:bg-[#0F1A14]/60 border border-stone-200/80 dark:border-emerald-800 text-center space-y-2">
              <p className="text-sm font-display font-bold text-stone-800 dark:text-white">
                Nothing in this filter view yet
              </p>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Switch filter tabs above or scan an item to populate your feed.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-stone-200/80 dark:divide-emerald-900/60">
              {visibleHistoryScans.map((s) => {
                const impact = calculateEnvironmentalImpact(
                  s.result.category,
                  s.userWeightKg,
                  emissionFactors,
                  s.completedActionType || s.result.bestUse.action
                );

                return (
                  <div
                    key={s.id}
                    className="py-4 first:pt-1 last:pb-1 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="text-xs text-stone-500 dark:text-stone-400 flex flex-wrap items-center gap-1.5">
                        <span className="font-mono font-bold text-[#10B981] dark:text-[#C6F432] uppercase">
                          {s.result.category}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">{s.userWeightKg} kg</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">
                          {impact.status === 'calculated'
                            ? `~${impact.estimatedSavingsKgCO2e} kg CO2e est.`
                            : 'Impact: Insufficient data'}
                        </span>
                        {s.isDemo && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="text-amber-700 dark:text-[#FFD84D] font-bold">
                              Demo data
                            </span>
                          </>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => onSelectScan(s)}
                        className="text-base font-display font-extrabold text-stone-950 dark:text-white hover:text-[#10B981] dark:hover:text-[#C6F432] text-left flex items-center gap-1.5 group"
                      >
                        <span>{s.result.itemName}</span>
                        <ArrowRight className="w-4 h-4 text-stone-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
                      </button>

                      <div className="text-xs text-stone-600 dark:text-stone-300">
                        AI Suggestion:{' '}
                        <strong className="text-stone-800 dark:text-white">
                          {s.result.bestUse.headline}
                        </strong>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {s.completedActionType || (s.completedOptions && s.completedOptions.length > 0) ? (
                        <div className="px-3.5 py-2 rounded-2xl bg-[#22C55E]/15 border border-[#22C55E]/40 text-emerald-950 dark:text-[#C6F432] text-xs font-display font-bold flex items-center gap-1.5 whitespace-nowrap">
                          <CheckCircle2 className="w-4 h-4 text-[#10B981] dark:text-[#C6F432] shrink-0" />
                          <span>
                            Completed actions:{' '}
                            {s.completedOptions && s.completedOptions.length > 0
                              ? s.completedOptions
                                  .map((opt) =>
                                    opt === 'recycle'
                                      ? 'Recycle'
                                      : opt === 'reuse'
                                      ? 'Reuse Idea'
                                      : 'Safe Disposal'
                                  )
                                  .join(', ')
                              : s.completedActionType?.replace('_', ' ')}
                          </span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            onMarkActionCompleted(s.id, s.result.bestUse.action)
                          }
                          className="min-h-[42px] px-4 py-2 rounded-2xl bg-[#C6F432] hover:bg-[#b5e422] text-[#0F1A14] text-xs font-display font-extrabold flex items-center gap-1.5 transition-transform active:scale-95 whitespace-nowrap shadow-xs"
                        >
                          <Sparkles className="w-3.5 h-3.5 shrink-0" />
                          <span>Verify Done (+Pts)</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Receipt-Style EcoPoints Ledger */}
        <section className="lg:col-span-5 bg-white dark:bg-[#14241B] border border-stone-200/90 dark:border-emerald-900/70 rounded-[28px] p-6 sm:p-7 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-dashed border-stone-300 dark:border-emerald-800 pb-4">
            <div>
              <div className="text-xs font-mono uppercase text-stone-500 dark:text-stone-400">
                Verified Points Receipt
              </div>
              <h2 className="text-lg sm:text-xl font-display font-extrabold text-stone-950 dark:text-white flex items-center gap-2">
                <Award className="w-5 h-5 text-[#10B981] dark:text-[#C6F432]" />
                <span>EcoPoints Log</span>
              </h2>
            </div>
            <div className="text-right font-mono tabular-nums">
              <div className="text-xs text-stone-500 dark:text-stone-400">BALANCE</div>
              <div className="text-lg font-black text-[#10B981] dark:text-[#C6F432]">
                {animatedTotalPoints} PTS
              </div>
            </div>
          </div>

          {pointEvents.length === 0 ? (
            <div className="p-6 rounded-[22px] bg-[#F7F8F5] dark:bg-[#0F1A14]/60 border border-stone-200/80 dark:border-emerald-800 text-center space-y-1">
              <p className="text-sm font-display font-bold text-stone-800 dark:text-white">
                0 points logged
              </p>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Verify a repair, reuse, recycling, or safe e-waste drop-off action to print your
                first receipt line.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-dashed divide-stone-200 dark:divide-emerald-900/70 max-h-96 overflow-y-auto pr-1">
              {pointEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="py-3.5 first:pt-1 last:pb-1 flex items-start justify-between gap-3 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="font-bold text-stone-900 dark:text-white leading-snug">
                      {ev.actionLabel}
                    </div>
                    <div className="font-mono text-[11px] text-stone-500 dark:text-stone-400">
                      {new Date(ev.timestamp).toLocaleDateString()} ·{' '}
                      {ev.actionType.replace('_', ' ').toUpperCase()}
                      {ev.isDemo ? ' · DEMO DATA' : ''}
                    </div>
                  </div>
                  <span className="font-mono font-black text-[#0F1A14] bg-[#C6F432] px-2.5 py-1 rounded-xl tabular-nums shrink-0">
                    +{ev.points}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
