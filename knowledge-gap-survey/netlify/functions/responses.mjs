// Admin-only: returns all stored responses (and contacts on request).
// Protected by the ADMIN_PASSWORD environment variable, sent as the x-admin-key header.
import { getStore } from "@netlify/blobs";
import { timingSafeEqual, createHash } from "node:crypto";

const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
const hash = (s) => createHash("sha256").update(String(s)).digest();

async function readAll(store) {
  const { blobs } = await store.list();
  const out = [];
  for (let i = 0; i < blobs.length; i += 25) {
    const batch = await Promise.all(blobs.slice(i, i + 25).map((b) => store.get(b.key, { type: "json" })));
    out.push(...batch.filter(Boolean));
  }
  return out;
}

export default async (req) => {
  const expected = Netlify.env.get("ADMIN_PASSWORD");
  if (!expected) return json({ error: "ADMIN_PASSWORD is not configured" }, 500);
  const given = req.headers.get("x-admin-key") || "";
  if (!timingSafeEqual(hash(given), hash(expected))) {
    await new Promise((r) => setTimeout(r, 600));
    return json({ error: "Unauthorised" }, 401);
  }

  const url = new URL(req.url);
  const responses = await readAll(getStore({ name: "responses", consistency: "strong" }));
  const body = { responses };
  if (url.searchParams.get("contacts") === "1") {
    const contacts = await readAll(getStore({ name: "contacts", consistency: "strong" }));
    body.contacts = contacts;
  }
  return json(body);
};

export const config = { path: "/api/responses" };
