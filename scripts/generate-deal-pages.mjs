import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const BASE_URL = "https://fyndaren.se";
const OUT_DIR = join(ROOT, "fynd");
const today = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Europe/Stockholm",
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
}).format(new Date());

const html = value => String(value ?? "").replace(/[&<>"']/g, ch => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[ch]));
const validHttps = value => {
  try {
    const url = new URL(String(value || ""));
    return url.protocol === "https:" ? url.href : "";
  } catch {
    return "";
  }
};
const slugify = value => String(value || "")
  .normalize("NFD")
  .replace(/\p{M}/gu, "")
  .toLocaleLowerCase("sv-SE")
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "")
  .slice(0, 90) || "erbjudande";
const money = value => Number(value).toLocaleString("sv-SE", {
  minimumFractionDigits: Number(value) % 1 ? 2 : 0,
  maximumFractionDigits: 2
}) + " kr";
const dateLabel = value => {
  if (!value) return "";
  const parsed = new Date(String(value).slice(0, 10) + "T12:00:00Z");
  return Number.isNaN(parsed.getTime()) ? String(value) : new Intl.DateTimeFormat("sv-SE", {
    day: "numeric", month: "long", year: "numeric", timeZone: "UTC"
  }).format(parsed);
};

const appHtml = readFileSync(join(ROOT, "app.html"), "utf8");
const supabaseUrl = appHtml.match(/const SUPABASE_URL='([^']+)'/)?.[1];
const publicKey = appHtml.match(/const SUPABASE_KEY='([^']+)'/)?.[1];
if (!supabaseUrl || !publicKey) throw new Error("Could not read the public Supabase configuration from app.html.");

const endpoint = new URL("/rest/v1/deals", supabaseUrl);
endpoint.searchParams.set("select", "id,store,name,category,price,old_price,unit_text,membership,affiliate_url,shop_url,valid_to,valid_until,checked_on,conditions,image_url");
endpoint.searchParams.set("or", "(valid_to.is.null,valid_to.gte." + today + ")");
endpoint.searchParams.set("order", "id.asc");

const response = await fetch(endpoint, {
  headers: {
    apikey: publicKey,
    Authorization: "Bearer " + publicKey,
    Accept: "application/json"
  },
  cache: "no-store"
});
if (!response.ok) throw new Error("Supabase deal read failed: HTTP " + response.status);
const rows = await response.json();
if (!Array.isArray(rows)) throw new Error("Supabase did not return a deal list.");

const active = rows.filter(deal => {
  const price = Number(deal.price);
  const end = deal.valid_to ? String(deal.valid_to).slice(0, 10) : "";
  return deal.id != null && deal.name && deal.store && Number.isFinite(price) && price > 0 && (!end || end >= today);
});

function makePage(deal) {
  const id = Number(deal.id);
  const slug = slugify(deal.store + " " + deal.name) + "-" + id;
  const canonical = BASE_URL + "/fynd/" + slug + "/";
  const image = validHttps(deal.image_url);
  const imageUrl = image || BASE_URL + "/icon-512.png";
  const retailer = validHttps(deal.affiliate_url) || validHttps(deal.shop_url);
  const isAffiliate = !!validHttps(deal.affiliate_url);
  const price = money(deal.price);
  const oldPrice = Number(deal.old_price);
  const previousPrice = Number.isFinite(oldPrice) && oldPrice > Number(deal.price)
    ? '<p class="old-price">Tidigare pris enligt kampanjuppgiften: <s>' + html(money(oldPrice)) + '</s></p>'
    : "";
  const expiry = deal.valid_to ? "Gäller till och med " + dateLabel(deal.valid_to) : String(deal.valid_until || "").trim();
  const checked = deal.checked_on ? "Senast kontrollerat " + dateLabel(deal.checked_on) : "";
  const conditions = String(deal.conditions || "").replace(/LAST_CHANCE_IMAGE/g, "").trim();
  const description = [
    deal.name + " hos " + deal.store + " för " + price + ".",
    expiry ? expiry + "." : "",
    checked ? checked + "." : ""
  ].filter(Boolean).join(" ").slice(0, 300);
  const retailerButton = retailer
    ? '<a class="primary" href="' + html(retailer) + '" target="_blank" rel="' +
      (isAffiliate ? "sponsored nofollow noopener noreferrer" : "noopener noreferrer") + '">' +
      (isAffiliate ? "Till butiken" : "Till erbjudandet") + ' ↗</a>'
    : "";

  return [
    '<!doctype html>',
    '<html lang="sv">',
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    '<title>' + html(deal.name) + ' hos ' + html(deal.store) + ' – ' + html(price) + ' | Fyndaren</title>',
    '<meta name="description" content="' + html(description) + '">',
    '<meta name="robots" content="index,follow">',
    '<link rel="canonical" href="' + html(canonical) + '">',
    '<meta name="theme-color" content="#090909">',
    '<meta property="og:type" content="website">',
    '<meta property="og:site_name" content="Fyndaren">',
    '<meta property="og:title" content="' + html(deal.name) + ' hos ' + html(deal.store) + ' – ' + html(price) + '">',
    '<meta property="og:description" content="' + html(description) + '">',
    '<meta property="og:url" content="' + html(canonical) + '">',
    '<meta property="og:image" content="' + html(imageUrl) + '">',
    '<meta property="og:image:alt" content="' + html(deal.name) + '">',
    '<meta name="twitter:card" content="summary_large_image">',
    '<meta name="twitter:title" content="' + html(deal.name) + ' hos ' + html(deal.store) + '">',
    '<meta name="twitter:description" content="' + html(description) + '">',
    '<meta name="twitter:image" content="' + html(imageUrl) + '">',
    '<style>',
    ':root{color-scheme:dark;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;background:#090909;color:#f7f7f7}',
    '*{box-sizing:border-box}body{margin:0;min-height:100vh;padding:28px 16px 48px;background:radial-gradient(100% 40% at 50% 0,rgba(212,175,55,.12),transparent 70%),#090909}',
    'main{max-width:720px;margin:0 auto}.brand{color:#e6ca65;font-weight:800;letter-spacing:.08em;text-decoration:none}',
    'article{margin-top:22px;padding:20px;border:1px solid rgba(212,175,55,.25);border-radius:22px;background:#141414;box-shadow:0 18px 55px rgba(0,0,0,.28)}',
    'img{display:block;width:100%;max-height:380px;object-fit:contain;background:#fff;border-radius:14px}',
    '.store{margin:20px 0 6px;color:#e6ca65;font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase}',
    'h1{margin:0 0 14px;font-size:clamp(24px,5vw,36px);line-height:1.2}',
    '.price{font-size:32px;font-weight:900;color:#f0d77e}.old-price{color:#bbb;font-size:14px;margin:5px 0 14px}',
    '.info{margin:14px 0;padding:12px;border:1px solid rgba(255,255,255,.09);border-radius:12px;color:#ddd;line-height:1.55}',
    '.actions{display:grid;gap:10px;margin-top:20px}.primary,.secondary{display:block;padding:14px 16px;border-radius:12px;text-align:center;text-decoration:none;font-weight:800}',
    '.primary{background:linear-gradient(135deg,#d4af37,#e6ca65);color:#090909}.secondary{border:1px solid rgba(230,202,101,.38);color:#e6ca65;background:rgba(255,255,255,.03)}',
    'footer{color:#999;line-height:1.5;margin-top:22px;font-size:12px}button{font:inherit;cursor:pointer}',
    '</style>',
    '</head>',
    '<body><main>',
    '<a class="brand" href="/">FYNDAREN</a>',
    '<article>',
    image ? '<img src="' + html(image) + '" alt="' + html(deal.name) + '" loading="eager">' : "",
    '<p class="store">' + html(deal.store) + ' · ' + html(deal.category || "") + '</p>',
    '<h1>' + html(deal.name) + '</h1>',
    '<div class="price">' + html(price) + '</div>',
    previousPrice,
    deal.unit_text ? '<p class="info"><b>Jämförpris:</b> ' + html(deal.unit_text) + '</p>' : "",
    deal.membership ? '<p class="info"><b>Medlemskap:</b> ' + html(deal.membership) + '</p>' : "",
    conditions ? '<p class="info"><b>Villkor:</b> ' + html(conditions) + '</p>' : "",
    expiry ? '<p class="info"><b>Giltighet:</b> ' + html(expiry) + '</p>' : "",
    checked ? '<p class="info">' + html(checked) + '</p>' : "",
    '<div class="actions">',
    retailerButton,
    '<a class="secondary" href="../../app.html?deal=' + encodeURIComponent(id) + '">Öppna fyndet i Fyndarens app</a>',
    '<button class="secondary" id="share" type="button">Dela detta fynd</button>',
    '</div>',
    '</article>',
    '<footer>Priser och villkor kan ändras. Kontrollera alltid uppgifterna hos butiken före köp. Vissa butikslänkar kan vara annonslänkar. Fyndaren kan få provision utan extra kostnad för dig.<br><a href="/integritetspolicy.html">Integritetspolicy</a> · <a href="/om-oss.html">Om Fyndaren</a></footer>',
    '</main>',
    '<script>',
    'const shareButton=document.getElementById("share");',
    'shareButton.addEventListener("click",async()=>{',
    '  const data={title:document.title,text:"Hitta erbjudandet på Fyndaren",url:location.href};',
    '  if(navigator.share){try{await navigator.share(data);return}catch(error){if(error&&error.name==="AbortError")return}}',
    '  try{await navigator.clipboard.writeText(location.href);shareButton.textContent="Länken kopierades"}catch(error){window.prompt("Kopiera länken:",location.href)}',
    '});',
    '</script>',
    '</body></html>'
  ].join("\\n");
}

rmSync(OUT_DIR, { recursive: true, force: true });
mkdirSync(OUT_DIR, { recursive: true });
const sitemapUrls = [
  BASE_URL + "/",
  BASE_URL + "/app.html",
  BASE_URL + "/om-oss.html",
  BASE_URL + "/integritetspolicy.html"
];

for (const deal of active) {
  const slug = slugify(deal.store + " " + deal.name) + "-" + Number(deal.id);
  const directory = join(OUT_DIR, slug);
  mkdirSync(directory, { recursive: true });
  writeFileSync(join(directory, "index.html"), makePage(deal), "utf8");
  sitemapUrls.push(BASE_URL + "/fynd/" + slug + "/");
}

const sitemap = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...sitemapUrls.map(url => "  <url><loc>" + html(url) + "</loc></url>"),
  '</urlset>'
].join("\\n");
writeFileSync(join(ROOT, "sitemap.xml"), sitemap, "utf8");
console.log("Generated " + active.length + " public offer pages and sitemap.xml for " + today + ".");
