import type { Round, YarnColor } from './types';
import { rhythmTextEn } from './pattern';
import type { StepDef, TechniqueId } from './steps';

export const ROUND_RITUAL_START_EN =
  'Make one chain stitch. This does not count. Then make the round’s first single crochet in the first proper stitch from the previous round, and place the marker in the V on top of it.';

export const ROUND_RITUAL_END_EN =
  'Close the round with a slip stitch under the V of the stitch with the marker. Move the marker when the next round begins.';

/** Approx. width of one single crochet with 4.0 mm hook + Cotton 4/4, in cm
 *  (calibrated from ~14 cm flat disc at 70 stitches; ~17.5–20 cm at 100). */
const STITCH_W_CM = 0.63;

/** Expected flat diameter of the crown disc at a given stitch count. */
function discRange(count: number): string {
  const d = (count * STITCH_W_CM) / Math.PI;
  const fmt = (v: number) => (Math.round(v * 2) / 2).toString();
  return `approx ${fmt(d * 0.93)}–${fmt(d * 1.07)} cm`;
}

/** What the work should look like after this round. */
function roundLook(round: Round): string {
  if (round.num === 1) {
    return 'A small, tight circle — roughly the size of a large coin. It is completely normal if it cups like a little bowl or curls a bit: it will flatten over the next few rounds. The yarn tail still hangs loose — you will weave it in at the end.';
  }
  if (round.phase === 'top') {
    if (round.increaseEvery !== null) {
      return round.num <= 3
        ? 'The circle has grown and should lie fairly flat when you put it on the table. A slight bowl shape is fine. If the edge waves strongly, you have too many stitches — count again.'
        : 'A flat, round circle that sits nicely on the table. If it becomes a deep bowl, you are too tight or are missing increases. If it ripples like a lettuce leaf, you have increased too much.';
    }
    return round.num >= 11
      ? 'This round has no increases — the edge now starts to bend downwards. That is intentional! It is the start of the sides of the hat.'
      : 'No increases this round — the circle “rests” and becomes more even. It should still lie fairly flat.';
  }
  if (round.phase === 'text') {
    return 'The sides now stand straight down, and the letters grow row by row. The red sections should sit directly above the red sections from the previous round. Check on the inside that the unused yarn is not pulling tight.';
  }
  if (round.phase === 'brim-inc') {
    return 'The hat starts to flare outwards at the bottom — the brim is underway. The edge should curve evenly outward, not wave.';
  }
  if (round.phase === 'wave') {
    return 'The wave pattern builds row by row. Set the hat on the table and check that the blue sections stack into waves pointing upward, evenly all the way around.';
  }
  return 'A clean, solid blue edge at the bottom all the way around. The hat is fully shaped — the brim should slope evenly outward.';
}

function roundStep(round: Round, roundIdx: number): StepDef {
  const techniques: TechniqueId[] = [];
  let body: string[] = [];
  let title = `Round ${round.num}`;
  const eyebrow = `Round ${round.num} of the hat`;
  let yarn: YarnColor = round.color;

  if (round.num === 1) {
    title = 'Round 1: Ten single crochets in the same opening';
    yarn = 'white';
    body = [
      'All ten single crochets go into the same chain stitch: chain 1. Do not move to a new chain along the way.',
      'Make single crochet number 1: insert the hook through chain 1, yarn over, pull back through the chain. Stop — you should now have two loops on the hook. Yarn over again and pull through both loops.',
      'Place a paperclip, safety pin, or small scrap of yarn through the V on top of this first single crochet. The marker means: “The round starts here.”',
      'Insert the hook back into the same chain 1 and make single crochet 2. Continue until you have ten single crochets in the same opening. It will get crowded — gently nudge the stitches aside with your fingers.',
      'Close the round: find the single crochet with the marker, insert the hook under both strands of the V on top, and make a slip stitch. You should have one loop left on the hook.',
    ];
    techniques.push('fastmaske', 'kjedemaske');
  } else if (round.phase === 'top' || round.phase === 'brim-inc') {
    yarn = 'white';
    if (round.num === 2) {
      title = 'Round 2: Two single crochets in each stitch';
      techniques.push('to-i-samme', 'fastmaske');
    } else if (round.increaseEvery !== null) {
      title = `Round ${round.num}: Increase to ${round.count} stitches`;
      techniques.push('to-i-samme');
    } else {
      title = `Round ${round.num}: One single crochet in each stitch`;
      techniques.push('fastmaske');
    }
    body = [ROUND_RITUAL_START_EN, rhythmTextEn(round), ROUND_RITUAL_END_EN];
    if (round.num <= 6) {
      body.splice(1, 0,
        'IMPORTANT: Always insert the hook under BOTH strands of the V on the stitch. Check before you yarn over: there should be TWO strands lying over the hook. If you go under only one, the other is left behind as a visible ridge around the hat.',
      );
    }
    if (round.phase === 'brim-inc') {
      body.unshift(
        round.num === 30
          ? 'Now the brim begins. The crown and text are finished — the next two rounds make the hat wider at the bottom, still in white.'
          : 'One more increase round in white. After this round you have 120 stitches = 12 wave blocks of 10 stitches each, and you are ready for the wave pattern.',
      );
    }
  } else if (round.phase === 'text') {
    const row = round.chartRow!;
    title = `Round ${round.num}: Text — chart row ${row}`;
    yarn = 'red';
    body = [
      ROUND_RITUAL_START_EN,
      `Follow chart row ${row} (row 1 is at the TOP of the chart — the hat is crocheted from the top down, so you work your way down the chart). One square is one single crochet. White square = white single crochet, red square = red single crochet. You start at stitch 1 on the LEFT side of the chart and read to the right. (The chart shows the outside of the finished hat — in your hands the work travels to the left, and that is the same thing.)`,
      'Remember the colour-change rule: the new colour is pulled through the last two loops of the stitch BEFORE the new colour should show. The app marks exactly which stitches this applies to below.',
      'The unused yarn lies along the inside of the hat. Feel free to crochet over it so it travels with you, but do not pull it tight — that will gather the hat.',
      'No increases in the text section. The round should still have 100 stitches.',
      ROUND_RITUAL_END_EN,
    ];
    if (round.num === 20) {
      body.splice(1, 0,
        'Now the text itself begins! Bring out the red yarn. The first colour change happens in the stitch before the first red square.',
      );
    }
    techniques.push('fargebytte', 'fastmaske');
  } else if (round.phase === 'wave') {
    const row = round.waveRow!;
    title = `Wave pattern — row ${row} of 6`;
    yarn = 'blue';
    const waveIntro: Record<number, string> = {
      1: 'Now Helene Spilling’s wave edge begins! Bring out the blue yarn. Mentally divide the 120 stitches into 12 blocks of 10 stitches — one wave per block. Follow wave row 1 in each block, all the way around.',
      2: 'Wave row 2: the waves grow. Keep switching between white and blue according to the pattern — same colour-change rule as in the text: change in the stitch before.',
      3: 'Wave row 3: the tops of the waves split. Follow the pattern square by square.',
      4: 'Wave row 4: here comes the first increase. The red square in the chart does NOT mean red yarn — it means two blue single crochets in the same stitch. One increase per wave gives 132 stitches.',
      5: 'Wave row 5: one more increase per wave (two blue single crochets in the marked stitch). After the round you have 144 stitches.',
      6: 'Wave row 6: an all-blue round — the waves blend into the blue edge.',
    };
    body = [
      waveIntro[row],
      ROUND_RITUAL_START_EN,
      'White square = white single crochet, blue square = blue single crochet. Red square = two blue single crochets in the same stitch (increase). The colour recipe for the round is below, stitch by stitch.',
      ROUND_RITUAL_END_EN,
    ];
    techniques.push('fargebytte', row >= 4 ? 'to-i-samme' : 'fastmaske');
  } else if (round.phase === 'brim') {
    title = 'Final round: Solid blue edge';
    yarn = 'blue';
    body = [
      ROUND_RITUAL_START_EN,
      'Make one blue single crochet in every single stitch, all the way around. No increases. This is the bottom, clean blue edge of the brim.',
      ROUND_RITUAL_END_EN,
    ];
    techniques.push('fastmaske');
  }

  return {
    id: `round-${round.num}`,
    kind: 'round',
    title,
    eyebrow,
    body,
    yarn,
    countChip: `${round.count} sc`,
    techniques,
    roundIdx,
    confirm: null,
    check: {
      look: roundLook(round),
      diameterCm: round.phase === 'top' ? discRange(round.count) : null,
      count: round.count,
    },
  };
}

export function buildStepsEn(rounds: Round[]): StepDef[] {
  const steps: StepDef[] = [];

  steps.push({
    id: 'intro-utstyr',
    kind: 'intro',
    title: 'Welcome! What you need',
    eyebrow: 'Getting started',
    body: [
      'We start gently: three short steps before the hat itself. This guide takes you through the “Ro det i land” hat by Helene Spilling (4.0 mm) — one round at a time.',
      'The 3D hat grows as you crochet. Open the Stitch School whenever you want to see the movements animated.',
      'Check that you have the supplies:',
    ],
    checklist: [
      '4.0 mm crochet hook',
      'White yarn (thicker cotton, ideally about 50 g = 70–80 m)',
      'Red yarn',
      'Blue yarn',
      'Scissors',
      'One paperclip, safety pin, or scrap of yarn as a stitch marker',
      'Tape measure or ruler',
      'Tapestry needle for the end, if you have one',
    ],
    yarn: null,
    countChip: '4.0 mm hook',
    techniques: ['holde-garnet'],
    roundIdx: null,
    confirm: null,
  });

  steps.push({
    id: 'intro-garn',
    kind: 'intro',
    title: 'The two yarn ends — and the most important rule',
    eyebrow: 'Getting started',
    body: [
      'When you begin, you have two strands: The working yarn is the long strand to the ball — that is what you crochet with. The yarn tail is the short loose end at the starting knot — you do not make stitches with it.',
      'The most important rule: The loop sitting on the crochet hook is NOT a stitch.',
      'When you count, count the small V shapes in the work. Never the loop on the hook, never the chain that starts a round, and never the slip stitch that closes it.',
    ],
    yarn: null,
    countChip: '4.0 mm hook',
    techniques: ['holde-garnet', 'luftmaske', 'fastmaske'],
    roundIdx: null,
    confirm: null,
  });

  steps.push({
    id: 'practice',
    kind: 'practice',
    title: 'Practise first — this is not the hat',
    eyebrow: 'Getting started',
    body: [
      'Last part of getting started: make a slip knot, 10 chain stitches, and crochet single crochets back across. A couple of straight rows is fine — this is only practice.',
      'Crooked? Totally fine. Pull it out and try again until the movement feels natural.',
      'You are ready for the hat when you can make a single crochet and understand why you first get two loops on the hook, then one.',
      'Use the Stitch School for animations. Videos are not linked (rights) — search e.g. “slip knot crochet”, “chain stitch beginner”, or “single crochet for beginners” on YouTube, Instagram, or TikTok.',
    ],
    yarn: 'white',
    countChip: '4.0 mm hook',
    techniques: ['lopeknute', 'luftmaske', 'fastmaske'],
    roundIdx: null,
    confirm: null,
  });

  steps.push({
    id: 'start',
    kind: 'start',
    title: 'Start the hat: Slip knot and two chain stitches',
    eyebrow: 'The hat itself begins',
    body: [
      'Bring out the white yarn. We use a simple start with two chain stitches — it is easier than a magic ring.',
      'Make a slip knot and put the loop on the crochet hook. Gently pull the working yarn until the loop sits loosely around the thick part of the hook. The loop should be able to slide.',
      'Make one chain stitch. Make one more chain stitch. Now you have: knot — chain 1 — chain 2 — loop on the hook.',
      'Find chain 1: it is closest to the knot, closest to the short yarn tail, and farthest from the crochet hook. Insert the hook through the opening in chain 1 — think of the hook going through a doorway, not through the wall.',
    ],
    yarn: 'white',
    countChip: '2 ch',
    techniques: ['lopeknute', 'luftmaske'],
    roundIdx: null,
    confirm: null,
  });

  rounds.forEach((round, roundIdx) => {
    steps.push(roundStep(round, roundIdx));
    if (round.num === 19) {
      steps.push({
        id: 'size-check',
        kind: 'size-check',
        title: 'Size check: measure the crown',
        eyebrow: 'Checkpoint after round 19',
        body: [
          'Lay the crown flat without stretching it, and measure the diameter from edge to edge through the centre.',
          'For a typical adult size, about 17.5–20 cm is a useful target in this 4.0 mm version (100 stitches before the text).',
        ],
        bullets: [
          '17.5–20 cm: Perfect. Continue with 100 stitches into the text.',
          'More than 20 cm: The crown may end up a bit roomy. You can still continue — or undo round 19 and skip that increase (continue with 90 stitches and a little less space between the words).',
          'Less than 17.5 cm: Make one extra increase round before the text: one single crochet in nine different stitches, then two in the next (increase in every 10th). That gives you 110 stitches — then place 5 extra white stitches before the first RO and 5 after the last RO when you read the chart.',
        ],
        yarn: 'white',
        countChip: '17.5–20 cm',
        techniques: [],
        roundIdx: 18,
        confirm: null,
      });
    }
  });

  steps.push({
    id: 'finish',
    kind: 'finish',
    title: 'Finish the hat and weave in the ends',
    eyebrow: 'Final step',
    body: [
      'After the last stitch: cut the yarn, leaving about 15 cm of thread. Pull the entire yarn tail through the loop on the crochet hook and tighten gently.',
      'Weave the yarn tail back and forth under a few stitches on the inside of the hat. If you do not have a tapestry needle, you can use the crochet hook to pull the tail under the stitches.',
      'Do not cut right up against the knot — make sure the tail is well secured first. Weave in the yarn tails from the colour changes the same way.',
    ],
    yarn: 'blue',
    countChip: null,
    techniques: ['feste-traden'],
    roundIdx: rounds.length - 1,
    confirm: null,
  });

  steps.push({
    id: 'done',
    kind: 'done',
    title: 'Congratulations — the hat is finished!',
    eyebrow: 'RO DET I LAND — the hat by Helene Spilling',
    body: [
      'You have crocheted a whole bucket hat, with a colour pattern and wave edge, as a beginner. That is really well done.',
      'Feel free to spin the hat in 3D and compare it with your own. Remember that the first rounds always look a bit uneven — they do for everyone.',
      'The pattern is based on the “Ro det i land” hat by Helene Spilling. She asks that those who can send a small donation via Vipps to Barnekreftforeningen (the Children’s Cancer Society) as payment for the original pattern.',
    ],
    yarn: null,
    countChip: null,
    techniques: [],
    roundIdx: rounds.length - 1,
    confirm: null,
  });

  return steps;
}
