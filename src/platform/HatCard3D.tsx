import { useEffect, useMemo, useRef, useState } from 'react';
import HatScene from '../components/HatScene';
import { getModel } from '../store';
import type { PatternId } from '../patterns/types';

const MARGIN = 120;

function isNearViewport(el: HTMLElement): boolean {
  const r = el.getBoundingClientRect();
  return r.bottom > -MARGIN && r.top < window.innerHeight + MARGIN;
}

/**
 * Live 3D hat for platform cards — same HatScene as the guide.
 * Mounts only while near the viewport so a full gallery does not open
 * six WebGL contexts at once. Pointer events stay off so page scroll
 * still works when dragging over the card.
 */
export default function HatCard3D({
  id,
  className,
}: {
  id: Exclude<PatternId, 'custom'>;
  className?: string;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const model = useMemo(() => getModel('no', id), [id]);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    let raf = 0;
    const check = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        setInView(isNearViewport(el));
      });
    };
    check();
    window.addEventListener('scroll', check, { passive: true });
    window.addEventListener('resize', check);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', check);
      window.removeEventListener('resize', check);
    };
  }, []);

  return (
    <div
      ref={hostRef}
      className={`ml-hat3d ${className ?? ''}`.trim()}
      aria-hidden
    >
      {inView ? (
        <HatScene preview device="desktop" model={model} card />
      ) : (
        <div className="ml-hat3d-placeholder" />
      )}
    </div>
  );
}
