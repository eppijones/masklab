/**
 * The build, step by step. Bilingual and deliberately terse.
 *
 * Fastener callouts are structured ({sku, qty}) so the harness can sum them
 * across every step and fail if one asks for a screw that never made the
 * shopping list. Every step ends with a `check` — something observable. That is
 * IKEA's real trick, far more than the diagrams: you are never more than one
 * step from knowing you got it wrong.
 */

export type Track = 'station' | 'machine';

export interface GuideStep {
  n: number;
  track: Track;
  title: string;
  titleNo: string;
  body: string;
  bodyNo: string;
  /** Part ids consumed. Drives the 3D highlight and the coverage check. */
  parts: string[];
  uses: { sku: string; qty: number }[];
  check: string;
  checkNo: string;
  minutes: number;
  warn?: string;
  warnNo?: string;
  /**
   * How the 3D diagram should stage this step.
   *
   * 'plate' lays the parts out flat, the way they come off a print bed. A step
   * that says "print these six things" was drawing them at their final mounted
   * positions inside a half-built machine, which is a picture of an assembly
   * that does not exist yet and cannot be read as an instruction.
   */
  layout?: 'plate';
}

export const FASTENERS: Record<string, { label: string; labelNo: string; lenMm: number | null }> = {
  'M3x8-SHCS': { label: 'M3 × 8 cap screw', labelNo: 'M3 × 8 unbrakoskrue', lenMm: 8 },
  'M3x10-SHCS': { label: 'M3 × 10 cap screw', labelNo: 'M3 × 10 unbrakoskrue', lenMm: 10 },
  'M3x16-SHCS': { label: 'M3 × 16 cap screw', labelNo: 'M3 × 16 unbrakoskrue', lenMm: 16 },
  'M3x20-SHCS': { label: 'M3 × 20 cap screw', labelNo: 'M3 × 20 unbrakoskrue', lenMm: 20 },
  'M3-NUT': { label: 'M3 nyloc nut', labelNo: 'M3 låsemutter', lenMm: null },
  'M4x12-SHCS': { label: 'M4 × 12 cap screw', labelNo: 'M4 × 12 unbrakoskrue', lenMm: 12 },
  'M4-NUT': { label: 'M4 nyloc nut', labelNo: 'M4 låsemutter', lenMm: null },
  'M5x10-BHCS': { label: 'M5 × 10 button screw', labelNo: 'M5 × 10 linseskrue', lenMm: 10 },
  'M5x16-BHCS': { label: 'M5 × 16 button screw', labelNo: 'M5 × 16 linseskrue', lenMm: 16 },
  'M5-TNUT': { label: 'M5 T-nut, 2020', labelNo: 'M5 T-mutter, 2020', lenMm: null },
};

export const STEPS: readonly GuideStep[] = [
  {
    n: 1,
    track: 'station',
    title: 'Print the catch test — nothing else yet',
    titleNo: 'Skriv ut fangsttesten — ikke noe annet ennå',
    body: 'Four gates, one comb segment, one hook. Two hours on the plate and about 40 g. Do not order anything until step 2 has answered.',
    bodyNo: 'Fire porter, ett kamsegment, én krok. To timer på platen og rundt 40 g. Ikke bestill noe før steg 2 har svart.',
    parts: ['gate-6', 'gate-7', 'gate-7p5', 'gate-8', 'comb-segment', 'crochet-hook'],
    uses: [],
    layout: 'plate',
    check: 'Gates seat in the comb by thumb and do not fall out when you turn it upside down.',
    checkNo: 'Portene sitter i kammen med tommelen og faller ikke ut når du snur den opp ned.',
    minutes: 30,
  },
  {
    n: 2,
    track: 'station',
    title: 'G0 — does a gate catch a live stitch?',
    titleNo: 'G0 — fanger en port en levende maske?',
    body: 'Crochet a 100-stitch tube by hand. Hold the comb against the working edge and turn the tube past it — by hand, no motors. Count how many of 100 stitch mouths enter a throat on their own.',
    bodyNo: 'Hekle en slange på 100 masker for hånd. Hold kammen mot arbeidskanten og drei slangen forbi — for hånd, uten motorer. Tell hvor mange av 100 maskemunner som går inn i en hals av seg selv.',
    parts: [],
    uses: [],
    check: '80 of 100 or better, at some throat width. Below 50, stop and read the note — the money is still in your pocket.',
    checkNo: '80 av 100 eller bedre, ved en av halsbreddene. Under 50: stopp og les merknaden — pengene ligger fortsatt i lomma.',
    minutes: 120,
    warn: 'This is the whole project in one evening. Every design before this one skipped it and went straight to ordering motors. If a gate will not take a stitch off a tube you are turning gently by hand, it will not take one at speed.',
    warnNo: 'Dette er hele prosjektet på én kveld. Alle tidligere utkast hoppet over det og bestilte motorer med én gang. Klarer ikke porten å ta en maske av en slange du dreier rolig for hånd, klarer den det heller ikke i fart.',
  },
  {
    n: 3,
    track: 'station',
    title: 'Print the rest',
    titleNo: 'Skriv ut resten',
    body: 'PETG for anything structural or near a motor, PLA for the camera pod, TPU for the skirt. Print all four throat widths — G2 picks the winner.',
    bodyNo: 'PETG til alt som bærer eller sitter nær en motor, PLA til kamerahuset, TPU til skjørtet. Skriv ut alle fire halsbredder — G2 avgjør.',
    parts: ['hook-collet', 'rail-bracket', 'nema17-mount', 'camera-pod', 'tension-dancer', 'yarn-finger', 'swift-base', 'swift-spindle', 'swift-guide', 'bench-base'],
    uses: [],
    layout: 'plate',
    check: 'No layer splits, no lifted corners, and the hook nose is smooth under a thumbnail.',
    checkNo: 'Ingen lagsprekker, ingen løftede hjørner, og krokspissen er glatt under en tommelnegl.',
    minutes: 40,
  },
  {
    n: 4,
    track: 'station',
    title: 'Rail and brackets',
    titleNo: 'Skinne og bratter',
    body: 'Cut 200 mm of MGN9, deburr both ends. Brackets to the base, rail to the brackets, finger-tight. Slide the carriage on from one end.',
    bodyNo: 'Kapp 200 mm MGN9, avgrad begge ender. Bratter på bunnplaten, skinne på brattene, fingerstramt. Skyv vognen på fra én ende.',
    parts: ['rail-bracket', 'bench-base'],
    uses: [
      { sku: 'M3x10-SHCS', qty: 6 },
      { sku: 'M5x10-BHCS', qty: 4 },
      { sku: 'M5-TNUT', qty: 4 },
      { sku: 'M4x12-SHCS', qty: 4 },
      { sku: 'M4-NUT', qty: 4 },
    ],
    check: 'The carriage slides the full length with one finger, no tight spot.',
    checkNo: 'Vognen glir hele veien med én finger, uten trange punkter.',
    minutes: 30,
    warn: 'Never run the carriage off the rail end — the balls fall out and it is finished.',
    warnNo: 'Kjør aldri vognen av skinneenden — kulene faller ut og den er ødelagt.',
  },
  {
    n: 5,
    track: 'station',
    title: 'Hook and collet',
    titleNo: 'Krok og krokholder',
    body: 'Collet onto the carriage. Printed hook into the bore, flat against the flat, throat facing the comb. Pinch the clamp slit onto a captive nut.',
    bodyNo: 'Holderen på vognen. Printet krok i hullet, flate mot flate, halsen mot kammen. Klem klemsporet mot en fastlåst mutter.',
    parts: ['hook-collet', 'crochet-hook'],
    uses: [
      { sku: 'M3x10-SHCS', qty: 4 },
      { sku: 'M3x20-SHCS', qty: 1 },
      { sku: 'M3-NUT', qty: 1 },
    ],
    check: 'G1: push the hook through a held stitch 50 times. 50/50 passes with no split yarn and no snag.',
    checkNo: 'G1: før kroken gjennom en holdt maske 50 ganger. 50/50 uten splittet garn og uten hekting.',
    minutes: 25,
    warn: 'Hand tight plus a quarter turn. You are clamping printed plastic. If the yarn catches, swap to a fresh hook before you change anything else — it is a consumable and you printed five.',
    warnNo: 'Fingerstramt pluss en kvart omdreining. Du klemmer på printet plast. Hvis garnet hekter seg: bytt til en ny krok før du endrer noe annet — den er forbruksvare, og du printet fem.',
  },
  {
    n: 6,
    track: 'station',
    title: 'Mount the comb',
    titleNo: 'Monter kammen',
    body: 'Comb to the base, mouths facing the hook. Three gates in — note the stagger: alternate gates sit 3 mm higher and tilt back, so all three throats present on one line.',
    bodyNo: 'Kammen på bunnplaten, munnene mot kroken. Tre porter i — merk forskyvningen: annenhver port sitter 3 mm høyere og heller bakover, så alle tre halser står på én linje.',
    parts: ['comb-segment', 'gate-8'],
    uses: [
      { sku: 'M3x16-SHCS', qty: 2 },
      { sku: 'M3-NUT', qty: 2 },
    ],
    check: 'Three gates seated, tongues home, none rocking — and a straightedge across the three mouths touches all three.',
    checkNo: 'Tre porter på plass, tunger i bunn, ingen som vipper — og en rett kant over de tre munnene treffer alle tre.',
    minutes: 20,
  },
  {
    n: 7,
    track: 'station',
    title: 'The yarn spinner',
    titleNo: 'Garnsnurreren',
    body: 'A 608 into the base, spindle pressed on, guide arm beside it. Drop a skein over the four fingers and lead the strand up through the eyelet, then down to the dancer.',
    bodyNo: 'Et 608-lager i foten, spindelen presset på, føringsarmen ved siden av. Legg et nøste over de fire fingrene og før tråden opp gjennom øyet, så ned til strammeren.',
    parts: ['swift-base', 'swift-spindle', 'swift-guide'],
    uses: [
      { sku: 'M5x10-BHCS', qty: 4 },
      { sku: 'M5-TNUT', qty: 4 },
    ],
    check: 'A flick of a finger spins a loaded skein for three full turns, and pulling the strand does not lift the spindle.',
    checkNo: 'Et lite dytt får et fullt nøste til å snurre tre hele omdreininger, og å dra i tråden løfter ikke spindelen.',
    minutes: 20,
    warn: 'The yarn turns, not the strand. Pulling from a stationary ball adds one twist per revolution, and enough twist changes the yarn diameter — which is one of the two numbers the gate throat is sized on.',
    warnNo: 'Garnet snurrer, ikke tråden. Å dra fra et stillestående nøste legger inn én omdreining vri per runde, og nok vri endrer garntykkelsen — som er ett av de to tallene halsbredden er dimensjonert etter.',
  },
  {
    n: 8,
    track: 'station',
    title: 'Motors, wheel, finger',
    titleNo: 'Motorer, hjul, finger',
    body: 'Thermistor into each motor mount pocket before the motor goes on. Shaft through two 608s, tooth on, grub locked. Finger onto the servo horn with 40 mm of filament as the wire tip.',
    bodyNo: 'Termistor i lommen på hvert motorfeste før motoren monteres. Aksel gjennom to 608-lager, tann på, pinneskrue i. Fingeren på servohornet med 40 mm filament som spiss.',
    parts: ['nema17-mount', 'wheel-tooth', 'wheel-shaft', 'yarn-finger'],
    uses: [
      { sku: 'M3x16-SHCS', qty: 8 },
      { sku: 'M5x10-BHCS', qty: 4 },
      { sku: 'M5-TNUT', qty: 4 },
      { sku: 'M3x10-SHCS', qty: 2 },
    ],
    check: 'Both motors spin freely by hand; both thermistors touch motor metal.',
    checkNo: 'Begge motorer går fritt for hånd; begge termistorer ligger mot motormetall.',
    minutes: 45,
    warn: 'Fit the thermistors now. They are the only thing between a stalled motor and a fire.',
    warnNo: 'Monter termistorene nå. De er det eneste mellom en fastkjørt motor og brann.',
  },
  {
    n: 9,
    track: 'station',
    title: 'Wire it — fuse first',
    titleNo: 'Kobling — sikring først',
    body: 'Fuse on the PSU positive, then the E-stop in the same line. Drivers, motors with ferrules, thermistors to analogue in, LED to 12 V constant. Do not power up yet.',
    bodyNo: 'Sikring på pluss fra strømforsyningen, så nødstopp i samme linje. Drivere, motorer med hylser, termistorer til analog inn, LED på konstant 12 V. Ikke slå på ennå.',
    parts: [],
    uses: [],
    check: 'E-stop pressed reads open circuit on the motor supply.',
    checkNo: 'Nødstopp inne gir brutt krets på motorforsyningen.',
    minutes: 45,
    warn: 'The E-stop must break motor POWER, not signal a pin. Software cannot override a broken circuit.',
    warnNo: 'Nødstoppen må bryte STRØMMEN til motorene, ikke gi signal til en pinne. Programvare kan ikke overstyre en brutt krets.',
  },
  {
    n: 10,
    track: 'station',
    title: 'Camera, light, power on',
    titleNo: 'Kamera, lys, oppstart',
    body: 'Aim the pod so the middle gate throat fills a third of the frame. Lock focus manually. LED across the throat, not down it. Power on with a hand on the E-stop and jog each axis 1 mm.',
    bodyNo: 'Rett huset så halsen på midterste port fyller en tredel av bildet. Lås fokus manuelt. LED på tvers av halsen, ikke ned i den. Slå på med hånden på nødstoppen og kjør hver akse 1 mm.',
    parts: ['camera-pod'],
    uses: [
      { sku: 'M3x8-SHCS', qty: 2 },
      { sku: 'M3-NUT', qty: 2 },
      { sku: 'M5x10-BHCS', qty: 1 },
      { sku: 'M5-TNUT', qty: 1 },
    ],
    check: 'Both axes jog the right way; both thermistors read room temperature.',
    checkNo: 'Begge akser går riktig vei; begge termistorer viser romtemperatur.',
    minutes: 40,
    warn: 'A sensor reading 0 or absurdly high is disconnected. Fix it before running anything.',
    warnNo: 'En føler som viser 0 eller absurd høyt er frakoblet. Fiks det før du kjører noe.',
  },
  {
    n: 11,
    track: 'station',
    title: 'G2 — the wheel takes it out of the comb',
    titleNo: 'G2 — hjulet tar den ut av kammen',
    body: 'Tension the swatch so three mouths sit in three gates. Run the tooth through its pickup arc: does it take the loop out of the gate and carry it? Fifty times, logged, camera recording.',
    bodyNo: 'Stram prøvelappen så tre maskemunner ligger i tre porter. Kjør tannen gjennom opptaksbuen: tar den løkken ut av porten og bærer den? Femti ganger, logget, med kamera.',
    parts: [],
    uses: [],
    check: '50/50 pickups. Below 40/50, drop to the next throat width before changing anything else.',
    checkNo: '50/50 opptak. Under 40/50: gå ned én halsbredde før du endrer noe annet.',
    minutes: 120,
    warn: 'If every width fails, the answer is a thinner hook nose — not a wider throat. There is 0.2 mm of room at the throat and a reprint of the hook is four grams.',
    warnNo: 'Hvis alle bredder feiler er svaret en tynnere krokspiss — ikke en bredere hals. Det er 0,2 mm å gå på i halsen, og en ny krok er fire gram.',
  },
  {
    n: 12,
    track: 'station',
    title: 'G3 — one real stitch',
    titleNo: 'G3 — én ekte maske',
    body: 'Yarn from the spinner through dancer and eyelet to the finger. Full cycle: pick up, plunge, yarn over, draw through two. Exactly one loop left. Fifty in a row, export the log.',
    bodyNo: 'Garn fra snurreren gjennom strammer og øye til fingeren. Full syklus: ta opp, stikk, legg garn, trekk gjennom to. Nøyaktig én løkke igjen. Femti på rad, eksporter loggen.',
    parts: ['tension-dancer'],
    uses: [
      { sku: 'M3x20-SHCS', qty: 1 },
      { sku: 'M3-NUT', qty: 1 },
    ],
    check: '50 consecutive, one loop each, height spread under 0.6 mm.',
    checkNo: '50 på rad, én løkke hver, høydespredning under 0,6 mm.',
    minutes: 180,
    warn: 'Ten in a row is further than any published crochet machine has reached in the round. Fifty is the target; four is the state of the art.',
    warnNo: 'Ti på rad er lenger enn noen publisert heklemaskin har kommet i omgang. Femti er målet; fire er dagens toppnivå.',
  },
];

export const MACHINE_STEPS: readonly GuideStep[] = [
  {
    n: 13,
    track: 'machine',
    title: 'Cut the deck',
    titleNo: 'Kapp dekket',
    body: 'Four 2020 lengths into a 520 × 420 mm frame, plus two cross members.',
    bodyNo: 'Fire 2020-lengder til en ramme på 520 × 420 mm, pluss to tverrstag.',
    parts: [],
    uses: [
      { sku: 'M5x16-BHCS', qty: 12 },
      { sku: 'M5-TNUT', qty: 12 },
    ],
    check: 'Diagonals match within 1 mm and it does not rock.',
    checkNo: 'Diagonalene er like innen 1 mm og den vipper ikke.',
    minutes: 45,
  },
  {
    n: 14,
    track: 'machine',
    title: 'Seat the turntable bearing',
    titleNo: 'Monter dreielageret',
    body: 'Lazy-susan to the deck centre, hub adapter on top. This bearing is bought, never printed — it is the machine’s concentricity.',
    bodyNo: 'Dreielager i midten av dekket, navadapter oppå. Lageret kjøpes, aldri printes — det er maskinens senterpresisjon.',
    parts: ['hub-adapter'],
    uses: [
      { sku: 'M4x12-SHCS', qty: 4 },
      { sku: 'M5x10-BHCS', qty: 6 },
    ],
    check: 'The hub turns smoothly through a full revolution.',
    checkNo: 'Navet går jevnt en hel omdreining.',
    minutes: 30,
  },
  {
    n: 15,
    track: 'machine',
    title: 'Platter and C belt',
    titleNo: 'Dreieskive og C-rem',
    body: 'Platter onto the hub, GT2 around the rim groove to a 20T pulley. Driving the 240 mm rim gives ~34:1 with no gearbox.',
    bodyNo: 'Skiven på navet, GT2 rundt kantsporet til en 20T remskive. Drift på 240 mm-kanten gir ~34:1 uten girkasse.',
    parts: ['platter'],
    uses: [{ sku: 'M5x10-BHCS', qty: 6 }],
    check: 'Rim runout under 0.3 mm; belt does not slip when you resist by hand.',
    checkNo: 'Kantkast under 0,3 mm; remmen glipper ikke når du holder igjen.',
    minutes: 45,
    warn: 'Every stitch position for 3 694 stitches is measured from this disc. Check runout now.',
    warnNo: 'Hver maskeposisjon i 3 694 masker måles fra denne skiven. Sjekk kastet nå.',
  },
  {
    n: 16,
    track: 'machine',
    title: 'Assemble the mandrel',
    titleNo: 'Sett sammen mandrellen',
    body: 'Three sections, bayonet twist-lock, crown on top. Lathed from the app’s own hat profile, so the former is the shape the pattern makes.',
    bodyNo: 'Tre deler, bajonettlås, kronen øverst. Dreid fra appens egen lueprofil, så formen er den formen oppskriften faktisk lager.',
    parts: ['mandrel-brim', 'mandrel-wall', 'mandrel-crown'],
    uses: [],
    check: 'They twist together without force; under 0.5 mm wobble at the crown.',
    checkNo: 'De vris sammen uten makt; under 0,5 mm kast ved kronen.',
    minutes: 30,
  },
  {
    n: 17,
    track: 'machine',
    title: 'Z column and R carriage',
    titleNo: 'Z-søyle og R-slede',
    body: 'Two brackets to the deck, 2020 column between them, trammed vertical. T8 screw for Z. R rides the rest of the MGN9 metre.',
    bodyNo: 'To bratter på dekket, 2020-søyle mellom dem, rettet loddrett. T8-skrue til Z. R går på resten av MGN9-meteren.',
    parts: ['column-bracket'],
    uses: [
      { sku: 'M5x10-BHCS', qty: 8 },
      { sku: 'M5-TNUT', qty: 8 },
      { sku: 'M4x12-SHCS', qty: 4 },
      { sku: 'M4-NUT', qty: 4 },
    ],
    check: 'Vertical within 0.5 mm over its height, squared off the platter.',
    checkNo: 'Loddrett innen 0,5 mm over høyden, målt mot skiven.',
    minutes: 60,
  },
  {
    n: 18,
    track: 'machine',
    title: 'Move the Station across',
    titleNo: 'Flytt stasjonen over',
    body: 'Unbolt the Station from the bench plate — collet, rail, wheel motor, finger, camera, thermistors, spinner, all still bolted together — and bolt it onto the R carriage. Nothing is rebuilt. The bench plate is the only thing left behind.',
    bodyNo: 'Skru stasjonen av benkeplaten — holder, skinne, hjulmotor, finger, kamera, termistorer, snurrer, alt fortsatt sammenskrudd — og skru den på R-sleden. Ingenting bygges om. Benkeplaten er det eneste som blir igjen.',
    parts: [],
    uses: [
      { sku: 'M5x10-BHCS', qty: 4 },
      { sku: 'M5-TNUT', qty: 4 },
    ],
    check: 'The Station faces the mandrel and P still plunges exactly as on the bench.',
    checkNo: 'Stasjonen peker mot mandrellen og P stikker nøyaktig som på benken.',
    minutes: 45,
  },
  {
    n: 19,
    track: 'machine',
    title: 'Full comb arc',
    titleNo: 'Hele holdekammen',
    body: 'The 10-gate arc replaces the 3-gate segment. Same pitch, same seats, same gates — there are just more of them.',
    bodyNo: 'Buen med 10 porter erstatter segmentet med 3. Samme deling, samme seter, samme porter — bare flere.',
    parts: ['comb-arc'],
    uses: [
      { sku: 'M4x12-SHCS', qty: 2 },
      { sku: 'M4-NUT', qty: 2 },
    ],
    check: 'All ten seat, and the tooth clears every one by the same margin.',
    checkNo: 'Alle ti sitter, og tannen klarerer hver av dem med samme margin.',
    minutes: 30,
  },
  {
    n: 20,
    track: 'machine',
    title: 'Build the eight-tooth wheel',
    titleNo: 'Bygg åttetannshjulet',
    body: 'Eight teeth into the hub, each locked with a grub screw. Belt to the motor at 3:1.',
    bodyNo: 'Åtte tenner i navet, hver låst med pinneskrue. Rem til motoren på 3:1.',
    parts: ['wheel-hub', 'wheel-tooth'],
    uses: [{ sku: 'M3x10-SHCS', qty: 8 }],
    check: 'All eight pass the comb at the same height within 0.2 mm.',
    checkNo: 'Alle åtte passerer kammen i samme høyde innen 0,2 mm.',
    minutes: 40,
  },
  {
    n: 21,
    track: 'machine',
    title: 'Turret and four cones',
    titleNo: 'Karusell og fire koner',
    body: 'Turret onto the T motor, four cone stands behind, one dancer and one ceramic eyelet per colour.',
    bodyNo: 'Karusellen på T-motoren, fire konestativ bak, én strammer og ett keramisk øye per farge.',
    parts: ['turret-drum', 'tension-dancer'],
    uses: [
      { sku: 'M3x10-SHCS', qty: 2 },
      { sku: 'M3x20-SHCS', qty: 4 },
      { sku: 'M3-NUT', qty: 4 },
    ],
    check: 'All four reach the finger; indexing 90° swaps which is presented.',
    checkNo: 'Alle fire når fingeren; 90° indeksering bytter hvilken som presenteres.',
    minutes: 50,
  },
  {
    n: 22,
    track: 'machine',
    title: 'Take-down skirt',
    titleNo: 'Nedtrekkskjørt',
    body: 'The TPU skirt keeps finished fabric off the gates. Without it the hat climbs back into the comb around round 20.',
    bodyNo: 'TPU-skjørtet holder ferdig stoff unna portene. Uten det klatrer lua tilbake i kammen rundt omgang 20.',
    parts: ['takedown-skirt'],
    uses: [{ sku: 'M3x16-SHCS', qty: 3 }],
    check: 'Fingers flex under light pressure and spring back.',
    checkNo: 'Fingrene fjærer under lett trykk og spretter tilbake.',
    minutes: 20,
  },
  {
    n: 23,
    track: 'machine',
    title: 'Remaining axes, then the enclosure',
    titleNo: 'Resten av aksene, så kabinettet',
    body: 'C, Z, R and T. A thermistor on every one. Then the panels and a door interlock in series with the E-stop.',
    bodyNo: 'C, Z, R og T. En termistor på hver. Så panelene og en dørbryter i serie med nødstoppen.',
    parts: [],
    uses: [],
    check: 'Opening the door reads open circuit on the motor supply, same as the E-stop.',
    checkNo: 'Å åpne døren gir brutt krets på motorforsyningen, som nødstoppen.',
    minutes: 120,
    warn: 'Six motors now. Confirm every thermistor reads a plausible room temperature before any long run.',
    warnNo: 'Seks motorer nå. Bekreft at hver termistor viser troverdig romtemperatur før lange kjøringer.',
  },
  {
    n: 24,
    track: 'machine',
    title: 'The first hat',
    titleNo: 'Den første lua',
    body: 'Four colours in palette order. Hand-start the ten-stitch ring on the crown — thirty seconds of several hours. Pick a pattern, press Start, watch the first round with a hand on the E-stop.',
    bodyNo: 'Fire farger i palettrekkefølge. Start ringen på ti masker for hånd på kronen — tretti sekunder av flere timer. Velg en oppskrift, trykk Start, følg første omgang med hånden på nødstoppen.',
    parts: [],
    uses: [],
    check: 'A full round completes with the stitch count the pattern predicted.',
    checkNo: 'En hel omgang fullføres med maskeantallet oppskriften forutsa.',
    minutes: 60,
    warn: 'Do not leave it unattended until you have watched it finish a whole hat awake.',
    warnNo: 'Ikke la den gå uten tilsyn før du har sett den fullføre en hel lue mens du er våken.',
  },
];

export const ALL_STEPS: readonly GuideStep[] = [...STEPS, ...MACHINE_STEPS];

export const TOTAL_MINUTES = STEPS.reduce((s, x) => s + x.minutes, 0);
export const MACHINE_MINUTES = MACHINE_STEPS.reduce((s, x) => s + x.minutes, 0);

export function fastenerDemand(track?: Track): Record<string, number> {
  const out: Record<string, number> = {};
  const src = track ? ALL_STEPS.filter((s) => s.track === track) : ALL_STEPS;
  for (const s of src) for (const u of s.uses) out[u.sku] = (out[u.sku] ?? 0) + u.qty;
  return out;
}
