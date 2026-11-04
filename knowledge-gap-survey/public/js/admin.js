// Admin dashboard: live charts per question, filters, drop-off and CSV export.
import { DIM_LABELS, ARCHETYPES } from "./scoring.js";

const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const KEY = "kg-admin-key";
const root = $("#admin");
const tip = $("#tip");

let CONFIG, DATA = [], CONTACTS = [];
const filters = { Q1: "", Q2: "", Q3: "", Q5: "", completed: true };

async function api(key, contacts = false) {
  const r = await fetch(`/api/responses${contacts ? "?contacts=1" : ""}`, { headers: { "x-admin-key": key } });
  if (r.status === 401) throw new Error("Wrong password");
  if (!r.ok) throw new Error(`Error ${r.status}`);
  return r.json();
}

function login(msg = "") {
  root.innerHTML = `
    <div class="login">
      <p class="kicker">The Knowledge Gap</p>
      <h1>Admin dashboard</h1>
      <form style="margin-top:24px">
        <input class="input" type="password" placeholder="Password" aria-label="Admin password" autocomplete="current-password" required>
        <div class="actions" style="margin-top:16px"><button class="btn">Sign in →</button></div>
        <div class="error" role="alert">${esc(msg)}</div>
      </form>
    </div>`;
  $("form", root).onsubmit = async (e) => {
    e.preventDefault();
    const key = $("input", root).value;
    try { await load(key); sessionStorage.setItem(KEY, key); } catch (err) { login(err.message); }
  };
}

async function load(key) {
  const [cfg, data] = await Promise.all([CONFIG || fetch("/data/questions.json").then((r) => r.json()), api(key, true)]);
  CONFIG = cfg;
  DATA = data.responses.sort((a, b) => (a.firstSeen < b.firstSeen ? 1 : -1));
  CONTACTS = data.contacts || [];
  draw();
}

const items = () => CONFIG.chapters.filter((c) => !c.contact).flatMap((c) => c.items.map((i) => ({ ...i, chapter: c.title })));
const optLabel = (item, v) => (item.options || []).find((o) => String(o.v) === String(v))?.l || (v === "undecided" ? "Somewhere in between" : v === "dk" ? "Don't know" : String(v));

function filtered() {
  return DATA.filter((r) => {
    if (filters.completed && !r.completed) return false;
    for (const k of ["Q1", "Q2", "Q3", "Q5"]) if (filters[k] && r.answers?.[k] !== filters[k]) return false;
    return true;
  });
}

function draw() {
  const rows = filtered();
  const all = DATA.length;
  const done = DATA.filter((r) => r.completed).length;
  const completedRows = rows.filter((r) => r.scores);
  const avg = (f) => (completedRows.length ? Math.round(completedRows.reduce((s, r) => s + (f(r) || 0), 0) / completedRows.length) : "–");
  const avgQuiz = completedRows.length ? (completedRows.reduce((s, r) => s + (r.scores.quiz || 0), 0) / completedRows.length).toFixed(1) : "–";

  const filterSelect = (id, label) => {
    const item = items().find((i) => i.id === id);
    const vals = [...new Set(DATA.map((r) => r.answers?.[id]).filter(Boolean))].sort();
    return `<select data-f="${id}" aria-label="Filter by ${label}"><option value="">All ${label}</option>${vals.map((v) => `<option value="${esc(v)}" ${filters[id] === v ? "selected" : ""}>${esc(item.options ? optLabel(item, v) : v)}</option>`).join("")}</select>`;
  };

  root.innerHTML = `
    <p class="kicker">The Knowledge Gap</p>
    <h1>Survey dashboard</h1>
    <div class="bar">
      ${filterSelect("Q1", "roles")}${filterSelect("Q2", "industries")}${filterSelect("Q3", "sizes")}${filterSelect("Q5", "countries")}
      <label class="tg"><input type="checkbox" data-done ${filters.completed ? "checked" : ""}> Completed only</label>
      <span class="spacer"></span>
      <button class="btn ghost" data-refresh>↻ Refresh</button>
      <button class="btn" data-csv>Export responses CSV</button>
      <button class="btn ghost" data-ccsv>Export contacts CSV</button>
    </div>

    <div class="tiles">
      ${tile(all, "Started")}${tile(done, "Completed")}${tile(all ? Math.round((done / all) * 100) + "%" : "–", "Completion rate")}
      ${tile(rows.length, "In current filter")}${tile(avgQuiz, "Avg Quick 6 score")}${tile(avg((r) => r.scores.gapIndex), "Avg knowledge gap index")}
      ${tile(CONTACTS.length, "Contacts left")}${tile(CONTACTS.filter((c) => c.interview === "yes").length, "Interview opt-ins")}
    </div>

    <p class="sect">Funnel & profile</p>
    <div class="charts">
      ${chart("Chapter reach (all starts)", "Respondents who reached each chapter", dropoff())}
      ${chart("Average dimension scores", `${completedRows.length} completed responses`, Object.keys(DIM_LABELS).map((k) => ({ l: DIM_LABELS[k], n: avg((r) => r.scores.dims[k]), pct: avg((r) => r.scores.dims[k]), unit: "" })))}
      ${chart("Archetypes", "Readiness profile types", countBy(completedRows.map((r) => ARCHETYPES[r.scores.archetype]?.name || r.scores.archetype), completedRows.length))}
      ${chart("Traffic sources (?src=)", "Distribution channel", countBy(rows.map((r) => r.meta?.src || "(direct)"), rows.length))}
    </div>

    ${CONFIG.chapters.filter((c) => !c.contact).map((c) => `
      <p class="sect">${esc(c.icon)} ${esc(c.title)}</p>
      <div class="charts">${c.items.map((item) => questionChart(item, rows)).join("")}</div>`).join("")}
  `;
  bind();
  hover();
}

const tile = (n, l) => `<div class="tile"><div class="n">${esc(n)}</div><div class="l">${esc(l)}</div></div>`;

function chart(title, sub, data) {
  if (!data.length) return `<div class="chart"><h3>${esc(title)}</h3><p class="empty">No data yet.</p></div>`;
  return `<div class="chart"><h3>${esc(title)}</h3><div class="sub">${esc(sub)}</div>
    <div class="hb">${data.map((d) => `<div class="row" data-tip="${esc(d.l)}: ${esc(d.n)}${d.unit ?? ""}${d.unit === undefined ? ` (${d.pct}%)` : ""}">
      <span class="lab" title="${esc(d.l)}">${esc(d.l)}</span><span class="trk"><i style="width:${d.pct}%"></i></span><span class="v">${d.unit === undefined ? d.pct + "%" : esc(d.n)}</span>
    </div>`).join("")}</div></div>`;
}

function countBy(values, base) {
  const m = new Map();
  values.forEach((v) => m.set(v, (m.get(v) || 0) + 1));
  return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([l, n]) => ({ l, n, pct: base ? Math.round((n / base) * 100) : 0 }));
}

function dropoff() {
  const order = CONFIG.chapters.map((c) => c.id);
  return CONFIG.chapters.map((c, i) => {
    const n = DATA.filter((r) => r.completed || order.indexOf(r.meta?.furthestChapter) >= i).length;
    return { l: `${i + 1}. ${c.title}`, n, pct: DATA.length ? Math.round((n / DATA.length) * 100) : 0 };
  });
}

function questionChart(item, rows) {
  const answered = rows.filter((r) => {
    const v = item.type === "quiz" ? r.quiz?.[item.id] : r.answers?.[item.id];
    return v !== undefined && v !== "" && !(Array.isArray(v) && !v.length);
  });
  const title = `${item.id}. ${item.prompt}`;
  if (item.type === "longtext") {
    return `<div class="chart" style="grid-column:1/-1"><h3>${esc(title)}</h3><div class="sub">${answered.length} answers</div>
      <div class="texts">${answered.map((r) => `<blockquote>${esc(r.answers[item.id])}</blockquote>`).join("") || `<p class="empty">No answers yet.</p>`}</div></div>`;
  }
  const n = answered.length;
  let data;
  if (item.type === "quiz") {
    const vals = answered.map((r) => r.quiz[item.id]);
    data = ["true", "false", "unsure"].map((v) => {
      const c = vals.filter((x) => x === v).length;
      return { l: (v === "unsure" ? "Not sure" : v === "true" ? "True" : "False") + (v === item.answer ? " ✓ correct" : ""), n: c, pct: n ? Math.round((c / n) * 100) : 0 };
    });
  } else if (item.type === "rank") {
    // Weighted: 1st = 3 points, 2nd = 2, 3rd = 1. Bar shows share of respondents ranking it anywhere in top 3.
    const pts = new Map(), any = new Map();
    answered.forEach((r) => r.answers[item.id].forEach((v, i) => { pts.set(v, (pts.get(v) || 0) + (item.max - i)); any.set(v, (any.get(v) || 0) + 1); }));
    data = [...pts.entries()].sort((a, b) => b[1] - a[1]).map(([v, p]) => ({ l: optLabel(item, v), n: `${any.get(v)} in top ${item.max}, ${p} pts`, pct: n ? Math.round((any.get(v) / n) * 100) : 0, unit: undefined }));
  } else if (item.type === "slider") {
    data = Array.from({ length: item.max - item.min + 1 }, (_, i) => {
      const v = item.min + i;
      const c = answered.filter((r) => Number(r.answers[item.id]) === v).length;
      return { l: String(v), n: c, pct: n ? Math.round((c / n) * 100) : 0 };
    });
  } else if (item.type === "country") {
    data = countBy(answered.map((r) => r.answers[item.id]), n).slice(0, 12);
  } else {
    // Show every option (including zero counts) in questionnaire order.
    const flat = answered.flatMap((r) => [].concat(r.answers[item.id]).map(String));
    const opts = (item.options || []).map((o) => String(o.v));
    if (item.type === "thisthat") opts.push("undecided");
    if (item.allowSkipValue) opts.push(String(item.allowSkipValue.v));
    data = opts.map((v) => {
      const c = flat.filter((x) => x === v).length;
      return { l: optLabel(item, v), n: c, pct: n ? Math.round((c / n) * 100) : 0 };
    });
  }
  const sub = `${n} answered${item.type === "multi" ? " · multi-select, % of respondents" : ""}${item.type === "rank" ? " · % ranking it in top 3" : ""}`;
  return chart(title, sub, data);
}

function hover() {
  root.querySelectorAll("[data-tip]").forEach((el) => {
    el.addEventListener("mousemove", (e) => {
      tip.hidden = false;
      tip.textContent = el.dataset.tip;
      tip.style.left = Math.min(innerWidth - 300, e.clientX + 14) + "px";
      tip.style.top = e.clientY + 14 + "px";
    });
    el.addEventListener("mouseleave", () => { tip.hidden = true; });
  });
}

function bind() {
  root.querySelectorAll("[data-f]").forEach((s) => s.onchange = () => { filters[s.dataset.f] = s.value; draw(); });
  $("[data-done]", root).onchange = (e) => { filters.completed = e.target.checked; draw(); };
  $("[data-refresh]", root).onclick = () => load(sessionStorage.getItem(KEY)).catch((e) => login(e.message));
  $("[data-csv]", root).onclick = exportResponses;
  $("[data-ccsv]", root).onclick = exportContacts;
}

const cell = (v) => {
  const s = Array.isArray(v) ? v.join(";") : v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

function download(name, rows) {
  const blob = new Blob(["﻿" + rows.map((r) => r.map(cell).join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
}

function exportResponses() {
  const qs = items();
  const otherCols = qs.filter((i) => (i.options || []).some((o) => o.other)).map((i) => i.id);
  const head = ["respondent_id", "completed", "first_seen", "received_at", "source", "device", "furthest_chapter",
    ...qs.map((i) => i.id), ...otherCols.map((id) => `${id}_other`), "Q5_city",
    "score_tech", "score_assets", "score_regulation", "score_readiness", "quiz_score", "self_rated", "gap_index", "archetype",
    ...CONFIG.chapters.map((c) => `secs_${c.id}`)];
  const rows = filtered().map((r) => [
    r.id, r.completed, r.firstSeen, r.receivedAt, r.meta?.src, r.meta?.device, r.meta?.furthestChapter,
    ...qs.map((i) => (i.type === "quiz" ? r.quiz?.[i.id] : r.answers?.[i.id])),
    ...otherCols.map((id) => r.other?.[id]), r.other?.Q5_city,
    r.scores?.dims?.tech, r.scores?.dims?.assets, r.scores?.dims?.regulation, r.scores?.dims?.readiness,
    r.scores?.quiz, r.scores?.selfRated, r.scores?.gapIndex, r.scores?.archetype,
    ...CONFIG.chapters.map((c) => r.meta?.chapterSeconds?.[c.id]),
  ]);
  download(`knowledge-gap-responses-${new Date().toISOString().slice(0, 10)}.csv`, [head, ...rows]);
}

function exportContacts() {
  const head = ["name", "email", "wants_updates", "interview_ok", "saved_at"];
  download(`knowledge-gap-contacts-${new Date().toISOString().slice(0, 10)}.csv`, [head, ...CONTACTS.map((c) => [c.name, c.email, c.updates, c.interview, c.savedAt])]);
}

const saved = sessionStorage.getItem(KEY);
if (saved) load(saved).catch(() => login()); else login();
