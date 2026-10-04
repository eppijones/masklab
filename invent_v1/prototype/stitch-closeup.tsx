import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { cyclePose } from './stitch-cycle.ts';

type Point=[number,number,number];
/** Exploded instructional yarn paths. No collision, yarn mechanics or manufacturing claim. */
export function StitchCloseup({cycle,color,nextColor}:{cycle:number;color:string;nextColor:string}){
  const host=useRef<HTMLDivElement>(null),state=useRef({cycle,color,nextColor});
  state.current={cycle,color,nextColor};
  useEffect(()=>{
    const el=host.current!;let renderer:THREE.WebGLRenderer;
    try{renderer=new THREE.WebGLRenderer({antialias:true});}catch{el.textContent='3D kunne ikke startes. Trinnene og mønsteret kan fortsatt leses.';return;}
    renderer.setPixelRatio(Math.min(devicePixelRatio,2));el.appendChild(renderer.domElement);
    const scene=new THREE.Scene();scene.background=new THREE.Color('#e8eee5');
    const camera=new THREE.PerspectiveCamera(34,1,.1,500);camera.up.set(0,0,1);camera.position.set(47,-65,44);
    const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,0,9);controls.enableDamping=true;controls.minDistance=35;controls.maxDistance=150;controls.update();
    scene.add(new THREE.HemisphereLight(0xffffff,0x3b5842,2.8));const light=new THREE.DirectionalLight(0xffffff,3);light.position.set(-20,-40,70);scene.add(light);
    const cloth=new THREE.Group();scene.add(cloth);
    const tube=(points:Point[],color:string,r=.65,closed=false)=>new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)),closed),48,r,7,closed),new THREE.MeshStandardMaterial({color,roughness:.82}));
    // Previous-round stitch tops. Two separated upper strands leave the insertion visible.
    for(let x=-18;x<=18;x+=9){
      const top=tube([[x-4,0,0],[x-2,-2.6,.3],[x+2,-2.6,.3],[x+4,0,0],[x+2,2.6,.3],[x-2,2.6,.3]],x===0?'#91ad85':'#c3cab6',.72,true);cloth.add(top);
      cloth.add(tube([[x-3,0,0],[x-2,-1,-5],[x,1,-7],[x+2,-1,-5],[x+3,0,0]],'#bdc8b3'));
    }
    const insertion=new THREE.Mesh(new THREE.TorusGeometry(5.5,.16,5,60),new THREE.MeshBasicMaterial({color:'#d78a4c'}));insertion.scale.y=.72;insertion.position.z=.4;scene.add(insertion);
    const hook=new THREE.Group();scene.add(hook);
    const shaft=new THREE.Mesh(new THREE.CylinderGeometry(.9,.8,30,24),new THREE.MeshStandardMaterial({color:'#9faeae',metalness:.7,roughness:.3}));shaft.rotation.x=Math.PI/2;shaft.position.z=18;hook.add(shaft);
    const tip=tube([[0,0,4],[0,0,1.2],[.3,0,0],[1.4,0,.4],[1.8,0,1.8],[1.1,0,2.5]],'#c57b38',.82);hook.add(tip);
    const grip=new THREE.Mesh(new THREE.CylinderGeometry(1.8,1.8,10,24),new THREE.MeshStandardMaterial({color:'#355540'}));grip.rotation.x=Math.PI/2;grip.position.z=32;hook.add(grip);
    const dynamic=new THREE.Group();scene.add(dynamic);let last='';
    function clearDynamic(){while(dynamic.children.length){const m=dynamic.children[0] as THREE.Mesh;dynamic.remove(m);m.geometry.dispose();(m.material as THREE.Material).dispose();}}
    const loop=(z:number,c:string)=>{
      const points=Array.from({length:36},(_,i)=>{const a=i/36*Math.PI*2;return [Math.cos(a)*2.0,Math.sin(a)*1.85,z] as Point;});
      dynamic.add(tube(points,c,.59,true));
    };
    function update(){
      const {cycle,color,nextColor}=state.current,p=cyclePose(cycle);hook.position.z=p.tipZ;
      hook.rotation.z=(p.firstCatch||p.secondCatch)?-.55:0;
      const key=[cycle.toFixed(2),color,nextColor].join('|');if(key===last)return;last=key;clearDynamic();
      const finalColor=p.finished?nextColor:color;
      if(p.finished){
        loop(23,finalColor);
        dynamic.add(tube([[-3,-1,0],[-2,-2,3],[0,0,6],[2,-2,3],[3,-1,0]],color,.74));
        dynamic.add(tube([[0,0,6],[-2,-1,15],[-1.6,-1,23]],finalColor));
      }else{
        const firstZ=p.twoLoops?14:9;loop(firstZ,color);
        dynamic.add(tube([[-8,-1,1],[-5,-2,4],[-2,-1,firstZ]],color));
        if(p.twoLoops){loop(10,color);dynamic.add(tube([[-2,-1,10],[-3,-1,4],[-1,-1,-2],[1,1,-2],[2,1,10]],color));}
      }
      const feedColor=(p.secondCatch||p.finished)?nextColor:color;
      const endZ=p.finished?23:(p.firstCatch||p.secondCatch?p.tipZ+1.2:p.twoLoops?10:9);
      dynamic.add(tube([[21,5,28],[16,3,24],[10,1,15],[3,0,endZ+1],[1.3,0,endZ]],feedColor));
      if(p.firstCatch||p.secondCatch)dynamic.add(tube([[1.3,0,endZ],[.8,-1.3,endZ-.4],[-1,-.7,endZ+.3]],feedColor));
    }
    const resize=new ResizeObserver(()=>{const r=el.getBoundingClientRect();renderer.setSize(r.width,r.height);camera.aspect=r.width/Math.max(r.height,1);camera.updateProjectionMatrix();});resize.observe(el);
    let raf=0;const frame=()=>{update();controls.update();renderer.render(scene,camera);raf=requestAnimationFrame(frame);};frame();
    return()=>{cancelAnimationFrame(raf);resize.disconnect();controls.dispose();scene.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose());}});renderer.dispose();renderer.domElement.remove();};
  },[]);
  return <div className="stitch-closeup" ref={host} role="img" aria-label="Dreibar 3D-nærvisning av krok, gammel maske og løkkene i en fastmaske"/>;
}
