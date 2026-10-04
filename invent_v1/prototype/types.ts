export type Part = {
  id: string; name: string; nameNo?: string; group: string; note: string;
  file: string; geometry: string; bbox: number[]; grams: number;
  solidGrams: number; sha256: string; triangles: number; matrices: number[][];
  mount: { frame: string };
  fitQty: number; fullQty: { installed: number; spare: number };
  print: { material: string; layerMm: number; walls: number; infillPct: number };
};

export type Data = {
  revision: string; generatedAt: string; massMethod: string; parts: Part[];
  findings: { id: string; title: string; evidence: string; action: string; parts: string[] }[];
  purchases: {
    id: string; item: string; qty: number; unit: string; priceNok: number | null;
    priceStatus: string; url: string; note: string;
  }[];
  hardware: { id: string; label: string; kind: string; frame: string; matrix: number[]; size: number[] }[];
};
