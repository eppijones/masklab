# HEKLO — gate-chain crochet engine

Isolated R&D site. **Nothing outside `invent/heklo/` is created or modified.**
Ignore the sibling dossiers in `invent/`. This is a different machine.

## Run

From the repo root (`StrikkeApp/`):

```bash
./node_modules/.bin/vite --config invent/heklo/vite.config.ts
```

Open <http://localhost:5373>

- `#/twin` — kinematics-driven 3D previs (seed → brim)
- `#/patent` — draft invention disclosure (not filed)
- `#/guide` — IKEA-style assembly
- `#/proof` — BOM, what the sim proves, garage kill-criteria

## Never run `npm install` here

Packages resolve from the parent `node_modules`. A `preinstall` guard blocks installs so you do not get a second copy of React or THREE.

## Snapshot hats

```bash
./node_modules/.bin/tsx invent/heklo/scripts/snapshot-hats.ts
```

Reads parent pattern data once, writes `invent/heklo/data/hats.json`. Runtime never imports `src/`.

## Honesty

The twin proves topology, axis motion, cycle time and a parts list. It does **not** prove cotton-on-latch friction. See `#/proof`.
