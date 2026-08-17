/**
 * The bench-rig build, step by step, down to the screw.
 *
 * Fastener callouts are STRUCTURED (`uses: {sku, qty}[]`) rather than written
 * into the prose, so the harness can sum them across every step and check the
 * total against the BOM. A guide that says "x4 M5" in step 6 for a screw that
 * never made the shopping list is the single most common way a build stalls on
 * a Saturday afternoon.
 *
 * Every step ends with a `check` — something you can observe before moving on.
 * That is IKEA's actual trick, far more than the exploded views: you are never
 * more than one step away from knowing you got it wrong.
 */

export type Track = 'station' | 'machine';

export interface GuideStep {
  n: number;
  track: Track;
  title: string;
  titleNo: string;
  body: string;
  /** Part ids consumed. Cross-checked so no printed part goes unassembled. */
  parts: string[];
  uses: { sku: string; qty: number }[];
  /** Observable outcome. If you cannot see it, do not continue. */
  check: string;
  minutes: number;
  /** Optional caution shown as a warning band. */
  warn?: string;
}

export const FASTENERS: Record<string, { label: string; lenMm: number | null }> = {
  'M3x8-SHCS': { label: 'M3 x 8 socket head cap screw', lenMm: 8 },
  'M3x10-SHCS': { label: 'M3 x 10 socket head cap screw', lenMm: 10 },
  'M3x16-SHCS': { label: 'M3 x 16 socket head cap screw', lenMm: 16 },
  'M3x20-SHCS': { label: 'M3 x 20 socket head cap screw', lenMm: 20 },
  'M3-NUT': { label: 'M3 nyloc nut', lenMm: null },
  'M3-INSERT': { label: 'M3 heat-set brass insert', lenMm: null },
  'M4-INSERT': { label: 'M4 heat-set brass insert', lenMm: null },
  'M5x10-BHCS': { label: 'M5 x 10 button head screw', lenMm: 10 },
  'M5x16-BHCS': { label: 'M5 x 16 button head screw', lenMm: 16 },
  'M5-TNUT': { label: 'M5 T-nut for 2020', lenMm: null },
  'M4x12-SHCS': { label: 'M4 x 12 socket head cap screw', lenMm: 12 },
  'M4-NUT': { label: 'M4 nyloc nut', lenMm: null },
};

export const STEPS: readonly GuideStep[] = [
  {
    n: 1,
    track: 'station',
    title: 'Print the fit-check coupon first',
    titleNo: 'Skriv ut passkontrollen forst',
    body:
      'Before anything else, print gate-8 and wheel-tooth on their own — about 20 minutes together. Push a gate tongue into the tooth seat by hand. It should go in with firm thumb pressure and stay put when you turn the tooth upside down. If it drops out, or needs pliers, your printer runs a different offset from mine: change nothing in the model, adjust your slicer X/Y compensation, and reprint the pair. Doing this now saves you finding out after a 6-hour plate.',
    parts: ['gate-8', 'wheel-tooth'],
    uses: [],
    check: 'A gate seats in a tooth with thumb pressure and does not fall out when inverted.',
    minutes: 30,
  },
  {
    n: 2,
    track: 'station',
    title: 'Print the rest of the rig',
    titleNo: 'Skriv ut resten',
    body:
      'Everything else, 343 g total. PETG for anything structural or near a motor; PLA only for the camera pod. Print the gate sweep — 6.0, 7.0, 7.5 and 8.0 mm throats — all four. They exist so T2 can find the width that actually holds cotton, and you will not know which one that is until you try. Follow the orientation note on each part: they are not arbitrary, they put the layer lines across the load rather than along it.',
    parts: ['gate-6', 'gate-7', 'gate-7p5', 'gate-8', 'comb-segment', 'needle-collet', 'rail-bracket', 'nema17-mount', 'camera-pod', 'tension-dancer', 'yarn-finger', 'bench-base'],
    uses: [],
    check: 'Every part is on the bench and none has a visible layer split or lifted corner.',
    minutes: 40,
  },
  {
    n: 3,
    track: 'station',
    title: 'Melt in the brass inserts',
    titleNo: 'Smelt inn gjengeinnsatser',
    body:
      'Soldering iron at 240 C, insert sitting square on the pocket, straight down under its own weight plus light pressure. Four M4 in the bench base, two M3 in the camera pod. The pockets have a lead-in chamfer so the insert starts square — if one goes in crooked, back it out while it is still hot and try again. Tapped PETG threads strip on the second assembly, and you will disassemble this rig many times during T2.',
    parts: ['bench-base', 'camera-pod'],
    uses: [
      { sku: 'M4-INSERT', qty: 4 },
      { sku: 'M3-INSERT', qty: 2 },
    ],
    check: 'Every insert is flush or a hair below the surface, and square to it.',
    minutes: 20,
    warn: 'A soldering iron at 240 C and molten plastic. Ventilate, and do not breathe the fumes.',
  },
  {
    n: 4,
    track: 'station',
    title: 'Cut and mount the linear rail',
    titleNo: 'Kapp og monter skinnen',
    body:
      'Cut 200 mm from the MGN9 metre with a hacksaw, deburr both ends with a file until a fingernail does not catch. Bolt the two rail brackets to the bench base through the slotted feet, then the rail to the brackets. Leave everything finger-tight for now. Slide the carriage block on from one end — and never let it run off the other, because the balls fall out and the block is finished.',
    parts: ['rail-bracket'],
    uses: [
      { sku: 'M3x10-SHCS', qty: 6 },
      { sku: 'M5x10-BHCS', qty: 4 },
      { sku: 'M5-TNUT', qty: 4 },
    ],
    check: 'The carriage slides the full length with one finger, with no tight spot.',
    minutes: 30,
  },
  {
    n: 5,
    track: 'station',
    title: 'Fit the needle collet and the ryanal',
    titleNo: 'Monter nalholder og ryanal',
    body:
      'Bolt the collet to the carriage block on its 20x20 pattern. Drop the ryanal into the bore, latch facing up and toward the comb, and pinch the clamp slit with the M3 x 20 and its nut. Hand tight plus a quarter turn — no more. You are clamping printed plastic, and the difference between held and cracked is about half a turn.',
    parts: ['needle-collet'],
    uses: [
      { sku: 'M3x10-SHCS', qty: 4 },
      { sku: 'M3x20-SHCS', qty: 1 },
      { sku: 'M3-NUT', qty: 1 },
    ],
    check: 'The needle does not rotate when you twist it by hand, and the latch swings freely.',
    minutes: 20,
  },
  {
    n: 6,
    track: 'station',
    title: 'Mount the comb',
    titleNo: 'Monter holdekammen',
    body:
      'Bolt the comb segment to the base through its slotted ears, gate pockets facing the needle. Push three gates of the same throat width into the pockets — note the stagger: pocket 1 and 3 sit on the near row, pocket 2 on the far row. Do not tighten the ear bolts yet. Comb height against the needle is the calibration that decides whether this machine works, and the slots exist so you can set it by eye in step 9.',
    parts: ['comb-segment', 'gate-8'],
    uses: [
      { sku: 'M3x16-SHCS', qty: 2 },
      { sku: 'M3-NUT', qty: 2 },
    ],
    check: 'Three gates sit in their pockets, tongues fully home, and none rocks when pressed.',
    minutes: 20,
  },
  {
    n: 7,
    track: 'station',
    title: 'Motors, wheel and yarn finger',
    titleNo: 'Motorer, hjul og garnfinger',
    body:
      'Bolt both NEMA17s to their printed mounts and the mounts to the 2020 rail. Fit the thermistor cartridge into the pocket in each mount before you bolt the motor down — it must touch the motor body, and it is far easier now than later. Press the 8 mm shaft through two 608 bearings, slide a wheel tooth on, and lock it with the M3 grub. Screw the yarn finger onto the servo horn and pinch a 40 mm length of 1.75 mm filament into its wire seat.',
    parts: ['nema17-mount', 'wheel-tooth', 'wheel-shaft', 'yarn-finger'],
    uses: [
      { sku: 'M3x16-SHCS', qty: 8 },
      { sku: 'M5x10-BHCS', qty: 4 },
      { sku: 'M5-TNUT', qty: 4 },
      { sku: 'M3x10-SHCS', qty: 2 },
    ],
    check: 'Both motors spin freely by hand, and both thermistors are pinched against motor metal.',
    minutes: 45,
    warn: 'Fit the thermistors NOW. They are the only thing standing between a stalled motor and a fire, and every reason to skip them is a bad one.',
  },
  {
    n: 8,
    track: 'station',
    title: 'Wire it, fuse first',
    titleNo: 'Kobling — sikring forst',
    body:
      'Fuse holder on the PSU positive output, before anything else. Then the E-stop in the same line, so breaking it kills motor power without the firmware being involved. Drivers onto the ESP32 carrier, motors to the drivers with ferruled ends, thermistors to the analogue inputs, LED to 12 V constant. Do not power up yet.',
    parts: [],
    uses: [],
    check: 'With the E-stop pressed, a multimeter reads open circuit on the motor supply line.',
    minutes: 45,
    warn: 'The E-stop must interrupt motor POWER, not signal a pin. Software cannot override a broken circuit, and that is the entire point of it.',
  },
  {
    n: 9,
    track: 'station',
    title: 'Camera, light, and first power-on',
    titleNo: 'Kamera, lys og forste oppstart',
    body:
      'Clamp the camera pod so the throat of the middle gate fills about a third of the frame, and lock the focus manually — autofocus hunts on a 4 mm target and every hunt is a frame the detector cannot use. LED aimed across the throat, not down it, so the aperture reads as a shadow. Now power on with a hand on the E-stop. Open the control app, connect over USB, and jog each axis a single millimetre.',
    parts: ['camera-pod'],
    uses: [
      { sku: 'M3x8-SHCS', qty: 2 },
      { sku: 'M5x10-BHCS', qty: 1 },
      { sku: 'M5-TNUT', qty: 1 },
    ],
    check: 'Both axes jog in the commanded direction, and both thermistors read room temperature — not zero, and not open circuit.',
    minutes: 40,
    warn: 'A thermistor reading exactly 0 or wildly high is disconnected. Fix it before running anything; a sensor that reads cold when it is broken is worse than no sensor.',
  },
  {
    n: 10,
    track: 'station',
    title: 'T0 and T1 — yarn capture and a held V',
    titleNo: 'T0 og T1 — garnfangst og holdt maske',
    body:
      'By hand first. Hook a loop of your cotton with the ryanal and release it, one hundred times, counting failures. Then crochet ten stitches by hand, drop one mouth into a gate throat, and push the needle through it fifty times. Log both in the app. These are dull and they are the cheapest information you will ever buy on this project.',
    parts: [],
    uses: [],
    check: 'T0: 100/100 captures. T1: 50/50 passes through a gated V without splitting the yarn.',
    minutes: 60,
  },
  {
    n: 11,
    track: 'station',
    title: 'T2 — the one that matters',
    titleNo: 'T2 — den avgjorende',
    body:
      'Tension the hand-crocheted swatch across the comb so three mouths sit in three gates. Now run the wheel tooth through its pickup arc and see whether it takes the V out of the gate and carries it. Fifty times, logged, with the camera recording every frame and you keying seated or empty. That builds the labelled fixture set the detector needs, at the same time as it answers the question.\n\nNobody in any of the four predecessor dossiers has tested this step. It is the step the whole gate-wheel idea rests on.',
    parts: [],
    uses: [],
    check: 'T2: 50/50 pickups. Below 40/50, stop and try the next throat width down before changing anything else.',
    minutes: 120,
    warn: 'If every throat width fails T2, stop. The correct move is a thinner needle (a knitting-machine latch needle at 1.8 mm), not a wider throat — there is no room for a wider throat.',
  },
  {
    n: 12,
    track: 'station',
    title: 'T3 — one real fastmaske',
    titleNo: 'T3 — en ekte fastmaske',
    body:
      'Yarn through the dancer and the eyelet to the finger. Run the full cycle: pick up the V, plunge, yarn over, draw through two, and check that exactly one loop remains on the needle. Fifty consecutive. Export the log as CSV.\n\nIf you get here, you have the thing that has stopped everyone else — a machine-formed crochet stitch into a mechanically located previous stitch. Everything after this is engineering rather than invention.',
    parts: ['tension-dancer'],
    uses: [{ sku: 'M3x20-SHCS', qty: 1 }, { sku: 'M3-NUT', qty: 1 }],
    check: 'T3: 50 consecutive single crochets, loop count 1 at the end of each, height spread under 0.6 mm.',
    minutes: 180,
  },
];

export const MACHINE_STEPS: readonly GuideStep[] = [
  {
    n: 13,
    track: 'machine',
    title: 'Cut the deck',
    titleNo: 'Kapp dekket',
    body:
      'Four 2020 lengths into a 520 x 420 mm rectangle, plus two cross members. Square it with a set square and check the diagonals match within 1 mm — everything above this inherits whatever error you leave here.',
    parts: [],
    uses: [{ sku: 'M5x16-BHCS', qty: 12 }, { sku: 'M5-TNUT', qty: 12 }],
    check: 'Diagonals match within 1 mm and the frame does not rock on a flat table.',
    minutes: 45,
  },
  {
    n: 14,
    track: 'machine',
    title: 'Seat the turntable bearing',
    titleNo: 'Monter dreielageret',
    body:
      'The lazy-susan bearing is BOUGHT, never printed — it is the concentricity of the whole machine. Bolt it to the deck centre, then the printed hub adapter on top of it.',
    parts: ['hub-adapter'],
    uses: [{ sku: 'M4x12-SHCS', qty: 4 }, { sku: 'M5x10-BHCS', qty: 6 }],
    check: 'The hub turns smoothly through a full revolution with no tight spot.',
    minutes: 30,
  },
  {
    n: 15,
    track: 'machine',
    title: 'Platter and C-axis belt',
    titleNo: 'Dreieskive og C-rem',
    body:
      'Bolt the platter to the hub. Run GT2 around the rim groove to a 20T pulley on the C motor. Driving on the 240 mm rim gives roughly 34:1 with no gearbox, so one stitch is about 8.4 motor steps — comfortable resolution from a part you already printed.',
    parts: ['platter'],
    uses: [{ sku: 'M5x10-BHCS', qty: 6 }],
    check: 'Rim runout under 0.3 mm on a dial indicator, and the belt does not slip when you resist the platter by hand.',
    minutes: 45,
    warn: 'Check runout now. Every stitch position for the next 3 694 stitches is measured from this disc.',
  },
  {
    n: 16,
    track: 'machine',
    title: 'Assemble the mandrel',
    titleNo: 'Sett sammen mandrellen',
    body:
      'Three sections, bayonet twist-lock, crown on top. They are lathed from the app\u2019s own hat profile, so the former is the shape the pattern actually makes. Drop the stack onto the platter and check it runs true.',
    parts: ['mandrel-brim', 'mandrel-wall', 'mandrel-crown'],
    uses: [],
    check: 'The three sections twist together without force and the assembled former wobbles less than 0.5 mm at the crown.',
    minutes: 30,
  },
  {
    n: 17,
    track: 'machine',
    title: 'Z column and R carriage',
    titleNo: 'Z-søyle og R-slede',
    body:
      'Two column brackets onto the deck, 2020 column between them, trammed vertical. T8 lead screw for Z. The R carriage rides the rest of the MGN9 metre you bought for the bench.',
    parts: ['column-bracket'],
    uses: [
      { sku: 'M5x10-BHCS', qty: 8 },
      { sku: 'M5-TNUT', qty: 8 },
      { sku: 'M4-INSERT', qty: 4 },
    ],
    check: 'The column is vertical to within 0.5 mm over its height, measured against a square from the platter.',
    minutes: 60,
  },
  {
    n: 18,
    track: 'machine',
    title: 'Move the Station onto the carriage',
    titleNo: 'Flytt stasjonen over på sleden',
    body:
      'This is the whole point of building the bench rig the way you did. Unbolt the Station assembly from the printed bench base — needle collet, rail, wheel motor, yarn finger, camera pod, thermistors, all of it still bolted together — and bolt it onto the R carriage. Nothing is rebuilt and nothing is thrown away. The bench base is the only piece that does not come with you, and it cost you filament.\n\nEverything you learned during T0 to T3 still applies, because it is the same hardware in a new place.',
    parts: [],
    uses: [{ sku: 'M5x10-BHCS', qty: 4 }, { sku: 'M5-TNUT', qty: 4 }],
    check: 'The Station points at the mandrel surface, and jogging P still plunges the needle exactly as it did on the bench.',
    minutes: 45,
  },
  {
    n: 19,
    track: 'machine',
    title: 'Fit the full comb arc',
    titleNo: 'Monter hele holdekammen',
    body:
      'The 10-gate arc replaces the 3-gate bench segment. Same pitch, same seats, same gate parts — you simply have more of them. Set the comb height against the wheel exactly as you did in calibration, because it is the same adjustment.',
    parts: ['comb-arc'],
    uses: [{ sku: 'M4x12-SHCS', qty: 2 }, { sku: 'M4-NUT', qty: 2 }],
    check: 'All ten gates seat, and the wheel tooth clears every one of them by the same margin.',
    minutes: 30,
  },
  {
    n: 20,
    track: 'machine',
    title: 'Build the eight-tooth wheel',
    titleNo: 'Bygg åttetannshjulet',
    body:
      'Eight teeth into the hub, each locked with an M3 grub. These are the identical part you ran two of on the bench. Belt the wheel to its motor at 3:1.',
    parts: ['wheel-hub', 'wheel-tooth'],
    uses: [{ sku: 'M3x10-SHCS', qty: 8 }],
    check: 'Turning the wheel by hand, all eight teeth pass the comb at the same height within 0.2 mm.',
    minutes: 40,
  },
  {
    n: 21,
    track: 'machine',
    title: 'Yarn turret and four cones',
    titleNo: 'Garnkarusell og fire koner',
    body:
      'Turret onto the T motor, four cone stands behind the machine, one dancer and one ceramic eyelet per colour. Thread all four and pull each by hand: the dancer should move and the encoder should count.',
    parts: ['turret-drum', 'tension-dancer'],
    uses: [{ sku: 'M3x10-SHCS', qty: 2 }, { sku: 'M3x20-SHCS', qty: 4 }, { sku: 'M3-NUT', qty: 4 }],
    check: 'All four colours reach the finger, and indexing the turret 90 degrees swaps which one is presented.',
    minutes: 50,
  },
  {
    n: 22,
    track: 'machine',
    title: 'Take-down skirt',
    titleNo: 'Nedtrekkskjørt',
    body:
      'The TPU skirt hangs below the working line and keeps finished fabric off the gates. Without it the hat climbs back into the comb somewhere around round 20 and jams the wheel.',
    parts: ['takedown-skirt'],
    uses: [{ sku: 'M3x16-SHCS', qty: 3 }],
    check: 'The fingers flex under light finger pressure and spring back. Rigid fingers scar the fabric — reprint in TPU if they do not.',
    minutes: 20,
  },
  {
    n: 23,
    track: 'machine',
    title: 'Wire the remaining axes, then the enclosure',
    titleNo: 'Koble resten, så kabinettet',
    body:
      'Four more axes: C, Z, R, T. Thermistor on every one of them, into the same analogue inputs the bench used. Then the enclosure panels and the door interlock in series with the E-stop, so opening the door cuts motor power the same way the mushroom does.',
    parts: [],
    uses: [],
    check: 'Opening the enclosure door reads open circuit on the motor supply, exactly like pressing the E-stop.',
    minutes: 120,
    warn: 'Six motors now, not two. Confirm every thermistor reports a plausible room temperature before the first long run — a sensor that reads cold when it is disconnected is worse than no sensor at all.',
  },
  {
    n: 24,
    track: 'machine',
    title: 'The first hat',
    titleNo: 'Den første lua',
    body:
      'Load four colours in palette order. Hand-start the ten-stitch magic ring on the crown — thirty seconds of the several hours, and automating it is v2. Pick a pattern, press Start, and watch the first full round with a finger on the E-stop.\n\nLeave the camera auditing every round. The governor will start cautious and speed up as it learns it has thermal headroom.',
    parts: [],
    uses: [],
    check: 'A full round completes with the stitch count the pattern predicted and no missed-loop verdicts.',
    minutes: 60,
    warn: 'Do not leave it unattended until you have watched it finish a whole hat awake. Then check whether your home insurance covers self-built equipment left running.',
  },
];

export const ALL_STEPS: readonly GuideStep[] = [...STEPS, ...MACHINE_STEPS];

export const TOTAL_MINUTES = STEPS.reduce((s, x) => s + x.minutes, 0);
export const MACHINE_MINUTES = MACHINE_STEPS.reduce((s, x) => s + x.minutes, 0);

/** Fastener demand summed across every step. Cross-checked against the BOM. */
export function fastenerDemand(track?: Track): Record<string, number> {
  const out: Record<string, number> = {};
  const src = track ? ALL_STEPS.filter((s) => s.track === track) : ALL_STEPS;
  for (const s of src) for (const u of s.uses) out[u.sku] = (out[u.sku] ?? 0) + u.qty;
  return out;
}
