import type { ReactNode } from 'react';
import type { TechniqueId } from '../data/steps';
import {
  OUT, YARN, RED, BLUE, SKIN, HOOKC,
  type Pt, phase, lerp, Frame, Hook, Yarn, Braid, StitchV, LoopOnHook, Arrow,
} from './primitives';

export interface Technique {
  id: TechniqueId;
  title: string;
  /** seconds at 1x speed */
  duration: number;
  phases: { at: number; label: string }[];
  render: (t: number) => ReactNode;
}

/** Keyframed 2D position: [time, x, y][] */
function track(t: number, keys: [number, number, number][]): Pt {
  if (t <= keys[0][0]) return [keys[0][1], keys[0][2]];
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i];
    const b = keys[i + 1];
    if (t <= b[0]) {
      const k = phase(t, a[0], b[0]);
      return [lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
    }
  }
  const last = keys[keys.length - 1];
  return [last[1], last[2]];
}

/** Keyframed scalar: [time, value][] */
function val(t: number, keys: [number, number][]): number {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i];
    const b = keys[i + 1];
    if (t <= b[0]) return lerp(a[1], b[1], phase(t, a[0], b[0]));
  }
  return keys[keys.length - 1][1];
}

/** Point at distance d from the hook head along the shaft (angle in deg). */
function alongShaft(head: Pt, angleDeg: number, d: number): Pt {
  const a = (angleDeg * Math.PI) / 180;
  return [head[0] + Math.cos(a) * d, head[1] + Math.sin(a) * d];
}

const HOOK_ANGLE = -35;

/* =================================================================== */
/* FASTMASKE                                                            */
/* =================================================================== */
const fastmaske: Technique = {
  id: 'fastmaske',
  title: 'Fastmaske',
  duration: 9,
  phases: [
    { at: 0.0, label: '1. Stikk nålen inn under V-en på masken.' },
    { at: 0.16, label: '2. Fang arbeidstråden med kroken.' },
    { at: 0.32, label: '3. Trekk tilbake — nå har du TO løkker på nålen.' },
    { at: 0.52, label: '4. Fang arbeidstråden på nytt.' },
    { at: 0.68, label: '5. Trekk gjennom BEGGE løkkene.' },
    { at: 0.86, label: 'Ferdig! Én fastmaske — og én løkke igjen på nålen.' },
  ],
  render: (t) => {
    const head = track(t, [
      [0.0, 252, 74],
      [0.14, 172, 196],
      [0.3, 172, 196],
      [0.48, 218, 112],
      [0.66, 218, 112],
      [0.84, 244, 92],
      [1.0, 244, 92],
    ]);

    // working yarn from bottom-left towards the action
    const yoDown = phase(t, 0.16, 0.3);   // yarn over below fabric
    const yoUp = phase(t, 0.52, 0.66);    // second yarn over up top
    const yarnEnd: Pt =
      t < 0.32
        ? [lerp(120, head[0], yoDown), lerp(214, head[1] + 6, yoDown)]
        : [lerp(120, head[0], yoUp), lerp(214, head[1] + 8, yoUp)];
    const yarnPts: Pt[] = [
      [22, 224],
      [70, 220],
      [lerp(110, yarnEnd[0] - 30, Math.max(yoDown, yoUp))!, lerp(218, yarnEnd[1] + 26, Math.max(yoDown, yoUp))],
      yarnEnd,
    ];

    // loops on the hook
    const twoLoops = phase(t, 0.32, 0.46);
    const finish = phase(t, 0.68, 0.84);
    const l1 = alongShaft(head, HOOK_ANGLE, 26);
    const l2 = alongShaft(head, HOOK_ANGLE, 47);
    const newV = phase(t, 0.8, 0.95);

    return (
      <Frame>
        <Braid cx={180} cy={206} n={8} highlight={3} />
        {/* freshly made stitch pops in on top of the target */}
        {newV > 0.02 && (
          <StitchV x={172} y={188} s={0.9 * newV} color={YARN} opacity={newV} />
        )}
        <Yarn pts={yarnPts} color={RED} w={7} />
        {/* yarn-over wrap at the head */}
        {(yoDown > 0.6 && t < 0.34) || (yoUp > 0.6 && t < 0.7) ? (
          <LoopOnHook x={head[0] + 2} y={head[1] - 2} rx={10} ry={17} color={RED} angle={HOOK_ANGLE + 90} w={7} />
        ) : null}
        {/* existing loop (always) */}
        <LoopOnHook
          x={l1[0]} y={l1[1]} color={finish > 0.5 ? RED : YARN}
          angle={HOOK_ANGLE + 90}
          rx={12} ry={21}
        />
        {/* second loop pulled up from the fabric */}
        {twoLoops > 0.03 && finish < 0.85 && (
          <LoopOnHook
            x={l2[0]} y={l2[1]} color={RED} angle={HOOK_ANGLE + 90}
            rx={12 * val(t, [[0.32, 0.3], [0.46, 1], [0.68, 1], [0.84, 0.15]])}
            ry={21 * val(t, [[0.32, 0.3], [0.46, 1], [0.68, 1], [0.84, 0.15]])}
            opacity={val(t, [[0.68, 1], [0.84, 0]])}
          />
        )}
        <Hook x={head[0]} y={head[1]} angle={HOOK_ANGLE} />
        {t < 0.15 && <Arrow d="M 232 118 L 190 172" />}
        {t >= 0.32 && t < 0.5 && <Arrow d="M 176 178 Q 190 140 206 126" />}
        {t >= 0.68 && t < 0.85 && <Arrow d={`M ${l2[0] + 26} ${l2[1] + 16} Q ${head[0] + 18} ${head[1] + 24} ${head[0] - 6} ${head[1]}`} />}
      </Frame>
    );
  },
};

/* =================================================================== */
/* LUFTMASKE                                                            */
/* =================================================================== */
const luftmaske: Technique = {
  id: 'luftmaske',
  title: 'Luftmaske',
  duration: 6,
  phases: [
    { at: 0.0, label: 'Du har én løkke på nålen.' },
    { at: 0.15, label: '1. Fang arbeidstråden med kroken.' },
    { at: 0.42, label: '2. Trekk arbeidstråden gjennom løkken på nålen.' },
    { at: 0.75, label: 'Du har laget én luftmaske — kjeden vokser med én.' },
  ],
  render: (t) => {
    const head = track(t, [
      [0.0, 232, 128],
      [0.15, 232, 128],
      [0.4, 232, 128],
      [0.7, 258, 112],
      [1.0, 258, 112],
    ]);
    const yo = phase(t, 0.15, 0.38);
    const pull = phase(t, 0.42, 0.7);
    const newChain = phase(t, 0.6, 0.8);

    const l1 = alongShaft(head, HOOK_ANGLE, 26);
    const yarnEnd: Pt = [lerp(140, head[0] + 2, yo), lerp(216, head[1] - 4, yo)];

    return (
      <Frame>
        {/* chain already made */}
        <Braid cx={110} cy={196} n={3} />
        {newChain > 0.02 && <StitchV x={160} y={192} s={newChain} rotate={-8} />}
        <Yarn
          pts={[[20, 224], [80, 222], yarnEnd]}
          color={RED}
        />
        {yo > 0.55 && pull < 0.6 && (
          <LoopOnHook x={head[0] + 3} y={head[1] - 3} rx={10} ry={17} color={RED} angle={HOOK_ANGLE + 90} w={7} />
        )}
        {/* old loop slides off as the new (red) one takes its place */}
        <LoopOnHook
          x={l1[0]} y={l1[1]}
          color={pull > 0.5 ? RED : YARN}
          angle={HOOK_ANGLE + 90}
          rx={12} ry={21}
        />
        {pull > 0.05 && pull < 0.95 && (
          <LoopOnHook
            x={lerp(l1[0], 176, pull)} y={lerp(l1[1], 188, pull)}
            color={YARN} angle={HOOK_ANGLE + 90}
            rx={12 * (1 - pull * 0.6)} ry={21 * (1 - pull * 0.6)}
            opacity={1 - pull}
          />
        )}
        <Hook x={head[0]} y={head[1]} angle={HOOK_ANGLE} />
        {t >= 0.15 && t < 0.4 && <Arrow d="M 196 96 Q 226 84 244 104" />}
        {t >= 0.42 && t < 0.7 && <Arrow d={`M ${head[0] + 40} ${head[1] + 30} Q ${head[0]} ${head[1] + 34} ${head[0] - 18} ${head[1] + 6}`} />}
      </Frame>
    );
  },
};

/* =================================================================== */
/* KJEDEMASKE                                                           */
/* =================================================================== */
const kjedemaske: Technique = {
  id: 'kjedemaske',
  title: 'Kjedemaske (lukker runden)',
  duration: 7,
  phases: [
    { at: 0.0, label: '1. Finn masken med markøren. Stikk inn under begge trådene i V-en.' },
    { at: 0.25, label: '2. Fang arbeidstråden.' },
    { at: 0.45, label: '3. Trekk garnet gjennom masken OG løkken på nålen — i én bevegelse.' },
    { at: 0.8, label: 'Én løkke igjen på nålen. Runden er lukket!' },
  ],
  render: (t) => {
    const head = track(t, [
      [0.0, 244, 84],
      [0.2, 168, 190],
      [0.42, 168, 190],
      [0.72, 236, 96],
      [1.0, 236, 96],
    ]);
    const yo = phase(t, 0.25, 0.42);
    const pull = phase(t, 0.45, 0.72);
    const l1 = alongShaft(head, HOOK_ANGLE, 26);
    const yarnEnd: Pt = [lerp(120, head[0], yo), lerp(216, head[1] + 4, yo)];

    return (
      <Frame>
        <Braid cx={180} cy={204} n={8} highlight={3} highlightColor={RED} />
        {/* marker on the target stitch */}
        <path
          d="M 158 226 q -6 12 4 16 q 10 4 12 -6"
          fill="none" stroke={BLUE} strokeWidth={4} strokeLinecap="round"
        />
        <Yarn pts={[[22, 224], [72, 220], yarnEnd]} color={RED} />
        {yo > 0.6 && pull < 0.4 && (
          <LoopOnHook x={head[0] + 2} y={head[1] - 2} rx={10} ry={17} color={RED} angle={HOOK_ANGLE + 90} w={7} />
        )}
        <LoopOnHook
          x={l1[0]} y={l1[1]}
          color={pull > 0.6 ? RED : YARN}
          angle={HOOK_ANGLE + 90} rx={12} ry={21}
        />
        {/* the old loop being passed through, mid-pull */}
        {pull > 0.1 && pull < 0.9 && (
          <LoopOnHook
            x={lerp(l1[0], 150, pull)} y={lerp(l1[1], 200, pull)}
            color={YARN} angle={HOOK_ANGLE + 90}
            rx={12 * (1 - pull * 0.7)} ry={21 * (1 - pull * 0.7)}
            opacity={1 - pull * 0.9}
          />
        )}
        <Hook x={head[0]} y={head[1]} angle={HOOK_ANGLE} />
        {t < 0.2 && <Arrow d="M 226 122 L 186 170" />}
        {t >= 0.45 && t < 0.72 && <Arrow d="M 170 168 Q 196 120 226 108" />}
        <text x={128} y={250} fontSize={13} fontWeight={700} fill={BLUE}>markør</text>
      </Frame>
    );
  },
};

/* =================================================================== */
/* LØPEKNUTE                                                            */
/* =================================================================== */
const lopeknute: Technique = {
  id: 'lopeknute',
  title: 'Løpeknute',
  duration: 8,
  phases: [
    { at: 0.0, label: '1. Legg garnet i en løkke — trådenden ligger bakerst.' },
    { at: 0.28, label: '2. Stikk kroken inn gjennom midten og fang arbeidstråden.' },
    { at: 0.52, label: '3. Trekk tråden gjennom løkka.' },
    { at: 0.75, label: '4. Stram forsiktig. Løkken skal gli lett langs nålen — ikke sitte fast.' },
  ],
  render: (t) => {
    const form = phase(t, 0.02, 0.26);
    const hookIn = phase(t, 0.28, 0.44);
    const pull = phase(t, 0.52, 0.72);
    const tighten = phase(t, 0.78, 0.95);

    // the loose loop of yarn on the table
    const loopR = lerp(58, 20, tighten);
    const loopCx = lerp(160, 210, pull * 0.4 + tighten * 0.5);
    const loopCy = lerp(140, 120, pull * 0.5 + tighten * 0.3);

    const head = track(t, [
      [0.0, 330, 40],
      [0.28, 330, 40],
      [0.44, loopCx, loopCy],
      [0.52, loopCx, loopCy],
      [0.72, 226, 108],
      [1.0, 226, 108],
    ]);

    return (
      <Frame>
        {/* yarn: straight line morphing into a crossed loop */}
        {form < 1 && (
          <Yarn
            pts={[
              [30, lerp(180, 196, form)],
              [lerp(120, 120, form), lerp(178, 188, form)],
              [lerp(230, 160, form), lerp(176, 150, form)],
              [lerp(330, 200, form), lerp(174, 170, form)],
            ]}
            color={RED}
            opacity={1 - form}
          />
        )}
        {form > 0.05 && (
          <g opacity={form}>
            <circle
              cx={loopCx} cy={loopCy} r={loopR}
              fill="none" stroke={RED} strokeWidth={8}
            />
            {/* crossing + the two ends */}
            <Yarn pts={[[loopCx - loopR * 0.5, loopCy + loopR * 0.9], [loopCx - 60 - tighten * 30, 226]]} color={RED} />
            <Yarn pts={[[loopCx + loopR * 0.5, loopCy + loopR * 0.9], [loopCx + 60 + tighten * 40, 228]]} color={RED} />
          </g>
        )}
        {/* strand caught mid-pull */}
        {pull > 0.05 && tighten < 0.5 && (
          <LoopOnHook
            x={lerp(loopCx, head[0] + 4, pull)}
            y={lerp(loopCy + 14, head[1] - 2, pull)}
            rx={11} ry={18} color={RED} angle={HOOK_ANGLE + 90}
            opacity={pull}
          />
        )}
        {tighten > 0.4 && (
          <LoopOnHook x={alongShaft(head, HOOK_ANGLE, 24)[0]} y={alongShaft(head, HOOK_ANGLE, 24)[1]} rx={12} ry={20} color={RED} angle={HOOK_ANGLE + 90} />
        )}
        {t >= 0.28 && <Hook x={head[0]} y={head[1]} angle={HOOK_ANGLE} />}
        {t < 0.26 && <Arrow d="M 268 210 Q 216 218 190 186" />}
        {hookIn > 0 && t < 0.5 && <Arrow d="M 258 66 L 224 108" opacity={1 - pull} />}
        {tighten > 0.3 && (
          <>
            <Arrow d="M 130 200 L 92 224" />
            <Arrow d="M 292 202 L 328 224" />
          </>
        )}
      </Frame>
    );
  },
};

/* =================================================================== */
/* TO I SAMME MASKE (økning)                                            */
/* =================================================================== */
const toISamme: Technique = {
  id: 'to-i-samme',
  title: 'To fastmasker i samme maske',
  duration: 9,
  phases: [
    { at: 0.0, label: '1. Lag én helt vanlig fastmaske i masken.' },
    { at: 0.34, label: '2. Stikk nålen TILBAKE i nøyaktig den samme masken.' },
    { at: 0.52, label: '3. Lag enda én vanlig fastmaske.' },
    { at: 0.85, label: 'Én gammel maske har fått to nye masker. Det er hele «økningen».' },
  ],
  render: (t) => {
    const dip1 = val(t, [[0, 0], [0.1, 1], [0.24, 0]]); // first insert
    const dip2 = val(t, [[0.52, 0], [0.62, 1], [0.78, 0]]);
    const v1 = phase(t, 0.24, 0.34);
    const v2 = phase(t, 0.76, 0.88);
    const highlight = phase(t, 0.88, 0.98);

    const restHead: Pt = [246, 96];
    const dip = Math.max(dip1, dip2);
    const head: Pt = [lerp(restHead[0], 176, dip), lerp(restHead[1], 194, dip)];
    const l1 = alongShaft(head, HOOK_ANGLE, 26);

    return (
      <Frame>
        <Braid cx={180} cy={210} n={7} highlight={3} />
        {v1 > 0.02 && (
          <StitchV x={160} y={168} s={0.92 * v1} rotate={-14} color={highlight > 0.3 ? RED : YARN} opacity={v1} />
        )}
        {v2 > 0.02 && (
          <StitchV x={202} y={168} s={0.92 * v2} rotate={14} color={highlight > 0.3 ? RED : YARN} opacity={v2} />
        )}
        {(v1 > 0.5 || v2 > 0.5) && (
          <>
            {v1 > 0.5 && <Arrow d="M 158 128 L 172 188" opacity={1 - highlight} />}
            {v2 > 0.5 && <Arrow d="M 206 128 L 190 188" opacity={1 - highlight} />}
          </>
        )}
        <Yarn pts={[[22, 228], [86, 224], [136, 216]]} color={RED} />
        <LoopOnHook x={l1[0]} y={l1[1]} color={YARN} angle={HOOK_ANGLE + 90} rx={12} ry={21} />
        <Hook x={head[0]} y={head[1]} angle={HOOK_ANGLE} />
        {t >= 0.34 && t < 0.52 && (
          <Arrow d="M 236 150 Q 210 184 188 198" />
        )}
        {highlight > 0.3 && (
          <text x={96} y={54} fontSize={16} fontWeight={800} fill={OUT}>
            2 nye masker i samme maske
          </text>
        )}
      </Frame>
    );
  },
};

/* =================================================================== */
/* FARGEBYTTE                                                           */
/* =================================================================== */
const fargebytte: Technique = {
  id: 'fargebytte',
  title: 'Fargebytte',
  duration: 10,
  phases: [
    { at: 0.0, label: '1. Begynn den siste hvite fastmasken: stikk inn og hent hvitt garn.' },
    { at: 0.2, label: '2. STOPP her: to hvite løkker på nålen. Ikke fullfør med hvitt!' },
    { at: 0.42, label: '3. Legg RØDT garn over kroken.' },
    { at: 0.62, label: '4. Trekk rødt gjennom begge de hvite løkkene.' },
    { at: 0.84, label: '5. Løkken på nålen er nå rød — neste maske hekles med rødt.' },
  ],
  render: (t) => {
    const head = track(t, [
      [0.0, 176, 192],
      [0.16, 222, 110],
      [0.62, 222, 110],
      [0.82, 246, 92],
      [1.0, 246, 92],
    ]);
    const twoLoops = phase(t, 0.08, 0.2);
    const stopPulse = t >= 0.2 && t < 0.42 ? 0.5 + 0.5 * Math.sin(t * 90) : 0;
    const redOver = phase(t, 0.42, 0.58);
    const redPull = phase(t, 0.62, 0.8);

    const l1 = alongShaft(head, HOOK_ANGLE, 26);
    const l2 = alongShaft(head, HOOK_ANGLE, 47);
    const redEnd: Pt = [lerp(60, head[0] + 2, redOver), lerp(60, head[1] - 4, redOver)];

    return (
      <Frame>
        <Braid cx={180} cy={206} n={8} />
        {/* white working yarn (the passive one after the switch) */}
        <Yarn pts={[[22, 228], [86, 222], [148, 212]]} color={YARN} w={6.5} />
        {/* red yarn waiting, then laid over the hook */}
        <Yarn pts={[[16, 54], [40, 56], redEnd]} color={RED} />
        {/* two white loops */}
        <g opacity={1}>
          <LoopOnHook
            x={l1[0]} y={l1[1]}
            color={redPull > 0.6 ? RED : YARN}
            angle={HOOK_ANGLE + 90} rx={12} ry={21}
          />
          {twoLoops > 0.05 && redPull < 0.9 && (
            <LoopOnHook
              x={l2[0]} y={l2[1]} color={YARN} angle={HOOK_ANGLE + 90}
              rx={12 * (1 - redPull * 0.8)} ry={21 * (1 - redPull * 0.8)}
              opacity={1 - redPull * 0.9}
            />
          )}
          {stopPulse > 0 && (
            <ellipse
              cx={(l1[0] + l2[0]) / 2} cy={(l1[1] + l2[1]) / 2}
              rx={34} ry={44}
              fill="none" stroke={BLUE} strokeWidth={3}
              strokeDasharray="7 6"
              opacity={0.35 + 0.4 * stopPulse}
              transform={`rotate(${HOOK_ANGLE} ${(l1[0] + l2[0]) / 2} ${(l1[1] + l2[1]) / 2})`}
            />
          )}
        </g>
        {redOver > 0.6 && redPull < 0.5 && (
          <LoopOnHook x={head[0] + 2} y={head[1] - 3} rx={10} ry={17} color={RED} angle={HOOK_ANGLE + 90} w={7} />
        )}
        <Hook x={head[0]} y={head[1]} angle={HOOK_ANGLE} />
        {t >= 0.42 && t < 0.6 && <Arrow d="M 96 84 Q 170 92 212 102" />}
        {t >= 0.62 && t < 0.82 && (
          <Arrow d={`M ${l2[0] + 28} ${l2[1] + 18} Q ${head[0] + 16} ${head[1] + 26} ${head[0] - 4} ${head[1] + 2}`} />
        )}
        {t >= 0.2 && t < 0.42 && (
          <text x={38} y={166} fontSize={15} fontWeight={800} fill={BLUE}>to hvite løkker</text>
        )}
      </Frame>
    );
  },
};

/* =================================================================== */
/* HOLDE GARNET                                                         */
/* =================================================================== */
const holdeGarnet: Technique = {
  id: 'holde-garnet',
  title: 'Slik holder du garnet',
  duration: 7,
  phases: [
    { at: 0.0, label: 'Arbeidstråden går fra nøstet, gjennom venstre hånd.' },
    { at: 0.3, label: 'Over pekefingeren — det er her nålen henter garn.' },
    { at: 0.6, label: 'Lillefingeren styrer stramheten. Hold hånden avslappet, aldri knyttet.' },
  ],
  render: (t) => {
    // A dot travels along the yarn path to show the route.
    const route: Pt[] = [
      [312, 204], [250, 170], [214, 96], [186, 74], [158, 92], [132, 70], [60, 88],
    ];
    const k = (t * 1.4) % 1;
    const seg = Math.min(route.length - 2, Math.floor(k * (route.length - 1)));
    const segK = k * (route.length - 1) - seg;
    const dot: Pt = [
      lerp(route[seg][0], route[seg + 1][0], segK),
      lerp(route[seg][1], route[seg + 1][1], segK),
    ];
    return (
      <Frame>
        <path
          d="M 30 78 C 80 48 120 52 132 70 L 158 92 L 186 74 L 214 96 C 240 116 286 150 302 188"
          fill="none" stroke={RED} strokeWidth={7} strokeLinecap="round"
        />
        <g fill={SKIN} stroke={OUT} strokeWidth={3} strokeLinejoin="round">
          <rect x={122} y={52} width={25} height={86} rx={12.5} />
          <rect x={150} y={40} width={25} height={98} rx={12.5} />
          <rect x={178} y={46} width={25} height={92} rx={12.5} />
          <rect x={206} y={64} width={23} height={74} rx={11.5} />
          <path d="M 118 130 C 104 138 96 152 98 168 C 100 190 118 204 148 208 L 196 210 C 222 210 234 196 234 176 L 232 126 C 232 116 224 110 214 112 L 122 124 C 118 126 118 128 118 130 Z" />
          <rect x={86} y={118} width={26} height={58} rx={13} transform="rotate(38 99 147)" />
        </g>
        <path d="M 132 70 Q 136 60 145 62" fill="none" stroke={RED} strokeWidth={7} strokeLinecap="round" />
        <path d="M 186 74 Q 190 62 200 66" fill="none" stroke={RED} strokeWidth={7} strokeLinecap="round" />
        <circle cx={312} cy={204} r={26} fill={RED} stroke={OUT} strokeWidth={3} />
        <path d="M 292 196 Q 312 186 330 198 M 294 212 Q 312 202 330 212" stroke="rgba(255,255,255,0.55)" strokeWidth={2.5} fill="none" />
        {/* travelling highlight dot */}
        <circle cx={dot[0]} cy={dot[1]} r={9} fill="none" stroke={BLUE} strokeWidth={3.5} />
        {t > 0.28 && t < 0.6 && <Arrow d="M 120 34 Q 132 44 136 56" />}
        {t >= 0.6 && <Arrow d="M 258 60 Q 232 74 216 90" />}
        <text x={244} y={244} fontSize={13} fontWeight={700} fill="#8A8070">nøstet</text>
      </Frame>
    );
  },
};

/* =================================================================== */
/* FESTE TRÅDEN                                                         */
/* =================================================================== */
const festeTraden: Technique = {
  id: 'feste-traden',
  title: 'Feste tråden',
  duration: 8,
  phases: [
    { at: 0.0, label: '1. Klipp garnet — la omtrent 15 cm tråd være igjen.' },
    { at: 0.28, label: '2. Trekk hele garnhalen gjennom løkken på nålen og stram forsiktig.' },
    { at: 0.58, label: '3. Vev halen frem og tilbake under maskene på innsiden.' },
    { at: 0.88, label: 'Godt festet. Ikke klipp helt inntil knuten.' },
  ],
  render: (t) => {
    const cut = phase(t, 0.06, 0.2);
    const through = phase(t, 0.3, 0.52);
    const weave = phase(t, 0.6, 0.88);

    const head: Pt = [244, 92];
    const l1 = alongShaft(head, HOOK_ANGLE, 26);
    const scissorOpen = lerp(22, 2, cut);
    const loopShrink = 1 - through * 0.8;

    // needle tip position while weaving (moves left under the stitches)
    const nx = lerp(206, 84, weave);

    return (
      <Frame>
        <Braid cx={150} cy={190} n={7} />
        {t < 0.6 ? (
          <>
            {/* tail from the last stitch up through the loop */}
            <Yarn pts={[[196, 180], [208, 146], [l1[0] - 4, l1[1] + 12]]} color={RED} />
            <LoopOnHook
              x={l1[0]} y={l1[1]} color={RED} angle={HOOK_ANGLE + 90}
              rx={12 * loopShrink} ry={21 * loopShrink}
            />
            <Hook x={head[0]} y={head[1]} angle={HOOK_ANGLE} />
            {/* the free tail end, moving as it gets pulled through */}
            <Yarn
              pts={[
                [lerp(l1[0] + 14, l1[0] + 30, through), lerp(l1[1] - 18, l1[1] - 2, through)],
                [lerp(288, 320, through), lerp(58, 60, through)],
              ]}
              color={RED}
            />
          </>
        ) : (
          <>
            {/* fastened: tail comes out of the last stitch, now being woven */}
            <Yarn pts={[[196, 180], [216, 158], [244, 150]]} color={RED} />
            {/* weaving: tail follows the needle under the stitches */}
            <Yarn
              pts={[[244, 150], [228, 186], [206, 210], [nx + 26, 212]]}
              color={RED}
            />
            <Yarn pts={[[nx + 26, 212], [nx, 211]]} color={RED} dash="9 7" outline={false} />
            {/* darning needle */}
            <g transform={`translate(${nx},211) rotate(184)`}>
              <line x1={0} y1={0} x2={54} y2={0} stroke={HOOKC} strokeWidth={6} strokeLinecap="round" />
              <ellipse cx={46} cy={0} rx={7} ry={3.4} fill="none" stroke={OUT} strokeWidth={2.4} />
            </g>
            {weave < 0.95 && <Arrow d={`M ${nx + 40} 238 L ${nx - 2} 234`} />}
          </>
        )}
        {/* scissors cutting the yarn to a 15 cm tail */}
        {t < 0.3 && (
          <g transform="translate(300,66) rotate(24)">
            <g stroke={OUT} strokeWidth={3.5} strokeLinecap="round" fill="none">
              <line x1={-22} y1={-scissorOpen} x2={26} y2={scissorOpen} />
              <line x1={-22} y1={scissorOpen} x2={26} y2={-scissorOpen} />
              <circle cx={-28} cy={-scissorOpen - 3} r={6} />
              <circle cx={-28} cy={scissorOpen + 3} r={6} />
            </g>
          </g>
        )}
        {t >= 0.3 && t < 0.55 && <Arrow d="M 300 118 Q 322 92 316 66" />}
        {t < 0.26 && (
          <text x={236} y={40} fontSize={14} fontWeight={800} fill={OUT}>~15 cm igjen</text>
        )}
      </Frame>
    );
  },
};

export const TECHNIQUES: Technique[] = [
  holdeGarnet,
  lopeknute,
  luftmaske,
  fastmaske,
  kjedemaske,
  toISamme,
  fargebytte,
  festeTraden,
];

export const TECHNIQUE_BY_ID: Record<TechniqueId, Technique> = Object.fromEntries(
  TECHNIQUES.map((tq) => [tq.id, tq]),
) as Record<TechniqueId, Technique>;

export const TECHNIQUE_SHORT: Record<TechniqueId, string> = {
  'holde-garnet': 'Holde garnet',
  lopeknute: 'Løpeknute',
  luftmaske: 'Luftmaske',
  fastmaske: 'Fastmaske',
  kjedemaske: 'Kjedemaske',
  'to-i-samme': 'To i samme',
  fargebytte: 'Fargebytte',
  'feste-traden': 'Feste tråden',
};
