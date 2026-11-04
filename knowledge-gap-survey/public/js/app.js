// The Knowledge Gap: survey engine.
// All question copy and logic lives in /data/questions.json; this file only renders it.
import { COUNTRIES } from "./countries.js";
import { score } from "./scoring.js";
import { renderResults } from "./results.js";
import { startBackground, confetti } from "./fx.js";

const STORE_KEY = "kg-survey-v1";
const PENDING_KEY = "kg-survey-pending";
const API = "/api/submit";
const SECONDS_PER_QUESTION = 12;

const $app = document.getElementById("app");
const $topbar = document.getElementById("topbar");
const $path = document.getElementById("path");
const $eta = document.getElementById("eta");
const $back = document.getElementById("backBtn");

const params = new URLSearchParams(location.search);
if (params.has("flags")) document.body.classList.add("show-flags");

let CONFIG;
let state;
let advanceTimer;

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const flag = (f) => (f ? `<span class="flag">${esc(f)}</span>` : "");

// ---------- State ----------
function freshState() {
  return {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2),
    step: "welcome",
    consent: false,
    answers: {},
    other: {},
    quiz: {},
    hp: "",
    done: false,
    meta: {
      startedAt: new Date().toISOString(),
      src: params.get("src") || "",
      device: deviceType(),
      lang: navigator.language || "",
      chapterSeconds: {},
      furthestChapter: null,
    },
    _ch: null,
    _chEnter: null,
  };
}

function deviceType() {
  const ua = navigator.userAgent;
  if (/iPad|Tablet/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua))) return "tablet";
  if (/Mobi|Android|iPhone/i.test(ua)) return "mobile";
  return "desktop";
}

function loadState() {
  try {
    const s = JSON.parse(localStorage.getItem(STORE_KEY));
    if (s && s.id) return s;
  } catch {}
  return null;
}
const save = () => localStorage.setItem(STORE_KEY, JSON.stringify(state));

// ---------- Steps ----------
function visible(item) {
  const c = item.showIf;
  if (!c) return true;
  const v = state.answers[c.q];
  if (c.notIn) return v !== undefined && !c.notIn.includes(v);
  if (c.in) return c.in.includes(v);
  return true;
}

function buildSteps() {
  const steps = [{ key: "welcome", kind: "welcome" }, { key: "consent", kind: "consent" }];
  CONFIG.chapters.forEach((ch, ci) => {
    steps.push({ key: `intro:${ch.id}`, kind: "intro", ch, ci });
    ch.items.forEach((item) => {
      if (!visible(item)) return;
      steps.push({ key: `q:${item.id}`, kind: "q", ch, ci, item });
      const ex = item.explainer;
      if (ex && ex.when.in.includes(state.answers[item.id])) {
        steps.push({ key: `exp:${item.id}`, kind: "explainer", ch, ci, item });
      }
    });
    if (ch.insight || ch.id === "quiz") steps.push({ key: `ins:${ch.id}`, kind: "insight", ch, ci });
  });
  steps.push({ key: "results", kind: "results" });
  return steps;
}

function indexOf(steps, key) {
  const i = steps.findIndex((s) => s.key === key);
  return i < 0 ? 0 : i;
}

function go(delta) {
  clearTimeout(advanceTimer);
  const steps = buildSteps();
  let i = indexOf(steps, state.step) + delta;
  if (delta < 0 && i < 2) i = 2; // never go back past the first chapter intro
  i = Math.max(0, Math.min(steps.length - 1, i));
  const next = steps[i];
  if (next.kind === "results" && !state.done) return finish();
  state.step = next.key;
  save();
  render(delta < 0 ? "back" : "fwd");
}
const next = () => go(1);
const back = () => go(-1);
$back.addEventListener("click", back);

// ---------- Chapter timing & partial saves ----------
function trackChapter(step) {
  const now = Date.now();
  const ch = step.ch ? step.ch.id : null;
  if (ch === state._ch) return;
  if (state._ch && state._chEnter) {
    const secs = state.meta.chapterSeconds;
    secs[state._ch] = Math.round((secs[state._ch] || 0) + (now - state._chEnter) / 1000);
    // A chapter boundary is a good moment to save progress for drop-off analysis.
    send(false);
  }
  state._ch = ch;
  state._chEnter = now;
  if (step.ch) {
    const order = CONFIG.chapters.map((c) => c.id);
    const cur = state.meta.furthestChapter;
    if (!cur || order.indexOf(ch) > order.indexOf(cur)) state.meta.furthestChapter = ch;
  }
}

function payload(completed) {
  const body = {
    id: state.id,
    completed,
    answers: { ...state.answers },
    other: state.other,
    quiz: Object.fromEntries(Object.entries(state.quiz).map(([k, v]) => [k, v.a])),
    meta: { ...state.meta, lastStep: state.step, updatedAt: new Date().toISOString() },
    hp: state.hp,
  };
  // Contact details travel in their own object and are stored separately server-side.
  const contactIds = CONFIG.chapters.find((c) => c.contact).items.map((i) => i.id);
  const contact = {};
  contactIds.forEach((id) => { if (id in body.answers) { contact[id] = body.answers[id]; delete body.answers[id]; } });
  if (completed) {
    body.contact = contact;
    body.scores = state.result;
    body.meta.completedAt = new Date().toISOString();
  }
  return body;
}

async function post(body) {
  const res = await fetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), keepalive: true });
  if (!res.ok) throw new Error(`Submit failed: ${res.status}`);
}

function send(completed) {
  if (!state.consent) return Promise.resolve();
  const body = payload(completed);
  return post(body).catch(() => {
    if (completed) localStorage.setItem(PENDING_KEY, JSON.stringify(body));
  });
}

function flushPending() {
  const raw = localStorage.getItem(PENDING_KEY);
  if (!raw) return;
  post(JSON.parse(raw)).then(() => localStorage.removeItem(PENDING_KEY)).catch(() => {});
}

async function finish() {
  state.result = score(state.answers, state.quiz);
  state.done = true;
  trackChapter({});
  state.step = "results";
  save();
  render("fwd");
  await send(true);
}

// ---------- Progress UI ----------
function updateChrome(step, steps) {
  const inSurvey = step.ch != null;
  $topbar.hidden = !inSurvey;
  if (!inSurvey) return;
  const i = indexOf(steps, step.key);
  $back.disabled = step.kind === "intro" && step.ci === 0;
  $path.innerHTML = CONFIG.chapters.map((ch, ci) => {
    const inCh = steps.filter((s) => s.ci === ci);
    const done = inCh.filter((s) => indexOf(steps, s.key) < i).length;
    const pct = ci < step.ci ? 100 : ci > step.ci ? 0 : Math.round((done / inCh.length) * 100);
    return `<span class="node" title="${esc(ch.title)}"><i style="width:${pct}%"></i></span>`;
  }).join("") + `<span class="label">${esc(step.ch.icon)} ${esc(step.ch.title)} · ${step.ci + 1}/${CONFIG.chapters.length}</span>`;
  $path.setAttribute("aria-label", `Chapter ${step.ci + 1} of ${CONFIG.chapters.length}: ${step.ch.title}`);
  const remainingQs = steps.slice(i).filter((s) => s.kind === "q").length;
  const secs = remainingQs * SECONDS_PER_QUESTION;
  $eta.textContent = secs < 40 ? "Almost done" : `~${Math.max(1, Math.round(secs / 60))} min left`;
}

// ---------- Rendering ----------
function render(dir = "fwd") {
  const steps = buildSteps();
  const step = steps[indexOf(steps, state.step)];
  trackChapter(step);
  updateChrome(step, steps);

  const el = document.createElement("section");
  el.className = "screen" + (dir === "back" ? " back" : "");
  const R = { welcome: rWelcome, consent: rConsent, intro: rIntro, q: rQuestion, explainer: rExplainer, insight: rInsight, results: rResults }[step.kind];
  R(el, step);

  const old = $app.firstElementChild;
  const mount = () => {
    $app.replaceChildren(el);
    window.scrollTo({ top: 0 });
    const h = el.querySelector("h1, h2");
    if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); }
  };
  if (old && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    old.classList.add("leaving");
    setTimeout(mount, 180);
  } else mount();
}

function continueBtn(label = "Continue", enabled = true) {
  return `<div class="actions"><button class="btn primary" data-continue ${enabled ? "" : "disabled"}>${esc(label)} <span aria-hidden="true">→</span></button><span class="hint">or press <b>Enter</b></span></div><div class="error" role="alert"></div>`;
}

function rWelcome(el) {
  const m = CONFIG.meta;
  const resumable = state.consent && !state.done && state._resumeStep;
  el.classList.add("welcome");
  el.innerHTML = `
    <p class="kicker">${esc(m.title)}</p>
    <h1>How ready is your business for the <span class="grad">digital economy?</span></h1>
    <p class="lede">${esc(m.purpose)}</p>
    <ul class="promises">${m.promises.map((p) => `<li>${esc(p)}</li>`).join("")}</ul>
    <button class="btn primary" data-continue>Start the journey <span aria-hidden="true">→</span></button>
  `;
  el.querySelector("[data-continue]").onclick = () => {
    if (resumable) { state.step = state._resumeStep; delete state._resumeStep; save(); return render(); }
    next();
  };
  if (resumable) {
    el.querySelector("[data-continue]").innerHTML = `Pick up where you left off <span aria-hidden="true">→</span>`;
    const r = document.createElement("p");
    r.className = "resume";
    r.innerHTML = `Your answers so far are saved on this device. <button type="button">Start over instead</button>`;
    r.querySelector("button").onclick = restart;
    el.appendChild(r);
  }
}

function restart() {
  localStorage.removeItem(STORE_KEY);
  state = freshState();
  save();
  render();
}

function rConsent(el) {
  el.innerHTML = `
    <p class="kicker">Before we begin</p>
    <h2 class="q">A quick word on your data</h2>
    <p class="help">We report results in aggregate only. If you choose to leave your name or email at the end, they're stored separately from your answers. <a href="/privacy.html" target="_blank" rel="noopener">Read the privacy note</a>.</p>
    <label class="check"><input type="checkbox" id="consent" ${state.consent ? "checked" : ""}><span>${esc(CONFIG.meta.consent)}</span></label>
    <div class="hp" aria-hidden="true"><label>Leave this empty <input type="text" id="hp" tabindex="-1" autocomplete="off"></label></div>
    ${continueBtn("I agree, let's go", state.consent)}
  `;
  const cb = el.querySelector("#consent");
  const btn = el.querySelector("[data-continue]");
  cb.onchange = () => { btn.disabled = !cb.checked; };
  btn.onclick = () => {
    if (!cb.checked) return;
    state.consent = true;
    state.hp = el.querySelector("#hp").value;
    next();
  };
}

function rIntro(el, step) {
  const ch = step.ch;
  el.classList.add("card-hero");
  el.innerHTML = `
    <span class="big-ic" aria-hidden="true">${ch.icon}</span>
    <p class="kicker" style="margin-top:18px">Chapter ${step.ci + 1} of ${CONFIG.chapters.length}</p>
    <h1>${esc(ch.title)}</h1>
    <p class="lede">${esc(ch.hook)}</p>
    <div class="meta"><span>⏱ ~${ch.minutes} min</span><span>·</span><span>${ch.items.filter(visible).length} questions</span></div>
    ${continueBtn(step.ci === 0 ? "Let's go" : "Continue")}
  `;
  el.querySelector("[data-continue]").onclick = next;
}

function rExplainer(el, step) {
  const ex = step.item.explainer;
  el.innerHTML = `
    <div class="insight">
      <p class="kicker">Quick explainer</p>
      <h2 class="q">${esc(ex.title)}</h2>
      <p>${esc(ex.body)}</p>
      ${flag(ex.flag)}
    </div>
    ${continueBtn("Got it")}
  `;
  el.querySelector("[data-continue]").onclick = next;
}

function rInsight(el, step) {
  const ch = step.ch;
  if (ch.id === "quiz") {
    const ids = ch.items.map((i) => i.id);
    const n = ids.filter((id) => state.quiz[id]?.correct).length;
    const msg = n >= 5 ? "Impressive. You know your stuff." : n >= 3 ? "Solid. A few surprises in there, maybe?" : "Every expert started here, and now you know six things more.";
    el.innerHTML = `
      <div class="insight">
        <p class="kicker">Your Quick 6 score</p>
        <div class="score-pips">${ids.map((id) => `<i class="${state.quiz[id]?.correct ? "hit" : "miss"}"></i>`).join("")}</div>
        <h2 class="q">${n} out of ${ids.length}</h2>
        <p>${msg}</p>
      </div>
      ${continueBtn()}
    `;
  } else {
    el.innerHTML = `
      <div class="insight">
        <p class="kicker">💡 ${esc(ch.insight.title)}</p>
        <p>${esc(ch.insight.body)}</p>
        ${flag(ch.insight.flag)}
      </div>
      ${continueBtn()}
    `;
  }
  el.querySelector("[data-continue]").onclick = next;
}

function rResults(el) {
  if (!state.result) state.result = score(state.answers, state.quiz);
  renderResults(el, {
    result: state.result, answers: state.answers, quiz: state.quiz, onRestart: restart,
    onJoin: async (email) => {
      state.answers.Q38 = email;
      state.answers.Q39 = "yes";
      save();
      await post({ id: state.id, type: "contact", contact: { Q37: state.answers.Q37, Q38: email, Q39: "yes", Q40: state.answers.Q40 }, hp: state.hp });
    },
  });
  if (!state._celebrated) { confetti(); state._celebrated = true; save(); }
}

// ---------- Questions ----------
function rQuestion(el, step) {
  const item = step.item;
  el.dataset.type = item.type;
  const head = item.type === "quiz"
    ? `<p class="kicker">True or false? · ${step.ch.items.indexOf(item) + 1} of ${step.ch.items.length}</p>`
    : `<p class="kicker">${esc(step.ch.title)}${item.required ? "" : " · optional"}</p>`;
  el.innerHTML = head + (item.type === "quiz" ? "" : `<h2 class="q" id="qh">${esc(item.prompt)}</h2>${item.help ? `<p class="help">${esc(item.help)}</p>` : ""}`);
  const body = document.createElement("div");
  el.appendChild(body);
  const T = { single: qSingle, scale: qScale, multi: qMulti, rank: qRank, thisthat: qThisThat, slider: qSlider, quiz: qQuiz, country: qCountry, text: qText, email: qText, longtext: qText, toggle: qToggle }[item.type];
  const api = T(body, item, step) || {};
  const auto = api.auto;

  el.insertAdjacentHTML("beforeend", continueBtn(item.type === "longtext" && !state.answers[item.id] ? "Skip for now" : "Continue"));
  const btn = el.querySelector("[data-continue]");
  const err = el.querySelector(".error");
  const refresh = () => {
    btn.disabled = !valid(item);
    if (item.type === "longtext") btn.firstChild.textContent = state.answers[item.id] ? "Continue " : "Skip for now ";
    if (isLastQuestion(step)) btn.firstChild.textContent = "See my profile ";
  };
  api.onChange = () => {
    err.textContent = "";
    refresh();
    save();
    if (auto && valid(item) && !needsOther(item)) {
      clearTimeout(advanceTimer);
      advanceTimer = setTimeout(next, 420);
    }
  };
  if (api.bind) api.bind(api.onChange);
  refresh();
  btn.onclick = () => {
    const problem = invalidReason(item);
    if (problem) { err.textContent = problem; return; }
    next();
  };
}

function isLastQuestion(step) {
  const steps = buildSteps();
  return steps[indexOf(steps, step.key) + 1]?.kind === "results";
}

function needsOther(item) {
  const v = state.answers[item.id];
  const otherOpt = (item.options || []).find((o) => o.other);
  if (!otherOpt) return false;
  const picked = Array.isArray(v) ? v.includes(otherOpt.v) : v === otherOpt.v;
  return picked;
}

function valid(item) {
  return !invalidReason(item);
}

function invalidReason(item) {
  const v = state.answers[item.id];
  if (item.type === "email" && v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return "That email doesn't look quite right.";
  if (!item.required) return "";
  if (v === undefined || v === "" || (Array.isArray(v) && v.length === 0)) return "Pick an answer to continue.";
  if (item.type === "rank" && v.length < Math.min(item.max, item.options.length)) return `Pick your top ${item.max}.`;
  if (needsOther(item) && !(state.other[item.id] || "").trim()) return "Tell us a little more in the box.";
  return "";
}

function otherField(container, item) {
  const wrap = document.createElement("div");
  wrap.className = "other-input";
  wrap.innerHTML = `<input class="input" type="text" maxlength="200" placeholder="Tell us more…" aria-label="Other, please specify">`;
  const input = wrap.querySelector("input");
  input.value = state.other[item.id] || "";
  container.appendChild(wrap);
  const sync = () => { wrap.hidden = !needsOther(item); };
  sync();
  return { input, sync };
}

function qSingle(body, item) {
  const compact = item.compact;
  body.innerHTML = `<div class="opts ${compact ? "compact" : ""}" role="radiogroup" aria-labelledby="qh">${item.options.map((o, i) => `
    <button class="opt" role="radio" data-key="${i + 1}" data-v="${esc(o.v)}" aria-checked="${state.answers[item.id] === o.v}">
      ${o.i ? `<span class="ic" aria-hidden="true">${o.i}</span>` : `<span class="num" aria-hidden="true">${i + 1}</span>`}
      <span class="txt">${esc(o.l)}</span>
    </button>`).join("")}</div>`;
  const other = otherField(body, item);
  return {
    auto: true,
    bind(onChange) {
      body.querySelectorAll(".opt").forEach((b, i) => b.onclick = () => {
        state.answers[item.id] = item.options[i].v;
        body.querySelectorAll(".opt").forEach((x) => x.setAttribute("aria-checked", x === b));
        b.classList.remove("pop"); void b.offsetWidth; b.classList.add("pop");
        other.sync();
        if (needsOther(item)) other.input.focus();
        onChange();
      });
      other.input.oninput = () => { state.other[item.id] = other.input.value; onChange(); };
    },
  };
}

function qScale(body, item) {
  const cur = state.answers[item.id];
  body.innerHTML = `<div class="scale" role="radiogroup" aria-labelledby="qh">${item.options.map((o, i) => `
    <button class="opt" role="radio" data-key="${i + 1}" aria-checked="${cur === o.v}" aria-label="${esc(o.l || String(o.v))}">
      <span class="ic" aria-hidden="true">${o.i || o.v}</span><span class="txt">${esc(o.l)}</span>
    </button>`).join("")}</div>
    ${item.allowSkipValue ? `<div class="skipval"><button class="chip" data-skip aria-pressed="${cur === item.allowSkipValue.v}">${esc(item.allowSkipValue.l)}</button></div>` : ""}`;
  return {
    auto: true,
    bind(onChange) {
      const all = [...body.querySelectorAll(".opt")];
      const skip = body.querySelector("[data-skip]");
      all.forEach((b, i) => b.onclick = () => {
        state.answers[item.id] = item.options[i].v;
        all.forEach((x) => x.setAttribute("aria-checked", x === b));
        if (skip) skip.setAttribute("aria-pressed", "false");
        onChange();
      });
      if (skip) skip.onclick = () => {
        state.answers[item.id] = item.allowSkipValue.v;
        all.forEach((x) => x.setAttribute("aria-checked", "false"));
        skip.setAttribute("aria-pressed", "true");
        onChange();
      };
    },
  };
}

function qMulti(body, item) {
  const cur = () => state.answers[item.id] || [];
  const ex = item.exclusive || [];
  body.innerHTML = `<div class="chips" role="group" aria-labelledby="qh">${item.options.map((o, i) => `
    <button class="chip" data-key="${i + 1}" aria-pressed="${cur().includes(o.v)}" ${o.tip ? `data-tip="${esc(o.tip)}"` : ""}>
      ${esc(o.l)}${o.tip ? ` <span class="tipbtn" aria-hidden="true">ⓘ</span>` : ""}
    </button>`).join("")}</div>`;
  const other = otherField(body, item);
  const chips = [...body.querySelectorAll(".chip")];
  const paint = () => {
    const sel = cur();
    const full = item.max && sel.length >= item.max;
    chips.forEach((c, i) => {
      const on = sel.includes(item.options[i].v);
      c.setAttribute("aria-pressed", on);
      c.disabled = !!(full && !on);
    });
    other.sync();
  };
  paint();
  tooltips(body);
  return {
    bind(onChange) {
      chips.forEach((c, i) => c.onclick = (e) => {
        if (e.target.classList.contains("tipbtn")) return;
        const v = item.options[i].v;
        let sel = [...cur()];
        if (sel.includes(v)) sel = sel.filter((x) => x !== v);
        else if (ex.includes(v)) sel = [v];
        else sel = [...sel.filter((x) => !ex.includes(x)), v];
        state.answers[item.id] = sel;
        paint();
        if (needsOther(item) && v === "other" && sel.includes(v)) other.input.focus();
        onChange();
      });
      other.input.oninput = () => { state.other[item.id] = other.input.value; onChange(); };
    },
  };
}

function tooltips(root) {
  let tip;
  const show = (el) => {
    hide();
    tip = document.createElement("div");
    tip.className = "tooltip";
    tip.setAttribute("role", "tooltip");
    tip.textContent = el.dataset.tip;
    document.body.appendChild(tip);
    const r = el.getBoundingClientRect();
    const t = tip.getBoundingClientRect();
    let left = Math.min(window.innerWidth - t.width - 10, Math.max(10, r.left + r.width / 2 - t.width / 2));
    let top = r.top - t.height - 10;
    if (top < 10) top = r.bottom + 10;
    tip.style.left = left + "px";
    tip.style.top = top + "px";
  };
  const hide = () => { tip?.remove(); tip = null; };
  root.querySelectorAll("[data-tip]").forEach((el) => {
    el.addEventListener("mouseenter", () => show(el));
    el.addEventListener("mouseleave", hide);
    el.addEventListener("focus", () => show(el));
    el.addEventListener("blur", hide);
    el.querySelector(".tipbtn")?.addEventListener("click", (e) => {
      e.stopPropagation();
      show(el);
      setTimeout(hide, 3500);
    });
  });
  window.addEventListener("scroll", hide, { passive: true, once: true });
}

function qRank(body, item) {
  const cur = () => state.answers[item.id] || [];
  const label = (v) => item.options.find((o) => o.v === v);
  body.innerHTML = `<div class="rank-slots" aria-label="Your ranking"></div><div class="opts rank-opts" role="group" aria-labelledby="qh"></div>`;
  const slots = body.querySelector(".rank-slots");
  const opts = body.querySelector(".rank-opts");
  opts.innerHTML = item.options.map((o, i) => `
    <button class="opt" data-key="${i + 1}" data-v="${esc(o.v)}">
      <span class="ic" aria-hidden="true">${o.i || ""}</span><span class="txt">${esc(o.l)}</span>
    </button>`).join("");
  const other = otherField(body, item);
  let onChange = () => {};
  let dragFrom = null;

  const set = (arr) => { state.answers[item.id] = arr; paint(); other.sync(); onChange(); };
  const paint = () => {
    const sel = cur();
    slots.innerHTML = Array.from({ length: item.max }, (_, n) => {
      const v = sel[n];
      const o = v && label(v);
      return o
        ? `<div class="slot filled" draggable="true" data-n="${n}"><span class="medal">${n + 1}</span><span>${o.i || ""} ${esc(o.l)}</span><button class="x" data-rm="${n}" aria-label="Remove ${esc(o.l)} from rank ${n + 1}">✕</button></div>`
        : `<div class="slot" data-n="${n}"><span class="medal">${n + 1}</span><span>${n === sel.length ? "Tap an option below" : "…"}</span></div>`;
    }).join("");
    opts.querySelectorAll(".opt").forEach((b) => {
      const n = sel.indexOf(b.dataset.v);
      b.setAttribute("aria-pressed", n >= 0);
      b.querySelector(".rk")?.remove();
      if (n >= 0) b.insertAdjacentHTML("beforeend", `<span class="rk" aria-label="Rank ${n + 1}">${n + 1}</span>`);
    });
    slots.querySelectorAll("[data-rm]").forEach((x) => x.onclick = () => set(cur().filter((_, i) => i !== Number(x.dataset.rm))));
    // Drag to reorder within the ranking (desktop). Tap order is the primary interaction.
    slots.querySelectorAll(".slot.filled").forEach((s) => {
      s.ondragstart = (e) => { dragFrom = Number(s.dataset.n); e.dataTransfer.effectAllowed = "move"; };
      s.ondragover = (e) => { e.preventDefault(); s.classList.add("over"); };
      s.ondragleave = () => s.classList.remove("over");
      s.ondrop = (e) => {
        e.preventDefault();
        const to = Number(s.dataset.n);
        if (dragFrom == null || dragFrom === to) return;
        const arr = [...cur()];
        [arr[dragFrom], arr[to]] = [arr[to], arr[dragFrom]];
        dragFrom = null;
        set(arr);
      };
    });
  };
  paint();
  return {
    bind(cb) {
      onChange = cb;
      opts.querySelectorAll(".opt").forEach((b) => b.onclick = () => {
        const v = b.dataset.v;
        const sel = cur();
        if (sel.includes(v)) return set(sel.filter((x) => x !== v));
        if (sel.length >= item.max) {
          b.classList.remove("pop"); void b.offsetWidth; b.classList.add("pop");
          body.closest(".screen").querySelector(".error").textContent = `You've picked ${item.max}. Remove one to swap it out.`;
          return;
        }
        set([...sel, v]);
        if (v === "other") other.input.focus();
      });
      other.input.oninput = () => { state.other[item.id] = other.input.value; onChange(); };
    },
  };
}

function qThisThat(body, item) {
  const [a, b] = item.options;
  const cur = state.answers[item.id];
  body.innerHTML = `
    <div class="tt" role="radiogroup" aria-labelledby="qh">
      <button class="opt" role="radio" data-key="1" aria-checked="${cur === a.v}"><span class="ic" aria-hidden="true">${a.i}</span><span class="txt">${esc(a.l)}</span></button>
      <span class="or" aria-hidden="true">OR</span>
      <button class="opt" role="radio" data-key="2" aria-checked="${cur === b.v}"><span class="ic" aria-hidden="true">${b.i}</span><span class="txt">${esc(b.l)}</span></button>
    </div>
    <p class="swipe-hint">Tap a card to choose.</p>
    <div class="tt-alt"><button class="chip" data-key="3" data-alt aria-pressed="${cur === "undecided"}">Somewhere in between</button></div>`;
  return {
    auto: true,
    bind(onChange) {
      const btns = [...body.querySelectorAll(".tt .opt")];
      const alt = body.querySelector("[data-alt]");
      const pick = (v) => {
        state.answers[item.id] = v;
        btns.forEach((x, i) => x.setAttribute("aria-checked", item.options[i].v === v));
        alt.setAttribute("aria-pressed", v === "undecided");
        onChange();
      };
      btns.forEach((x, i) => x.onclick = () => pick(item.options[i].v));
      alt.onclick = () => pick("undecided");
    },
  };
}

function qSlider(body, item) {
  const v0 = state.answers[item.id] ?? item.default;
  body.innerHTML = `
    <div class="slider-wrap">
      <div class="slider-face" aria-hidden="true"><span class="big"></span><span class="ic"></span><span class="band"></span></div>
      <input type="range" min="${item.min}" max="${item.max}" step="1" value="${v0}" aria-labelledby="qh">
      <div class="ticks">${Array.from({ length: item.max - item.min + 1 }, (_, i) => `<span>${item.min + i}</span>`).join("")}</div>
    </div>`;
  const range = body.querySelector("input");
  const face = body.querySelector(".slider-face");
  const draw = () => {
    const v = Number(range.value);
    const band = item.bands.find((b) => v <= b.max);
    face.querySelector(".big").textContent = v;
    face.querySelector(".ic").textContent = band.i;
    face.querySelector(".band").textContent = band.l;
    range.style.setProperty("--pct", ((v - item.min) / (item.max - item.min)) * 100 + "%");
    range.setAttribute("aria-valuetext", `${v}, ${band.l}`);
  };
  draw();
  if (state.answers[item.id] === undefined) state.answers[item.id] = Number(v0);
  return {
    bind(onChange) {
      range.oninput = () => { state.answers[item.id] = Number(range.value); draw(); onChange(); };
    },
  };
}

function qQuiz(body, item, step) {
  const ids = step.ch.items.map((i) => i.id);
  const done = state.quiz[item.id];
  body.innerHTML = `
    <div class="quiz">
      <div class="score-pips" aria-hidden="true">${ids.map((id) => {
        const q = state.quiz[id];
        return `<i class="${q ? (q.correct ? "hit" : "miss") : id === item.id ? "now" : ""}"></i>`;
      }).join("")}</div>
      <h2 class="q statement" id="qh">${esc(item.prompt)}</h2>
      <div class="quiz-btns" role="radiogroup" aria-labelledby="qh">
        <button class="opt" role="radio" data-key="1" data-a="true">✅ True</button>
        <button class="opt" role="radio" data-key="2" data-a="false">❌ False</button>
        <button class="opt" role="radio" data-key="3" data-a="unsure">🤷 Not sure</button>
      </div>
      <div class="reveal-slot" aria-live="polite"></div>
    </div>`;
  const btns = [...body.querySelectorAll(".quiz-btns .opt")];
  const reveal = () => {
    const q = state.quiz[item.id];
    btns.forEach((b) => {
      b.setAttribute("aria-checked", b.dataset.a === q.a);
      b.disabled = true;
      if (b.dataset.a === item.answer) b.classList.add("correct");
      else if (b.dataset.a === q.a) b.classList.add("wrong");
    });
    const head = q.correct ? "Correct! 🎉" : q.a === "unsure" ? "Good to know 👇" : "Not quite 👇";
    body.querySelector(".reveal-slot").innerHTML = `<div class="reveal ${q.correct ? "" : "miss"}"><strong>${head}</strong><p style="margin:6px 0 0">${esc(item.explain)}</p>${flag(item.flag)}</div>`;
    const pip = body.querySelectorAll(".score-pips i")[ids.indexOf(item.id)];
    pip.className = q.correct ? "hit" : "miss";
  };
  if (done) reveal();
  return {
    bind(onChange) {
      btns.forEach((b) => b.onclick = () => {
        if (state.quiz[item.id]) return;
        const a = b.dataset.a;
        state.quiz[item.id] = { a, correct: a === item.answer };
        state.answers[item.id] = a;
        reveal();
        onChange();
        body.closest(".screen").querySelector("[data-continue]").focus();
      });
    },
  };
}

function qCountry(body, item) {
  const cur = state.answers[item.id] || "";
  body.innerHTML = `
    <div class="field"><select aria-labelledby="qh"><option value="">Choose your country…</option>${COUNTRIES.map((c) => `<option ${c === cur ? "selected" : ""}>${esc(c)}</option>`).join("")}</select></div>
    <div class="field"><input class="input" type="text" maxlength="80" placeholder="City or state (optional)" aria-label="City or state, optional" autocomplete="address-level2"></div>`;
  const sel = body.querySelector("select");
  const city = body.querySelector("input");
  city.value = state.other[item.id + "_city"] || "";
  return {
    bind(onChange) {
      sel.onchange = () => { state.answers[item.id] = sel.value; onChange(); };
      city.oninput = () => { state.other[item.id + "_city"] = city.value; save(); };
    },
  };
}

function qText(body, item) {
  const isLong = item.type === "longtext";
  body.innerHTML = `<div class="field">${isLong
    ? `<textarea maxlength="2000" aria-labelledby="qh" placeholder="${esc(item.placeholder || "")}"></textarea>`
    : `<input class="input" type="${item.type === "email" ? "email" : "text"}" maxlength="120" aria-labelledby="qh" placeholder="${esc(item.placeholder || "")}" autocomplete="${esc(item.autocomplete || "off")}">`}</div>`;
  const input = body.querySelector("input, textarea");
  input.value = state.answers[item.id] || "";
  setTimeout(() => input.focus({ preventScroll: true }), 350);
  return {
    bind(onChange) {
      input.oninput = () => {
        const v = input.value.trim();
        if (v) state.answers[item.id] = input.value; else delete state.answers[item.id];
        onChange();
      };
    },
  };
}

function qToggle(body, item) {
  const cur = state.answers[item.id];
  body.innerHTML = `<div class="toggle" role="radiogroup" aria-labelledby="qh">
    <button class="opt" role="radio" data-key="1" aria-checked="${cur === "yes"}"><span class="ic" aria-hidden="true">👍</span><span class="txt">Yes</span></button>
    <button class="opt" role="radio" data-key="2" aria-checked="${cur === "no"}"><span class="ic" aria-hidden="true">👋</span><span class="txt">No thanks</span></button>
  </div>`;
  return {
    bind(onChange) {
      const btns = [...body.querySelectorAll(".opt")];
      btns.forEach((b, i) => b.onclick = () => {
        state.answers[item.id] = i === 0 ? "yes" : "no";
        btns.forEach((x) => x.setAttribute("aria-checked", x === b));
        onChange();
      });
    },
  };
}

// ---------- Keyboard ----------
document.addEventListener("keydown", (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const tag = e.target.tagName;
  const typing = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
  const screen = $app.firstElementChild;
  if (!screen) return;
  if (e.key === "Enter") {
    if (tag === "TEXTAREA" || (tag === "BUTTON" && !e.target.hasAttribute("data-continue")) || e.target.type === "checkbox") return;
    const btn = screen.querySelector("[data-continue]");
    if (btn && !btn.disabled) { e.preventDefault(); btn.click(); }
    return;
  }
  if (typing) return;
  if (/^[1-9]$/.test(e.key)) {
    const target = screen.querySelector(`[data-key="${e.key}"]`);
    if (target && !target.disabled) { e.preventDefault(); target.click(); target.focus(); }
  }
});

// ---------- Boot ----------
async function boot() {
  startBackground(document.getElementById("bg"));
  CONFIG = await fetch("/data/questions.json").then((r) => r.json());
  state = loadState() || freshState();
  if (params.get("src") && !state.meta.src) state.meta.src = params.get("src");
  // Returning visitors land on the welcome screen with a "pick up where you left off" option.
  if (!state.done && state.step !== "welcome") { state._resumeStep = state.step; state.step = "welcome"; }
  flushPending();
  render();
}

boot().catch((err) => {
  console.error(err);
  $app.innerHTML = `<section class="screen"><h2 class="q">Something went wrong loading the survey.</h2><p class="help">Please refresh the page.</p></section>`;
});
