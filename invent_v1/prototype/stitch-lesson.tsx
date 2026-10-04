import { useEffect, useState } from 'react';
import { RO_HAT } from './hat-process.ts';
import { StitchCloseup } from './stitch-closeup.tsx';
import { DEFAULT_DETAIL_STITCH, LETTER_ROWS, STITCH_STEPS, firstLetterColorChange, stitchContext, yarnName } from './stitch-cycle.ts';

export function StitchLesson({onLocate}:{onLocate:(cursor:number)=>void}){
  const [index,setIndex]=useState(DEFAULT_DETAIL_STITCH),[cycle,setCycle]=useState(0),[playing,setPlaying]=useState(false);
  const context=stitchContext(index),step=Math.min(5,Math.floor(cycle)),instruction=STITCH_STEPS[step];
  useEffect(()=>{
    if(!playing)return;
    let raf=0,last=performance.now();
    const frame=(now:number)=>{const dt=Math.min((now-last)/1000,.1);last=now;setCycle(c=>Math.min(5,c+dt/2));raf=requestAnimationFrame(frame);};
    raf=requestAnimationFrame(frame);return()=>cancelAnimationFrame(raf);
  },[playing]);
  useEffect(()=>{if(cycle>=5){setPlaying(false);onLocate(context.cursor+1);}},[cycle>=5,index]);
  const choose=(cursor:number)=>{const c=stitchContext(cursor);setIndex(c.cursor);setCycle(0);setPlaying(false);onLocate(c.cursor);};
  return <section className="stitch-lesson" id="stitch-lesson" aria-label="Slik lages én fastmaske">
    <div className="section-heading"><div><span className="eyebrow">FRA GARN TIL BOKSTAV</span><h2>Se én maske bli til.</h2><p>Krok inn. Fang garn. Trekk gjennom. Én rute i mønsteret blir én fastmaske i hatten.</p></div><span className="status-label">Forstørret prinsippvisning</span></div>
    <div className="stitch-layout"><div className="stitch-demo">
      <div className="stitch-demo-top"><span>OMGANG {context.row.num} · MASKE {context.column+1}</span><strong>{instruction.loops} {instruction.loops===1?'løkke':'løkker'} på kroken</strong></div>
      <StitchCloseup cycle={cycle} color={context.current.color} nextColor={context.next.color}/>
      <div className="stitch-caption"><span><i className="orange-dot"/> Åpningen i forrige omgang</span><span>Dra for å se fra siden</span></div>
      <div className="stitch-controls"><button className="button primary" onClick={()=>{if(cycle>=5)setCycle(0);setPlaying(!playing);onLocate(context.cursor);}}>{playing?'Pause':cycle>=5?'Vis masken igjen':'Spill én maske sakte'}</button><button className="text-button" disabled={step===0} onClick={()=>{setPlaying(false);setCycle(Math.max(0,step-1));onLocate(context.cursor);}}>← Forrige trinn</button><button className="text-button" disabled={step===5} onClick={()=>{setPlaying(false);setCycle(Math.min(5,step+1));}}>Neste trinn →</button></div>
      <div className="stitch-steps" aria-label="Hekletrinn">{STITCH_STEPS.map((s,i)=><button key={s.title} aria-label={`${i+1}. ${s.title}`} aria-pressed={step===i} onClick={()=>{setPlaying(false);setCycle(i);if(i<5)onLocate(context.cursor);}}>{i+1}</button>)}</div>
      <div className="stitch-explanation" aria-live="polite"><h3>{step+1}. {instruction.title}</h3><p>{instruction.text}</p>{context.changes&&step>=4&&<p className="color-change-note">Neste rute er {context.nextColorName.toLowerCase()}. Bruk den nye fargen i siste gjennomtrekking av denne masken. Da er arbeidsløkken klar til neste maske.</p>}</div>
    </div><aside className="stitch-pattern"><span className="eyebrow">DETTE ER PLASSEN PÅ HATTEN</span><h3>Første RO i mønsteret.</h3><p>Klikk en rute. Både nærvisningen og hatten over flyttes til akkurat den masken.</p>
      <div className="stitch-chart" role="group" aria-label="Klikkbart RO RO RO-mønster, første 24 masker i omgang 20 til 29">
        {LETTER_ROWS.map(row=><div className="chart-row" key={row.num}><span>{row.num}</span><div>{row.colors.slice(0,24).map((c,i)=><button key={i} style={{background:RO_HAT.palette[c].hex}} aria-label={`Omgang ${row.num}, maske ${i+1}, ${yarnName(RO_HAT.palette[c].id)}`} aria-pressed={index===row.start+i} onClick={()=>choose(row.start+i)}/>)}</div></div>)}
      </div>
      <p className="small">Utsiden av hatten, lest fra venstre mot høyre. Utsnitt: 24 av 100 masker per bokstavomgang. Rammen markerer masken vi forklarer.</p>
      <div className="stitch-color-key"><span><i style={{background:context.current.color}}/> Nå: {context.colorName}</span><span><i style={{background:context.next.color}}/> Neste: {context.nextColorName}</span></div>
      <button className="text-button" onClick={()=>choose(firstLetterColorChange())}>Vis skiftet fra hvitt til rødt →</button>
      <button className="text-button" onClick={()=>choose(context.cursor+1)}>Velg neste maske i mønsteret →</button>
      <p className="small">Ved trinn 6 legges akkurat én maske til hatten over. Kroken lager samme fastmaske; valget av garnfarge lager bokstavene.</p>
    </aside></div>
    <div className="stitch-limits"><strong>Dette må maskinen klare.</strong><p>Holde forrige omgang åpen, føre kroken inn, fange og trekke garnet to ganger, holde riktig spenning og flytte én maske videre. Den oransje, stiplede linjen i maskinvisningen viser avstanden mellom dagens krok og stedet den må nå. Denne koblingen er ennå ikke løst mekanisk.</p><p className="small">Nærvisningen viser en vanlig fastmaske i bokstavfeltet. Garnbanene er forenklet og trukket fra hverandre for å vise løkkene; dette er ikke en fysisk simulering eller kjørbar maskinstyring. Oppstart, økninger og automatisk fargeskift må utvikles og testes. <a href="https://crochet.org/single-crochet/" target="_blank" rel="noreferrer">Fastmaske: Crochet Guild of America ↗</a> · <a href="https://www.lionbrand.com/community/blog/advanced-crochet-techniques-part-two-colorwork/" target="_blank" rel="noreferrer">Fargeskift: Lion Brand ↗</a></p></div>
  </section>;
}
