# HEKLOMAT RO RO RO — R2-RO

This is a local manufacturing **development** workspace, not a released working
crochet machine. It preserves the older geometry for inspection and supplies a
new, dimensioned manual gate-fit rack. The user authorized publishing the workshop at https://masklab.vercel.app/heklomat on 4 October 2026. Publishing does not certify the machine.

The Norwegian web interface is organised around **one complete machine**:
Maskinen, 3D-print, Innkjøp, and Bygg og tid. It opens the whole V1 reference assembly,
uses the full 74-piece inventory for costing, and keeps the old research and
experiment files in the technical archive. The assembly page describes the
whole build's outstanding work; it is not a released step-by-step guide.
The full-job slicer import uses `scope: "full"` and `quote-whole-machine.json`.

The owner selected automatic operation, allowed necessary bought components,
and confirmed a Bambu Lab X1 Carbon. A 0.4 mm nozzle remains an assumption.
The whole-hat viewer follows all 3,294 recipe stitches across 38 rounds, with
play/pause, scrubbing and crown/wall/brim selection. Its stitch symbols are not
interlinked yarn geometry. The table turns to illustrate the recipe order;
the unqualified hook/head is deliberately not shown executing a stitch.

The linked stitch lesson magnifies a regular single crochet into six manually
steppable stages, including one/two/one loops and advance color selection on the
last pull-through. Clicking the first RO chart moves the whole-hat cursor to the
same stitch; completing the lesson adds one stitch there. Paths are deliberately
separated for instruction, not yarn physics or actuator instructions. A dashed
orange line shows the unresolved gap between the current CAD hook and workpoint.
Exterior chart orientation has a regression check for the reported mirror defect.

`x1-reference-slice.json` records a local Bambu Studio 02.08.02.61 prediction:
74 copies on 22 plates, 1,409.53 g and 47.0458 hours. Each part type is a separate
job, with generic PETG/PLA/TPU, Textured PEI, original per-part layers/walls/infill,
automatic normal supports and automatic brim. The solid hook uses the supported
zig-zag infill enum. These are calculations, not physical printing results.
Startup purging, drying, plate changes, cleanup and failed prints can add material
or time. The layout is not optimized across different part types.
At the site's reference prices the material is 231.41 NOK before, or 277.70 NOK
after, the selected 20% allowance. Printer/worker rates and shipping are extra.
The site uses this report only when all quantities and STL hashes match.

To reproduce with an official macOS Bambu Studio application:

```sh
python3 invent_v1/prototype/slice-x1.py /absolute/path/BambuStudio.app
```

No printer connection, upload or print command is made. Detailed sliced 3MFs,
flattened profiles and logs stay in the ignored local `research/x1-slicing`
folder; they are review data, not a machine manufacturing release.

From the repository root:

```sh
./node_modules/.bin/tsx invent_v1/prototype/build.ts
./node_modules/.bin/tsx invent_v1/prototype/verify.ts
./node_modules/.bin/tsc -p invent_v1/prototype/tsconfig.json
python3 invent_v1/prototype/package.py
./node_modules/.bin/vite --config invent_v1/prototype/vite.config.ts
```

Open http://127.0.0.1:5573. Existing root dependencies and the isolated
`invent_v1/tools/node_modules/manifold-3d` installation are used. Do not install
another React/Three copy here. For a static build:

```sh
./node_modules/.bin/vite build --config invent_v1/prototype/vite.config.ts
```

`public/DESIGN-REVIEW.html` is the portable critical review and redesign decision.

`public/fit-kit-r1.zip` is the optional old-geometry print/measurement handoff. It includes eight
copies from six STL shapes, a geometry-only 3MF layout, instructions and a
measurement form. The friend must select a printer profile and inspect slicing;
no printer commands or verified time predictions are supplied.

`public/design-review-r1.zip` contains all 28 STL shapes, design-space geometry,
the manifest, findings, provisional purchases, legacy fastener demand and source
CAD. These reference files are **not** ready for building the full machine.
The source snapshot is intended for this repository; it is not a standalone
dependency installation. Read `DESIGN-REVIEW.html` first.

## Critical redesign decision

The gate-wheel route is retired as the main development path. `redesign.ts`
records the evidence and selects a retained-stitch test platform, polished metal
working elements with controlled closure, and measured yarn feeding/retraction.
The existing 37.6 g gate kit remains an optional comparison experiment only.
The seamless true-crochet hat target remains; the replacement full-machine CAD,
BOM and firmware are not yet defined. The 9,379 NOK old purchase allowance must
not be presented as the price of this redesign.

## What changed in the approach

- Check the artifact bytes, socket accessibility and actual CSG interference,
  rather than accepting metadata fit declarations as mechanical evidence.
- Separate a manual experiment from the complete-machine manufacturing release.
- Show installed quantities, spares, source prices, historical allowances and
  missing designs separately. The full quote uses proposed quantities, not the
  old inconsistent print count.
- Accept a slicer's **whole plate** grams/time with exact quantity reconciliation.
  Supports and purge are counted once. Without complete plate coverage, the
  print-job total is unknown.
- The old assembled scene remains explicitly a spatial reference. Bought parts
  are bounding envelopes; the scene is not collision-verified or assembly-complete.

## Release limits

Thirteen open engineering items are described in `engineering.ts` and the UI.
The old platter/hub bolt circles disagree, bench-comb sockets are enclosed,
the hook points 90 degrees across its insertion axis, wheel retention and linear-drive attachments are incomplete, and machine
firmware and physical stitch evidence are absent. The old 243-check suite does
not cover these failures. Passing its checks cannot release this machine.

The new rack has five **open** sockets: 8.15/8.25/8.35/8.45/8.55 mm wide and
2.75/2.85/2.95/3.05/3.15 mm deep in XY, with a 4.2 mm insertion depth. One to five
dots identify them. Its nominal gate tongue measures 8 × 2.6 mm and protrudes
4 mm below the shoulder. The digital fit has been tested; physical print
shrinkage, wear and yarn handling are not established. It is a loose-fit
comparison fixture, not a retained gate mount for powered operation.

CAD-derived grams are a rough shell/infill estimate using nominal material
densities and a 0.4 mm nozzle assumption. No claimed error interval is justified.
They omit supports, brims, purge and failures. PETG's retrieved reference price
is 158 NOK/kg; other material rates are editable budget assumptions. The 9,379
NOK purchase subtotal is incomplete, mostly historical and excludes 12 open
lines, printing, delivery, redesign and labour. It is not the price of a
functioning machine.

The physical nozzle, available filament, charging model, physical yarn measurements
and intended first demonstration still need to be confirmed. Slicing uses the X1's
official 256 mm bed and its front-left exclusion. Progression is tool/yarn characterisation → retained one-stitch station → repeatable
stitches → closed round → increases → full single-colour hat → colour changes.

No STEP/B-rep, production drawings, electrical schematic, firmware release or
complete assembly package is claimed. CSG TypeScript is the editable CAD source.
The historical R&D-only restriction was superseded by the owner’s explicit publication request. The patent attachment is an unfiled historical draft, not an issued patent. Public disclosure can affect patent rights.

## Ownership and handover

- Øyvind: 3D printing on the Bambu Lab X1 Carbon.
- Espen: filament costs, bought components and yarn. Other operator fees are not agreed.
- Assembly: Espen alone, or Espen and Øyvind together.
- Target: canonical RO RO RO, 56 cm, 4 mm hook, 38 rounds, 3,294 stitches, 385 color changes.
- Hat-time example: 6 seconds/stitch + 2 seconds/color change + 20 minutes = 6.0372 hours. Not measured throughput.
- `heklomat-oyvind-printpakke.zip`: only the 22 current part models, with quantities totaling 74 copies, print overview and current geometry hashes.
- Pattern colors are checked against `src/data/pattern.ts`; the three former meshes use RO RO RO rings.
- The full machine remains unqualified: 13 recorded issues, no tested controller, no demonstrated full hat. Never remove this status based on rendering or slicing alone.

Public routes: `/heklomat/#maskinen`, `#print`, `#innkjop`, `#bygg`, and `#del/<part-id>`.
The root app is unchanged. `public/heklomat` is a generated standalone bundle, served by explicit Vercel routes.

After changing source, run from the repository root:

```sh
./node_modules/.bin/tsx invent_v1/prototype/build.ts
# If geometry changed, run slice-x1.py against an official BambuStudio.app.
./node_modules/.bin/tsx invent_v1/prototype/verify.ts
./node_modules/.bin/tsc -p invent_v1/prototype/tsconfig.json
python3 invent_v1/prototype/package-oyvind.py
python3 invent_v1/prototype/package.py
node scripts/build-heklomat.mjs
npm run build
```

The chat can be archived after commit/push and production verification. The source, print inventory, patent attachment, constraints and build instructions remain in Git; the public page does not depend on the local preview server.
