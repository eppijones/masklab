import { useState } from 'react';
import { HAT, HAT_HOURS } from './hat-process.ts';

const BASE=import.meta.env.BASE_URL;
const FLOW=[
  {name:'Garn',part:'swift-spindle',text:'Tre farger: hvit bunn, røde bokstaver og blå bølgekant. Nøstene sitter på garnsnurrerne. Tråden føres gjennom øyer og stramming frem til heklehodet.'},
  {name:'Heklekrok',part:'crochet-hook',text:'Kroken skal føres gjennom masken fra forrige omgang, hente garn og trekke opp en løkke. Så hentes garn igjen og trekkes gjennom de to løkkene. Den printede V1-kroken er en forsøksdel; fungerende verktøy og lukking er ikke avklart.'},
  {name:'Maskeholdere',part:'comb-arc',text:'Holderne må bevare og presentere hver maske på et bestemt sted. Ved en økning lages to masker i samme maske. Den gamle kammen med ti plasser løser ikke en hel omgang; dette må konstrueres på nytt.'},
  {name:'Hattform og bord',part:'mandrel-crown',text:'De tre hattformdelene følger nå RO RO RO i størrelse 56 cm. Bordet vender neste arbeidssted mot kroken. Bordets feste til navet har et kjent avvik som må rettes før montering.'},
  {name:'Drivverk og styring',part:'nema17-mount',text:'Motorer skal styre bord, høyde, innstikk og garnføring. Sensorer må bekrefte posisjon og oppdage fastkjøring. Fullstendig koblingsskjema og testet styringsprogram mangler.'},
  {name:'Ferdig hatt',part:'mandrel-brim',text:`Oppskriften avsluttes etter ${HAT.rounds} omganger og ${HAT.totalStitches.toLocaleString('nb-NO')} masker. Garn må festes og hatten tas av. Hele forløpet er omtrent ${HAT_HOURS.toLocaleString('nb-NO',{maximumFractionDigits:1})} timer i regneeksemplet; maskinen har ikke demonstrert dette i praksis.`},
];
export function MachineInstructions({onSelect}:{onSelect:(id:string)=>void}){
  const [step,setStep]=useState(0);
  return <section className="machine-instructions"><div className="section-heading"><div><h2>Slik er maskinen tenkt å lage hatten</h2><p>Garnet blir til masker. Plastdelene holder og beveger mekanikken.</p></div><span className="reference-tag">Planlagt virkemåte · ikke testet produksjon</span></div>
    <div className="instruction-tabs">{FLOW.map((s,i)=><button key={s.name} aria-pressed={step===i} onClick={()=>setStep(i)}><span>{i+1}</span>{s.name}</button>)}</div>
    <div className="instruction-body"><span className="step-number">0{step+1}</span><div><h3>{FLOW[step].name}</h3><p>{FLOW[step].text}</p><button className="text-button" onClick={()=>onSelect(FLOW[step].part)}>Se denne delen i 3D →</button></div></div>
    <p className="small">Beregningsgrunnlag for én hel RO RO RO-hatt: 6 sekunder per maske, 2 ekstra sekunder per fargeskift og 20 minutter til oppstart og avslutning. {HAT.colorChanges} fargeskift er med. Feilretting og tomme nøster er ikke med.</p>
  </section>;
}
export function SafetyAndPatent(){return <section className="safety-patent">
  <div className="section-heading"><div><h2>Brannrisiko og patent</h2><p>Dokumentasjonen følger prosjektet, også når chatten er arkivert.</p></div></div>
  <div className="safety-grid"><article><span className="eyebrow">BRANNRISIKO / IKKE FERDIG TESTET</span><h3>Ingen varmeelementer i HEKLOMAT.</h3><p>Det fjerner ikke all risiko. Motorer, motordrivere, dårlige kontakter og kortslutning kan gi varme. Plast og garn må holdes unna varme og ubeskyttede elektriske deler.</p>
    <ul><li>Bruk innkapslet strømforsyning. Ingen åpne 230 V-koblinger i det hjemmelagde bygget.</li><li>Dimensjoner sikringer, ledninger og strømgrenser etter de valgte komponentene.</li><li>Nødstopp skal bryte motorkraft. Temperaturvern og stopp ved fastkjøring må prøves fysisk.</li><li>Test under tilsyn på ryddig, ikke-brennbart underlag. Slå av før justering og omkobling.</li></ul>
    <p className="small">Dette er en foreløpig risikovurdering, ingen sikkerhetsgodkjenning. X1 Carbon er en separat maskin med varm dyse og byggeplate; følg Bambu Labs egen veiledning ved printing. <a href="https://www.pololu.com/docs/0J71/4.2" target="_blank" rel="noreferrer">Produsent om varme i motordrivere ↗</a></p></article>
    <article><span className="eyebrow">PATENT / HISTORISK UTKAST</span><h3>Patentutkastet er vedlagt.</h3><p>Dokumentet beskriver den tidligere HEKLOMAT-1-konstruksjonen og inneholder 18 foreslåtte patentkrav og 7 figurer. Det er merket som et ikke innsendt utkast. Innsending, søknadsnummer og innvilget patent er ikke dokumentert.</p><p>Påstander om nyhet, funksjon og tekniske fordeler i utkastet er ikke bekreftet. Det må revideres for den nye mekanikken og vurderes av en patentfaglig rådgiver.</p><a className="button primary" href={BASE+'patentutkast.html'} target="_blank" rel="noreferrer">Les patentutkastet ↗</a><a className="text-button patent-download" href={BASE+'patentutkast.html'} download>Last ned dokumentet ↓</a>
    <p className="small">Offentliggjøring før søknadsdagen kan gjøre at oppfinnelsen ikke kan patenteres. <a href="https://www.patentstyret.no/patent/for-du-soker" target="_blank" rel="noreferrer">Patentstyrets veiledning ↗</a></p></article></div>
  </section>;}
