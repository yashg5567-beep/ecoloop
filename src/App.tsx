import React, { useState, useEffect } from 'react';
import {
  BusinessWasteEntry,
  EcoPointEvent,
  EmissionFactorRow,
  OfficialChannelResource,
  ResultActionOption,
  ReuseIdea,
  SavedScanRecord,
  ScrapRateRow,
  ShoutOutPost,
  SimulatedPickupRequest,
  WasteScanResult,
} from './types/waste';
import {
  DEMO_BUSINESS_LOGS,
  DEMO_POINT_EVENTS,
  DEMO_SCAN_HISTORY,
  DEMO_SCAN_ITEMS,
} from './services/demoData';
import {
  calculateStreakDays,
  computeBadgesAndLevel,
  storageService,
} from './services/storageService';
import { calculateEnvironmentalImpact } from './services/calculators';
import {
  BottomTabBar,
  MainTab,
  TopHeader,
} from './components/Navigation';
import { HomeView } from './components/HomeView';
import { ScannerView } from './components/ScannerView';
import { ScanResultsView } from './components/ScanResultsView';
import { DisposeView } from './components/DisposeView';
import { MapView } from './components/MapView';
import { DashboardView } from './components/DashboardView';
import { MoreSubTab, MoreView } from './components/MoreView';
import {
  ConfettiBurst,
  ImpactStoryModal,
  OnboardingModal,
} from './components/GamificationOverlay';
import { AlertTriangle, CheckCircle2, X } from 'lucide-react';

const THEME_STORAGE_KEY = 'ecoloop_theme_v1';
const ONBOARDING_SEEN_KEY = 'ecoloop_onboarding_seen_v1';

export default function App() {
  const [activeTab, setActiveTab] = useState<MainTab>('home');
  const [moreSubTab, setMoreSubTab] = useState<MoreSubTab>('calculators');
  const [mapInitialFilter, setMapInitialFilter] = useState<string>('ALL');

  // Light / Dark Mode state (defaults to user's system setting)
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'dark') return true;
      if (saved === 'light') return false;
      return (
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches
      );
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem(THEME_STORAGE_KEY, darkMode ? 'dark' : 'light');
    } catch {
      // ignore
    }
  }, [darkMode]);

  // 3-Screen Onboarding Modal State (shown once for new users, or on demand)
  const [onboardingOpen, setOnboardingOpen] = useState<boolean>(() => {
    try {
      return localStorage.getItem(ONBOARDING_SEEN_KEY) !== 'true';
    } catch {
      return false;
    }
  });

  const handleCloseOnboarding = () => {
    setOnboardingOpen(false);
    try {
      localStorage.setItem(ONBOARDING_SEEN_KEY, 'true');
    } catch {
      // ignore
    }
  };

  // Shareable 9:16 Impact Story Modal & Confetti Trigger
  const [storyModalOpen, setStoryModalOpen] = useState<boolean>(false);
  const [confettiTriggerKey, setConfettiTriggerKey] = useState<number>(0);

  const triggerConfetti = () => {
    setConfettiTriggerKey((prev) => prev + 1);
  };

  // Demo mode state (keeps demo records separate from real user records)
  const [demoMode, setDemoMode] = useState<boolean>(() =>
    storageService.getDemoMode()
  );

  // Real user records from localStorage
  const [userScans, setUserScans] = useState<SavedScanRecord[]>(() =>
    storageService.getSavedScans()
  );
  const [userPoints, setUserPoints] = useState<EcoPointEvent[]>(() =>
    storageService.getPointEvents()
  );
  const [pickupRequests, setPickupRequests] = useState<SimulatedPickupRequest[]>(() =>
    storageService.getPickupRequests()
  );
  const [officialChannels, setOfficialChannels] = useState<OfficialChannelResource[]>(() =>
    storageService.getOfficialChannels()
  );
  const [emissionFactors, setEmissionFactors] = useState<EmissionFactorRow[]>(() =>
    storageService.getEmissionFactors()
  );
  const [scrapRates, setScrapRates] = useState<ScrapRateRow[]>(() =>
    storageService.getScrapRates()
  );
  const [shoutOuts, setShoutOuts] = useState<ShoutOutPost[]>(() =>
    storageService.getShoutOuts()
  );
  const [userBusinessLogs, setUserBusinessLogs] = useState<BusinessWasteEntry[]>(() =>
    storageService.getBusinessLogs()
  );

  // Demo session records (kept in memory so user can interact in Demo Mode without polluting real history)
  const [demoScans, setDemoScans] = useState<SavedScanRecord[]>(DEMO_SCAN_HISTORY);
  const [demoPoints, setDemoPoints] = useState<EcoPointEvent[]>(DEMO_POINT_EVENTS);
  const [demoBusinessLogs, setDemoBusinessLogs] =
    useState<BusinessWasteEntry[]>(DEMO_BUSINESS_LOGS);

  // Active scan inspection state
  const [currentScan, setCurrentScan] = useState<SavedScanRecord | null>(null);

  // Clear Data Confirmation Modal & Toast notification
  const [clearModalOpen, setClearModalOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 4000);
  };

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeTab, currentScan?.id]);

  const handleToggleDemoMode = (enabled: boolean) => {
    setDemoMode(enabled);
    storageService.setDemoMode(enabled);
    showToast(
      enabled
        ? 'Demo Mode ON: Displaying labeled sample scans, facilities, and dashboard data.'
        : 'Demo Mode OFF: Viewing your real local records.'
    );
  };

  // Active dataset depending on Demo Mode
  const activeScans = demoMode ? demoScans : userScans;
  const activePointEvents = demoMode ? demoPoints : userPoints;
  const activeBusinessLogs = demoMode ? demoBusinessLogs : userBusinessLogs;

  const { totalPoints, levelName, badges } = computeBadgesAndLevel(
    activeScans,
    activePointEvents
  );
  const streakDays = calculateStreakDays(activePointEvents);
  const completedScans = activeScans.filter((s) => s.completedActionType !== null);

  let estimatedSavingsKgCO2e = 0;
  completedScans.forEach((s) => {
    const calc = calculateEnvironmentalImpact(
      s.result.category,
      s.userWeightKg,
      emissionFactors,
      s.completedActionType
    );
    if (calc.status === 'calculated' && calc.estimatedSavingsKgCO2e !== null) {
      estimatedSavingsKgCO2e += calc.estimatedSavingsKgCO2e;
    }
  });

  const handleNavigate = (tab: MainTab, subTab?: string) => {
    if (tab === 'scan' && !subTab) {
      setCurrentScan(null);
    }
    if (tab === 'map' && !subTab) {
      setMapInitialFilter('ALL');
    }
    if (tab === 'more' && subTab) {
      setMoreSubTab(subTab as MoreSubTab);
    }
    setActiveTab(tab);
  };

  const handleScanComplete = (
    result: WasteScanResult,
    inputType: 'image' | 'text' | 'demo',
    isDemoItem: boolean
  ) => {
    const newRecord: SavedScanRecord = {
      id: `scan-${Date.now()}`,
      timestamp: new Date().toISOString(),
      inputType,
      isDemo: isDemoItem || demoMode,
      result,
      userWeightKg: result.estimatedWeightKg || 0.25,
      completedActionType: null,
      completedAt: null,
      completedOptions: [],
    };

    setCurrentScan(newRecord);
    setActiveTab('scan');
  };

  const handleQuickDemoScan = (demoKey: string) => {
    const sample = DEMO_SCAN_ITEMS[demoKey];
    if (!sample) return;
    handleScanComplete(sample, 'demo', true);
  };

  const handleSaveCurrentScan = () => {
    if (!currentScan) return;
    if (currentScan.isDemo || demoMode) {
      setDemoScans((prev) => {
        const exists = prev.some((s) => s.id === currentScan.id);
        return exists
          ? prev.map((s) => (s.id === currentScan.id ? currentScan : s))
          : [currentScan, ...prev];
      });
    } else {
      const updated = storageService.saveScanRecord(currentScan);
      setUserScans(updated);
    }
  };

  const handleUpdateCurrentScanWeight = (newWeightKg: number) => {
    if (!currentScan) return;
    const updatedScan: SavedScanRecord = {
      ...currentScan,
      userWeightKg: newWeightKg,
    };
    setCurrentScan(updatedScan);

    if (updatedScan.isDemo || demoMode) {
      setDemoScans((prev) =>
        prev.map((s) => (s.id === updatedScan.id ? updatedScan : s))
      );
    } else {
      const exists = userScans.some((s) => s.id === updatedScan.id);
      if (exists) {
        setUserScans(storageService.saveScanRecord(updatedScan));
      }
    }
  };

  const handleAddReuseIdeaToCurrentScan = (newIdea: ReuseIdea) => {
    if (!currentScan) return;
    const updatedScan: SavedScanRecord = {
      ...currentScan,
      result: {
        ...currentScan.result,
        reuseIdeas: [...currentScan.result.reuseIdeas, newIdea],
      },
    };
    setCurrentScan(updatedScan);

    if (updatedScan.isDemo || demoMode) {
      setDemoScans((prev) =>
        prev.map((s) => (s.id === updatedScan.id ? updatedScan : s))
      );
    } else {
      const exists = userScans.some((s) => s.id === updatedScan.id);
      if (exists) {
        setUserScans(storageService.saveScanRecord(updatedScan));
      }
    }
    showToast('Added a new creative reuse idea to this scan!');
  };

  const handleMarkActionCompleted = (
    scanId: string,
    actionType: 'repair' | 'reuse' | 'recycle' | 'special_disposal',
    optionKey?: ResultActionOption
  ) => {
    const pointsMap: Record<'repair' | 'reuse' | 'recycle' | 'special_disposal', number> = {
      repair: 40,
      reuse: 30,
      recycle: 25,
      special_disposal: 50,
    };
    const pts = pointsMap[actionType] || 25;
    const resolvedOption: ResultActionOption =
      optionKey ||
      (actionType === 'recycle'
        ? 'recycle'
        : actionType === 'special_disposal'
        ? 'disposal'
        : 'reuse');

    triggerConfetti();

    if (currentScan && currentScan.id === scanId) {
      const prevOpts = Array.isArray(currentScan.completedOptions)
        ? currentScan.completedOptions
        : [];
      const nextOpts = prevOpts.includes(resolvedOption)
        ? prevOpts
        : [...prevOpts, resolvedOption];

      const updatedCurrent: SavedScanRecord = {
        ...currentScan,
        completedActionType: actionType,
        completedAt: new Date().toISOString(),
        completedOptions: nextOpts,
      };
      setCurrentScan(updatedCurrent);

      if (updatedCurrent.isDemo || demoMode) {
        setDemoScans((prev) => {
          const exists = prev.some((s) => s.id === updatedCurrent.id);
          return exists
            ? prev.map((s) => (s.id === updatedCurrent.id ? updatedCurrent : s))
            : [updatedCurrent, ...prev];
        });
        setDemoPoints((prev) => [
          {
            id: `dpt-${Date.now()}`,
            timestamp: new Date().toISOString(),
            actionLabel: `Completed ${actionType.replace('_', ' ')}: ${
              updatedCurrent.result.itemName
            } (Demo)`,
            actionType,
            points: pts,
            scanId: updatedCurrent.id,
            isDemo: true,
          },
          ...prev,
        ]);
        showToast(
          `⚡ +${pts} Demo EcoPoints earned for completing ${actionType.replace('_', ' ')}!`
        );
        return;
      } else {
        storageService.saveScanRecord(updatedCurrent);
      }
    }

    if (demoMode) {
      setDemoScans((prev) =>
        prev.map((s) => {
          if (s.id !== scanId) return s;
          const prevOpts = Array.isArray(s.completedOptions) ? s.completedOptions : [];
          const nextOpts = prevOpts.includes(resolvedOption)
            ? prevOpts
            : [...prevOpts, resolvedOption];
          return {
            ...s,
            completedActionType: actionType,
            completedAt: new Date().toISOString(),
            completedOptions: nextOpts,
          };
        })
      );
      setDemoPoints((prev) => [
        {
          id: `dpt-${Date.now()}`,
          timestamp: new Date().toISOString(),
          actionLabel: `Completed ${actionType.replace('_', ' ')} (Demo)`,
          actionType,
          points: pts,
          scanId,
          isDemo: true,
        },
        ...prev,
      ]);
      showToast(`⚡ +${pts} Demo EcoPoints earned!`);
    } else {
      const { scans, pointEvents, pointsEarned } =
        storageService.markScanActionCompleted(scanId, actionType);
      setUserScans(scans);
      setUserPoints(pointEvents);
      showToast(
        `⚡ +${pointsEarned} EcoPoints earned! Action verified in your Wrapped.`
      );
    }
  };

  const handleSavePickupRequest = (req: SimulatedPickupRequest) => {
    const updated = storageService.addPickupRequest(req);
    setPickupRequests(updated);
    triggerConfetti();

    if (demoMode) {
      setDemoPoints((prev) => [
        {
          id: `dpt-pk-${Date.now()}`,
          timestamp: new Date().toISOString(),
          actionLabel: `Prepared Collector Pickup Message: ${req.itemDescription} (Demo)`,
          actionType: 'pickup_request',
          points: 20,
          isDemo: true,
        },
        ...prev,
      ]);
    } else {
      const pts = storageService.addPointEvent({
        id: `pt-pk-${Date.now()}`,
        timestamp: new Date().toISOString(),
        actionLabel: `Prepared Collector Pickup Message: ${req.itemDescription}`,
        actionType: 'pickup_request',
        points: 20,
      });
      setUserPoints(pts);
    }
    showToast(
      'Simulated pickup saved (+20 EcoPoints). Copy or send the collector message below.'
    );
  };

  const handleMarkMapDropoff = (facilityName: string) => {
    triggerConfetti();
    if (demoMode) {
      setDemoPoints((prev) => [
        {
          id: `dpt-map-${Date.now()}`,
          timestamp: new Date().toISOString(),
          actionLabel: `Completed Facility Drop-Off at ${facilityName} (Demo)`,
          actionType: 'special_disposal',
          points: 35,
          isDemo: true,
        },
        ...prev,
      ]);
    } else {
      const pts = storageService.addPointEvent({
        id: `pt-map-${Date.now()}`,
        timestamp: new Date().toISOString(),
        actionLabel: `Completed Facility Drop-Off at ${facilityName}`,
        actionType: 'special_disposal',
        points: 35,
      });
      setUserPoints(pts);
    }
  };

  const handleClearAllData = () => {
    storageService.clearAllUserData();
    setUserScans([]);
    setUserPoints([]);
    setPickupRequests([]);
    setOfficialChannels(storageService.getOfficialChannels());
    setEmissionFactors(storageService.getEmissionFactors());
    setScrapRates(storageService.getScrapRates());
    setShoutOuts(storageService.getShoutOuts());
    setUserBusinessLogs([]);
    setDemoMode(false);
    setCurrentScan(null);
    setClearModalOpen(false);
    showToast('All local user data has been cleared from this browser.');
  };

  const isCurrentScanSaved = currentScan
    ? activeScans.some((s) => s.id === currentScan.id)
    : false;

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F8F5] dark:bg-[#0F1A14] text-stone-900 dark:text-stone-100 transition-colors duration-200">
      {/* Celebratory Confetti Overlay (Respects prefers-reduced-motion) */}
      <ConfettiBurst triggerKey={confettiTriggerKey} />

      {/* 3-Screen Swipeable Onboarding Modal */}
      <OnboardingModal
        isOpen={onboardingOpen}
        onClose={handleCloseOnboarding}
      />

      {/* 9:16 Shareable Impact Story Card Modal */}
      <ImpactStoryModal
        isOpen={storyModalOpen}
        onClose={() => setStoryModalOpen(false)}
        levelName={levelName}
        totalPoints={totalPoints}
        completedCount={completedScans.length}
        estimatedSavingsKgCO2e={estimatedSavingsKgCO2e}
        streakDays={streakDays}
        topBadges={badges.filter((b) => b.unlocked).map((b) => b.name)}
        demoMode={demoMode}
      />

      <TopHeader
        activeTab={activeTab}
        onSelectTab={(t) => handleNavigate(t)}
        demoMode={demoMode}
        onToggleDemoMode={handleToggleDemoMode}
        totalPoints={totalPoints}
        streakDays={streakDays}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode((prev) => !prev)}
        onOpenOnboarding={() => setOnboardingOpen(true)}
        onOpenClearDataModal={() => setClearModalOpen(true)}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          className="fixed bottom-20 md:bottom-6 right-4 z-50 max-w-md bg-[#0F1A14] text-white px-4 py-3.5 rounded-2xl shadow-xl border border-[#22C55E] text-xs sm:text-sm flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-[#C6F432] shrink-0" />
            <span className="font-medium">{toastMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-emerald-300 hover:text-white p-1"
            aria-label="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 pt-6 pb-24 md:pb-12">
        {activeTab === 'home' && (
          <HomeView
            onNavigate={handleNavigate}
            onQuickDemoScan={handleQuickDemoScan}
            demoMode={demoMode}
            totalPoints={totalPoints}
            streakDays={streakDays}
            completedCount={completedScans.length}
            scans={activeScans}
            emissionFactors={emissionFactors}
            onOpenStoryCard={() => setStoryModalOpen(true)}
          />
        )}

        {activeTab === 'scan' && !currentScan && (
          <ScannerView
            demoMode={demoMode}
            onEnableDemoMode={() => handleToggleDemoMode(true)}
            onScanComplete={handleScanComplete}
          />
        )}

        {activeTab === 'scan' && currentScan && (
          <ScanResultsView
            scanRecord={currentScan}
            isSaved={isCurrentScanSaved}
            emissionFactors={emissionFactors}
            scrapRates={scrapRates}
            officialChannels={officialChannels}
            pickupRequests={pickupRequests}
            onSaveScan={handleSaveCurrentScan}
            onUpdateWeight={handleUpdateCurrentScanWeight}
            onAddReuseIdea={handleAddReuseIdeaToCurrentScan}
            onMarkActionCompleted={(actionType, optionKey) =>
              handleMarkActionCompleted(currentScan.id, actionType, optionKey)
            }
            onSavePickupRequest={handleSavePickupRequest}
            onUpdateOfficialChannels={(channels) => {
              storageService.saveOfficialChannels(channels);
              setOfficialChannels(channels);
            }}
            onOpenDisposeOptions={() => setActiveTab('dispose')}
            onOpenRecyclingMap={() => {
              setMapInitialFilter('RECYCLING_AND_EWASTE');
              setActiveTab('map');
            }}
            onScanAnother={() => setCurrentScan(null)}
            onOpenCalculatorsTab={() => handleNavigate('more', 'calculators')}
          />
        )}

        {activeTab === 'dispose' && (
          <DisposeView
            defaultItemName={currentScan?.result.itemName || ''}
            defaultCategory={currentScan?.result.category || 'e-waste'}
            pickupRequests={pickupRequests}
            officialChannels={officialChannels}
            onSavePickupRequest={handleSavePickupRequest}
            onUpdateOfficialChannels={(channels) => {
              storageService.saveOfficialChannels(channels);
              setOfficialChannels(channels);
            }}
            onOpenMap={() => {
              setMapInitialFilter('ALL');
              setActiveTab('map');
            }}
            onBackToScan={() => setActiveTab('scan')}
          />
        )}

        {activeTab === 'map' && (
          <MapView
            demoMode={demoMode}
            initialTypeFilter={mapInitialFilter}
            onMarkDropoffCompleted={handleMarkMapDropoff}
          />
        )}

        {activeTab === 'dashboard' && (
          <DashboardView
            demoMode={demoMode}
            scans={activeScans}
            pointEvents={activePointEvents}
            emissionFactors={emissionFactors}
            onSelectScan={(scan) => {
              setCurrentScan(scan);
              setActiveTab('scan');
            }}
            onMarkActionCompleted={handleMarkActionCompleted}
            onStartNewScan={() => {
              setCurrentScan(null);
              setActiveTab('scan');
            }}
            onOpenStoryCard={() => setStoryModalOpen(true)}
          />
        )}

        {activeTab === 'more' && (
          <MoreView
            activeSubTab={moreSubTab}
            onSelectSubTab={setMoreSubTab}
            demoMode={demoMode}
            emissionFactors={emissionFactors}
            scrapRates={scrapRates}
            onUpdateEmissionFactors={(factors) => {
              storageService.saveEmissionFactors(factors);
              setEmissionFactors(factors);
            }}
            onResetEmissionFactors={() => {
              setEmissionFactors(storageService.resetEmissionFactors());
              showToast('Emission factor table reset to published reference defaults.');
            }}
            onUpdateScrapRates={(rates) => {
              storageService.saveScrapRates(rates);
              setScrapRates(rates);
            }}
            onResetScrapRates={() => {
              setScrapRates(storageService.resetScrapRates());
              showToast('Scrap rate table reset to default illustrative ₹/kg values.');
            }}
            businessLogs={activeBusinessLogs}
            onAddBusinessLog={(entry) => {
              if (demoMode) {
                setDemoBusinessLogs((prev) => [
                  {
                    ...entry,
                    id: `dbiz-${Date.now()}`,
                    isDemo: true,
                  },
                  ...prev,
                ]);
              } else {
                setUserBusinessLogs(storageService.addBusinessLog(entry));
              }
              showToast('Bulk waste batch logged to Econom for Business.');
            }}
            onDeleteBusinessLog={(id) => {
              setUserBusinessLogs(storageService.deleteBusinessLog(id));
            }}
            shoutOuts={shoutOuts}
            onAddShoutOut={(nick, msg, tag) => {
              const res = storageService.addShoutOut(nick, msg, tag);
              if (res.ok && res.posts) {
                setShoutOuts(res.posts);
              }
              return { ok: res.ok, error: res.error };
            }}
            onReactShoutOut={(id, type) => {
              setShoutOuts(storageService.reactToShoutOut(id, type));
            }}
            onReportShoutOut={(id) => {
              setShoutOuts(storageService.reportShoutOut(id));
              showToast('Post reported and hidden from your view.');
            }}
            onNavigateToMap={() => setActiveTab('map')}
            onOpenClearDataModal={() => setClearModalOpen(true)}
          />
        )}
      </main>

      {/* Mobile Bottom Navigation with Floating Glowing Scan Button */}
      <BottomTabBar
        activeTab={activeTab}
        onSelectTab={(t) => handleNavigate(t)}
      />

      {/* Clear My Data Confirmation Modal */}
      {clearModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="clear-data-title"
          className="fixed inset-0 z-50 bg-black/65 backdrop-blur-md flex items-center justify-center p-4"
        >
          <div className="bg-white dark:bg-[#14241B] border border-stone-200 dark:border-emerald-800 rounded-[28px] max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-2xl bg-[#FF6B5E]/20 text-[#FF6B5E] flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3
                  id="clear-data-title"
                  className="text-lg font-display font-extrabold text-stone-950 dark:text-white"
                >
                  Clear All Local Data?
                </h3>
                <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
                  This will remove all saved scans, completed actions, EcoPoints, simulated pickup
                  requests, business bulk logs, custom factor/rate edits, and shout-outs stored in
                  this browser’s <code className="font-mono">localStorage</code>.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setClearModalOpen(false)}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-stone-100 dark:bg-emerald-950 hover:bg-stone-200 text-stone-800 dark:text-stone-200 text-xs sm:text-sm font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearAllData}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-[#FF6B5E] hover:bg-red-500 text-[#0F1A14] text-xs sm:text-sm font-display font-extrabold"
              >
                Yes, Clear My Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
