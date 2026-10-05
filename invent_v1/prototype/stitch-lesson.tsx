import { useEffect, useState } from 'react';
import { RO_HAT } from './hat-process.ts';
import { StitchCloseup } from './stitch-closeup.tsx';
import { LETTER_ROWS, firstLetterColorChange, stitchContext, yarnName } from './stitch-cycle.ts';
import { MOTION_STEPS, type MachineView, type YarnMode } from './yarn-motion.ts';

const VIEWS:[MachineView,string][]=[['machine','Maskin og hatt'],['stitch','Maske tett på'],['yarn','Hele garnveien'],['hat','Ferdig RO RO RO-hatt']];
const MODES:[YarnMode,string][]=[['single','Én tråd'],['carry','To farger'],['double','Dobbel tråd']];
const MODE_TEXT={single:'Én hvit tråd går fra spolen, gjennom garnføreren og kroken, og inn i stoffet.',carry:'Én farge hekler. Den andre legges langs forrige omgang og omsluttes av masken. Ved fargeskift brukes den nye fargen i siste gjennomtrekking.',double:'Begge trådene fanges og trekkes gjennom sammen. Dette gir en tykkere maske, ikke RO-bokstaver. Oppskrift, krok og garnmating må tilpasses.'};
export function StitchLesson({onLocate}:{onLocate:(cursor:number)=>void}){
  const [index,setIndex]=useState(firstLetterColorChange()),[cycle,setCycle]=useState(0),[playing,setPlaying]=useState(false);
  const [mode,setMode]=useState<YarnMode>('carry'),[view,setView]=useState<MachineView>('stitch');
  const [ghost,setGhost]=useState(false),[trace,setTrace]=useState(false),[speed,setSpeed]=useState(1);
  const context=stitchContext(index),step=Math.min(7,Math.floor(cycle)),instruction=MOTION_STEPS[step];
  useEffect(()=>{
    if(!playing)return;
    let raf=0,last=performance.now();
    const frame=(now:number)=>{const dt=Math.max(0,Math.min((now-last)/1000,.1));last=now;setCycle(c=>Math.min(7,c+dt*speed/2));raf=requestAnimationFrame(frame);};
    raf=requestAnimationFrame(frame);return()=>cancelAnimationFrame(raf);
  },[playing,speed]);
  useEffect(()=>{if(cycle>=7){setPlaying(false);onLocate(context.cursor+1);}},[cycle>=7,index]);
  const choose=(cursor:number)=>{const c=stitchContext(cursor);setIndex(c.cursor);setCycle(0);setPlaying(false);onLocate(c.cursor);};
  const seek=(t:number)=>{setPlaying(false);setCycle(t);onLocate(context.cursor+(t>=7?1:0));};
  return <section className="stitch-lesson primary-lesson" id="stitch-lesson" aria-label="Fra garn til fastmaske">
    <div className="section-heading"><div><span className="eyebrow">FRA SPOLE TIL HATT</span><h2>Følg tråden gjennom masken.</h2><p>Samme 3D-scene, fire utsnitt. Stopp når som helst og se hvordan garnet ligger rundt kroken.</p></div><span className="status-label">Bevegelsesforslag · ikke fysisk verifisert</span></div>
    <div className="stitch-layout"><div className="stitch-demo">
      <div className="motion-tabs" aria-label="Kameravinkel">{VIEWS.map(([id,label])=><button key={id} aria-pressed={view===id} onClick={()=>setView(id)}>{label}</button>)}</div>
      <div className="stitch-demo-top"><span>OMGANG {context.row.num} · MASKE {context.column+1}</span><strong>{view==='hat'?'Oppskriftens sluttresultat':`${step+1} / 8 · ${instruction[0]}`}</strong></div>
      <StitchCloseup cycle={cycle} color={context.current.color} nextColor={context.next.color} mode={mode} view={view} index={context.cursor} ghost={ghost} trace={trace}/>
      <div className="stitch-caption"><span>Grågrønt: forrige omgang · A, B, C: garnbøyene</span><span>Dra for å rotere · rull for å zoome</span></div>
      <div className="motion-options"><label><input type="checkbox" checked={ghost} onChange={e=>setGhost(e.target.checked)}/> Skjul rammen og holderne</label><label><input type="checkbox" checked={trace} onChange={e=>setTrace(e.target.checked)}/> Følg trådens sammenheng</label><label>Tempo <select aria-label="Avspillingstempo" value={speed} onChange={e=>setSpeed(Number(e.target.value))}><option value={.5}>Ekstra sakte</option><option value={1}>Sakte</option><option value={2}>Raskere</option></select></label></div>
      <div className="stitch-controls"><button className="button primary" onClick={()=>{if(view==='hat')setView('stitch');if(cycle>=7)setCycle(0);setPlaying(!playing);onLocate(context.cursor);}}>{playing?'Pause':cycle>=7?'Vis masken igjen':'Spill én maske'}</button><button className="text-button" disabled={step===0} onClick={()=>seek(Math.max(0,step-1))}>← Forrige trinn</button><button className="text-button" disabled={step===7} onClick={()=>seek(Math.min(7,step+1))}>Neste trinn →</button></div>
      <div className="motion-scrubber"><input aria-label="Bevegelsen gjennom én maske" type="range" min="0" max="7" step="0.01" value={cycle} onChange={e=>seek(Number(e.target.value))}/></div>
      <div className="stitch-steps" aria-label="Hekletrinn">{MOTION_STEPS.map((s,i)=><button key={s[0]} aria-label={`${i+1}. ${s[0]}`} aria-pressed={step===i} onClick={()=>seek(i)}>{i+1}</button>)}</div>
      <div className="stitch-explanation" aria-live="polite"><h3>{step+1}. {instruction[0]}</h3><p>{instruction[1]}</p>{mode==='carry'&&context.changes&&step>=4&&<p className="color-change-note">Her går vi fra {context.colorName.toLowerCase()} til {context.nextColorName.toLowerCase()}. De gamle løkkene beholder fargen sin. Den nye tråden går gjennom begge og blir arbeidsløkken til neste rute.</p>}{step===7&&<button className="text-button next-stitch" onClick={()=>choose(context.cursor+1)}>Sett opp neste maske på hatten →</button>}</div>
    </div><aside className="stitch-pattern"><span className="eyebrow">VELG HVORDAN GARNET BRUKES</span>
      <div className="yarn-mode">{MODES.map(([id,label])=><button key={id} aria-pressed={mode===id} onClick={()=>{setMode(id);seek(0);}}>{label}</button>)}</div><p>{MODE_TEXT[mode]}</p>
      <div className="loop-guide"><strong>Tre garnbøyer å følge</strong><p><b>A</b> Arbeidsløkken fra masken før.</p><p><b>B</b> Løkken vi trekker opp gjennom stoffet.</p><p><b>C</b> Det siste kastet, gjennom B og så A.</p><span className="small">Følg de åpne garnbanene. Endene fortsetter til stoffet og spolen.</span></div>
      <h3>Her blir RO-bokstaven til.</h3><p>Klikk en rute for å flytte hatten og heklehodet til den masken. Én rute er én fastmaske.</p>
      <div className="stitch-chart" role="group" aria-label="Klikkbart RO RO RO-mønster, første 24 masker i omgang 20 til 29">{LETTER_ROWS.map(row=><div className="chart-row" key={row.num}><span>{row.num}</span><div>{row.colors.slice(0,24).map((c,i)=><button key={i} style={{background:RO_HAT.palette[c].hex}} aria-label={`Omgang ${row.num}, maske ${i+1}, ${yarnName(RO_HAT.palette[c].id)}`} aria-pressed={index===row.start+i} onClick={()=>choose(row.start+i)}/>)}</div></div>)}</div>
      <p className="small">Utsiden av hatten, fra venstre mot høyre. 24 av 100 masker i hver bokstavomgang. Ved trinn 8 legges én maske til hattvisningen.</p>
      <div className="stitch-color-key"><span><i style={{background:context.current.color}}/> Nå: {context.colorName}</span><span><i style={{background:context.next.color}}/> Neste: {context.nextColorName}</span></div>
      <button className="text-button" onClick={()=>{setMode('carry');setView('stitch');choose(firstLetterColorChange());}}>Se hvitt → rødt i sakte film</button>
      <button className="text-button" onClick={()=>choose(context.cursor+1)}>Velg neste maske →</button>
    </aside></div>
    <details className="motion-evidence"><summary>Hva denne visningen viser, og hva som fortsatt må bevises</summary><p>Heklecellen er et nytt bevegelsesforslag. Hatten, kroken, holderne og garnet deler samme 3D-scene. Nærvisningen forstørrer arbeidsområdet og skjuler resten av hatten, slik at trådene er lette å se. Den viser én sammenhengende bane per tråd. Punktene i «følg tråden» viser sammenhengen, ikke målt garnhastighet. Maskene på resten av hatten er forenklede symboler.</p><p>Banene er animert, ikke beregnet fra friksjon, elastisitet eller kollisjon mellom trådene. Vi har derfor ikke bevist at løkkene holder seg åpne, at garnet ikke glipper, eller at bevegelsen kan utføres av den ferdige maskinen. Den nye heklecellen er ikke med som ferdige printfiler.</p><p>Forskningsmaskinen CroMat har laget fastmasker med sytråd ved å føre garnføreren gjennom stoffet nedenfra. Her undersøker vi et annet bevegelsesforslag, der kroken føres gjennom. Bomullsgarnet, runde omganger, økningene i hatten, automatisk fargeskift og stofftransporten må fortsatt prøves fysisk.</p><p className="small"><a href="https://www.hsbi.de/publikationsserver/download/4792/4793/Dissertation_Storck.pdf" target="_blank" rel="noreferrer">CroMat: Storck, §3.3.3, §3.3.7 og §3.4.6 ↗</a> · <a href="https://blog.clover-usa.com/2026/09/02/crochet-read-bookmark/" target="_blank" rel="noreferrer">Medført garn og fargeskift: Clover ↗</a> · <a href="https://www.lionbrand.com/community/blog/working-with-multiple-strands-of-yarn/" target="_blank" rel="noreferrer">Dobbel tråd: Lion Brand ↗</a></p></details>
  </section>;
}
