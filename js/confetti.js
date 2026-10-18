// Short confetti burst in the brand colours.
const COLORS = ["#B3202A", "#C9B78F", "#6B4423", "#FFFFFF", "#1A1A1A"];

export function burst(canvas, ms = 4500) {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = innerWidth * dpr;
  canvas.height = innerHeight * dpr;
  const c = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;
  const bits = Array.from({ length: 160 }, () => ({
    x: W / 2 + (Math.random() - 0.5) * W * 0.3,
    y: H * 0.35,
    vx: (Math.random() - 0.5) * 18 * dpr,
    vy: (-Math.random() * 16 - 6) * dpr,
    s: (6 + Math.random() * 8) * dpr,
    a: Math.random() * 6.28,
    va: (Math.random() - 0.5) * 0.4,
    color: COLORS[(Math.random() * COLORS.length) | 0],
  }));
  const start = performance.now();
  (function tick(t) {
    const left = 1 - (t - start) / ms;
    c.clearRect(0, 0, W, H);
    if (left <= 0) return;
    c.globalAlpha = Math.min(1, left * 3);
    for (const b of bits) {
      b.vy += 0.45 * dpr; b.vx *= 0.99;
      b.x += b.vx; b.y += b.vy; b.a += b.va;
      c.save();
      c.translate(b.x, b.y); c.rotate(b.a);
      c.fillStyle = b.color;
      c.strokeStyle = "rgba(0,0,0,.15)";
      c.fillRect(-b.s / 2, -b.s / 4, b.s, b.s / 2);
      c.strokeRect(-b.s / 2, -b.s / 4, b.s, b.s / 2);
      c.restore();
    }
    requestAnimationFrame(tick);
  })(start);
}
