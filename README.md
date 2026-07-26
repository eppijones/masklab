# RO RO RO — Interaktiv 3D-hekleoppskrift

En nettside som tar deg gjennom hele **RO RO RO-bøttehatten** (Helene Spillings
«Ro det i land»-hatt for **4,0 mm** heklenål), steg for steg:

- **3D-hatt som vokser** — hver eneste maske er tegnet i 3D. Klikk «Neste» når du
  har fullført en runde, og se nøyaktig hvordan arbeidet skal se ut.
- **Maskeskolen** — animasjoner av alle teknikkene (løpeknute, luftmaske,
  fastmaske, kjedemaske, to i samme maske, fargebytte, feste tråden).
- **Maske-for-maske overlay** — i rundene med RO RO RO-teksten kan du gå
  maske for maske på 3D-visningen, uten å blokkere hatten.
- **Bølgebremmen** — Helene Spillings bølgemønster fra originaloppskriften,
  rad for rad, med eget minidiagram og økningene markert.
- **Diagram, huskelapp og feilsøking** — alltid tilgjengelig fra toppmenyen.
- Fremdriften lagres i nettleseren, så du kan lukke fanen midt i hatten.

## Kom i gang

```bash
npm install
npm run dev        # åpne http://localhost:5173
```

Tips: åpne `http://localhost:5173/?steg=round-14` for å hoppe rett til runde 14.

## Andre kommandoer

```bash
npm run validate   # sjekker at mønsterdataene stemmer med oppskriften
npm run build      # typesjekk + produksjonsbygg (dist/)
npm run preview    # forhåndsvis produksjonsbygget
```

## Teknisk

- **Vite + React 19 + TypeScript**
- **React Three Fiber / three.js** — hatten tegnes som «instanced meshes», én
  liten garn-V per maske
- **zustand** — steg/fremdrift, lagret i localStorage

Kilden til sannhet for mønsteret er `src/data/pattern.ts` (rundene),
`src/data/chart.ts` (RO RO RO-diagrammet på 100 masker) og `src/data/waves.ts`
(bølgebremmen fra originaloppskriften). 3D-hatten, instruksjonene og
masketelleren genereres alle fra de samme dataene, så de kan aldri sprike.
`npm run validate` verifiserer alle masketall (10 … 100, tekst, 110, 120,
bølgene til 144) og at alle fargebytter er markert i masken før fargegrensen.

## Kildemateriale

- Original oppskrift: [«Ro det i land»-hatten av Helene Spilling](https://helenespilling.com/wp-content/uploads/2026/06/RO-DET-I-LAND-HATTEN.pdf)
