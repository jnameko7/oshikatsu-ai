import fs from "node:fs";
import path from "node:path";

const TEMPLATE_PATH = path.join(process.cwd(), "index.html");
const ENDPOINT = "articles";

export default async function handler(req, res) {
  let html;
  try {
    html = fs.readFileSync(TEMPLATE_PATH, "utf8");
  } catch (error) {
    console.error("home template read error", error);
    return res.status(500).send("トップページを表示できませんでした。");
  }

  try {
    const config = getConfig();
    if (!config) throw new Error("microCMS environment variables are missing");

    const articles = await fetchAllArticles(config);
    const latest = articles.slice(0, 4);

    html = replaceMarker(
      html,
      "SSR_RANKING",
      latest.length ? latest.map(renderLatestRanking).join("") : fallbackLatestRanking()
    );

    // ページ下部の最新記事欄も、同じ新着順データを使用します。
    html = replaceMarker(
      html,
      "SSR_LATEST",
      articles.slice(0, 8).map(renderLatestCard).join("") || fallbackLatestCards()
    );

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    // 記事公開後に古い一覧が長時間残らないよう短めに設定
    res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
    return res.status(200).send(html);
  } catch (error) {
    console.error("home-page article fetch error", error);
    // API取得失敗時でもページ全体は表示し、固定の案内だけ出す
    html = replaceMarker(html, "SSR_RANKING", fallbackLatestRanking());
    html = replaceMarker(html, "SSR_LATEST", fallbackLatestCards());
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).send(html);
  }
}

function getConfig() {
  const serviceDomain = process.env.MICROCMS_SERVICE_DOMAIN;
  const apiKey = process.env.MICROCMS_API_KEY;
  return serviceDomain && apiKey ? { serviceDomain, apiKey } : null;
}

async function fetchAllArticles({ serviceDomain, apiKey }) {
  const limit = 100;
  const all = [];
  let offset = 0;
  let total = Infinity;

  while (offset < total) {
    const url = `https://${serviceDomain}.microcms.io/api/v1/${ENDPOINT}?limit=${limit}&offset=${offset}&orders=-publishedAt`;
    const response = await fetch(url, {
      headers: { "X-MICROCMS-API-KEY": apiKey }
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`microCMS ${response.status}: ${detail.slice(0, 200)}`);
    }

    const data = await response.json();
    const contents = Array.isArray(data.contents) ? data.contents : [];
    all.push(...contents);
    total = Number(data.totalCount ?? all.length);
    if (!contents.length) break;
    offset += contents.length;
  }

  const now = Date.now();
  return all
    .filter(article => {
      const published = article.publishDate || article["予約公開日時"] || article.publishedAt || article.createdAt;
      if (!published) return true;
      const time = new Date(published).getTime();
      return Number.isNaN(time) || time <= now;
    })
    .sort((a, b) => articleTime(b) - articleTime(a));
}

function articleTime(article) {
  const value = article.publishDate || article["予約公開日時"] || article.publishedAt || article.createdAt || article.updatedAt;
  const time = value ? new Date(value).getTime() : 0;
  return Number.isNaN(time) ? 0 : time;
}

function renderLatestRanking(article, index) {
  const title = plain(article.title || article.name || "お役立ち記事");
  const slug = normalizeSlug(article.slug || article.urlSlug || article.url_slug || article.permalink || article.id);
  const href = `/article?id=${encodeURIComponent(slug)}`;
  const image = getImage(article);
  const tags = getTags(article).slice(0, 2);
  const thumb = image
    ? `<div class="thumb"><img src="${attr(image)}" alt="${attr(title)}" loading="lazy" decoding="async"></div>`
    : `<div class="thumb pouch"></div>`;

  return `<a class="topv3-rank-item" href="${href}"><span>${index + 1}</span>${thumb}<div><h3>${esc(title)}</h3><p>${(tags.length ? tags : ["推し活", "最新記事"]).map(tag => `<b>${esc(tag)}</b>`).join("")}</p></div><i></i></a>`;
}

function renderLatestCard(article) {
  const title = plain(article.title || article.name || "お役立ち記事");
  const slug = normalizeSlug(article.slug || article.urlSlug || article.url_slug || article.permalink || article.id);
  const href = `/article?id=${encodeURIComponent(slug)}`;
  const image = getImage(article);
  const desc = plain(article.description || article.summary || article.excerpt || article.lead || article.intro || "").slice(0, 55);
  return `<a class="topv3-latest-card" href="${href}">${image ? `<img src="${attr(image)}" alt="${attr(title)}" loading="lazy" decoding="async">` : "<span></span>"}<strong>${esc(title)}</strong>${desc ? `<small>${esc(desc)}</small>` : ""}</a>`;
}

function getImage(article) {
  const candidates = [
    article.image,
    article.eyecatch,
    article.thumbnail,
    article.eyecatchUrl,
    article.eyeCatchUrl,
    article.thumbnailUrl,
    article.imageUrl,
    article.coverImage,
    article.mainImage,
    article.featuredImage,
    article.ogImage
  ];
  for (const value of candidates) {
    const url = imageUrl(value);
    if (url) return url;
  }
  return "";
}

function replaceMarker(html, name, content) {
  const pattern = new RegExp(`<!-- ${name}_START -->[\\s\\S]*?<!-- ${name}_END -->`);
  if (!pattern.test(html)) throw new Error(`${name} marker not found`);
  return html.replace(pattern, `<!-- ${name}_START -->${content}<!-- ${name}_END -->`);
}

function fallbackLatestRanking() {
  return `<a class="topv3-rank-item" href="/articles"><span>1</span><div class="thumb pouch"></div><div><h3>最新記事を一覧から見る</h3><p><b>推し活</b><b>最新記事</b></p></div><i></i></a>`;
}

function fallbackLatestCards() {
  return `<a class="topv3-latest-card" href="/articles"><span></span><strong>最新記事を一覧から見る</strong><small>ライブ遠征・節約・ホテルなどの記事を掲載しています。</small></a>`;
}

function getTags(article) {
  const raw = article && article.tags;
  if (!raw) return [];
  const list = Array.isArray(raw) ? raw : typeof raw === "string" ? raw.split(/[、,\s]+/) : [raw];
  return [...new Set(list.map(label).filter(Boolean))];
}

function label(value) {
  if (!value) return "";
  if (typeof value === "object") return plain(value.name || value.label || value.title || value.value || value.id || "");
  return plain(value);
}

function imageUrl(value) {
  return typeof value === "string" ? value : (value && value.url) || "";
}

function normalizeSlug(value) {
  let slug = String(value || "").trim();
  try { slug = decodeURIComponent(slug); } catch {}
  return slug
    .replace(/^https?:\/\/[^/]+/i, "")
    .replace(/^\/?article(?:\.html)?\/?/i, "")
    .replace(/^\/+|\/+$/g, "")
    .replace(/\.html?$/i, "");
}

function plain(value) {
  return String(value || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function esc(value) {
  return String(value || "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}

function attr(value) {
  return esc(value);
}
