import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { makeHatView } from './hat-view.ts';
import { HAT, HAT_ROUNDS, STITCH_POSES } from './hat-process.ts';
import { motionPose, yarnPaths, type P3, type YarnMode, type MachineView } from './yarn-motion.ts';

type Props={cycle:number;color:string;nextColor:string;mode:YarnMode;view:MachineView;index:number;ghost:boolean;trace:boolean};
/** One shared coordinate system for hat, work cell, hook, guides and continuous yarn. */
export function StitchCloseup(props:Props){
  const host=useRef<HTMLDivElement>(null),state=useRef(props);state.current=props;
  useEffect(()=>{
    const el=host.current!;let renderer:THREE.WebGLRenderer;
    try{renderer=new THREE.WebGLRenderer({antialias:true});}catch{el.textContent='3D kunne ikke startes. Trinnene og mønsteret kan fortsatt leses.';return;}
    renderer.setPixelRatio(Math.min(devicePixelRatio,2));el.appendChild(renderer.domElement);
    renderer.outputColorSpace=THREE.SRGBColorSpace;
    const scene=new THREE.Scene();scene.background=new THREE.Color('#e9eee5');
    const camera=new THREE.PerspectiveCamera(35,1,.1,3000);camera.up.set(0,0,1);
    const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.minDistance=10;controls.maxDistance=1300;
    scene.add(new THREE.HemisphereLight(0xffffff,0x415343,2.6));const light=new THREE.DirectionalLight(0xffffff,3);light.position.set(120,-220,500);scene.add(light);
    const machine=new THREE.Group();scene.add(machine);
    const material=(color:string,metal=0)=>new THREE.MeshStandardMaterial({color,roughness:metal?.36:.82,metalness:metal});
    const box=(size:P3,position:P3,color:string,parent:THREE.Group=machine)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(...size),material(color));m.position.set(...position);parent.add(m);return m;};
    const tubeGeometry=(points:P3[],radius=.12)=>{
      const clean=points.filter((p,i)=>!i||p.some((v,j)=>Math.abs(v-points[i-1][j])>1e-7));
      return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(clean.map(p=>new THREE.Vector3(...p)),false,'centripetal'),Math.max(100,clean.length*3),radius,8,false);
    };
    const tube=(points:P3[],color:string,parent:THREE.Group,r=.12)=>{const m=new THREE.Mesh(tubeGeometry(points,r),material(color));parent.add(m);return m;};
    const cylinder=(radius:number,length:number,position:P3,color:string,parent:THREE.Group)=>{const m=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,length,24),material(color,.3));m.rotation.x=Math.PI/2;m.position.set(...position);parent.add(m);return m;};
    // Neutral supporting frame. Proposed visual work cell, not an exported replacement CAD.
    box([330,12,12],[0,-165,-12],'#b8c2b6');box([330,12,12],[0,165,-12],'#b8c2b6');
    box([12,330,12],[-160,0,-12],'#b8c2b6');box([12,330,12],[160,0,-12],'#b8c2b6');
    const table=new THREE.Group();machine.add(table);cylinder(132,7,[0,0,-4],'#6d957c',table);cylinder(35,28,[0,0,-23],'#3e5548',machine);
    const hat=makeHatView();table.add(hat.group);
    const former=new THREE.Mesh(new THREE.LatheGeometry(HAT_ROUNDS.map(r=>new THREE.Vector2(r.radius-4,r.z)).reverse(),64),new THREE.MeshStandardMaterial({color:'#83a28b',transparent:true,opacity:.24,side:THREE.DoubleSide,depthWrite:false}));former.rotation.x=Math.PI/2;table.add(former);
    const mast=box([9,9,1],[0,0,0],'#a4b1b0');
    const foot=box([46,42,6],[0,0,-8],'#557b64');
    const cell=new THREE.Group();cell.scale.setScalar(2.4);cell.rotation.z=-Math.PI/2;machine.add(cell);
    const supports=new THREE.Group();cell.add(supports);
    box([23,19,.8],[6,6,-3],'#6e8d78',supports);
    box([.7,14,.7],[-5,4,-2.5],'#7e9680',supports);box([.7,14,.7],[5,4,-2.5],'#7e9680',supports);
    box([10,.7,.7],[0,10,-2.5],'#7e9680',supports);
    // Opposed retainers hold the parent stitch and its neighbours.
    for(const x of [-2.5,2.5]){
      tube([[x,5,-2],[x,2,-1],[x,.85,.2]],'#718c91',supports,.19);
      tube([[x,-3,-2],[x,-1,-1],[x,-.85,.2]],'#718c91',supports,.19);
    }
    const cloth=new THREE.Group();cell.add(cloth);
    // One connected prior-round reference strand, not a collection of closed tori.
    const fabricPoints:P3[]=[];
    for(let j=-2;j<=2;j++){
      const x=j*4.3;
      fabricPoints.push([x-2.15,-.9,-1],[x-1.3,-1.2,0],[x+.6,-1.25,.1],[x+1.8,-.4,0],[x+1.8,.55,0],[x+.5,1.15,0],[x-1.3,.9,0],[x-.65,.1,-1.5],[x+1,-.6,-1.3],[x+2.15,-.9,-1]);
    }
    tube(fabricPoints,'#a3b493',cloth,.17);
    const hook=new THREE.Group();cell.add(hook);
    cylinder(.24,8,[0,0,4.7],'#c3cece',hook);
    tube([[0,0,1.5],[0,0,.25],[.16,0,0],[.48,0,.2],[.48,0,.55],[.22,0,.7]],'#af7139',hook,.20);
    const latch=tube([[.1,0,.8],[.45,0,.5]],'#d3dddd',hook,.06);
    box([1.8,1.8,2.3],[0,0,9.4],'#405846',hook);
    const rail=new THREE.Group();cell.add(rail);
    box([.8,.8,22],[-4,3,5],'#a4b1b0',rail);box([10,1.4,2],[1,3,15],'#6f8d76',rail);
    box([2.5,2.5,3],[6,2,15],'#354b3e',rail);
    const carrier=box([5.5,1.4,2],[-2,2.5,7],'#6a896d',rail);
    const guide=new THREE.Group();cell.add(guide);
    const guideArm=tube([[9,6,9],[7,5,7],[6,3,7]],'#7d9799',guide,.13);
    const spoolGroups:THREE.Group[]=[];
    for(let i=0;i<2;i++){
      const g=new THREE.Group();cell.add(g);g.position.set(11+i*4,13,-.2);spoolGroups.push(g);
      cylinder(1.35,3.5,[0,0,0],i?'#BA0C2F':'#F6F0E1',g);
      cylinder(1.65,.22,[0,0,1.85],'#6b846a',g);cylinder(1.65,.22,[0,0,-1.85],'#6b846a',g);
      for(let n=0;n<12;n++){const ring=new THREE.Mesh(new THREE.TorusGeometry(1.36,.045,5,30),material(i?'#ba243f':'#ece4d0'));ring.position.z=-1.6+n*.29;g.add(ring);}
    }
    const labels=['A','B','C'].map(text=>{
      const canvas=document.createElement('canvas');canvas.width=96;canvas.height=96;
      const ctx=canvas.getContext('2d')!;ctx.fillStyle='#35553e';ctx.beginPath();ctx.arc(48,48,34,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff';ctx.font='bold 42px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,48,50);
      const texture=new THREE.CanvasTexture(canvas),sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,depthTest:false,depthWrite:false}));sprite.scale.set(1.1,1.1,1.1);sprite.renderOrder=10;cell.add(sprite);return sprite;
    });
    const paths=new THREE.Group();cell.add(paths);const yarnMeshes:Record<string,THREE.Mesh>={};
    const particles=new THREE.Group();cell.add(particles);
    const dots=Array.from({length:8},()=>{const m=new THREE.Mesh(new THREE.SphereGeometry(.19,8,8),new THREE.MeshBasicMaterial({color:'#edab45'}));particles.add(m);return m;});
    const grid=new THREE.GridHelper(600,24,0xc1cdbb,0xd6ded1);grid.rotation.x=Math.PI/2;grid.position.z=-36;scene.add(grid);
    let last='',lastView='',lastIndex=-1,clock=0,raf=0;
    const work=new THREE.Vector3();
    function update(dt:number){
      const s=state.current,p=motionPose(s.cycle),pose=STITCH_POSES[Math.min(s.index,STITCH_POSES.length-1)];
      const radius=Math.hypot(pose.x,pose.y);work.set(radius,0,pose.z);
      mast.scale.z=work.z+45;mast.position.set(work.x+25,-16,(work.z+45)/2-10);foot.position.set(work.x+25,-16,-8);mast.visible=!s.ghost&&s.view!=='stitch';foot.visible=mast.visible;former.visible=s.view!=='stitch';
      cell.position.copy(work);table.rotation.z=s.view==='hat'?0:-pose.angle;
      hat.group.visible=s.view!=='stitch';
      hat.update(s.view==='hat'?HAT.totalStitches:s.index+(p.completed?1:0));
      hat.group.children.at(-1)!.visible=false;
      if(s.view!==lastView||s.index!==lastIndex){
        if(s.view==='machine'){camera.position.set(360,-410,290);controls.target.set(30,0,65);}
        if(s.view==='hat'){camera.position.set(330,-390,300);controls.target.set(0,0,80);}
        if(s.view==='stitch'){camera.position.copy(work).add(new THREE.Vector3(20,-37,31));controls.target.copy(work).add(new THREE.Vector3(0,0,4.5));}
        if(s.view==='yarn'){camera.position.copy(work).add(new THREE.Vector3(65,-70,57));controls.target.copy(work).add(new THREE.Vector3(13,-12,10));}
        lastView=s.view;lastIndex=s.index;controls.update();
      }
      cell.visible=s.view!=='hat';hook.position.z=p.tip;carrier.position.z=p.tip+7;
      labels[0].position.set(-2,1.5,p.oldLoopZ);labels[1].position.set(1.9,1.5,p.drawnLoopZ);labels[2].position.set(-1.5,-1.2,p.tip+.65);
      labels.forEach((l,i)=>l.visible=s.view==='stitch'&&(i===0||i===1&&p.t>=2||i===2&&p.t>=4));
      latch.visible=p.hookClosed;guideArm.position.x=p.guideX-6;
      supports.visible=!s.ghost;rail.visible=!s.ghost;machine.children.slice(0,4).forEach(m=>m.visible=!s.ghost);
      cloth.visible=true;clock+=dt;
      const key=[s.cycle.toFixed(3),s.color,s.nextColor,s.mode].join('|');
      const strands=yarnPaths(s.cycle,s.mode,s.color,s.nextColor);
      if(last!==key){last=key;
        for(const m of Object.values(yarnMeshes))m.visible=false;
        strands.forEach((strand,i)=>{
          const geometry=tubeGeometry(strand.points,.12);
          let m=yarnMeshes[strand.id];
          if(!m){m=new THREE.Mesh(geometry,material(strand.color));paths.add(m);yarnMeshes[strand.id]=m;}
          else{m.geometry.dispose();m.geometry=geometry;(m.material as THREE.MeshStandardMaterial).color.set(strand.color);}
          m.visible=true;
          ((spoolGroups[i].children[0] as THREE.Mesh).material as THREE.MeshStandardMaterial).color.set(strand.color);
        });
      }
      spoolGroups[1].visible=s.mode!=='single';
      particles.visible=s.trace;const primary=strands[0].points;
      for(let i=0;i<dots.length;i++){const u=((clock*.09+i/dots.length)%1)*(primary.length-1),j=Math.floor(u);dots[i].position.fromArray(primary[j].map((v,k)=>v+(primary[Math.min(j+1,primary.length-1)][k]-v)*(u-j)) as P3);}
    }
    const resize=new ResizeObserver(()=>{const r=el.getBoundingClientRect();renderer.setSize(r.width,r.height);camera.aspect=r.width/Math.max(r.height,1);camera.updateProjectionMatrix();});resize.observe(el);
    let previous=performance.now();const frame=(now:number)=>{update(Math.max(0,Math.min((now-previous)/1000,.1)));previous=now;controls.update();renderer.render(scene,camera);raf=requestAnimationFrame(frame);};raf=requestAnimationFrame(frame);
    return()=>{cancelAnimationFrame(raf);resize.disconnect();controls.dispose();scene.traverse(o=>{if(o instanceof THREE.Mesh||o instanceof THREE.Line){o.geometry.dispose();(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose());}});labels.forEach(l=>{l.material.map?.dispose();l.material.dispose();});renderer.dispose();renderer.domElement.remove();};
  },[]);
  return <div className="stitch-closeup yarn-machine" ref={host} role="img" aria-label="Samlet 3D-bevegelsesmodell med hatt, krok, maskeholdere og sammenhengende garntråder"/>;
}
