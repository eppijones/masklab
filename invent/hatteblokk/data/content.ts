export type Evidence = 'REPO' | 'EXT' | 'INF' | 'ASM' | 'HYP' | 'UNK';

export const EVIDENCE_LABEL: Record<Evidence, string> = {
  REPO: 'repo fact',
  EXT: 'external fact',
  INF: 'inference',
  ASM: 'assumption',
  HYP: 'hypothesis',
  UNK: 'unknown',
};

export interface PriorArt {
  title: string;
  id: string;
  date: string;
  who: string;
  mechanism: string;
  overlap: string;
  gap: string;
  url: string;
}

export const PRIOR_ART: PriorArt[] = [
  {
    title: 'Häkelmaschine (first true crochet-machine patent)',
    id: 'DE102016015204A1',
    date: 'filed 2016',
    who: 'Fachhochschule Bielefeld',
    mechanism:
      'Flat bed of parallel latch needles plus a travelling carriage needle with a tapered tip; "staggered opposition" lets the two needle heads pass each other so yarn can be drawn through existing loops.',
    overlap: 'The core single-crochet formation using latch needles.',
    gap: 'Explicitly a flat-bed system, not circular. No colourwork, no shaping in the round.',
    url: 'https://patents.google.com/patent/DE102016015204A1/en',
  },
  {
    title: 'CroMat — Automation of crochet technology, prototype machine for complex-shaped textiles',
    id: 'Storck dissertation + journal paper',
    date: '2024',
    who: 'J. L. Storck, A. Ehrmann — HSBI Bielefeld, MTex³ (some outlets attribute to TU Dresden ITM; unresolved)',
    mechanism:
      'Ten motorised axes, CNC-like. Auxiliary latch-needle bed holds the most recent row; an active needle on a motorised rail travels along it. Produces ch, sl st, sc, hdc, turns, increases and decreases.',
    overlap:
      'The latch-needle stitch cycle, and the deliberate decision to make stitch positions mechanically predictable rather than solving them with image processing.',
    gap:
      'Flat. 3D shapes require the fabric to be removed and re-hung by hand between cycles. Cannot process high-friction yarns without dynamic tension control, which is not implemented. Single colour.',
    url: 'https://www.hsbi.de/publikationsserver/download/4792/4793/Dissertation_Storck.pdf',
  },
  {
    title: 'Croche-Matic: a robot for crocheting 3D cylindrical geometry',
    id: 'IEEE 10160345',
    date: '2023',
    who: 'Harvard GSD',
    mechanism:
      'Radial machine built around the Magic Ring technique. Nine axes — eight on a top ring plus workpiece rotation. Thirty movements across nine axes to form one single crochet.',
    overlap: 'Closest to our geometry: rotary, worked in the round, with increases and decreases.',
    gap:
      'Rings of 12 stitches. Cannot make the first stitches of the ring — those are crocheted by hand and fed in. No colourwork, no closed-loop verification, no garment.',
    url: 'https://ieeexplore.ieee.org/document/10160345/',
  },
  {
    title: 'Design tool for automated crocheting of fabrics',
    id: 'Tekstilec 66 (2023)',
    date: '2023',
    who: 'HSBI Bielefeld',
    mechanism: 'Maps a computer stitch representation onto G-code macros, appended in a valid order.',
    overlap: 'Validates the pattern-compiler approach we are taking.',
    gap: 'Flat fabric only.',
    url: 'https://www.hsbi.de/publikationsserver/download/4788/4789/02-DOI_10.14502tekstilec.66.2023062+(263-284).pdf',
  },
  {
    title: 'Loom-Based Mechanized Crochet',
    id: 'ACM SCF 2025 adjunct, 10.1145/3774746.3779255',
    date: '2025',
    who: 'N. Smith et al.',
    mechanism: 'Not yet verified — full text returned HTTP 403.',
    overlap: 'Unknown.',
    gap: 'MUST be retrieved and read before any disclosure is filed. Tracked as open unknown H9.',
    url: 'https://dl.acm.org/doi/10.1145/3774746.3779255',
  },
  {
    title: 'Crochet galloon / Raschel warp-knitting machines',
    id: 'US5327750, US7251960, DE69601153T2',
    date: '1993–2007',
    who: 'various',
    mechanism: 'Single horizontal latch-needle bar, warp chains joined by weft inlay, fixed hold-back bar, no sinkers.',
    overlap: 'The name only.',
    gap:
      'These are warp-knitting machines. The industry calls them "crochet machines" because the fabric resembles lace; they cannot form true crocheted structure. Not blocking art for stitch topology.',
    url: 'https://patents.google.com/patent/DE69601153T2/en',
  },
  {
    title: 'Loop-spreader mechanism for chainstitch sewing machines',
    id: 'US2482079A',
    date: '1949',
    who: 'Singer Mfg Co',
    mechanism:
      'A spreader finger engages and distends one limb of a thread loop, forming a thread triangle for a descending needle to enter.',
    overlap:
      'Directly relevant to our presenter: the classic solution to presenting an open aperture at a deterministic location.',
    gap: 'Sewing, single continuous chain, not fabric formation from a stitch matrix.',
    url: 'https://patents.google.com/patent/US2482079A/en',
  },
];

export interface Architecture {
  key: string;
  name: string;
  nameNo: string;
  summary: string;
  verdict: 'rejected' | 'fallback' | 'chosen' | 'pathB';
  why: string;
  scores: Record<string, number>;
}

export const CRITERIA: { key: string; label: string; weight: number }[] = [
  { key: 'topology', label: 'True sc topology', weight: 5 },
  { key: 'wholehat', label: 'Whole hat', weight: 5 },
  { key: 'circ', label: '14.4× circumference', weight: 5 },
  { key: 'dof', label: 'Few DOF', weight: 3 },
  { key: 'mech', label: 'Mech simplicity', weight: 4 },
  { key: 'ctrl', label: 'Control simplicity', weight: 3 },
  { key: 'tol', label: 'Tolerance headroom', weight: 4 },
  { key: 'colour', label: '4-colour capable', weight: 4 },
  { key: 'yarn', label: 'DK cotton', weight: 3 },
  { key: 'speed', label: 'Speed', weight: 2 },
  { key: 'print', label: '3D-printable', weight: 4 },
  { key: 'cots', label: 'Off-the-shelf', weight: 3 },
  { key: 'cost', label: 'Cost', weight: 4 },
  { key: 'patent', label: 'Differentiation', weight: 4 },
  { key: 'start', label: 'Self-starting', weight: 4 },
];

export const ARCHITECTURES: Architecture[] = [
  {
    key: 'M1',
    name: 'Fixed circular needle cylinder',
    nameNo: 'Fast nålsylinder',
    summary:
      '144 latch needles in a printed slotted cylinder, cam-driven, fixed stitch station, take-down below. Needles retire for decreases exactly as a sock machine drops needles for a heel.',
    verdict: 'rejected',
    why: 'Fatal on the crown. Below roughly 60% needle engagement the fabric is stretched over a cylinder far too large; the last 19 rounds (100 → 10 st) are impossible.',
    scores: { topology: 5, wholehat: 1, circ: 1, dof: 4, mech: 3, ctrl: 4, tol: 4, colour: 3, yarn: 3, speed: 4, print: 3, cots: 4, cost: 3, patent: 1, start: 4 },
  },
  {
    key: 'M2',
    name: 'Iris / variable-diameter needle ring',
    nameNo: 'Irisring',
    summary:
      '144 needles on radial slides driven by a single scroll plate, so one motor changes the ring diameter continuously — a lathe chuck for stitches.',
    verdict: 'rejected',
    why: 'Solves M1’s flaw and dies on geometry: 144 needles cannot physically fit on a 20 mm circle. Also 144 printed slides of cumulative friction.',
    scores: { topology: 5, wholehat: 3, circ: 3, dof: 3, mech: 1, ctrl: 3, tol: 2, colour: 3, yarn: 3, speed: 3, print: 1, cots: 2, cost: 1, patent: 4, start: 4 },
  },
  {
    key: 'M3',
    name: 'Circulating loop-carrier chain',
    nameNo: 'Løkkekjede',
    summary:
      'Retention hooks on a closed-loop belt around idlers. Hooks are passive; one station-mounted actuator drives whichever hook is at the working position. An unrolled, extensible needle bed.',
    verdict: 'fallback',
    why: 'Strong and genuinely novel — one actuator instead of 144, holder count decoupled from circumference. Kept as the documented fallback if experiment P3 shows a bed-free presenter cannot find the V.',
    scores: { topology: 5, wholehat: 4, circ: 4, dof: 4, mech: 3, ctrl: 3, tol: 3, colour: 3, yarn: 3, speed: 3, print: 3, cots: 3, cost: 3, patent: 5, start: 4 },
  },
  {
    key: 'M4',
    name: 'Rotating hat-block former + travelling stitch station',
    nameNo: 'Hatteblokk',
    summary:
      'No needle bed. The hat is crocheted onto a rotating hat-shaped mandrel that supplies the rigid datum a compliant fabric lacks. A 5-axis station rides the block profile; a compliant tapered presenter finds and spreads each target V.',
    verdict: 'chosen',
    why: 'The only candidate that handles the full 14.4× profile natively, because the block IS the profile. Removes 144 needles and the entire needle-selection subsystem. Its toolpath is the app’s own per-stitch 3D model, one unit conversion away.',
    scores: { topology: 5, wholehat: 5, circ: 5, dof: 4, mech: 4, ctrl: 3, tol: 2, colour: 5, yarn: 4, speed: 3, print: 4, cots: 4, cost: 4, patent: 4, start: 5 },
  },
  {
    key: 'M5',
    name: 'Polar multi-axis robotic head',
    nameNo: 'Polar robotarm',
    summary: 'Eight to ten axes replicating hand-like hook motion around a rotating workpiece.',
    verdict: 'rejected',
    why: 'This is Croche-Matic — it is prior art, it needs a hand-started workpiece, and 30 movements per stitch across nine axes multiplies both cycle time and failure modes.',
    scores: { topology: 5, wholehat: 2, circ: 4, dof: 1, mech: 2, ctrl: 1, tol: 2, colour: 3, yarn: 3, speed: 1, print: 3, cots: 3, cost: 2, patent: 1, start: 1 },
  },
  {
    key: 'M6',
    name: 'Flat-bed strip + spiral seam',
    nameNo: 'Flatt bånd med søm',
    summary: 'Crochet a long tapered flat strip on a CroMat-style bed, then spiral-seam it into a hat.',
    verdict: 'fallback',
    why: 'True crochet topology and it guarantees SOME hat, but the result is seamed and panel-joining is a second unsolved automation problem.',
    scores: { topology: 5, wholehat: 3, circ: 4, dof: 4, mech: 3, ctrl: 4, tol: 4, colour: 3, yarn: 3, speed: 3, print: 4, cots: 4, cost: 4, patent: 1, start: 4 },
  },
  {
    key: 'M7',
    name: 'Path B — chainstitch over a knit blank',
    nameNo: 'Kjedesting (Path B)',
    summary:
      'Cornely-style chainstitch or tufting laid over a circular-knit blank on a hat block, mimicking tapestry-crochet texture.',
    verdict: 'pathB',
    why: 'Not crochet, and we are not pretending otherwise. Kept because its looper-and-spreader mechanism is directly borrowable for M4’s presenter, and because it is a credible commercial fallback.',
    scores: { topology: 1, wholehat: 4, circ: 5, dof: 4, mech: 4, ctrl: 4, tol: 4, colour: 5, yarn: 4, speed: 5, print: 3, cots: 4, cost: 3, patent: 2, start: 5 },
  },
];

export function weightedScore(a: Architecture): number {
  return CRITERIA.reduce((s, c) => s + (a.scores[c.key] ?? 0) * c.weight, 0);
}
export const MAX_SCORE = CRITERIA.reduce((s, c) => s + 5 * c.weight, 0);

export interface Experiment {
  id: string;
  name: string;
  objective: string;
  adds: string;
  pass: string;
  fail: string;
  eur: number;
}

export const LADDER: Experiment[] = [
  { id: 'P0', name: 'Yarn capture', objective: 'Catch and release yarn in the hook throat, repeatably.', adds: 'Needle + P axis + one yarn guide + ESP32', pass: '100/100 captures', fail: '<95/100', eur: 90 },
  { id: 'P1', name: 'Loop formation', objective: 'Draw one controlled loop, over and over.', adds: 'Tension dancer + encoder', pass: '100 loops, height σ < 0.5 mm', fail: 'σ > 1 mm', eur: 60 },
  { id: 'P2', name: 'Chain', objective: 'A repeatable crochet chain, and the first real metering data.', adds: 'Yarn-length metering', pass: '200-chain within ±3% of predicted; metering separates good from failed', fail: 'metering signal is noise', eur: 50 },
  { id: 'P3', name: 'Single targeted stitch — the crux', objective: 'One sc into a specific existing V, with no needle bed.', adds: 'Presenter + fixture holding a hand-made swatch', pass: '50/50 into a marked V', fail: '<40/50 → fall back to M3', eur: 120 },
  { id: 'P3b', name: 'V recapture', objective: 'Catch the freshly formed V while it is still tensioned.', adds: 'Presenter timing', pass: '50/50', fail: 'needs a trailing retention comb', eur: 20 },
  { id: 'P4', name: 'Repeated stitches', objective: 'Many identical stitches without drift; first real cycle time.', adds: 'C axis + indexing', pass: '100 sc, no drift', fail: 'drift > 1 stitch per 50', eur: 90 },
  { id: 'P5', name: 'Flat row + turn', objective: 'Prove row transitions.', adds: '—', pass: '5 rows × 20 st', fail: '—', eur: 30 },
  { id: 'P6', name: 'Closed round', objective: 'Work in the round on the former.', adds: 'Hat block + turntable + take-down', pass: '3 rounds × 60 st', fail: 'slip accumulates', eur: 180 },
  { id: 'P7', name: 'Colour change', objective: 'Mid-stitch changeover, the novelty claim.', adds: '4-yarn selector + 4 feeds', pass: '100 changes, ≤2 defects', fail: 'float pulls stitches tight', eur: 140 },
  { id: 'P8', name: 'Decrease', objective: 'Shaping in the machine’s own direction.', adds: '—', pass: '60 → 48 st over 2 rounds, no puckering', fail: '—', eur: 0 },
  { id: 'P9', name: 'Sidewall tube', objective: 'The 14 chart rounds at full width.', adds: 'Z axis', pass: '14 rounds × 100 st with the NORGE chart', fail: '—', eur: 60 },
  { id: 'P10', name: 'Brim + crown closure', objective: 'The full profile, both ends.', adds: 'R + B axes', pass: 'rim 144 → crown 10', fail: '—', eur: 130 },
  { id: 'P11', name: 'Complete bucket hat', objective: 'One wearable NORGE · Home.', adds: 'Integration + vision audit', pass: 'a hat', fail: '—', eur: 90 },
];

export interface BomLine { group: string; item: string; qty: string; eur: number; note: string }

export const BOM: BomLine[] = [
  { group: 'Ramme', item: 'Base plate, 2020 extrusion, plates, fasteners', qty: '1 set', eur: 100, note: 'Commodity. Flatness matters more than strength.' },
  { group: 'Bevegelse', item: '5× NEMA17, MGN12/MGN9 rails, T8 screws, GT2, bearings, turntable ring', qty: '1 set', eur: 225, note: 'The turntable bearing sets the machine’s concentricity — buy, never print.' },
  { group: 'Maskehode', item: 'Latch needles, spring steel, ceramic eyelets, presenter servo', qty: '1 set', eur: 70, note: 'Latch needles are ~€0.80 each off the shelf.' },
  { group: 'Garnvei', item: '4× feed roller + motor, 4× dancer, 4× AS5600, 4× photointerrupter', qty: '1 set', eur: 85, note: 'Active tension is what CroMat lacked for high-friction yarn.' },
  { group: 'Styring', item: 'Raspberry Pi 5, Octopus + 8× TMC2209, 24 V 350 W PSU, E-stop, wiring, endstops', qty: '1 set', eur: 220, note: 'Klipper: the Pi plans, the MCU steps.' },
  { group: 'Sensorer', item: 'Pi Camera 3 + LED ring', qty: '1', eur: 42, note: 'Fires once per round, not per stitch.' },
  { group: 'Kabinett', item: 'Enclosure panels + door interlock', qty: '1', eur: 55, note: 'The needle is sharp and fast.' },
  { group: 'Forbruk', item: '1.5 kg filament, DK cotton in 4 colours', qty: '—', eur: 75, note: '' },
];

export const BOM_TOTAL = BOM.reduce((s, b) => s + b.eur, 0);

export interface Risk { id: string; risk: string; likelihood: 'High' | 'Medium' | 'Low–Medium'; consequence: string; mitigation: string }

export const RISKS: Risk[] = [
  { id: 'R1', risk: 'The needle misses the target V', likelihood: 'High', consequence: 'The architecture fails', mitigation: 'Compliant presenter absorbs ±0.4 mm; C resolution is 8× the budget; P3 gates the whole build; documented fallback to M3.' },
  { id: 'R2', risk: 'The new V is not recaptured', likelihood: 'High', consequence: 'Next round has no target', mitigation: 'Recapture while the V is tensioned between needle and previous stitch; fall back to a short trailing retention comb.' },
  { id: 'R3', risk: 'The latch splits DK cotton on draw-through-2', likelihood: 'Medium', consequence: 'Fabric defects', mitigation: 'Polished/PTFE throat, tuned plunge speed, cotton vs acrylic tested at P2.' },
  { id: 'R4', risk: 'Fabric slips on the block and error accumulates', likelihood: 'Medium', consequence: 'Round misalignment', mitigation: 'Silicone surface, sprung take-down skirt, absolute re-registration once per round via the seam marker.' },
  { id: 'R5', risk: 'Colour float pulls the stitch tight', likelihood: 'Medium', consequence: 'Puckering', mitigation: 'Per-colour active tension; floats left loose, which the pattern explicitly permits.' },
  { id: 'R6', risk: 'Yarn breaks mid-hat', likelihood: 'Medium', consequence: '3000 stitches lost', mitigation: 'Photointerrupter halts within one stitch; splice and resume from the round checkpoint.' },
  { id: 'R7', risk: 'Yarn-length metering is too noisy to classify', likelihood: 'Medium', consequence: 'Loses the main verification signal', mitigation: 'Fall back to the optical loop sensor plus the per-round camera audit. Tested at P2, before we commit.' },
  { id: 'R8', risk: 'Printed parts flex under yarn tension', likelihood: 'Medium', consequence: 'Positional error', mitigation: 'Steel where it matters; no printed part on the critical tolerance path.' },
  { id: 'R9', risk: 'Cycle time far worse than 6 s/stitch', likelihood: 'Medium', consequence: '12 h+ per hat', mitigation: 'Acceptable for a prototype. Stated honestly; optimisation is post-P11.' },
  { id: 'R10', risk: 'Rim-first fabric looks visibly wrong', likelihood: 'Low–Medium', consequence: 'Product mismatch', mitigation: 'Hand-crochet a swatch in week one, for €0, before any CAD is cut.' },
];

export interface Claim { n: string; kind: 'independent' | 'dependent'; text: string; strength: 'strongest' | 'strong' | 'moderate' | 'weak' }

export const NOVELTY: Claim[] = [
  { n: 'N1', kind: 'independent', strength: 'strongest', text: 'Automated multi-yarn tapestry crochet in which colour changeover is executed between the first and the second draw-through of a single stitch. No automated crochet colourwork of any kind was found in patents, papers or industry sources.' },
  { n: 'N2', kind: 'independent', strength: 'strong', text: 'Rim-first inverted construction: a machine-formed chain ring cast-on followed by decrease-driven crown closure, eliminating the magic-ring start — which is precisely the operation Croche-Matic could not perform.' },
  { n: 'N3', kind: 'independent', strength: 'strong', text: 'A shaped rotating workpiece former used as the stitch-localisation datum, with the toolpath derived from the garment’s own per-stitch 3D model. Embroidery uses flat hoops; no crochet machine uses a shaped former.' },
  { n: 'N4', kind: 'dependent', strength: 'moderate', text: 'Yarn-length-per-stitch consumption metering as a deterministic stitch-success verification signal. Positive-feed tension measurement is well known; the per-stitch pass/fail use needs a focused search before it is claimed.' },
  { n: 'N5', kind: 'dependent', strength: 'moderate', text: 'Bed-free crochet: a compliant tapered presenter replacing a retention needle bed. Chainstitch spreaders are old art; applying one to crochet localisation may still be novel.' },
  { n: 'N6', kind: 'dependent', strength: 'weak', text: 'Programmable per-stitch loop height via plunge stroke. Probably anticipated — knitting machines have programmable stitch-cam depth. Do not claim independently.' },
];
