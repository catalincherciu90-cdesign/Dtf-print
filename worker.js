// ===========================================================
// MrDTF — Cloudflare Worker
// Site static + API CMS (conținut) + API Comenzi.
//
// Bindings (vezi wrangler.jsonc):
//   ASSETS   – static assets (site-ul)
//   CONTENT  – KV namespace: conținut ("home"), comenzi ("order:*"),
//              fișiere design ("orderfile:*", max 20 MB, stocate ca bytes)
// Secrets:
//   ADMIN_PASSWORD – parola de login în /admin
//   JWT_SECRET     – cheie pentru semnarea token-ului
// ===========================================================

const KV_KEY = "home";
const ORDER_PREFIX = "order:";
const FILE_PREFIX = "orderfile:";
const MEDIA_PREFIX = "media:";
const MAX_FILE_MB = 20;
const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;
const MAX_IMG_MB = 5;
const MAX_IMG_BYTES = MAX_IMG_MB * 1024 * 1024;
const STATUSES = ["Nouă", "În lucru", "Trimisă", "Finalizată", "Anulată"];

// ---- Conținut implicit (folosit dacă KV e gol) ----
const DEFAULT_CONTENT = {
  brandTagline: "PRINT DTF PREMIUM",
  hero: {
    line1: "PRINT", hi: "DTF", line2: "LA METRU LINIAR",
    subPre: "LĂȚIME DE", subHi: "90 CM",
    stats: ["🏷️ De la 6,50 lei/ml", "📏 Lățime 90 cm", "🚚 Livrare 24-48h"],
    checks: ["Comandă online", "Livrare rapidă", "Culori vibrante"],
    cta: "COMANDĂ ACUM",
    hint: "Încarcă fișierele în 2 minute",
  },
  pills: [
    { ico: "🛡️", title: "Culori vibrante", sub: "Calitate premium" },
    { ico: "📏", title: "Lățime 90 cm", sub: "Print la metru liniar" },
    { ico: "⚡", title: "Livrare rapidă", sub: "Termene scurte" },
    { ico: "🏅", title: "Rezistență maximă", sub: "Spălări multiple" },
  ],
  order: {
    eyebrow: "Comandă rapid și ușor",
    title: "Comandă DTF",
    desc: "Încarci designul, alegi dimensiunea și primești printul DTF la metru liniar, gata de aplicat.",
    checklist: [
      "Preț afișat la metru liniar",
      "Lățime maximă print: 60 cm",
      "Print de înaltă rezoluție",
      "Folie premium, cerneală certificată",
      "Ideal pentru textile din bumbac, poliester și mix",
    ],
    calcTitle: "Calculează prețul",
    pricePerMeter: 25,
    maxWidth: 60,
    uploadText: "Încarcă design",
    calcNote: "Upload PDF, PNG, TIFF (300dpi recomandat)",
  },
  steps: [
    { ico: "📤", title: "1. Încarcă design", sub: "Trimite fișierul tău" },
    { ico: "🖨️", title: "2. Noi printăm", sub: "Calitate premium" },
    { ico: "🔍", title: "3. Verificare", sub: "Control calitate" },
    { ico: "🚚", title: "4. Livrare rapidă", sub: "Ambalare sigură" },
  ],
  products: {
    eyebrow: "Textile și accesorii",
    title: "Produse Blank",
    desc: "Descoperă gama noastră de produse blank premium, perfecte pentru personalizare.",
    cta: "Vezi toate produsele",
    items: [
      { img: "assets/img/prod-tricou.jpg", name: "Tricouri", desc: "De la XS la 5XL" },
      { img: "assets/img/prod-hanorac.jpg", name: "Hanorace", desc: "Model unisex" },
      { img: "assets/img/prod-geanta.jpg", name: "Genți", desc: "Bumbac premium" },
      { img: "assets/img/prod-sapca.jpg", name: "Șepci", desc: "Diverse modele" },
    ],
  },
  trust: [
    { ico: "🏅", title: "Calitate garantată", sub: "Materiale și print premium" },
    { ico: "🚚", title: "Livrare rapidă", sub: "2-3 zile lucrătoare oriunde în țară" },
    { ico: "🔒", title: "Plăți securizate", sub: "Datele tale sunt în siguranță" },
    { ico: "💬", title: "Suport dedicat", sub: "Suntem aici să te ajutăm" },
  ],
  footer: {
    tagline: "Specialiști în print DTF premium la metru liniar și produse blank pentru personalizare.",
    phone: "+40 123 456 789",
    email: "contact@dtfprint.ro",
    schedule: "L–V: 09:00 – 17:00",
    copyright: "© 2024 MrDTF — Print DTF Premium. Toate drepturile rezervate.",
  },
  banners: {
    heroLeft: "assets/img/hero-prints.jpg",
    heroRight: "assets/img/hero-printer.jpg",
  },
};

// ---- Helpers HTTP ----
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,PUT,POST,PATCH,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
};
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...CORS },
  });
const err = (msg, status = 400) => json({ error: msg }, status);

// ---- JWT (HS256) ----
function b64u(buf) {
  const bytes = typeof buf === "string" ? new TextEncoder().encode(buf) : new Uint8Array(buf);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}
function b64uToStr(s) { return atob(s.replace(/-/g, "+").replace(/_/g, "/")); }
async function hmacKey(secret) {
  return crypto.subtle.importKey("raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}
async function signJWT(payload, secret, expSec = 7 * 86400) {
  const now = Math.floor(Date.now() / 1000);
  const head = b64u(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64u(JSON.stringify({ ...payload, iat: now, exp: now + expSec }));
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${head}.${body}`));
  return `${head}.${body}.${b64u(sig)}`;
}
async function verifyJWT(token, secret) {
  try {
    const [h, b, s] = token.split(".");
    if (!h || !b || !s) return null;
    const key = await hmacKey(secret);
    const data = new TextEncoder().encode(`${h}.${b}`);
    const sig = Uint8Array.from(b64uToStr(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
    if (!(await crypto.subtle.verify("HMAC", key, sig, data))) return null;
    const payload = JSON.parse(b64uToStr(b));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch { return null; }
}
function timingSafeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}
async function requireAuth(request, env) {
  if (!env.JWT_SECRET) return false;
  const token = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  return token ? !!(await verifyJWT(token, env.JWT_SECRET)) : false;
}

// ---- Content ----
async function getContent(env) {
  if (env.CONTENT) {
    try {
      const stored = await env.CONTENT.get(KV_KEY, "json");
      // merge la nivel de top — adaugă cheile noi (ex. banners) la conținutul deja salvat
      if (stored) return { ...DEFAULT_CONTENT, ...stored };
    } catch { /* fallback */ }
  }
  return DEFAULT_CONTENT;
}

// ---- Orders ----
function genId() {
  return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
}
function sanitize(name) {
  return String(name || "fisier").replace(/[^\w.\-]+/g, "_").slice(0, 80);
}
async function listOrders(env) {
  if (!env.CONTENT) return [];
  const out = [];
  let cursor;
  do {
    const res = await env.CONTENT.list({ prefix: ORDER_PREFIX, cursor });
    for (const k of res.keys) {
      const o = await env.CONTENT.get(k.name, "json");
      if (o) out.push(o);
    }
    cursor = res.list_complete ? null : res.cursor;
  } while (cursor);
  out.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  return out;
}

async function handleOrders(request, env, segs) {
  // segs: ["orders"] | ["orders", id] | ["orders", id, "file"]
  const id = segs[1];

  // POST /api/orders  — public (plasare comandă)
  if (!id && request.method === "POST") {
    if (!env.CONTENT) return err("Stocare neconfigurată.", 503);
    const ct = request.headers.get("Content-Type") || "";
    let f = {}, file = null;
    if (ct.includes("multipart/form-data")) {
      const form = await request.formData();
      form.forEach((v, k) => { if (typeof v === "string") f[k] = v; });
      const up = form.get("file");
      if (up && typeof up !== "string" && up.size > 0) file = up;
    } else {
      f = await request.json().catch(() => ({}));
    }
    if (!f.name || !f.name.trim()) return err("Numele este obligatoriu.");
    if (!f.phone && !f.email) return err("Adaugă un telefon sau un email.");

    const content = await getContent(env);
    const ppm = Number((content.order && content.order.pricePerMeter) || 25);
    const length = Math.max(0, Number(f.length) || 0);
    const width = Math.max(0, Number(f.width) || 0);

    const order = {
      id: genId(),
      createdAt: new Date().toISOString(),
      status: "Nouă",
      name: String(f.name).slice(0, 120),
      phone: String(f.phone || "").slice(0, 40),
      email: String(f.email || "").slice(0, 120),
      width, length,
      price: Number((length * ppm).toFixed(2)),
      message: String(f.message || "").slice(0, 2000),
      file: null,
    };

    if (file) {
      if (file.size > MAX_FILE_BYTES) {
        return err("Fișier prea mare (max " + MAX_FILE_MB + " MB). Trimite-l separat pe email.");
      }
      const meta = { name: file.name, size: file.size, type: file.type || "application/octet-stream" };
      const fileKey = FILE_PREFIX + order.id;
      await env.CONTENT.put(fileKey, await file.arrayBuffer());
      order.file = { ...meta, key: fileKey };
    }

    await env.CONTENT.put(ORDER_PREFIX + order.id, JSON.stringify(order));
    return json({ ok: true, id: order.id });
  }

  // de aici încolo — doar admin
  if (!(await requireAuth(request, env))) return err("Neautorizat.", 401);

  // GET /api/orders — listă
  if (!id && request.method === "GET") {
    return json({ orders: await listOrders(env), statuses: STATUSES });
  }

  // GET /api/orders/:id/file — descărcare fișier
  if (id && segs[2] === "file" && request.method === "GET") {
    const o = await env.CONTENT.get(ORDER_PREFIX + id, "json");
    if (!o || !o.file || !o.file.key) return err("Fișier inexistent.", 404);
    const buf = await env.CONTENT.get(o.file.key, "arrayBuffer");
    if (!buf) return err("Fișier inexistent.", 404);
    return new Response(buf, {
      headers: {
        "Content-Type": o.file.type || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${sanitize(o.file.name)}"`,
        "Cache-Control": "no-store",
      },
    });
  }

  // PATCH /api/orders/:id — schimbă statusul
  if (id && request.method === "PATCH") {
    const o = await env.CONTENT.get(ORDER_PREFIX + id, "json");
    if (!o) return err("Comandă inexistentă.", 404);
    const body = await request.json().catch(() => ({}));
    if (body.status && !STATUSES.includes(body.status)) return err("Status invalid.");
    if (body.status) o.status = body.status;
    await env.CONTENT.put(ORDER_PREFIX + id, JSON.stringify(o));
    return json({ ok: true, order: o });
  }

  // DELETE /api/orders/:id
  if (id && request.method === "DELETE") {
    const o = await env.CONTENT.get(ORDER_PREFIX + id, "json");
    if (o && o.file && o.file.key) await env.CONTENT.delete(o.file.key);
    await env.CONTENT.delete(ORDER_PREFIX + id);
    return json({ ok: true });
  }

  return err("Endpoint inexistent.", 404);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    try {
      if (path.startsWith("/api/")) {
        if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
        const segs = path.replace(/^\/api\//, "").replace(/\/+$/, "").split("/");

        if (segs[0] === "status" && request.method === "GET") {
          return json({ ok: true, kv: !!env.CONTENT, files: !!env.CONTENT, auth: !!(env.JWT_SECRET && env.ADMIN_PASSWORD) });
        }

        if (segs[0] === "login" && request.method === "POST") {
          if (!env.ADMIN_PASSWORD || !env.JWT_SECRET) return err("Admin neconfigurat: setează ADMIN_PASSWORD și JWT_SECRET.", 503);
          const body = await request.json().catch(() => ({}));
          if (!body.password || !timingSafeEqual(body.password, env.ADMIN_PASSWORD)) return err("Parolă greșită.", 401);
          return json({ token: await signJWT({ role: "admin" }, env.JWT_SECRET) });
        }

        if (segs[0] === "content") {
          if (request.method === "GET") return json(await getContent(env));
          if (request.method === "PUT") {
            if (!(await requireAuth(request, env))) return err("Neautorizat.", 401);
            if (!env.CONTENT) return err("KV neconfigurat.", 503);
            const data = await request.json().catch(() => null);
            if (!data || typeof data !== "object") return err("JSON invalid.");
            await env.CONTENT.put(KV_KEY, JSON.stringify(data));
            return json({ ok: true });
          }
          if (request.method === "DELETE") {
            if (!(await requireAuth(request, env))) return err("Neautorizat.", 401);
            if (env.CONTENT) await env.CONTENT.delete(KV_KEY);
            return json({ ok: true, content: DEFAULT_CONTENT });
          }
        }

        if (segs[0] === "orders") return handleOrders(request, env, segs);

        if (segs[0] === "media") {
          const mid = segs[1];
          // GET /api/media/:id — public (imaginea încărcată)
          if (mid && request.method === "GET") {
            if (!env.CONTENT) return err("Indisponibil.", 404);
            const res = await env.CONTENT.getWithMetadata(MEDIA_PREFIX + mid, { type: "arrayBuffer" });
            if (!res || !res.value) return err("Imagine inexistentă.", 404);
            const type = (res.metadata && res.metadata.type) || "application/octet-stream";
            return new Response(res.value, {
              headers: { "Content-Type": type, "Cache-Control": "public, max-age=31536000, immutable" },
            });
          }
          // POST /api/media — încărcare imagine (auth)
          if (!mid && request.method === "POST") {
            if (!(await requireAuth(request, env))) return err("Neautorizat.", 401);
            if (!env.CONTENT) return err("KV neconfigurat.", 503);
            const form = await request.formData();
            const file = form.get("file");
            if (!file || typeof file === "string" || !file.size) return err("Fără fișier.");
            if (!/^image\//.test(file.type || "")) return err("Doar imagini sunt permise.");
            if (file.size > MAX_IMG_BYTES) return err("Imagine prea mare (max " + MAX_IMG_MB + " MB).");
            const id = genId();
            await env.CONTENT.put(MEDIA_PREFIX + id, await file.arrayBuffer(),
              { metadata: { type: file.type, name: String(file.name || "").slice(0, 80) } });
            return json({ ok: true, id, url: "/api/media/" + id });
          }
          return err("Endpoint inexistent.", 404);
        }

        return err("Endpoint inexistent.", 404);
      }

      return env.ASSETS.fetch(request);
    } catch (e) {
      if (!path.startsWith("/api/")) return env.ASSETS.fetch(request);
      return err("Eroare server: " + (e && e.message), 500);
    }
  },
};
