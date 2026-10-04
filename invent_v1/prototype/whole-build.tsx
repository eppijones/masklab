import { HAT, crochetHours, PROJECT_REQUIREMENTS, X1_PROFILE } from './hat-process.ts';
import { useState } from 'react';

const hours = (n: number) => `${n.toLocaleString('nb-NO', {maximumFractionDigits:1})} t`;

export function WholeBuild({ grams, slicedHours }: { grams: number; slicedHours: number | null }) {
  const [seconds, setSeconds] = useState(6);
  const [roundMinutes, setRoundMinutes] = useState(0);
  const [finishingMinutes, setFinishingMinutes] = useState(20);
  const [colorSeconds, setColorSeconds] = useState(2);
  const [printRate, setPrintRate] = useState(25);
  const n = (set: (v:number)=>void, fallback:number, min=0) => (e:React.ChangeEvent<HTMLInputElement>) => set(Math.max(min, Number(e.target.value)||fallback));
  return <section className="whole-build">
    <div className="section-heading"><div><h2>Fra print til ferdig hatt</h2><p>Printeren er valgt. Tidene under skiller beregning fra målt ytelse.</p></div><span className="reference-tag">{X1_PROFILE.model} · 0,4 mm dyse antatt</span></div>
    <div className="time-grid">
      <article><span className="eyebrow">01 / PRINT</span><h3>{slicedHours===null ? hours(grams*1.2/printRate) : hours(slicedHours)}</h3><b>{slicedHours===null ? 'Regneeksempel for V1-delene' : 'Beregnet printtid'}</b>
        <p>{slicedHours===null ? 'CAD-mengde med 20 % ekstra, delt på antatt gjennomsnittlig materialforbruk per time. Dette er kun et regneeksempel.' : 'Summen av beregnet tid for alle plater, inkludert reservedeler. Platebytte, filamenttørking, rengjøring og omprinting kommer i tillegg.'}</p>
        {slicedHours===null&&<label>Antatt gjennomsnitt · g/time<input type="number" min="1" value={printRate} onChange={n(setPrintRate,25,1)}/></label>}
        <small>Gjelder eksisterende deler. Endelig konstruksjon, materialprofil, støtter og plateoppsett må beregnes på nytt i printprogrammet.</small>
      </article>
      <article><span className="eyebrow">02 / BYGGING</span><h3>Uavklart</h3><b>Espen, eller begge sammen</b><p>Ramme, drivverk, heklehode, garnføring og elektronikk må kunne monteres fra samme kontrollerte deleliste. Deretter kommer kalibrering og prøving med garn.</p><small>Et troverdig tidsestimat krever ferdig konstruksjon, monteringsguide og minst én gjennomført montering. Utvikling og ombygging må regnes separat.</small></article>
      <article><span className="eyebrow">03 / HELE RO RO RO-HATTEN</span><h3>{hours(crochetHours(seconds,roundMinutes,finishingMinutes,colorSeconds))}</h3><b>Regneeksempel, ikke målt hastighet</b><p>{HAT.totalStitches.toLocaleString('nb-NO')} masker · {HAT.rounds} omganger · {HAT.colorChanges} fargeskift · 56 cm. Oppstart og avslutning er inkludert.</p><label>Antatt tid per maske · sekunder<input type="number" min="0.1" step="0.1" value={seconds} onChange={n(setSeconds,6,.1)}/></label><details><summary>Fargeskift, oppstart og avslutning</summary><label>Ekstra per fargeskift · sekunder<input type="number" min="0" step="0.1" value={colorSeconds} onChange={n(setColorSeconds,0)}/></label><label>Ekstra per omgang · minutter<input type="number" min="0" value={roundMinutes} onChange={n(setRoundMinutes,0)}/></label><label>Oppstart og avslutning · minutter<input type="number" min="0" value={finishingMinutes} onChange={n(setFinishingMinutes,0)}/></label></details><small>Feilretting, garnbrudd og bytte av tomme garnnøster kommer i tillegg. 3D-avspillingen er komprimert og viser ikke faktisk arbeidstempo.</small></article>
    </div>
    <details className="disclosure"><summary><span>Krav til hele maskinen</span><span>Automatisk · X1 Carbon · nødvendige innkjøp tillatt</span></summary>
      <p>{PROJECT_REQUIREMENTS.construction} {PROJECT_REQUIREMENTS.target}</p>
      <div className="requirements-grid"><div><h3>Byggbarhet</h3><p>Alle bevegelige deler må ha lagerføring, feste, drivverk og plass til hele bevegelsen. Festehull, toleranser, delantall og hele koblingskjeden skal kontrolleres mot samme CAD-modell.</p><p className="small">Dagens V1 har kjente avvik, blant annet en krok montert på tvers av innstikksaksen. Hattforløpet er oppskriftsdata, ikke et bevis på at mekanikken kan utføre dem.</p></div><div><h3>Varme og elektrisk sikkerhet</h3><p>{PROJECT_REQUIREMENTS.fireDesign}</p><p className="small">Lav spenning betyr ikke null brannfare. Drivere kan bli svært varme. Ingen brannsikkerhet er dokumentert før ledninger, strømgrenser, fastkjøring og temperaturstopp er testet. <a href={PROJECT_REQUIREMENTS.fireEvidence} target="_blank" rel="noreferrer">Produsentens advarsler ↗</a></p></div></div>
    </details>
  </section>;
}
