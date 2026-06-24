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
const USER_PREFIX = "user:";
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
      { img: "assets/img/prod-tricou.jpg", name: "Tricouri", desc: "De la XS la 5XL", price: 35, reducere: 0 },
      { img: "assets/img/prod-hanorac.jpg", name: "Hanorace", desc: "Model unisex", price: 90, reducere: 0 },
      { img: "assets/img/prod-geanta.jpg", name: "Genți", desc: "Bumbac premium", price: 25, reducere: 0 },
      { img: "assets/img/prod-sapca.jpg", name: "Șepci", desc: "Diverse modele", price: 30, reducere: 0 },
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
    heroBg: "",
    heroLeft: "assets/img/hero-prints.jpg",
    heroRight: "assets/img/hero-printer.jpg",
    veilOpacity: 100,
  },
  discount: {
    enabled: false,
    tipPrag: "valoare",
    prag: 0,
    procent: 0,
  },
  tiktok: {
    enabled: false,
    title: "Urmărește-ne pe TikTok",
    profileUrl: "",
    videos: [],
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
function bearer(request) {
  return (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
}
async function requireAuth(request, env) {
  if (!env.JWT_SECRET) return false;
  const token = bearer(request);
  if (!token) return false;
  const p = await verifyJWT(token, env.JWT_SECRET);
  return !!(p && p.role === "admin");
}
async function getCustomer(request, env) {
  if (!env.JWT_SECRET) return null;
  const token = bearer(request);
  if (!token) return null;
  const p = await verifyJWT(token, env.JWT_SECRET);
  return p && p.role === "customer" ? p : null;
}

// ---- Parole (PBKDF2-SHA256) ----
function bytesToB64(bytes) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}
function b64ToBytes(s) {
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}
async function hashPassword(password, saltB64) {
  const salt = saltB64 ? b64ToBytes(saltB64) : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" }, key, 256);
  return { salt: bytesToB64(salt), hash: bytesToB64(new Uint8Array(bits)) };
}
async function verifyPassword(password, saltB64, hashB64) {
  const { hash } = await hashPassword(password, saltB64);
  return timingSafeEqual(hash, hashB64);
}
function normEmail(e) { return String(e || "").trim().toLowerCase(); }
function validEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }

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

// ---- CRM ----
async function listUsers(env) {
  if (!env.CONTENT) return [];
  const out = [];
  let cursor;
  do {
    const res = await env.CONTENT.list({ prefix: USER_PREFIX, cursor });
    for (const k of res.keys) {
      const u = await env.CONTENT.get(k.name, "json");
      if (u) out.push({ email: u.email, name: u.name, phone: u.phone, createdAt: u.createdAt });
    }
    cursor = res.list_complete ? null : res.cursor;
  } while (cursor);
  return out;
}
function orderTotal(o) {
  return Number(o.total != null ? o.total : (o.price || 0)) || 0;
}

async function handleAdmin(request, env, segs) {
  if (!(await requireAuth(request, env))) return err("Neautorizat.", 401);
  if (!env.CONTENT) return err("KV neconfigurat.", 503);
  const sub = segs[1];

  // GET /api/admin/stats — dashboard
  if (sub === "stats" && request.method === "GET") {
    const orders = await listOrders(env);
    const users = await listUsers(env);
    const byStatus = {};
    let revenue = 0, units = 0;
    for (const o of orders) {
      byStatus[o.status] = (byStatus[o.status] || 0) + 1;
      if (o.status !== "Anulată") revenue += orderTotal(o);
      if (Array.isArray(o.items)) for (const it of o.items) units += Number(it.qty) || 0;
    }
    const recent = orders.slice(0, 8).map((o) => ({
      id: o.id, name: o.name, email: o.email, total: orderTotal(o), status: o.status, createdAt: o.createdAt,
    }));
    return json({
      totalCustomers: users.length, totalOrders: orders.length,
      revenue: Number(revenue.toFixed(2)), units, byStatus, recent,
    });
  }

  // GET /api/admin/customers — listă agregată
  if (sub === "customers" && !segs[2] && request.method === "GET") {
    const orders = await listOrders(env);
    const users = await listUsers(env);
    const map = {};
    for (const u of users) {
      map[u.email] = { email: u.email, name: u.name, phone: u.phone, createdAt: u.createdAt, orderCount: 0, totalSpent: 0, lastOrderAt: null };
    }
    for (const o of orders) {
      const k = o.userId || o.email || "—";
      if (!map[k]) map[k] = { email: k, name: o.name || "", phone: o.phone || "", createdAt: null, orderCount: 0, totalSpent: 0, lastOrderAt: null };
      map[k].orderCount++;
      if (o.status !== "Anulată") map[k].totalSpent += orderTotal(o);
      if (!map[k].lastOrderAt || (o.createdAt || "") > map[k].lastOrderAt) map[k].lastOrderAt = o.createdAt;
    }
    const list = Object.values(map).map((c) => ({ ...c, totalSpent: Number(c.totalSpent.toFixed(2)) }));
    // atașează etichetele CRM
    for (const c of list) {
      const rec = await env.CONTENT.get("crmnote:" + c.email, "json");
      c.tags = (rec && Array.isArray(rec.tags)) ? rec.tags : [];
    }
    list.sort((a, b) => (b.lastOrderAt || "").localeCompare(a.lastOrderAt || ""));
    return json({ customers: list });
  }

  // /api/admin/customers/:email[/crm]
  if (sub === "customers" && segs[2]) {
    const email = decodeURIComponent(segs[2]);
    if (segs[3] === "crm" && request.method === "PUT") {
      const b = await request.json().catch(() => ({}));
      const tags = Array.isArray(b.tags)
        ? [...new Set(b.tags.map((t) => String(t).trim().slice(0, 40)).filter(Boolean))].slice(0, 20)
        : [];
      await env.CONTENT.put("crmnote:" + email, JSON.stringify({ notes: String(b.notes || "").slice(0, 5000), tags }));
      return json({ ok: true });
    }
    if (request.method === "GET") {
      const user = await env.CONTENT.get(USER_PREFIX + email, "json");
      const all = await listOrders(env);
      const orders = all.filter((o) => (o.userId || o.email) === email);
      const rec = await env.CONTENT.get("crmnote:" + email, "json");
      const fallback = orders[0] || {};
      return json({
        customer: user
          ? { email: user.email, name: user.name, phone: user.phone, createdAt: user.createdAt }
          : { email, name: fallback.name || "", phone: fallback.phone || "", createdAt: null },
        orders,
        notes: (rec && rec.notes) || "",
        tags: (rec && Array.isArray(rec.tags)) ? rec.tags : [],
      });
    }
  }

  return err("Endpoint inexistent.", 404);
}

async function handleOrders(request, env, segs) {
  // segs: ["orders"] | ["orders", id] | ["orders", id, "file"]
  const id = segs[1];

  // POST /api/orders — plasare comandă (necesită cont)
  if (!id && request.method === "POST") {
    if (!env.CONTENT) return err("Stocare neconfigurată.", 503);
    const cust = await getCustomer(request, env);
    if (!cust) return err("Trebuie să fii autentificat pentru a comanda.", 401);

    const oid = genId();
    let f = {}, items = [], fileList = [];
    const ct = request.headers.get("Content-Type") || "";
    if (ct.includes("multipart/form-data")) {
      const form = await request.formData();
      form.forEach((v, k) => { if (typeof v === "string") f[k] = v; });
      try { items = JSON.parse(f.items || "[]"); } catch { items = []; }
      fileList = form.getAll("file").filter((x) => x && typeof x !== "string" && x.size > 0);
    } else {
      f = await request.json().catch(() => ({}));
      items = Array.isArray(f.items) ? f.items : [];
    }

    if (!Array.isArray(items) || !items.length) return err("Coșul este gol.");
    const cleanItems = items.slice(0, 100).map((it) => {
      const o = {
        type: it.type === "dtf" ? "dtf" : "product",
        name: String(it.name || "").slice(0, 140),
        qty: Math.max(1, Math.min(999, Math.round(Number(it.qty) || 1))),
        price: Math.max(0, Number(it.price) || 0),
      };
      if (o.type === "dtf") { o.width = Math.max(0, Number(it.width) || 0); o.length = Math.max(0, Number(it.length) || 0); }
      return o;
    });
    const subtotal = Number(cleanItems.reduce((s, it) => s + it.price * it.qty, 0).toFixed(2));
    const totalQty = cleanItems.reduce((s, it) => s + it.qty, 0);
    const content = await getContent(env);
    const dc = content.discount || {};
    let discountPercent = 0, discount = 0;
    if (dc.enabled && Number(dc.procent) > 0) {
      const metric = dc.tipPrag === "cantitate" ? totalQty : subtotal;
      if (metric >= Number(dc.prag || 0)) {
        discountPercent = Number(dc.procent);
        discount = Number((subtotal * discountPercent / 100).toFixed(2));
      }
    }
    const total = Number((subtotal - discount).toFixed(2));

    const storedFiles = [];
    let fi = 0;
    for (const file of fileList) {
      if (file.size > MAX_FILE_BYTES) return err("Fișier prea mare (max " + MAX_FILE_MB + " MB).");
      const key = FILE_PREFIX + oid + ":" + fi;
      await env.CONTENT.put(key, await file.arrayBuffer());
      storedFiles.push({ name: file.name, size: file.size, type: file.type || "application/octet-stream", key });
      fi++;
    }

    const user = await env.CONTENT.get(USER_PREFIX + cust.sub, "json");
    const order = {
      id: oid, createdAt: new Date().toISOString(), status: "Nouă",
      userId: cust.sub,
      name: (user && user.name) || cust.name || "",
      email: cust.sub,
      phone: (user && user.phone) || "",
      note: String(f.note || "").slice(0, 2000),
      items: cleanItems, subtotal, discount, discountPercent, total, files: storedFiles,
    };
    await env.CONTENT.put(ORDER_PREFIX + oid, JSON.stringify(order));
    return json({ ok: true, id: oid });
  }

  // de aici încolo — doar admin
  if (!(await requireAuth(request, env))) return err("Neautorizat.", 401);

  // GET /api/orders — listă
  if (!id && request.method === "GET") {
    return json({ orders: await listOrders(env), statuses: STATUSES });
  }

  // GET /api/orders/:id/file?i=<index> — descărcare fișier design
  if (id && segs[2] === "file" && request.method === "GET") {
    const o = await env.CONTENT.get(ORDER_PREFIX + id, "json");
    if (!o) return err("Comandă inexistentă.", 404);
    const i = parseInt(new URL(request.url).searchParams.get("i") || "0", 10) || 0;
    let f = null;
    if (Array.isArray(o.files) && o.files[i]) f = o.files[i];
    else if (o.file && i === 0) f = o.file; // compat comenzi vechi
    if (!f || !f.key) return err("Fișier inexistent.", 404);
    const buf = await env.CONTENT.get(f.key, "arrayBuffer");
    if (!buf) return err("Fișier inexistent.", 404);
    return new Response(buf, {
      headers: {
        "Content-Type": f.type || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${sanitize(f.name)}"`,
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
    if (o) {
      if (Array.isArray(o.files)) { for (const f of o.files) { if (f.key) await env.CONTENT.delete(f.key); } }
      if (o.file && o.file.key) await env.CONTENT.delete(o.file.key);
    }
    await env.CONTENT.delete(ORDER_PREFIX + id);
    return json({ ok: true });
  }

  return err("Endpoint inexistent.", 404);
}

async function handleAuth(request, env, segs) {
  const action = segs[1];
  if (action === "register" && request.method === "POST") {
    if (!env.CONTENT || !env.JWT_SECRET) return err("Conturi neconfigurate.", 503);
    const b = await request.json().catch(() => ({}));
    const email = normEmail(b.email);
    if (!validEmail(email)) return err("Email invalid.");
    if (!b.password || String(b.password).length < 6) return err("Parola trebuie să aibă minim 6 caractere.");
    if (!b.name || !b.name.trim()) return err("Numele este obligatoriu.");
    if (await env.CONTENT.get(USER_PREFIX + email)) return err("Există deja un cont cu acest email.", 409);
    const { salt, hash } = await hashPassword(String(b.password));
    const user = {
      id: genId(), email, name: String(b.name).slice(0, 120),
      phone: String(b.phone || "").slice(0, 40), salt, hash, createdAt: new Date().toISOString(),
    };
    await env.CONTENT.put(USER_PREFIX + email, JSON.stringify(user));
    const token = await signJWT({ role: "customer", sub: email, name: user.name, email }, env.JWT_SECRET);
    return json({ ok: true, token, user: { email, name: user.name, phone: user.phone } });
  }

  if (action === "login" && request.method === "POST") {
    if (!env.CONTENT || !env.JWT_SECRET) return err("Conturi neconfigurate.", 503);
    const b = await request.json().catch(() => ({}));
    const email = normEmail(b.email);
    const user = await env.CONTENT.get(USER_PREFIX + email, "json");
    if (!user || !(await verifyPassword(String(b.password || ""), user.salt, user.hash))) {
      return err("Email sau parolă greșite.", 401);
    }
    const token = await signJWT({ role: "customer", sub: email, name: user.name, email }, env.JWT_SECRET);
    return json({ ok: true, token, user: { email, name: user.name, phone: user.phone } });
  }

  // restul — client autentificat
  const cust = await getCustomer(request, env);
  if (!cust) return err("Neautorizat.", 401);

  if (action === "me" && request.method === "GET") {
    const user = await env.CONTENT.get(USER_PREFIX + cust.sub, "json");
    if (!user) return err("Cont inexistent.", 404);
    return json({ email: user.email, name: user.name, phone: user.phone });
  }
  if (action === "orders" && request.method === "GET") {
    const all = await listOrders(env);
    return json({ orders: all.filter((o) => o.userId === cust.sub) });
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

        if (segs[0] === "auth") return handleAuth(request, env, segs);

        if (segs[0] === "admin") return handleAdmin(request, env, segs);

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
