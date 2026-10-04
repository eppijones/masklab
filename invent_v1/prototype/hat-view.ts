import * as THREE from 'three';
import { HAT, HAT_ROUNDS, STITCH_POSES, processAt } from './hat-process.ts';

/** Stylised stitch symbols on the measured design surface. Not interlinked yarn geometry. */
export function makeHatView() {
  const group = new THREE.Group();
  const path = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-2.3, 0, 1.0), new THREE.Vector3(-1.0, -.3, -1.2),
    new THREE.Vector3(-.5, .1, -1.5), new THREE.Vector3(.3, .45, 1.0),
    new THREE.Vector3(1.4, -.1, 1.4), new THREE.Vector3(2.3, -.15, .7),
  ]);
  const geometry = new THREE.TubeGeometry(path, 16, .65, 5, false);
  const material = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1 });
  const stitches = new THREE.InstancedMesh(geometry, material, HAT.totalStitches);
  const transform = new THREE.Matrix4(), rotation = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion(), scale = new THREE.Vector3();
  for (let i = 0; i < STITCH_POSES.length; i++) {
    const s = STITCH_POSES[i];
    rotation.makeBasis(new THREE.Vector3(-Math.sin(s.angle), Math.cos(s.angle), 0),
      new THREE.Vector3(-Math.cos(s.angle), -Math.sin(s.angle), 0), new THREE.Vector3(0, 0, 1));
    quaternion.setFromRotationMatrix(rotation);
    scale.set(s.width * .91 / 4.6, 1, 1);
    transform.compose(new THREE.Vector3(s.x, s.y, s.z), quaternion, scale);
    stitches.setMatrixAt(i, transform);
    stitches.setColorAt(i, new THREE.Color(s.color));
  }
  stitches.instanceMatrix.needsUpdate = true;
  stitches.computeBoundingBox();
  stitches.computeBoundingSphere();
  stitches.count = 0;
  // Opaque backing prevents the far-side lettering showing through the symbolic
  // stitch gaps. It is a visual fabric surface, not extra yarn or a printed part.
  const positions:number[]=[],indices:number[]=[];const segments=96;
  HAT_ROUNDS.forEach((row,i)=>{
    for(let j=0;j<=segments;j++){
      const a=j/segments*Math.PI*2,r=row.radius-1.35;
      positions.push(r*Math.cos(a),r*Math.sin(a),row.z);
      if(i>0&&j<segments){const b=i*(segments+1)+j,t=b-(segments+1);indices.push(t,b,t+1,t+1,b,b+1);}
    }
  });
  const fabricGeometry=new THREE.BufferGeometry();fabricGeometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));fabricGeometry.setIndex(indices);fabricGeometry.computeVertexNormals();
  const fabric=new THREE.Mesh(fabricGeometry,new THREE.MeshStandardMaterial({color:'#eee7d7',roughness:1,side:THREE.DoubleSide}));
  fabricGeometry.setDrawRange(0,0);group.add(fabric);
  group.add(stitches);
  // Faint rings describe the intended whole-hat shape before stitches appear.
  const outlines = new THREE.Group();
  for (const index of [0, 8, 18, 25, 29, 33, 37]) {
    const r = HAT_ROUNDS[index];
    const points = Array.from({ length: 97 }, (_, i) => {
      const a = i / 96 * Math.PI * 2;
      return new THREE.Vector3(r.radius * Math.cos(a), r.radius * Math.sin(a), r.z);
    });
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),
      new THREE.LineDashedMaterial({ color: '#789581', dashSize: 2, gapSize: 3, transparent: true, opacity: .28 }));
    line.computeLineDistances(); outlines.add(line);
  }
  group.add(outlines);
  const marker = new THREE.Mesh(new THREE.SphereGeometry(2.1, 14, 10), new THREE.MeshBasicMaterial({ color: '#e17c44' }));
  group.add(marker);
  function update(progress: number) {
    const p = processAt(progress);
    stitches.count = Math.floor(p.progress);
    const completed=HAT_ROUNDS.filter(r=>r.end<=p.progress).length;
    fabricGeometry.setDrawRange(0,Math.max(0,completed-1)*segments*6);
    const stitch=STITCH_POSES[Math.min(Math.floor(p.progress),STITCH_POSES.length-1)];
    marker.position.set(stitch.x,stitch.y,stitch.z);
    marker.visible = !p.complete;
    outlines.visible = !p.complete;
  }
  return { group, update };
}
