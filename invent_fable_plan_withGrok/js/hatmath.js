/* HEKLOMAT hat math — port of src/lib/hatGeometry.ts
   Fixed thetaOffset 0.85 (no lockSpokeColor / wordmark centering). */
(function (H) {
  const THREE = globalThis.THREE;
  const STITCH_W = 1;
  const STITCH_H = 0.85;
  const FRONT_THETA = 0.85;

  H.STITCH_W = STITCH_W;
  H.STITCH_H = STITCH_H;
  H.MM_PER_SU = 5.8;

  function hash01(n) {
    let h = Math.imul(n + 0x9e37, 0x85ebca6b) >>> 0;
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }

  function radiusFor(count) {
    return (count * STITCH_W) / (2 * Math.PI);
  }

  function mergeIndexed(geoms) {
    let vCount = 0;
    let iCount = 0;
    for (const g of geoms) {
      const pos = g.getAttribute('position');
      vCount += pos.count;
      iCount += g.index ? g.index.count : pos.count;
    }
    const posArr = new Float32Array(vCount * 3);
    const nrmArr = new Float32Array(vCount * 3);
    const idxArr = vCount > 65535 ? new Uint32Array(iCount) : new Uint16Array(iCount);
    let vo = 0;
    let io = 0;
    let vOff = 0;
    for (const g of geoms) {
      if (!g.getAttribute('normal')) g.computeVertexNormals();
      const p = g.getAttribute('position');
      const n = g.getAttribute('normal');
      posArr.set(p.array, vo);
      nrmArr.set(n.array, vo);
      vo += p.array.length;
      if (g.index) {
        const ia = g.index.array;
        for (let i = 0; i < ia.length; i++) idxArr[io++] = ia[i] + vOff;
      } else {
        for (let i = 0; i < p.count; i++) idxArr[io++] = i + vOff;
      }
      vOff += p.count;
    }
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
    out.setAttribute('normal', new THREE.BufferAttribute(nrmArr, 3));
    out.setIndex(new THREE.BufferAttribute(idxArr, 1));
    return out;
  }

  function buildProfile(rounds) {
    const h = STITCH_H;
    const n = rounds.length;
    if (n === 0) return [];
    const targets = rounds.map((r) => radiusFor(r.count));
    targets[0] = 0.8;
    const topN = rounds.filter((r) => r.phase === 'top').length;
    const brimStart = rounds.findIndex(
      (r) => r.phase === 'brim-inc' || r.phase === 'wave' || r.phase === 'brim',
    );
    const wallEnd = brimStart > 0 ? brimStart - 1 : n - 1;
    const smoothed = targets.slice();
    const crownR = targets[Math.max(0, topN - 1)];
    for (let i = 1; i < topN; i++) {
      smoothed[i] = targets[0] + (i / Math.max(1, topN - 1)) * (crownR - targets[0]);
    }
    if (brimStart > topN + 2) {
      for (let pass = 0; pass < 8; pass++) {
        const src = smoothed.slice();
        for (let i = topN + 1; i < brimStart - 1; i++) {
          smoothed[i] = (src[i - 1] + src[i] * 2 + src[i + 1]) / 4;
        }
      }
    }
    if (brimStart > 0) {
      const rFrom = smoothed[wallEnd];
      const rTo = targets[n - 1];
      const bn = n - brimStart;
      for (let i = 0; i < bn; i++) {
        const t = (i + 1) / bn;
        const ease = t * t * (3 - 2 * t);
        smoothed[brimStart + i] = rFrom + ease * (rTo - rFrom);
      }
    }
    for (let pass = 0; pass < 6; pass++) {
      const src = smoothed.slice();
      for (let i = 1; i < n - 1; i++) {
        const nearShoulder = i >= topN - 4 && i <= Math.min(n - 2, topN + 3);
        const nearBrim =
          brimStart > 0 && i >= brimStart - 3 && i <= Math.min(n - 2, brimStart + 4);
        if (nearShoulder || nearBrim) {
          smoothed[i] = (src[i - 1] + src[i] * 2 + src[i + 1]) / 4;
        }
      }
    }
    const rings = [];
    let y = 0;
    let prevR = smoothed[0];
    for (let idx = 0; idx < n; idx++) {
      const r = Math.max(smoothed[idx], prevR);
      const actualDr = Math.max(0, r - prevR);
      let dy;
      if (idx === 0) {
        dy = 0;
      } else if (idx < topN) {
        const t = idx / Math.max(1, topN - 1);
        const roll = t * t;
        const targetDy = h * (0.08 + 0.7 * roll);
        const drCap = Math.min(actualDr, h * (0.95 - 0.55 * roll));
        dy = Math.max(targetDy, Math.sqrt(Math.max(0, h * h - drCap * drCap)));
      } else if (brimStart < 0 || idx < brimStart) {
        const fromShoulder = Math.min(1, (idx - topN) / 4);
        const drCap = Math.min(actualDr, h * (0.45 * (1 - fromShoulder) + 0.12));
        dy = Math.sqrt(Math.max(h * 0.6, h * h - drCap * drCap));
      } else {
        const brimI = idx - brimStart;
        const brimN = Math.max(1, n - brimStart - 1);
        const t = Math.min(1, brimI / brimN);
        const flare = 0.25 + 0.65 * (t * t * (3 - 2 * t));
        const drCap = Math.min(actualDr, h * flare);
        dy = Math.sqrt(Math.max(h * 0.32, h * h - drCap * drCap));
      }
      y -= dy;
      rings.push({ r, y });
      prevR = r;
    }
    for (let pass = 0; pass < 4; pass++) {
      const srcY = rings.map((ring) => ring.y);
      for (let i = 1; i < n - 1; i++) {
        const nearShoulder = i >= topN - 4 && i <= Math.min(n - 2, topN + 3);
        const nearBrim =
          brimStart > 0 && i >= brimStart - 3 && i <= Math.min(n - 2, brimStart + 4);
        if (nearShoulder || nearBrim) {
          rings[i] = { r: rings[i].r, y: (srcY[i - 1] + srcY[i] * 2 + srcY[i + 1]) / 4 };
        }
      }
    }
    for (let i = 1; i < n; i++) {
      if (rings[i].y > rings[i - 1].y - 0.04) {
        rings[i] = { r: rings[i].r, y: rings[i - 1].y - 0.04 };
      }
    }
    const minY = rings[n - 1].y;
    const lift = -minY + 0.4;
    return rings.map(({ r, y: yy }) => ({ r, y: yy + lift }));
  }

  function buildStitchTransforms(rounds, stitches, profile) {
    const out = [];
    const m = new THREE.Matrix4();
    const xAxis = new THREE.Vector3();
    const yAxis = new THREE.Vector3();
    const zAxis = new THREE.Vector3();
    const thetaOffset = FRONT_THETA;
    for (let s = 0; s < stitches.length; s++) {
      const st = stitches[s];
      const round = rounds[st.roundIdx];
      const ring = profile[st.roundIdx];
      const prev =
        st.roundIdx > 0 ? profile[st.roundIdx - 1] : { r: 0, y: ring.y + STITCH_H * 0.5 };
      const drift = (hash01(st.roundIdx) - 0.5) * 0.4;
      const frac = ((st.i + 0.5 + drift) / round.count) * Math.PI * 2;
      const theta = thetaOffset - frac;
      const cos = Math.cos(theta);
      const sin = Math.sin(theta);
      const pos = new THREE.Vector3(ring.r * cos, ring.y, ring.r * sin);
      yAxis
        .set((prev.r - ring.r) * cos, prev.y - ring.y, (prev.r - ring.r) * sin)
        .normalize();
      if (yAxis.lengthSq() < 0.5) yAxis.set(0, 1, 0);
      xAxis.set(-sin, 0, cos);
      zAxis.crossVectors(xAxis, yAxis).normalize();
      xAxis.crossVectors(yAxis, zAxis).normalize();
      m.makeBasis(xAxis, yAxis, zAxis);
      out.push({
        position: pos,
        quaternion: new THREE.Quaternion().setFromRotationMatrix(m),
        theta,
      });
    }
    return out;
  }

  function yarnTube(pts, radius, segments) {
    const curve = new THREE.CatmullRomCurve3(
      pts.map(([x, y, z]) => new THREE.Vector3(x, y, z).multiplyScalar(STITCH_H * 1.22)),
    );
    return new THREE.TubeGeometry(curve, segments, radius, 7, false);
  }

  function makeStitchGeometry() {
    const legs = yarnTube(
      [
        [-0.31, -0.54, -0.03],
        [-0.36, -0.16, 0.03],
        [-0.21, 0.2, 0.08],
        [0.01, 0.32, 0.11],
        [0.23, 0.2, 0.08],
        [0.38, -0.16, 0.03],
        [0.33, -0.54, -0.03],
      ],
      0.195,
      22,
    );
    const post = yarnTube(
      [
        [-0.02, -0.5, 0.07],
        [0.01, -0.24, 0.14],
        [0.04, 0.02, 0.17],
        [0.06, 0.2, 0.14],
      ],
      0.205,
      12,
    );
    const topV = yarnTube(
      [
        [-0.33, 0.33, 0.09],
        [-0.14, 0.22, 0.16],
        [0.06, 0.18, 0.19],
        [0.26, 0.24, 0.16],
        [0.42, 0.35, 0.09],
      ],
      0.14,
      14,
    );
    const geo = mergeIndexed([legs, post, topV]);
    legs.dispose();
    post.dispose();
    topV.dispose();
    geo.rotateZ(-0.105);
    geo.translate(0, -STITCH_H * 0.05, 0);
    geo.computeVertexNormals();
    return geo;
  }

  function makeGhostGeometry(profile) {
    const pts = [new THREE.Vector2(0.001, profile[0].y + STITCH_H * 0.4)];
    for (const ring of profile) pts.push(new THREE.Vector2(ring.r, ring.y));
    const last = profile[profile.length - 1];
    pts.push(new THREE.Vector2(last.r + 0.15, last.y - 0.1));
    return new THREE.LatheGeometry(pts, 72);
  }

  H.mergeIndexed = mergeIndexed;
  H.radiusFor = radiusFor;
  H.buildProfile = buildProfile;
  H.buildStitchTransforms = buildStitchTransforms;
  H.makeStitchGeometry = makeStitchGeometry;
  H.makeGhostGeometry = makeGhostGeometry;
})(window.HEKLOMAT = window.HEKLOMAT || {});
