/* Scene state is a pure function of simTime. */
(function (H) {
  const SECONDS_PER_STITCH = 8;
  const COLOR_CHANGE_PENALTY = 4;
  const MR_SETUP = 30;
  const FINISH_TIME = 60;

  H.SECONDS_PER_STITCH = SECONDS_PER_STITCH;
  H.COLOR_CHANGE_PENALTY = COLOR_CHANGE_PENALTY;
  H.MR_SETUP = MR_SETUP;
  H.FINISH_TIME = FINISH_TIME;

  function buildClock(prog) {
    const N = prog.N;
    const tStart = new Float64Array(N + 1);
    const angBase = new Float64Array(N);
    tStart[0] = MR_SETUP;
    let ang = 0;
    for (let s = 0; s < N; s++) {
      const leadingCol = s > 0 && prog.colorIdx[s] !== prog.colorIdx[s - 1];
      tStart[s + 1] = tStart[s] + SECONDS_PER_STITCH + (leadingCol ? COLOR_CHANGE_PENALTY : 0);
      const pitch = (Math.PI * 2) / prog.countOf[s];
      if (s === 0) {
        angBase[s] = 0;
        ang = 0;
      } else if (prog.isInc[s]) {
        angBase[s] = ang;
      } else {
        ang += pitch;
        angBase[s] = ang;
      }
    }
    const total = tStart[N] + FINISH_TIME;

    function stitchAt(t) {
      if (t <= 0) {
        return { s: 0, phaseT: 0, kind: 'idle', colT: 0, inCol: false };
      }
      if (t < MR_SETUP) {
        return { s: 0, phaseT: t / MR_SETUP, kind: 'mr', colT: 0, inCol: false };
      }
      if (t >= tStart[N]) {
        const ft = Math.min(1, (t - tStart[N]) / FINISH_TIME);
        return { s: N, phaseT: ft, kind: t >= total ? 'done' : 'finish', colT: 0, inCol: false };
      }
      let lo = 0;
      let hi = N;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (tStart[mid + 1] <= t) lo = mid + 1;
        else hi = mid;
      }
      const s = lo;
      const t0 = tStart[s];
      const t1 = tStart[s + 1];
      const leadingCol = s > 0 && prog.colorIdx[s] !== prog.colorIdx[s - 1];
      const colDur = leadingCol ? COLOR_CHANGE_PENALTY : 0;
      if (leadingCol && t < t0 + colDur) {
        return {
          s,
          phaseT: (t - t0) / colDur,
          kind: 'col',
          colT: (t - t0) / colDur,
          inCol: true,
        };
      }
      const stitchT0 = t0 + colDur;
      const phaseT = (t - stitchT0) / SECONDS_PER_STITCH;
      return { s, phaseT: Math.min(1, Math.max(0, phaseT)), kind: 'stitch', colT: 1, inCol: false };
    }

    return { tStart, angBase, total, stitchAt, N };
  }

  function formatDuration(sec) {
    if (!Number.isFinite(sec) || sec < 0) sec = 0;
    const s = Math.round(sec);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const r = s % 60;
    if (h > 0) return h + ' h ' + String(m).padStart(2, '0') + ' m';
    return m + ' m ' + String(r).padStart(2, '0') + ' s';
  }

  H.buildClock = buildClock;
  H.formatDuration = formatDuration;
})(window.HEKLOMAT = window.HEKLOMAT || {});
