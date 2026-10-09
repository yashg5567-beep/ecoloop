import { z } from 'zod';

export const GEMINI_MODEL_NAME = 'gemini-3.8-flash';

export const WasteCategoryEnum = z.enum([
  'e-waste',
  'plastic',
  'paper',
  'metal',
  'glass',
  'organic',
  'battery',
  'textile',
  'appliance',
  'hazardous',
  'mixed',
  'other',
]);

export type WasteCategory = z.infer<typeof WasteCategoryEnum>;

export const MaterialEstimateSchema = z.object({
  material: z.string().min(1).max(120),
  estimatedPercentage: z.number().min(0).max(100).nullable(),
  confidence: z.enum(['low', 'medium', 'high']),
  isAssumed: z.boolean().optional().default(true),
});

export type MaterialEstimate = z.infer<typeof MaterialEstimateSchema>;

export const RecyclabilitySchema = z.object({
  score: z.number().min(0).max(100).nullable(),
  explanation: z.string().min(1).max(600),
});

export const HazardSchema = z.object({
  hazard: z.string().min(1).max(200),
  severity: z.enum(['low', 'medium', 'high']),
  precaution: z.string().min(1).max(400),
});

export type HazardItem = z.infer<typeof HazardSchema>;

export const RecommendedActionSchema = z.object({
  action: z.enum(['repair', 'reuse', 'recycle', 'special_disposal']),
  title: z.string().min(1).max(160),
  instructions: z.array(z.string().min(1).max(300)).min(1).max(8),
});

export type RecommendedAction = z.infer<typeof RecommendedActionSchema>;

export const ReuseIdeaSchema = z.object({
  idea: z.string().min(1).max(240),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  estimatedTime: z.string().min(1).max(80),
  steps: z.array(z.string().min(1).max(240)).max(6).optional(),
});

export type ReuseIdea = z.infer<typeof ReuseIdeaSchema>;

export const WasteScanResultSchema = z.object({
  itemName: z.string().min(1).max(150),
  category: WasteCategoryEnum,
  visibleObservations: z.array(z.string().max(250)).optional().default([]),
  assumedCharacteristics: z.array(z.string().max(250)).optional().default([]),
  materialEstimates: z.array(MaterialEstimateSchema).min(1).max(8),
  recyclability: RecyclabilitySchema,
  hazards: z.array(HazardSchema).max(6),
  recommendedActions: z.array(RecommendedActionSchema).min(1).max(6),
  bestUse: z.object({
    action: z.enum(['repair', 'reuse', 'recycle', 'special_disposal']),
    headline: z.string().min(1).max(180),
    why: z.string().min(1).max(350),
  }),
  reuseIdeas: z.array(ReuseIdeaSchema).max(8),
  uncertainties: z.array(z.string().min(1).max(250)).min(1).max(8),
  estimatedWeightKg: z.number().min(0.01).max(500).nullable().optional().default(0.25),
});

export type WasteScanResult = z.infer<typeof WasteScanResultSchema>;

export type ResultActionOption = 'recycle' | 'reuse' | 'disposal';

export interface SavedScanRecord {
  id: string;
  timestamp: string;
  inputType: 'image' | 'text' | 'demo';
  isDemo: boolean;
  result: WasteScanResult;
  userWeightKg: number;
  completedActionType: 'repair' | 'reuse' | 'recycle' | 'special_disposal' | null;
  completedAt: string | null;
  completedOptions?: ResultActionOption[];
}

export interface EcoPointEvent {
  id: string;
  timestamp: string;
  actionLabel: string;
  actionType: 'scan_saved' | 'repair' | 'reuse' | 'recycle' | 'special_disposal' | 'pickup_request';
  points: number;
  scanId?: string;
  isDemo?: boolean;
}

export interface EmissionFactorRow {
  id: string;
  category: WasteCategory;
  materialLabel: string;
  factorKgCO2ePerKg: number | null;
  source: string;
  assumptions: string;
}

export interface ScrapRateRow {
  id: string;
  category: WasteCategory;
  materialLabel: string;
  rateInrPerKg: number;
  notes: string;
}

export interface OfficialChannelResource {
  id: string;
  title: string;
  organizationType: 'Municipal' | 'National Portal' | 'Pollution Control Board' | 'Manufacturer Take-Back';
  description: string;
  actionHint: string;
  isPlaceholder: boolean;
}

export interface SimulatedPickupRequest {
  id: string;
  createdAt: string;
  name?: string;
  locality: string;
  itemDescription: string;
  category: WasteCategory;
  preferredTime: string;
  status: 'Simulated (Demo Only)';
}

export interface ShoutOutPost {
  id: string;
  createdAt: string;
  nickname: string;
  message: string;
  actionTag: 'Repaired' | 'Reused' | 'Recycled' | 'Safe E-Waste Drop';
  reactions: {
    leaf: number;
    clap: number;
    spark: number;
  };
  isSample: boolean;
  reported?: boolean;
}

export interface BusinessWasteEntry {
  id: string;
  date: string; // YYYY-MM-DD
  category: WasteCategory;
  materialDetail: string;
  weightKg: number;
  departmentOrSource: string;
  isDemo?: boolean;
}

export interface MapFacility {
  id: string;
  name: string;
  type: 'E-Waste Center' | 'Recycling Center' | 'Scrap Dealer' | 'Municipal Drop-off';
  address: string;
  lat: number;
  lon: number;
  distanceKm?: number;
  source: 'OpenStreetMap (Overpass API)' | 'Demo location - not verified';
  isDemo: boolean;
  acceptedCategories: string[];
}

/**
 * Determines whether an item is unsafe to reuse (batteries, damaged electronics,
 * chemicals, medicines, or items with high-severity hazards).
 */
export function isItemUnsafeToReuse(result: WasteScanResult): boolean {
  if (result.category === 'battery' || result.category === 'hazardous') {
    return true;
  }
  if (result.hazards.some((h) => h.severity === 'high')) {
    return true;
  }
  const combinedText = `${result.itemName} ${result.hazards
    .map((h) => `${h.hazard} ${h.precaution}`)
    .join(' ')}`.toLowerCase();

  const unsafeKeywords = [
    'lithium',
    'swollen',
    'leaking',
    'smoking',
    'chemical',
    'pesticide',
    'solvent',
    'acid',
    'medicine',
    'pharmaceutical',
    'pill',
    'syringe',
    'needle',
    'biohazard',
    'mercury',
    'asbestos',
    'crt ',
    'cathode ray',
    'damaged battery',
    'damaged electronic',
    'broken screen',
    'shattered',
    'exposed wire',
    'frayed cord',
  ];

  return unsafeKeywords.some((kw) => combinedText.includes(kw));
}

/**
 * Escapes HTML control characters and strips control codes to ensure untrusted
 * text from images or user input is safe before storing or rendering.
 */
export function sanitizeText(input: string | null | undefined): string {
  if (!input) return '';
  return String(input)
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '‹')
    .replace(/&gt;/g, '›')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

export function normalizeAndValidateScan(raw: unknown): WasteScanResult {
  const parsed = WasteScanResultSchema.parse(raw);

  return {
    ...parsed,
    itemName: sanitizeText(parsed.itemName),
    visibleObservations: (parsed.visibleObservations || []).map(sanitizeText).filter(Boolean),
    assumedCharacteristics: (parsed.assumedCharacteristics || []).map(sanitizeText).filter(Boolean),
    materialEstimates: parsed.materialEstimates.map((m) => ({
      material: sanitizeText(m.material),
      estimatedPercentage:
        typeof m.estimatedPercentage === 'number' && !Number.isNaN(m.estimatedPercentage)
          ? Math.round(Math.min(100, Math.max(0, m.estimatedPercentage)))
          : null,
      confidence: m.confidence,
      isAssumed: m.isAssumed ?? true,
    })),
    recyclability: {
      score:
        typeof parsed.recyclability.score === 'number' && !Number.isNaN(parsed.recyclability.score)
          ? Math.round(Math.min(100, Math.max(0, parsed.recyclability.score)))
          : null,
      explanation: sanitizeText(parsed.recyclability.explanation),
    },
    hazards: parsed.hazards.map((h) => ({
      hazard: sanitizeText(h.hazard),
      severity: h.severity,
      precaution: sanitizeText(h.precaution),
    })),
    recommendedActions: parsed.recommendedActions.map((a) => ({
      action: a.action,
      title: sanitizeText(a.title),
      instructions: a.instructions.map(sanitizeText).filter(Boolean),
    })),
    bestUse: {
      action: parsed.bestUse.action,
      headline: sanitizeText(parsed.bestUse.headline),
      why: sanitizeText(parsed.bestUse.why),
    },
    reuseIdeas: parsed.reuseIdeas.map((r) => ({
      idea: sanitizeText(r.idea),
      difficulty: r.difficulty,
      estimatedTime: sanitizeText(r.estimatedTime),
      steps: Array.isArray(r.steps) ? r.steps.map(sanitizeText).filter(Boolean) : undefined,
    })),
    uncertainties: parsed.uncertainties.map(sanitizeText).filter(Boolean),
    estimatedWeightKg:
      typeof parsed.estimatedWeightKg === 'number' && parsed.estimatedWeightKg > 0
        ? Number(parsed.estimatedWeightKg.toFixed(2))
        : 0.25,
  };
}
