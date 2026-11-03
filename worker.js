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

import { connect } from "cloudflare:sockets";

const KV_KEY = "home";
const ORDER_PREFIX = "order:";
const FILE_PREFIX = "orderfile:";
const MEDIA_PREFIX = "media:";
const USER_PREFIX = "user:";
const MSG_PREFIX = "msg:";
const OFFER_PREFIX = "offer:";
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
  // ---- Conținut temă nouă (Mr.DTF) ----
  site: {
    logo: "/assets/img/logo-mrdtf.png",
    phone: "+40786022893",
    phoneDisplay: "0786 022 893",
    email: "comenzi@unilevelnetwork.ro",
    topNote: "PRINT DTF NON-STOP 24/24",
    heroTitle: "calitate",
    schedule: "Luni – Vineri: NON STOP\n(programul de print se termină vineri la ora 16:00)",
    pickup: "Splaiul Unirii 313, Sector 3, București\nClădirea ICPE, corp M, etaj 2",
    tagline: "Specialiști în print DTF premium la metru liniar.",
    priceNote: "Suprafața printabilă este de 87 cm. Prețurile afișate nu includ TVA.",
    company: {
      name: "UNILEVEL NETWORK SRL",
      cui: "RO52548180",
      reg: "J2025071790007",
      address: "Str. Constantin Marin 2, Bl. Z1, Sc. 1, Et. 4, Ap. 20, cod poștal 052593",
    },
    dtfTiers: [
      { pret: 70, range: "1 – 2 ml" },
      { pret: 65, range: "3 – 9 ml" },
      { pret: 62, range: "10 – 24 ml" },
      { pret: 58, range: "25 – 49 ml" },
      { pret: 55, range: "50 – 100 ml" },
    ],
    gallery: [
      { img: "/assets/img/galerie-1-desprinzi-folia.jpg", alt: "Transfer DTF aplicat pe un tricou negru" },
      { img: "/assets/img/galerie-2-productie-non-stop.jpg", alt: "Role de print DTF gata de livrare" },
      { img: "/assets/img/galerie-3-culori-puternice.jpg", alt: "Print DTF colorat pe folie, cu detalii fine" },
      { img: "/assets/img/galerie-4-imprimante-profesionale.jpg", alt: "Imprimantă DTF în funcțiune" },
    ],
  },
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
    email: "comenzi@unilevelnetwork.ro",
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
// ID imposibil de ghicit: timp (pentru sortare) + 24 hex criptografic aleator.
function genId() {
  const b = crypto.getRandomValues(new Uint8Array(12));
  let s = "";
  for (const x of b) s += x.toString(16).padStart(2, "0");
  return Date.now().toString(36) + "-" + s;
}
function sanitize(name) {
  return String(name || "fisier").replace(/[^\w.\-]+/g, "_").slice(0, 80);
}

// Curăță o valoare care intră într-un antet (email/SMTP): elimină CR/LF, ca să
// nu se poată injecta anteturi sau destinatari suplimentari (CRLF injection).
function cleanHeader(s) { return String(s == null ? "" : s).replace(/[\r\n]+/g, " ").trim(); }

// Detectează tipul real al unei imagini după „magic bytes". Întoarce MIME-ul
// sau null. SVG NU e recunoscut aici → e respins la upload (poate conține script).
function sniffImageType(buf) {
  const b = new Uint8Array(buf);
  if (b.length < 12) return null;
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38) return "image/gif";
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
      b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return "image/webp";
  return null;
}

// IP-ul clientului (Cloudflare) pentru limitarea de rată.
function clientIp(request) {
  return request.headers.get("CF-Connecting-IP") || request.headers.get("X-Forwarded-For") || "";
}
// Limitare de rată simplă pe IP (fereastră fixă), stocată în KV. Best-effort:
// dacă KV lipsește sau nu avem IP, nu blochează. Întoarce true dacă s-a depășit.
async function rateLimited(env, bucket, ip, limit, windowSec) {
  if (!env.CONTENT || !ip) return false;
  const slot = Math.floor(Date.now() / 1000 / windowSec);
  const key = "rl:" + bucket + ":" + ip + ":" + slot;
  let n = 0;
  try { n = Number(await env.CONTENT.get(key)) || 0; } catch { /* ignore */ }
  if (n >= limit) return true;
  try { await env.CONTENT.put(key, String(n + 1), { expirationTtl: Math.max(60, windowSec * 2) }); } catch { /* ignore */ }
  return false;
}

// Token secret pentru previzualizarea site-ului în mentenanță, derivat din
// JWT_SECRET (nu e o valoare fixă ghicibilă ca „on"). Se obține din admin.
async function previewToken(env) {
  const secret = env.JWT_SECRET || env.ADMIN_PASSWORD || "mrdtf";
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("preview:" + secret));
  const b = new Uint8Array(digest);
  let s = "";
  for (let i = 0; i < 10; i++) s += b[i].toString(16).padStart(2, "0");
  return s;
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
// Preț lei/ml pentru un nr. de metri, pe baza treptelor (range ex. „3 – 9 ml").
function dtfPriceForMeters(meters, tiers) {
  if (!meters || !Array.isArray(tiers) || !tiers.length) return 0;
  for (const t of tiers) {
    const nums = String(t.range || "").match(/\d+/g) || [];
    const lo = Number(nums[0]) || 0;
    const hi = nums[1] != null ? Number(nums[1]) : Infinity;
    if (meters >= lo && meters <= hi) return Number(t.pret) || 0;
  }
  return Number(tiers[tiers.length - 1].pret) || 0;
}

async function handleAdmin(request, env, segs) {
  if (!(await requireAuth(request, env))) return err("Neautorizat.", 401);
  if (!env.CONTENT) return err("KV neconfigurat.", 503);
  const sub = segs[1];

  // POST /api/admin/test-email — trimite un email de test cu setările curente.
  if (sub === "test-email" && request.method === "POST") {
    const method = (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) ? "smtp" : (env.RESEND_API_KEY ? "resend" : "none");
    if (method === "none") return json({ ok: false, method, error: "Email neconfigurat (lipsesc secretele SMTP_* sau RESEND_API_KEY)." });
    const ok = await sendMail(env, {
      subject: "✅ Test email — MrDTF",
      html: "<div style=\"font-family:Arial,sans-serif;font-size:15px\"><h2>Test reușit 🎉</h2><p>Dacă ai primit acest mesaj, trimiterea de emailuri din site funcționează corect.</p><p style=\"color:#888;font-size:13px\">Metodă: " + method + "</p></div>",
      text: "Test reusit. Trimiterea de emailuri functioneaza. Metoda: " + method,
    });
    return json({ ok, method, error: ok ? undefined : "Trimiterea a eșuat. Verifică setările (host/port/user/parolă) sau logurile Worker." });
  }

  // GET /api/admin/preview-url — link secret de previzualizare în mentenanță.
  if (sub === "preview-url" && request.method === "GET") {
    const tok = await previewToken(env);
    return json({ ok: true, path: "/?preview=" + tok, token: tok });
  }

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
          ? { email: user.email, name: user.name, phone: user.phone, createdAt: user.createdAt, type: user.type || "pf", company: user.company || "" }
          : { email, name: fallback.name || "", phone: fallback.phone || "", createdAt: null, type: fallback.billingType || "pf", company: fallback.billing || "" },
        orders,
        notes: (rec && rec.notes) || "",
        tags: (rec && Array.isArray(rec.tags)) ? rec.tags : [],
      });
    }
  }

  // POST /api/admin/customers — importă/actualizează client în CRM
  if (sub === "customers" && !segs[2] && request.method === "POST") {
    const b = await request.json().catch(() => ({}));
    const email = normEmail(b.email);
    if (!email) return err("Clientul nu are adresă de email — nu-l pot importa în CRM.");
    const existing = (await env.CONTENT.get(USER_PREFIX + email, "json")) || {};
    const rec = {
      ...existing, email,
      name: String(b.name || existing.name || "").slice(0, 140),
      phone: String(b.phone || existing.phone || "").slice(0, 40),
      type: b.type === "pj" ? "pj" : (existing.type || "pf"),
      company: (b.company != null && b.company !== "") ? String(b.company).slice(0, 1200) : (existing.company || ""),
      createdAt: existing.createdAt || new Date().toISOString(),
      imported: true,
    };
    await env.CONTENT.put(USER_PREFIX + email, JSON.stringify(rec));
    return json({ ok: true, email: email });
  }

  // POST /api/admin/offers — creează o ofertă
  if (sub === "offers" && !segs[2] && request.method === "POST") {
    const b = await request.json().catch(() => ({}));
    const items = (Array.isArray(b.items) ? b.items : []).slice(0, 50).map((it) => ({
      desc: String(it.desc || "").slice(0, 200),
      qty: Math.max(0, Number(it.qty) || 0),
      price: Math.max(0, Number(it.price) || 0),
    })).filter((it) => it.desc);
    if (!items.length) return err("Adaugă cel puțin o linie în ofertă.");
    const vatRate = (b.vat === false) ? 0 : (Number(b.vatRate) >= 0 ? Number(b.vatRate) : 21);
    const net = Number(items.reduce((s, it) => s + it.qty * it.price, 0).toFixed(2));
    const discountPercent = Math.max(0, Math.min(100, Number(b.discount) || 0));
    const discount = Number((net * discountPercent / 100).toFixed(2));
    const base = Number((net - discount).toFixed(2));
    const vat = Number((base * vatRate / 100).toFixed(2));
    const total = Number((base + vat).toFixed(2));
    const oid = genId();
    const cl = b.client || {};
    const offer = {
      id: oid, createdAt: new Date().toISOString(),
      number: String(b.number || ("OF-" + new Date().getFullYear() + "-" + oid.slice(0, 5).toUpperCase())).slice(0, 40),
      client: {
        name: String(cl.name || "").slice(0, 140), email: normEmail(cl.email),
        phone: String(cl.phone || "").slice(0, 40), company: String(cl.company || "").slice(0, 1200),
        type: cl.type === "pj" ? "pj" : "pf",
      },
      items, vatRate, net, discountPercent, discount, vat, total,
      validity: Math.max(0, Math.min(365, Number(b.validity) || 14)),
      notes: String(b.notes || "").slice(0, 2000),
      reminded: false,
    };
    // Data de expirare: explicită (date picker) sau calculată din valabilitate.
    if (b.validUntil && /^\d{4}-\d{2}-\d{2}/.test(String(b.validUntil))) {
      offer.validUntil = new Date(String(b.validUntil).slice(0, 10) + "T23:59:59").toISOString();
    } else {
      offer.validUntil = new Date(Date.now() + offer.validity * 86400000).toISOString();
    }
    await env.CONTENT.put(OFFER_PREFIX + oid, JSON.stringify(offer));
    return json({ ok: true, id: oid, number: offer.number, url: "/oferta/" + oid });
  }

  // GET /api/admin/offers[?email=] — listă oferte (toate sau pe client)
  if (sub === "offers" && !segs[2] && request.method === "GET") {
    const u = new URL(request.url);
    const email = normEmail(u.searchParams.get("email"));
    const out = [];
    let cursor;
    do {
      const res = await env.CONTENT.list({ prefix: OFFER_PREFIX, cursor });
      for (const k of res.keys) {
        const o = await env.CONTENT.get(k.name, "json");
        if (o && (!email || (o.client && o.client.email === email))) {
          out.push({ id: o.id, number: o.number, createdAt: o.createdAt, total: o.total, client: o.client, validUntil: o.validUntil });
        }
      }
      cursor = res.list_complete ? null : res.cursor;
    } while (cursor);
    out.sort((a, b2) => (b2.createdAt || "").localeCompare(a.createdAt || ""));
    return json({ offers: out });
  }

  // DELETE /api/admin/offers/:id
  if (sub === "offers" && segs[2] && segs[3] !== "send" && request.method === "DELETE") {
    await env.CONTENT.delete(OFFER_PREFIX + segs[2]);
    return json({ ok: true });
  }

  // POST /api/admin/offers/:id/send — trimite oferta pe emailul clientului
  if (sub === "offers" && segs[2] && segs[3] === "send" && request.method === "POST") {
    const o = await env.CONTENT.get(OFFER_PREFIX + segs[2], "json");
    if (!o) return err("Ofertă inexistentă.", 404);
    const to = o.client && o.client.email;
    if (!to) return err("Oferta nu are adresă de email a clientului.");
    let site = {};
    try { const c = await getContent(env); site = c.site || {}; } catch { /* fallback */ }
    const origin = new URL(request.url).origin;
    const link = origin + "/oferta/" + o.id;
    const esc = escHtml;
    const money = (n) => (Number(n) || 0).toFixed(2) + " lei";
    const validStr = o.validUntil ? new Date(o.validUntil).toLocaleDateString("ro-RO") : (o.validity + " zile");
    const rows = (o.items || []).map((it) => "<tr><td style=\"padding:6px 10px;border-bottom:1px solid #eee\">" + esc(it.desc) +
      "</td><td style=\"padding:6px 10px;border-bottom:1px solid #eee;text-align:right\">" + esc(it.qty) +
      "</td><td style=\"padding:6px 10px;border-bottom:1px solid #eee;text-align:right\">" + money(it.price) +
      "</td><td style=\"padding:6px 10px;border-bottom:1px solid #eee;text-align:right\">" + money(it.qty * it.price) + "</td></tr>").join("");
    const subject = "Ofertă " + o.number + " — Mr.DTF";
    const html = "<div style=\"font-family:Arial,sans-serif;font-size:15px;color:#222\">" +
      "<h2 style=\"margin:0 0 10px\">Ofertă " + esc(o.number) + "</h2>" +
      "<p>Bună ziua" + (o.client.name ? ", " + esc(o.client.name) : "") + ",</p>" +
      "<p>Vă transmitem oferta solicitată. O puteți vedea și printa aici:</p>" +
      "<p><a href=\"" + link + "\" style=\"background:#111;color:#fff;padding:12px 22px;border-radius:10px;text-decoration:none;display:inline-block;font-weight:700\">Vezi oferta ↗</a></p>" +
      "<table style=\"border-collapse:collapse;margin:10px 0\"><thead><tr><th style=\"padding:6px 10px;text-align:left;color:#888\">Descriere</th><th style=\"padding:6px 10px;text-align:right;color:#888\">Metri l.</th><th style=\"padding:6px 10px;text-align:right;color:#888\">Preț/m.l.</th><th style=\"padding:6px 10px;text-align:right;color:#888\">Valoare</th></tr></thead><tbody>" + rows + "</tbody></table>" +
      "<p>Subtotal: " + money(o.net) + (o.discountPercent ? " · Discount (" + esc(o.discountPercent) + "%): − " + money(o.discount) : "") + (o.vatRate ? " · TVA (" + esc(o.vatRate) + "%): " + money(o.vat) : "") + "<br><strong style=\"font-size:17px\">Total: " + money(o.total) + "</strong></p>" +
      (o.notes ? "<p style=\"background:#fff8e1;padding:12px;border-radius:8px;white-space:pre-wrap\">" + esc(o.notes) + "</p>" : "") +
      "<p style=\"color:#888;font-size:13px\">Ofertă valabilă până la " + esc(validStr) + ". Pentru confirmare, răspundeți la acest e-mail sau sunați la " + esc(site.phoneDisplay || site.phone || "") + ".</p>" +
      "<p>Cu stimă,<br>Echipa Mr.DTF</p></div>";
    const text = "Ofertă " + o.number + "\n\nVedeți oferta: " + link + "\nTotal: " + money(o.total) +
      "\n\nOfertă valabilă până la " + validStr + ". Răspundeți la acest e-mail pentru confirmare.\n\nEchipa Mr.DTF";
    const ok = await sendMail(env, { to, subject, html, text, replyTo: site.email || env.NOTIFY_EMAIL });
    return json({ ok: ok, to: to, error: ok ? undefined : "Trimiterea a eșuat (verifică setările email)." });
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

  // POST /api/orders — comandă publică (tema nouă: formular → email + salvare în admin)
  if (!id && request.method === "POST") {
    if (!env.CONTENT) return err("Stocare neconfigurată.", 503);
    if (await rateLimited(env, "order", clientIp(request), 5, 60)) return err("Prea multe comenzi într-un timp scurt. Încearcă din nou în câteva minute.", 429);
    const f = await request.json().catch(() => ({}));
    const name = String(f.name || "").trim().slice(0, 140);
    const phone = String(f.phone || "").trim().slice(0, 40);
    const email = String(f.email || "").trim().slice(0, 160);
    if (!name && !phone) return err("Completează numele și telefonul.");
    if (!validEmail(email)) return err("Introdu o adresă de email validă.");
    const width = Math.max(0, Number(f.width) || 0);
    const meters = Math.max(0, Number(f.meters) || 0);
    const billingType = f.billingType === "pj" ? "pj" : "pf";

    const content = await getContent(env);
    const tiers = (content.site && content.site.dtfTiers) || [];
    const pretMl = dtfPriceForMeters(meters, tiers);
    const total = Number((pretMl * meters).toFixed(2));

    const oid = genId();
    const order = {
      id: oid, createdAt: new Date().toISOString(), status: "Nouă", source: "web",
      name, phone, email, width, meters,
      pretMl, total,
      billingType, billing: String(f.billing || "").slice(0, 1200),
      graphicsLink: String(f.graphicsLink || "").slice(0, 500),
      note: String(f.note || "").slice(0, 2000),
    };
    await env.CONTENT.put(ORDER_PREFIX + oid, JSON.stringify(order));
    // Două emailuri: notificare către noi (business) + confirmare către client.
    // Best-effort: dacă emailul nu e configurat, comanda rămâne salvată în admin.
    const [emailed, customerEmailed] = await Promise.all([
      notifyNewOrder(env, order),
      sendOrderConfirmation(env, order),
    ]);
    return json({ ok: true, id: oid, emailed: emailed, customerEmailed: customerEmailed });
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
// Encode UTF-8 → base64 (pentru subiect MIME și AUTH LOGIN).
function b64utf8(s) {
  const bytes = new TextEncoder().encode(String(s == null ? "" : s));
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}
function emailAddr(s) {
  const m = String(s || "").match(/<([^>]+)>/);
  return (m ? m[1] : String(s || "")).trim();
}

// Client SMTP minimal peste TLS implicit (port 465), folosind cloudflare:sockets.
// Trimite prin serverul propriu (ex. mail.unilevelnetwork.ro). Best-effort.
async function smtpSend(env, { to, from, subject, html, text, replyTo }) {
  const host = env.SMTP_HOST;
  const port = Number(env.SMTP_PORT) || 465;
  const user = env.SMTP_USER;
  const pass = env.SMTP_PASS;
  if (!host || !user || !pass) return false;

  const socket = connect({ hostname: host, port }, { secureTransport: "on", allowHalfOpen: false });
  const withTimeout = (p, ms, label) => Promise.race([
    p, new Promise((_, rej) => setTimeout(() => rej(new Error("timeout " + label)), ms)),
  ]);
  try { await withTimeout(socket.opened, 10000, "conectare"); }
  catch (e) { try { await socket.close(); } catch { /**/ } throw new Error("conectare SMTP eșuată la " + host + ":" + port + " (" + (e && e.message) + ")"); }
  const writer = socket.writable.getWriter();
  const reader = socket.readable.getReader();
  const enc = new TextEncoder();
  const dec = new TextDecoder();
  let buf = "";
  async function readReply(expect) {
    while (true) {
      const lines = buf.split("\r\n");
      for (let i = 0; i < lines.length - 1; i++) {
        if (/^\d{3} /.test(lines[i])) {
          const code = lines[i].slice(0, 3);
          buf = lines.slice(i + 1).join("\r\n");
          if (expect && code[0] !== expect) throw new Error("SMTP: " + lines[i]);
          return code;
        }
      }
      const { value, done } = await withTimeout(reader.read(), 10000, "read");
      if (value) buf += dec.decode(value);
      if (done) throw new Error("SMTP: conexiune închisă");
    }
  }
  async function cmd(line, expect) {
    await withTimeout(writer.write(enc.encode(line + "\r\n")), 10000, "write");
    return readReply(expect);
  }
  // Curăță valorile ce intră în anteturi (fără CR/LF → fără injecție de anteturi).
  const cFrom = cleanHeader(from), cTo = cleanHeader(to), cReply = cleanHeader(replyTo);
  try {
    await readReply("2");                 // 220 salut
    await cmd("EHLO mrdtf.ro", "2");
    await cmd("AUTH LOGIN", "3");
    await cmd(b64utf8(user), "3");
    await cmd(b64utf8(pass), "2");         // 235 autentificat
    await cmd("MAIL FROM:<" + emailAddr(cFrom) + ">", "2");
    await cmd("RCPT TO:<" + emailAddr(cTo) + ">", "2");
    await cmd("DATA", "3");                // 354
    const headers =
      "From: " + cFrom + "\r\n" +
      "To: " + cTo + "\r\n" +
      (cReply ? "Reply-To: " + cReply + "\r\n" : "") +
      "Subject: =?UTF-8?B?" + b64utf8(subject) + "?=\r\n" +
      "Date: " + new Date().toUTCString() + "\r\n" +
      "MIME-Version: 1.0\r\n" +
      "Content-Type: text/html; charset=UTF-8\r\n\r\n";
    // dot-stuffing + CRLF
    const body = String(html || text || "").replace(/\r?\n/g, "\r\n").replace(/\r\n\./g, "\r\n..");
    await withTimeout(writer.write(enc.encode(headers + body + "\r\n.\r\n")), 10000, "data");
    await readReply("2");                  // 250 acceptat
    try { await cmd("QUIT"); } catch { /* ignore */ }
    return true;
  } finally {
    try { await writer.close(); } catch { /* ignore */ }
    try { reader.releaseLock(); } catch { /* ignore */ }
    try { await socket.close(); } catch { /* ignore */ }
  }
}

// Alege metoda de trimitere: SMTP propriu dacă e configurat, altfel Resend.
// Destinatar: msg.to dacă e dat, altfel adresa proprie (NOTIFY_EMAIL / SMTP_USER).
async function sendMail(env, msg) {
  const to = msg.to || env.NOTIFY_EMAIL || env.SMTP_USER;
  if (!to) return false;
  const from = env.NOTIFY_FROM || env.SMTP_FROM || env.SMTP_USER || "MrDTF <onboarding@resend.dev>";
  try {
    if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
      return await smtpSend(env, { to, from, subject: msg.subject, html: msg.html, text: msg.text, replyTo: msg.replyTo });
    }
    if (env.RESEND_API_KEY) {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: "Bearer " + env.RESEND_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ from, to: [to], reply_to: msg.replyTo, subject: msg.subject, html: msg.html, text: msg.text }),
      });
      return r.ok;
    }
  } catch { /* best-effort — nu blocăm răspunsul */ }
  return false;
}

async function notifyNewMessage(env, msg) {
  try {
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
    return await sendMail(env, { subject, html, text, replyTo: msg.email });
  } catch { return false; }
}

// Notificare email pentru o comandă nouă (SMTP propriu sau Resend, via sendMail).
// Întoarce true dacă emailul a fost trimis, false dacă e neconfigurat sau a eșuat.
async function notifyNewOrder(env, order) {
  try {
    const esc = (s) => String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const bt = order.billingType === "pj" ? "persoană juridică" : "persoană fizică";
    const pret = order.total ? (order.total + " lei" + (order.pretMl ? " (" + order.pretMl + " lei/ml)" : "")) : "—";
    const rows = [
      ["Nume", order.name || "—"],
      ["Telefon", order.phone || "—"],
      ["Email", order.email || "—"],
      ["Lățime", (order.width || "—") + " cm"],
      ["Metri liniari", (order.meters || "—") + " ml"],
      ["Preț estimat", pret],
      ["Facturare", bt],
    ].map((r) => "<tr><td style=\"padding:4px 12px 4px 0;color:#666\">" + esc(r[0]) +
      "</td><td style=\"padding:4px 0\"><strong>" + esc(r[1]) + "</strong></td></tr>").join("");
    const link = order.graphicsLink
      ? "<p style=\"margin:12px 0\">Link grafică: <a href=\"" + esc(order.graphicsLink) + "\">" + esc(order.graphicsLink) + "</a></p>" : "";
    const billing = order.billing
      ? "<div style=\"padding:12px;background:#f5f5f7;border-radius:8px;white-space:pre-wrap;margin-bottom:10px\"><strong>Date facturare:</strong>\n" + esc(order.billing) + "</div>" : "";
    const note = order.note
      ? "<div style=\"padding:12px;background:#fff8e1;border-radius:8px;white-space:pre-wrap\"><strong>Detalii:</strong>\n" + esc(order.note) + "</div>" : "";
    const subject = "🧾 Comandă nouă DTF — " + (order.name || order.phone || order.id);
    const html = "<div style=\"font-family:Arial,sans-serif;font-size:15px;color:#222\">" +
      "<h2 style=\"margin:0 0 12px\">Comandă nouă de pe site</h2>" +
      "<table style=\"border-collapse:collapse;margin-bottom:14px\">" + rows + "</table>" +
      link + billing + note +
      "<p style=\"margin-top:16px;color:#888;font-size:13px\">Vezi toate comenzile în panoul admin → Comenzi.</p></div>";
    const text = "Comandă nouă DTF\n\nNume: " + (order.name || "") + "\nTelefon: " + (order.phone || "") +
      "\nLățime: " + (order.width || "") + " cm\nMetri: " + (order.meters || "") + " ml\nPreț estimat: " + pret +
      "\nFacturare (" + bt + "):\n" + (order.billing || "") + "\n\nLink grafică: " + (order.graphicsLink || "—") +
      "\nDetalii: " + (order.note || "—");
    return await sendMail(env, { subject, html, text, replyTo: order.email || undefined });
  } catch { return false; }
}

// Email de confirmare către CLIENT (cumpărător). Întoarce true dacă a fost trimis.
async function sendOrderConfirmation(env, order) {
  try {
    if (!order.email) return false;
    const biz = env.NOTIFY_EMAIL || env.SMTP_USER || "comenzi@unilevelnetwork.ro";
    const esc = (s) => String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const pret = order.total ? (order.total + " lei" + (order.pretMl ? " (" + order.pretMl + " lei/ml)" : "")) : "—";
    const rows = [
      ["Lățime", (order.width || "—") + " cm"],
      ["Metri liniari", (order.meters || "—") + " ml"],
      ["Preț estimat", pret],
    ].map((r) => "<tr><td style=\"padding:4px 12px 4px 0;color:#666\">" + esc(r[0]) +
      "</td><td style=\"padding:4px 0\"><strong>" + esc(r[1]) + "</strong></td></tr>").join("");
    const subject = "Am primit comanda ta — Mr.DTF";
    const html = "<div style=\"font-family:Arial,sans-serif;font-size:15px;color:#222\">" +
      "<h2 style=\"margin:0 0 12px\">Mulțumim" + (order.name ? ", " + esc(order.name) : "") + "! 🎉</h2>" +
      "<p>Am primit comanda ta de transfer DTF. Te contactăm în cel mai scurt timp pentru confirmare și factură. " +
      "Comanda intră în producție după achitarea facturii.</p>" +
      "<table style=\"border-collapse:collapse;margin:12px 0 14px\">" + rows + "</table>" +
      "<p style=\"color:#888;font-size:13px\">Prețul este orientativ și nu include TVA. Pentru orice întrebare, răspunde la acest e-mail sau scrie-ne la " + esc(biz) + ".</p>" +
      "<p style=\"margin-top:16px\">Echipa Mr.DTF</p></div>";
    const text = "Multumim" + (order.name ? ", " + order.name : "") + "!\n\nAm primit comanda ta de transfer DTF. Te contactam in cel mai scurt timp pentru confirmare si factura.\n\n" +
      "Latime: " + (order.width || "—") + " cm\nMetri: " + (order.meters || "—") + " ml\nPret estimat: " + pret +
      "\n\nPentru intrebari, raspunde la acest e-mail sau scrie-ne la " + biz + ".\n\nEchipa Mr.DTF";
    return await sendMail(env, { to: order.email, subject, html, text, replyTo: biz });
  } catch { return false; }
}

async function handleMessages(request, env, segs, ctx) {
  // segs: ["messages"] | ["messages", id] | ["messages", "count"]
  const id = segs[1];

  // POST /api/messages — trimitere mesaj din formularul de contact (public)
  if (!id && request.method === "POST") {
    if (!env.CONTENT) return err("Stocare neconfigurată.", 503);
    if (await rateLimited(env, "msg", clientIp(request), 5, 60)) return err("Prea multe mesaje într-un timp scurt. Încearcă din nou în câteva minute.", 429);
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
  // Injectăm conținutul editabil (contact, firmă, prețuri, TikTok, galerie) direct
  // în <head>, ca pagina să-l aibă imediat (fără request suplimentar / fără FOUC).
  let payload = "{}";
  try {
    const c = await getContent(env);
    payload = JSON.stringify({ site: c.site || {}, tiktok: c.tiktok || {}, social: c.social || {} })
      .replace(/</g, "\\u003c");
  } catch { /* fallback: valorile statice din HTML */ }

  class Head {
    element(el) {
      el.append("<script>window.__MRDTF__=" + payload + ";</script>", { html: true });
    }
  }
  return new HTMLRewriter().on("head", new Head()).transform(res);
}

// Pagini de produs „pretty URL" (/produs/<slug>) — servesc același template,
// iar JS-ul din pagină alege produsul după slug-ul din path.
async function serveProductPage(request, env) {
  // Cerem directorul canonic „/produs/" (servit direct cu 200). NU „/produs/index.html",
  // pe care Cloudflare îl redirecționează la „/produs/" → ar crea o buclă de redirect.
  const u = new URL(request.url);
  u.pathname = "/produs/";
  u.search = "";
  const res = await env.ASSETS.fetch(new Request(u.toString(), { method: "GET" }));
  const headers = new Headers(res.headers);
  headers.set("Content-Type", "text/html; charset=utf-8");
  headers.set("Cache-Control", "no-cache");
  // forțăm 200 ca să nu propagăm vreun eventual redirect (ar bucla)
  return new Response(res.body, { status: 200, statusText: "OK", headers });
}

// ---- Pagină publică ofertă (/oferta/:id) în stilul temei ----
async function serveOfferPage(request, env, id) {
  if (!env.CONTENT || !id) return new Response("Ofertă inexistentă.", { status: 404 });
  const o = await env.CONTENT.get(OFFER_PREFIX + id, "json");
  if (!o) return new Response("Ofertă inexistentă.", { status: 404 });
  let site = {};
  try { const c = await getContent(env); site = c.site || {}; } catch { /* fallback */ }
  const co = site.company || {};
  const esc = escHtml;
  const money = (n) => (Number(n) || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ".") + " lei";
  const d = new Date(o.createdAt);
  const dateStr = isNaN(d) ? "" : d.toLocaleDateString("ro-RO");
  const valid = (o.validUntil ? new Date(o.validUntil) : new Date((isNaN(d) ? Date.now() : d.getTime()) + (o.validity || 14) * 86400000)).toLocaleDateString("ro-RO");
  const rows = (o.items || []).map((it, i) => (
    "<tr><td>" + (i + 1) + "</td><td>" + esc(it.desc) + "</td><td class=\"r\">" + esc(it.qty) +
    "</td><td class=\"r\">" + money(it.price) + "</td><td class=\"r\">" + money(it.qty * it.price) + "</td></tr>"
  )).join("");
  const clientLines = [
    o.client && o.client.company ? esc(o.client.company).replace(/\n/g, "<br>") : "",
    o.client && o.client.name ? "<strong>" + esc(o.client.name) + "</strong>" : "",
    o.client && o.client.email ? esc(o.client.email) : "",
    o.client && o.client.phone ? esc(o.client.phone) : "",
  ].filter(Boolean).join("<br>");
  const html = `<!DOCTYPE html><html lang="ro"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Ofertă ${esc(o.number)} — Mr.DTF</title>
<meta name="robots" content="noindex">
<style>
:root{--ink:#0f0f10;--mute:#5c5c63;--y:#ffc800;--bg:#f5f5f7}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font-family:-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;line-height:1.55}
.sheet{max-width:820px;margin:24px auto;background:#fff;border-radius:22px;box-shadow:0 20px 60px rgba(0,0,0,.1);overflow:hidden}
.top{display:flex;justify-content:space-between;align-items:flex-start;gap:20px;padding:28px 32px;background:linear-gradient(180deg,#fff,#fafafa);border-bottom:3px solid var(--y);flex-wrap:wrap}
.top img{height:54px}
.badge{text-align:right}.badge h1{margin:0;font-size:26px;letter-spacing:-.02em}.badge .n{color:var(--mute);font-size:14px;margin-top:4px}
.meta{display:flex;flex-wrap:wrap;gap:22px;padding:20px 32px;border-bottom:1px solid #eee}
.meta .box{flex:1 1 240px}.meta h4{margin:0 0 6px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--mute)}
.meta p{margin:0;font-size:14.5px}
table{width:100%;border-collapse:collapse;margin:0}
th,td{padding:12px 14px;text-align:left;font-size:14.5px;border-bottom:1px solid #eee}
th{background:#faf7ea;font-size:12px;letter-spacing:.04em;text-transform:uppercase;color:#7a6b2e}
td.r,th.r{text-align:right;white-space:nowrap}
thead th:first-child,tbody td:first-child{width:34px;color:var(--mute)}
.tot{margin-left:auto;width:min(340px,100%);padding:16px 32px}
.tot .row{display:flex;justify-content:space-between;padding:6px 0;font-size:15px}
.tot .row.grand{border-top:2px solid var(--y);margin-top:8px;padding-top:12px;font-size:20px;font-weight:800}
.notes{padding:0 32px 10px;color:var(--mute);font-size:14px;white-space:pre-wrap}
.foot{padding:20px 32px 30px;color:var(--mute);font-size:13px;border-top:1px solid #eee}
.bar{max-width:820px;margin:0 auto 24px;display:flex;gap:10px;justify-content:flex-end;padding:0 8px}
.btn{cursor:pointer;border:none;border-radius:12px;padding:12px 22px;font:inherit;font-weight:700;font-size:15px;background:#111;color:#fff;text-decoration:none;display:inline-flex;align-items:center;gap:8px}
@media print{.bar{display:none}body{background:#fff}.sheet{box-shadow:none;margin:0;max-width:100%;border-radius:0}}
</style></head><body>
<div class="bar"><button class="btn" onclick="window.print()">⎙ Printează / Salvează PDF</button></div>
<div class="sheet">
  <div class="top">
    <img src="${esc(site.logo || "/assets/img/logo-mrdtf.png")}" alt="Mr.DTF">
    <div class="badge"><h1>Ofertă</h1><div class="n">Nr. ${esc(o.number)} · ${esc(dateStr)}</div><div class="n">Valabilă până la ${esc(valid)}</div></div>
  </div>
  <div class="meta">
    <div class="box"><h4>De la</h4><p><strong>${esc(co.name || "Mr.DTF")}</strong>${co.cui ? "<br>CUI: " + esc(co.cui) : ""}${co.reg ? "<br>Reg. Com.: " + esc(co.reg) : ""}${co.address ? "<br>" + esc(co.address) : ""}${site.phone ? "<br>" + esc(site.phoneDisplay || site.phone) : ""}${site.email ? "<br>" + esc(site.email) : ""}</p></div>
    <div class="box"><h4>Pentru</h4><p>${clientLines || "—"}</p></div>
  </div>
  <table><thead><tr><th>#</th><th>Descriere</th><th class="r">Metri liniari</th><th class="r">Preț/m.l.</th><th class="r">Valoare</th></tr></thead><tbody>${rows}</tbody></table>
  <div class="tot">
    <div class="row"><span>Subtotal</span><span>${money(o.net)}</span></div>
    ${o.discountPercent ? '<div class="row" style="color:#c0392b"><span>Discount (' + esc(o.discountPercent) + '%)</span><span>− ' + money(o.discount) + "</span></div>" : ""}
    ${o.vatRate ? '<div class="row"><span>TVA (' + esc(o.vatRate) + '%)</span><span>' + money(o.vat) + "</span></div>" : '<div class="row"><span>TVA</span><span>neaplicabil</span></div>'}
    <div class="row grand"><span>Total</span><span>${money(o.total)}</span></div>
  </div>
  ${o.notes ? '<div class="notes"><strong>Mențiuni:</strong>\n' + esc(o.notes) + "</div>" : ""}
  <div class="foot">Mulțumim pentru interes! Pentru confirmare, răspunde la ${esc(site.email || "comenzi@unilevelnetwork.ro")} sau sună la ${esc(site.phoneDisplay || site.phone || "")}.<br>Prețurile ${o.vatRate ? "includ" : "nu includ"} TVA conform celor de mai sus. Oferta are caracter orientativ și poate fi ajustată în funcție de specificațiile finale.</div>
</div>
</body></html>`;
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
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
    || path.startsWith("/oferta/")
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
<div class="contact">Contact: <a href="mailto:comenzi@unilevelnetwork.ro">comenzi@unilevelnetwork.ro</a></div>
</div></body></html>`;
  return new Response(html, {
    status: 503,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "Retry-After": "3600" },
  });
}

// ---- Follow-up oferte: reminder email cu ~3-4 zile înainte de expirare ----
async function sendOfferReminder(env, o, daysLeft, site) {
  const esc = escHtml;
  const money = (n) => (Number(n) || 0).toFixed(2) + " lei";
  const link = "https://mrdtf.ro/oferta/" + o.id;
  const cl = o.client || {};
  const validStr = new Date(o.validUntil).toLocaleDateString("ro-RO");
  const when = daysLeft <= 0 ? "astăzi" : ("în " + daysLeft + " " + (daysLeft === 1 ? "zi" : "zile"));
  const companyLine = cl.company ? " (" + esc(String(cl.company).split("\n")[0]) + ")" : "";
  const subject = "⏰ Follow-up: oferta " + o.number + " expiră " + when;
  const html = "<div style=\"font-family:Arial,sans-serif;font-size:15px;color:#222\">" +
    "<h2 style=\"margin:0 0 10px\">Follow-up ofertă</h2>" +
    "<p>Oferta <strong>" + esc(o.number) + "</strong> expiră <strong>" + esc(when) + "</strong> (valabilă până la " + esc(validStr) + ").</p>" +
    "<p>Client: <strong>" + esc(cl.name || "—") + "</strong>" + companyLine + "<br>" + (cl.email ? esc(cl.email) : "") + (cl.phone ? " · " + esc(cl.phone) : "") + "</p>" +
    "<p>Total ofertă: <strong>" + money(o.total) + "</strong></p>" +
    "<p><a href=\"" + link + "\" style=\"background:#111;color:#fff;padding:10px 20px;border-radius:10px;text-decoration:none;display:inline-block;font-weight:700\">Vezi oferta ↗</a></p>" +
    "<p style=\"color:#888;font-size:13px\">Contactează clientul pentru follow-up înainte să expire oferta.</p></div>";
  const text = "Follow-up: oferta " + o.number + " expiră " + when + " (până la " + validStr + ").\n" +
    "Client: " + (cl.name || "—") + " " + (cl.email || "") + " " + (cl.phone || "") + "\nTotal: " + money(o.total) + "\nOfertă: " + link;
  return sendMail(env, { subject, html, text });
}
async function remindExpiringOffers(env) {
  if (!env.CONTENT) return;
  const now = Date.now();
  let site = {};
  try { const c = await getContent(env); site = c.site || {}; } catch { /* fallback */ }
  let cursor;
  do {
    const res = await env.CONTENT.list({ prefix: OFFER_PREFIX, cursor });
    for (const k of res.keys) {
      const o = await env.CONTENT.get(k.name, "json");
      if (!o || o.reminded || !o.validUntil) continue;
      const ms = new Date(o.validUntil).getTime();
      if (isNaN(ms)) continue;
      const daysLeft = Math.ceil((ms - now) / 86400000);
      if (daysLeft <= 4 && daysLeft >= 0) {
        const ok = await sendOfferReminder(env, o, daysLeft, site);
        if (ok) { o.reminded = true; await env.CONTENT.put(k.name, JSON.stringify(o)); }
      }
    }
    cursor = res.list_complete ? null : res.cursor;
  } while (cursor);
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // Preview pentru proprietar: /?preview=<token> setează un cookie care ocolește
      // mentenanța (publicul rămâne pe pagina de construcție). /?preview=off iese.
      // Tokenul e secret (derivat din JWT_SECRET) — îl iei din admin, nu e „on".
      const pv = url.searchParams.get("preview");
      const ptok = await previewToken(env);
      if (pv === "off") {
        return new Response(null, { status: 302, headers: { "Location": url.origin + path, "Set-Cookie": "mrdtf_preview=; Path=/; Max-Age=0" } });
      }
      if (pv && pv === ptok) {
        return new Response(null, { status: 302, headers: { "Location": url.origin + path, "Set-Cookie": "mrdtf_preview=" + ptok + "; Path=/; Max-Age=604800; SameSite=Lax" } });
      }
      const hasPreview = (request.headers.get("Cookie") || "").indexOf("mrdtf_preview=" + ptok) !== -1;

      // Mod mentenanță — blochează paginile publice; admin, API, asset-urile și preview rămân accesibile.
      if (request.method === "GET" && !isMaintenanceExempt(path) && !hasPreview) {
        const m = await maintenanceState(env);
        if (m.enabled) return maintenancePage(m);
      }

      if (path.startsWith("/api/")) {
        const apiResponse = await (async () => {
        if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
        const segs = path.replace(/^\/api\//, "").replace(/\/+$/, "").split("/");

        if (segs[0] === "status" && request.method === "GET") {
          return json({
            ok: true,
            kv: !!env.CONTENT,
            files: !!env.CONTENT,
            auth: !!(env.JWT_SECRET && env.ADMIN_PASSWORD),
            // Notificări email active (SMTP propriu sau Resend).
            email: !!((env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) || (env.RESEND_API_KEY && env.NOTIFY_EMAIL)),
            emailMethod: (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) ? "smtp" : (env.RESEND_API_KEY ? "resend" : "none"),
          });
        }

        if (segs[0] === "login" && request.method === "POST") {
          if (!env.ADMIN_PASSWORD || !env.JWT_SECRET) return err("Admin neconfigurat: setează ADMIN_PASSWORD și JWT_SECRET.", 503);
          if (await rateLimited(env, "login", clientIp(request), 8, 300)) return err("Prea multe încercări. Așteaptă câteva minute și încearcă din nou.", 429);
          const body = await request.json().catch(() => ({}));
          if (!body.password || !timingSafeEqual(body.password, env.ADMIN_PASSWORD)) return err("Parolă greșită.", 401);
          return json({ token: await signJWT({ role: "admin" }, env.JWT_SECRET, 12 * 3600) });
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
            let type = (res.metadata && res.metadata.type) || "application/octet-stream";
            // Nu servim niciodată SVG ca atare (poate conține script); îl forțăm la download.
            const isSvg = /svg/i.test(type);
            return new Response(res.value, {
              headers: {
                "Content-Type": isSvg ? "application/octet-stream" : type,
                "Cache-Control": "public, max-age=31536000, immutable",
                "X-Content-Type-Options": "nosniff",
                "Content-Security-Policy": "default-src 'none'; sandbox",
                "Content-Disposition": isSvg ? "attachment" : "inline",
              },
            });
          }
          // POST /api/media — încărcare imagine (auth)
          if (!mid && request.method === "POST") {
            if (!(await requireAuth(request, env))) return err("Neautorizat.", 401);
            if (!env.CONTENT) return err("KV neconfigurat.", 503);
            const form = await request.formData();
            const file = form.get("file");
            if (!file || typeof file === "string" || !file.size) return err("Fără fișier.");
            if (file.size > MAX_IMG_BYTES) return err("Imagine prea mare (max " + MAX_IMG_MB + " MB).");
            const abuf = await file.arrayBuffer();
            const realType = sniffImageType(abuf);
            if (!realType) return err("Doar imagini PNG, JPEG, WEBP sau GIF sunt permise.");
            const id = genId();
            await env.CONTENT.put(MEDIA_PREFIX + id, abuf,
              { metadata: { type: realType, name: String(file.name || "").slice(0, 80) } });
            return json({ ok: true, id, url: "/api/media/" + id });
          }
          return err("Endpoint inexistent.", 404);
        }

        // POST /api/design — upload design client (public, doar imagini). Stocat ca media.
        if (segs[0] === "design" && !segs[1] && request.method === "POST") {
          if (!env.CONTENT) return err("Stocare neconfigurată.", 503);
          if (await rateLimited(env, "design", clientIp(request), 12, 300)) return err("Prea multe încărcări într-un timp scurt. Încearcă din nou în câteva minute.", 429);
          const form = await request.formData();
          const file = form.get("file");
          if (!file || typeof file === "string" || !file.size) return err("Fără fișier.");
          if (file.size > MAX_IMG_BYTES) return err("Imagine prea mare (max " + MAX_IMG_MB + " MB).");
          const abuf = await file.arrayBuffer();
          const realType = sniffImageType(abuf);
          if (!realType) return err("Doar imagini PNG, JPEG, WEBP sau GIF sunt permise.");
          const id = genId();
          await env.CONTENT.put(MEDIA_PREFIX + id, abuf,
            { metadata: { type: realType, name: String(file.name || "design").slice(0, 80) } });
          return json({ ok: true, id, url: "/api/media/" + id });
        }

        return err("Endpoint inexistent.", 404);
        })();
        // CORS: permite doar aceeași origine (nu „*"). Răspunsurile fără antet
        // CORS (imagini, descărcări) rămân neatinse.
        const reqOrigin = request.headers.get("Origin");
        const allowOrigin = (reqOrigin && reqOrigin === url.origin) ? reqOrigin : url.origin;
        const ch = new Headers(apiResponse.headers);
        if (ch.has("Access-Control-Allow-Origin")) { ch.set("Access-Control-Allow-Origin", allowOrigin); ch.append("Vary", "Origin"); }
        return new Response(apiResponse.body, { status: apiResponse.status, statusText: apiResponse.statusText, headers: ch });
      }

      if (path === "/" || path === "/index.html") return serveHome(request, env);
      if (path.startsWith("/oferta/")) return serveOfferPage(request, env, decodeURIComponent(path.slice(8)));

      // Pagini vechi eliminate în tema nouă → redirect permanent la homepage.
      if (path === "/produs" || path.startsWith("/produs/")
        || path === "/produse" || path.startsWith("/produse/")
        || path === "/cont" || path.startsWith("/cont/")
        || path === "/intrebari-frecvente" || path.startsWith("/intrebari-frecvente/")) {
        return Response.redirect(url.origin + "/", 301);
      }
      // Slug-uri legale vechi → noile pagini din temă.
      const legalMap = {
        "/termeni": "/termeni-si-conditii",
        "/confidentialitate": "/politica-de-confidentialitate",
        "/livrare": "/politica-de-livrare",
        "/retur": "/politica-de-retur",
      };
      for (const oldp in legalMap) {
        if (path === oldp || path === oldp + "/") return Response.redirect(url.origin + legalMap[oldp], 301);
      }

      return serveAsset(request, env);
    } catch (e) {
      if (!path.startsWith("/api/")) return env.ASSETS.fetch(request);
      console.error("Eroare server:", (e && (e.stack || e.message)) || e);
      return err("A apărut o eroare internă. Încearcă din nou.", 500);
    }
  },

  // Cron — reîmprospătează videoclipurile TikTok (dacă e conectat)
  async scheduled(event, env, ctx) {
    ctx.waitUntil(tiktokSyncVideos(env).catch(() => {}));
    ctx.waitUntil(remindExpiringOffers(env).catch(() => {}));
  },
};
