import { HAT_ROUNDS, RO_HAT, STITCH_POSES } from './hat-process.ts';

export const STITCH_STEPS = [
  {title:'Én løkke på kroken', text:'Arbeidsløkken blir på kroken. Neste maske i forrige omgang holdes åpen.', loops:1},
  {title:'Inn under begge maskeledd', text:'Spissen føres gjennom neste maske, under de to øverste garnleddene. Stoffet må holdes i ro.', loops:1},
  {title:'Fang garnet', text:'Garnføreren legger arbeidsgarnet over kroken. Kroken vender slik at garnet fanges.', loops:1},
  {title:'Trekk opp en løkke', text:'Kroken tar garnet tilbake gjennom den gamle masken. Nå sitter to løkker på kroken.', loops:2},
  {title:'Fang garnet én gang til', text:'Et nytt kast legges i kroken før den siste gjennomtrekkingen.', loops:2},
  {title:'Trekk gjennom begge løkkene', text:'Kastet trekkes gjennom begge løkkene. Én løkke blir igjen, og én ny fastmaske er ferdig.', loops:1},
] as const;

export const LETTER_ROWS = HAT_ROUNDS.filter(r=>r.phase==='wall');
export const DEFAULT_DETAIL_STITCH = LETTER_ROWS[0].start+2;
export const yarnName=(id:string)=>({white:'Hvit',red:'Rød',blue:'Blå'}[id]??id);
export function stitchContext(index:number){
  const cursor=Math.max(LETTER_ROWS[0].start,Math.min(LETTER_ROWS.at(-1)!.end-1,Math.floor(index)));
  const row=LETTER_ROWS.find(r=>cursor<r.end)!;
  const current=STITCH_POSES[cursor],next=STITCH_POSES[cursor+1];
  return {cursor,row,column:cursor-row.start,current,next,changes:current.color!==next.color,
    colorName:yarnName(RO_HAT.palette.find(p=>p.hex===current.color)!.id),
    nextColorName:yarnName(RO_HAT.palette.find(p=>p.hex===next.color)!.id)};
}
export function firstLetterColorChange(){
  const row=LETTER_ROWS[0];
  return Array.from({length:row.count-1},(_,i)=>row.start+i).find(i=>STITCH_POSES[i].color!==STITCH_POSES[i+1].color)!;
}

// Demonstration coordinates only. Not actuator positions or a machine program.
export function cyclePose(value:number){
  const t=Math.max(0,Math.min(5,value));const a=Math.floor(t),b=Math.min(5,a+1);
  const k=(t-a)**2*(3-2*(t-a));
  const heights=[7,-6,-6,6,6,19];
  return {tipZ:heights[a]+(heights[b]-heights[a])*k,step:a,
    twoLoops:t>=3&&t<5,finished:t>=5,
    firstCatch:t>=2&&t<3,secondCatch:t>=4&&t<5};
}
