import { useEffect, useRef } from 'react';

type Piece = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  rot: number;
  vr: number;
  color: string;
  life: number;
};

const COLORS = ['#BA0C2F', '#00205B', '#FDFAF3', '#2F6B4F', '#E8C96A', '#F3ECDC'];

/** Soft yarn-coloured confetti for the congratulations step. */
export default function ConfettiBurst({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pieces = useRef<Piece[]>([]);
  const raf = useRef(0);

  useEffect(() => {
    if (!active) {
      pieces.current = [];
      cancelAnimationFrame(raf.current);
      const c = canvasRef.current;
      if (c) c.getContext('2d')?.clearRect(0, 0, c.width, c.height);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.clientWidth * devicePixelRatio;
      canvas.height = canvas.clientHeight * devicePixelRatio;
      ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const spawn = (n: number) => {
      const W = canvas.clientWidth;
      for (let i = 0; i < n; i++) {
        pieces.current.push({
          x: W * (0.15 + Math.random() * 0.7),
          y: -20 - Math.random() * 80,
          vx: (Math.random() - 0.5) * 3.2,
          vy: 1.6 + Math.random() * 2.8,
          w: 5 + Math.random() * 7,
          h: 8 + Math.random() * 10,
          rot: Math.random() * Math.PI * 2,
          vr: (Math.random() - 0.5) * 0.22,
          color: COLORS[i % COLORS.length],
          life: 1,
        });
      }
    };

    spawn(90);
    let burstAt = performance.now();
    let last = burstAt;

    const tick = (now: number) => {
      const dt = Math.min(32, now - last) / 16.67;
      last = now;
      if (now - burstAt < 2200 && pieces.current.length < 180) {
        spawn(4);
      }

      const W = canvas.clientWidth;
      const H = canvas.clientHeight;
      ctx.clearRect(0, 0, W, H);

      pieces.current = pieces.current.filter((p) => {
        p.vy += 0.045 * dt;
        p.vx *= 0.995;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.vr * dt;
        if (p.y > H + 40) p.life = 0;
        if (p.life <= 0) return false;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = 0.92;
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
        return true;
      });

      if (pieces.current.length > 0 || now - burstAt < 2800) {
        raf.current = requestAnimationFrame(tick);
      }
    };

    raf.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf.current);
      window.removeEventListener('resize', resize);
    };
  }, [active]);

  if (!active) return null;

  return <canvas ref={canvasRef} className="confetti-canvas" aria-hidden />;
}
