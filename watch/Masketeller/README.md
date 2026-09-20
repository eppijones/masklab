# Masketeller — Apple Watch-app som teller masker automatisk

Frittstående watchOS-app (ingen iPhone-app nødvendig) som anslår antall
heklemasker ut fra bevegelsen i håndleddet. Klokka leser gyro 50 ganger i
sekundet, teller kraftige vri-sykler i nålhånda og deler på hvor mange sykler
én maske består av (målt på ekte opptak). Tallet er et anslag – se
«Hvordan gjenkjenningen virker» for hva du kan forvente.

## Build 53 / cycle-5.1 — 118-opptaket, 7. september

Det nye høyre-håndleddsopptaket er sikret fra 243 spool-filer: 60 649 prøver,
97 automatiske mot 118 fysisk oppgitte masker. Ingen testet detektorvariant
bestod regresjonskravet. Grunnkalibreringen er derfor beholdt.

Build 53 retter gammel brøk etter Bekreft, doble sensorleveranser, historikk
over sensorgap og siste-runde-grensen. Schema 6 lagrer quaternion, modellversjon,
detektorkonfigurasjon og gjenopprettingsmetadata. Opptak kan ikke overskrives
ved gjentatt lagring. Pull-verktøyet bruker separate mapper og verifisert backup.

Se [118-rapporten](Engineering/session-20260907-118/report.md) og
[faktisk leveringsstatus](Engineering/session-20260907-118/delivery.md).
Build 53 er bygget og testet, men fysisk installasjon er ikke bekreftet.
Ni markører finnes; hvilke fem som har dobbelmaske-fasit må avklares.

## Tidligere build 50 / cycle-5.0

Første skjerm har direkte **−1**, **+1**, **Angre**, **Bekreft** og **Start/Pause**.
Rettelser endrer posisjonen med en gang; Angre beholder senere automatiske masker.
Start begynner automatisk råopptak. Ingen tidsbuffer betaler ut gamle masker.
Klokka bruker eksplisitt valgt fysisk håndledd (høyre i denne leveringen).

**Læring:** Bekreft ved starten og slutten av lengre strekk med kjent antall.
Rettelser er svake segmentdata, ikke tidsmerker for enkeltmasker. Først etter
minst fire passende økter kan en avgrenset modellendring vurderes ved Pause.
Innstillinger viser om data bare samles eller en oppdatering faktisk har skjedd,
og gir separat nullstilling/tilbakerulling av læring uten å flytte oppskriften.

**Synk med nettsiden:** Nettsidens «Klokke» lager en parkoblingskode.
På klokka: Innstillinger → Koble til nettsiden. Velg deretter om nettsidens
eller klokkas posisjon skal brukes. Begge kan flytte frem og tilbake; samtidig
eller frakoblet endring gir et eksplisitt konfliktvalg. Rådata forblir lokale.
Se [leveringsstatus](Engineering/delivery-status.md) for hva som faktisk er
installert/publisert, og [målerapport](Engineering/report.md) for begrensninger.

## Kom i gang

1. Åpne `Masketeller.xcodeproj` i Xcode 16 eller nyere.
2. Velg target **Masketeller** → *Signing & Capabilities* og sett ditt **Team**
   (HealthKit-capability er allerede lagt inn).
3. Koble til iPhonen, velg klokka som destinasjon og trykk Run.

Bygg for simulator uten signering:

```bash
xcodebuild build -project Masketeller.xcodeproj -scheme Masketeller \
  -destination 'generic/platform=watchOS Simulator' CODE_SIGNING_ALLOWED=NO
```

Simulatoren har ingen bevegelsessensor, så selve tellingen må testes på en
ekte klokke.

## Bruk

- **Teller** (første side): trykk *Start*. Tallet øker etter hvert som sykler
  telles (≈ foran tallet betyr at automatikken har bidratt). −1/+1 justerer direkte; Digital Crown er et alternativ.
- **Juster**: ±1, *Ny rad*, *Angre*, *Avslutt økt* (lagres i historikken) og
  *Nullstill*.
- **Innstillinger**: viser hvilket håndledd klokka sitter på og sykler per
  maske; masker per rad (vibrerer når raden er full, valgfritt automatisk ny
  rad), vibrasjon, og *Hold appen våken*.
- **Lær av raden** (Innstillinger): når du vet hvor mange masker raden faktisk
  har, vri kronen til riktig tall og trykk *Bruk*. Tallet rettes, og bekreftelsen lagres. Aktiv profil endres ikke ved rettelsen.
- **Historikk**: tidligere økter med antall masker, rader og varighet.

Klokka skal sitte på **nålhånda**. Forholdet er målt der (høyre håndledd). På
garnhånda er anslaget mye dårligere (30–40 % avvik på delstrekk).

## Bakgrunnskjøring

watchOS stopper vanligvis apper få sekunder etter at du senker armen. Med
*Hold appen våken* på starter appen en HealthKit-treningsøkt (type «annet»),
som er Apples godkjente måte å få kontinuerlige sensordata på. Første gang må
du gi tilgang til Helse. Økten avsluttes når du trykker *Stopp*.

## Opptak av ekte data (tuning)

Siden **Opptak** logger rå sensordata (50 Hz gyro, akselerasjon, gravitasjon,
attitude), alt detektoren bestemte i sanntid, og dine markører – til en JSON-fil
på klokka. Slik tuner vi detektoren mot virkeligheten:

1. På klokka: **Opptak → Start opptak**. Hekle en runde med kjent antall
   masker. Trykk **Markør** når du vil merke et tidspunkt (rad ferdig, eller
   hver maske hvis du får det til).
2. **Stopp opptak** → skriv inn hvor mange masker du faktisk heklet → **Lagre**.
3. Koble iPhonen til Mac (klokka ulåst), og hent filene:

   ```bash
   watch/Masketeller/Tools/pull-recordings.sh
   ```

4. Spill av opptaket gjennom detektoren og se hvor den bommer:

   ```bash
   watch/Masketeller/Tools/replay.sh watch/Masketeller/recordings/recordings/rec-….json \
     --plot /tmp/plot.png
   ```

   Verktøyet skriver ut signalstatistikk, antall sykler og anslag mot fasit.
   `--k 4.8` bruker et annet forhold, `--threshold 2.5` en annen terskel, og
   `--split <tid> <masker før> <masker etter>` sjekker om forholdet er likt før
   og etter et tidspunkt. `--plot` tegner signalet med markører (gul),
   sanntid (rød) og replay (grønn); `--axes` gir én bane per akse pluss
   gravitasjon. `--csv` dumper alt til CSV.

## Hvordan gjenkjenningen virker

`Motion/CycleCounter.swift`:

1. |gyro| glattes med 0,1 s glidende gjennomsnitt.
2. Topper over 2,5 rad/s med minst 0,8 s avstand er «rå sykler».
3. En rå syklus bekreftes bare når det har vært minst 3 rå sykler de siste 6 s
   (filtrerer bort enkeltbevegelser som å kikke på skjermen).
4. `CountingCore` opptjener en brøk per ny syklus (stabil startprofil k=3,4).
   En hel opptjent enhet gir ett anslag. Rettelser/resume tømmer brøken og
   avviser allerede kølagte sensorhendelser; tiden alene gir aldri en maske.
5. Ingen bekreftede sykler på 6 s → status «Pause».

### Hva opptakene viste (2026-09-05)

To ekte økter fra samme oppskrift (bøttehatt, fastmasker med to garn, ca.
12–17 s per maske):

- Én maske har **ingen** gjenkjennbar enkeltbevegelse. På nålhånda tok en
  maske 8–58 s og besto av 3–26 store bevegelser; en mal («maske ferdig»-
  gest) traff bare F1 ≈ 0,5 i kryssvalidering. På garnhånda så malen bedre ut
  (F1 0,84–0,95), men mye av det var selve bevegelsen for å trykke på klokka.
- Antall bekreftede sykler per maske er derimot stabilt **over en runde**:
  4,88 med to garn og 4,71 med ett garn (58 + 17 masker), dvs. ±4 %. Hele
  opptaket ga anslag 75 mot 74 faktiske masker.
- På garnhånda (venstre) er forholdet både lavere (2,3) og ustabilt.

Forvent altså at rundetallet stemmer på noen få masker, ikke at hver enkelt
maske tikker inn i takt. Rett underveis med kronen eller *Lær av raden*.
Den gamle rytme-detektoren (periode/autokorrelasjon) telte 10–15× for mye på
ekte data og er fjernet.

## Struktur

```
Masketeller/
  MasketellerApp.swift      App-inngang
  Motion/                   CycleCounter, MotionRecorder, filtre, CoreMotion-tracker
  Workout/WorkoutKeeper.swift  HealthKit-treningsøkt for bakgrunnskjøring
  Model/                    CounterModel (tilstand), Settings, SessionStore, Haptics
  Views/                    Teller, Juster, Opptak, Innstillinger, Lær av raden, Historikk
  Info.plist                Bakgrunnsmodus + tillatelsestekster
  Masketeller.entitlements  HealthKit
Tools/
  pull-recordings.sh        Henter opptak fra klokka (devicectl)
  replay.sh + replay/       Spiller opptak gjennom detektoren på Mac
recordings/                 Hentede opptak (JSON)
```

## Reproduserbare tester

```sh
watch/Masketeller/Tools/test-production.sh
watch/Masketeller/Tools/evaluate.sh watch/Masketeller/recordings/rec-*.json
```

Produksjonstester bruker stubbet WatchKit/sensor/HealthKit. Den virkelige
CounterModel, tellekjernen, læring, oppskriftsdata og opptakseksport kompileres.
`test-ledger.sh` er en eldre test av en tidligere, separat ledger og dokumenterer
ikke dagens kjørebane.

Schema 5 skriver rådata til `recordings/partial-*` hvert femte sekund og
strømmer dem til ferdig JSON ved lagring. Ved prosessavbrudd kan sjekkpunktene
hentes fra klokka og rekonstrueres med `Tools/recover-partials.py`.
Originale sjekkpunkter beholdes. Filer med `exported.txt` har allerede en ferdig
JSON. Hver automatisk opptaksdel er maksimalt 30 minutter; delene har samme
sessionID. Ingen endring av sensorfrekvens ved justering eller synk.
