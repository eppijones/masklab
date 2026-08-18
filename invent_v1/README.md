# HEKLOMAT V1 — gate-wheel crochet machine

The live design. Supersedes all four dossiers in [`../invent/`](../invent/).

**Start here:** open `index.html` — what to print, what to order, and what to do
with it, in the order the work actually happens.

> **Do not deploy this publicly before a patent is filed.** Norway follows the
> EPC, which has no grace period, so publishing the disclosure destroys its own
> novelty on the day it goes up. `invent` and `invent_v1` are both in
> `.vercelignore`.

## The idea

HEKLO's printed **gate throat** — which clamps a stitch mouth open at a known
pose — mounted on HEKLOMAT's recirculating **wheel tooth**, plus a fixed
**retention comb**. The tool is a **printed hook**: the gate does the job a
latch needle would, so there is no needle, nothing sharp, and no soldering
iron anywhere in the build.

The comb is what makes the merge work. On a wheel alone, each gate releases its
loop once the hook passes and the fabric relaxes, so the next round's pickup is
a search again — which is HEKLOMAT's original unsolved problem. A fixed comb
holds the last ten stitch mouths open so the wheel picks up from a known pose.
Ten gates, no chain, **no injector** — HEKLO's most failure-prone mechanism is
deleted outright rather than improved.

This does not make insertion solved. It reduces the precision demanded at every
step and removes the two mechanisms most likely to kill each parent design.
Whether a printed throat holds a cotton V for thousands of stitches is exactly
what the bench rig exists to find out.

## Nothing bought for the test is wasted

The bench rig **is the station module of the finished machine**, built first and
run standalone. The carriage, latch drive, camera, LED, thermal sensors, ESP32,
drivers and PSU all migrate into the full build untouched. The only bench-only
parts are printed. Every BOM line carries `usedInFull`, and the harness fails
if a bench purchase is not reused.

## Speed and fire are one problem

Cycle rate *is* duty cycle, and duty cycle makes heat. So speed is not a
constant in the program — it is **governed by measured temperature**.

| Layer | What it does |
|---|---|
| Passive | DC fuse, latching E-stop in the motor line, smoke alarm above the machine |
| Firmware | Hard cutout at 70 °C motor / 85 °C driver, **locally**, no host round-trip |
| Host | Trend monitoring and the governor: hot → slower, headroom → faster |

For a NORGE hat (3 694 stitches, 1 328 colour changes): **9 h 48 m** cautious,
**5 h 28 m** target, **3 h 43 m** mechanical ceiling. The machine finds its own
safe maximum and stays there. The time is a result, not a promise.

A disconnected thermistor reads open circuit, and open circuit is treated as a
fault — never as "cold". That is how a thermal cutout silently stops existing.

## The odds, up front

`machine/reliability.ts` is the honest answer to "will this work", as a chain of
stage gates with a probability and a cost-at-risk each. It multiplies out to
about **1%** for a finished hat — which is what a first-of-its-kind mechanism
nobody has tested on yarn deserves. The useful number is the other one: **320 kr
and an evening** answers gate G0, the question every predecessor design skipped.

Test order is now cheapest-question-first. G0 uses printed gates, hand-crocheted
cotton and no motors at all.

## Commands

```bash
./node_modules/.bin/tsx invent_v1/scripts/verify.ts
```

The gate. 243 checks across nine groups: STL geometry re-parsed from the bytes,
part-to-part fit, Norwegian sourcing, guide fastener reconciliation, the derived
frame graph, the machine program against all 8 hats, protocol round-trips, and a
simulator conformance run. Run it before you print, order, or believe anything.

```bash
./node_modules/.bin/vite --config invent_v1/vite.config.ts
```

Dev server on `http://localhost:5473`. **Do not add `--host`**: WebSerial needs
a secure context, `localhost` qualifies and a LAN address does not, and
`navigator.serial` simply vanishes — which looks exactly like a broken Connect
button.

```bash
cd invent_v1/tools && npm install && npm run stl
```

Regenerates `stl/`, `data/twin-meshes/` and `data/parts.build.json`. All or
nothing: nothing is written unless every part passes validation.

```bash
./node_modules/.bin/tsx invent_v1/scripts/snapshot-hats.ts
./node_modules/.bin/tsx invent_v1/scripts/build-site.ts
```

One-way snapshot of the parent app's 8 patterns, then the static page.

## Layout

| Path | What |
|---|---|
| `machine/` | Source of truth. Units, axes, **derived** frame chain, thermal limits and the speed governor. Dependency-free so the browser, the STL builder and the harness can all import it. |
| `cad/` | The solid IR and its two evaluators. A part declares a shape; manifold evaluates it for print, three for the twin. |
| `parts/` | The registry. One declaration fans out to STL, twin, BOM row and guide fasteners. |
| `control/` | HKP/1 protocol, transports (sim / WebSerial / network). |
| `bom/` | Norwegian sourcing, date-stamped, with `verified` per line. |
| `guide/` | The 12-step build as structured data, so fasteners can be summed. |
| `tools/` | Isolated CAD toolchain (manifold-3d). The one place `npm install` is correct. |

## Never `npm install` here

`invent_v1/` has zero dependencies by design and resolves react, three, vite and
typescript from the parent repo. A second copy of React causes "invalid hook
call"; a second copy of THREE breaks every `instanceof`. A `preinstall` guard
blocks it. The exception is `invent_v1/tools/`, which has its own toolchain and
never runs in a browser.

## Status

Built and verified: the machine core, the solid IR and STL toolchain, 13 bench
parts (43 pieces, 343 g), the Norwegian BOM, the 12-step guide, the static site,
the HKP/1 protocol and the simulator.

Not yet built: the browser control UI on top of the transport layer, the ESP32
firmware, the camera detector, and the 3D twin. The protocol and simulator they
sit on are done and tested, so that work has somewhere to land.

Nine of 26 BOM lines are price-confirmed against the live shop page. The rest
are flagged **må sjekkes** on the site and must be opened by eye before ordering.

```bash
./node_modules/.bin/tsx invent_v1/scripts/check-links.ts
```

Opens every vendor URL and writes `data/link-check.json`, which the site renders
and the harness reads. This is its own command because the harness is offline —
and it earned its keep immediately: two vendor domains had stopped resolving
entirely, which a count of link *strings* could never have caught.
