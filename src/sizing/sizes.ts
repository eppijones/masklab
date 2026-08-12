export type SizeId = 'barn' | 'dame' | 'herre' | 'egendefinert';

export interface SizeSpec {
  id: SizeId;
  navn: string;
  omkrets_cm: number;
}

export const SIZES: SizeSpec[] = [
  { id: 'barn', navn: 'Barn', omkrets_cm: 52 },
  { id: 'dame', navn: 'Dame', omkrets_cm: 56 },
  { id: 'herre', navn: 'Herre', omkrets_cm: 60 },
  { id: 'egendefinert', navn: 'Egendefinert', omkrets_cm: 56 },
];

export function getSize(id: SizeId, customCm?: number): SizeSpec {
  const base = SIZES.find((s) => s.id === id) ?? SIZES[1];
  if (id === 'egendefinert' && customCm != null) {
    return { ...base, omkrets_cm: customCm };
  }
  return base;
}
