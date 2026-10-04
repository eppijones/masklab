import * as THREE from 'three';
import { RO_HAT, STITCH_POSES, processAt } from './hat-process.ts';

/** Yarn supplies and a schematic feed route. These are bought yarn, not printable parts. */
export function makeYarnView() {
  const group=new THREE.Group();
  const spools=[[300,74],[300,146],[372,74]];
  const strands:THREE.Mesh[]=[];
  RO_HAT.palette.forEach((p,i)=>{
    const [x,y]=spools[i];
    const mat=new THREE.MeshStandardMaterial({color:p.hex,roughness:1});
    const body=new THREE.Mesh(new THREE.CylinderGeometry(23,23,56,40),mat);
    body.rotation.x=Math.PI/2;body.position.set(x,y,38);group.add(body);
    for(let j=0;j<18;j++){
      const loop=new THREE.Mesh(new THREE.TorusGeometry(23,.6,5,40),mat);
      loop.position.set(x,y,11+j*3);group.add(loop);
    }
    const points=[[x+23,y,57],[x+26,y-12,88],[x-42,y,104],[235,26+i*7,110],[216,8+i*3,81],[210,-17.6,66]].map(v=>new THREE.Vector3(...v as [number,number,number]));
    const strand=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),56,.8,6,false),new THREE.MeshStandardMaterial({color:p.hex,roughness:1}));
    strands.push(strand);group.add(strand);
  });
  const marker=new THREE.Mesh(new THREE.TorusGeometry(8,.65,6,28),new THREE.MeshBasicMaterial({color:'#dd8756'}));
  marker.rotation.x=Math.PI/2;marker.position.set(210,-17.6,66);group.add(marker);
  const connection=new THREE.Line(new THREE.BufferGeometry(),new THREE.LineDashedMaterial({color:'#d68139',dashSize:3,gapSize:3,transparent:true,opacity:.85}));
  group.add(connection);
  let lastProgress=-1;
  return {group,update(progress:number){
    if(progress===lastProgress)return;lastProgress=progress;
    const stitch=STITCH_POSES[Math.min(STITCH_POSES.length-1,Math.floor(progress))],active=stitch.color,p=processAt(progress);
    strands.forEach((mesh,i)=>{const mat=mesh.material as THREE.MeshStandardMaterial;mat.transparent=true;mat.opacity=RO_HAT.palette[i].hex===active?1:.22;});
    const a=stitch.angle-p.angle,r=Math.hypot(stitch.x,stitch.y);
    connection.visible=!p.complete;
    const old=connection.geometry;connection.geometry=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(210,-17.6,66),new THREE.Vector3(r*Math.cos(a),r*Math.sin(a),stitch.z)]);old.dispose();connection.computeLineDistances();
  }};
}
