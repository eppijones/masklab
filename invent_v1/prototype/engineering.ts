import { PART_BY_ID } from '../parts/registry.ts';
import { AXIS_BY_ID } from '../machine/axes.ts';
import { applyPoint, rotationEulerDeg } from '../machine/mat4.ts';

export function hookInsertionAngleDeg() {
  const direction = applyPoint(rotationEulerDeg(PART_BY_ID['crochet-hook'].mount.rotationDeg ?? [0,0,0]), [0,0,1]);
  const axis = AXIS_BY_ID.P.frame.axis;
  const dot = direction.reduce((sum, n, i) => sum + n * axis[i], 0);
  return Math.acos(Math.max(-1, Math.min(1, dot / Math.hypot(...direction) / Math.hypot(...axis)))) * 180 / Math.PI;
}

export interface Finding { id: string; title: string; evidence: string; action: string; parts: string[] }
export function audit(): Finding[] {
  const p = PART_BY_ID;
  const platterR = p.platter.dims.dia / 2 - 18;
  const hubR = p['hub-adapter'].dims.od / 2 - 12;
  const findings: Finding[] = [];
  if (Math.abs(platterR - hubR) > 0.1) findings.push({ id: 'MECH-01',
    title: 'Platter and hub bolt circles do not meet',
    evidence: `The actual CAD cutters put six platter holes on radius ${platterR} mm and six hub holes on radius ${hubR} mm: ${Math.abs(platterR - hubR)} mm radial mismatch. The legacy fit checks omit this pair.`,
    action: 'Redesign both around the selected bearing and shared bolt pattern, including a centring register, stack height and fastener engagement.', parts: ['platter', 'hub-adapter'] });
  const needed = p['comb-arc'].dims.gates + p['wheel-hub'].dims.teeth;
  if (p['gate-8'].qty < needed) findings.push({ id: 'QTY-01', title: 'The nominal gate quantity is short',
    evidence: `The full comb needs ${p['comb-arc'].dims.gates} gates and the wheel ${p['wheel-hub'].dims.teeth}; the old registry supplies ${p['gate-8'].qty}. At least ${needed} installed gates are needed, before spares.`,
    action: 'Use 18 installed + 2 spares in the provisional full-machine quote; choose the final throat only after yarn trials.', parts: ['gate-8', 'comb-arc', 'wheel-hub'] });
  const d = p['comb-segment'].dims;
  const theta = d.rowTilt * Math.PI / 180;
  const pocketTop = d.h / 2 + d.rowDz / 2 + 3.5 * Math.cos(theta) + d.seatD / 2 * Math.sin(theta);
  if (pocketTop < d.h) findings.push({ id: 'MECH-02', title: 'Bench comb gate pockets are buried',
    evidence: `Even the upper pocket reaches only Z=${pocketTop.toFixed(2)} mm inside the ${d.h} mm tall comb. Only the small ejector holes reach the top; an 8 × 2.6 mm gate tongue cannot enter from above.`,
    action: 'Use the new open-top calibration rack for initial measurements. Redesign the working comb sockets before assembly.', parts: ['comb-segment'] });
  return [...findings,
    { id: 'KIN-01', title: 'Hook shaft is crosswise to its insertion axis', evidence: `The hook shaft is modelled along local Z, then mounted with a 90-degree X rotation. Its direction is ${hookInsertionAngleDeg().toFixed(1)} degrees from the P insertion axis. Translating P therefore sweeps the hook sideways rather than driving the tip along its shaft.`, action: 'Redesign hook and collet together around a shared tool centreline; verify the tip path, tool closure and collision clearance through the actual stitch cycle. Do not fake this movement in an animation.', parts: ['crochet-hook', 'hook-collet'] },
    { id: 'GEOM-01', title: 'Several intended through-holes end inside the solid', evidence: 'bore() creates a centred cutter, while platter and hub bodies are extruded upward from Z=0. The platter cutter ends at Z=8 inside its 10 mm body; the hub cutter ends at Z=7 inside its 8 mm body. Their bolt passages retain 2 mm and 1 mm roofs. These solids still pass watertight-mesh checks.', action: 'Retire these interfaces with the wheel design. For any reused part, test a full fastener/tool insertion path against actual CSG and measured hardware.', parts: ['platter', 'hub-adapter'] },
    { id: 'ARCH-01', title: 'A ten-stitch comb does not locate an entire round', evidence: 'A roughly 100-stitch round exceeds the ten comb positions. V1 has no demonstrated transfer sequence that keeps each future insertion point located until the next round reaches it. A mesh or timed animation cannot fill this gap.', action: 'Replace passive reacquisition with retained stitch positions. Prove insertion, loop formation and transfer on a short needle bed before designing circular storage.', parts: ['comb-arc', 'wheel-tooth', 'gate-8'] },
    { id: 'YARN-02', title: 'Hook closure and yarn retraction are missing control functions', evidence: 'The V1 hook is permanently open. Its dancer is a passive arm; there is no measured yarn-tension loop or commanded slack take-up. Their adequacy for repeated draw-through is an untested assumption.', action: 'Evaluate a polished metal compound tool with controlled closure and rotation, plus measured feeding/retraction. Establish tool/yarn compatibility physically before freezing dimensions.', parts: ['crochet-hook', 'tension-dancer', 'yarn-finger'] },
    { id: 'EVID-01', title: 'Existing odds and cycle times are not experimental results', evidence: 'The prior one-percent completion figure is a product of subjective stage probabilities. Timing is programmed into a simulation. Neither is a measured chance or speed of this machine.', action: 'Record trial counts, failure modes, actual cycle times and recovery outcomes. Report assumptions explicitly; do not use simulated timing or invented odds as a purchasing argument.', parts: [] },
    { id: 'MECH-03', title: 'Wheel retention and bearings need a complete design', evidence: 'The existing tooth and wheel hub have no shared mounting contract. Shaft supports, positive torque transfer, pulley geometry and belt tensioning are not fully modelled.', action: 'Specify bought shaft/bearings/pulleys, CAD each support and retainer, then check the swept volume against the comb.', parts: ['wheel-tooth', 'wheel-hub', 'nema17-mount'] },
    { id: 'MECH-04', title: 'Linear drives and yarn-over actuator are incomplete', evidence: 'The legacy hardware picture uses rail/motor envelopes. It does not contain a complete Z/R/P bearing, lead-nut, coupling, endstop and carriage attachment chain. The yarn finger also needs its actuator and mount.', action: 'Freeze exact supplier drawings and model every load-bearing interface before issuing assembly instructions.', parts: ['hook-collet', 'rail-bracket', 'column-bracket', 'yarn-finger'] },
    { id: 'CTRL-01', title: 'No deployable machine controller exists', evidence: 'HKP/1 is a protocol and simulated transport. The repository does not provide tested ESP32 motion firmware, a complete wiring drawing, homing, or an integrated detector.', action: 'Implement and bench-test homing, travel limits, sensor faults, stop/reset behaviour and one measured stitch cycle. Size the DC power system from the selected loads.', parts: [] },
    { id: 'YARN-01', title: 'Automatic crochet has no physical evidence', evidence: 'Rendered motion and watertight meshes do not demonstrate stitch capture, loop retention, draw-through, round transfer, increases or colour changes.', action: 'Record fit trials, then a single stitch, 50 consecutive stitches, a closed round, increases, one complete single-colour hat, and finally colour changes.', parts: ['gate-8', 'crochet-hook', 'comb-arc', 'turret-drum'] },
    { id: 'MFG-01', title: 'X1 Carbon selected; manufacturing profile is not qualified', evidence: 'The owner confirmed Bambu Lab X1 Carbon. A 0.4 mm nozzle is assumed, not confirmed. Material brand, shrinkage, supports and physical fit remain unqualified. The 256 mm bed also has a front-left exclusion in its default profile.', action: 'Slice and inspect each plate using explicit profiles and retain support-inclusive grams/time. Check fit physically before releasing mating parts. Slicing old CAD does not resolve its mechanical defects.', parts: ['platter', 'mandrel-brim'] },
  ];
}

// A proposal for costing, not released assembly quantities. Excludes the fit kit.
export const FULL_QTY: Record<string, { installed: number; spare: number }> = {
  'gate-8': { installed: 18, spare: 2 }, 'wheel-tooth': { installed: 8, spare: 1 },
  'crochet-hook': { installed: 1, spare: 4 }, 'hook-collet': { installed: 1, spare: 1 },
  'rail-bracket': { installed: 2, spare: 0 }, 'nema17-mount': { installed: 6, spare: 0 },
  'camera-pod': { installed: 1, spare: 0 }, 'tension-dancer': { installed: 4, spare: 0 },
  'yarn-finger': { installed: 1, spare: 1 }, 'swift-base': { installed: 4, spare: 0 },
  'swift-spindle': { installed: 4, spare: 0 }, 'swift-guide': { installed: 4, spare: 0 },
  'mandrel-crown': { installed: 1, spare: 0 }, 'mandrel-wall': { installed: 1, spare: 0 },
  'mandrel-brim': { installed: 1, spare: 0 }, 'platter': { installed: 1, spare: 0 },
  'hub-adapter': { installed: 1, spare: 0 }, 'comb-arc': { installed: 1, spare: 0 },
  'wheel-hub': { installed: 1, spare: 0 }, 'turret-drum': { installed: 1, spare: 0 },
  'takedown-skirt': { installed: 1, spare: 0 }, 'column-bracket': { installed: 2, spare: 0 },
};
