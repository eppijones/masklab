import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import type { Data, Part } from './types.ts';
import { makeHatView } from './hat-view.ts';
import { processAt } from './hat-process.ts';
import { makeYarnView } from './yarn-view.ts';

const BASE = import.meta.env.BASE_URL;

export function Viewer({data,mode,selected,explode,hardware,onSelect,showProcess=false,progress=0,focusHat=false}:{data:Data;mode:string;selected:string;explode:number;hardware:boolean;onSelect:(id:string)=>void;showProcess?:boolean;progress?:number;focusHat?:boolean}) {
  const host = useRef<HTMLDivElement>(null);
  const progressRef = useRef(progress);
  progressRef.current = progress;
  const [error,setError] = useState('');
  useEffect(()=>{
    let disposed=false, raf=0;
    setError('');
    const el=host.current!;
    let renderer:THREE.WebGLRenderer;
    try {renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});} catch {setError('3D-visningen er ikke tilgjengelig. Du kan fortsatt se mål og laste ned delene.');return;}
    renderer.setPixelRatio(Math.min(devicePixelRatio,2)); el.appendChild(renderer.domElement);
    const scene=new THREE.Scene(); scene.background=new THREE.Color('#eef0e9');
    const camera=new THREE.PerspectiveCamera(36,1,.1,10000); camera.up.set(0,0,1);
    const controls=new OrbitControls(camera,renderer.domElement); controls.enableDamping=true;
    scene.add(new THREE.HemisphereLight(0xffffff,0x526455,2.4));
    const light=new THREE.DirectionalLight(0xffffff,3);light.position.set(150,-220,500);scene.add(light);
    const root=new THREE.Group();scene.add(root);
    const turntable=new THREE.Group();root.add(turntable);
    const hat=showProcess&&mode!=='part'?makeHatView():null;
    if(hat)turntable.add(hat.group);
    const yarn=showProcess&&mode!=='part'?makeYarnView():null;
    if(yarn)root.add(yarn.group);
    const loader=new STLLoader();const meshes:THREE.Mesh[]=[];
    const material=(color:string)=>new THREE.MeshStandardMaterial({color,roughness:.7,metalness:.08});
    const load=async(p:Part,m?:number[],position?:number[])=>{
      const geom=await loader.loadAsync(BASE+(mode==='part'?p.file:p.geometry));
      if(disposed){geom.dispose();return;}
      const mesh=new THREE.Mesh(geom,material(p.id==='fit-rack-r1'?'#a8b79e':p.group==='former'?'#e2cba4':p.group==='head'?'#bd7254':'#729987'));
      if(hat&&p.id.startsWith('mandrel-')) {mesh.material.transparent=true;mesh.material.opacity=.12;mesh.material.depthWrite=false;}
      if(m)mesh.applyMatrix4(new THREE.Matrix4().fromArray(m));
      if(position)mesh.position.fromArray(position);
      mesh.userData={partId:p.id};(hat&&p.mount.frame==='C'?turntable:root).add(mesh);meshes.push(mesh);
    };
    const start=async()=>{
      if(mode==='part') {const p=data.parts.find(p=>p.id===selected)!;await load(p);}
      else {
        const parts=data.parts.filter(p=>p.fullQty.installed>0);
        await Promise.all(parts.flatMap(p=>p.matrices.map(m=>load(p,m))));
        if(disposed)return;
        if(hardware)for(const h of data.hardware){
          const [x,y,z]=h.size??[10,10,10];
          const geometry=new THREE.BoxGeometry(x,y,z);
          const mesh=new THREE.Mesh(geometry,material(h.kind==='motor'?'#34453e':'#a3ada7'));
          mesh.applyMatrix4(new THREE.Matrix4().fromArray(h.matrix));mesh.userData={hardware:true};(hat&&h.frame==='C'?turntable:root).add(mesh);meshes.push(mesh);
        }
        const centre=new THREE.Box3().setFromObject(root).getCenter(new THREE.Vector3());
        for(const mesh of meshes){const dir=mesh.position.clone().sub(centre);if(dir.length()<1)dir.set(0,0,1);mesh.position.addScaledVector(dir.normalize(),explode);}
      }
      if(disposed)return;
      if(hat)hat.update(progressRef.current);
      const box=new THREE.Box3().setFromObject(root),centre=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3());
      const span=Math.max(size.x,size.y,size.z,50);
      const grid=new THREE.GridHelper(Math.ceil(span/100)*200,20,0xb2c2b6,0xd0d9d1);grid.rotation.x=Math.PI/2;grid.position.set(centre.x,centre.y,box.min.z-.3);scene.add(grid);
      camera.position.copy(centre).add(new THREE.Vector3(1,-1.5,1.1).multiplyScalar(span*0.98)); controls.target.copy(centre);controls.update();
      if(hat&&focusHat){camera.position.set(340,-380,330);controls.target.set(0,0,90);controls.update();}
      // Add a true 50 mm scale bar in model coordinates.
      const bar=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(box.min.x,box.min.y-10,box.min.z),new THREE.Vector3(box.min.x+50,box.min.y-10,box.min.z)]),new THREE.LineBasicMaterial({color:0x263e33}));scene.add(bar);
    };
    start().catch(e=>!disposed&&setError(`Kunne ikke laste 3D-modellen: ${e.message}`));
    const resize=new ResizeObserver(()=>{const r=el.getBoundingClientRect();camera.aspect=r.width/Math.max(1,r.height);camera.updateProjectionMatrix();renderer.setSize(r.width,r.height);});resize.observe(el);
    const pointer=new THREE.Vector2(), ray=new THREE.Raycaster();let down=[0,0];
    const onDown=(e:PointerEvent)=>{down=[e.clientX,e.clientY];};
    const onClick=(e:PointerEvent)=>{if(Math.hypot(e.clientX-down[0],e.clientY-down[1])>4)return;const r=el.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(pointer,camera);const hit=ray.intersectObjects(meshes).find(h=>h.object.userData.partId);if(hit)onSelect(hit.object.userData.partId);};
    renderer.domElement.addEventListener('pointerdown',onDown);renderer.domElement.addEventListener('pointerup',onClick);
    const frame=()=>{if(hat){hat.update(progressRef.current);const p=processAt(progressRef.current);turntable.rotation.z=p.complete?0:-p.angle;}yarn?.update(progressRef.current);controls.update();renderer.render(scene,camera);raf=requestAnimationFrame(frame);};frame();
    return()=>{disposed=true;cancelAnimationFrame(raf);resize.disconnect();controls.dispose();scene.traverse(o=>{if(o instanceof THREE.Mesh||o instanceof THREE.Line){o.geometry.dispose();(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose());}});renderer.dispose();renderer.domElement.remove();};
  },[data,mode,selected,explode,hardware,showProcess,focusHat]);
  return <div className="viewhost" ref={host} role="img" aria-label={mode==='part'?'3D-visning av valgt del':showProcess?'3D-visning av hattforløpet på maskinens CAD-modell':'3D-visning av hele V1-maskinen'}>{error&&<p className="rendererror">{error}</p>}</div>;
}
