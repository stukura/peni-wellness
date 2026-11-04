// Receives survey responses (partial and complete) and stores them in Netlify Blobs.
// Answers and contact details are written to separate stores, linked only by the random respondent id.
import { getStore } from "@netlify/blobs";

const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const MAX_BODY = 60_000;

// Keep only short strings, numbers and small arrays; drop anything else.
function clean(v, depth = 0) {
  if (typeof v === "string") return v.slice(0, 2000);
  if (typeof v === "number" || typeof v === "boolean") return v;
  if (Array.isArray(v)) return v.slice(0, 20).map((x) => clean(x, depth + 1)).filter((x) => x !== undefined);
  if (v && typeof v === "object" && depth < 3) {
    const out = {};
    for (const [k, x] of Object.entries(v).slice(0, 80)) {
      if (/^[\w-]{1,40}$/.test(k)) out[k] = clean(x, depth + 1);
    }
    return out;
  }
  return undefined;
}

export default async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const text = await req.text();
  if (text.length > MAX_BODY) return json({ error: "Too large" }, 413);

  let b;
  try { b = JSON.parse(text); } catch { return json({ error: "Bad JSON" }, 400); }
  if (!b || typeof b.id !== "string" || !/^[\w-]{8,64}$/.test(b.id)) return json({ error: "Bad id" }, 400);
  // Honeypot: bots fill hidden fields. Pretend success, store nothing.
  if (b.hp) return json({ ok: true });

  const responses = getStore({ name: "responses", consistency: "strong" });
  const contacts = getStore({ name: "contacts", consistency: "strong" });
  const now = new Date().toISOString();

  const saveContact = async (c) => {
    const contact = clean(c || {});
    const email = typeof contact.Q38 === "string" ? contact.Q38.trim() : "";
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
    if (!contact.Q37 && !email) return;
    await contacts.setJSON(b.id, {
      name: contact.Q37 || "",
      email,
      updates: contact.Q39 || "",
      interview: contact.Q40 || "",
      savedAt: now,
    });
  };

  if (b.type === "contact") {
    await saveContact(b.contact);
    return json({ ok: true });
  }

  const existing = await responses.get(b.id, { type: "json" });
  // Never let a late partial save overwrite a completed response.
  if (existing?.completed && !b.completed) return json({ ok: true });

  await responses.setJSON(b.id, {
    id: b.id,
    completed: !!b.completed,
    answers: clean(b.answers || {}),
    other: clean(b.other || {}),
    quiz: clean(b.quiz || {}),
    scores: clean(b.scores || null),
    meta: clean(b.meta || {}),
    firstSeen: existing?.firstSeen || now,
    receivedAt: now,
  });
  if (b.completed) await saveContact(b.contact);

  return json({ ok: true });
};

export const config = { path: "/api/submit" };
