# invent/ — archived concept dossiers

Four independent designs for a machine that crochets the MASKLAB bucket hats.
All four are **superseded by `invent_v1/`**, which merges the two best ideas.
They are kept because each one proved something the successor relies on.

> **Do not deploy these publicly.** They contain unfiled patent disclosures, and
> Norway follows the EPC — which has no grace period. Publishing destroys the
> novelty on the day it goes up. `invent` and `invent_v1` are both in
> `.vercelignore` for this reason.

| Folder | Machine | What it contributed | Why superseded |
|---|---|---|---|
| [`heklomat/`](heklomat/) | **HEKLOMAT-1** — 8-tooth stitch-presentation wheel on a rotating hat mandrel | The only dossier that shipped a buildable package: 21 watertight STLs, an illustrated 15-step manual, a Norwegian shopping list, a realtime simulation and a working 3D parts viewer. Its manifold-3d STL toolchain is the direct ancestor of `invent_v1/tools`. | The wheel still lifts loops out of relaxed fabric — it presents, but never *holds*. No bench-test gate, and its BOM dropped the fuse and E-stop. |
| [`heklo/`](heklo/) | **HEKLO** — closed chain of printed stitch gates, one per live stitch | The best mechanism of the four: every live stitch mouth clamped open in a printed throat at a known pose. Also the best process — a €305 bench ladder with an explicit kill gate at P2. | Ships zero printable files, and needs 180 identical gates plus an injector that must add a link in 0.6 s without dropping a neighbour. |
| [`hatteblokk/`](hatteblokk/) | **HATTEBLOKK** — rotating hat block, compliant V-presenter, worked rim-first | The best engineering method: seven architectures scored before choosing, every claim tagged by evidence strength, a ten-risk register, documented fallbacks, and a patent section that marks one of its own claims as probably anticipated. Its rim-first self-start is still the v2 path. Its rule *no printed part on the critical tolerance path* is carried into `invent_v1`. | Never got past phase 1. No STLs, no build manual — and its own risk register rates the compliant presenter's core assumption as High likelihood of failure. |
| [`heklomat-draft/`](heklomat-draft/) | HEKLOMAT-1, earlier draft | Its BOM is the only one that budgeted a fuse, XT60 and 16 AWG wire. That line is carried forward. | Strictly dominated by `heklomat/`: 7× coarser meshes, three parts with open edges, and a simulation that renders black. |

## What `invent_v1` takes from them

The successor puts HEKLO's gate throat **on** HEKLOMAT's wheel tooth, and adds a
fixed ten-gate retention comb so the wheel picks up from a known pose instead of
from relaxed fabric. That deletes HEKLO's injector and its 180-gate print run,
and gives HEKLOMAT the deterministic hold it lacked.

## Running them

All four still work. From the repo root:

```bash
./node_modules/.bin/vite --config invent/hatteblokk/vite.config.ts   # :5273
```

```bash
./node_modules/.bin/vite --config invent/heklo/vite.config.ts        # :5373
```

`heklomat/` and `heklomat-draft/` are static — serve the repo root and open
`/invent/heklomat/` or `/invent/heklomat-draft/`:

```bash
python3 -m http.server 8899 --bind 127.0.0.1
```

Never run `npm install` inside any of these folders. They resolve react, three
and vite from the parent repo by design; a second copy of React causes an
"invalid hook call" and a second copy of THREE breaks every `instanceof`. A
`preinstall` guard blocks it.
