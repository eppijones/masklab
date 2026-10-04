import { at, cube, cyl, extrude, roundedRect, subtract } from '../cad/ops.ts';
import type { PartDef } from '../parts/types.ts';

// Independent manual experiment: these sockets are OPEN at the upper face.
// The old comb's blind internal pockets are not suitable for this experiment.
export const SOCKETS = [0.15, 0.25, 0.35, 0.45, 0.55].map((clearance, i) => ({
  x: (i - 2) * 20, y: -3, width: 8 + clearance, depth: 2.6 + clearance,
  bottom: 3.8, top: 8, clearance,
}));

export const FIT_RACK: PartDef = {
  id: 'fit-rack-r1', name: 'Gate socket calibration rack · R1', nameNo: 'Kalibreringsholder',
  kind: 'printed', group: 'comb', tracks: ['bench'], qty: 1,
  dims: { length: 120, width: 40, height: 8 },
  mount: { frame: 'base', position: [0, 0, 0] },
  build: d => subtract(
    extrude(roundedRect(d.length, d.width, 3), d.height),
    ...SOCKETS.map(s => at(cube(s.width, s.depth, 4.4), [s.x, s.y, 6])),
    // One to five shallow index dots identify each socket without a font dependency.
    ...SOCKETS.flatMap((s, i) => Array.from({ length: i + 1 }, (_, j) =>
      at(cyl(0.8, 0.7, 24), [s.x + (j - i / 2) * 2.5, 9, 7.7]))),
    ...[-52, 52].flatMap(x => [-12, 12].map(y => at(cyl(12, 2.25, 48), [x, y, 4]))),
  ),
  print: { material: 'PETG', layerMm: 0.2, walls: 4, infillPct: 30, supports: false,
    minWallMm: 1.2, slicedMinutes: null, slicedAt: null,
    orientationWhy: 'Flat bottom on the plate; five sockets and index dots face up. No supports inside sockets.' },
  note: 'Manual fit/yarn experiment only. Five sockets with 0.15–0.55 mm total clearance; not a stitch-spacing comb and not a motorised crochet machine.',
};

export const FIT_QTY: Record<string, number> = {
  'fit-rack-r1': 1, 'gate-6': 1, 'gate-7': 1, 'gate-7p5': 1, 'gate-8': 2, 'crochet-hook': 2,
};

export const FIT_STEPS = [
  { title: 'Slice and label the eight pieces', parts: Object.keys(FIT_QTY),
    body: 'Use millimetres and 100% scale. Print one rack, one each of the 6 / 7 / 7.5 mm gates, two 8 mm gates, and two hooks. Mark each gate with its throat width. The hook is a finish experiment, not an established replacement for a metal hook.',
    check: 'Preview every layer for unsupported islands. The rack sockets face upward. Record support/brim grams and print time from the slicer.' },
  { title: 'Measure the printed fit', parts: ['fit-rack-r1', 'gate-8'],
    body: 'Remove strings without enlarging the sockets. One dot is 8.15 × 2.75 mm; each next socket increases both dimensions by 0.10 mm. All sockets are 4.2 mm deep. Try the SAME gate in all five sockets; the gate tongue is nominally 8 × 2.6 × 4 mm below its shoulder.',
    check: 'Record measured tongue size and the smallest socket that seats by gentle finger pressure without rocking. Do not force a press fit. This test measures fit, not stitch capture.' },
  { title: 'Secure the rack and insert a gate', parts: ['fit-rack-r1', 'gate-8'],
    body: 'Clamp the rack to a bench using soft jaws, leaving the sockets accessible. Optional mounting holes are Ø4.5 mm on a 104 × 24 mm rectangle; choose screw length for your actual backing board. Insert one gate in the selected socket. The loose fit is intentional; keep it seated by hand during the experiment.',
    check: 'The rack stays fixed and the gate shoulder touches its top face. No motors or electrical parts are used.' },
  { title: 'Test one yarn loop and one draw-through', parts: ['gate-6', 'gate-7', 'gate-7p5', 'gate-8', 'crochet-hook'],
    body: 'Use a hand-crocheted swatch of the intended yarn. Manually place one stitch in an 8 mm gate; guide the hook through while holding the fabric. Try a yarn-over and draw-through by hand. Narrower gates are comparison samples: the existing 3 mm hook + two 2.1 mm yarn legs + 0.6 mm margin require 7.8 mm, so narrower variants are not expected to pass that assumed stack.',
    check: 'Record snagging, loop escape, splits, hook damage, yarn and hook measurements. Stop if yarn frays or the hook bends. Successful manual manipulation does not establish automatic crochet.' },
  { title: 'Record the comparison results', parts: [],
    body: 'Save printer model, nozzle, material, slicer profile, project file, grams, time, the fit measurements and a close-up video of the experiment. Repeat on at least 50 loops, recording failures rather than changing the result after the fact.',
    check: 'These results characterise the old gate concept only. They do not qualify the selected metal-tool, retained-stitch replacement. Follow the critical review for that development sequence.' },
];
