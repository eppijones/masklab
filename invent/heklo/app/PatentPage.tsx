import { ABSTRACT, CLAIMS, PRIOR_ART, TITLE } from '../data/patent.ts';
import { AXES } from '../engine/axes.ts';
import { TOPOLOGIES } from '../engine/topology.ts';

export function PatentPage() {
  return (
    <article className="hk-patent">
      <p className="hk-disclaimer">
        Draft invention disclosure for R&amp;D. Not filed. Not legal advice. Do not
        publish this text as a patent application without a patent attorney.
      </p>
      <header className="hk-pat-head">
        <span className="hk-pat-no">WO / HEKLO / 0001</span>
        <h1>{TITLE}</h1>
        <p className="hk-pat-meta">
          Inventor: garage prototype · Assignee: none · Priority: unfiled
        </p>
      </header>

      <h2>Abstract</h2>
      <p className="hk-abstract">{ABSTRACT}</p>

      <h2>Field</h2>
      <p>
        The invention relates to textile machinery, and more particularly to an
        apparatus that forms true weft-crochet fabric (single crochet / Norwegian
        fastmaske) in the round, including shaped garments such as a bucket hat
        with tapestry colourwork.
      </p>

      <h2>Background</h2>
      <p>
        Crochet has resisted industrialisation because a human crocheter inserts a
        hook into a specific previous stitch that exists only as a pair of loops in
        floppy fabric. Locating that “V” is a three-dimensional, tactile problem.
        Warp-knitting machines sold as “crochet machines” produce a different
        topology. Circular knitting machines produce yet another. Academic
        prototypes either hunt with a real hook (and miss) or hold a flat last row
        on a bed (and cannot make a hat in one setup).
      </p>
      <table className="hk-table">
        <thead>
          <tr>
            <th>Art</th>
            <th>What it does</th>
            <th>What it does not</th>
          </tr>
        </thead>
        <tbody>
          {PRIOR_ART.map((a) => (
            <tr key={a.id}>
              <td>
                <b>{a.title}</b>
                <div className="hk-muted">
                  {a.year} · {a.who}
                </div>
              </td>
              <td>{a.what}</td>
              <td>{a.gap}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Summary</h2>
      <p>
        HEKLO inverts the problem. Instead of seeing the V, it <i>holds</i> the V.
        Every live stitch mouth is clipped in a 3D-printed gate. The gates are
        identical links of a closed chain — a Løkkebånd — whose length is the
        working stitch count. A ten-stitch crown is ten gates. A hundred-stitch
        wall is a hundred. A flared brim injects more. A fixed station, like a
        sewing machine, plunges a latch needle through whichever gate has been
        indexed to 12 o’clock, yarn-overs, and draws one new bight through two
        loops. That last move is crochet. Knitting never does it.
      </p>

      <h2>Brief description of drawings</h2>
      <ol className="hk-figs">
        <li>Fig. 1 — Hex deck, tripod, rotating chain table, fixed station arm.</li>
        <li>Fig. 2 — One gate link, throat sized to a 4.0 mm fastmaske V.</li>
        <li>Fig. 3 — Injector adding a link on increase.</li>
        <li>Fig. 4 — Fastmaske cycle: present, plunge, YO, pull, YO, draw-through-two, deposit.</li>
        <li>Fig. 5 — Four-yarn turret indexing on the second yarn-over.</li>
        <li>Fig. 6 — Work hanging from the chain, crown-down, brim at the working ring.</li>
      </ol>
      <p className="hk-muted">
        The figures are the 3D twin on the Twin page. Explode the model; the parts
        are the drawings.
      </p>

      <h2>Detailed description</h2>
      <h3>Axes</h3>
      <table className="hk-table">
        <thead>
          <tr>
            <th>Axis</th>
            <th>Role</th>
            <th>Actuator</th>
          </tr>
        </thead>
        <tbody>
          {AXES.map((a) => (
            <tr key={a.id}>
              <td>
                <b>{a.id}</b> {a.name}
              </td>
              <td>{a.role}</td>
              <td>{a.actuator}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h3>Topology</h3>
      {TOPOLOGIES.map((t) => (
        <p key={t.id}>
          <b>{t.name}.</b> Live loops: {t.liveLoops} Draw-through: {t.drawThrough}{' '}
          {t.heklo}
        </p>
      ))}
      <h3>Seed</h3>
      <p>
        The machine chains ten stitches into ten gates and slip-stitches them into
        a ring, or the operator drops a printed seed ring. Croche-Matic could not
        start a magic ring. HEKLO does not need one.
      </p>
      <h3>Colour</h3>
      <p>
        Catalog hats (Helene Spilling; NORWAY’26 Home / Away / Keeper) are tapestry
        crochet. The turret carries up to four yarns and indexes on the second
        yarn-over of a stitch whose next neighbour is a different colour, locking
        the change inside the stitch the way a hand does.
      </p>

      <h2>Claims</h2>
      <ol className="hk-claims">
        {CLAIMS.map((c) => (
          <li key={c.n}>
            <span className="hk-claim-k">{c.kind}</span> {c.text}
          </li>
        ))}
      </ol>
    </article>
  );
}
