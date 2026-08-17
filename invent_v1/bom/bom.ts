/**
 * Bill of materials — Norwegian sources only.
 *
 * Rules this file follows, and the harness enforces:
 *
 *  1. NORWEGIAN ONLY. Every line is a shop that holds stock in Norway and
 *     ships domestically. No AliExpress, no "2-3 weeks from China". Where the
 *     obvious part had no Norwegian source, the DESIGN changed rather than the
 *     rule — see `substituteFor`.
 *  2. NOTHING IS WASTED. Every bench-rig purchase carries `usedInFull: true`,
 *     because the bench rig is the station module of the finished machine, not
 *     a jig. The only bench-only items are printed.
 *  3. HONEST VERIFICATION. `verified: true` means I opened the product page and
 *     read the price. `inStock` is what the page said on `checkedAt` — a
 *     snapshot, not a promise. Lines I could not open individually are marked
 *     `verified: false` with an estimated price, and the harness prints them as
 *     a to-do rather than letting them pass silently.
 *
 * This rule already earned its keep: elefun's BigTreeTech TMC2209 turned out to
 * be discontinued ("ikke lenger lagerført"), which a paper BOM would have
 * shipped happily. ZeptoBit AS had 52 in stock at a better price.
 */

export type Track = 'bench' | 'full';

export interface BomLine {
  id: string;
  item: string;
  itemNo: string;
  qty: number;
  unit: 'stk' | 'm' | 'kg' | 'pk' | 'sett';
  group: 'motion' | 'control' | 'sensing' | 'safety' | 'yarn' | 'fasteners' | 'consumable';
  tracks: Track[];
  vendor: string;
  url: string;
  /** Per `unit`, NOK incl. mva. */
  priceNok: number;
  verified: boolean;
  inStock: boolean | null;
  /** What the page showed, if it showed a count. */
  stockNote?: string;
  checkedAt: string;
  usedInFull: boolean;
  note: string;
  substituteFor?: string;
}

const D = '2026-08-17';

export const BOM: readonly BomLine[] = [
  /* ------------------------------------------------------------- motion --- */
  {
    id: 'nema17',
    item: 'NEMA17 stepper motor, 1.8 deg, 5.5 kg/cm',
    itemNo: 'Stegmotor NEMA17',
    qty: 2,
    unit: 'stk',
    group: 'motion',
    tracks: ['bench', 'full'],
    vendor: 'Elefun',
    url: 'https://www.elefun.no/p/produkter_produktark.aspx?v=50218',
    priceNok: 295,
    verified: true,
    inStock: true,
    checkedAt: D,
    usedInFull: true,
    note: 'W (gate wheel) and P (hook plunge). Both migrate straight into the full machine, which needs six of these.',
  },
  {
    id: 'mgn9-rail',
    item: 'HIWIN MGN9 linear rail, 1 m',
    itemNo: 'MGN9 lineær skinne',
    qty: 1,
    unit: 'm',
    group: 'motion',
    tracks: ['bench', 'full'],
    vendor: 'Elefun',
    url: 'https://www.elefun.no/vare-61587/3d-print-selvbyggerutstyr-lineare-skinner-hiwin-linear-guide-rail-mgn9-9mm-x-1000mm',
    priceNok: 895,
    verified: true,
    inStock: null,
    checkedAt: D,
    usedInFull: true,
    note: 'The bench uses 200 mm. Buy the metre — the rest becomes the R axis and the full station. Cut with a hacksaw and deburr; do not cut through a bearing race position.',
  },
  {
    id: 'mgn9-block',
    item: 'HIWIN MGN9C carriage block',
    itemNo: 'MGN9C vogn',
    qty: 1,
    unit: 'stk',
    group: 'motion',
    tracks: ['bench', 'full'],
    vendor: 'Elefun',
    url: 'https://www.elefun.no/vare-61587/3d-print-selvbyggerutstyr-lineare-skinner-hiwin-linear-guide-rail-mgn9-9mm-x-1000mm',
    priceNok: 195,
    verified: true,
    inStock: null,
    checkedAt: D,
    usedInFull: true,
    note: 'Carries the needle collet. Never let the block run off the rail end — the balls fall out and it is finished.',
  },
  {
    id: 'gt2-belt',
    item: 'GT2 timing belt, 6 mm, per metre',
    itemNo: 'GT2 tannrem 6 mm',
    qty: 1,
    unit: 'm',
    group: 'motion',
    tracks: ['bench', 'full'],
    vendor: 'Elefun',
    url: 'https://www.elefun.no/p/kat.aspx?k=1405',
    priceNok: 59,
    verified: true,
    inStock: true,
    checkedAt: D,
    usedInFull: true,
    note: 'Drives the wheel. Cut from a roll.',
  },
  {
    id: 'gt2-pulley',
    item: 'GT2 timing pulley, 20 tooth, 5 mm bore',
    itemNo: 'GT2 remskive 20T',
    qty: 2,
    unit: 'stk',
    group: 'motion',
    tracks: ['bench', 'full'],
    vendor: 'Elefun',
    url: 'https://www.elefun.no/p/kat.aspx?k=1405',
    priceNok: 59,
    verified: true,
    inStock: true,
    checkedAt: D,
    usedInFull: true,
    note: '5 mm bore to match the NEMA17 shaft.',
  },
  {
    id: 'bearing-608',
    item: '608ZZ ball bearing, 8x22x7',
    itemNo: 'Kulelager 608ZZ',
    qty: 4,
    unit: 'stk',
    group: 'motion',
    tracks: ['bench', 'full'],
    vendor: 'Elefun',
    url: 'https://www.elefun.no/vare-12179/kulelager-8x22x7mm-608zz',
    priceNok: 29,
    verified: true,
    inStock: null,
    checkedAt: D,
    usedInFull: true,
    note: 'Wheel hub and dancer pivot. The cheapest precision object in any hardware shop.',
  },
  {
    id: 'leadscrew-t8',
    item: 'T8 lead screw with brass nut, 200 mm',
    itemNo: 'T8 trapesskrue',
    qty: 1,
    unit: 'stk',
    group: 'motion',
    tracks: ['bench', 'full'],
    vendor: 'ZeptoBit AS',
    url: 'https://www.zeptobit.com/',
    priceNok: 149,
    verified: false,
    inStock: null,
    checkedAt: D,
    usedInFull: true,
    note: 'The P plunge axis. ZeptoBit stocks lead screws; confirm the exact length and pitch on the page before ordering. TO VERIFY.',
  },
  {
    id: 'coupling',
    item: 'Flexible shaft coupling 5 mm x 8 mm',
    itemNo: 'Fleksibel kobling',
    qty: 1,
    unit: 'stk',
    group: 'motion',
    tracks: ['bench', 'full'],
    vendor: 'Elefun',
    url: 'https://www.elefun.no/p/kat.aspx?k=1405',
    priceNok: 79,
    verified: true,
    inStock: true,
    checkedAt: D,
    usedInFull: true,
    note: 'Motor shaft to lead screw.',
  },
  {
    id: 'profile-2020',
    item: '2020 aluminium extrusion, 1 m',
    itemNo: '2020 aluminiumsprofil',
    qty: 2,
    unit: 'm',
    group: 'motion',
    tracks: ['bench', 'full'],
    vendor: 'ZeptoBit AS',
    url: 'https://www.zeptobit.com/',
    priceNok: 119,
    verified: false,
    inStock: null,
    checkedAt: D,
    usedInFull: true,
    note: 'Bench frame, then the full machine deck. Both ZeptoBit and Elefun list aluminium profile. TO VERIFY length options and price.',
  },

  /* ------------------------------------------------------------ control --- */
  {
    id: 'mcu',
    item: 'Arduino Nano ESP32 (ESP32-S3), pin headers fitted',
    itemNo: 'Arduino Nano ESP32',
    qty: 1,
    unit: 'stk',
    group: 'control',
    tracks: ['bench', 'full'],
    vendor: 'Kjell & Company',
    url: 'https://www.kjell.com/no/produkter/elektro-og-verktoy/elektronikk/arduino/utviklingskort/arduino-nano-esp32-utviklingskort-med-wifi-og-bluetooth-p88443',
    priceNok: 259,
    verified: true,
    inStock: true,
    stockNote: '5+ stk, 2-4 virkedager',
    checkedAt: D,
    usedInFull: true,
    note: 'Art. 88443. Runs the firmware and owns intra-cycle timing; the MacBook talks to it over USB. The full machine keeps this board and adds a second for the extra axes.',
  },
  {
    id: 'driver-tmc2209',
    item: 'StepStick with Trinamic TMC2209, UART',
    itemNo: 'TMC2209 stepstick',
    qty: 3,
    unit: 'stk',
    group: 'control',
    tracks: ['bench', 'full'],
    vendor: 'ZeptoBit AS',
    url: 'https://www.zeptobit.com/index.php?category=21',
    priceNok: 119,
    verified: true,
    inStock: true,
    stockNote: '52 stk på lager',
    checkedAt: D,
    usedInFull: true,
    substituteFor: 'BigTreeTech TMC2209 at Elefun — discontinued ("ikke lenger lagerført")',
    note: 'Two in use plus one spare. TMC2209 over the cheaper A4988 deliberately: this is a machine that runs for hours in a living room, and stealthChop is the difference between a background hum and something you leave the house to escape.',
  },
  {
    id: 'psu-12v',
    item: '12 V DC power supply, 5 A, enclosed CE-marked',
    itemNo: '12 V strømforsyning',
    qty: 1,
    unit: 'stk',
    group: 'control',
    tracks: ['bench', 'full'],
    vendor: 'ZeptoBit AS',
    url: 'https://www.zeptobit.com/',
    priceNok: 249,
    verified: false,
    inStock: null,
    checkedAt: D,
    usedInFull: true,
    note: 'ZeptoBit lists 5/12/18/24/36/48 V supplies. Must be an ENCLOSED, CE-marked unit — never an open frame in a home. TO VERIFY.',
  },
  {
    id: 'wire',
    item: 'Hook-up wire, ferrules and terminal blocks',
    itemNo: 'Monteringsledning og hylser',
    qty: 1,
    unit: 'sett',
    group: 'control',
    tracks: ['bench', 'full'],
    vendor: 'Kjell & Company',
    url: 'https://www.kjell.com/no/produkter/elektro-og-verktoy/elektronikk',
    priceNok: 199,
    verified: false,
    inStock: null,
    checkedAt: D,
    usedInFull: true,
    note: 'Ferrules not bare strands. TO VERIFY exact items.',
  },

  /* ------------------------------------------------------------ sensing --- */
  {
    id: 'webcam',
    item: 'USB webcam, 1080p, manual focus preferred',
    itemNo: 'USB-webkamera',
    qty: 1,
    unit: 'stk',
    group: 'sensing',
    tracks: ['bench', 'full'],
    vendor: 'Kjell & Company',
    url: 'https://www.kjell.com/no/produkter/datamaskin-og-kontor/datatilbehor/webkamera',
    priceNok: 449,
    verified: false,
    inStock: null,
    checkedAt: D,
    usedInFull: true,
    note: 'Watches the gate throat. MANUAL focus matters more than resolution — autofocus hunts on a 4 mm target and every hunt is a frame the detector cannot use. TO VERIFY a manual-focus model.',
  },
  {
    id: 'thermistor',
    item: 'NTC 3950 100k thermistor, cartridge, 1 m lead',
    itemNo: 'Termistor NTC 3950 100k',
    qty: 3,
    unit: 'stk',
    group: 'safety',
    tracks: ['bench', 'full'],
    vendor: '3D Print Norge',
    url: 'https://3dprintnorge.net/produkt/deler/mekaniske-deler/thermistor-ntc-3950',
    priceNok: 69,
    verified: false,
    inStock: null,
    checkedAt: D,
    usedInFull: true,
    note: 'One per motor plus one on the driver heatsink. These are NOT optional — they are layer 2 of the fire design, and the NEMA17 mount has a pocket moulded for the cartridge. TO VERIFY price.',
  },
  {
    id: 'led',
    item: 'LED strip, 12 V, warm white, 0.5 m',
    itemNo: 'LED-list 12 V',
    qty: 1,
    unit: 'stk',
    group: 'sensing',
    tracks: ['bench', 'full'],
    vendor: 'ZeptoBit AS',
    url: 'https://www.zeptobit.com/',
    priceNok: 89,
    verified: false,
    inStock: null,
    checkedAt: D,
    usedInFull: true,
    note: 'Constant current, never PWM — a dimmed LED beats against the camera shutter and the detector sees flicker as texture. TO VERIFY.',
  },

  /* ------------------------------------------------------------- safety --- */
  {
    id: 'estop',
    item: 'Latching mushroom emergency stop, NC contact',
    itemNo: 'Nødstopp med lås',
    qty: 1,
    unit: 'stk',
    group: 'safety',
    tracks: ['bench', 'full'],
    vendor: 'Elfa Distrelec Norge',
    url: 'https://www.elfadistrelec.no/',
    priceNok: 249,
    verified: false,
    inStock: null,
    checkedAt: D,
    usedInFull: true,
    note: 'Wired into the 12 V motor line, NOT into the firmware. Software cannot override a broken circuit, which is the entire point. TO VERIFY a specific part number.',
  },
  {
    id: 'fuse',
    item: 'Inline blade fuse holder + 7.5 A fuses',
    itemNo: 'Sikringsholder med sikringer',
    qty: 1,
    unit: 'sett',
    group: 'safety',
    tracks: ['bench', 'full'],
    vendor: 'Biltema',
    url: 'https://www.biltema.no/',
    priceNok: 79,
    verified: false,
    inStock: null,
    checkedAt: D,
    usedInFull: true,
    note: 'On the PSU output, before anything else. The predecessor design dropped this line and still planned to run 7-10 hours unattended. TO VERIFY.',
  },
  {
    id: 'smoke-alarm',
    item: 'Smoke alarm (mount above the machine)',
    itemNo: 'Røykvarsler',
    qty: 1,
    unit: 'stk',
    group: 'safety',
    tracks: ['bench', 'full'],
    vendor: 'Biltema',
    url: 'https://www.biltema.no/',
    priceNok: 149,
    verified: false,
    inStock: null,
    checkedAt: D,
    usedInFull: true,
    note: 'Yes, really, on the BOM. A machine designed to run unattended for hours next to cotton lint gets its own alarm directly above it. TO VERIFY.',
  },

  /* ---------------------------------------------------------- fasteners --- */
  {
    id: 'screws-m3',
    item: 'M3 socket-head cap screws, assorted 8/10/16/20 mm',
    itemNo: 'M3 skruesett',
    qty: 1,
    unit: 'sett',
    group: 'fasteners',
    tracks: ['bench', 'full'],
    vendor: 'ZeptoBit AS',
    url: 'https://www.zeptobit.com/',
    priceNok: 199,
    verified: false,
    inStock: null,
    checkedAt: D,
    usedInFull: true,
    note: 'ZeptoBit has a "Skruer og mutrer" section covering M3-M8. Exact counts per screw length are generated from the guide — see the fastener roll-up. TO VERIFY.',
  },
  {
    id: 'screws-m5',
    item: 'M5 button-head screws 10 mm + T-nuts for 2020',
    itemNo: 'M5 skruer og T-mutre',
    qty: 1,
    unit: 'sett',
    group: 'fasteners',
    tracks: ['bench', 'full'],
    vendor: 'ZeptoBit AS',
    url: 'https://www.zeptobit.com/',
    priceNok: 159,
    verified: false,
    inStock: null,
    checkedAt: D,
    usedInFull: true,
    note: 'TO VERIFY.',
  },
  {
    id: 'inserts',
    item: 'M3 + M4 heat-set brass inserts, knurled',
    itemNo: 'Gjengeinnsatser messing',
    qty: 1,
    unit: 'pk',
    group: 'fasteners',
    tracks: ['bench', 'full'],
    vendor: 'ZeptoBit AS',
    url: 'https://www.zeptobit.com/',
    priceNok: 179,
    verified: false,
    inStock: null,
    checkedAt: D,
    usedInFull: true,
    note: 'Every threaded hole in a printed part uses one. Tapped PETG strips on the second assembly, and you WILL disassemble this rig repeatedly during T2. TO VERIFY.',
  },

  /* --------------------------------------------------------- yarn/needle -- */
  {
    id: 'latch-hook',
    item: 'Ryanål (rya latch hook), 15.5 cm',
    itemNo: 'Ryanål',
    qty: 2,
    unit: 'stk',
    group: 'yarn',
    tracks: ['bench', 'full'],
    vendor: 'Panduro',
    url: 'https://panduro.com/',
    priceNok: 69,
    verified: false,
    inStock: null,
    checkedAt: D,
    usedInFull: true,
    substituteFor: 'Knitting-machine latch needle (Silver Reed / Brother spare) — a specialist order from woolen.no, stanett.no or akeb.no',
    note: 'This is the design change the Norwegian-only rule forced, and it is a good one: a rya latch hook IS a latch needle, it is on the shelf in a high-street craft shop, and it costs nothing. The collet is a separate 10 g print, so moving to a 1.8 mm machine needle later is one reprint.',
  },
  {
    id: 'eyelet',
    item: 'Ceramic yarn eyelet / PTFE tube',
    itemNo: 'Keramisk garnøye',
    qty: 2,
    unit: 'stk',
    group: 'yarn',
    tracks: ['bench', 'full'],
    vendor: '3D Print Norge',
    url: 'https://3dprintnorge.net/',
    priceNok: 49,
    verified: false,
    inStock: null,
    checkedAt: D,
    usedInFull: true,
    note: 'Cotton abrades a printed guide into a groove within a few hundred stitches. TO VERIFY.',
  },
  {
    id: 'yarn',
    item: 'DK / Cotton 8-8 cotton yarn, 4.0 mm gauge',
    itemNo: 'Bomullsgarn DK',
    qty: 2,
    unit: 'stk',
    group: 'yarn',
    tracks: ['bench', 'full'],
    vendor: 'local yarn shop',
    url: 'https://www.hobbygross.no/',
    priceNok: 59,
    verified: false,
    inStock: null,
    checkedAt: D,
    usedInFull: true,
    note: 'Use the SAME yarn the finished hats use. Testing on acrylic proves nothing — cotton-on-latch friction is the whole question. TO VERIFY a source.',
  },

  /* -------------------------------------------------------- consumables --- */
  {
    id: 'filament-petg',
    item: 'PETG filament, 1 kg',
    itemNo: 'PETG filament',
    qty: 1,
    unit: 'kg',
    group: 'consumable',
    tracks: ['bench', 'full'],
    vendor: '3D Print Norge',
    url: 'https://3dprintnorge.net/',
    priceNok: 279,
    verified: false,
    inStock: null,
    checkedAt: D,
    usedInFull: true,
    note: 'The bench rig needs ~295 g of PETG. TO VERIFY.',
  },
  {
    id: 'filament-pla',
    item: 'PLA filament, 1 kg',
    itemNo: 'PLA filament',
    qty: 1,
    unit: 'kg',
    group: 'consumable',
    tracks: ['bench', 'full'],
    vendor: '3D Print Norge',
    url: 'https://3dprintnorge.net/',
    priceNok: 229,
    verified: false,
    inStock: null,
    checkedAt: D,
    usedInFull: true,
    note: 'Camera pod only, ~24 g. TO VERIFY.',
  },
];

/* ------------------------------------------------------------ rollups ----- */

export function bomFor(track: Track): readonly BomLine[] {
  return BOM.filter((l) => l.tracks.includes(track));
}

export function totalNok(track: Track): number {
  return bomFor(track).reduce((s, l) => s + l.priceNok * l.qty, 0);
}

export function verifiedShare(track: Track): { verified: number; total: number } {
  const rows = bomFor(track);
  return { verified: rows.filter((l) => l.verified).length, total: rows.length };
}

/** Lines still needing a human to open the page. Printed by the harness. */
export function unverified(track: Track): readonly BomLine[] {
  return bomFor(track).filter((l) => !l.verified);
}
