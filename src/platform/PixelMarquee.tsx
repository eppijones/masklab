import { useEffect, useRef } from 'react';
import { rasterizeText } from '../data/rasterizeText';
import { getFont } from '../data/fonts/registry';

/**
 * The MASKLAB pixel marquee — "HEKLE HELE NORGE ★ VM 2026 ★" rendered as
 * crochet cells with the same pixel-font engine that builds the hats.
 */
export default function PixelMarquee({
  text = 'HEKLE HELE NORGE ★ VM 2026 ★ ',
}: {
  text?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, cv.width, cv.height);
    const font = getFont('blokk');
    const mask = rasterizeText(text, font, { slantDeg: 0, letterSpacing: 1 });
    const w = mask[0]?.length ?? 1;
    const cell = 8;
    const reps = Math.ceil(cv.width / ((w + 2) * cell));
    for (let rep = 0; rep < reps; rep++) {
      for (let r = 0; r < mask.length; r++) {
        for (let c = 0; c < w; c++) {
          if (!mask[r][c]) continue;
          ctx.fillStyle = (r + c) % 9 === 0 ? '#22406B' : '#B7182E';
          ctx.fillRect(
            (rep * (w + 2) + c) * cell,
            5 + r * cell,
            cell - 1,
            cell - 1,
          );
        }
      }
    }
  }, [text]);

  return (
    <canvas
      ref={ref}
      width={1600}
      height={66}
      className="pixel-marquee"
      aria-hidden
    />
  );
}
