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
const MSG_PREFIX = "msg:";
const MAX_FILE_MB = 20;
const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;
const MAX_IMG_MB = 5;
const MAX_IMG_BYTES = MAX_IMG_MB * 1024 * 1024;
const STATUSES = ["Nouă", "În lucru", "Trimisă", "Finalizată", "Anulată"];

// ---- Conținut implicit (folosit dacă KV e gol) ----
const DEFAULT_CONTENT = {
  maintenance: {
    enabled: true,
    title: "Revenim în curând",
    mesaj: "Lucrăm la câteva îmbunătățiri pentru tine. Site-ul revine online în scurt timp. Mulțumim pentru răbdare!",
  },
  brandTagline: "PRINT DTF PREMIUM",
  hero: {
    line1: "PRINT", hi: "DTF", line2: "LA METRU LINIAR",
    subPre: "LĂȚIME DE", subHi: "90 CM",
    stats: ["tag De la 6,50 lei/ml", "ruler Lățime 90 cm", "truck Livrare 24-48h"],
    checks: ["Comandă online", "Livrare rapidă", "Culori vibrante"],
    cta: "COMANDĂ ACUM",
    hint: "Încarcă fișierele în 2 minute",
  },
  pills: [
    { ico: "shield", title: "Culori vibrante", sub: "Calitate premium" },
    { ico: "ruler", title: "Lățime 90 cm", sub: "Print la metru liniar" },
    { ico: "bolt", title: "Livrare rapidă", sub: "Termene scurte" },
    { ico: "award", title: "Rezistență maximă", sub: "Spălări multiple" },
  ],
  order: {
    eyebrow: "Comandă rapid și ușor",
    title: "Comandă DTF",
    desc: "Încarci designul, alegi dimensiunea și primești printul DTF la metru liniar, gata de aplicat.",
    checklist: [
      "Preț afișat la metru liniar",
      "Lățime print: 90 cm",
      "Print de înaltă rezoluție",
      "Folie premium, cerneală certificată",
      "Ideal pentru textile din bumbac, poliester și mix",
    ],
    calcTitle: "Calculează prețul",
    pricePerMeter: 25,
    priceTiers: [
      { dela: 5, pretMl: 23 },
      { dela: 20, pretMl: 21 },
      { dela: 50, pretMl: 19 },
      { dela: 100, pretMl: 17 },
    ],
    printWidth: 90,
    uploadText: "Încarcă design",
    calcNote: "Upload PDF, PNG, TIFF (300dpi recomandat)",
  },
  steps: [
    { ico: "upload", title: "1. Încarcă design", sub: "Trimite fișierul tău" },
    { ico: "printer", title: "2. Noi printăm", sub: "Calitate premium" },
    { ico: "search", title: "3. Verificare", sub: "Control calitate" },
    { ico: "truck", title: "4. Livrare rapidă", sub: "Ambalare sigură" },
  ],
  products: {
    eyebrow: "Textile și accesorii",
    title: "Produse Blank",
    desc: "Descoperă gama noastră de produse blank premium, perfecte pentru personalizare.",
    cta: "Vezi toate produsele",
    items: [
      { cod: "tricou", img: "assets/img/prod-tricou.jpg", name: "Tricouri", desc: "De la XS la 5XL", price: 35, reducere: 0,
        marimi: "XS, S, M, L, XL, 2XL, 3XL, 4XL, 5XL", dimensiuni: "Bumbac 180 g/mp · lățime print recomandată max. 30 cm",
        descriereLunga: "Tricou unisex din bumbac premium, ideal pentru personalizare prin print DTF. Tușeu moale, rezistent la spălări repetate." },
      { cod: "hanorac", img: "assets/img/prod-hanorac.jpg", name: "Hanorace", desc: "Model unisex", price: 90, reducere: 0,
        marimi: "S, M, L, XL, 2XL, 3XL", dimensiuni: "Bumbac/poliester 280 g/mp · zonă print piept/spate",
        descriereLunga: "Hanorac unisex cu glugă, material gros și călduros, perfect pentru imprimări DTF de dimensiuni mari." },
      { cod: "geanta", img: "assets/img/prod-geanta.jpg", name: "Genți", desc: "Bumbac premium", price: 25, reducere: 0,
        marimi: "Universală (38 × 42 cm)", dimensiuni: "Bumbac 140 g/mp · zonă print ~25 × 30 cm",
        descriereLunga: "Geantă tip tote din bumbac, rezistentă și reutilizabilă, suprafață ideală pentru un design pe o față." },
      { cod: "sapca", img: "assets/img/prod-sapca.jpg", name: "Șepci", desc: "Diverse modele", price: 30, reducere: 0,
        marimi: "Reglabilă (universală)", dimensiuni: "Front print ~10 × 5 cm",
        descriereLunga: "Șapcă reglabilă, potrivită pentru logo-uri și texte mici aplicate frontal." },
    ],
  },
  trust: [
    { ico: "award", title: "Calitate garantată", sub: "Materiale și print premium" },
    { ico: "truck", title: "Livrare rapidă", sub: "2-3 zile lucrătoare oriunde în țară" },
    { ico: "lock", title: "Plăți securizate", sub: "Datele tale sunt în siguranță" },
    { ico: "message", title: "Suport dedicat", sub: "Suntem aici să te ajutăm" },
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
    produseBg: "assets/img/hero-prints.jpg",
    produseVeilOpacity: 100,
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
  social: {
    facebook: "",
    instagram: "",
    tiktok: "",
    youtube: "",
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

// ---- TikTok Display API ----
async function tiktokExchange(env, params) {
  const body = new URLSearchParams({
    client_key: env.TIKTOK_CLIENT_KEY, client_secret: env.TIKTOK_CLIENT_SECRET, ...params,
  });
  const r = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: body.toString(),
  });
  return r.json();
}
async function tiktokValidAccess(env) {
  let t = await env.CONTENT.get("tiktok:tokens", "json");
  if (!t) return null;
  const now = Math.floor(Date.now() / 1000);
  if (t.expires_at && t.expires_at - 60 > now) return t;
  const res = await tiktokExchange(env, { grant_type: "refresh_token", refresh_token: t.refresh_token });
  if (res.error && res.error !== "ok" && !res.access_token) return null;
  if (!res.access_token) return null;
  t = {
    access_token: res.access_token, refresh_token: res.refresh_token || t.refresh_token,
    expires_at: now + (res.expires_in || 86400),
    refresh_expires_at: now + (res.refresh_expires_in || 31536000),
    open_id: res.open_id || t.open_id,
  };
  await env.CONTENT.put("tiktok:tokens", JSON.stringify(t));
  return t;
}
async function tiktokSyncVideos(env) {
  if (!env.CONTENT) return { error: "no_kv" };
  const t = await tiktokValidAccess(env);
  if (!t) return { error: "not_connected" };
  const r = await fetch("https://open.tiktokapis.com/v2/video/list/?fields=id,share_url,embed_link,cover_image_url,title", {
    method: "POST", headers: { Authorization: "Bearer " + t.access_token, "Content-Type": "application/json" },
    body: JSON.stringify({ max_count: 12 }),
  });
  const data = await r.json().catch(() => ({}));
  const list = (data && data.data && data.data.videos) || [];
  const vids = list.map((v) => ({
    id: v.id, url: v.share_url || v.embed_link || "", cover: v.cover_image_url || "", title: v.title || "",
  })).filter((v) => v.url);
  await env.CONTENT.put("tiktok:videos", JSON.stringify({ videos: vids, syncedAt: new Date().toISOString() }));
  return { ok: true, count: vids.length };
}

async function handleTikTok(request, env, segs, url) {
  const action = segs[1];

  // public — videoclipuri din cache
  if (action === "videos" && request.method === "GET") {
    const rec = env.CONTENT ? await env.CONTENT.get("tiktok:videos", "json") : null;
    return json({ videos: (rec && rec.videos) || [], syncedAt: rec && rec.syncedAt });
  }

  // callback OAuth — public (verificat prin state)
  if (action === "callback" && request.method === "GET") {
    if (!env.TIKTOK_CLIENT_KEY || !env.TIKTOK_CLIENT_SECRET || !env.CONTENT) {
      return Response.redirect(url.origin + "/admin?tiktok=error", 302);
    }
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const saved = await env.CONTENT.get("tiktok:state");
    if (!code || !state || state !== saved) return Response.redirect(url.origin + "/admin?tiktok=error", 302);
    const res = await tiktokExchange(env, {
      code, grant_type: "authorization_code", redirect_uri: url.origin + "/api/tiktok/callback",
    });
    if (!res.access_token) return Response.redirect(url.origin + "/admin?tiktok=error", 302);
    const now = Math.floor(Date.now() / 1000);
    await env.CONTENT.put("tiktok:tokens", JSON.stringify({
      access_token: res.access_token, refresh_token: res.refresh_token,
      expires_at: now + (res.expires_in || 86400),
      refresh_expires_at: now + (res.refresh_expires_in || 31536000),
      open_id: res.open_id,
    }));
    await env.CONTENT.delete("tiktok:state");
    await tiktokSyncVideos(env);
    return Response.redirect(url.origin + "/admin?tiktok=ok", 302);
  }

  // de aici — doar admin
  if (!(await requireAuth(request, env))) return err("Neautorizat.", 401);
  if (!env.CONTENT) return err("KV neconfigurat.", 503);

  if (action === "connect" && request.method === "GET") {
    if (!env.TIKTOK_CLIENT_KEY) return err("Setează TIKTOK_CLIENT_KEY și TIKTOK_CLIENT_SECRET.", 503);
    const state = genId() + genId();
    await env.CONTENT.put("tiktok:state", state, { expirationTtl: 600 });
    const auth = "https://www.tiktok.com/v2/auth/authorize/?" + new URLSearchParams({
      client_key: env.TIKTOK_CLIENT_KEY, scope: "user.info.basic,video.list",
      response_type: "code", redirect_uri: url.origin + "/api/tiktok/callback", state,
    }).toString();
    return json({ url: auth });
  }
  if (action === "status" && request.method === "GET") {
    const t = await env.CONTENT.get("tiktok:tokens", "json");
    const rec = await env.CONTENT.get("tiktok:videos", "json");
    return json({
      configured: !!(env.TIKTOK_CLIENT_KEY && env.TIKTOK_CLIENT_SECRET),
      connected: !!t, openId: t && t.open_id,
      videoCount: (rec && rec.videos && rec.videos.length) || 0, syncedAt: rec && rec.syncedAt,
    });
  }
  if (action === "sync" && request.method === "POST") {
    const r = await tiktokSyncVideos(env);
    if (r.error) return err(r.error === "not_connected" ? "Reconectează contul TikTok." : "Eroare la sincronizare.", 400);
    return json(r);
  }
  if (action === "disconnect" && request.method === "POST") {
    await env.CONTENT.delete("tiktok:tokens");
    await env.CONTENT.delete("tiktok:videos");
    return json({ ok: true });
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

    const deliveryMethod = f.deliveryMethod === "ridicare" ? "ridicare" : "livrare";
    const address = deliveryMethod === "livrare" ? String(f.address || "").slice(0, 600) : "";

    const user = await env.CONTENT.get(USER_PREFIX + cust.sub, "json");
    const order = {
      id: oid, createdAt: new Date().toISOString(), status: "Nouă",
      userId: cust.sub,
      name: (user && user.name) || cust.name || "",
      email: cust.sub,
      phone: (user && user.phone) || "",
      deliveryMethod, address,
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

// ---- Mesaje contact ----
async function listMessages(env) {
  if (!env.CONTENT) return [];
  const out = [];
  let cursor;
  do {
    const res = await env.CONTENT.list({ prefix: MSG_PREFIX, cursor });
    for (const k of res.keys) {
      const m = await env.CONTENT.get(k.name, "json");
      if (m) out.push(m);
    }
    cursor = res.list_complete ? null : res.cursor;
  } while (cursor);
  out.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  return out;
}

// Notificare email la mesaj nou — DORMANTĂ până se setează secretele.
// Necesită (setate ca secrets în Worker, când vrei să activezi):
//   RESEND_API_KEY – cheia API de la resend.com
//   NOTIFY_EMAIL   – adresa unde vrei să primești notificările
//   NOTIFY_FROM    – (opțional) expeditor verificat, ex. "MrDTF <contact@domeniul-tau.ro>"
// Dacă lipsesc RESEND_API_KEY sau NOTIFY_EMAIL, funcția nu face nimic.
async function notifyNewMessage(env, msg) {
  try {
    const to = env.NOTIFY_EMAIL;
    const apiKey = env.RESEND_API_KEY;
    if (!to || !apiKey) return; // neconfigurat — nu trimite nimic
    const from = env.NOTIFY_FROM || "MrDTF <onboarding@resend.dev>";
    const esc = (s) => String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const subject = "📨 Mesaj nou de contact — " + (msg.name || msg.email);
    const rows = [
      ["Nume", msg.name],
      ["Email", msg.email],
      ["Telefon", msg.phone || "—"],
      ["Subiect", msg.subject || "—"],
    ].map((r) => "<tr><td style=\"padding:4px 12px 4px 0;color:#666\">" + esc(r[0]) +
      "</td><td style=\"padding:4px 0\"><strong>" + esc(r[1]) + "</strong></td></tr>").join("");
    const html = "<div style=\"font-family:Arial,sans-serif;font-size:15px;color:#222\">" +
      "<h2 style=\"margin:0 0 12px\">Mesaj nou de pe site</h2>" +
      "<table style=\"border-collapse:collapse;margin-bottom:14px\">" + rows + "</table>" +
      "<div style=\"padding:14px;background:#f5f5f7;border-radius:8px;white-space:pre-wrap\">" +
      esc(msg.message) + "</div>" +
      "<p style=\"margin-top:16px;color:#888;font-size:13px\">Vezi toate mesajele în panoul admin → Mesaje.</p></div>";
    const text = "Mesaj nou de contact\n\nNume: " + (msg.name || "") + "\nEmail: " + (msg.email || "") +
      "\nTelefon: " + (msg.phone || "—") + "\nSubiect: " + (msg.subject || "—") + "\n\n" + (msg.message || "");
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: "Bearer " + apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [to], reply_to: msg.email, subject, html, text }),
    });
  } catch { /* best-effort — nu blocăm răspunsul către client */ }
}

async function handleMessages(request, env, segs, ctx) {
  // segs: ["messages"] | ["messages", id] | ["messages", "count"]
  const id = segs[1];

  // POST /api/messages — trimitere mesaj din formularul de contact (public)
  if (!id && request.method === "POST") {
    if (!env.CONTENT) return err("Stocare neconfigurată.", 503);
    const b = await request.json().catch(() => ({}));
    const name = String(b.name || "").trim().slice(0, 120);
    const email = normEmail(b.email);
    const message = String(b.message || "").trim().slice(0, 4000);
    if (!name) return err("Numele este obligatoriu.");
    if (!validEmail(email)) return err("Email invalid.");
    if (!message) return err("Mesajul este obligatoriu.");
    const mid = genId();
    const msg = {
      id: mid, createdAt: new Date().toISOString(), read: false,
      name, email,
      phone: String(b.phone || "").trim().slice(0, 40),
      subject: String(b.subject || "").trim().slice(0, 160),
      message,
    };
    await env.CONTENT.put(MSG_PREFIX + mid, JSON.stringify(msg));
    // notificare email (best-effort, dormantă dacă secretele nu sunt setate)
    if (ctx && ctx.waitUntil) ctx.waitUntil(notifyNewMessage(env, msg));
    else await notifyNewMessage(env, msg);
    return json({ ok: true });
  }

  // de aici încolo — doar admin
  if (!(await requireAuth(request, env))) return err("Neautorizat.", 401);
  if (!env.CONTENT) return err("KV neconfigurat.", 503);

  // GET /api/messages/count — doar numărul de mesaje noi (pentru badge)
  if (id === "count" && request.method === "GET") {
    const all = await listMessages(env);
    const unread = all.filter((m) => !m.read).length;
    return json({ unread, total: all.length });
  }

  // GET /api/messages — listă completă
  if (!id && request.method === "GET") {
    const messages = await listMessages(env);
    return json({ messages, unread: messages.filter((m) => !m.read).length });
  }

  // PATCH /api/messages/:id — marchează citit/necitit
  if (id && request.method === "PATCH") {
    const m = await env.CONTENT.get(MSG_PREFIX + id, "json");
    if (!m) return err("Mesaj inexistent.", 404);
    const b = await request.json().catch(() => ({}));
    if (typeof b.read === "boolean") m.read = b.read;
    await env.CONTENT.put(MSG_PREFIX + id, JSON.stringify(m));
    return json({ ok: true, message: m });
  }

  // DELETE /api/messages/:id
  if (id && request.method === "DELETE") {
    await env.CONTENT.delete(MSG_PREFIX + id);
    return json({ ok: true });
  }

  return err("Endpoint inexistent.", 404);
}

// Servește asset-urile statice cu revalidare, ca schimbările (HTML/CSS/JS) să apară
// imediat după deploy, fără să rămână versiuni vechi în cache-ul browserului.
async function serveAsset(request, env) {
  const res = await env.ASSETS.fetch(request);
  const ct = res.headers.get("Content-Type") || "";
  if (/text\/html|text\/css|javascript/.test(ct)) {
    const headers = new Headers(res.headers);
    headers.set("Cache-Control", "no-cache");
    return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
  }
  return res;
}

// Normalizează o cale „assets/…" la absolută (URL-urile http / „/…" rămân la fel).
function absUrlW(u) {
  u = String(u || "");
  if (!u) return "";
  return /^(https?:|\/)/.test(u) ? u : "/" + u;
}

// Servește homepage-ul injectând imaginea hero (LCP) direct în HTML + un
// <link rel=preload>, ca browserul s-o descopere imediat (nu după ce rulează JS).
async function serveHome(request, env) {
  const res = await serveAsset(request, env);
  if (!/text\/html/.test(res.headers.get("Content-Type") || "")) return res;
  let bg = "";
  try { const c = await getContent(env); bg = absUrlW(c.banners && c.banners.heroBg); } catch { /* fallback */ }

  class HeroBg {
    element(el) {
      el.setAttribute("fetchpriority", "high");
      el.setAttribute("decoding", "async");
      el.setAttribute("loading", "eager");
      if (bg) { el.setAttribute("src", bg); el.setAttribute("style", ""); }
    }
  }
  class Head {
    element(el) {
      if (bg) el.append('<link rel="preload" as="image" href="' + bg + '" fetchpriority="high" />', { html: true });
    }
  }
  return new HTMLRewriter()
    .on("img#heroImgBg", new HeroBg())
    .on("head", new Head())
    .transform(res);
}

// Pagini de produs „pretty URL" (/produs/<slug>) — servesc același template,
// iar JS-ul din pagină alege produsul după slug-ul din path.
async function serveProductPage(request, env) {
  const u = new URL(request.url);
  u.pathname = "/produs/index.html";
  const res = await env.ASSETS.fetch(new Request(u.toString(), request));
  const headers = new Headers(res.headers);
  headers.set("Content-Type", "text/html; charset=utf-8");
  headers.set("Cache-Control", "no-cache");
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}

// ---- Mod mentenanță (site în construcție) ----
function escHtml(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
// Rutele care rămân accesibile în mentenanță: admin, API, fișiere statice.
function isMaintenanceExempt(path) {
  return path === "/admin" || path.startsWith("/admin/")
    || path.startsWith("/api/")
    || path.startsWith("/assets/")
    || /\.[a-z0-9]+$/i.test(path);
}
async function maintenanceState(env) {
  let m = { enabled: false, title: "Revenim în curând", mesaj: "Site-ul revine în curând." };
  try { const c = await getContent(env); if (c && c.maintenance) m = { ...m, ...c.maintenance }; } catch { /* ignore */ }
  const ev = String(env.MAINTENANCE || "").toLowerCase();
  if (ev === "on" || ev === "1" || ev === "true") m.enabled = true;
  else if (ev === "off" || ev === "0" || ev === "false") m.enabled = false;
  return m;
}
function maintenancePage(m) {
  const title = escHtml(m.title || "Revenim în curând");
  const mesaj = escHtml(m.mesaj || "Site-ul revine în curând.");
  const html = `<!DOCTYPE html><html lang="ro"><head><meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="robots" content="noindex" /><title>${title} — MrDTF</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:wght@600;700;800&family=Inter:wght@400;500&display=swap" media="print" onload="this.media='all'" />
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{min-height:100vh;display:grid;place-items:center;padding:24px;font-family:"Inter",system-ui,sans-serif;color:#ececf7;text-align:center;
background:radial-gradient(1200px 700px at 80% -10%,#1a1340 0,transparent 60%),radial-gradient(900px 600px at -10% 30%,#112a4a 0,transparent 55%),#070712}
.card{max-width:560px;padding:48px 34px;border-radius:24px;background:linear-gradient(135deg,rgba(255,255,255,.16),rgba(255,255,255,.05));
border:1px solid rgba(255,255,255,.22);-webkit-backdrop-filter:blur(30px) saturate(190%);backdrop-filter:blur(30px) saturate(190%);
box-shadow:0 40px 90px -30px rgba(0,0,0,.7)}
.logo{font-family:"Poppins";font-weight:800;font-size:2rem;letter-spacing:.5px;margin-bottom:6px;
background:linear-gradient(100deg,#22d3ee,#5b8cff 45%,#d946ef);-webkit-background-clip:text;background-clip:text;color:transparent}
.logo b{-webkit-text-fill-color:#22d3ee;color:#22d3ee}
.sub{font-size:.6rem;letter-spacing:3px;color:#9a9ab8;font-weight:600;margin-bottom:30px}
.ico{font-size:3rem;margin-bottom:14px}
h1{font-family:"Poppins";font-size:clamp(1.6rem,5vw,2.4rem);margin-bottom:14px;
background:linear-gradient(100deg,#22d3ee,#5b8cff 45%,#d946ef);-webkit-background-clip:text;background-clip:text;color:transparent}
p{color:#c7c7dd;line-height:1.7;font-size:1.02rem}
.dots{margin-top:26px;display:flex;gap:8px;justify-content:center}
.dots span{width:9px;height:9px;border-radius:50%;background:#5b8cff;opacity:.5;animation:b 1.2s infinite}
.dots span:nth-child(2){animation-delay:.2s}.dots span:nth-child(3){animation-delay:.4s}
@keyframes b{0%,100%{opacity:.3;transform:translateY(0)}50%{opacity:1;transform:translateY(-6px)}}
.contact{margin-top:26px;font-size:.9rem;color:#9a9ab8}.contact a{color:#22d3ee}
</style></head>
<body><div class="card">
<div class="logo"><b>Mr</b>DTF</div><div class="sub">PRINT DTF PREMIUM</div>
<div class="ico">🛠️</div>
<h1>${title}</h1>
<p>${mesaj}</p>
<div class="dots"><span></span><span></span><span></span></div>
<div class="contact">Contact: <a href="mailto:contact@dtfprint.ro">contact@dtfprint.ro</a></div>
</div></body></html>`;
  return new Response(html, {
    status: 503,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "Retry-After": "3600" },
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // Mod mentenanță — blochează paginile publice; admin, API și asset-urile rămân accesibile.
      if (request.method === "GET" && !isMaintenanceExempt(path)) {
        const m = await maintenanceState(env);
        if (m.enabled) return maintenancePage(m);
      }

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

        if (segs[0] === "tiktok") return handleTikTok(request, env, segs, url);

        if (segs[0] === "admin") return handleAdmin(request, env, segs);

        if (segs[0] === "orders") return handleOrders(request, env, segs);

        if (segs[0] === "messages") return handleMessages(request, env, segs, ctx);

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

      if (path === "/" || path === "/index.html") return serveHome(request, env);
      if (path === "/produs" || path.startsWith("/produs/")) return serveProductPage(request, env);
      return serveAsset(request, env);
    } catch (e) {
      if (!path.startsWith("/api/")) return env.ASSETS.fetch(request);
      return err("Eroare server: " + (e && e.message), 500);
    }
  },

  // Cron — reîmprospătează videoclipurile TikTok (dacă e conectat)
  async scheduled(event, env, ctx) {
    ctx.waitUntil(tiktokSyncVideos(env).catch(() => {}));
  },
};
