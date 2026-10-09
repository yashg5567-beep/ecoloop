import {
  BusinessWasteEntry,
  GEMINI_MODEL_NAME,
  ReuseIdea,
  WasteCategory,
  WasteScanResult,
  normalizeAndValidateScan,
  sanitizeText,
} from '../types/waste';
import { EcoTipItem } from './demoData';

export class GeminiAnalysisError extends Error {
  code?: string;
  constructor(message: string, code?: string) {
    super(message);
    this.name = 'GeminiAnalysisError';
    this.code = code;
  }
}

export async function analyzeWasteWithGemini(params: {
  imageBase64?: string;
  mimeType?: string;
  itemName?: string;
}): Promise<{ result: WasteScanResult; modelUsed: string }> {
  try {
    const response = await fetch('/api/analyze-waste', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new GeminiAnalysisError(
        data?.error ||
          'AI analysis could not be completed at this moment. Please retry or switch to Demo Mode.',
        data?.code
      );
    }

    if (!data?.result) {
      throw new GeminiAnalysisError(
        'Received an incomplete response from the AI service. Please retry or try Demo Mode.'
      );
    }

    // Client-side Zod validation & sanitization
    const validated = normalizeAndValidateScan(data.result);
    return {
      result: validated,
      modelUsed: data.modelUsed || GEMINI_MODEL_NAME,
    };
  } catch (err) {
    if (err instanceof GeminiAnalysisError) {
      throw err;
    }
    throw new GeminiAnalysisError(
      'Unable to reach the Gemini analysis service. Check your connection, retry, or click "Try demo mode".'
    );
  }
}

export async function fetchAiEcoTip(): Promise<EcoTipItem> {
  const response = await fetch('/api/eco-tip', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data?.tip) {
    throw new Error(data?.error || 'Unable to generate AI tip right now.');
  }
  return {
    id: `ai-tip-${Date.now()}`,
    title: data.title,
    tip: data.tip,
    category: data.category || 'Circular Living',
    source: 'AI-Generated (Gemini)',
  };
}

export interface BusinessAiInsight {
  executiveSummary: string;
  recommendations: Array<{
    title: string;
    action: string;
    priority: string;
  }>;
  isAiGenerated: boolean;
}

export async function fetchBusinessAiInsights(
  entries: BusinessWasteEntry[]
): Promise<BusinessAiInsight> {
  const response = await fetch('/api/business-tips', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ entries }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data?.executiveSummary) {
    throw new Error(
      data?.error || 'Could not generate AI business insights right now. Try Demo Mode or retry later.'
    );
  }
  return {
    executiveSummary: data.executiveSummary,
    recommendations: Array.isArray(data.recommendations) ? data.recommendations : [],
    isAiGenerated: true,
  };
}

export async function generateAnotherReuseIdea(params: {
  itemName: string;
  category: WasteCategory;
  existingIdeas: string[];
}): Promise<ReuseIdea> {
  const response = await fetch('/api/generate-reuse-idea', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data?.idea) {
    throw new Error(
      data?.error ||
        'Could not generate another AI reuse idea right now. Try again or add a sample idea.'
    );
  }
  const raw = data.idea;
  const diff = ['easy', 'medium', 'hard'].includes(String(raw.difficulty).toLowerCase())
    ? (String(raw.difficulty).toLowerCase() as 'easy' | 'medium' | 'hard')
    : 'easy';

  return {
    idea: sanitizeText(raw.idea || 'Practical household reuse'),
    difficulty: diff,
    estimatedTime: sanitizeText(raw.estimatedTime || '10 mins'),
    steps: Array.isArray(raw.steps)
      ? raw.steps.map((s: unknown) => sanitizeText(String(s))).filter(Boolean)
      : [
          'Clean and dry the item thoroughly before starting.',
          'Check for any sharp edges or worn parts.',
          'Repurpose for dry storage or workspace organization.',
        ],
  };
}

