import fs from "node:fs";
import path from "node:path";

const TEMPLATE_PATH = path.join(process.cwd(), "templates", "home.html");

export default async function handler(req, res) {
  try {
    let html = fs.readFileSync(TEMPLATE_PATH, "utf8");
    const config = getConfig();
    const articles = config ? await fetchArticles(config, 12) : [];
    html = replaceMarker(html, "SSR_RANKING", articles.length ? articles.slice(0, 6).map(renderRanking).join("") : fallbackRanking());
    html = replaceMarker(html, "SSR_LATEST", articles.length ? articles.slice(0, 8).map(renderLatest).join("") : fallbackLatest());
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=86400");
    return res.status(200).send(html);
  } catch (error) {
    console.error("home SSR error", error);
    return res.status(500).send("トップページを表示できませんでした。");
  }
}

function getConfig() {
  const serviceDomain = process.env.MICROCMS_SERVICE_DOMAIN;
  const apiKey = process.env.MICROCMS_API_KEY;
  return serviceDomain && apiKey ? { serviceDomain, apiKey } : null;
}
async function fetchArticles({ serviceDomain, apiKey }, limit) {
  const url = `https://${serviceDomain}.microcms.io/api/v1/articles?limit=${limit}&orders=-publishedAt`;
  const response = await fetch(url, { headers: { "X-MICROCMS-API-KEY": apiKey } });
  if (!response.ok) throw new Error(`microCMS ${response.status}`);
  const data = await response.json();
  const now = Date.now();
  return (Array.isArray(data.contents) ? data.contents : []).filter(article => {
    const published = article.publishDate || article["予約公開日時"] || article.publishedAt || article.createdAt;
    return !published || new Date(published).getTime() <= now;
  });
}
function renderRanking(article, index) {
  const title = plain(article.title || article.name || "お役立ち記事");
  const slug = normalize(article.slug || article.urlSlug || article.url_slug || article.permalink || article.id);
  const image = imageUrl(article.thumbnail || article.image || article.eyecatch) || article.thumbnailUrl || article.imageUrl || "";
  const tags = getTags(article).slice(0, 2);
  const thumb = image ? `<div class="thumb"><img src="${attr(image)}" alt="${attr(title)}" loading="lazy" decoding="async"></div>` : `<div class="thumb pouch"></div>`;
  return `<a class="topv3-rank-item" href="/article?id=${encodeURIComponent(slug)}"><span>${index + 1}</span>${thumb}<div><h3>${esc(title)}</h3><p>${(tags.length ? tags : ["推し活", "お役立ち"]).map(tag => `<b>${esc(tag)}</b>`).join("")}</p></div><i></i></a>`;
}
function renderLatest(article) {
  const title = plain(article.title || article.name || "お役立ち記事");
  const slug = normalize(article.slug || article.urlSlug || article.url_slug || article.permalink || article.id);
  const image = imageUrl(article.thumbnail || article.image || article.eyecatch) || article.thumbnailUrl || article.imageUrl || "";
  const desc = plain(article.description || article.summary || article.excerpt || article.lead || "").slice(0, 55);
  return `<a class="topv3-latest-card" href="/article?id=${encodeURIComponent(slug)}">${image ? `<img src="${attr(image)}" alt="${attr(title)}" loading="lazy" decoding="async">` : "<span></span>"}<strong>${esc(title)}</strong>${desc ? `<small>${esc(desc)}</small>` : ""}</a>`;
}
function replaceMarker(html, name, content) {
  return html.replace(new RegExp(`<!-- ${name}_START -->[\\s\\S]*?<!-- ${name}_END -->`), `<!-- ${name}_START -->${content}<!-- ${name}_END -->`);
}
function fallbackRanking() { return `<a class="topv3-rank-item" href="/articles"><span>1</span><div class="thumb hotel"></div><div><h3>推し活のお役立ち記事を見る</h3><p><b>推し活</b><b>最新記事</b></p></div><i></i></a>`; }
function fallbackLatest() { return `<a class="topv3-latest-card" href="/articles"><span></span><strong>最新記事を一覧から見る</strong><small>ライブ遠征・節約・ホテルなどの記事を掲載しています。</small></a>`; }
function getTags(article) { const raw = article && article.tags; if (!raw) return []; const list = Array.isArray(raw) ? raw : typeof raw === "string" ? raw.split(/[、,\s]+/) : [raw]; return [...new Set(list.map(label).filter(Boolean))]; }
function label(value) { return typeof value === "object" && value ? plain(value.name || value.label || value.title || value.value || value.id || "") : plain(value); }
function imageUrl(value) { return typeof value === "string" ? value : (value && value.url) || ""; }
function normalize(value) { let result = String(value || "").trim(); try { result = decodeURIComponent(result); } catch {} return result.replace(/^https?:\/\/[^/]+/i, "").replace(/^\/?article(?:\.html)?\/?/i, "").replace(/^\/+|\/+$/g, "").replace(/\.html?$/i, ""); }
function plain(value) { return String(value || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(); }
function esc(value) { return String(value || "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]); }
function attr(value) { return esc(value); }
