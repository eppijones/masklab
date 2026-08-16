import type { ReactNode } from 'react';
import { Callout, Cards, DataTable, Eyebrow, Stat, Tags } from './ui.tsx';
import { TwinSection } from './TwinSection.tsx';
import {
  ARCHITECTURES,
  BOM,
  BOM_TOTAL,
  CRITERIA,
  LADDER,
  MAX_SCORE,
  NOVELTY,
  PRIOR_ART,
  RISKS,
  weightedScore,
} from '../data/content.ts';
import { AXES } from '../machine/axes.ts';
import { CYCLE_SC } from '../machine/cycle.ts';
import { PARTS, GROUP_LABEL } from '../machine/parts.ts';
import { MACHINE_ROUNDS, STITCH_W_MM, TOTAL_STITCHES, BLOCK_HEIGHT_MM, BLOCK_MAX_R_MM } from '../machine/units.ts';

export interface Section {
  id: string;
  n: string;
  title: string;
  group: string;
  full?: boolean;
  Component: () => ReactNode;
}

const H = ({ children }: { children: ReactNode }) => <h2 className="iv-h2">{children}</h2>;

/* ------------------------------------------------------------------ 01 */
function Overview() {
  return (
    <>
      <Eyebrow>Hatteblokk · oppfinnelse</Eyebrow>
      <h1 className="iv-h1">A machine that actually crochets a bucket hat</h1>
      <p className="iv-lede">
        Every hat in StrikkeApp is built from <strong>one stitch type</strong>, worked in the round.
        That is an unusually tractable target for automation — and nobody has hit it. The two leading
        research machines stop at flat panels and 12-stitch rings. This is the design for one that
        does not.
      </p>
      <Cards>
        <Stat k="1" l="stitch type" d="fastmaske only — no dc, no hdc, anywhere in the app’s data model" />
        <Stat k={String(TOTAL_STITCHES)} l="stitches per hat" d="NORGE · Home, 42 rounds, dame + 4.0 mm" />
        <Stat k="1 412" l="colour changes" d="38% of stitches. No automated crochet machine does colourwork at all." />
        <Stat k="14.4×" l="circumference change" d="10 st at the crown to 144 at the rim — the constraint that kills most architectures" />
      </Cards>
      <Callout title="The decision that unlocks it" tone="ok">
        The app works crown-down and only ever increases, starting with a magic ring — the exact
        operation that defeated Harvard’s Croche-Matic. We invert it. The machine works
        <strong> rim-first</strong>: it chains 144 stitches into a ring in free air, which needs no
        insertion at all, then decreases upward to close the crown.
      </Callout>
      <p>
        Read <a href="#/problem">The Problem</a> for why this is hard, or jump straight to the{' '}
        <a href="#/twin">3D machine</a>.
      </p>
    </>
  );
}

/* ------------------------------------------------------------------ 02 */
function Problem() {
  return (
    <>
      <Eyebrow>02 · The problem</Eyebrow>
      <h1 className="iv-h1">Why there is no crochet machine</h1>
      <p className="iv-lede">
        The craft-blog answer is “crochet is too complex to automate”. That is not an engineering
        finding. The peer-reviewed record shows crochet <em>has</em> been automated — just never at
        product scale. Here is what actually stops it.
      </p>
      <Callout title="The misnomer" tone="warn">
        Industrial machines sold as “crochet machines” — crochet galloon, Raschel — are warp-knitting
        machines. They make fabric that <em>looks</em> like lace. They cannot form crocheted
        structure. <Tags ks={['EXT']} />
      </Callout>
      <H>The eleven real constraints</H>
      <DataTable
        cols={[
          { key: 'd', head: 'Difficulty', width: '25%', cell: (r: string[]) => <strong>{r[0]}</strong> },
          { key: 'c', head: 'Stated as a constraint', cell: (r: string[]) => r[1] },
          { key: 'm', head: 'Does modern tech change it?', cell: (r: string[]) => r[2] },
        ]}
        rows={[
          ['Stitch localisation', 'Target V presented within ±0.5 mm and open ≥1.2 mm', 'Partly. Steppers give ±0.05 mm — the residual is fabric error, not machine error. Mechanical compliance is the answer; vision is the auditor.'],
          ['Hook snags on withdrawal', 'The mouth must be shut while passing back through the aperture', 'Solved, cheaply. A latch needle is closed by the loop itself. ~€0.80 each. Removes a whole degree of freedom.'],
          ['Variable loop geometry', 'Loop height must be settable per stitch', 'Yes. Plunge stroke = loop height. Free in software.'],
          ['Textile deformation', 'A compliant workpiece has no rigid datum', 'Yes — by design change. Give it one: crochet onto a rotating hat block.'],
          ['Accumulating error', '3 694 stitches × any per-stitch bias', 'Yes. Absolute re-registration once per round, against the seam marker the app already models.'],
          ['Yarn friction', 'DK cotton is high-friction; CroMat could not run it without dynamic tension', 'Yes, and this is a real differentiator: €30 of dancer and encoder buys active per-colour tension.'],
          ['Loop capture', 'Yarn must lie in the throat every time', 'Partly. Geometry plus guides; verified by measuring yarn consumed.'],
          ['Retaining earlier loops', '—', 'Largely a NON-PROBLEM in crochet. This is where knitting intuition misleads — see below.'],
          ['Fabric growth', '14.4× circumference change', 'Yes, by inversion plus a former: rim-first makes the change monotonic, and the block absorbs it.'],
          ['Mid-stitch colour change', '1 412 per hat, between the two draw-throughs', 'Yes. Yarn changers are solved and cheap. The timing is the novel part.'],
          ['Failure recovery', 'A dropped stitch must be detectable', 'Yes. Yarn-length per stitch is a deterministic pass/fail signal.'],
        ]}
      />
      <Callout title="The insight that opens the design space" tone="ok">
        In knitting, an entire course of loops is live and must be held or the fabric drops. In
        crochet, <strong>exactly one loop is live</strong>; everything else is finished, stable
        fabric. So a crochet machine needs no needle bed for topological reasons. The beds in the
        existing prototypes exist only to make the insertion target <em>findable</em> — they solve
        localisation, not retention. And a bed is the most expensive way to solve it.{' '}
        <Tags ks={['INF']} />
      </Callout>
    </>
  );
}

/* ------------------------------------------------------------------ 03 */
function HowCrochet() {
  return (
    <>
      <Eyebrow>03 · How crochet works</Eyebrow>
      <h1 className="iv-h1">One primitive, repeated 3 694 times</h1>
      <p className="iv-lede">
        Every operation in these patterns reduces to a single physical act:{' '}
        <strong>draw a new bight of yarn through N existing loops</strong>, where N is 0, 1 or 2.
      </p>
      <DataTable
        cols={[
          { key: 's', head: 'Stitch', cell: (r: string[]) => <strong>{r[0]}</strong> },
          { key: 'o', head: 'Operation', cell: (r: string[]) => r[1] },
          { key: 'l', head: 'Loops on hook', num: true, cell: (r: string[]) => <span className="mono">{r[2]}</span> },
        ]}
        rows={[
          ['luftmaske (ch)', 'yarn over, draw through the working loop', '1 → 1'],
          ['fastmaske (sc)', 'insert through the target V; yo, draw through 1; yo, draw through 2', '1 → 2 → 1'],
          ['kjedemaske (sl st)', 'insert; yo, draw through the V and the working loop together', '1 → 1'],
          ['increase', 'two complete sc into the SAME target V', '—'],
          ['decrease', 'draw a loop through V₁, then V₂, then yo through all 3', '1 → 3 → 1'],
        ]}
      />
      <Callout title="Are we accidentally describing knitting?" tone="ok">
        No, and there is a one-line test. <strong>The crochet-defining move is “draw through 2”.</strong>{' '}
        A weft-knitting latch needle draws a new loop through exactly one old loop, forever. Nothing
        in a knitting machine ever draws one bight through two loops, one of which is the machine’s
        own working loop. Phase 7 of our cycle does exactly that. <Tags ks={['INF']} />
      </Callout>
      <H>The stitch cycle, phase by phase</H>
      <DataTable
        cols={[
          { key: 'p', head: 'Phase', width: '20%', cell: (p) => (
              <><strong>{p.labelNo}</strong><br /><span style={{ color: 'var(--iv-faint)', fontSize: 12 }}>{p.label}</span></>
            ) },
          { key: 'l', head: 'Loops', num: true, width: '8%', cell: (p) => p.loops },
          { key: 'w', head: 'What happens', cell: (p) => p.note },
        ]}
        rows={CYCLE_SC.phases}
      />
      <p>
        Watch it run on the <a href="#/twin">3D machine</a> — the transport there steps one phase at
        a time, and the axis readout is computed from the same keyframe data the firmware will use.
      </p>
    </>
  );
}

/* ------------------------------------------------------------------ 04 */
function PriorArtSection() {
  return (
    <>
      <Eyebrow>04 · Prior art</Eyebrow>
      <h1 className="iv-h1">What exists, and what it leaves unsolved</h1>
      <p className="iv-lede">
        Crochet automation is real and recent. Being honest about it is what makes the remaining gap
        credible.
      </p>
      {PRIOR_ART.map((a) => (
        <div key={a.id} style={{ borderTop: '1px solid var(--iv-line)', padding: '22px 0' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'baseline', flexWrap: 'wrap' }}>
            <strong style={{ fontSize: 17 }}>{a.title}</strong>
            <span className="mono" style={{ color: 'var(--iv-faint)' }}>
              {a.id} · {a.date}
            </span>
          </div>
          <p style={{ margin: '4px 0 10px', color: 'var(--iv-faint)', fontSize: 13 }}>{a.who}</p>
          <p style={{ margin: '0 0 8px' }}>{a.mechanism}</p>
          <p style={{ margin: '0 0 6px' }}>
            <strong>Overlap with us — </strong>
            {a.overlap}
          </p>
          <p style={{ margin: '0 0 8px' }}>
            <strong>Gap it leaves — </strong>
            {a.gap}
          </p>
          <a href={a.url} target="_blank" rel="noreferrer" className="mono" style={{ fontSize: 12 }}>
            {a.url}
          </a>
        </div>
      ))}
      <Callout title="What is genuinely unoccupied" tone="ok">
        No machine has crocheted a wearable garment. No automated crochet machine does colourwork of
        any kind. None works in the round at garment scale (&gt;100 st/round). None self-starts.
        None publishes closed-loop per-stitch verification. <Tags ks={['EXT', 'INF']} />
      </Callout>
    </>
  );
}

/* ------------------------------------------------------------------ 05 */
function Invention() {
  const chosen = ARCHITECTURES.find((a) => a.verdict === 'chosen')!;
  return (
    <>
      <Eyebrow>05 · Proposed invention</Eyebrow>
      <h1 className="iv-h1">Hatteblokk</h1>
      <p className="iv-lede">
        A rotating hat-block former, a five-axis travelling stitch station with a latch-needle
        cycle, a compliant V-presenter, and a four-yarn selector that changes colour mid-stitch —
        working rim-first.
      </p>
      <p>{chosen.summary}</p>
      <Callout title="Why this one" tone="ok">
        {chosen.why}
      </Callout>
      <H>Candidate architectures</H>
      <p>
        Seven were developed before any comparison. Scores are 1–5 against weighted criteria; the
        weights reflect what actually gates this project, not what sounds impressive.
      </p>
      <DataTable
        cols={[
          { key: 'k', head: '', width: '6%', cell: (a) => <span className="mono">{a.key}</span> },
          { key: 'n', head: 'Architecture', width: '24%', cell: (a) => (<><strong>{a.name}</strong><br /><span style={{ fontSize: 12, color: 'var(--iv-faint)' }}>{a.nameNo}</span></>) },
          { key: 'v', head: 'Verdict', width: '12%', cell: (a) => (
              <span className="iv-tag" data-k={a.verdict === 'chosen' ? 'REPO' : a.verdict === 'rejected' ? 'HYP' : 'INF'}>
                {a.verdict}
              </span>
            ) },
          { key: 'w', head: 'Reasoning', cell: (a) => a.why },
          { key: 's', head: 'Score', num: true, width: '10%', cell: (a) => (
              <strong style={{ color: a.verdict === 'chosen' ? 'var(--iv-red)' : undefined }}>
                {weightedScore(a)}/{MAX_SCORE}
              </strong>
            ) },
        ]}
        rows={ARCHITECTURES}
      />
      <H>Decision matrix</H>
      <DataTable
        cols={[
          { key: 'c', head: 'Criterion', width: '22%', cell: (c) => c.label },
          { key: 'w', head: 'W', num: true, width: '6%', cell: (c) => c.weight },
          ...ARCHITECTURES.map((a) => ({
            key: a.key,
            head: a.key,
            num: true,
            cell: (c: (typeof CRITERIA)[number]) => (
              <span style={{ color: a.verdict === 'chosen' ? 'var(--iv-red)' : undefined, fontWeight: a.verdict === 'chosen' ? 700 : 400 }}>
                {a.scores[c.key]}
              </span>
            ),
          })),
        ]}
        rows={CRITERIA}
      />
      <Callout title="Where the chosen design loses" tone="warn">
        M4 scores 2/5 on tolerance headroom, because it has no needle bed guaranteeing where the V
        is — that is its central risk, and experiment P3 exists to kill it early. It scores 3/5 on
        speed, because it forms one stitch at a time like every other true-crochet machine.
      </Callout>
    </>
  );
}

/* ------------------------------------------------------------------ 07 */
function MachineArch() {
  return (
    <>
      <Eyebrow>07 · Machine architecture</Eyebrow>
      <h1 className="iv-h1">Eight axes, and why each exists</h1>
      <DataTable
        cols={[
          { key: 'id', head: 'Axis', width: '6%', cell: (a) => <strong className="mono">{a.id}</strong> },
          { key: 'n', head: 'Name', width: '16%', cell: (a) => (<><strong>{a.nameNo}</strong><br /><span style={{ fontSize: 12, color: 'var(--iv-faint)' }}>{a.name}</span></>) },
          { key: 't', head: 'Range', width: '14%', cell: (a) => <span className="mono">{a.type === 'rotary' && Math.abs(a.max) > 1e5 ? 'continuous' : `${a.min}…${a.max} ${a.unit}`}</span> },
          { key: 'r', head: 'Role', cell: (a) => a.role },
        ]}
        rows={AXES}
      />
      <Callout title="The degree of freedom that is easy to miss" tone="warn">
        <strong>B, the station tilt.</strong> Without it the needle enters the crown dome at an
        oblique angle and splits the yarn instead of passing under the V. It is in the design
        deliberately, and it is the kind of thing a concept drawing hides.
      </Callout>
      <H>The former</H>
      <p>
        The block profile is not drawn by hand. It is <strong>derived from the stitch counts</strong>{' '}
        using the same integration the app uses in <code>buildProfile()</code>: the round-to-round
        rise is <code>dz = √(h² − dr²)</code>, so a round that grows a lot in radius rises very
        little (the flat brim) and a round of constant radius rises a full stitch height (the
        sidewall).
      </p>
      <Cards>
        <Stat k={`${BLOCK_MAX_R_MM.toFixed(0)} mm`} l="max radius" d={`${MACHINE_ROUNDS[0]} stitches at the rim`} />
        <Stat k={`${BLOCK_HEIGHT_MM.toFixed(0)} mm`} l="block height" d={`${MACHINE_ROUNDS.length} rounds, rim to crown`} />
        <Stat k={`${STITCH_W_MM} mm`} l="stitch width" d="from the app’s own 100 st = 56 cm size pin" />
        <Stat k="0.057 mm" l="C resolution at the rim" d="8× tighter than the ±0.5 mm localisation budget" />
      </Cards>
      <H>Parts</H>
      <DataTable
        cols={[
          { key: 'g', head: 'Group', width: '11%', cell: (p) => GROUP_LABEL[p.group as keyof typeof GROUP_LABEL] },
          { key: 'n', head: 'Part', width: '18%', cell: (p) => <strong>{p.nameNo}</strong> },
          { key: 'k', head: 'Kind', width: '9%', cell: (p) => <span className="iv-tag">{p.kind}</span> },
          { key: 'q', head: 'Qty', num: true, width: '5%', cell: (p) => p.qty },
          { key: 'm', head: 'Material', width: '18%', cell: (p) => p.material ?? '—' },
          { key: 'no', head: 'Note', cell: (p) => p.note },
        ]}
        rows={PARTS.filter((p) => p.note)}
      />
    </>
  );
}

/* ------------------------------------------------------------------ 08 */
function Electronics() {
  return (
    <>
      <Eyebrow>08 · Electronics & sensing</Eyebrow>
      <h1 className="iv-h1">Deterministic first, vision last</h1>
      <DataTable
        cols={[
          { key: 'l', head: 'Layer', width: '18%', cell: (r: string[]) => <strong>{r[0]}</strong> },
          { key: 'c', head: 'Choice', width: '30%', cell: (r: string[]) => r[1] },
          { key: 'w', head: 'Why', cell: (r: string[]) => r[2] },
        ]}
        rows={[
          ['Supervisor', 'Raspberry Pi 5 (4 GB)', 'Pattern compiler, per-round vision audit, web UI, logging.'],
          ['Real-time', 'BTT Octopus-class board, 8× TMC2209', 'Eight drivers on one board. StallGuard gives jam detection for free.'],
          ['Firmware', 'Klipper — Pi plans, MCU steps', 'We do not write a motion planner. Custom G-code macros per stitch phase.'],
          ['Rails', '24 V motors / 5 V logic / 12 V solenoids', 'Commodity.'],
          ['Current', '~6 A peak, 350 W PSU', 'Eight steppers at ~0.8 A, plus the Pi and lighting.'],
          ['E-stop', 'Latching mushroom in the 24 V motor line', 'Not a software stop. Logic stays alive so the machine can report where it died.'],
        ]}
      />
      <H>Sensing</H>
      <DataTable
        cols={[
          { key: 's', head: 'Signal', width: '22%', cell: (r: string[]) => <strong>{r[0]}</strong> },
          { key: 'h', head: 'Sensor', width: '22%', cell: (r: string[]) => r[1] },
          { key: 'e', head: '€', num: true, width: '7%', cell: (r: string[]) => r[2] },
          { key: 'w', head: 'Why not AI', cell: (r: string[]) => r[3] },
        ]}
        rows={[
          ['Yarn length per stitch', 'AS5600 on each feed roller', '12', 'A correct sc consumes a predictable length; out of band means the stitch failed. Cheap, deterministic, per-stitch, explainable.'],
          ['Yarn tension', 'Spring dancer + AS5600 angle', 'incl.', 'Analogue, closed-loop on the feed motor.'],
          ['Yarn present / broken', 'Photointerrupter per colour', '12', 'Binary and instant.'],
          ['Loop on needle', 'Reflective optical at the station', '5', 'Binary.'],
          ['Axis jam', 'TMC2209 StallGuard', '0', 'Already inside the driver.'],
          ['Homing', '6 microswitches', '10', 'Absolute datum on every power-up.'],
          ['Round audit', 'Pi Camera 3 + LED ring', '42', 'ONCE PER 144 STITCHES, not per stitch: count the round, verify the colour sequence, re-register the seam.'],
        ]}
      />
      <Callout title="Where AI genuinely earns its place" tone="ok">
        The per-round camera audit. Counting stitches and matching an observed colour sequence under
        yarn shadowing is a real perception problem that classical thresholding handles badly.{' '}
        <strong>Where it does not:</strong> anything per-stitch. Using a model to guess whether a
        stitch succeeded would be strictly worse than measuring the yarn that went into it.
      </Callout>
      <Callout title="Safety" tone="warn">
        The needle is sharp and moves at 120 mm/s. Enclosed station with an interlocked door; pinch
        points at the turntable and take-down covered; latching E-stop in the motor rail. No
        unattended operation before P11 — a hat takes 3–6 hours, and runs are supervised with a
        watchdog that halts on any metering fault.
      </Callout>
    </>
  );
}

/* ------------------------------------------------------------------ 09 */
function Software() {
  return (
    <>
      <Eyebrow>09 · Software architecture</Eyebrow>
      <h1 className="iv-h1">The app’s data is already the compiler front-end</h1>
      <p className="iv-lede">
        StrikkeApp computes, for every one of 3 694 stitches, its colour, whether it is a shaping
        stitch, and whether the yarn must change while finishing it. That is a machine instruction
        stream wearing a teaching app’s clothes.
      </p>
      <pre className="mono" style={{ background: 'var(--iv-paper)', border: '1px solid var(--iv-line)', borderRadius: 8, padding: 18, overflowX: 'auto', fontSize: 12.5, lineHeight: 1.6 }}>
{`DerivedPattern (rounds, stitches, chart)          <- existing app, unmodified
      |  snapshot-pattern.ts  (Node, tsx)
      v
pattern-snapshot.json + toolpath.json             <- frozen, committed in invent/
      |  compiler/plan.ts    <- INVERTS to rim-first: increases become decreases,
      v                          round order reversed, colour chart mirrored
MachineProgram : Op[]                             <- the machine IR
      |  compiler/lower.ts   <- picks a StitchCycle, resolves axis targets via units.ts
      v
Cycle keyframes --> emit-gcode.ts --> Klipper --> steppers
      |                                              |
      +--------> twin/ (same evaluator) <-- sensors --+--> verify / retry / halt`}
      </pre>
      <H>The intermediate representation</H>
      <p>
        A <code>STITCH(target, type, tension, loop_height, orientation)</code> tuple conflates two
        levels. The right split is a declarative <strong>op</strong> — what stitch, where, what
        colour — and a lowered <strong>cycle</strong> that says which axes move when.
      </p>
      <pre className="mono" style={{ background: 'var(--iv-paper)', border: '1px solid var(--iv-line)', borderRadius: 8, padding: 18, overflowX: 'auto', fontSize: 12.5, lineHeight: 1.6 }}>
{`type Op =
  | { k:'chain';    n:number; yarn:YarnId }
  | { k:'join-ring';target:StitchRef }
  | { k:'sc';       target:StitchRef; yarn:YarnId; loopH:number; insert:'both'|'front'|'back' }
  | { k:'inc';      target:StitchRef; yarn:YarnId; loopH:number }   // 2 sc, no advance
  | { k:'dec';      targets:[StitchRef,StitchRef]; yarn:YarnId }
  | { k:'sl-st';    target:StitchRef }
  | { k:'set-yarn'; yarn:YarnId; at:'pre'|'mid' }  // 'mid' = between draw-1 and draw-2
  | { k:'checkpoint'; round:number; expect:{ count:number; colors:YarnId[] } }
  | { k:'fasten-off' };`}
      </pre>
      <Callout title="set-yarn at:'mid'" tone="ok">
        This is the direct machine encoding of the app’s <code>changeColorAfter</code> field. The
        mid-stitch colour change is a first-class IR concept, not a special case — which is exactly
        why it is also the strongest novelty claim.
      </Callout>
      <H>Machine state</H>
      <p>
        Round, stitch-in-round, global stitch, loops on needle, all axis values, active yarn, live
        yarn length per colour, tension, yarn-present flags, and the last round audit. On any fault
        the machine <strong>halts and does not improvise</strong>: reverse C, back out N stitches,
        ask the operator, resume. Automatic ripping is a later feature and should not be attempted
        before a hat exists.
      </p>
    </>
  );
}

/* ------------------------------------------------------------------ 10 */
function Experiments() {
  const total = LADDER.reduce((s, e) => s + e.eur, 0);
  return (
    <>
      <Eyebrow>10 · Experiments</Eyebrow>
      <h1 className="iv-h1">The prototype ladder</h1>
      <p className="iv-lede">
        Nobody builds a bucket hat as prototype one. Each stage is a module on a shared base plate,
        so a stage can be replaced without rebuilding the machine.
      </p>
      <DataTable
        cols={[
          { key: 'id', head: '', width: '6%', cell: (e) => <strong className="mono" style={{ color: e.id.startsWith('P3') ? 'var(--iv-red)' : undefined }}>{e.id}</strong> },
          { key: 'n', head: 'Stage', width: '17%', cell: (e) => <strong>{e.name}</strong> },
          { key: 'o', head: 'Objective', width: '24%', cell: (e) => e.objective },
          { key: 'a', head: 'Adds', width: '18%', cell: (e) => e.adds },
          { key: 'p', head: 'Pass', cell: (e) => e.pass },
          { key: 'f', head: 'Fail', cell: (e) => e.fail },
          { key: 'e', head: '€', num: true, width: '6%', cell: (e) => e.eur || '—' },
        ]}
        rows={LADDER}
      />
      <Callout title="P3 is the decision point" tone="warn">
        If a bed-free presenter cannot hit the V 50 times out of 50, we fall back to architecture M3
        — the circulating loop-carrier chain — without discarding P0–P2 or any of the electronics.
        Cumulative ladder cost to that point is about €320.
      </Callout>
      <p className="mono" style={{ color: 'var(--iv-faint)' }}>
        Ladder total ≈ €{total}
      </p>
    </>
  );
}

/* ------------------------------------------------------------------ 11 */
function Bom() {
  return (
    <>
      <Eyebrow>11 · Bill of materials</Eyebrow>
      <h1 className="iv-h1">What it actually costs</h1>
      <p className="iv-lede">
        The €500 target is met for the bench that answers every make-or-break question. It is not
        met for a machine that finishes a 144-stitch hat, and saying otherwise would be dishonest.
      </p>
      <DataTable
        cols={[
          { key: 'g', head: 'Group', width: '14%', cell: (b) => <strong>{b.group}</strong> },
          { key: 'i', head: 'Item', width: '38%', cell: (b) => b.item },
          { key: 'e', head: '€', num: true, width: '8%', cell: (b) => b.eur },
          { key: 'n', head: 'Note', cell: (b) => b.note },
        ]}
        rows={BOM}
      />
      <Cards>
        <Stat k={`€${BOM_TOTAL}`} l="full machine" d="Round-capable, 4-colour, with vision" />
        <Stat k="€175" l="R&D contingency" d="~20% — things break during development" />
        <Stat k="€1 050" l="realistic all-in" d="Range €950 – €1 300" />
        <Stat k="€350–450" l="P0–P5 bench" d="Meets the original €500 target and proves the crux" />
      </Cards>
      <Callout title="Throughput, stated honestly">
        At an assumed 3–6 s per stitch, {TOTAL_STITCHES} stitches is <strong>3–6 hours per hat</strong>,
        against the app’s own 15.4-hour hand estimate. Not a factory. Genuinely faster than a person.
      </Callout>
    </>
  );
}

/* ------------------------------------------------------------------ 12 */
function Patent() {
  return (
    <>
      <Eyebrow>12 · Invention disclosure</Eyebrow>
      <h1 className="iv-h1">Candidate novelty, ranked by what survived the search</h1>
      <Callout title="Not a claim that a patent will be granted" tone="warn">
        Nothing here is patentable merely because we could not find an identical machine. These are
        drafts for review by qualified counsel, and one of the six is probably already anticipated —
        it is marked as such rather than quietly dropped.
      </Callout>
      <DataTable
        cols={[
          { key: 'n', head: '', width: '6%', cell: (c) => <strong className="mono">{c.n}</strong> },
          { key: 'k', head: 'Type', width: '11%', cell: (c) => <span className="iv-tag">{c.kind}</span> },
          { key: 's', head: 'Strength', width: '11%', cell: (c) => (
              <span className="iv-tag" data-k={c.strength === 'weak' ? 'HYP' : c.strength === 'strongest' ? 'REPO' : 'EXT'}>
                {c.strength}
              </span>
            ) },
          { key: 't', head: 'Candidate', cell: (c) => c.text },
        ]}
        rows={NOVELTY}
      />
      <Callout title="The honest position" tone="ok">
        N1 + N2 + N3 in combination is a credible independent claim. N6 alone is not. And none of it
        should be filed before the ACM SCF 2025 loom-crochet paper has actually been read — it is
        tracked as an open unknown, not quietly omitted.
      </Callout>
    </>
  );
}

/* ------------------------------------------------------------------ 13 */
function Risks() {
  return (
    <>
      <Eyebrow>13 · Risks</Eyebrow>
      <h1 className="iv-h1">The ways this fails</h1>
      <DataTable
        cols={[
          { key: 'id', head: '', width: '5%', cell: (r) => <strong className="mono">{r.id}</strong> },
          { key: 'r', head: 'Failure', width: '24%', cell: (r) => <strong>{r.risk}</strong> },
          { key: 'l', head: 'Likelihood', width: '10%', cell: (r) => (
              <span className="iv-tag" data-k={r.likelihood === 'High' ? 'HYP' : 'INF'}>{r.likelihood}</span>
            ) },
          { key: 'c', head: 'Consequence', width: '18%', cell: (r) => r.consequence },
          { key: 'm', head: 'Mitigation', cell: (r) => r.mitigation },
        ]}
        rows={RISKS}
      />
    </>
  );
}

/* ------------------------------------------------------------------ 14 */
function Roadmap() {
  return (
    <>
      <Eyebrow>14 · Roadmap</Eyebrow>
      <h1 className="iv-h1">What happens next</h1>
      <DataTable
        cols={[
          { key: 'p', head: 'Phase', width: '22%', cell: (r: string[]) => <strong>{r[0]}</strong> },
          { key: 'w', head: 'Work', cell: (r: string[]) => r[1] },
          { key: 's', head: 'Status', width: '14%', cell: (r: string[]) => <span className="iv-tag" data-k={r[2] === 'done' ? 'REPO' : 'INF'}>{r[2]}</span> },
        ]}
        rows={[
          ['1 · Twin', 'Scaffold, axis + cycle model, parametric parts, the 3D digital twin with transport controls.', 'done'],
          ['2 · Compiler', 'Snapshot the app’s pattern engine, build the IR, invert to rim-first, emit G-code, wire the real per-stitch colours into the twin.', 'next'],
          ['3 · Content', 'Remaining sections, STL and drawing export, BOM CSV, the IKEA-style build manual, validation harness.', 'planned'],
          ['4 · Reality checks', 'Hand-crochet a rim-first swatch (€0, resolves the fabric-appearance assumption). Obtain the SCF 2025 paper.', 'planned'],
          ['5 · Hardware', 'Order the P0–P3 bench (~€350–450). Build P0 → P3. If P3 fails, switch to M3 before spending more.', 'gated'],
        ]}
      />
    </>
  );
}

export const SECTIONS: Section[] = [
  { id: 'overview', n: '01', title: 'Oversikt', group: 'Oppfinnelsen', Component: Overview },
  { id: 'problem', n: '02', title: 'Problemet', group: 'Oppfinnelsen', Component: Problem },
  { id: 'crochet', n: '03', title: 'Slik virker hekling', group: 'Oppfinnelsen', Component: HowCrochet },
  { id: 'prior-art', n: '04', title: 'Kjent teknikk', group: 'Oppfinnelsen', Component: PriorArtSection },
  { id: 'invention', n: '05', title: 'Foreslått løsning', group: 'Oppfinnelsen', Component: Invention },
  { id: 'twin', n: '06', title: '3D-maskin', group: 'Maskinen', full: true, Component: TwinSection },
  { id: 'architecture', n: '07', title: 'Maskinarkitektur', group: 'Maskinen', Component: MachineArch },
  { id: 'electronics', n: '08', title: 'Elektronikk & sensorer', group: 'Maskinen', Component: Electronics },
  { id: 'software', n: '09', title: 'Programvare', group: 'Maskinen', Component: Software },
  { id: 'experiments', n: '10', title: 'Eksperimenter', group: 'Bygging', Component: Experiments },
  { id: 'bom', n: '11', title: 'Delliste & kost', group: 'Bygging', Component: Bom },
  { id: 'patent', n: '12', title: 'Patent', group: 'Vurdering', Component: Patent },
  { id: 'risks', n: '13', title: 'Risiko', group: 'Vurdering', Component: Risks },
  { id: 'roadmap', n: '14', title: 'Veikart', group: 'Vurdering', Component: Roadmap },
];
