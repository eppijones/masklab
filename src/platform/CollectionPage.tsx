import { CATALOG, HELENE_PDFS, HELENE_URL } from './catalog';
import { YARN_HEX, YARN_NAME } from '../data/types';
import HatCard3D from './HatCard3D';

const HELENE = CATALOG.filter((p) => p.collection === 'helene');

export default function CollectionPage() {
  return (
    <div className="ml-page">
      <div className="ml-coll-hero">
        <div className="ml-coll-copy">
          <span className="ml-eyebrow">Designerkapsel · VM 2026</span>
          <h1>
            Helene Spilling-
            <br />
            kolleksjonen
          </h1>
          <p>
            Da kvinnelandslaget rodde seg til VM, heklet Helene Spilling hatten
            som fulgte dem dit: <em>«Ro det i land»</em> — RO RO RO i kursiv
            rundt en ullhvit bøttehatt. Sammen med{' '}
            <em>«Flagget til topps»</em> og <em>«Vi som elsker Martin»</em> er
            alle tre originalene her — med komplett runde-for-runde-guide.
          </p>
          <p className="ml-coll-note">
            Design: <strong>Helene Spilling</strong> · originaloppskrifter på{' '}
            <a href={HELENE_URL} target="_blank" rel="noopener noreferrer">
              helenespilling.com
            </a>{' '}
            · hun ønsker at de som kan, vippser en liten sum til
            Barnekreftforeningen som betaling for oppskriften.
          </p>
        </div>
        <div className="ml-coll-mock">
          <HatCard3D id="ro-ro-ro" />
        </div>
      </div>

      <div className="ml-coll-list">
        {HELENE.map((p, i) => (
          <div key={p.id} className="ml-coll-row">
            <div>
              <HatCard3D id={p.id} />
              <div
                className="ml-chips"
                style={{ justifyContent: 'center', marginTop: 10 }}
              >
                {p.colors.map((c) => (
                  <span key={c} className="ml-chip">
                    <span
                      className="ml-chip-dot"
                      style={{ background: YARN_HEX[c] }}
                    />
                    {YARN_NAME[c]}
                  </span>
                ))}
              </div>
            </div>
            <div className="ml-coll-info">
              <div>
                <span className="ml-nr">0{i + 1}</span>
                <h2>{p.name}</h2>
                <p className="desc">{p.desc}</p>
              </div>
              <div className="ml-card-meta">
                <span>nål {p.hook}</span>
                <span>·</span>
                <span>{p.difficulty}</span>
                <span>·</span>
                <span>ca {p.time}</span>
              </div>
              <div className="ml-coll-actions">
                <a href={`/oppskrift/${p.id}`} className="ml-btn primary">
                  Start →
                </a>
                {HELENE_PDFS[p.id] && (
                  <a
                    href={HELENE_PDFS[p.id]}
                    className="ml-btn ghost"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Original PDF
                  </a>
                )}
                <a href={`/studio?pattern=${p.id}`} className="ml-btn ghost">
                  Åpne i studio
                </a>
              </div>
            </div>
          </div>
        ))}
        <div className="ml-coll-foot">
          <span>
            Ro det i land · Flagget til topps · Vi som elsker Martin © Helene
            Spilling · til inntekt for Barnekreftforeningen
          </span>
          <a href="/studio">Lag din egen variant i studio →</a>
        </div>
      </div>
    </div>
  );
}
