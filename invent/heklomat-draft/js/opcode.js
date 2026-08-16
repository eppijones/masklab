/* Expand compact HEKLOMAT_DATA patterns to typed arrays. */
(function (H) {
  function expand(pattern) {
    const rounds = pattern.roundMeta;
    const palette = pattern.palette;
    const N = pattern.stitches;
    const roundStart = new Uint32Array(rounds.length + 1);
    const colorIdx = new Uint8Array(N);
    const isInc = new Uint8Array(N);
    const changeAfter = new Uint8Array(N);
    const roundOf = new Uint16Array(N);
    const iInRound = new Uint16Array(N);
    const countOf = new Uint16Array(N);
    let s = 0;
    for (let ri = 0; ri < rounds.length; ri++) {
      roundStart[ri] = s;
      const r = rounds[ri];
      const incSet = new Set(r.incIdx);
      let i = 0;
      for (const [len, palIdx] of r.runs) {
        for (let k = 0; k < len; k++, i++, s++) {
          colorIdx[s] = palIdx;
          isInc[s] = incSet.has(i) ? 1 : 0;
          roundOf[s] = ri;
          iInRound[s] = i;
          countOf[s] = r.count;
        }
      }
      if (i !== r.count) {
        throw new Error(`opcode expand: round ${r.num} got ${i} expected ${r.count}`);
      }
    }
    roundStart[rounds.length] = N;
    if (s !== N) throw new Error(`opcode expand: ${s} != ${N}`);

    let changes = 0;
    for (let i = 0; i < N - 1; i++) {
      if (colorIdx[i + 1] !== colorIdx[i]) {
        changeAfter[i] = 1;
        changes++;
      }
    }
    if (changes !== pattern.colorChanges) {
      throw new Error(
        `opcode expand: color changes ${changes} != dump ${pattern.colorChanges}`,
      );
    }

    const stitches = [];
    for (let i = 0; i < N; i++) {
      stitches.push({
        roundIdx: roundOf[i],
        i: iInRound[i],
        color: palette[colorIdx[i]],
        isIncrease: isInc[i] === 1,
        changeColorAfter: changeAfter[i] ? palette[colorIdx[i + 1]] : null,
      });
    }
    const roundList = rounds.map((r) => ({
      num: r.num,
      phase: r.phase,
      count: r.count,
      color: r.color,
    }));

    function opLabel(idx, phase) {
      if (phase === 'mr') return 'MR';
      if (phase === 'col') {
        const next = palette[colorIdx[idx]] || palette[0];
        return 'COL → ' + next;
      }
      if (phase === 'slst') return 'SLST';
      if (phase === 'fo') return 'FO';
      if (idx >= N) return 'FO';
      if (isInc[idx]) return 'INC';
      return 'FM';
    }

    return {
      N,
      id: pattern.id,
      title: pattern.title,
      titleNo: pattern.titleNo,
      palette,
      colorChanges: changes,
      roundStart,
      colorIdx,
      isInc,
      changeAfter,
      roundOf,
      iInRound,
      countOf,
      rounds: roundList,
      stitches,
      opLabel,
    };
  }

  H.expand = expand;
})(window.HEKLOMAT = window.HEKLOMAT || {});
