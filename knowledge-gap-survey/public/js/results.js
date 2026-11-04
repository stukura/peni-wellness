// Digital Readiness Profile: results screen, radar chart and shareable card.
import { ARCHETYPES, DIM_LABELS, recommendations } from "./scoring.js";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const SITE_URL = location.origin;
const LEVELS = ["Beginner", "Basic", "Intermediate", "Advanced", "Expert"];

export function renderResults(el, { result, answers, quiz, onRestart, onJoin }) {
  const arch = ARCHETYPES[result.archetype];
  const recs = recommendations(answers, quiz, result);
  const selfLevel = LEVELS[(Number(answers.Q7) || 1) - 1];

  el.classList.add("results");
  el.innerHTML = `
    <p class="kicker">Your Digital Readiness Profile</p>
    <div class="archetype">
      <span class="big-ic" aria-hidden="true">${arch.icon}</span>
      <h1>${esc(arch.name)}</h1>
    </div>
    <p class="lede">${esc(arch.blurb)}</p>

    <div class="res-grid">
      <div class="panel">
        <h3>Your four dimensions</h3>
        ${radar(result.dims)}
      </div>
      <div class="panel">
        <h3>Scores out of 100</h3>
        <div class="bars" role="table" aria-label="Dimension scores">
          ${Object.entries(result.dims).map(([k, v]) => `
            <div class="row" role="row">
              <span role="rowheader">${DIM_LABELS[k]}</span>
              <span class="track" aria-hidden="true"><span class="fill" data-w="${v}"></span></span>
              <span class="val" role="cell">${v}</span>
            </div>`).join("")}
        </div>
        <hr style="border:0;border-top:1px solid var(--line);margin:18px 0">
        <h3>Your knowledge gap</h3>
        <p class="gap-line">You rated yourself <strong>${esc(selfLevel)}</strong> and scored <strong>${result.quiz}/6</strong> on the Quick 6.
        ${gapMessage(result.gapIndex)}</p>
      </div>
      <div class="panel full">
        <h3>Recommended for you</h3>
        <ul class="recs">${recs.map((r) => `<li><span class="ic" aria-hidden="true">${r.icon}</span><div><b>${esc(r.title)}</b><span>${esc(r.body)}</span></div></li>`).join("")}</ul>
      </div>
      <div class="panel full">
        <h3>Share your profile</h3>
        <p class="help" style="margin:0">The card shows your profile type and scores only. No personal details.</p>
        <div class="share">
          <button class="btn" data-dl>⬇ Download card</button>
          <a class="btn ghost" target="_blank" rel="noopener" href="https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(SITE_URL)}">LinkedIn</a>
          <a class="btn ghost" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(shareText(arch) + " " + SITE_URL)}">WhatsApp</a>
          <a class="btn ghost" target="_blank" rel="noopener" href="https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText(arch))}&url=${encodeURIComponent(SITE_URL)}">X</a>
          ${navigator.share ? `<button class="btn ghost" data-native>More…</button>` : ""}
        </div>
      </div>
    </div>

    <div class="actions">
      <a class="btn" href="#join" data-join>Join the Knowledge Gap programme →</a>
      <button class="btn ghost" data-restart>Retake the survey</button>
    </div>
    <div id="join" hidden>
      ${answers.Q38
        ? `<p class="help">You're on the list. We'll email ${esc(answers.Q38)} with programme dates and the report when it's published.</p>`
        : `<p class="help">Leave your email and we'll send programme dates and the report when it's published.</p>
           <form class="actions" data-joinform style="margin-top:12px">
             <input class="input" type="email" required placeholder="you@business.com" aria-label="Email" style="max-width:340px" autocomplete="email">
             <button class="btn">Count me in</button>
           </form>`}
    </div>
  `;
  const form = el.querySelector("[data-joinform]");
  if (form) form.onsubmit = async (e) => {
    e.preventDefault();
    const email = form.querySelector("input").value.trim();
    const btn = form.querySelector("button");
    btn.disabled = true;
    try {
      await onJoin(email);
      form.outerHTML = `<p class="help">You're on the list. Thank you! 🙌</p>`;
    } catch {
      btn.disabled = false;
      btn.textContent = "Try again";
    }
  };

  requestAnimationFrame(() => setTimeout(() => el.querySelectorAll(".fill").forEach((f) => f.style.width = f.dataset.w + "%"), 150));
  el.querySelector("[data-dl]").onclick = () => downloadCard(arch, result);
  el.querySelector("[data-restart]").onclick = () => { if (confirm("Start a fresh survey? Your current profile will be cleared from this device.")) onRestart(); };
  el.querySelector("[data-join]").onclick = (e) => { e.preventDefault(); const j = el.querySelector("#join"); j.hidden = false; j.scrollIntoView({ behavior: "smooth", block: "center" }); };
  const native = el.querySelector("[data-native]");
  if (native) native.onclick = async () => {
    try {
      const blob = await cardBlob(arch, result);
      const file = new File([blob], "knowledge-gap-profile.png", { type: "image/png" });
      const data = { title: "The Knowledge Gap", text: shareText(arch), url: SITE_URL };
      if (navigator.canShare && navigator.canShare({ files: [file] })) data.files = [file];
      await navigator.share(data);
    } catch {}
  };
}

function gapMessage(gap) {
  if (gap >= 30) return "You may know a little less than you think, which is very common. That's exactly the gap we're measuring.";
  if (gap <= -30) return "You know more than you give yourself credit for.";
  return "Your self-assessment is spot on.";
}

const shareText = (arch) => `I'm a ${arch.name} ${arch.icon} on The Knowledge Gap digital readiness survey. How ready is your business for the digital economy?`;

const SHORT = { tech: "Tech Usage", assets: "Digital Assets", regulation: "Regulation", readiness: "Readiness" };

function radar(dims) {
  const keys = Object.keys(dims);
  const size = 300, c = size / 2, R = 100;
  const pt = (i, v) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / keys.length;
    return [c + Math.cos(a) * R * (v / 100), c + Math.sin(a) * R * (v / 100)];
  };
  const rings = [25, 50, 75, 100].map((r) => `<polygon points="${keys.map((_, i) => pt(i, r).join(",")).join(" ")}" fill="none" stroke="rgba(255,255,255,.1)" stroke-width="1"/>`).join("");
  const axes = keys.map((_, i) => { const [x, y] = pt(i, 100); return `<line x1="${c}" y1="${c}" x2="${x}" y2="${y}" stroke="rgba(255,255,255,.1)"/>`; }).join("");
  const shape = keys.map((k, i) => pt(i, Math.max(dims[k], 4)).join(",")).join(" ");
  const dots = keys.map((k, i) => { const [x, y] = pt(i, Math.max(dims[k], 4)); return `<circle cx="${x}" cy="${y}" r="5" fill="#2ee6c5" stroke="#0a1024" stroke-width="2"><title>${DIM_LABELS[k]}: ${dims[k]}</title></circle>`; }).join("");
  const labels = keys.map((k, i) => {
    const [x, y] = pt(i, 128);
    const anchor = Math.abs(x - c) < 5 ? "middle" : x > c ? "start" : "end";
    return `<text x="${x}" y="${y + 4}" text-anchor="${anchor}">${SHORT[k]} · ${dims[k]}</text>`;
  }).join("");
  return `<svg class="radar" viewBox="-75 0 ${size + 150} ${size}" role="img" aria-label="Radar chart: ${keys.map((k) => `${DIM_LABELS[k]} ${dims[k]}`).join(", ")}">
    ${rings}${axes}
    <polygon points="${shape}" fill="rgba(46,230,197,.22)" stroke="#2ee6c5" stroke-width="2" stroke-linejoin="round"/>
    ${dots}${labels}
  </svg>`;
}

function cardCanvas(arch, result) {
  const W = 1200, H = 630;
  const cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const g = cv.getContext("2d");
  const bg = g.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#0a1024"); bg.addColorStop(1, "#13285c");
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  // node motif
  g.strokeStyle = "rgba(46,230,197,.18)"; g.fillStyle = "rgba(46,230,197,.5)";
  const pts = [[880, 90], [1010, 160], [1120, 80], [950, 260], [1100, 300], [1040, 420], [900, 520], [1130, 540]];
  pts.forEach((p, i) => pts.slice(i + 1).forEach((q) => { if (Math.hypot(p[0] - q[0], p[1] - q[1]) < 230) { g.beginPath(); g.moveTo(...p); g.lineTo(...q); g.stroke(); } }));
  pts.forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 5, 0, 7); g.fill(); });

  g.fillStyle = "#2ee6c5"; g.font = "600 26px Inter, sans-serif";
  g.fillText("THE KNOWLEDGE GAP · DIGITAL READINESS PROFILE", 70, 90);
  g.font = "96px sans-serif"; g.fillText(arch.icon, 70, 220);
  g.fillStyle = "#f3f5fb"; g.font = "700 76px Sora, sans-serif";
  g.fillText(arch.name, 190, 215);

  Object.entries(result.dims).forEach(([k, v], i) => {
    const y = 300 + i * 66;
    g.fillStyle = "#b8c0d9"; g.font = "500 26px Inter, sans-serif";
    g.fillText(DIM_LABELS[k], 70, y + 8);
    g.fillStyle = "rgba(255,255,255,.12)"; roundRect(g, 420, y - 12, 440, 22, 11); g.fill();
    g.fillStyle = "#2ee6c5"; roundRect(g, 420, y - 12, Math.max(22, 440 * v / 100), 22, 11); g.fill();
    g.fillStyle = "#f3f5fb"; g.font = "600 26px Inter, sans-serif"; g.fillText(String(v), 880, y + 8);
  });
  g.fillStyle = "#8790ad"; g.font = "500 24px Inter, sans-serif";
  g.fillText(`How ready is your business? Take the survey: ${location.host}`, 70, 585);
  return cv;
}

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}

const cardBlob = (arch, result) => new Promise((res) => cardCanvas(arch, result).toBlob(res, "image/png"));

async function downloadCard(arch, result) {
  const blob = await cardBlob(arch, result);
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "knowledge-gap-profile.png";
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
