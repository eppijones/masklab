/**
 * Hat math — a faithful, dependency-free port of src/lib/hatGeometry.ts.
 *
 * Units: 1 = one stitch width; stitch height H = 0.85 widths; a round's
 * radius follows from its count: r = count / 2π.
 *
 * Deliberate simplifications vs the app (documented in the plan):
 *  - no lockSpokeColor / spokeFracDeltas (Flagget's pinwheel lock is a 2D
 *    chart-alignment nicety, irrelevant to the machine previs)
 *  - fixed thetaOffset instead of wordmark-anchored front centering
 * The ±0.2-stitch per-round drift IS kept — without it the fabric reads as
 * machine knit.
 *
 * Classic script; publishes window.HEKLOMAT.hatmath. Requires window.THREE.
 */
(() => {
  const NS = (window.HEKLOMAT = window.HEKLOMAT || {});
  const STITCH_W = 1;
  const STITCH_H = 0.85;
  const THETA_OFFSET = 0.85;

  function radiusFor(count) {
    return (count * STITCH_W) / (2 * Math.PI);
  }

  /** Deterministic [0,1) hash of one integer — the spiral's per-round wobble. */
  function hash01(n) {
    let h = Math.imul(n + 0x9e37, 0x85ebca6b) >>> 0;
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }

  /** Profile of the hat: one ring {r, y} per round, crown at the top. */
  function buildProfile(rounds) {
    const h = STITCH_H;
    const n = rounds.length;
    if (n === 0) return [];

    const targets = rounds.map((r) => radiusFor(r.count));
    targets[0] = 0.8; // tiny centre opening: 10 fm squeezed into one chain

    const topN = rounds.filter((r) => r.phase === 'top').length;
    const brimStart = rounds.findIndex(
      (r) => r.phase === 'brim-inc' || r.phase === 'wave' || r.phase === 'brim',
    );
    const wallEnd = brimStart > 0 ? brimStart - 1 : n - 1;

    // 1) Recipe radii with even crown disc + soft mid-wall + eased brim.
    const smoothed = [...targets];
    const crownR = targets[Math.max(0, topN - 1)];
    for (let i = 1; i < topN; i++) {
      smoothed[i] = targets[0] + (i / Math.max(1, topN - 1)) * (crownR - targets[0]);
    }
    if (brimStart > topN + 2) {
      for (let pass = 0; pass < 8; pass++) {
        const src = [...smoothed];
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

    // 2) Round the shoulder + wall→brim joins (radius only).
    for (let pass = 0; pass < 6; pass++) {
      const src = [...smoothed];
      for (let i = 1; i < n - 1; i++) {
        const nearShoulder = i >= topN - 4 && i <= Math.min(n - 2, topN + 3);
        const nearBrim =
          brimStart > 0 && i >= brimStart - 3 && i <= Math.min(n - 2, brimStart + 4);
        if (nearShoulder || nearBrim) {
          smoothed[i] = (src[i - 1] + src[i] * 2 + src[i + 1]) / 4;
        }
      }
    }

    // 3) Continuous bucket tangents: dome → soft shoulder → wall → eased brim.
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

    // 4) Soften y kinks at shoulder + brim; keep strictly descending.
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

  /**
   * Position + orientation for every stitch, in working order, written into
   * flat arrays (pos ×3, quat ×4). `ex` is the expansion from opcode.js
   * (needs roundStart per round); rounds are the dump rounds.
   * Local axes: x = circumferential tangent, y = up the surface, z = outward.
   */
  function buildTransforms(rounds, ex, profile) {
    const THREE = window.THREE;
    const N = ex.N;
    const pos = new Float32Array(N * 3);
    const quat = new Float32Array(N * 4);
    const m = new THREE.Matrix4();
    const xAxis = new THREE.Vector3();
    const yAxis = new THREE.Vector3();
    const zAxis = new THREE.Vector3();
    const q = new THREE.Quaternion();

    for (let ri = 0; ri < rounds.length; ri++) {
      const round = rounds[ri];
      const ring = profile[ri];
      const prev =
        ri > 0 ? profile[ri - 1] : { r: 0, y: ring.y + STITCH_H * 0.5 };
      const drift = (hash01(ri) - 0.5) * 0.4;
      const start = ex.roundStart[ri];

      for (let i = 0; i < round.count; i++) {
        const s = start + i;
        const frac = ((i + 0.5 + drift) / round.count) * Math.PI * 2;
        const theta = THETA_OFFSET - frac;
        const cos = Math.cos(theta);
        const sin = Math.sin(theta);

        pos[s * 3] = ring.r * cos;
        pos[s * 3 + 1] = ring.y;
        pos[s * 3 + 2] = ring.r * sin;

        yAxis
          .set((prev.r - ring.r) * cos, prev.y - ring.y, (prev.r - ring.r) * sin)
          .normalize();
        if (yAxis.lengthSq() < 0.5) yAxis.set(0, 1, 0);
        xAxis.set(-sin, 0, cos);
        zAxis.crossVectors(xAxis, yAxis).normalize();
        xAxis.crossVectors(yAxis, zAxis).normalize();
        m.makeBasis(xAxis, yAxis, zAxis);
        q.setFromRotationMatrix(m);
        quat[s * 4] = q.x;
        quat[s * 4 + 1] = q.y;
        quat[s * 4 + 2] = q.z;
        quat[s * 4 + 3] = q.w;
      }
    }
    return { pos, quat };
  }

  /** Azimuth of stitch i in round ri — mirrors buildTransforms exactly. */
  function stitchTheta(rounds, ri, i) {
    const drift = (hash01(ri) - 0.5) * 0.4;
    return THETA_OFFSET - ((i + 0.5 + drift) / rounds[ri].count) * Math.PI * 2;
  }

  /** Concatenate indexed BufferGeometries sharing position+normal layouts. */
  function mergeIndexed(geos) {
    const THREE = window.THREE;
    let vTotal = 0;
    let iTotal = 0;
    for (const g of geos) {
      vTotal += g.attributes.position.count;
      iTotal += g.index.count;
    }
    const pos = new Float32Array(vTotal * 3);
    const norm = new Float32Array(vTotal * 3);
    const index = new Uint32Array(iTotal);
    let vOff = 0;
    let iOff = 0;
    for (const g of geos) {
      pos.set(g.attributes.position.array, vOff * 3);
      norm.set(g.attributes.normal.array, vOff * 3);
      const gi = g.index.array;
      for (let k = 0; k < gi.length; k++) index[iOff + k] = gi[k] + vOff;
      vOff += g.attributes.position.count;
      iOff += gi.length;
    }
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    out.setAttribute('normal', new THREE.BufferAttribute(norm, 3));
    out.setIndex(new THREE.BufferAttribute(index, 1));
    return out;
  }

  function yarnTube(pts, radius, segments) {
    const THREE = window.THREE;
    const curve = new THREE.CatmullRomCurve3(
      pts.map(([x, y, z]) => new THREE.Vector3(x, y, z).multiplyScalar(STITCH_H * 1.22)),
    );
    return new THREE.TubeGeometry(curve, segments, radius, 7, false);
  }

  /**
   * One FASTMASKE (single crochet): heavy vertical post, two legs, and the
   * top V the hook enters on the next round — three merged tubes, ~6° spiral
   * lean. Same modelling as the app.
   */
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

  /** Smooth silhouette of the hat (mandrel / backing shell). */
  function makeShellGeometry(profile) {
    const THREE = window.THREE;
    const pts = [new THREE.Vector2(0.001, profile[0].y + STITCH_H * 0.4)];
    for (const ring of profile) pts.push(new THREE.Vector2(ring.r, ring.y));
    const last = profile[profile.length - 1];
    pts.push(new THREE.Vector2(last.r + 0.15, last.y - 0.1));
    return new THREE.LatheGeometry(pts, 72);
  }

  NS.hatmath = {
    STITCH_W,
    STITCH_H,
    THETA_OFFSET,
    radiusFor,
    hash01,
    buildProfile,
    buildTransforms,
    stitchTheta,
    mergeIndexed,
    makeStitchGeometry,
    makeShellGeometry,
  };
})();
