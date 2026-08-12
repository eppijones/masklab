import { useEffect, useMemo, useState } from 'react';
import HatScene from '../components/HatScene';
import { getModel } from '../store';
import { CATALOG } from './catalog';

const SHOWCASE = ['ro-ro-ro', 'norway26', 'martin', 'norway26-white'] as const;
const HOLD_MS = 7000;

/**
 * The landing hero hat: the real 3D model from the pattern engine, slowly
 * turning, cycling through the collection. Same scene as the guide — what you
 * see here is what the recipe builds.
 */
export default function HeroHat() {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const id = SHOWCASE[i % SHOWCASE.length];
  const model = useMemo(() => getModel('no', id), [id]);
  const entry = CATALOG.find((p) => p.id === id);

  useEffect(() => {
    if (paused) return;
    const t = setTimeout(() => setI((n) => n + 1), HOLD_MS);
    return () => clearTimeout(t);
  }, [i, paused]);

  return (
    <div
      className="ml-herohat"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <HatScene preview device="desktop" model={model} card />
      <div className="ml-herohat-foot">
        <span className="ml-herohat-name">{entry?.name ?? 'MASKLAB'}</span>
        <div className="ml-herohat-dots" role="tablist" aria-label="Bytt hatt">
          {SHOWCASE.map((s, n) => (
            <button
              key={s}
              type="button"
              role="tab"
              aria-selected={n === i % SHOWCASE.length}
              aria-label={CATALOG.find((p) => p.id === s)?.name ?? s}
              className={`ml-herohat-dot ${n === i % SHOWCASE.length ? 'on' : ''}`}
              onClick={() => setI(n)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
