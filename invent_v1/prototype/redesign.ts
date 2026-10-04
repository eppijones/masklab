/** Engineering decisions, not a claim that the replacement is already validated. */
export const REDESIGN = {
  status: 'Selected direction for experiments; complete-machine CAD not frozen',
  decision: 'Retire the gate-wheel mechanism as the main development path. Build a constrained-stitch test platform with retained stitch positions, a controlled metal tool and measured yarn tension.',
  target: 'Keep a true-crochet, seamless bucket hat as the final target. A small flat swatch is an experiment toward that target, not a substituted finished product. A panel-and-seam route is an alternative only if acceptable to the owner.',
  reasoning: 'The dominant risk is loss of control over the yarn and stitch position, not how many parts fit on a printer. Spending time completing the old frame would lock us into its weakest assumption. First establish a repeatable stitch process, then design the geometry that carries it around the hat.',
  evidence: [
    { name: 'CroMat doctoral research · Storck, 2024', url: 'https://www.hsbi.de/publikationsserver/publication/4792',
      finding: 'Paired auxiliary needles retain the fabric. The tool has controlled shaft/slider motion and rotation. Printed auxiliary bars were rejected after friction and bending problems. The documented prototype uses ten axes; its trials do not validate our DK-cotton hat.',
      location: 'Sections 3.1.4–3.1.5 and 3.4; printed pp. 52–56, 89–94, 100–101. Full text inspected.',
      implication: 'Use this as a mechanism reference, not as a drop-in ten-axis parts list or a promise that a simpler clone will work.' },
    { name: 'Machine-producible crochet patterns · Storck et al., 2023', url: 'https://doi.org/10.14502/tekstilec.66.2023062',
      finding: 'The flat-bed process has specific shaping limits, including where increases and decreases can occur. Circular hand patterns cannot simply be sent to a flat-bed controller.',
      location: 'Introduction and pp. 265–267; paper and stitch-topology figure inspected.',
      implication: 'A panel-built hat needs a separate pattern compiler and changes the construction. It is not silently interchangeable with the current hat.' },
    { name: 'Active low-cost thread tensioning · Kellner et al., 2025', url: 'https://sciforum.net/paper/27696',
      finding: 'This CroMat project describes active feeding/retraction with a storage spring and load-cell feedback.',
      location: 'Author conference abstract, published 3 December 2025. Not a production reliability report.',
      implication: 'Measure tension through the whole stitch cycle and design slack management explicitly.' },
    { name: 'Loom-Based Mechanized Crochet · Smith et al., 2026', url: 'https://collaborate.princeton.edu/en/publications/loom-based-mechanized-crochet/',
      finding: 'The published abstract describes a robotic tool acting on a constrained fabric matrix.',
      location: 'Abstract only; SCF 2025 event, publication dated 18 February 2026. Full method and performance not verified.',
      implication: 'Additional support for investigating constrained fabric. No conclusion about affordable home-scale hat production follows from this abstract.' },
  ],
  options: [
    { name: 'Gate wheel + ten-gate comb', evidence: 'Existing CAD only; no successful yarn trials.', fit: 'Closest to the current rendering.', verdict: 'Retire as the main path', why: 'Passive stitch reacquisition, unclosed hook and missing retention/drive details compound each other.' },
    { name: 'Paired-needle flat test bed', evidence: 'Demonstrated mechanism family in CroMat; our implementation remains unbuilt.', fit: 'Strong platform for studying insertion, draw-through and transfer.', verdict: 'Selected experimental baseline', why: 'Makes yarn ownership observable and lets us test one operation at a time. Full tool sourcing and gauge adaptation remain necessary.' },
    { name: 'Retained-stitch circular carrier', evidence: 'Engineering proposal; circular transfer/increases not demonstrated here.', fit: 'Preserves the seamless-hat objective.', verdict: 'Later research branch', why: 'Every required stitch must stay indexed. Small crown radius, variable stitch count, transfer and removal need separate solutions.' },
    { name: 'Flat panels, joined into a hat', evidence: 'Flat shaped crochet is documented; this hat pattern is not implemented.', fit: 'Changes construction and introduces seams.', verdict: 'Potential first-product fallback', why: 'Avoids circular carrier development, but needs shaped-panel pattern conversion, joining instructions and acceptance of the changed hat.' },
  ],
  modules: [
    { name: 'Stitch storage', action: 'An exchangeable bed of paired metal holders; start with only enough positions to prove neighbouring-stitch transfer.', make: 'Print housing and adjustment fixtures; buy precision yarn-contact elements.', open: 'Exact needle SKU, gauge, stroke, clearance and yarn compatibility.' },
    { name: 'Working tool', action: 'Separate insertion, rotation and hook-closure functions. Track where each loop sits during each motion.', make: 'Buy polished metal tool and slider; print noncritical housings.', open: 'Available compound tool or equivalent controlled closure; tool supplier drawing.' },
    { name: 'Yarn system', action: 'Measure tension, feed yarn and take back slack. Start with one colour and one measured yarn.', make: 'Buy ceramic guides, sensor, bearings and motor; print guides/housings.', open: 'Required tension range, sensor resolution, feed travel and response time.' },
    { name: 'Fabric control', action: 'Defined cast-off edges and adjustable take-down keep the work in the working plane.', make: 'Smooth bought or machined contact surfaces; printed mounts.', open: 'Forces, edge geometry, clearance during transfer and finished-fabric removal.' },
    { name: 'Motion and frame', action: 'Use supplier-dimensioned rails/stages. Choose axis count from the proven stitch sequence.', make: 'Metal load paths and guides; printed brackets where tolerances permit.', open: 'No axis count, torque, speed or full frame size is released yet.' },
    { name: 'Controller and recovery', action: 'Local motion limits and stop chain. Verify transfers before advancing; stop for ambiguous state.', make: 'Standard controller/driver platform and documented harness.', open: 'Controller capacity, wiring, fault response and recovery tests; no deployable firmware exists yet.' },
  ],
  milestones: [
    { title: 'Characterise the actual yarn and tool', deliverable: 'Measured yarn/hook dimensions, gauge swatch, available tool drawing and printer profile.', pass: 'A supplier-backed tool and clearances compatible with the intended yarn; no reliance on nominal yarn diameter alone.' },
    { title: 'Manual retained-stitch cell', deliverable: 'Dimensioned fixture, clamp/holder detail and video of the complete stitch and retention transfer.', pass: 'One true single crochet repeatedly completed with traceable loop ownership; record all failures and forces. Operator performs unmotorised motions.' },
    { title: 'Powered cell and neighbouring stitches', deliverable: 'All mating parts, wiring, homing, tool closure, tension feedback, firmware and an operation log.', pass: 'At least 50 consecutive stitches as an initial development gate, then multiple rows with no manual loop placement between stitches. This is not production qualification.' },
    { title: 'Faults and longer runs', deliverable: 'Tests for loop loss, snagging, yarn break, stalled motion, sensor failure and restart.', pass: 'Safe, observable stop with the last verified state retained; sustained run and material-change tests. Report per-operation failure/recovery rates.' },
    { title: 'Choose and prove the hat transport', deliverable: 'Circular retained-stitch transfer prototype, or separately accepted shaped-panel plan.', pass: 'For seamless hats: complete rounds, round transitions, increases and removal are physically demonstrated before full CAD release.' },
    { title: 'Full manufacturing release', deliverable: 'Complete native CAD and exchange models, every fastener/shaft/guard, tolerance drawings, purchased SKUs, verified plate profiles, final quote and illustrated assembly/wiring guide.', pass: 'A physical single-colour hat passes the chosen dimensions and stitch checks. Add multicolour operation only after reliable yarn selection and strand control.' },
  ],
};

/** Idealised independent, identical stitch trials; not a prediction of this machine. */
export function reliability(stitchSuccess:number, stitches:number, targetHatSuccess=.95) {
  const requiredPerStitch=Math.pow(targetHatSuccess,1/stitches);
  return { hatSuccess: Math.pow(stitchSuccess,stitches), requiredPerStitch,
    zeroFailureTrialsFor95LowerBound: Math.ceil(Math.log(.05)/Math.log(requiredPerStitch)) };
}
