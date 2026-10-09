import {
  BusinessWasteEntry,
  EcoPointEvent,
  EmissionFactorRow,
  OfficialChannelResource,
  ResultActionOption,
  SavedScanRecord,
  ScrapRateRow,
  ShoutOutPost,
  SimulatedPickupRequest,
  sanitizeText,
} from '../types/waste';
import {
  DEFAULT_EMISSION_FACTORS,
  DEFAULT_OFFICIAL_CHANNELS,
  DEFAULT_SCRAP_RATES,
  INITIAL_SHOUT_OUTS,
} from './demoData';

const STORAGE_KEYS = {
  SCANS: 'ecoloop_scans_v1',
  POINTS: 'ecoloop_points_v1',
  PICKUPS: 'ecoloop_pickups_v1',
  OFFICIAL_CHANNELS: 'ecoloop_official_channels_v1',
  EMISSION_FACTORS: 'ecoloop_emission_factors_v1',
  SCRAP_RATES: 'ecoloop_scrap_rates_v1',
  SHOUT_OUTS: 'ecoloop_shout_outs_v1',
  BUSINESS_LOGS: 'ecoloop_business_logs_v1',
  DEMO_MODE: 'ecoloop_demo_mode_v1',
};

const PROFANITY_LIST = [
  'fuck',
  'shit',
  'bitch',
  'asshole',
  'bastard',
  'crap',
  'dick',
  'piss',
  'slut',
  'whore',
  'idiots',
  'scam',
];

export function containsProfanityOrPII(text: string): { valid: boolean; reason?: string } {
  const lower = text.toLowerCase();
  for (const word of PROFANITY_LIST) {
    const regex = new RegExp(`\\b${word}\\b`, 'i');
    if (regex.test(lower)) {
      return {
        valid: false,
        reason: 'Please keep community shout-outs respectful and free of profanity.',
      };
    }
  }
  // Check for obvious phone numbers or email addresses to protect privacy
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  const phoneRegex = /\b\d{10}\b/;
  if (emailRegex.test(text) || phoneRegex.test(text)) {
    return {
      valid: false,
      reason: 'For your privacy, please do not include phone numbers or email addresses in public shout-outs.',
    };
  }
  return { valid: true };
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota errors gracefully
  }
}

export const storageService = {
  getDemoMode(): boolean {
    return readJson<boolean>(STORAGE_KEYS.DEMO_MODE, false);
  },

  setDemoMode(enabled: boolean): void {
    writeJson(STORAGE_KEYS.DEMO_MODE, enabled);
  },

  getSavedScans(): SavedScanRecord[] {
    return readJson<SavedScanRecord[]>(STORAGE_KEYS.SCANS, []);
  },

  saveScanRecord(record: SavedScanRecord): SavedScanRecord[] {
    const existing = this.getSavedScans();
    const idx = existing.findIndex((s) => s.id === record.id);
    let updated: SavedScanRecord[];
    if (idx >= 0) {
      updated = [...existing];
      updated[idx] = record;
    } else {
      updated = [record, ...existing];
    }
    writeJson(STORAGE_KEYS.SCANS, updated);
    return updated;
  },

  markScanActionCompleted(
    scanId: string,
    actionType: 'repair' | 'reuse' | 'recycle' | 'special_disposal'
  ): { scans: SavedScanRecord[]; pointEvents: EcoPointEvent[]; pointsEarned: number } {
    const scans = this.getSavedScans();
    const target = scans.find((s) => s.id === scanId);
    const pointsMap: Record<'repair' | 'reuse' | 'recycle' | 'special_disposal', number> = {
      repair: 40,
      reuse: 30,
      recycle: 25,
      special_disposal: 50,
    };
    const pointsEarned = pointsMap[actionType] || 25;

    const optionKey: ResultActionOption =
      actionType === 'recycle'
        ? 'recycle'
        : actionType === 'special_disposal'
        ? 'disposal'
        : 'reuse';

    if (target) {
      target.completedActionType = actionType;
      target.completedAt = new Date().toISOString();
      const existingOpts = Array.isArray(target.completedOptions) ? target.completedOptions : [];
      if (!existingOpts.includes(optionKey)) {
        target.completedOptions = [...existingOpts, optionKey];
      }
      writeJson(STORAGE_KEYS.SCANS, scans);
    }

    const labelMap: Record<'repair' | 'reuse' | 'recycle' | 'special_disposal', string> = {
      repair: 'Completed Item Repair Action',
      reuse: 'Completed Creative Reuse Action',
      recycle: 'Completed Clean Recycling Action',
      special_disposal: 'Completed Safe E-Waste / Hazardous Drop-Off',
    };

    const pointEvents = this.addPointEvent({
      id: `pt-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actionLabel: target
        ? `${labelMap[actionType]}: ${target.result.itemName}`
        : labelMap[actionType],
      actionType,
      points: pointsEarned,
      scanId,
    });

    return { scans, pointEvents, pointsEarned };
  },

  getPointEvents(): EcoPointEvent[] {
    return readJson<EcoPointEvent[]>(STORAGE_KEYS.POINTS, []);
  },

  addPointEvent(event: EcoPointEvent): EcoPointEvent[] {
    const current = this.getPointEvents();
    // Avoid duplicate points for the same scanId + actionType
    if (
      event.scanId &&
      current.some((e) => e.scanId === event.scanId && e.actionType === event.actionType)
    ) {
      return current;
    }
    const updated = [event, ...current];
    writeJson(STORAGE_KEYS.POINTS, updated);
    return updated;
  },

  getPickupRequests(): SimulatedPickupRequest[] {
    return readJson<SimulatedPickupRequest[]>(STORAGE_KEYS.PICKUPS, []);
  },

  addPickupRequest(req: SimulatedPickupRequest): SimulatedPickupRequest[] {
    const current = this.getPickupRequests();
    const updated = [req, ...current];
    writeJson(STORAGE_KEYS.PICKUPS, updated);
    return updated;
  },

  getOfficialChannels(): OfficialChannelResource[] {
    return readJson<OfficialChannelResource[]>(
      STORAGE_KEYS.OFFICIAL_CHANNELS,
      DEFAULT_OFFICIAL_CHANNELS
    );
  },

  saveOfficialChannels(channels: OfficialChannelResource[]): void {
    writeJson(STORAGE_KEYS.OFFICIAL_CHANNELS, channels);
  },

  getEmissionFactors(): EmissionFactorRow[] {
    return readJson<EmissionFactorRow[]>(
      STORAGE_KEYS.EMISSION_FACTORS,
      DEFAULT_EMISSION_FACTORS
    );
  },

  saveEmissionFactors(factors: EmissionFactorRow[]): void {
    writeJson(STORAGE_KEYS.EMISSION_FACTORS, factors);
  },

  resetEmissionFactors(): EmissionFactorRow[] {
    writeJson(STORAGE_KEYS.EMISSION_FACTORS, DEFAULT_EMISSION_FACTORS);
    return DEFAULT_EMISSION_FACTORS;
  },

  getScrapRates(): ScrapRateRow[] {
    return readJson<ScrapRateRow[]>(STORAGE_KEYS.SCRAP_RATES, DEFAULT_SCRAP_RATES);
  },

  saveScrapRates(rates: ScrapRateRow[]): void {
    writeJson(STORAGE_KEYS.SCRAP_RATES, rates);
  },

  resetScrapRates(): ScrapRateRow[] {
    writeJson(STORAGE_KEYS.SCRAP_RATES, DEFAULT_SCRAP_RATES);
    return DEFAULT_SCRAP_RATES;
  },

  getShoutOuts(): ShoutOutPost[] {
    return readJson<ShoutOutPost[]>(STORAGE_KEYS.SHOUT_OUTS, INITIAL_SHOUT_OUTS);
  },

  addShoutOut(
    nickname: string,
    message: string,
    actionTag: ShoutOutPost['actionTag']
  ): { ok: boolean; error?: string; posts?: ShoutOutPost[] } {
    const cleanNick = sanitizeText(nickname || 'EcoCitizen').slice(0, 32);
    const cleanMsg = sanitizeText(message).slice(0, 240);

    if (!cleanMsg || cleanMsg.length < 5) {
      return { ok: false, error: 'Please write a short message (at least 5 characters).' };
    }

    const check = containsProfanityOrPII(`${cleanNick} ${cleanMsg}`);
    if (!check.valid) {
      return { ok: false, error: check.reason };
    }

    const newPost: ShoutOutPost = {
      id: `so-${Date.now()}`,
      createdAt: new Date().toISOString(),
      nickname: cleanNick || 'EcoCitizen',
      message: cleanMsg,
      actionTag,
      reactions: { leaf: 1, clap: 0, spark: 0 },
      isSample: false,
      reported: false,
    };

    const updated = [newPost, ...this.getShoutOuts()];
    writeJson(STORAGE_KEYS.SHOUT_OUTS, updated);
    return { ok: true, posts: updated };
  },

  reactToShoutOut(postId: string, reactionType: 'leaf' | 'clap' | 'spark'): ShoutOutPost[] {
    const posts = this.getShoutOuts().map((p) => {
      if (p.id !== postId) return p;
      return {
        ...p,
        reactions: {
          ...p.reactions,
          [reactionType]: (p.reactions[reactionType] || 0) + 1,
        },
      };
    });
    writeJson(STORAGE_KEYS.SHOUT_OUTS, posts);
    return posts;
  },

  reportShoutOut(postId: string): ShoutOutPost[] {
    const posts = this.getShoutOuts().map((p) =>
      p.id === postId ? { ...p, reported: true } : p
    );
    writeJson(STORAGE_KEYS.SHOUT_OUTS, posts);
    return posts;
  },

  getBusinessLogs(): BusinessWasteEntry[] {
    return readJson<BusinessWasteEntry[]>(STORAGE_KEYS.BUSINESS_LOGS, []);
  },

  addBusinessLog(entry: Omit<BusinessWasteEntry, 'id'>): BusinessWasteEntry[] {
    const newEntry: BusinessWasteEntry = {
      id: `biz-${Date.now()}`,
      date: entry.date,
      category: entry.category,
      materialDetail: sanitizeText(entry.materialDetail).slice(0, 120),
      weightKg: Math.max(0.1, Number(entry.weightKg) || 1),
      departmentOrSource: sanitizeText(entry.departmentOrSource || 'General Operations').slice(0, 80),
      isDemo: false,
    };
    const updated = [newEntry, ...this.getBusinessLogs()];
    writeJson(STORAGE_KEYS.BUSINESS_LOGS, updated);
    return updated;
  },

  deleteBusinessLog(id: string): BusinessWasteEntry[] {
    const updated = this.getBusinessLogs().filter((b) => b.id !== id);
    writeJson(STORAGE_KEYS.BUSINESS_LOGS, updated);
    return updated;
  },

  clearAllUserData(): void {
    Object.values(STORAGE_KEYS).forEach((key) => {
      try {
        localStorage.removeItem(key);
      } catch {
        // ignore
      }
    });
  },
};

export function calculateStreakDays(events: EcoPointEvent[]): number {
  if (!events.length) return 0;
  const uniqueDays = Array.from(
    new Set(events.map((e) => e.timestamp.slice(0, 10)))
  ).sort((a, b) => (a > b ? -1 : 1));

  if (uniqueDays.length === 0) return 0;

  let streak = 1;
  for (let i = 0; i < uniqueDays.length - 1; i++) {
    const curr = new Date(uniqueDays[i]);
    const prev = new Date(uniqueDays[i + 1]);
    const diffDays = Math.round((curr.getTime() - prev.getTime()) / 86400000);
    if (diffDays === 1) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

export interface BadgeInfo {
  id: string;
  name: string;
  description: string;
  unlocked: boolean;
}

export function computeBadgesAndLevel(
  scans: SavedScanRecord[],
  pointEvents: EcoPointEvent[]
): {
  totalPoints: number;
  levelName: string;
  nextLevelPoints: number;
  badges: BadgeInfo[];
} {
  const totalPoints = pointEvents.reduce((acc, e) => acc + e.points, 0);

  let levelName = 'Seedling Starter';
  let nextLevelPoints = 50;
  if (totalPoints >= 300) {
    levelName = 'Circularity Vanguard';
    nextLevelPoints = 500;
  } else if (totalPoints >= 150) {
    levelName = 'Resource Steward';
    nextLevelPoints = 300;
  } else if (totalPoints >= 50) {
    levelName = 'Loop Builder';
    nextLevelPoints = 150;
  }

  const completedScans = scans.filter((s) => s.completedActionType !== null);
  const hasBatterySafeDrop = scans.some(
    (s) =>
      (s.result.category === 'battery' || s.result.category === 'e-waste' || s.result.category === 'hazardous') &&
      s.completedActionType === 'special_disposal'
  );
  const hasPlasticAction = scans.some(
    (s) => s.result.category === 'plastic' && s.completedActionType !== null
  );
  const hasRepairOrReuse = scans.some(
    (s) => s.completedActionType === 'repair' || s.completedActionType === 'reuse'
  );

  const badges: BadgeInfo[] = [
    {
      id: 'battery-guardian',
      name: 'Battery Guardian',
      description: 'Safely isolated and routed a lithium-ion battery or e-waste item to special disposal.',
      unlocked: hasBatterySafeDrop,
    },
    {
      id: 'plastic-slayer',
      name: 'Plastic Slayer',
      description: 'Kept rigid plastics out of landfill through clean recycling or creative reuse.',
      unlocked: hasPlasticAction || totalPoints >= 60,
    },
    {
      id: 'repair-reuse-champion',
      name: 'Repair & Reuse Legend',
      description: 'Extended an item’s lifespan through repair or creative reuse before recycling.',
      unlocked: hasRepairOrReuse,
    },
    {
      id: 'first-loop',
      name: '100+ Club & First Loop',
      description: 'Completed your first circularity loop and stacked verified EcoPoints.',
      unlocked: completedScans.length >= 1 || pointEvents.length >= 1,
    },
  ];

  return { totalPoints, levelName, nextLevelPoints, badges };
}
