export interface BomLine {
  group: string;
  item: string;
  qty: string;
  eur: number;
  buy: string;
}

export const BOM: BomLine[] = [
  { group: 'Frame', item: '18 mm birch hex deck, ~460 mm across', qty: '1', eur: 18, buy: 'timber yard / CNC' },
  { group: 'Frame', item: '2040 extrusion legs + T-nuts + M5', qty: '3 × 210 mm', eur: 22, buy: 'OpenBuilds / Ali' },
  { group: 'Motion', item: 'NEMA17 steppers', qty: '6', eur: 72, buy: 'generic 40 mm' },
  { group: 'Motion', item: 'Lazy-susan bearing 100 mm', qty: '1', eur: 28, buy: 'McMaster / Amazon' },
  { group: 'Motion', item: 'MGN9 rail 200 mm + carriage', qty: '1', eur: 18, buy: 'Ali' },
  { group: 'Motion', item: 'GT2 belt, 20T pulleys, T8×8 screw', qty: '1 set', eur: 16, buy: 'printer parts' },
  { group: 'Head', item: 'Latch needles (Brother / Passap spare)', qty: '10', eur: 8, buy: 'sewing spare' },
  { group: 'Head', item: 'Printed gates (PETG), magazine, carriage', qty: '~200 g', eur: 8, buy: 'print' },
  { group: 'Yarn', item: '4× dancer arm + AS5600 encoder', qty: '4', eur: 36, buy: 'Ali' },
  { group: 'Yarn', item: 'Ceramic eyelets, PTFE tube', qty: '1 set', eur: 8, buy: 'printer parts' },
  { group: 'Control', item: 'Raspberry Pi 5 (or Pi 4 4 GB)', qty: '1', eur: 72, buy: 'Pi shop' },
  { group: 'Control', item: 'BTT Octopus / SKR 3 + 6× TMC2209', qty: '1', eur: 78, buy: 'printer parts' },
  { group: 'Control', item: '24 V 350 W PSU + E-stop + wiring', qty: '1', eur: 32, buy: 'Mean Well class' },
  { group: 'Sense', item: 'Pi Camera 3 + LED ring', qty: '1', eur: 42, buy: 'Pi shop' },
  { group: 'Consumable', item: 'DK cotton, 4 colours, ~250 g/hat', qty: '1 hat', eur: 18, buy: 'yarn shop' },
  { group: 'Consumable', item: 'PETG filament for gates + seed rings', qty: '1 kg', eur: 22, buy: 'print' },
];

export const BOM_TOTAL = BOM.reduce((s, b) => s + b.eur, 0);

export const BOM_NOTE =
  'Prototype one-off, street prices 2026, excluding tools you already own (printer, Allen keys, soldering iron). Steel and the turntable bearing are bought. Gates, magazine, carriage and deck are printed or cut. Target: under €750. A careful Ali/used-Pi build lands near €520.';
