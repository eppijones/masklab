export interface GuideStep {
  n: number;
  title: string;
  body: string;
  parts: string[];
  time: string;
}

export const GUIDE: GuideStep[] = [
  {
    n: 1,
    title: 'Print the gates',
    body: 'Slice gate-clip.stl in PETG, 0.2 mm, 4 walls. Print a magazine of 160 plus 20 spares. They must be identical — one bad throat and the needle will snag. Deburr the V with a 4 mm drill as a gauge.',
    parts: ['gate-clip.stl × 180', 'magazine.stl', 'carriage.stl'],
    time: '14 h print',
  },
  {
    n: 2,
    title: 'Cut the hex deck',
    body: 'A 460 mm hexagon of 18 mm birch. The C-axis bearing hole is Ø100 mm, centred. Three 2040 legs on a 150 mm radius. Flatness matters more than beauty.',
    parts: ['18 mm birch', 'jigsaw or CNC'],
    time: '1 h',
  },
  {
    n: 3,
    title: 'Bolt the tripod',
    body: 'M5 T-nuts into the 2040. Legs vertical. Deck on top. Check with a square. Do not print structural legs.',
    parts: ['2040 × 3', 'M5 × 16'],
    time: '30 min',
  },
  {
    n: 4,
    title: 'Seat the turntable',
    body: 'Press the lazy-susan into the deck. Motor C underneath, GT2 5:1 onto the hub. This bearing is the machine’s concentricity. Buy it.',
    parts: ['100 mm lazy-susan', 'NEMA17', 'GT2 20T/100T'],
    time: '45 min',
  },
  {
    n: 5,
    title: 'Assemble the chain',
    body: 'Clip ten gates into a necklace on the table lip. The rest live in the magazine. Living-hinge pins are 1.75 mm filament. The necklace must rotate freely by hand.',
    parts: ['10 gates', 'filament pins'],
    time: '20 min',
  },
  {
    n: 6,
    title: 'Build the station arm',
    body: '2040 arm from the rim, pointing at the centre. MGN9 on the arm. Carriage holds the latch needle pointing inward. H home is fully retracted, outside the largest brim.',
    parts: ['2040 210 mm', 'MGN9', 'carriage', 'NEMA17'],
    time: '1 h',
  },
  {
    n: 7,
    title: 'Latch and injector',
    body: 'Servo or NEMA on the latch cam. Magazine on the +Y side of the carriage, rack toward the chain. Dry-cycle inject: a gate must snap between two neighbours without lifting the necklace.',
    parts: ['servo', 'magazine', 'rack'],
    time: '1 h',
  },
  {
    n: 8,
    title: 'Yarn path',
    body: 'Four cone stands on the back edge. Dancer, ceramic eyelet, turret. Thread one colour and pull: the dancer should move, the encoder should count. Repeat for four.',
    parts: ['4 stands', '4 dancers', 'turret'],
    time: '40 min',
  },
  {
    n: 9,
    title: 'Brain',
    body: 'Pi 5 + Octopus (or SKR 3) + 6× TMC2209 UART. 24 V into the MCU, 5 V into the Pi. E-stop cuts 24 V. Camera on a printed boom aimed at the working gate.',
    parts: ['Pi', 'MCU', 'PSU', 'camera'],
    time: '1.5 h',
  },
  {
    n: 10,
    title: 'First power-on',
    body: 'Home H, L, I, T, Z. Jog C one gate. The working gate must stop under the needle within 0.3 mm. If it does not, the belt slipped — not the firmware.',
    parts: ['USB', 'Klipper/HEKLO cfg'],
    time: '30 min',
  },
  {
    n: 11,
    title: 'Seed',
    body: 'Either drop a printed 10-loop seed ring into the ten gates, or run chain×10 + join. Then one round of sc. If 10/10 V’s recapture, you have a machine. If not, stop — see Proof.',
    parts: ['seed-ring.stl or yarn'],
    time: '15 min',
  },
  {
    n: 12,
    title: 'A hat',
    body: 'Load a catalog job (NORGE Home is the hard one). Realtime is ~3.5–5 h. Leave the camera auditing each round. Bind-off opens the chain; lift the hat, flip it, weave ends by hand.',
    parts: ['4 cones DK cotton'],
    time: 'one evening',
  },
];
