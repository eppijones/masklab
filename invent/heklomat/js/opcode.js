/**
 * Maskekode expansion — turns the compact run-length pattern dump into flat
 * typed arrays, one entry per stitch, in working order. These arrays ARE the
 * machine program: the simulator and a real HEKLOMAT execute the same stream.
 *
 * Ops: MR (magic ring, before stitch 0) · FM (fastmaske / single crochet) ·
 * INC (second fm into the same stitch below) · COL→x (change color while
 * finishing this stitch) · SLST+FO (finish, after the last stitch).
 *
 * Classic script; publishes window.HEKLOMAT.opcode.
 */
(() => {
  const NS = (window.HEKLOMAT = window.HEKLOMAT || {});

  function expandPattern(p) {
    const N = p.totals.stitches;
    const R = p.rounds.length;
    const roundStart = new Uint32Array(R + 1);
    const colorIdx = new Uint8Array(N);
    const isInc = new Uint8Array(N);

    let off = 0;
    for (let ri = 0; ri < R; ri++) {
      const r = p.rounds[ri];
      roundStart[ri] = off;
      if (r.runs) {
        for (const [len, c] of r.runs) {
          colorIdx.fill(c, off, off + len);
          off += len;
        }
      } else {
        colorIdx.fill(r.color, off, off + r.count);
        off += r.count;
      }
      if (r.incIdx) for (const i of r.incIdx) isInc[roundStart[ri] + i] = 1;
    }
    roundStart[R] = off;
    if (off !== N) {
      throw new Error(`${p.id}: expansion produced ${off} stitches, expected ${N}`);
    }

    // Change color while finishing stitch s when the NEXT stitch differs —
    // exactly how tapestry crochet works (the new yarn is pulled through in
    // the last pull-through of the preceding stitch).
    const changeAfter = new Uint8Array(N);
    const changesBefore = new Uint16Array(N + 1);
    let changes = 0;
    for (let s = 0; s < N; s++) {
      changesBefore[s] = changes;
      if (s < N - 1 && colorIdx[s + 1] !== colorIdx[s]) {
        changeAfter[s] = 1;
        changes++;
      }
    }
    changesBefore[N] = changes;
    if (changes !== p.totals.colorChanges) {
      console.warn(
        `${p.id}: derived ${changes} color changes, dump says ${p.totals.colorChanges}`,
      );
    }

    // Round lookup: binary search over roundStart.
    function roundOf(s) {
      let lo = 0;
      let hi = R - 1;
      while (lo < hi) {
        const mid = (lo + hi + 1) >> 1;
        if (roundStart[mid] <= s) lo = mid;
        else hi = mid - 1;
      }
      return lo;
    }

    function opLabel(s) {
      if (s < 0) return 'MR';
      if (s >= N) return 'SLST · FO';
      const parts = [isInc[s] ? 'INC' : 'FM'];
      if (changeAfter[s]) {
        const yarn = p.palette[colorIdx[s + 1]];
        const name = (NS.data && NS.data.yarnName && NS.data.yarnName[yarn]) || yarn;
        parts.push('COL→' + name);
      }
      return parts.join(' + ');
    }

    return {
      pattern: p,
      N,
      R,
      roundStart,
      colorIdx,
      isInc,
      changeAfter,
      changesBefore,
      totalChanges: changes,
      roundOf,
      opLabel,
    };
  }

  NS.opcode = { expandPattern };
})();
