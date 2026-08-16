/**
 * The time model. Scene state is a pure function of simTime — that single
 * decision keeps machine and hat in sync at every speed, makes speed changes
 * seamless, and gives pause + scrubbing for free.
 *
 * Cycle times are the v1 machine targets from the patent:
 *   8 s per fastmaske, +4 s when the stitch carries a color change,
 *   30 s magic-ring setup, 60 s finishing (SLST + FO + cut).
 *
 * Classic script; publishes window.HEKLOMAT.SimClock.
 */
(() => {
  const NS = (window.HEKLOMAT = window.HEKLOMAT || {});

  const SECONDS_PER_STITCH = 8;
  const COLOR_CHANGE_PENALTY = 4;
  const MR_SETUP = 30;
  const FINISH_TIME = 60;
  const TWO_PI = Math.PI * 2;

  class SimClock {
    constructor(ex) {
      this.ex = ex;
      const N = ex.N;

      // tStart[s] = simTime at which stitch s begins; tStart[N] = work done.
      const tStart = new Float64Array(N + 1);
      let t = MR_SETUP;
      for (let s = 0; s < N; s++) {
        tStart[s] = t;
        t += SECONDS_PER_STITCH + (ex.changeAfter[s] ? COLOR_CHANGE_PENALTY : 0);
      }
      tStart[N] = t;
      this.tStart = tStart;
      this.total = t + FINISH_TIME;

      // angBase[s] = cumulative turntable angle when stitch s begins.
      // One round = one full revolution; the C-axis never jumps.
      const angBase = new Float64Array(N + 1);
      for (let ri = 0; ri < ex.R; ri++) {
        const start = ex.roundStart[ri];
        const count = ex.roundStart[ri + 1] - start;
        for (let i = 0; i < count; i++) {
          angBase[start + i] = TWO_PI * (ri + i / count);
        }
      }
      angBase[N] = TWO_PI * ex.R;
      this.angBase = angBase;

      this.simTime = 0;
      this.speed = 60;
      this.paused = false;
    }

    cycleOf(s) {
      return SECONDS_PER_STITCH + (this.ex.changeAfter[s] ? COLOR_CHANGE_PENALTY : 0);
    }

    /** Advance by wall-clock dt (seconds). Returns clamped simTime. */
    tick(dt) {
      if (!this.paused) {
        this.simTime = Math.min(this.total, this.simTime + dt * this.speed);
      }
      return this.simTime;
    }

    get done() {
      return this.simTime >= this.total;
    }

    /**
     * Where are we at time t?
     *   { stage: 'mr',     progress }            magic-ring setup
     *   { stage: 'stitch', s, phaseT, cycle }    working stitch s, phaseT∈[0,1)
     *   { stage: 'finish', progress }            SLST + FO
     *   { stage: 'done' }
     */
    at(t) {
      if (t < MR_SETUP) return { stage: 'mr', progress: t / MR_SETUP, s: -1 };
      const { tStart, ex } = this;
      if (t >= this.total) return { stage: 'done', s: ex.N };
      if (t >= tStart[ex.N]) {
        return {
          stage: 'finish',
          progress: (t - tStart[ex.N]) / FINISH_TIME,
          s: ex.N,
        };
      }
      // Binary search: largest s with tStart[s] <= t.
      let lo = 0;
      let hi = ex.N - 1;
      while (lo < hi) {
        const mid = (lo + hi + 1) >> 1;
        if (tStart[mid] <= t) lo = mid;
        else hi = mid - 1;
      }
      const cycle = this.cycleOf(lo);
      return { stage: 'stitch', s: lo, phaseT: (t - tStart[lo]) / cycle, cycle };
    }

    /** Number of completed stitches at time t (drives the growing hat). */
    stitchesDone(t) {
      const a = this.at(t);
      if (a.stage === 'mr') return 0;
      if (a.stage === 'stitch') return a.s;
      return this.ex.N;
    }

    /**
     * Continuous turntable angle at time t. The pitch advance happens inside
     * the tail of each stitch cycle (sub-phase 7, 0.86→1.0, smoothstepped) so
     * at 1× the platter visibly indexes stitch by stitch, while at high speed
     * the same function reads as a continuous spin.
     */
    angleAt(t) {
      const a = this.at(t);
      if (a.stage === 'mr') return 0;
      if (a.stage !== 'stitch') return this.angBase[this.ex.N];
      const from = this.angBase[a.s];
      const to = this.angBase[a.s + 1];
      const p = a.phaseT;
      let adv = 0;
      if (p > 0.86) {
        const u = (p - 0.86) / 0.14;
        adv = u * u * (3 - 2 * u);
      }
      return from + adv * (to - from);
    }

    fmtHMS(sec) {
      sec = Math.max(0, Math.round(sec));
      const h = Math.floor(sec / 3600);
      const m = Math.floor((sec % 3600) / 60);
      const s = sec % 60;
      const mm = String(m).padStart(2, '0');
      const ss = String(s).padStart(2, '0');
      return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
    }
  }

  SimClock.SECONDS_PER_STITCH = SECONDS_PER_STITCH;
  SimClock.COLOR_CHANGE_PENALTY = COLOR_CHANGE_PENALTY;
  SimClock.MR_SETUP = MR_SETUP;
  SimClock.FINISH_TIME = FINISH_TIME;

  NS.SimClock = SimClock;
})();
