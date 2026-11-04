// Background "connected nodes" motif and the completion confetti.
const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

export function startBackground(cv) {
  if (!cv || reduced()) return;
  const g = cv.getContext("2d");
  let W, H, nodes;
  const resize = () => {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.round(Math.min(60, (W * H) / 26000));
    nodes = Array.from({ length: n }, () => ({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - 0.5) * 0.25, vy: (Math.random() - 0.5) * 0.25 }));
  };
  resize();
  addEventListener("resize", resize);
  const LINK = 140;
  const tick = () => {
    if (document.hidden) return requestAnimationFrame(tick);
    g.clearRect(0, 0, W, H);
    for (const p of nodes) {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > W) p.vx *= -1;
      if (p.y < 0 || p.y > H) p.vy *= -1;
    }
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < LINK) {
          g.strokeStyle = `rgba(46,230,197,${0.18 * (1 - d / LINK)})`;
          g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke();
        }
      }
    }
    g.fillStyle = "rgba(122,167,255,.55)";
    for (const p of nodes) { g.beginPath(); g.arc(p.x, p.y, 1.8, 0, 7); g.fill(); }
    requestAnimationFrame(tick);
  };
  tick();
}

export function confetti() {
  const cv = document.getElementById("confetti");
  if (!cv || reduced()) return;
  const g = cv.getContext("2d");
  cv.width = innerWidth; cv.height = innerHeight;
  const colors = ["#2ee6c5", "#7aa7ff", "#ffb547", "#f3f5fb"];
  const parts = Array.from({ length: 120 }, () => ({
    x: innerWidth / 2 + (Math.random() - 0.5) * 200, y: innerHeight * 0.35,
    vx: (Math.random() - 0.5) * 12, vy: -Math.random() * 12 - 4,
    r: Math.random() * 6 + 3, c: colors[(Math.random() * colors.length) | 0],
    a: Math.random() * 6, va: (Math.random() - 0.5) * 0.3,
  }));
  let frames = 0;
  const step = () => {
    g.clearRect(0, 0, cv.width, cv.height);
    for (const p of parts) {
      p.vy += 0.3; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.a += p.va;
      g.save(); g.translate(p.x, p.y); g.rotate(p.a);
      g.fillStyle = p.c; g.globalAlpha = Math.max(0, 1 - frames / 160);
      g.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2);
      g.restore();
    }
    if (++frames < 160) requestAnimationFrame(step);
    else g.clearRect(0, 0, cv.width, cv.height);
  };
  step();
}
