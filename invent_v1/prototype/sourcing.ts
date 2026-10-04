import { BOM } from '../bom/bom.ts';

export const SOURCES = [
  { name: 'PETG reference price · 158 NOK / 1 kg incl. VAT, excluding shipping', url: 'https://www.3djake.no/esun-3d-utskriftsmateriale/petg-basic-grey', checked: '2026-10-04', note: 'Retrieved page price; live stock and checkout totals not confirmed.' },
  { name: 'TMC2209 StepStick · 119 NOK incl. VAT', url: 'https://www.zeptobit.com/index.php?category=21', checked: '2026-10-04', note: 'Item TMC2209S in supplier category. Compatibility and thermal sizing remain open.' },
  { name: 'PETG Basic material data · density 1.27 g/cm³', url: 'https://www.esun3d.com/uploads/PETG-Basic-TDS21.pdf', checked: '2026-10-04', note: 'Manufacturer specification for this PETG; other brands may differ.' },
  { name: 'Prusa: printer/nozzle/material selection and slicer preview', url: 'https://help.prusa3d.com/article/first-print-with-prusaslicer-3-0-0_1079761', checked: '2026-10-04', note: 'Use the actual printer profile. Material/time values remain slicer predictions until measured.' },
  { name: 'Prusa: save the sliced project as 3MF', url: 'https://help.prusa3d.com/article/saving-projects-as-3mf_1773', checked: '2026-10-04', note: 'Retain settings with the job. A geometry-only 3MF does not contain a verified printer profile.' },
];

export interface Purchase {
  id: string; item: string; qty: number; unit: string; group: string;
  priceNok: number | null; priceStatus: string; url: string; checkedAt: string;
  note: string;
}

const proposedQty: Record<string, number> = {
  nema17: 6, 'mgn9-block': 3, 'gt2-belt': 3, 'gt2-pulley': 3,
  'leadscrew-t8': 3, coupling: 3, 'profile-2020': 4, mcu: 2,
  'driver-tmc2209': 7, thermistor: 8, yarn: 4,
};

// Procurement candidates only: a known price does not validate part compatibility.
export const PURCHASES: Purchase[] = [
  ...BOM.filter(b => !b.id.startsWith('filament-')).map(b => ({
    id: b.id, item: b.itemNo || b.item, qty: proposedQty[b.id] ?? b.qty, unit: b.unit, group: b.group,
    priceNok: b.priceNok,
    priceStatus: b.id === 'driver-tmc2209' ? 'Supplier page retrieved 2026-10-04' : 'Legacy budget allowance; not a current quote',
    checkedAt: b.id === 'driver-tmc2209' ? '2026-10-04' : b.checkedAt, url: b.url,
    note: b.id === 'psu-12v' ? 'Old 12 V / 5 A allowance only. Six-axis power budget and enclosure are unresolved; do not select this supply from this estimate.'
      : b.id === 'mgn9-block' ? 'P / R / Z proposal. Old URL is a rail listing, not a confirmed carriage SKU; price and matching variant must be obtained.'
      : b.id === 'gt2-pulley' ? 'Motor pulleys only. Driven pulley and tensioners are separate unresolved items.'
      : b.id === 'profile-2020' ? '4 m budget allowance; final cut list and joint geometry are not released.'
      : b.id === 'driver-tmc2209' ? 'Six installed + one spare proposed. Requires carrier, cooling and correct motor-current setting.'
      : 'Provisional full-machine quantity. Confirm exact variant, fit and price after mechanical design is frozen.',
  })),
  ...[
    ['wheel-shaft', '8 mm precision shaft, 60 mm nominal + collars', 1, 'motion', 'Confirm shaft fits and axial retention.'],
    ['wheel-pulley', 'Wheel driven pulley, 60T / 8 mm bore candidate', 1, 'motion', '3:1 proposal requires 20T + 60T; exact belt length and centre distance unresolved.'],
    ['turntable-bearing', 'Turntable bearing with manufacturer hole drawing', 1, 'motion', 'Select before redesigning hub adapter.'],
    ['servo', 'Yarn-over actuator and matching horn', 1, 'motion', 'MG90S envelope is referenced in the old design; torque, travel and mount not validated.'],
    ['linear-supports', 'Lead-nut housings, screw supports, rail stops and retainers', 1, 'motion', 'Complete P / R / Z drive stacks still need design.'],
    ['driver-carriers', 'Driver carriers / distribution PCB and cooling', 1, 'control', 'Bare StepSticks cannot serve as a finished wiring assembly.'],
    ['endstops', 'Home / limit sensors and mounts', 1, 'control', 'Quantity and circuit depend on selected axis controller.'],
    ['servo-supply', 'Regulated actuator supply and DC distribution', 1, 'control', 'Select voltage, fuse and cable sizes from actual loads.'],
    ['frame-joints', 'Frame corner brackets, crossmembers and T-nuts', 1, 'motion', 'Exact cut list and fastener schedule remain open.'],
    ['guarding', 'Guard panels, hinges, latch and door interlock', 1, 'safety', 'Enclosure dimensions and mounting are not yet designed.'],
    ['harness', 'Connectors, strain relief, terminal blocks and DC switching', 1, 'control', 'Wiring diagram and load budget are required before ordering.'],
    ['tools', 'Caliper, basic hand tools and clamps if not already owned', 1, 'tools', 'For the manual fit kit: reuse existing tools where possible.'],
  ].map(([id, item, qty, group, note]) => ({ id: String(id), item: String(item), qty: Number(qty), unit: 'set', group: String(group), priceNok: null, priceStatus: 'Unpriced; specification open', url: '', checkedAt: '', note: String(note) })),
];
