import React from 'react';
import {
  Home,
  ScanLine,
  MapPin,
  BarChart3,
  Layers,
  FlaskConical,
  Trash2,
  Sun,
  Moon,
  Flame,
  Sparkles,
} from 'lucide-react';
import { useCountUp } from './GamificationOverlay';

export type MainTab = 'home' | 'scan' | 'dispose' | 'map' | 'dashboard' | 'more';

interface NavigationProps {
  activeTab: MainTab;
  onSelectTab: (tab: MainTab) => void;
  demoMode: boolean;
  onToggleDemoMode: (val: boolean) => void;
  totalPoints: number;
  streakDays: number;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenOnboarding: () => void;
  onOpenClearDataModal: () => void;
}

export const TopHeader: React.FC<NavigationProps> = ({
  activeTab,
  onSelectTab,
  demoMode,
  onToggleDemoMode,
  totalPoints,
  streakDays,
  darkMode,
  onToggleDarkMode,
  onOpenOnboarding,
  onOpenClearDataModal,
}) => {
  const animatedPoints = useCountUp(totalPoints);

  const navLinks: Array<{ id: MainTab; label: string }> = [
    { id: 'home', label: 'Home' },
    { id: 'scan', label: 'Scan' },
    { id: 'map', label: 'Map' },
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'more', label: 'More' },
  ];

  return (
    <>
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 bg-[#F7F8F5]/90 dark:bg-[#0F1A14]/90 backdrop-blur-md border-b border-stone-200/80 dark:border-emerald-900/60 no-print transition-colors duration-200">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-8 px-4 sm:px-6 h-14">
          {/* Zone 1: Single text element wordmark */}
          <button
            type="button"
            onClick={() => onSelectTab('home')}
            className="text-xl font-display font-black tracking-tight text-stone-950 dark:text-white whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#10B981] rounded"
          >
            Econom
          </button>

          {/* Zone 2: 5 single-line text navigation links */}
          <nav
            aria-label="Primary Navigation"
            className="hidden md:flex items-center gap-7 text-sm font-semibold text-stone-600 dark:text-stone-300"
          >
            {navLinks.map((item) => {
              const isActive =
                activeTab === item.id ||
                (item.id === 'scan' && activeTab === 'dispose');
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectTab(item.id)}
                  className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 focus-visible:outline-2 focus-visible:outline-[#10B981] ${
                    isActive
                      ? 'border-[#10B981] dark:border-[#C6F432] text-stone-950 dark:text-[#C6F432] font-bold'
                      : 'border-transparent hover:text-stone-950 dark:hover:text-white hover:border-stone-300 dark:hover:border-emerald-800'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: 1 primary action */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => onSelectTab('scan')}
              className="min-h-[40px] px-4 py-2 text-xs sm:text-sm font-display font-extrabold text-[#0F1A14] bg-[#22C55E] hover:bg-[#10B981] rounded-2xl transition-transform active:scale-95 whitespace-nowrap shrink-0 shadow-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#22C55E]"
            >
              Scan Item
            </button>
          </div>
        </div>
      </header>

      {/* Gen-Z Workspace Status & Theme Bar */}
      <div className="bg-white/75 dark:bg-[#13221A]/85 backdrop-blur-sm border-b border-stone-200/80 dark:border-emerald-900/60 no-print transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-2.5 text-xs">
          <div className="flex flex-wrap items-center gap-2.5 text-stone-600 dark:text-stone-300">
            <button
              type="button"
              onClick={() => onSelectTab('dashboard')}
              className="font-mono tabular-nums font-bold text-stone-950 dark:text-[#C6F432] hover:underline flex items-center gap-1.5"
            >
              <span>⚡ {animatedPoints} EcoPoints</span>
            </button>

            <span aria-hidden="true">·</span>

            <button
              type="button"
              onClick={() => onSelectTab('dashboard')}
              className="font-mono tabular-nums font-bold text-amber-700 dark:text-[#FFD84D] flex items-center gap-1"
              title="Daily circularity streak"
            >
              <Flame className="w-3.5 h-3.5 fill-[#FF6B5E] text-[#FF6B5E] animate-flame" />
              <span>{streakDays}d streak</span>
            </button>

            {demoMode && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-semibold text-amber-800 dark:text-[#FFD84D]">
                  Demo data mode ON
                </span>
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Light / Dark Mode Toggle */}
            <button
              type="button"
              onClick={onToggleDarkMode}
              className="min-h-[36px] px-3 py-1.5 rounded-xl bg-stone-100 dark:bg-emerald-950/90 hover:bg-stone-200 dark:hover:bg-emerald-900 border border-stone-200 dark:border-emerald-800 text-stone-800 dark:text-stone-100 font-semibold flex items-center gap-1.5 transition-transform active:scale-95 whitespace-nowrap shrink-0"
              aria-label={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {darkMode ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-[#FFD84D]" />
                  <span>Light</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-stone-700" />
                  <span>Dark</span>
                </>
              )}
            </button>

            {/* 3-Step Intro Tour Trigger */}
            <button
              type="button"
              onClick={onOpenOnboarding}
              className="min-h-[36px] px-3 py-1.5 rounded-xl bg-stone-100 dark:bg-emerald-950/90 hover:bg-stone-200 dark:hover:bg-emerald-900 border border-stone-200 dark:border-emerald-800 text-stone-800 dark:text-stone-100 font-semibold flex items-center gap-1.5 transition-transform active:scale-95 whitespace-nowrap shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#10B981] dark:text-[#C6F432]" />
              <span className="hidden sm:inline">How it works</span>
            </button>

            {/* Demo Mode Switch */}
            <button
              type="button"
              role="switch"
              aria-checked={demoMode}
              onClick={() => onToggleDemoMode(!demoMode)}
              className={`min-h-[36px] px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 transition-transform active:scale-95 whitespace-nowrap shrink-0 border ${
                demoMode
                  ? 'bg-[#FFD84D] border-amber-400 text-[#0F1A14]'
                  : 'bg-stone-100 dark:bg-emerald-950/90 border-stone-200 dark:border-emerald-800 text-stone-700 dark:text-stone-200'
              }`}
            >
              <FlaskConical className="w-3.5 h-3.5 shrink-0" />
              <span>Demo: {demoMode ? 'ON' : 'OFF'}</span>
            </button>

            {/* Clear My Data Button */}
            <button
              type="button"
              onClick={onOpenClearDataModal}
              className="min-h-[36px] px-2.5 py-1.5 rounded-xl text-stone-500 dark:text-stone-400 hover:text-[#FF6B5E] dark:hover:text-[#FF6B5E] hover:bg-red-50/70 dark:hover:bg-red-950/40 transition-colors flex items-center gap-1 whitespace-nowrap shrink-0"
              title="Clear all saved scans, points, and logs from this browser"
            >
              <Trash2 className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Clear my data</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export const BottomTabBar: React.FC<{
  activeTab: MainTab;
  onSelectTab: (tab: MainTab) => void;
}> = ({ activeTab, onSelectTab }) => {
  return (
    <nav
      aria-label="Mobile Bottom Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#F7F8F5]/90 dark:bg-[#0F1A14]/90 backdrop-blur-xl border-t border-stone-200/80 dark:border-emerald-900/70 no-print"
    >
      <div className="grid grid-cols-5 items-center h-16 px-2 max-w-md mx-auto">
        {/* 1. Home */}
        <button
          type="button"
          onClick={() => onSelectTab('home')}
          className={`min-h-[48px] min-w-[44px] flex flex-col items-center justify-center rounded-2xl transition-transform active:scale-95 ${
            activeTab === 'home'
              ? 'text-[#10B981] dark:text-[#C6F432] font-bold'
              : 'text-stone-500 dark:text-stone-400 font-medium'
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px] mt-1">Home</span>
        </button>

        {/* 2. Map */}
        <button
          type="button"
          onClick={() => onSelectTab('map')}
          className={`min-h-[48px] min-w-[44px] flex flex-col items-center justify-center rounded-2xl transition-transform active:scale-95 ${
            activeTab === 'map'
              ? 'text-[#10B981] dark:text-[#C6F432] font-bold'
              : 'text-stone-500 dark:text-stone-400 font-medium'
          }`}
        >
          <MapPin className="w-5 h-5" />
          <span className="text-[10px] mt-1">Map</span>
        </button>

        {/* 3. Center Floating Glowing SCAN CTA */}
        <div className="flex items-center justify-center -mt-5">
          <button
            type="button"
            onClick={() => onSelectTab('scan')}
            aria-label="Scan waste item"
            className={`w-14 h-14 rounded-[22px] flex flex-col items-center justify-center transition-transform active:scale-90 shadow-lg ${
              activeTab === 'scan' || activeTab === 'dispose'
                ? 'bg-[#C6F432] text-[#0F1A14] shadow-[#C6F432]/40 ring-4 ring-[#C6F432]/25'
                : 'bg-gradient-to-tr from-[#10B981] to-[#22C55E] text-[#0F1A14] shadow-[#22C55E]/40 ring-4 ring-[#F7F8F5] dark:ring-[#0F1A14]'
            }`}
          >
            <ScanLine className="w-6 h-6 stroke-[2.5]" />
            <span className="text-[9px] font-display font-black uppercase tracking-tight leading-none mt-0.5">
              Scan
            </span>
          </button>
        </div>

        {/* 4. Dashboard */}
        <button
          type="button"
          onClick={() => onSelectTab('dashboard')}
          className={`min-h-[48px] min-w-[44px] flex flex-col items-center justify-center rounded-2xl transition-transform active:scale-95 ${
            activeTab === 'dashboard'
              ? 'text-[#10B981] dark:text-[#C6F432] font-bold'
              : 'text-stone-500 dark:text-stone-400 font-medium'
          }`}
        >
          <BarChart3 className="w-5 h-5" />
          <span className="text-[10px] mt-1">Wrapped</span>
        </button>

        {/* 5. More */}
        <button
          type="button"
          onClick={() => onSelectTab('more')}
          className={`min-h-[48px] min-w-[44px] flex flex-col items-center justify-center rounded-2xl transition-transform active:scale-95 ${
            activeTab === 'more'
              ? 'text-[#10B981] dark:text-[#C6F432] font-bold'
              : 'text-stone-500 dark:text-stone-400 font-medium'
          }`}
        >
          <Layers className="w-5 h-5" />
          <span className="text-[10px] mt-1">More</span>
        </button>
      </div>
    </nav>
  );
};
