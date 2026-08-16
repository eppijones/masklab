# HATTEBLOKK — automated crochet bucket-hat machine

R&D sub-project. **Nothing outside `invent/` is created or modified.**

## Run it

From the repo root (`StrikkeApp/`):

```bash
./node_modules/.bin/vite --config invent/vite.config.ts
```

Then open <http://localhost:5273>. Build with `vite build --config invent/vite.config.ts`
(output lands in `invent/dist/`). Type-check with `npx tsc -p invent/tsconfig.json --noEmit`.

## Never run `npm install` in this directory

`invent/` has **zero dependencies** by design and resolves react, three, `@react-three/*`,
vite and typescript by walking up to the parent repo's `node_modules`. Installing here
creates `invent/node_modules` and therefore a second copy of React (→ "invalid hook call")
and a second copy of THREE (→ every `instanceof` fails, the R3F catalogue splits). A
`preinstall` guard blocks it.

The `package.json` must still exist: without it, Vite resolves `cacheDir` against the
nearest package.json and writes into the **parent's** `node_modules/.vite` — a write
outside `invent/`, and a collision with the parent dev server.

## Layout

| Path | What |
|---|---|
| `machine/` | **Source of truth.** `units.ts` (stitch→mm, and the former profile derived from stitch counts), `axes.ts` (8 DOF + frame chain), `cycle.ts` (per-axis keyframes for one fastmaske), `kinematics.ts` (forward kinematics), `program.ts` (progress → axis values), `parts.ts` (parametric part library) |
| `cad/` | Geometry primitives. Everything is built additively — no CSG library is installed, so the cutaway uses `THREE.Plane` clipping |
| `twin/` | The digital twin. Parts ride axis frames, so the animation cannot show motion the machine could not perform |
| `app/` | Shell, hash router, 14 sections, `DataTable` (the only table markup in the project) |
| `data/` | Prior art, architectures, BOM, experiments, risks, novelty claims — typed arrays rendered by generic components |

## Coupling to the parent app

`app/**` and `twin/**` may use **`import type` only** from `../src` — type imports are
erased at build, so Vite's `fs.allow` never sees them. Runtime imports from `../src` belong
only in `invent/scripts/*`, which run under the parent's `tsx`. Leaving `server.fs.allow` at
its default makes an accidental runtime import fail loudly rather than silently welding this
deliverable to the parent product.

## Status

Phase 1 (twin) is built. Phase 2 replaces the inlined round schedule in `machine/units.ts`
with compiler output from a frozen snapshot of the app's `derivePattern()`, and wires the
real per-stitch colours into the workpiece.
