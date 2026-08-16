import { BOM, BOM_NOTE, BOM_TOTAL } from '../data/bom.ts';
import { LADDER, LADDER_TOTAL, SIM_DOES_NOT, SIM_PROVES } from '../data/ladder.ts';
import { AXES } from '../engine/axes.ts';

export function ProofPage() {
  return (
    <article className="hk-proof">
      <h1>What this site can prove — and what it cannot</h1>
      <p>
        A browser cannot crochet cotton. If you invest, spend the first €80 on the
        ladder below, not on a pretty frame. The twin exists so you can see the
        motion, the time, and the parts before that.
      </p>

      <div className="hk-split">
        <section>
          <h2>The twin proves</h2>
          <ul>
            {SIM_PROVES.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </section>
        <section>
          <h2>The twin does not prove</h2>
          <ul>
            {SIM_DOES_NOT.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </section>
      </div>

      <h2>Garage ladder — stop rules</h2>
      <p className="hk-muted">
        Cumulative hardware on the ladder: €{LADDER_TOTAL} before a full machine.
        P2 is the kill gate.
      </p>
      <table className="hk-table">
        <thead>
          <tr>
            <th></th>
            <th>Proves</th>
            <th>Pass</th>
            <th>Fail →</th>
            <th>€</th>
          </tr>
        </thead>
        <tbody>
          {LADDER.map((s) => (
            <tr key={s.id}>
              <td>
                <b>{s.id}</b>
                <div>{s.name}</div>
              </td>
              <td>{s.proves}</td>
              <td>{s.pass}</td>
              <td>{s.fail}</td>
              <td>{s.eur}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Bill of materials</h2>
      <p className="hk-muted">{BOM_NOTE}</p>
      <table className="hk-table">
        <thead>
          <tr>
            <th>Group</th>
            <th>Item</th>
            <th>Qty</th>
            <th>Buy</th>
            <th>€</th>
          </tr>
        </thead>
        <tbody>
          {BOM.map((b) => (
            <tr key={b.item}>
              <td>{b.group}</td>
              <td>{b.item}</td>
              <td>{b.qty}</td>
              <td>{b.buy}</td>
              <td>{b.eur}</td>
            </tr>
          ))}
          <tr>
            <td colSpan={4}>
              <b>Total (one prototype)</b>
            </td>
            <td>
              <b>{BOM_TOTAL}</b>
            </td>
          </tr>
        </tbody>
      </table>

      <h2>Six axes</h2>
      <ul>
        {AXES.map((a) => (
          <li key={a.id}>
            <b>
              {a.id} · {a.name}
            </b>{' '}
            — {a.role}
          </li>
        ))}
      </ul>
    </article>
  );
}
