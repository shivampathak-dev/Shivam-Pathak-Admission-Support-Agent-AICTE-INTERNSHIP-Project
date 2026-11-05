"use client";

import { useEffect, useRef } from "react";

interface AuroraStop {
  x: number; y: number;
  vx: number; vy: number;
  r: number;
  hue: number; dHue: number;
  opacity: number;
}

export default function AuroraBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const raf       = useRef<number>(0);
  const blobs     = useRef<AuroraStop[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width  = canvas.offsetWidth  * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    resize();
    window.addEventListener("resize", resize);

    // Aurora blobs — soft large radial gradients that drift
    blobs.current = [
      { x: 0.25, y: 0.3,  vx: 0.00018, vy: 0.00012, r: 0.55, hue: 220, dHue: 0.04, opacity: 0.28 },
      { x: 0.75, y: 0.6,  vx:-0.00014, vy: 0.00009, r: 0.5,  hue: 245, dHue: 0.03, opacity: 0.22 },
      { x: 0.5,  y: 0.15, vx: 0.00010, vy:-0.00015, r: 0.45, hue: 200, dHue: 0.05, opacity: 0.18 },
      { x: 0.1,  y: 0.8,  vx: 0.00020, vy:-0.00010, r: 0.4,  hue: 260, dHue: 0.02, opacity: 0.15 },
      { x: 0.9,  y: 0.2,  vx:-0.00016, vy: 0.00018, r: 0.38, hue: 190, dHue: 0.06, opacity: 0.13 },
    ];

    let tick = 0;

    const draw = () => {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      tick++;

      // Deep navy base
      ctx.fillStyle = "#080d1a";
      ctx.fillRect(0, 0, w, h);

      // Draw blobs
      for (const b of blobs.current) {
        b.x += b.vx;
        b.y += b.vy;
        b.hue += b.dHue;

        // Bounce within 0–1 range
        if (b.x < 0 || b.x > 1) b.vx *= -1;
        if (b.y < 0 || b.y > 1) b.vy *= -1;

        const cx = b.x * w;
        const cy = b.y * h;
        const radius = b.r * Math.max(w, h);

        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        const pulse = 1 + Math.sin(tick * 0.008 + b.hue) * 0.05;
        grad.addColorStop(0,   `hsla(${b.hue},80%,65%,${b.opacity * pulse})`);
        grad.addColorStop(0.4, `hsla(${b.hue},70%,50%,${b.opacity * 0.5 * pulse})`);
        grad.addColorStop(1,   `hsla(${b.hue},60%,40%,0)`);

        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
      }

      // Subtle scanline grain overlay (makes it feel premium)
      if (tick % 3 === 0) {
        const imageData = ctx.getImageData(0, 0, w * window.devicePixelRatio, h * window.devicePixelRatio);
        const d = imageData.data;
        for (let i = 0; i < d.length; i += 4 * 60) {
          const noise = (Math.random() - 0.5) * 8;
          d[i]     = Math.min(255, Math.max(0, d[i]     + noise));
          d[i + 1] = Math.min(255, Math.max(0, d[i + 1] + noise));
          d[i + 2] = Math.min(255, Math.max(0, d[i + 2] + noise));
        }
        ctx.putImageData(imageData, 0, 0);
      }

      raf.current = requestAnimationFrame(draw);
    };

    raf.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
    />
  );
}
