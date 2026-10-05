/** An ordered centreline per physical strand. Illustrative kinematics, not yarn mechanics. */
export type P3 = [number, number, number];
export type YarnMode = 'single' | 'carry' | 'double';
export type MachineView = 'machine' | 'stitch' | 'yarn' | 'hat';
export const MOTION_STEPS = [
  ['Hold masken åpen', 'Holderne bærer den gamle masken. Arbeidsløkken blir på krokens skaft.'],
  ['Før kroken inn', 'Spissen går gjennom åpningen under begge maskeledd. Garnføreren og holderne holder hver sin del av arbeidet.'],
  ['Legg garn i kroken', 'Garnføreren legger arbeidstråden i krokens åpning. Medført garn holdes utenfor kroken.'],
  ['Trekk opp den nye løkken', 'Den fangede garnbøyen trekkes gjennom den gamle masken. Både gammel og ny løkke ligger nå på skaftet.'],
  ['Legg det siste kastet', 'Kroken fanger garn til gjennomtrekkingen. Ved fargeskift velges den nye fargen her.'],
  ['Gjennom den nærmeste løkken', 'Kroken fører den nye garnbøyen gjennom den første av de to løkkene. Hold igjen de gamle løkkene.'],
  ['Gjennom den siste løkken', 'Den samme garnbøyen føres videre gjennom den siste løkken. De gamle løkkene blir i stoffet.'],
  ['Stram og flytt arbeidet', 'Matingen tar inn slakk. Den nye masken blir del av stoffet, og én arbeidsløkke blir igjen.'],
] as const;
export const lerp=(a:number,b:number,t:number)=>a+(b-a)*t;
export const mix=(a:P3,b:P3,t:number):P3=>a.map((v,i)=>lerp(v,b[i],t)) as P3;
export const ramp=(t:number,a:number,b:number)=>{const s=Math.max(0,Math.min(1,(t-a)/(b-a)));return s*s*(3-2*s);};
const key=(t:number,values:number[])=>{const i=Math.min(values.length-2,Math.floor(t));return lerp(values[i],values[i+1],ramp(t,i,i+1));};
const arc=(z:number,r:number):P3[]=>Array.from({length:25},(_,i)=>{const a=(-.86+i/24*1.72)*Math.PI;return [Math.cos(a)*r,Math.sin(a)*r,z];});
const line=(a:P3,b:P3,count:number):P3[]=>Array.from({length:count},(_,i)=>mix(a,b,i/(count-1)));
const morph=(a:P3[],b:P3[],t:number):P3[]=>a.map((p,i)=>mix(p,b[i],t));

export function motionPose(value:number){
  const t=Math.max(0,Math.min(7,Number.isFinite(value)?value:0));
  const tighten=ramp(t,6,7);
  return {t,step:Math.floor(t),tip:key(t,[2,-2.3,-2.3,1.1,1.1,2.7,4.6,5]),
    oldLoopZ:lerp(4,.8,tighten),drawnLoopZ:lerp(key(t,[-1.5,-1.5,-1.5,2.25,2.25,2.25,2.25,2.25]),.35,tighten),
    oldRadius:lerp(1.45,.78,tighten),bightRadius:lerp(.52,1.45,tighten),
    bEngage:ramp(t,1,2),cEngage:ramp(t,3,4),tighten,
    hookClosed:(t>=2&&t<=3)||(t>=4&&t<=6),
    completed:t>=7,guideX:6-4*ramp(t,1,2)+4*ramp(t,2,3)-4*ramp(t,3,4)+4*ramp(t,4,6)};
}

function activePath(t:number,includeFinalBight:boolean):P3[]{
  const p=motionPose(t),a=arc(p.oldLoopZ,p.oldRadius);
  const b=arc(p.drawnLoopZ,lerp(.52,p.oldRadius,ramp(t,2,3)));
  const c=arc(p.tip+.65,p.bightRadius);
  const aEnd=a.at(-1)!,bEnd=b.at(-1)!;
  const bShape:P3[]=[[-1.05,.65,.3],[-.65,.55,-.65],...b,[.65,-.55,-.65],[1.05,-.65,.3]];
  const bFlat=line(aEnd,[3,1,4],bShape.length);
  const formedB=morph(bFlat,bShape,p.bEngage);
  const bridgeStart=formedB.at(-1)!;
  const cShape:P3[]=[[.30,-.25,.4],...c,[.30,.25,.4],[2.7,2.2,3.2]];
  const cFlat=line(bridgeStart,[4.5,3,5],cShape.length);
  const formedC=morph(cFlat,cShape,includeFinalBight?p.cEngage:0);
  // No closed rings: every sample remains on the same open fabric-to-spool path.
  return [[-6,-.8,-1],[-3.1,-1,-.1],a[0],...a,...formedB,...formedC,[p.guideX,3,7],[9,7,9],[11,13,1]];
}

function carriedPath(t:number,becomesActive:boolean):P3[]{
  const p=motionPose(t),c=arc(p.tip+.65,p.bightRadius);
  const start:P3=[2.2,-.4,.12],end:P3=[4.7,5,5];
  const shape:P3[]=[[.30,-.25,.4],...c,[.30,.25,.4],[2.8,3.2,3.2]];
  const folded=morph(line(start,end,shape.length),shape,becomesActive?p.cEngage:0);
  return [[-6,-.4,.12],[-4,-.4,.12],[-2,-.4,.12],[0,-.4,.12],start,...folded,[p.guideX,5,7],[13,8,9],[15,13,1]];
}

export function yarnPaths(t:number,mode:YarnMode,color:string,nextColor:string){
  const change=mode==='carry'&&color!==nextColor;
  const primary=activePath(t,!change);
  const inactive=color==='#BA0C2F'?'#F6F0E1':'#BA0C2F';
  const paths=[{id:'active',color:mode==='carry'?color:'#F6F0E1',points:primary}];
  if(mode==='carry')paths.push({id:'second',color:change?nextColor:inactive,points:carriedPath(t,change)});
  if(mode==='double')paths.push({id:'second',color:'#BA0C2F',points:primary.map(([x,y,z])=>[x,y+.34,z] as P3)});
  return paths;
}

export function centrelineLength(points:P3[]){return points.slice(1).reduce((s,p,i)=>s+Math.hypot(...p.map((v,k)=>v-points[i][k])),0);}
