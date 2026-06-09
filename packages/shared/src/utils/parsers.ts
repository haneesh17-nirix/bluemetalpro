/**
 * Weight string parsers for common Indian indicator brands.
 *
 * Most legacy weighbridge indicators transmit a continuous ASCII string over RS-232.
 * The format varies by brand but follows common patterns.
 *
 * Usage:
 *   import { parseWeightString } from '@bluemetal/shared/utils/parsers';
 *   const frame = parseWeightString(rawString);
 */

import type { RawWeightFrame, WeightStatus, WeightUnit } from '../types/weighbridge';

/** Try all known parsers and return the first match */
export function parseWeightString(raw: string): RawWeightFrame | null {
  return (
    parseAvery(raw) ||
    parseMettlerToledo(raw) ||
    parseGenericST(raw) ||
    parseLocalIndicator(raw) ||
    null
  );
}

/**
 * Avery Berkel / Avery Weigh-Tronix format
 * Example: "  ST,GS, +012440 kg"
 *           "  US,GS, +012440 kg"  (unstable)
 */
function parseAvery(raw: string): RawWeightFrame | null {
  const match = raw.match(/\s*(ST|US|OL|UL),\s*(GS|NT),\s*([+-]?\d+\.?\d*)\s*(kg|t|lb)/i);
  if (!match) return null;
  const [, stCode, mode, valueStr, unit] = match;
  return {
    raw,
    status: mapStatus(stCode),
    value: parseFloat(valueStr),
    unit: unit.toLowerCase() as WeightUnit,
    isGross: mode.toUpperCase() === 'GS',
    timestamp: new Date().toISOString(),
  };
}

/**
 * Mettler-Toledo standard format
 * Example: "S S      12440 kg"  (S S = stable)
 *           "S D      12440 kg"  (S D = dynamic/unstable)
 */
function parseMettlerToledo(raw: string): RawWeightFrame | null {
  const match = raw.match(/^(S\s[SDA]|S\sE)\s+([+-]?\d+\.?\d*)\s*(kg|t|lb)/i);
  if (!match) return null;
  const [, code, valueStr, unit] = match;
  const status: WeightStatus = code.trim() === 'S S' ? 'stable'
    : code.trim() === 'S D' ? 'unstable'
    : code.trim() === 'S E' ? 'error'
    : 'unstable';
  return {
    raw,
    status,
    value: parseFloat(valueStr),
    unit: unit.toLowerCase() as WeightUnit,
    isGross: true,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Generic "ST,GS" or "ST,NT" format used by many local Indian brands
 * (Essae, Citizen Scale, local OEM indicators)
 * Example: "ST,GS,+0012440KG" or "ST,NT,0012440KG"
 */
function parseGenericST(raw: string): RawWeightFrame | null {
  const match = raw.match(/^(ST|US|OL)\s*,\s*(GS|NT)\s*,\s*([+-]?\d+)\s*(KG|T|LB)/i);
  if (!match) return null;
  const [, stCode, mode, valueStr, unit] = match;
  return {
    raw,
    status: mapStatus(stCode),
    value: parseInt(valueStr, 10),
    unit: unit.toLowerCase() as WeightUnit,
    isGross: mode.toUpperCase() === 'GS',
    timestamp: new Date().toISOString(),
  };
}

/**
 * Fallback: bare numeric string (some cheap indicators just emit a number)
 * Example: "0012440\r\n"
 */
function parseLocalIndicator(raw: string): RawWeightFrame | null {
  const match = raw.trim().match(/^([+-]?\d{4,8})$/);
  if (!match) return null;
  return {
    raw,
    status: 'stable',
    value: parseInt(match[1], 10),
    unit: 'kg',
    isGross: true,
    timestamp: new Date().toISOString(),
  };
}

function mapStatus(code: string): WeightStatus {
  const c = code.toUpperCase().trim();
  if (c === 'ST' || c === 'S') return 'stable';
  if (c === 'US' || c === 'D') return 'unstable';
  if (c === 'OL') return 'overload';
  if (c === 'UL') return 'underload';
  return 'error';
}

/** Convert kg to metric tonnes */
export const kgToTonnes = (kg: number): number => +(kg / 1000).toFixed(3);

/** Compute net weight from gross and tare */
export const netWeight = (gross: number, tare: number): number => Math.max(0, gross - tare);

/** Format a weight for display */
export function formatWeight(kg: number, unit: WeightUnit = 'kg'): string {
  if (unit === 't') return `${kgToTonnes(kg)} T`;
  return `${kg.toLocaleString('en-IN')} kg`;
}
