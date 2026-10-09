import { EmissionFactorRow, ScrapRateRow, WasteCategory } from '../types/waste';

export interface ImpactCalculationResult {
  status: 'calculated' | 'insufficient_data';
  statusMessage: string;
  weightKg: number;
  factorKgCO2ePerKg: number | null;
  estimatedSavingsKgCO2e: number | null;
  units: 'kg CO2e';
  materialLabel: string;
  source: string;
  assumptions: string;
  regionalDisclaimer: string;
}

export interface ScrapCalculationResult {
  status: 'calculated' | 'not_applicable';
  weightKg: number;
  rateInrPerKg: number;
  estimatedValueInr: number;
  currency: 'INR (₹)';
  materialLabel: string;
  notes: string;
  disclaimer: string;
}

/**
 * Deterministic Environmental Impact Estimator (never uses AI).
 */
export function calculateEnvironmentalImpact(
  category: WasteCategory,
  weightKg: number,
  emissionFactors: EmissionFactorRow[],
  actionType?: 'repair' | 'reuse' | 'recycle' | 'special_disposal' | null
): ImpactCalculationResult {
  const safeWeight = typeof weightKg === 'number' && !Number.isNaN(weightKg) && weightKg > 0 ? weightKg : 0;

  const matchingRow = emissionFactors.find((row) => row.category === category);

  const regionalDisclaimer =
    'Estimated potential savings (not measured). Actual emissions avoided depend on your local electricity grid mix, collection transport distance, material contamination, and facility recovery efficiency.';

  if (!matchingRow || matchingRow.factorKgCO2ePerKg === null || safeWeight <= 0) {
    return {
      status: 'insufficient_data',
      statusMessage: 'Insufficient data',
      weightKg: safeWeight,
      factorKgCO2ePerKg: null,
      estimatedSavingsKgCO2e: null,
      units: 'kg CO2e',
      materialLabel: matchingRow?.materialLabel || `Category: ${category}`,
      source:
        matchingRow?.source ||
        'No standardized emission factor available for unseparated, mixed, or hazardous waste streams.',
      assumptions:
        matchingRow?.assumptions ||
        'Accurate carbon accounting requires separated, identifiable material fractions with known recovery pathways.',
      regionalDisclaimer,
    };
  }

  // Note: Direct repair/reuse avoids re-melting energy; we keep the base factor transparent and note action context in assumptions
  const baseFactor = matchingRow.factorKgCO2ePerKg;
  const estimatedSavings = Number((safeWeight * baseFactor).toFixed(2));

  const actionNote =
    actionType === 'repair' || actionType === 'reuse'
      ? ' (Direct repair or reuse typically preserves even more embodied energy than mechanical recycling.)'
      : '';

  return {
    status: 'calculated',
    statusMessage: 'Estimated potential savings',
    weightKg: Number(safeWeight.toFixed(2)),
    factorKgCO2ePerKg: baseFactor,
    estimatedSavingsKgCO2e: estimatedSavings,
    units: 'kg CO2e',
    materialLabel: matchingRow.materialLabel,
    source: matchingRow.source,
    assumptions: `${matchingRow.assumptions}${actionNote}`,
    regionalDisclaimer,
  };
}

/**
 * Deterministic Scrap Value Estimator using an editable rate table in ₹/kg.
 */
export function calculateScrapValue(
  category: WasteCategory,
  weightKg: number,
  scrapRates: ScrapRateRow[],
  customRateOverride?: number | null
): ScrapCalculationResult {
  const safeWeight = typeof weightKg === 'number' && !Number.isNaN(weightKg) && weightKg > 0 ? weightKg : 0;
  const matchingRow = scrapRates.find((r) => r.category === category);

  const rate =
    typeof customRateOverride === 'number' && !Number.isNaN(customRateOverride) && customRateOverride >= 0
      ? customRateOverride
      : matchingRow
      ? matchingRow.rateInrPerKg
      : 0;

  const estimatedValue = Number((safeWeight * rate).toFixed(2));

  return {
    status: matchingRow || customRateOverride != null ? 'calculated' : 'not_applicable',
    weightKg: Number(safeWeight.toFixed(2)),
    rateInrPerKg: rate,
    estimatedValueInr: estimatedValue,
    currency: 'INR (₹)',
    materialLabel: matchingRow?.materialLabel || `${category} (general)`,
    notes:
      matchingRow?.notes ||
      'This category does not typically carry standard household weight-based scrap value.',
    disclaimer:
      'Illustrative estimate - actual prices vary by city, material purity, moisture content, and local collector rates. Not a live market quote.',
  };
}
