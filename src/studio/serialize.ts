import type { ChartLayer, OverrideLayer } from '../data/chartLayers';
import { emptyOverride } from '../data/chartLayers';
import type { HookMm } from '../sizing/hooks';
import type { SizeId } from '../sizing/sizes';
import { blankDesign, type StudioDesign } from './design';

/** Legacy (v2) payload — chart only, before base/brim colours existed. */
interface SharePayloadV2 {
  v: 2;
  cols: number;
  rows: number;
  layers: ChartLayer[];
  override: OverrideLayer;
  hookMm: HookMm;
  sizeId: SizeId;
  omkrets_cm?: number;
}

/** Current payload: the whole design, so a link restores the studio exactly. */
export interface SharePayload {
  v: 3;
  d: StudioDesign;
}

function toBase64Url(json: string): string {
  const b64 =
    typeof btoa !== 'undefined'
      ? btoa(unescape(encodeURIComponent(json)))
      : Buffer.from(json, 'utf8').toString('base64');
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(s: string): string {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4));
  const raw = b64 + pad;
  if (typeof atob !== 'undefined') {
    return decodeURIComponent(escape(atob(raw)));
  }
  return Buffer.from(raw, 'base64').toString('utf8');
}

/** Photo bitmaps ride along as '0101' rows so share links stay short. */
function packBitmaps(design: StudioDesign): StudioDesign {
  return {
    ...design,
    layers: design.layers.map((l) => {
      if (l.kind !== 'image' || !l.bitmap) return l;
      const { bitmap, ...rest } = l;
      return {
        ...rest,
        bits: bitmap.map((row) => row.map((v) => (v ? '1' : '0')).join('')),
      } as unknown as typeof l;
    }),
  };
}

function unpackBitmaps(design: StudioDesign): StudioDesign {
  return {
    ...design,
    layers: design.layers.map((l) => {
      const packed = l as unknown as { bits?: string[] };
      if (l.kind !== 'image' || !packed.bits) return l;
      const { bits, ...rest } = packed;
      return {
        ...(rest as typeof l),
        bitmap: bits.map((row) => [...row].map((ch) => ch === '1')),
      };
    }),
  };
}

export function encodeDesign(design: StudioDesign): string {
  const payload: SharePayload = { v: 3, d: packBitmaps(design) };
  return toBase64Url(JSON.stringify(payload));
}

/** Accepts a bare code or a whole URL containing ?d=…; v2 codes upgrade. */
export function decodeDesign(input: string): StudioDesign | null {
  const raw = extractCode(input);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(fromBase64Url(raw)) as
      | SharePayload
      | SharePayloadV2;
    if (parsed.v === 3 && parsed.d && Array.isArray(parsed.d.layers)) {
      return unpackBitmaps({ ...blankDesign(), ...parsed.d });
    }
    if (parsed.v === 2 && Array.isArray(parsed.layers)) {
      return {
        ...blankDesign(),
        layers: parsed.layers,
        override: parsed.override ?? emptyOverride(),
        bandRows: parsed.rows,
        hookMm: parsed.hookMm,
        sizeId: parsed.sizeId,
        omkrets_cm: parsed.omkrets_cm ?? 56,
        brimStyle: 'wave',
      };
    }
    return null;
  } catch {
    return null;
  }
}

function extractCode(input: string): string | null {
  const s = input.trim();
  if (!s) return null;
  if (s.includes('d=')) {
    return s.split('d=')[1]?.split('&')[0] ?? null;
  }
  return s;
}

function origin(): string {
  return typeof window !== 'undefined'
    ? window.location.origin
    : 'https://masklab.no';
}

/** Link that reopens the design in the studio. */
export function studioUrl(design: StudioDesign): string {
  return `${origin()}/studio?d=${encodeDesign(design)}`;
}

/** Link that starts the round-by-round guide on the design. */
export function guideUrl(design: StudioDesign): string {
  return `${origin()}/oppskrift/custom?d=${encodeDesign(design)}`;
}
