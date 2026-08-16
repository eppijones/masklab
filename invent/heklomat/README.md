# HEKLOMAT-1 — invention dossier

A self-contained evaluation package for an automated crochet machine that produces the
StrikkeApp bucket hats. Nothing here touches the main app; it is additive and standalone.

## Open it

The repo already has a static-server launch config (`concept-static`, port 8899):

```bash
python3 -m http.server 8899 --bind 127.0.0.1
```

Then open **http://127.0.0.1:8899/invent/heklomat/**

| Page | What it is |
|---|---|
| `index.html` | Hub — the pitch, cost table, and the one idea that makes it work |
| `patent.html` | Patent application: prior art, 7 SVG figures, 18 claims (4 independent) |
| `guide.html` | IKEA-style build manual: 15 steps, NOK shopping list, print plan, calibration |
| `parts.html` | All 21 printable parts in a 3D viewer with print settings + STL downloads |
| `simulation.html` | The machine crocheting a real hat, 1× realtime → 600×, all 8 patterns |

## Regenerating the generated files

Two build steps; both are one-time and their outputs are committed.

**Pattern data** (`data/patterns.js`, `tools/.profile.json`) — run from the repo root, uses the
main app's toolchain to read `src/patterns/`:

```bash
npx tsx invent/heklomat/tools/dump-patterns.ts
```

**STL parts** (`stl/*.stl`, `data/parts.js`) — isolated toolchain, does not touch the app's
`package.json`:

```bash
cd invent/heklomat/tools && npm install && npm run stl
```

The STL build hard-fails if any part is not a closed 2-manifold, has degenerate triangles, or
exceeds 250 mm on any axis (Bambu Lab X1 Carbon build volume is 256³).

## How it hangs together

`src/patterns` → **dump** → `data/patterns.js` (run-length) → `js/opcode.js` (typed arrays,
one entry per stitch — this *is* the machine program) → `js/simclock.js` (8 s/stitch, +4 s per
color change) → `js/machine.js` + `js/hatgrowth.js` → `js/sim-main.js`.

Scene state is a pure function of `simTime`, which is why speed changes, pausing and scrubbing
all stay in sync for free, and why the clock the simulation shows is the clock the real machine
would take: 7–10 hours per hat.
