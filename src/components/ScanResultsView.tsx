import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Bookmark,
  MapPin,
  Share2,
  ArrowLeft,
  ArrowRight,
  Wrench,
  Repeat,
  Recycle,
  PackageCheck,
  Scale,
  Info,
  Calculator,
  Sparkles,
  Lightbulb,
  Trash2,
  X,
  Loader2,
  Truck,
  Landmark,
  Copy,
  MessageCircle,
  Mail,
  Plus,
  Edit3,
  AlertCircle,
} from 'lucide-react';
import {
  EmissionFactorRow,
  OfficialChannelResource,
  ResultActionOption,
  ReuseIdea,
  SavedScanRecord,
  ScrapRateRow,
  SimulatedPickupRequest,
  WasteCategory,
  isItemUnsafeToReuse,
  sanitizeText,
} from '../types/waste';
import {
  calculateEnvironmentalImpact,
  calculateScrapValue,
} from '../services/calculators';
import { generateAnotherReuseIdea } from '../services/geminiService';

interface ScanResultsViewProps {
  scanRecord: SavedScanRecord;
  isSaved: boolean;
  emissionFactors: EmissionFactorRow[];
  scrapRates: ScrapRateRow[];
  officialChannels: OfficialChannelResource[];
  pickupRequests: SimulatedPickupRequest[];
  onSaveScan: () => void;
  onUpdateWeight: (newWeightKg: number) => void;
  onAddReuseIdea: (newIdea: ReuseIdea) => void;
  onMarkActionCompleted: (
    actionType: 'repair' | 'reuse' | 'recycle' | 'special_disposal',
    optionKey?: ResultActionOption
  ) => void;
  onSavePickupRequest: (req: SimulatedPickupRequest) => void;
  onUpdateOfficialChannels: (channels: OfficialChannelResource[]) => void;
  onOpenDisposeOptions: () => void;
  onOpenRecyclingMap: () => void;
  onScanAnother: () => void;
  onOpenCalculatorsTab: () => void;
}

function getCategoryEmoji(category: WasteCategory): string {
  switch (category) {
    case 'battery':
      return '🔋';
    case 'e-waste':
      return '💻';
    case 'plastic':
      return '♻️';
    case 'paper':
      return '📦';
    case 'metal':
      return '🥫';
    case 'glass':
      return '🫙';
    case 'organic':
      return '🌱';
    case 'textile':
      return '👕';
    case 'appliance':
      return '🔌';
    case 'hazardous':
      return '⚠️';
    default:
      return '🗂️';
  }
}

function getVerdictTheme(action: 'repair' | 'reuse' | 'recycle' | 'special_disposal') {
  switch (action) {
    case 'recycle':
      return {
        label: 'RECYCLE / RECOVER',
        badgeClasses: 'bg-[#22C55E] text-[#0F1A14]',
        cardBorder: 'border-[#22C55E]/60',
        cardGradient: 'from-[#0F1A14] via-[#132E20] to-[#0B1C13]',
      };
    case 'reuse':
    case 'repair':
      return {
        label: action === 'repair' ? 'REPAIR FIRST' : 'REUSE / UPCYCLE',
        badgeClasses: 'bg-[#3B82F6] text-white',
        cardBorder: 'border-[#3B82F6]/60',
        cardGradient: 'from-[#0F172A] via-[#1E293B] to-[#0F172A]',
      };
    case 'special_disposal':
      return {
        label: 'SPECIAL SAFE DROP-OFF',
        badgeClasses: 'bg-[#FF6B5E] text-[#0F1A14]',
        cardBorder: 'border-[#FF6B5E]/80',
        cardGradient: 'from-[#2A1215] via-[#3B1519] to-[#1F0D0F]',
      };
    default:
      return {
        label: 'GENERAL SORT',
        badgeClasses: 'bg-stone-500 text-white',
        cardBorder: 'border-stone-400',
        cardGradient: 'from-stone-900 to-stone-800',
      };
  }
}

function getTargetStreamInfo(category: WasteCategory): {
  streamName: string;
  binDescription: string;
  defaultPrepSteps: string[];
} {
  switch (category) {
    case 'plastic':
      return {
        streamName: 'Dry Recyclables Bin · Rigid Plastics Stream (PET / HDPE / PP)',
        binDescription:
          'Place in your clean Dry Waste / Recyclables bin or hand over to a dry-waste recovery center.',
        defaultPrepSteps: [
          'Empty all residual liquid or food contents completely.',
          'Rinse briefly with water and shake dry so it does not contaminate paper in the same bin.',
          'Remove any loose shrink-wrap film labels if they peel off easily.',
          'Crush the bottle or container to save space and replace the cap.',
        ],
      };
    case 'paper':
      return {
        streamName: 'Clean Dry Fiber · Paper & Corrugated Cardboard Stream',
        binDescription:
          'Bundle flat for your dry-waste collector, paper recycler, or clean cardboard bin.',
        defaultPrepSteps: [
          'Peel off plastic packing tape, shipping pouches, and remove any plastic bubble wrap.',
          'Check flaps and corners for heavy metal staples.',
          'Tear off and discard any oil-soaked or food-stained sections separately.',
          'Flatten boxes completely and keep dry until collection.',
        ],
      };
    case 'metal':
      return {
        streamName: 'Dry Recyclables · Ferrous & Non-Ferrous Metal Stream',
        binDescription:
          'Place in the dry metal recyclables stream or set aside for local scrap metal recovery.',
        defaultPrepSteps: [
          'Empty and rinse food or beverage cans thoroughly.',
          'Tuck sharp metal lids inside the can or wrap edges safely.',
          'Separate pure aluminum cans from steel/tin containers if requested by your collector.',
        ],
      };
    case 'glass':
      return {
        streamName: 'Dry Cullet Glass Stream (Color-Sorted Container Glass)',
        binDescription:
          'Hand over intact or in a separate rigid container to dry-waste collectors (never mix broken glass loose with paper).',
        defaultPrepSteps: [
          'Empty liquids and rinse out any residue.',
          'Remove metal or plastic bottle caps and recycle them in their respective streams.',
          'If broken, wrap in thick newspaper or a labeled cardboard box and mark "BROKEN GLASS" clearly.',
        ],
      };
    case 'e-waste':
    case 'appliance':
      return {
        streamName: 'Authorised E-Waste & WEEE Recovery Stream (Never Curbside Bins)',
        binDescription:
          'Must be routed to a registered E-Waste Collection Center, PRO drop-off bin, or OEM take-back point.',
        defaultPrepSteps: [
          'Wipe personal data (factory reset) and remove SIM or SD memory cards if applicable.',
          'Remove any detachable batteries and tape their metal terminals with clear non-conductive tape.',
          'Coil attached power or data cables neatly instead of cutting them.',
          'Pack in a cardboard box so sharp solder pins or glass do not puncture bags.',
        ],
      };
    case 'battery':
    case 'hazardous':
      return {
        streamName: 'Dedicated Hazardous / Battery Safe Drop-Off Stream ONLY',
        binDescription:
          'NEVER place in household recycling or trash bins—compactors can crush batteries and trigger fires.',
        defaultPrepSteps: [
          'Cover all battery terminals or USB ports with clear non-conductive tape.',
          'Store in a cool, dry, non-flammable container away from sunlight and combustibles.',
          'Transport directly to a designated battery or hazardous e-waste collection point.',
        ],
      };
    case 'organic':
      return {
        streamName: 'Wet / Green Organic Composting Stream',
        binDescription:
          'Place in your aerobic home compost bin or municipal wet/biodegradable waste stream.',
        defaultPrepSteps: [
          'Remove all fruit stickers, rubber bands, plastic wrappers, and twist ties.',
          'Chop larger stalks or peels into smaller pieces to speed up aerobic composting.',
          'Balance wet food scraps with dry brown leaves or shredded unbleached paper.',
        ],
      };
    case 'textile':
      return {
        streamName: 'Clean Textile Reuse & Fiber Recovery Stream',
        binDescription:
          'Donate wearable items to thrift/community drives or hand clean dry fabric to textile recyclers.',
        defaultPrepSteps: [
          'Wash and dry garments completely—wet or mildewed cloth ruins entire textile bales.',
          'Pair shoes or socks together and tie in a clean bag.',
          'Separate heavily oil-stained rags for hazardous/industrial disposal.',
        ],
      };
    default:
      return {
        streamName: 'Segregated Dry Waste / Material Recovery Stream',
        binDescription:
          'Separate detachable materials (plastic, metal, paper) before placing in your local dry-waste stream.',
        defaultPrepSteps: [
          'Ensure the item is clean, dry, and free of food or chemical residue.',
          'Separate easily detachable parts by material type (e.g., metal cap from plastic body).',
          'Check local municipal guidelines if multi-layer or composite materials are present.',
        ],
      };
  }
}

function getDefaultStepsForIdea(ideaText: string, category: WasteCategory): string[] {
  return [
    `Clean and dry the ${category} item thoroughly and inspect for any sharp edges or wear.`,
    `Prepare the item for "${ideaText.slice(0, 70)}..." using basic household tools if needed.`,
    'Test stability and keep away from heat sources or food contact if made of single-use materials.',
  ];
}

export const ScanResultsView: React.FC<ScanResultsViewProps> = ({
  scanRecord,
  isSaved,
  emissionFactors,
  scrapRates,
  officialChannels,
  pickupRequests,
  onSaveScan,
  onUpdateWeight,
  onAddReuseIdea,
  onMarkActionCompleted,
  onSavePickupRequest,
  onUpdateOfficialChannels,
  onOpenDisposeOptions,
  onOpenRecyclingMap,
  onScanAnother,
  onOpenCalculatorsTab,
}) => {
  const { result, isDemo, userWeightKg, completedActionType } = scanRecord;

  const [weightInput, setWeightInput] = useState<string>(String(userWeightKg || 0.25));
  const [selectedActionToComplete, setSelectedActionToComplete] = useState<
    'repair' | 'reuse' | 'recycle' | 'special_disposal'
  >(result.bestUse.action);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);

  // Active Option Panel / Bottom Sheet state ('recycle' | 'reuse' | 'disposal' | null)
  const [activeOptionSheet, setActiveOptionSheet] = useState<ResultActionOption | null>(null);

  // Reuse Idea Generator state inside Panel 2
  const [generatingIdea, setGeneratingIdea] = useState<boolean>(false);
  const [ideaError, setIdeaError] = useState<string | null>(null);

  // Disposal Sub-Option Tab inside Panel 3 ('pickup' | 'dropoff' | 'official')
  const [disposalSubTab, setDisposalSubTab] = useState<'pickup' | 'dropoff' | 'official'>('pickup');
  const [pkName, setPkName] = useState<string>('');
  const [pkLocality, setPkLocality] = useState<string>('');
  const [pkItemDesc, setPkItemDesc] = useState<string>(result.itemName);
  const [pkTime, setPkTime] = useState<string>('This Weekend (10:00 AM – 1:00 PM)');
  const [pkError, setPkError] = useState<string | null>(null);
  const [latestPickup, setLatestPickup] = useState<SimulatedPickupRequest | null>(
    pickupRequests[0] || null
  );
  const [copyMsgFeedback, setCopyMsgFeedback] = useState<string | null>(null);

  // Official Channels inline customization inside Panel 3
  const [isEditingChannels, setIsEditingChannels] = useState<boolean>(false);
  const [newChTitle, setNewChTitle] = useState<string>('');
  const [newChOrgType, setNewChOrgType] =
    useState<OfficialChannelResource['organizationType']>('Municipal');
  const [newChDesc, setNewChDesc] = useState<string>('');
  const [newChHint, setNewChHint] = useState<string>('');

  // Swipeable / Stacked Card Deck State
  const [activeDeckIndex, setActiveDeckIndex] = useState<number>(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  useEffect(() => {
    setPkItemDesc(result.itemName);
  }, [result.itemName]);

  // Keyboard Escape support for closing the active panel / bottom sheet
  useEffect(() => {
    if (!activeOptionSheet) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveOptionSheet(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeOptionSheet]);

  const isBatteryOrHazardous =
    result.category === 'battery' ||
    result.category === 'hazardous' ||
    result.category === 'e-waste' ||
    result.hazards.some(
      (h) =>
        h.severity === 'high' ||
        h.hazard.toLowerCase().includes('lithium') ||
        h.hazard.toLowerCase().includes('battery')
    );

  // Strict check for hazardous items that must highlight Disposal and mute Recycle/Reuse
  const isStrictlyHazardousItem =
    result.category === 'battery' ||
    result.category === 'hazardous' ||
    result.hazards.some((h) => h.severity === 'high') ||
    isItemUnsafeToReuse(result);

  const unsafeToReuse = isItemUnsafeToReuse(result);

  // Determine which of the 3 options is the AI's "Best choice"
  const bestOptionChoice: ResultActionOption = isStrictlyHazardousItem
    ? 'disposal'
    : result.bestUse.action === 'recycle'
    ? 'recycle'
    : result.bestUse.action === 'reuse' || result.bestUse.action === 'repair'
    ? 'reuse'
    : 'disposal';

  // Compute completed options array (synced with completedActionType)
  const completedOptionsList: ResultActionOption[] = React.useMemo(() => {
    const list = new Set<ResultActionOption>(scanRecord.completedOptions || []);
    if (completedActionType === 'recycle') list.add('recycle');
    if (completedActionType === 'reuse' || completedActionType === 'repair') list.add('reuse');
    if (completedActionType === 'special_disposal') list.add('disposal');
    return Array.from(list);
  }, [scanRecord.completedOptions, completedActionType]);

  const isOptionCompleted = (opt: ResultActionOption) => completedOptionsList.includes(opt);

  const handleWeightChange = (val: string) => {
    setWeightInput(val);
    const parsed = parseFloat(val);
    if (!Number.isNaN(parsed) && parsed > 0 && parsed <= 1000) {
      onUpdateWeight(parsed);
    }
  };

  const impactEstimate = calculateEnvironmentalImpact(
    result.category,
    userWeightKg,
    emissionFactors,
    completedActionType || result.bestUse.action
  );

  const scrapEstimate = calculateScrapValue(
    result.category,
    userWeightKg,
    scrapRates
  );

  const handleShare = async () => {
    const shareText = `🌱 Econom Verdict: ${result.itemName} (${result.category.toUpperCase()})\nBest Move: ${result.bestUse.headline}\nWhy: ${result.bestUse.why}\nRecyclability AI Estimate: ${
      result.recyclability.score !== null ? `${result.recyclability.score}/100` : 'Uncertain'
    }\nWaste Less. Recover More.`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Econom: ${result.itemName}`,
          text: shareText,
        });
        setShareFeedback('Shared!');
        setTimeout(() => setShareFeedback(null), 3000);
        return;
      } catch {
        // Fallback to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(shareText);
      setShareFeedback('Verdict copied to clipboard!');
      setTimeout(() => setShareFeedback(null), 3000);
    } catch {
      setShareFeedback('Could not copy automatically.');
      setTimeout(() => setShareFeedback(null), 3000);
    }
  };

  const handleSaveClick = () => {
    onSaveScan();
    setSaveFeedback('Saved to your local history!');
    setTimeout(() => setSaveFeedback(null), 3000);
  };

  const handleGenerateMoreReuseIdea = async () => {
    if (unsafeToReuse) return;
    setGeneratingIdea(true);
    setIdeaError(null);
    try {
      const newIdea = await generateAnotherReuseIdea({
        itemName: result.itemName,
        category: result.category,
        existingIdeas: result.reuseIdeas.map((r) => r.idea),
      });
      onAddReuseIdea(newIdea);
    } catch (err) {
      setIdeaError(
        err instanceof Error
          ? err.message
          : 'Could not generate a live AI idea right now. Try again or add a sample idea below.'
      );
    } finally {
      setGeneratingIdea(false);
    }
  };

  const handleAddDemoReuseIdea = () => {
    if (unsafeToReuse) return;
    const sampleIdea: ReuseIdea = {
      idea: `Upcycle ${result.itemName} into a labeled desk cable & stationery organizer caddy (Demo Idea)`,
      difficulty: 'easy',
      estimatedTime: '10 mins',
      steps: [
        'Clean and dry all surfaces thoroughly before handling.',
        'Smooth or tape any rough edges for safe everyday desk use.',
        'Add a small label tag to sort charging cords, pens, or small tools.',
      ],
    };
    onAddReuseIdea(sampleIdea);
    setIdeaError(null);
  };

  const handleCreateInlinePickupRequest = (e: React.FormEvent) => {
    e.preventDefault();
    setPkError(null);
    if (!pkLocality.trim() || !pkItemDesc.trim()) {
      setPkError('Please enter your locality and item description.');
      return;
    }
    const req: SimulatedPickupRequest = {
      id: `pk-${Date.now()}`,
      createdAt: new Date().toISOString(),
      name: sanitizeText(pkName) || undefined,
      locality: sanitizeText(pkLocality),
      itemDescription: sanitizeText(pkItemDesc),
      category: result.category,
      preferredTime: sanitizeText(pkTime),
      status: 'Simulated (Demo Only)',
    };
    onSavePickupRequest(req);
    setLatestPickup(req);
  };

  const prefilledCollectorMessage = latestPickup
    ? `Hello, I would like to arrange a dry-waste / e-waste collection pickup.\n` +
      `Item: ${latestPickup.itemDescription} (${latestPickup.category.toUpperCase()})\n` +
      `Locality / Area: ${latestPickup.locality}\n` +
      `Preferred Window: ${latestPickup.preferredTime}\n` +
      `${latestPickup.name ? `Contact Name: ${latestPickup.name}\n` : ''}` +
      `(Prepared via Econom Circularity Assistant)`
    : '';

  const handleCopyInlineMessage = async () => {
    if (!prefilledCollectorMessage) return;
    try {
      await navigator.clipboard.writeText(prefilledCollectorMessage);
      setCopyMsgFeedback('Collector message copied to clipboard!');
      setTimeout(() => setCopyMsgFeedback(null), 3000);
    } catch {
      setCopyMsgFeedback('Please select and copy the text manually.');
      setTimeout(() => setCopyMsgFeedback(null), 3000);
    }
  };

  const handleAddInlineChannel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChTitle.trim() || !newChDesc.trim()) return;
    const added: OfficialChannelResource = {
      id: `oc-${Date.now()}`,
      title: sanitizeText(newChTitle),
      organizationType: newChOrgType,
      description: sanitizeText(newChDesc),
      actionHint:
        sanitizeText(newChHint) ||
        'Check your city’s official website for verified contact details.',
      isPlaceholder: true,
    };
    onUpdateOfficialChannels([...officialChannels, added]);
    setNewChTitle('');
    setNewChDesc('');
    setNewChHint('');
  };

  const actionLabels: Record<'repair' | 'reuse' | 'recycle' | 'special_disposal', string> = {
    repair: 'Repair Item (+40 EcoPoints)',
    reuse: 'Reuse Item (+30 EcoPoints)',
    recycle: 'Recycle Cleanly (+25 EcoPoints)',
    special_disposal: 'Safe E-Waste / Battery Drop-Off (+50 EcoPoints)',
  };

  const verdictTheme = getVerdictTheme(result.bestUse.action);
  const itemEmoji = getCategoryEmoji(result.category);
  const streamInfo = getTargetStreamInfo(result.category);

  // Prep steps for Recycle Panel
  const recycleRecommendedActions = result.recommendedActions.filter(
    (a) => a.action === 'recycle'
  );
  const recyclePrepSteps =
    recycleRecommendedActions.length > 0
      ? recycleRecommendedActions.flatMap((a) => a.instructions)
      : streamInfo.defaultPrepSteps;

  // Safe Disposal steps for Disposal Panel
  const disposalRecommendedActions = result.recommendedActions.filter(
    (a) => a.action === 'special_disposal'
  );
  const safeDisposalSteps =
    disposalRecommendedActions.length > 0
      ? disposalRecommendedActions.flatMap((a) => a.instructions)
      : result.recommendedActions.flatMap((a) => a.instructions);

  // Combined Reuse + Repair Ideas for Reuse Panel (ensure 2-3 ideas when safe)
  const displayReuseIdeas: ReuseIdea[] = React.useMemo(() => {
    if (unsafeToReuse) return [];
    const baseIdeas = [...result.reuseIdeas];
    const repairReuseActions = result.recommendedActions.filter(
      (a) => a.action === 'repair' || a.action === 'reuse'
    );
    repairReuseActions.forEach((act) => {
      if (
        baseIdeas.length < 3 &&
        !baseIdeas.some((b) => b.idea.toLowerCase() === act.title.toLowerCase())
      ) {
        baseIdeas.push({
          idea: act.title,
          difficulty: act.action === 'repair' ? 'medium' : 'easy',
          estimatedTime: '15 mins',
          steps: act.instructions,
        });
      }
    });
    return baseIdeas;
  }, [result.reuseIdeas, result.recommendedActions, unsafeToReuse]);

  const deckTabs = [
    { id: 0, label: '01 · Verdict' },
    { id: 1, label: '02 · How-To Steps' },
    { id: 2, label: '03 · Materials' },
    { id: 3, label: '04 · Impact & Scrap' },
  ];

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX;
    if (delta < -50 && activeDeckIndex < deckTabs.length - 1) {
      setActiveDeckIndex(activeDeckIndex + 1);
    } else if (delta > 50 && activeDeckIndex > 0) {
      setActiveDeckIndex(activeDeckIndex - 1);
    }
    setTouchStartX(null);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onScanAnother}
          className="min-h-[44px] px-4 py-2 rounded-2xl bg-white dark:bg-[#14241B] hover:bg-stone-100 dark:hover:bg-emerald-950 border border-stone-200 dark:border-emerald-800 text-xs sm:text-sm font-display font-bold text-stone-800 dark:text-stone-100 flex items-center gap-2 transition-transform active:scale-95 focus-visible:outline-2 focus-visible:outline-[#22C55E]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Scan Another Item</span>
        </button>

        <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
          <span>
            Category:{' '}
            <strong className="text-stone-900 dark:text-white uppercase">
              {result.category}
            </strong>
          </span>
          {isDemo && (
            <>
              <span aria-hidden="true">·</span>
              <span className="font-mono font-bold text-[#0F1A14] bg-[#FFD84D] px-2.5 py-1 rounded-xl">
                Demo data
              </span>
            </>
          )}
        </div>
      </div>

      {/* PRIORITY 1: UNMISSABLE RED/CORAL SAFETY BANNER FOR LITHIUM-ION BATTERIES & HAZARDS */}
      {isBatteryOrHazardous && (
        <section
          role="alert"
          aria-labelledby="critical-safety-heading"
          className="bg-[#FF6B5E]/15 dark:bg-[#3B1216] border-2 border-[#FF6B5E] rounded-[28px] p-6 sm:p-7 text-stone-950 dark:text-white space-y-3 shadow-md"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-[20px] bg-[#FF6B5E] text-[#0F1A14] flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
              <ShieldAlert className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div className="space-y-2">
              <div className="text-xs font-mono font-black uppercase tracking-wider text-red-700 dark:text-[#FF6B5E]">
                🚨 Safety First · High-Priority Lithium-Ion / Hazardous Warning
              </div>
              <h2
                id="critical-safety-heading"
                className="text-lg sm:text-xl font-display font-black text-red-950 dark:text-white"
              >
                Do Not Puncture, Crush, Open, Dismantle, or Charge Damaged Batteries or Electronics
              </h2>
              <p className="text-sm text-red-950 dark:text-red-100 leading-relaxed">
                <strong>Immediate Precaution:</strong> Never puncture, crush, open, bend, or charge
                a suspect or end-of-life battery.{' '}
                <strong>
                  If this item is hot, swollen, smoking, hissing, or leaking, keep it away from all
                  flammable materials (place on concrete, ceramic, or sand in a ventilated area) and
                  seek professional hazardous waste guidance immediately.
                </strong>{' '}
                Never attempt to dismantle hazardous electronics, power supplies, or batteries
                yourself.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* STACKED VERDICT HERO CARD (With Big Emoji, Bold Color-Coded Verdict Badge & Quick Actions) */}
      <section
        className={`bg-gradient-to-br ${verdictTheme.cardGradient} border-2 ${verdictTheme.cardBorder} rounded-[28px] p-6 sm:p-8 text-white space-y-6 shadow-lg`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-[24px] bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-4xl sm:text-5xl shrink-0 shadow-inner">
              <span role="img" aria-label={result.category}>
                {itemEmoji}
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`px-3 py-1 rounded-xl text-xs font-mono font-black uppercase tracking-wider ${verdictTheme.badgeClasses}`}
                >
                  VERDICT: {verdictTheme.label}
                </span>
                {isDemo && (
                  <span className="px-2.5 py-1 rounded-xl text-xs font-mono font-bold bg-[#FFD84D] text-[#0F1A14]">
                    Demo data
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl font-display font-black tracking-tight text-white">
                {result.itemName}
              </h1>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleSaveClick}
              className={`min-h-[44px] px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-display font-bold flex items-center gap-2 border transition-transform active:scale-95 ${
                isSaved
                  ? 'bg-[#C6F432] border-[#C6F432] text-[#0F1A14]'
                  : 'bg-white/10 hover:bg-white/20 border-white/20 text-white'
              }`}
            >
              <Bookmark className="w-4 h-4" />
              <span>{isSaved ? 'Saved' : 'Save Scan'}</span>
            </button>

            <button
              type="button"
              onClick={onOpenDisposeOptions}
              className="min-h-[44px] px-4 py-2.5 rounded-2xl bg-[#22C55E] hover:bg-[#10B981] text-[#0F1A14] text-xs sm:text-sm font-display font-extrabold flex items-center gap-2 transition-transform active:scale-95"
            >
              <MapPin className="w-4 h-4 stroke-[2.5]" />
              <span>Find Where to Dispose</span>
            </button>

            <button
              type="button"
              onClick={handleShare}
              className="min-h-[44px] px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs sm:text-sm font-display font-bold flex items-center gap-2 transition-transform active:scale-95"
            >
              <Share2 className="w-4 h-4" />
              <span>Share</span>
            </button>
          </div>
        </div>

        {(saveFeedback || shareFeedback) && (
          <div className="text-xs font-bold text-[#0F1A14] bg-[#C6F432] rounded-2xl px-4 py-2.5">
            {saveFeedback || shareFeedback}
          </div>
        )}

        {/* Prominent Best Use Callout */}
        <div className="p-5 sm:p-6 rounded-[24px] bg-white/10 backdrop-blur-md border border-white/15 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-[#C6F432]">
            <span>✨ SINGLE BEST NEXT MOVE</span>
            {impactEstimate.status === 'calculated' &&
              impactEstimate.estimatedSavingsKgCO2e !== null && (
                <span>
                  Nice! That&apos;s ~{impactEstimate.estimatedSavingsKgCO2e} kg CO2e potentially
                  saved
                </span>
              )}
          </div>
          <h2 className="text-xl sm:text-2xl font-display font-black text-white">
            {result.bestUse.headline}
          </h2>
          <p className="text-sm sm:text-base text-emerald-100 leading-relaxed">
            {result.bestUse.why}
          </p>
        </div>

        {/* Mark Action Done (Triggers Confetti + EcoPoints) */}
        <div className="pt-3 border-t border-white/15 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-0.5">
            <div className="text-sm font-display font-extrabold text-white">
              Did you actually do it? Lock in your EcoPoints ⚡
            </div>
            <p className="text-xs text-emerald-200/80">
              Points only count when you confirm a completed action.
            </p>
          </div>

          {completedActionType ? (
            <div className="px-4 py-2.5 rounded-2xl bg-[#C6F432] text-[#0F1A14] text-xs sm:text-sm font-display font-black flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
              <span>
                Completed: {completedActionType.replace('_', ' ').toUpperCase()}
              </span>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2.5">
              <select
                aria-label="Select completed action"
                value={selectedActionToComplete}
                onChange={(e) =>
                  setSelectedActionToComplete(
                    e.target.value as 'repair' | 'reuse' | 'recycle' | 'special_disposal'
                  )
                }
                className="min-h-[44px] px-3.5 py-2 rounded-2xl border border-white/25 bg-black/40 text-xs sm:text-sm font-bold text-white"
              >
                <option value="repair">{actionLabels.repair}</option>
                <option value="reuse">{actionLabels.reuse}</option>
                <option value="recycle">{actionLabels.recycle}</option>
                <option value="special_disposal">{actionLabels.special_disposal}</option>
              </select>

              <button
                type="button"
                onClick={() => onMarkActionCompleted(selectedActionToComplete)}
                className="min-h-[44px] px-5 py-2.5 rounded-2xl bg-[#C6F432] hover:bg-[#b5e422] text-[#0F1A14] text-xs sm:text-sm font-display font-black flex items-center gap-2 transition-transform active:scale-95 whitespace-nowrap shrink-0 shadow-md"
              >
                <Sparkles className="w-4 h-4" />
                <span>Mark Action Done</span>
              </button>
            </div>
          )}
        </div>
      </section>

      {/* =====================================================================
          NEW SECTION: "WHAT DO YOU WANT TO DO?" (THREE EQUAL-SIZED TAPPABLE CARDS)
         ===================================================================== */}
      <section
        aria-labelledby="what-to-do-heading"
        className="bg-white dark:bg-[#14241B] border border-stone-200/90 dark:border-emerald-900/70 rounded-[28px] p-6 sm:p-7 space-y-5 shadow-xs"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="text-xs font-mono font-bold uppercase tracking-wider text-[#10B981] dark:text-[#C6F432]">
              🎯 Interactive Action Pathways
            </div>
            <h2
              id="what-to-do-heading"
              className="text-xl sm:text-2xl font-display font-black text-stone-950 dark:text-white"
            >
              What do you want to do?
            </h2>
          </div>
          <span className="text-xs text-stone-500 dark:text-stone-400">
            Tap any card to open instructions &amp; mark as done
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
          {/* OPTION CARD 1: RECYCLE */}
          {(() => {
            const isBest = bestOptionChoice === 'recycle';
            const isCompleted = isOptionCompleted('recycle');
            const isMuted = isStrictlyHazardousItem;

            return (
              <button
                type="button"
                onClick={() => setActiveOptionSheet('recycle')}
                className={`min-h-[148px] p-5 rounded-[24px] border-2 text-left flex flex-col justify-between gap-4 transition-all duration-200 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#22C55E] ${
                  isBest
                    ? 'bg-[#22C55E]/10 dark:bg-[#22C55E]/15 border-[#22C55E] shadow-sm'
                    : isMuted
                    ? 'bg-stone-100/70 dark:bg-[#0F1A14]/40 border-stone-200/80 dark:border-emerald-950 opacity-75 hover:opacity-100'
                    : 'bg-[#F7F8F5] dark:bg-[#0F1A14]/70 border-stone-200/90 dark:border-emerald-800/80 hover:border-[#22C55E]'
                }`}
              >
                <div className="flex items-start justify-between gap-2 w-full">
                  <div className="w-12 h-12 rounded-2xl bg-[#22C55E]/20 text-[#10B981] dark:text-[#22C55E] flex items-center justify-center shrink-0">
                    <Recycle className="w-6 h-6 stroke-[2.2]" />
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-1.5">
                    {isBest && (
                      <span className="px-2.5 py-1 rounded-xl bg-[#22C55E] text-[#0F1A14] font-mono text-[11px] font-black uppercase tracking-wider">
                        Best choice
                      </span>
                    )}
                    {isCompleted && (
                      <span
                        title="Completed"
                        className="px-2.5 py-1 rounded-xl bg-[#C6F432] text-[#0F1A14] font-mono text-[11px] font-black flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>Done</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-lg font-display font-extrabold text-stone-950 dark:text-white flex items-center justify-between gap-2">
                    <span>Recycle</span>
                    <ArrowRight className="w-4 h-4 text-stone-400 shrink-0" />
                  </div>
                  <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-snug">
                    Recycle: find the right stream
                  </p>
                </div>
              </button>
            );
          })()}

          {/* OPTION CARD 2: REUSE IDEA */}
          {(() => {
            const isBest = bestOptionChoice === 'reuse';
            const isCompleted = isOptionCompleted('reuse');
            const isMuted = isStrictlyHazardousItem;

            return (
              <button
                type="button"
                onClick={() => setActiveOptionSheet('reuse')}
                className={`min-h-[148px] p-5 rounded-[24px] border-2 text-left flex flex-col justify-between gap-4 transition-all duration-200 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C6F432] ${
                  isBest
                    ? 'bg-[#C6F432]/20 dark:bg-[#C6F432]/15 border-[#10B981] dark:border-[#C6F432] shadow-sm'
                    : isMuted
                    ? 'bg-stone-100/70 dark:bg-[#0F1A14]/40 border-stone-200/80 dark:border-emerald-950 opacity-75 hover:opacity-100'
                    : 'bg-[#F7F8F5] dark:bg-[#0F1A14]/70 border-stone-200/90 dark:border-emerald-800/80 hover:border-[#FFD84D]'
                }`}
              >
                <div className="flex items-start justify-between gap-2 w-full">
                  <div className="w-12 h-12 rounded-2xl bg-[#FFD84D]/30 dark:bg-[#C6F432]/20 text-amber-800 dark:text-[#C6F432] flex items-center justify-center shrink-0">
                    <Lightbulb className="w-6 h-6 stroke-[2.2]" />
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-1.5">
                    {isBest && (
                      <span className="px-2.5 py-1 rounded-xl bg-[#FFD84D] text-[#0F1A14] font-mono text-[11px] font-black uppercase tracking-wider">
                        Best choice
                      </span>
                    )}
                    {isCompleted && (
                      <span
                        title="Completed"
                        className="px-2.5 py-1 rounded-xl bg-[#C6F432] text-[#0F1A14] font-mono text-[11px] font-black flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>Done</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-lg font-display font-extrabold text-stone-950 dark:text-white flex items-center justify-between gap-2">
                    <span>Reuse Idea</span>
                    <ArrowRight className="w-4 h-4 text-stone-400 shrink-0" />
                  </div>
                  <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-snug">
                    {unsafeToReuse
                      ? 'Not safe to reuse — tap for details'
                      : 'Reuse: give it a second life'}
                  </p>
                </div>
              </button>
            );
          })()}

          {/* OPTION CARD 3: DISPOSAL */}
          {(() => {
            const isBest = bestOptionChoice === 'disposal';
            const isCompleted = isOptionCompleted('disposal');
            const DisposalIcon = isStrictlyHazardousItem ? ShieldAlert : Trash2;

            return (
              <button
                type="button"
                onClick={() => setActiveOptionSheet('disposal')}
                className={`min-h-[148px] p-5 rounded-[24px] border-2 text-left flex flex-col justify-between gap-4 transition-all duration-200 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF6B5E] ${
                  isBest
                    ? 'bg-[#FF6B5E]/15 dark:bg-[#FF6B5E]/20 border-[#FF6B5E] shadow-sm'
                    : 'bg-[#F7F8F5] dark:bg-[#0F1A14]/70 border-stone-200/90 dark:border-emerald-800/80 hover:border-[#FF6B5E]'
                }`}
              >
                <div className="flex items-start justify-between gap-2 w-full">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                      isStrictlyHazardousItem
                        ? 'bg-[#FF6B5E] text-[#0F1A14]'
                        : 'bg-stone-200 dark:bg-emerald-950 text-stone-700 dark:text-stone-300'
                    }`}
                  >
                    <DisposalIcon className="w-6 h-6 stroke-[2.2]" />
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-1.5">
                    {isBest && (
                      <span className="px-2.5 py-1 rounded-xl bg-[#FF6B5E] text-[#0F1A14] font-mono text-[11px] font-black uppercase tracking-wider">
                        Best choice
                      </span>
                    )}
                    {isCompleted && (
                      <span
                        title="Completed"
                        className="px-2.5 py-1 rounded-xl bg-[#C6F432] text-[#0F1A14] font-mono text-[11px] font-black flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>Done</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-lg font-display font-extrabold text-stone-950 dark:text-white flex items-center justify-between gap-2">
                    <span>Disposal</span>
                    <ArrowRight className="w-4 h-4 text-stone-400 shrink-0" />
                  </div>
                  <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-snug">
                    Dispose: do it safely
                  </p>
                </div>
              </button>
            );
          })()}
        </div>
      </section>

      {/* =====================================================================
          RESPONSIVE BOTTOM SHEET (MOBILE) & SIDE PANEL / MODAL (DESKTOP)
         ===================================================================== */}
      {activeOptionSheet && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="option-sheet-title"
          className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-end md:items-stretch md:justify-end"
          onClick={() => setActiveOptionSheet(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full md:max-w-xl bg-[#F7F8F5] dark:bg-[#13221A] border-t md:border-t-0 md:border-l border-stone-200 dark:border-emerald-800 rounded-t-[28px] md:rounded-none md:rounded-l-[28px] max-h-[90vh] md:max-h-screen md:h-full flex flex-col justify-between overflow-hidden shadow-2xl transition-transform duration-200"
          >
            {/* Mobile Drag Handle Pill + Sticky Header */}
            <div className="p-5 sm:p-6 bg-white dark:bg-[#14241B] border-b border-stone-200/80 dark:border-emerald-900/70 shrink-0 space-y-2">
              <div className="w-12 h-1.5 rounded-full bg-stone-300 dark:bg-emerald-800 mx-auto md:hidden mb-2" />
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {activeOptionSheet === 'recycle' && (
                    <div className="w-11 h-11 rounded-2xl bg-[#22C55E]/20 text-[#10B981] dark:text-[#22C55E] flex items-center justify-center shrink-0">
                      <Recycle className="w-6 h-6" />
                    </div>
                  )}
                  {activeOptionSheet === 'reuse' && (
                    <div className="w-11 h-11 rounded-2xl bg-[#FFD84D]/30 text-amber-800 dark:text-[#C6F432] flex items-center justify-center shrink-0">
                      <Lightbulb className="w-6 h-6" />
                    </div>
                  )}
                  {activeOptionSheet === 'disposal' && (
                    <div className="w-11 h-11 rounded-2xl bg-[#FF6B5E]/25 text-[#FF6B5E] flex items-center justify-center shrink-0">
                      <ShieldAlert className="w-6 h-6" />
                    </div>
                  )}

                  <div>
                    <div className="flex items-center gap-2">
                      <h3
                        id="option-sheet-title"
                        className="text-lg sm:text-xl font-display font-black text-stone-950 dark:text-white"
                      >
                        {activeOptionSheet === 'recycle'
                          ? 'Recycle Guide & Stream'
                          : activeOptionSheet === 'reuse'
                          ? 'Creative Reuse & Repair Ideas'
                          : 'Safe Disposal & Drop-Off'}
                      </h3>
                      {bestOptionChoice === activeOptionSheet && (
                        <span className="px-2 py-0.5 rounded-lg bg-[#C6F432] text-[#0F1A14] font-mono text-[10px] font-black uppercase">
                          Best choice
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-stone-500 dark:text-stone-400 truncate max-w-xs sm:max-w-sm">
                      {result.itemName}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveOptionSheet(null)}
                  className="min-h-[44px] min-w-[44px] px-3 rounded-2xl bg-stone-100 dark:bg-emerald-950 hover:bg-stone-200 dark:hover:bg-emerald-900 text-stone-700 dark:text-stone-200 flex items-center justify-center gap-1 text-xs font-bold focus-visible:outline-2 focus-visible:outline-[#22C55E]"
                  aria-label="Close panel"
                >
                  <X className="w-4 h-4" />
                  <span>Close</span>
                </button>
              </div>
            </div>

            {/* Scrollable Body Content */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
              {/* ===============================================================
                  PANEL 1: RECYCLE
                 =============================================================== */}
              {activeOptionSheet === 'recycle' && (
                <>
                  {isStrictlyHazardousItem && (
                    <div
                      role="alert"
                      className="p-4 rounded-[22px] bg-[#FF6B5E]/15 border-2 border-[#FF6B5E] text-stone-950 dark:text-white text-xs space-y-2"
                    >
                      <div className="font-display font-black text-sm text-red-800 dark:text-[#FF6B5E] flex items-center gap-1.5">
                        <ShieldAlert className="w-4 h-4 shrink-0" />
                        <span>Do Not Place in Curbside Recycling Bins</span>
                      </div>
                      <p className="leading-relaxed">
                        Batteries and hazardous electronics can cause fires in collection trucks and
                        sorting plants. Route this item only through specialized e-waste/battery
                        drop-off points.
                      </p>
                    </div>
                  )}

                  {/* Recyclability Score & Explanation */}
                  <div className="p-5 rounded-[24px] bg-white dark:bg-[#14241B] border border-stone-200/90 dark:border-emerald-900/70 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono font-bold uppercase text-[#10B981] dark:text-[#C6F432]">
                        Is It Recyclable?
                      </span>
                      <span className="font-mono text-stone-500 dark:text-stone-400">
                        AI Estimate · Not an Official Rating
                      </span>
                    </div>

                    {result.recyclability.score !== null ? (
                      <div className="space-y-2">
                        <div className="flex items-baseline justify-between">
                          <span className="text-3xl font-mono font-black tabular-nums text-[#10B981] dark:text-[#22C55E]">
                            {result.recyclability.score}/100
                          </span>
                          <span className="text-xs font-bold text-stone-700 dark:text-stone-200">
                            {result.recyclability.score >= 70
                              ? 'Widely Recyclable (When Clean)'
                              : result.recyclability.score >= 40
                              ? 'Specialized Recovery Required'
                              : 'Low Curbside Recyclability'}
                          </span>
                        </div>
                        <div className="w-full h-3 bg-stone-100 dark:bg-emerald-950 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#22C55E] rounded-full"
                            style={{ width: `${result.recyclability.score}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm font-bold text-stone-800 dark:text-white">
                        Score: Uncertain (Null) — Material separation required
                      </div>
                    )}

                    <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
                      {result.recyclability.explanation}
                    </p>
                  </div>

                  {/* Which Bin or Stream It Belongs To */}
                  <div className="p-5 rounded-[24px] bg-white dark:bg-[#14241B] border border-stone-200/90 dark:border-emerald-900/70 space-y-2">
                    <div className="text-xs font-mono font-bold uppercase text-[#10B981] dark:text-[#C6F432]">
                      🗑️ Target Bin / Recovery Stream
                    </div>
                    <div className="text-base font-display font-extrabold text-stone-950 dark:text-white">
                      {streamInfo.streamName}
                    </div>
                    <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
                      {streamInfo.binDescription}
                    </p>
                  </div>

                  {/* Preparation Steps */}
                  <div className="p-5 rounded-[24px] bg-white dark:bg-[#14241B] border border-stone-200/90 dark:border-emerald-900/70 space-y-3">
                    <div className="text-xs font-mono font-bold uppercase text-[#10B981] dark:text-[#C6F432]">
                      🧼 Preparation Steps (Rinse, Separate &amp; Prep)
                    </div>
                    <ol className="list-decimal pl-5 space-y-2 text-xs sm:text-sm text-stone-700 dark:text-stone-200 leading-relaxed">
                      {recyclePrepSteps.map((step, i) => (
                        <li key={i}>{step}</li>
                      ))}
                    </ol>
                  </div>

                  {/* Find Recycling Centers Near Me Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveOptionSheet(null);
                      onOpenRecyclingMap();
                    }}
                    className="w-full min-h-[48px] px-5 py-3 rounded-2xl bg-stone-900 dark:bg-emerald-950 hover:bg-stone-800 border border-stone-800 dark:border-emerald-700 text-white font-display font-extrabold text-sm flex items-center justify-center gap-2.5 transition-transform active:scale-95"
                  >
                    <MapPin className="w-4 h-4 text-[#C6F432]" />
                    <span>Find recycling centers near me</span>
                  </button>
                </>
              )}

              {/* ===============================================================
                  PANEL 2: REUSE IDEA
                 =============================================================== */}
              {activeOptionSheet === 'reuse' && (
                <>
                  {unsafeToReuse ? (
                    <div
                      role="alert"
                      className="p-6 rounded-[24px] bg-[#FF6B5E]/15 dark:bg-[#3B1216] border-2 border-[#FF6B5E] text-stone-950 dark:text-white space-y-4"
                    >
                      <div className="flex items-start gap-3.5">
                        <div className="w-11 h-11 rounded-2xl bg-[#FF6B5E] text-[#0F1A14] flex items-center justify-center shrink-0">
                          <ShieldAlert className="w-6 h-6 stroke-[2.5]" />
                        </div>
                        <div className="space-y-1.5">
                          <div className="text-xs font-mono font-black uppercase text-red-700 dark:text-[#FF6B5E]">
                            Safety Lock · Reuse Disabled
                          </div>
                          <h4 className="text-lg font-display font-black text-red-950 dark:text-white">
                            Not safe to reuse. Please use safe disposal instead.
                          </h4>
                          <p className="text-xs sm:text-sm text-red-900 dark:text-red-100 leading-relaxed">
                            For batteries, damaged electronics, chemicals, and medicines, DIY reuse
                            or dismantling carries fire, shock, or toxic exposure risks. The reuse
                            idea list is disabled for your safety.
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setActiveOptionSheet('disposal')}
                        className="w-full min-h-[46px] px-5 py-2.5 rounded-2xl bg-[#FF6B5E] hover:bg-red-500 text-[#0F1A14] font-display font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-transform active:scale-95"
                      >
                        <ShieldAlert className="w-4 h-4" />
                        <span>Switch to Safe Disposal Instructions</span>
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-3">
                        {displayReuseIdeas.map((ideaItem, idx) => {
                          const stepsList =
                            ideaItem.steps && ideaItem.steps.length > 0
                              ? ideaItem.steps
                              : getDefaultStepsForIdea(ideaItem.idea, result.category);

                          const diffBadgeClass =
                            ideaItem.difficulty === 'easy'
                              ? 'bg-[#22C55E]/20 text-emerald-900 dark:text-[#C6F432]'
                              : ideaItem.difficulty === 'medium'
                              ? 'bg-[#FFD84D]/30 text-amber-900 dark:text-[#FFD84D]'
                              : 'bg-[#FF6B5E]/20 text-red-900 dark:text-[#FF6B5E]';

                          return (
                            <div
                              key={idx}
                              className="p-5 rounded-[24px] bg-white dark:bg-[#14241B] border border-stone-200/90 dark:border-emerald-900/70 space-y-3"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                                <span
                                  className={`px-2.5 py-0.5 rounded-lg font-bold uppercase ${diffBadgeClass}`}
                                >
                                  Difficulty: {ideaItem.difficulty}
                                </span>
                                <span className="text-stone-500 dark:text-stone-400 font-bold">
                                  ⏱️ Est. Time: {ideaItem.estimatedTime}
                                </span>
                              </div>

                              <h4 className="text-base font-display font-extrabold text-stone-950 dark:text-white">
                                {idx + 1}. {ideaItem.idea}
                              </h4>

                              <div className="space-y-1.5 pt-1 border-t border-stone-200/60 dark:border-emerald-900/50">
                                <div className="text-[11px] font-mono uppercase text-stone-500 dark:text-stone-400 font-bold">
                                  Step-by-Step Instructions:
                                </div>
                                <ol className="list-decimal pl-5 space-y-1 text-xs sm:text-sm text-stone-700 dark:text-stone-200 leading-relaxed">
                                  {stepsList.map((st, sIdx) => (
                                    <li key={sIdx}>{st}</li>
                                  ))}
                                </ol>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {ideaError && (
                        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 text-xs text-amber-950 dark:text-[#FFD84D] space-y-2">
                          <p className="font-bold">{ideaError}</p>
                          <button
                            type="button"
                            onClick={handleAddDemoReuseIdea}
                            className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-[#FFD84D] text-[#0F1A14] font-extrabold text-xs"
                          >
                            + Add Sample Reuse Idea (Demo)
                          </button>
                        </div>
                      )}

                      {/* Generate Another Idea Button */}
                      <button
                        type="button"
                        onClick={handleGenerateMoreReuseIdea}
                        disabled={generatingIdea}
                        className="w-full min-h-[48px] px-5 py-3 rounded-2xl bg-white dark:bg-[#14241B] hover:bg-stone-100 dark:hover:bg-emerald-950 border-2 border-[#10B981] dark:border-[#C6F432] text-stone-950 dark:text-white font-display font-extrabold text-sm flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-60"
                      >
                        {generatingIdea ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin text-[#10B981]" />
                            <span>Asking Gemini for another safe idea...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 text-[#10B981] dark:text-[#C6F432]" />
                            <span>Generate another idea</span>
                          </>
                        )}
                      </button>
                    </>
                  )}
                </>
              )}

              {/* ===============================================================
                  PANEL 3: DISPOSAL
                 =============================================================== */}
              {activeOptionSheet === 'disposal' && (
                <>
                  {/* Red Hazard Banner if Hazardous */}
                  {(isBatteryOrHazardous || result.hazards.length > 0) && (
                    <div
                      role="alert"
                      className="p-5 rounded-[24px] bg-[#FF6B5E]/15 dark:bg-[#3B1216] border-2 border-[#FF6B5E] text-stone-950 dark:text-white space-y-2.5"
                    >
                      <div className="flex items-center gap-2 text-xs font-mono font-black uppercase text-red-700 dark:text-[#FF6B5E]">
                        <ShieldAlert className="w-4 h-4 shrink-0" />
                        <span>🚨 Hazard Warning · Safety First</span>
                      </div>
                      {isBatteryOrHazardous && (
                        <p className="text-xs sm:text-sm font-bold text-red-950 dark:text-white leading-relaxed">
                          Do NOT puncture, crush, open, or charge. If hot, swollen, smoking, or
                          leaking, keep away from flammable materials on sand/concrete and seek
                          professional hazardous waste guidance.
                        </p>
                      )}
                      {result.hazards.map((h, i) => (
                        <div
                          key={i}
                          className="text-xs pt-2 border-t border-[#FF6B5E]/30 space-y-0.5"
                        >
                          <div className="font-bold">
                            {h.hazard} ({h.severity.toUpperCase()})
                          </div>
                          <div className="opacity-90">{h.precaution}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Safe Disposal Instructions for This Specific Item */}
                  <div className="p-5 rounded-[24px] bg-white dark:bg-[#14241B] border border-stone-200/90 dark:border-emerald-900/70 space-y-3">
                    <div className="text-xs font-mono font-bold uppercase text-[#10B981] dark:text-[#C6F432]">
                      🛡️ Safe Disposal Instructions for {result.itemName}
                    </div>
                    <ol className="list-decimal pl-5 space-y-2 text-xs sm:text-sm text-stone-700 dark:text-stone-200 leading-relaxed">
                      {safeDisposalSteps.map((step, idx) => (
                        <li key={idx}>{step}</li>
                      ))}
                    </ol>
                  </div>

                  {/* Three Sub-Options Selector: Request Pickup | Drop-off Locations | Official Channels */}
                  <div className="space-y-3">
                    <div className="text-xs font-mono font-bold uppercase text-stone-500 dark:text-stone-400">
                      Choose a Disposal Channel:
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setDisposalSubTab('pickup')}
                        className={`min-h-[44px] px-3 py-2 rounded-2xl text-xs font-display font-bold flex flex-col items-center justify-center gap-1 border transition-transform active:scale-95 ${
                          disposalSubTab === 'pickup'
                            ? 'bg-[#22C55E] text-[#0F1A14] border-[#22C55E]'
                            : 'bg-white dark:bg-[#14241B] text-stone-700 dark:text-stone-200 border-stone-200 dark:border-emerald-800'
                        }`}
                      >
                        <Truck className="w-4 h-4" />
                        <span>1. Request Pickup</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setDisposalSubTab('dropoff')}
                        className={`min-h-[44px] px-3 py-2 rounded-2xl text-xs font-display font-bold flex flex-col items-center justify-center gap-1 border transition-transform active:scale-95 ${
                          disposalSubTab === 'dropoff'
                            ? 'bg-[#22C55E] text-[#0F1A14] border-[#22C55E]'
                            : 'bg-white dark:bg-[#14241B] text-stone-700 dark:text-stone-200 border-stone-200 dark:border-emerald-800'
                        }`}
                      >
                        <MapPin className="w-4 h-4" />
                        <span>2. Drop-off Map</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setDisposalSubTab('official')}
                        className={`min-h-[44px] px-3 py-2 rounded-2xl text-xs font-display font-bold flex flex-col items-center justify-center gap-1 border transition-transform active:scale-95 ${
                          disposalSubTab === 'official'
                            ? 'bg-[#22C55E] text-[#0F1A14] border-[#22C55E]'
                            : 'bg-white dark:bg-[#14241B] text-stone-700 dark:text-stone-200 border-stone-200 dark:border-emerald-800'
                        }`}
                      >
                        <Landmark className="w-4 h-4" />
                        <span>3. Official Channels</span>
                      </button>
                    </div>

                    {/* SUB-OPTION 1: REQUEST PICKUP (SIMULATED, LABELED AS DEMO) */}
                    {disposalSubTab === 'pickup' && (
                      <div className="p-5 rounded-[24px] bg-white dark:bg-[#14241B] border border-stone-200/90 dark:border-emerald-900/70 space-y-4">
                        <div className="p-3.5 rounded-2xl bg-[#FFD84D]/25 border border-amber-400 text-xs text-stone-950 dark:text-white flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-amber-700 dark:text-[#FFD84D] shrink-0 mt-0.5" />
                          <span>
                            <strong>Demo: no pickup is scheduled automatically.</strong> Saves a
                            simulated pickup in your browser and generates a prefilled collector
                            message you can copy or send via WhatsApp/Email.
                          </span>
                        </div>

                        <form onSubmit={handleCreateInlinePickupRequest} className="space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-bold text-stone-700 dark:text-stone-200 mb-1">
                                Your Name (Optional)
                              </label>
                              <input
                                type="text"
                                maxLength={60}
                                value={pkName}
                                onChange={(e) => setPkName(e.target.value)}
                                placeholder="e.g., Priya"
                                className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-stone-300 dark:border-emerald-800 bg-[#F7F8F5] dark:bg-[#0F1A14] text-xs text-stone-900 dark:text-white"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-stone-700 dark:text-stone-200 mb-1">
                                Locality / Area *
                              </label>
                              <input
                                type="text"
                                required
                                maxLength={100}
                                value={pkLocality}
                                onChange={(e) => setPkLocality(e.target.value)}
                                placeholder="e.g., Indiranagar Ward 80"
                                className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-stone-300 dark:border-emerald-800 bg-[#F7F8F5] dark:bg-[#0F1A14] text-xs text-stone-900 dark:text-white"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-bold text-stone-700 dark:text-stone-200 mb-1">
                                Item *
                              </label>
                              <input
                                type="text"
                                required
                                maxLength={120}
                                value={pkItemDesc}
                                onChange={(e) => setPkItemDesc(e.target.value)}
                                className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-stone-300 dark:border-emerald-800 bg-[#F7F8F5] dark:bg-[#0F1A14] text-xs text-stone-900 dark:text-white"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-stone-700 dark:text-stone-200 mb-1">
                                Preferred Time
                              </label>
                              <input
                                type="text"
                                maxLength={80}
                                value={pkTime}
                                onChange={(e) => setPkTime(e.target.value)}
                                className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-stone-300 dark:border-emerald-800 bg-[#F7F8F5] dark:bg-[#0F1A14] text-xs text-stone-900 dark:text-white"
                              />
                            </div>
                          </div>

                          {pkError && <p className="text-xs text-[#FF6B5E] font-bold">{pkError}</p>}

                          <button
                            type="submit"
                            className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-stone-900 dark:bg-[#C6F432] text-white dark:text-[#0F1A14] text-xs font-display font-extrabold transition-transform active:scale-95"
                          >
                            Prepare Simulated Pickup Message
                          </button>
                        </form>

                        {latestPickup && (
                          <div className="pt-3 border-t border-stone-200 dark:border-emerald-900/60 space-y-2.5">
                            <pre className="p-3 rounded-xl bg-[#F7F8F5] dark:bg-[#0F1A14] border border-stone-200 dark:border-emerald-800 text-[11px] font-mono whitespace-pre-wrap text-stone-800 dark:text-stone-200">
                              {prefilledCollectorMessage}
                            </pre>
                            {copyMsgFeedback && (
                              <div className="text-xs font-bold text-[#10B981] dark:text-[#C6F432]">
                                {copyMsgFeedback}
                              </div>
                            )}
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={handleCopyInlineMessage}
                                className="min-h-[40px] px-3 py-1.5 rounded-xl bg-stone-200 dark:bg-emerald-950 text-stone-900 dark:text-white text-xs font-bold flex items-center gap-1.5"
                              >
                                <Copy className="w-3.5 h-3.5" />
                                <span>Copy</span>
                              </button>
                              <a
                                href={`https://wa.me/?text=${encodeURIComponent(
                                  prefilledCollectorMessage
                                )}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="min-h-[40px] px-3 py-1.5 rounded-xl bg-[#22C55E] text-[#0F1A14] text-xs font-extrabold flex items-center gap-1.5"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                                <span>WhatsApp</span>
                              </a>
                              <a
                                href={`mailto:?subject=${encodeURIComponent(
                                  `Waste Collection Request - ${latestPickup.locality}`
                                )}&body=${encodeURIComponent(prefilledCollectorMessage)}`}
                                className="min-h-[40px] px-3 py-1.5 rounded-xl bg-stone-200 dark:bg-emerald-950 text-stone-900 dark:text-white text-xs font-bold flex items-center gap-1.5"
                              >
                                <Mail className="w-3.5 h-3.5" />
                                <span>Email</span>
                              </a>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* SUB-OPTION 2: DROP-OFF LOCATIONS (OPENS THE MAP) */}
                    {disposalSubTab === 'dropoff' && (
                      <div className="p-5 rounded-[24px] bg-white dark:bg-[#14241B] border border-stone-200/90 dark:border-emerald-900/70 space-y-3">
                        <div className="text-sm font-display font-extrabold text-stone-950 dark:text-white">
                          Find Nearby E-Waste &amp; Recycling Drop-Off Points
                        </div>
                        <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                          Query OpenStreetMap Overpass for verified drop-off centers and scrap
                          recovery points near your location or typed city.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveOptionSheet(null);
                            onOpenRecyclingMap();
                          }}
                          className="w-full min-h-[48px] px-5 py-3 rounded-2xl bg-[#22C55E] hover:bg-[#10B981] text-[#0F1A14] font-display font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 transition-transform active:scale-95"
                        >
                          <MapPin className="w-4 h-4 stroke-[2.5]" />
                          <span>Open Drop-Off Locations Map</span>
                        </button>
                      </div>
                    )}

                    {/* SUB-OPTION 3: OFFICIAL / GOVERNMENT CHANNELS (CONFIGURABLE LIST) */}
                    {disposalSubTab === 'official' && (
                      <div className="p-5 rounded-[24px] bg-white dark:bg-[#14241B] border border-stone-200/90 dark:border-emerald-900/70 space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-display font-extrabold text-stone-950 dark:text-white">
                            Official &amp; OEM Take-Back Channels
                          </span>
                          <button
                            type="button"
                            onClick={() => setIsEditingChannels(!isEditingChannels)}
                            className="min-h-[36px] px-3 py-1 rounded-xl bg-stone-100 dark:bg-emerald-950 text-xs font-bold flex items-center gap-1"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>{isEditingChannels ? 'Done' : 'Customize'}</span>
                          </button>
                        </div>

                        <div className="space-y-2.5">
                          {officialChannels.map((ch) => (
                            <div
                              key={ch.id}
                              className="p-3.5 rounded-2xl bg-[#F7F8F5] dark:bg-[#0F1A14] border border-stone-200 dark:border-emerald-800 space-y-1 text-xs"
                            >
                              <div className="font-mono font-bold text-[#10B981] dark:text-[#C6F432]">
                                {ch.organizationType}
                                {ch.isPlaceholder ? ' · Configurable Placeholder' : ''}
                              </div>
                              <div className="font-bold text-stone-950 dark:text-white">
                                {ch.title}
                              </div>
                              <p className="text-stone-600 dark:text-stone-300">{ch.description}</p>
                              <div className="font-mono text-[11px] text-stone-500 dark:text-emerald-300">
                                {ch.actionHint}
                              </div>
                            </div>
                          ))}
                        </div>

                        {isEditingChannels && (
                          <form
                            onSubmit={handleAddInlineChannel}
                            className="pt-3 border-t border-stone-200 dark:border-emerald-900/60 space-y-2.5"
                          >
                            <input
                              type="text"
                              required
                              maxLength={100}
                              value={newChTitle}
                              onChange={(e) => setNewChTitle(e.target.value)}
                              placeholder="Channel title (e.g., Ward E-Waste Helpline)"
                              className="w-full min-h-[40px] px-3 py-1.5 rounded-xl border border-stone-300 dark:border-emerald-800 bg-[#F7F8F5] dark:bg-[#0F1A14] text-xs"
                            />
                            <select
                              value={newChOrgType}
                              onChange={(e) =>
                                setNewChOrgType(
                                  e.target.value as OfficialChannelResource['organizationType']
                                )
                              }
                              className="w-full min-h-[40px] px-3 py-1.5 rounded-xl border border-stone-300 dark:border-emerald-800 bg-[#F7F8F5] dark:bg-[#0F1A14] text-xs"
                            >
                              <option value="Municipal">Municipal</option>
                              <option value="Pollution Control Board">
                                Pollution Control Board
                              </option>
                              <option value="National Portal">National Portal</option>
                              <option value="Manufacturer Take-Back">
                                Manufacturer Take-Back
                              </option>
                            </select>
                            <input
                              type="text"
                              required
                              maxLength={180}
                              value={newChDesc}
                              onChange={(e) => setNewChDesc(e.target.value)}
                              placeholder="Short description..."
                              className="w-full min-h-[40px] px-3 py-1.5 rounded-xl border border-stone-300 dark:border-emerald-800 bg-[#F7F8F5] dark:bg-[#0F1A14] text-xs"
                            />
                            <input
                              type="text"
                              maxLength={140}
                              value={newChHint}
                              onChange={(e) => setNewChHint(e.target.value)}
                              placeholder="Verified portal note or placeholder..."
                              className="w-full min-h-[40px] px-3 py-1.5 rounded-xl border border-stone-300 dark:border-emerald-800 bg-[#F7F8F5] dark:bg-[#0F1A14] text-xs"
                            />
                            <button
                              type="submit"
                              className="min-h-[40px] px-4 py-1.5 rounded-xl bg-[#22C55E] text-[#0F1A14] text-xs font-extrabold flex items-center gap-1.5"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Add Channel</span>
                            </button>
                          </form>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Sticky Footer with "Mark as done" Button */}
            <div className="p-5 sm:p-6 bg-white dark:bg-[#14241B] border-t border-stone-200/80 dark:border-emerald-900/70 shrink-0 flex items-center justify-between gap-3">
              {activeOptionSheet === 'reuse' && unsafeToReuse ? (
                <div className="text-xs font-bold text-[#FF6B5E]">
                  Reuse disabled for hazardous items. Use Safe Disposal instead.
                </div>
              ) : isOptionCompleted(activeOptionSheet) ? (
                <div className="w-full min-h-[48px] px-5 py-3 rounded-2xl bg-[#C6F432] text-[#0F1A14] font-display font-black text-sm flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                  <span>
                    Completed! Marked as done in your Dashboard
                  </span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    const actionType =
                      activeOptionSheet === 'recycle'
                        ? 'recycle'
                        : activeOptionSheet === 'reuse'
                        ? 'reuse'
                        : 'special_disposal';
                    onMarkActionCompleted(actionType, activeOptionSheet);
                  }}
                  className="w-full min-h-[48px] px-6 py-3 rounded-2xl bg-[#22C55E] hover:bg-[#10B981] text-[#0F1A14] font-display font-black text-sm sm:text-base flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#22C55E]"
                >
                  <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                  <span>
                    Mark as done (
                    {activeOptionSheet === 'recycle'
                      ? '+25 EcoPoints'
                      : activeOptionSheet === 'reuse'
                      ? '+30 EcoPoints'
                      : '+50 EcoPoints'}
                    )
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SWIPEABLE / STACKED CARD DECK CONTROLS */}
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-stone-200/80 dark:bg-[#14241B] rounded-2xl border border-stone-200 dark:border-emerald-900/70">
            {deckTabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveDeckIndex(t.id)}
                className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-display font-bold transition-all whitespace-nowrap shrink-0 ${
                  activeDeckIndex === t.id
                    ? 'bg-[#22C55E] text-[#0F1A14] shadow-xs'
                    : 'text-stone-600 dark:text-stone-300 hover:text-stone-950 dark:hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-stone-500 dark:text-stone-400">
              Swipe or tap cards ({activeDeckIndex + 1}/{deckTabs.length})
            </span>
            <button
              type="button"
              disabled={activeDeckIndex === 0}
              onClick={() => setActiveDeckIndex((i) => Math.max(0, i - 1))}
              className="min-h-[38px] min-w-[38px] rounded-xl bg-white dark:bg-[#14241B] border border-stone-200 dark:border-emerald-800 flex items-center justify-center disabled:opacity-40"
              aria-label="Previous card"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={activeDeckIndex === deckTabs.length - 1}
              onClick={() => setActiveDeckIndex((i) => Math.min(deckTabs.length - 1, i + 1))}
              className="min-h-[38px] min-w-[38px] rounded-xl bg-white dark:bg-[#14241B] border border-stone-200 dark:border-emerald-800 flex items-center justify-center disabled:opacity-40"
              aria-label="Next card"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* CARD 1: RECYCLABILITY METER & HAZARDS */}
        {activeDeckIndex === 0 && (
          <section className="bg-white dark:bg-[#14241B] border border-stone-200/90 dark:border-emerald-900/70 rounded-[28px] p-6 sm:p-8 space-y-6 shadow-xs">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-6 space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-xl font-display font-extrabold text-stone-950 dark:text-white">
                    Recyclability Meter
                  </h2>
                  <span className="text-xs font-mono text-stone-500 dark:text-stone-400">
                    AI Estimate · Not an Official Rating
                  </span>
                </div>

                {result.recyclability.score !== null ? (
                  <div className="space-y-2.5">
                    <div className="flex items-baseline justify-between">
                      <span className="text-4xl font-mono font-black tabular-nums text-[#10B981] dark:text-[#C6F432]">
                        {result.recyclability.score}
                        <span className="text-base font-normal text-stone-500 dark:text-stone-400">
                          {' '}
                          / 100
                        </span>
                      </span>
                      <span className="text-xs font-semibold text-stone-600 dark:text-stone-300">
                        Approximate Recovery Score
                      </span>
                    </div>
                    <div className="w-full h-3.5 bg-stone-100 dark:bg-emerald-950 rounded-full overflow-hidden border border-stone-200 dark:border-emerald-800 p-0.5">
                      <div
                        className={`h-full rounded-full ${
                          result.recyclability.score >= 70
                            ? 'bg-[#22C55E]'
                            : result.recyclability.score >= 40
                            ? 'bg-[#FFD84D]'
                            : 'bg-[#FF6B5E]'
                        }`}
                        style={{ width: `${result.recyclability.score}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-stone-100 dark:bg-emerald-950 text-stone-700 dark:text-stone-200 text-xs font-medium">
                    Score: <strong>Null / Uncertain</strong> — Cannot estimate a numeric score
                    without confirming material separation.
                  </div>
                )}

                <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
                  {result.recyclability.explanation}
                </p>
              </div>

              <div className="lg:col-span-6 space-y-3">
                <h3 className="text-base font-display font-extrabold text-stone-950 dark:text-white flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-[#FF6B5E]" />
                  <span>Hazard &amp; Handling Check</span>
                </h3>

                {result.hazards.length === 0 ? (
                  <p className="text-xs text-stone-600 dark:text-stone-300">
                    No severe chemical or thermal hazards flagged for normal household handling.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {result.hazards.map((h, i) => (
                      <div
                        key={i}
                        className={`p-4 rounded-[20px] border text-xs space-y-1 ${
                          h.severity === 'high'
                            ? 'bg-[#FF6B5E]/15 border-[#FF6B5E] text-stone-950 dark:text-white'
                            : h.severity === 'medium'
                            ? 'bg-[#FFD84D]/20 border-amber-400 text-stone-950 dark:text-white'
                            : 'bg-stone-50 dark:bg-emerald-950/60 border-stone-200 dark:border-emerald-800 text-stone-800 dark:text-stone-200'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 font-bold">
                          <span>{h.hazard}</span>
                          <span className="uppercase font-mono text-[11px]">
                            Severity: {h.severity}
                          </span>
                        </div>
                        <p className="leading-relaxed opacity-90">{h.precaution}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* CARD 2: STEP-BY-STEP REPAIR, REUSE, RECYCLE & SAFE DISPOSAL */}
        {activeDeckIndex === 1 && (
          <section className="bg-white dark:bg-[#14241B] border border-stone-200/90 dark:border-emerald-900/70 rounded-[28px] p-6 sm:p-8 space-y-6 shadow-xs">
            <div className="space-y-1">
              <h2 className="text-xl font-display font-extrabold text-stone-950 dark:text-white">
                Step-by-Step Playbook (Repair, Reuse, Recycle &amp; Safe Drop)
              </h2>
              <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300">
                Color-coded by action type: green = recycle, blue = repair/reuse, coral = special
                safe disposal.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {result.recommendedActions.map((act, idx) => {
                const Icon =
                  act.action === 'repair'
                    ? Wrench
                    : act.action === 'reuse'
                    ? Repeat
                    : act.action === 'recycle'
                    ? Recycle
                    : PackageCheck;

                const accentClass =
                  act.action === 'recycle'
                    ? 'text-[#10B981] dark:text-[#22C55E]'
                    : act.action === 'repair' || act.action === 'reuse'
                    ? 'text-[#3B82F6] dark:text-sky-400'
                    : 'text-[#FF6B5E]';

                return (
                  <div
                    key={idx}
                    className="p-5 rounded-[24px] bg-[#F7F8F5] dark:bg-[#0F1A14]/70 border border-stone-200/90 dark:border-emerald-800/80 space-y-3"
                  >
                    <div
                      className={`flex items-center justify-between gap-2 text-xs font-mono font-extrabold uppercase ${accentClass}`}
                    >
                      <span className="flex items-center gap-1.5">
                        <Icon className="w-4 h-4" />
                        <span>{act.action.replace('_', ' ')}</span>
                      </span>
                    </div>
                    <h3 className="text-base font-display font-extrabold text-stone-950 dark:text-white">
                      {act.title}
                    </h3>
                    <ol className="list-decimal pl-4 space-y-1.5 text-xs sm:text-sm text-stone-700 dark:text-stone-200 leading-relaxed">
                      {act.instructions.map((step, sIdx) => (
                        <li key={sIdx}>{step}</li>
                      ))}
                    </ol>
                  </div>
                );
              })}
            </div>

            {result.reuseIdeas.length > 0 && (
              <div className="pt-5 border-t border-stone-200/80 dark:border-emerald-900/60 space-y-3">
                <h3 className="text-base font-display font-extrabold text-stone-950 dark:text-white">
                  🛠️ Quick DIY Reuse &amp; Upcycle Ideas
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {result.reuseIdeas.map((idea, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-[22px] bg-blue-500/10 border border-blue-500/25 space-y-1.5"
                    >
                      <div className="text-xs text-blue-700 dark:text-sky-300 font-mono font-bold flex items-center gap-2">
                        <span>Difficulty: {idea.difficulty}</span>
                        <span aria-hidden="true">·</span>
                        <span>Time: {idea.estimatedTime}</span>
                      </div>
                      <p className="text-sm font-bold text-stone-900 dark:text-white">
                        {idea.idea}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* CARD 3: APPROXIMATE MATERIAL ESTIMATES & UNCERTAINTIES */}
        {activeDeckIndex === 2 && (
          <section className="bg-white dark:bg-[#14241B] border border-stone-200/90 dark:border-emerald-900/70 rounded-[28px] p-6 sm:p-8 space-y-6 shadow-xs">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-xl font-display font-extrabold text-stone-950 dark:text-white">
                  Material Breakdown (Approximate Estimates)
                </h2>
                <span className="text-xs font-mono text-stone-500 dark:text-stone-400">
                  Photos cannot verify exact chemistry
                </span>
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Every percentage below is labeled an approximate estimate based on typical items of
                this class.
              </p>
            </div>

            <div className="space-y-3.5">
              {result.materialEstimates.map((mat, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs sm:text-sm">
                    <span className="font-bold text-stone-900 dark:text-white">
                      {mat.material}
                    </span>
                    <div className="text-xs text-stone-500 dark:text-stone-400 font-mono tabular-nums">
                      {mat.estimatedPercentage !== null ? (
                        <span>~{mat.estimatedPercentage}% (approximate estimate)</span>
                      ) : (
                        <span>Percentage unknown (null)</span>
                      )}
                      <span aria-hidden="true"> · </span>
                      <span>Confidence: {mat.confidence}</span>
                    </div>
                  </div>
                  {mat.estimatedPercentage !== null && (
                    <div className="w-full h-2.5 bg-stone-100 dark:bg-emerald-950 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#22C55E] rounded-full"
                        style={{ width: `${mat.estimatedPercentage}%` }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="pt-5 border-t border-stone-200/80 dark:border-emerald-900/60 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1.5">
                <div className="font-bold text-stone-900 dark:text-white">
                  👀 Directly Visible / Stated
                </div>
                {result.visibleObservations && result.visibleObservations.length > 0 ? (
                  <ul className="list-disc pl-4 space-y-1 text-stone-600 dark:text-stone-300">
                    {result.visibleObservations.map((obs, idx) => (
                      <li key={idx}>{obs}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-stone-500">Based on general item classification.</p>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="font-bold text-stone-900 dark:text-white">
                  🤔 Assumed Characteristics (Not Verified)
                </div>
                {result.assumedCharacteristics && result.assumedCharacteristics.length > 0 ? (
                  <ul className="list-disc pl-4 space-y-1 text-stone-600 dark:text-stone-300">
                    {result.assumedCharacteristics.map((assump, idx) => (
                      <li key={idx}>{assump}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-stone-500">
                    Internal material grade is assumed from category norms.
                  </p>
                )}
              </div>
            </div>

            <div className="p-4 rounded-[20px] bg-[#F7F8F5] dark:bg-[#0F1A14]/70 border border-stone-200 dark:border-emerald-800/80 space-y-1.5 text-xs">
              <div className="font-bold text-stone-900 dark:text-white flex items-center gap-1.5">
                <Info className="w-4 h-4 text-[#10B981]" />
                <span>Known Uncertainties</span>
              </div>
              <ul className="list-disc pl-4 space-y-1 text-stone-600 dark:text-stone-300">
                {result.uncertainties.map((unc, idx) => (
                  <li key={idx}>{unc}</li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* CARD 4: DETERMINISTIC IMPACT & ILLUSTRATIVE SCRAP VALUE */}
        {activeDeckIndex === 3 && (
          <section className="bg-white dark:bg-[#14241B] border border-stone-200/90 dark:border-emerald-900/70 rounded-[28px] p-6 sm:p-8 space-y-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200/80 dark:border-emerald-900/60 pb-5">
              <div className="space-y-1">
                <div className="text-xs font-mono font-bold text-[#10B981] dark:text-[#C6F432] uppercase">
                  Deterministic Math Module (Non-AI)
                </div>
                <h2 className="text-xl font-display font-extrabold text-stone-950 dark:text-white">
                  Environmental Impact &amp; Illustrative Scrap Value
                </h2>
              </div>

              <div className="flex items-center gap-3 bg-[#F7F8F5] dark:bg-[#0F1A14] border border-stone-200 dark:border-emerald-800 rounded-2xl px-4 py-2.5">
                <Scale className="w-4 h-4 text-[#10B981] shrink-0" />
                <label
                  htmlFor="result-weight-input"
                  className="text-xs font-bold text-stone-700 dark:text-stone-200"
                >
                  Assumed Weight (kg):
                </label>
                <input
                  id="result-weight-input"
                  type="number"
                  step="0.05"
                  min="0.01"
                  max="500"
                  value={weightInput}
                  onChange={(e) => handleWeightChange(e.target.value)}
                  className="w-24 px-2.5 py-1 rounded-xl border border-stone-300 dark:border-emerald-700 bg-white dark:bg-[#14241B] font-mono tabular-nums text-sm font-bold text-stone-900 dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Environmental Impact Card */}
              <div className="p-5 rounded-[24px] bg-[#F7F8F5] dark:bg-[#0F1A14]/70 border border-stone-200 dark:border-emerald-800/80 space-y-3">
                <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400">
                  <span className="font-bold text-stone-800 dark:text-white">
                    Environmental Impact Estimator
                  </span>
                  <span>{impactEstimate.statusMessage}</span>
                </div>

                {impactEstimate.status === 'calculated' ? (
                  <div className="space-y-1">
                    <div className="text-3xl font-mono font-black tabular-nums text-[#10B981] dark:text-[#C6F432]">
                      ~{impactEstimate.estimatedSavingsKgCO2e} {impactEstimate.units}
                    </div>
                    <div className="text-xs text-emerald-800 dark:text-emerald-300 font-semibold">
                      Nice! That&apos;s {impactEstimate.estimatedSavingsKgCO2e} kg CO2e potentially
                      saved (estimated potential savings, not measured)
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-300 text-xs font-bold text-amber-950 dark:text-[#FFD84D]">
                    Insufficient data — Standardized CO2e savings cannot be calculated for this
                    category.
                  </div>
                )}

                <div className="text-xs text-stone-600 dark:text-stone-300 space-y-1 pt-2 border-t border-stone-200/80 dark:border-emerald-900/60 font-mono tabular-nums">
                  <div>Assumed Weight: {impactEstimate.weightKg} kg</div>
                  <div>
                    Emission Factor:{' '}
                    {impactEstimate.factorKgCO2ePerKg !== null
                      ? `${impactEstimate.factorKgCO2ePerKg} kg CO2e / kg`
                      : 'N/A'}
                  </div>
                  <div className="font-sans">Stream: {impactEstimate.materialLabel}</div>
                  <div className="font-sans">Source: {impactEstimate.source}</div>
                </div>

                <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-relaxed">
                  <strong>Assumptions:</strong> {impactEstimate.assumptions}{' '}
                  {impactEstimate.regionalDisclaimer}
                </p>
              </div>

              {/* Scrap Value Card */}
              <div className="p-5 rounded-[24px] bg-[#F7F8F5] dark:bg-[#0F1A14]/70 border border-stone-200 dark:border-emerald-800/80 space-y-3 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400">
                    <span className="font-bold text-stone-800 dark:text-white">
                      Scrap Value Estimator
                    </span>
                    <span>Illustrative Estimate Only</span>
                  </div>

                  <div className="space-y-1">
                    <div className="text-3xl font-mono font-black tabular-nums text-stone-950 dark:text-white">
                      ₹{scrapEstimate.estimatedValueInr.toFixed(2)}
                    </div>
                    <div className="text-xs text-amber-800 dark:text-[#FFD84D] font-semibold">
                      Illustrative estimate - actual prices vary (Not a live market quote)
                    </div>
                  </div>

                  <div className="text-xs text-stone-600 dark:text-stone-300 space-y-1 pt-2 border-t border-stone-200/80 dark:border-emerald-900/60 font-mono tabular-nums">
                    <div>Assumed Weight: {scrapEstimate.weightKg} kg</div>
                    <div>Illustrative Rate: ₹{scrapEstimate.rateInrPerKg} / kg</div>
                    <div className="font-sans">Stream: {scrapEstimate.materialLabel}</div>
                  </div>

                  <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-relaxed">
                    <strong>Collector Note:</strong> {scrapEstimate.notes}{' '}
                    {scrapEstimate.disclaimer}
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={onOpenCalculatorsTab}
                    className="text-xs font-bold text-[#10B981] dark:text-[#C6F432] hover:underline flex items-center gap-1.5"
                  >
                    <Calculator className="w-3.5 h-3.5" />
                    <span>Edit full emission factor &amp; ₹/kg rate tables</span>
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};
