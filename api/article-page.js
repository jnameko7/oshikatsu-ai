const SITE = "https://www.oshikatsu-kakeibo.com";
const GA_ID = "G-3CGGLYQE0X";

export default async function handler(req, res) {
  const rawKey = first(req.query.id || req.query.slug);
  const key = normalize(rawKey);
  if (!key || key === "undefined" || key === "null") return send404(res);

  const config = getConfig();
  if (!config) return res.status(503).send(errorPage("記事を取得できませんでした"));

  try {
    const article = await fetchArticle(config, key);
    if (!article || !isPublished(article)) return send404(res);

    const relatedPool = await fetchRecentArticles(config, 40);
    const html = renderArticle(article, relatedPool);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=86400");
    return res.status(200).send(html);
  } catch (error) {
    console.error("article SSR error", error);
    return res.status(500).send(errorPage("記事の表示中にエラーが発生しました"));
  }
}

function getConfig() {
  const serviceDomain = process.env.MICROCMS_SERVICE_DOMAIN;
  const apiKey = process.env.MICROCMS_API_KEY;
  return serviceDomain && apiKey ? { serviceDomain, apiKey } : null;
}

async function fetchArticle({ serviceDomain, apiKey }, key) {
  const headers = { "X-MICROCMS-API-KEY": apiKey };

  // microCMSのcontent IDで直接取得できる場合を最優先。
  try {
    const direct = await fetch(`https://${serviceDomain}.microcms.io/api/v1/articles/${encodeURIComponent(key)}`, { headers });
    if (direct.ok) return await direct.json();
  } catch {}

  // slugフィールドで絞り込み。
  try {
    const filter = encodeURIComponent(`slug[equals]${key}`);
    const response = await fetch(`https://${serviceDomain}.microcms.io/api/v1/articles?limit=1&filters=${filter}`, { headers });
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data.contents) && data.contents[0]) return data.contents[0];
    }
  } catch {}

  // 互換性のため全件をページングして検索。100件超でも動作。
  const all = await fetchAllArticles({ serviceDomain, apiKey });
  return all.find(article => articleKeys(article).includes(key)) || null;
}

async function fetchAllArticles({ serviceDomain, apiKey }) {
  const headers = { "X-MICROCMS-API-KEY": apiKey };
  const all = [];
  let offset = 0;
  let total = Infinity;
  const limit = 100;
  while (offset < total) {
    const response = await fetch(`https://${serviceDomain}.microcms.io/api/v1/articles?limit=${limit}&offset=${offset}&orders=-publishedAt`, { headers });
    if (!response.ok) throw new Error(`microCMS ${response.status}`);
    const data = await response.json();
    const contents = Array.isArray(data.contents) ? data.contents : [];
    all.push(...contents);
    total = Number(data.totalCount ?? all.length);
    if (!contents.length) break;
    offset += contents.length;
  }
  return all;
}

async function fetchRecentArticles({ serviceDomain, apiKey }, limit) {
  const response = await fetch(`https://${serviceDomain}.microcms.io/api/v1/articles?limit=${limit}&orders=-publishedAt`, {
    headers: { "X-MICROCMS-API-KEY": apiKey }
  });
  if (!response.ok) return [];
  const data = await response.json();
  return (Array.isArray(data.contents) ? data.contents : []).filter(isPublished);
}

function isPublished(article) {
  const d = article.publishDate || article["予約公開日時"] || article.publishedAt || article.createdAt;
  return !d || new Date(d).getTime() <= Date.now();
}

function renderArticle(article, pool) {
  const title = plain(article.title || article.name || "お役立ち記事");
  const desc = plain(article.seoDescription || article.description || article.summary || article.excerpt || title).slice(0, 160);
  const slug = normalize(article.slug || article.urlSlug || article.url_slug || article.permalink || article.id);
  const canonical = `${SITE}/article?id=${encodeURIComponent(slug)}`;
  const rawBody = article.body || article.content || article.articleBody || article.contentHtml || article.articleHtml || "<p>本文がありません。</p>";
  const body = sanitize(rawBody);
  const image = imageUrl(article.thumbnail || article.image || article.eyecatch) || article.thumbnailUrl || article.imageUrl || "";
  const category = label(article.category || article.genre) || "推し活コラム";
  const tags = getTags(article);
  const published = article.publishDate || article["予約公開日時"] || article.publishedAt || article.createdAt || "";
  const updated = article.updatedAt || article.revisedAt || article.modifiedAt || published;
  const tool = chooseTool([title, category, ...tags].join(" "));
  const bodyWithIds = addHeadingIds(body);
  const toc = buildToc(bodyWithIds);
  const affiliate = sanitizeAffiliate(pick(article, ["affiliateHtml","affiliateHTML","affiliate_html","adHtml","adHTML","adCode","rakutenHtml","htmlAd","affiliate","adsHtml"]));
  const bodyWithAds = insertAffiliateBlocks(bodyWithIds, affiliate);
  const bodyWithTool = insertToolLink(bodyWithAds, tool);
  const related = chooseRelated(article, pool, tags).slice(0, 6);
  const readMinutes = Math.max(1, Math.ceil(plain(body).length / 500));

  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description: desc,
    mainEntityOfPage: { "@type": "WebPage", "@id": canonical },
    author: { "@type": "Organization", name: "推し活資金AI編集部", url: `${SITE}/about` },
    publisher: { "@type": "Organization", name: "推し活資金AI", url: SITE }
  };
  if (image) articleLd.image = [image];
  if (published) articleLd.datePublished = iso(published);
  if (updated) articleLd.dateModified = iso(updated);

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "ホーム", item: `${SITE}/` },
      { "@type": "ListItem", position: 2, name: "お役立ち記事", item: `${SITE}/articles` },
      { "@type": "ListItem", position: 3, name: title, item: canonical }
    ]
  };

  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}｜推し活資金AI</title><meta name="description" content="${attr(desc)}"><meta name="robots" content="index,follow,max-image-preview:large"><link rel="canonical" href="${attr(canonical)}"><meta property="og:type" content="article"><meta property="og:title" content="${attr(title)}"><meta property="og:description" content="${attr(desc)}"><meta property="og:url" content="${attr(canonical)}">${image ? `<meta property="og:image" content="${attr(image)}">` : ""}<link rel="stylesheet" href="/style.css">${analytics()}<script async src="https://pagead2.googlesyndication.com/pagead/js?client=ca-pub-6088406710027099" crossorigin="anonymous"></script><script type="application/ld+json">${json(articleLd)}</script><script type="application/ld+json">${json(breadcrumbLd)}</script><style>${articleCss()}</style></head><body>${header()}<main class="ssr-article"><article>${image ? `<img class="ssr-eye" src="${attr(image)}" alt="${attr(title)}" fetchpriority="high">` : ""}<div class="ssr-inner"><nav class="ssr-breadcrumb"><a href="/">ホーム</a><span>›</span><a href="/articles">お役立ち記事</a><span>›</span><span>${esc(title)}</span></nav><div class="ssr-category">♡ ${esc(category)}</div>${tags.length ? `<div class="ssr-tags">${tags.map(t => `<a href="/articles?tag=${encodeURIComponent(t)}">${esc(t)}</a>`).join("")}</div>` : ""}<h1>${esc(title)}</h1><div class="ssr-meta">${published ? `<span>公開日：${date(published)}</span>` : ""}${updated ? `<span>更新日：${date(updated)}</span>` : ""}<span>読了目安：約${readMinutes}分</span></div><section class="ssr-learn"><h2>この記事でわかること</h2><ul>${headings(bodyWithIds).map(h => `<li>${esc(h)}</li>`).join("")}</ul></section>${toc}<div class="ssr-body">${bodyWithTool}</div><section class="ssr-tool-bottom"><div><span>この記事におすすめの無料ツール</span><h2>${esc(tool.name)}</h2><p>${esc(tool.description)}</p></div><a href="${tool.href}">${esc(tool.button)} →</a></section><section class="ssr-author"><h2>この記事を書いた人</h2><h3>推し活資金AI編集部</h3><p>ライブ遠征、ホテル、交通費、チケット、夜行バス、推し活の節約方法を中心に、初心者にも実践しやすい情報を発信しています。公式サイトや運営会社の情報を確認し、必要に応じて内容を見直しています。</p><a href="/about">編集方針・運営者情報を見る →</a></section>${related.length ? `<section class="ssr-related"><h2>あわせて読みたい記事</h2><div>${related.map(relatedCard).join("")}</div></section>` : ""}</div></article></main>${footer()}${stickyTools(tool)}</body></html>`;
}

function chooseTool(text) {
  const s = String(text || "").toLowerCase();
  if (/遠征|ホテル|夜行バス|新幹線|飛行機|交通|旅行|会場/.test(s)) return { href: "/transport", name: "遠征プランナー", description: "交通費・宿泊費・食費をまとめて計算できます。", button: "遠征費を計算する", key: "transport" };
  if (/貯金|節約|家計簿|支出|出費|お金がない|予算管理/.test(s)) return { href: "/kakeibo", name: "推し活家計簿", description: "推し活の支出を記録し、月・年単位で管理できます。", button: "家計簿を使う", key: "kakeibo" };
  if (/目標|積立|年間予算|シミュレーション|いつ達成/.test(s)) return { href: "/yearly", name: "目標シミュレーター", description: "目標金額までの期間と毎月の積立額を確認できます。", button: "目標を計算する", key: "yearly" };
  return { href: "/fund", name: "推し活資金診断", description: "収入や固定費から、毎月推し活に使える金額を診断できます。", button: "無料で診断する", key: "fund" };
}

function addHeadingIds(html) {
  let index = 0;
  return String(html || "").replace(/<h2([^>]*)>([\s\S]*?)<\/h2>/gi, (full, attrs, inner) => {
    index += 1;
    if (/\sid\s*=/.test(attrs)) return full;
    return `<h2${attrs} id="toc-${index}">${inner}</h2>`;
  });
}

function buildToc(html) {
  const items = [];
  for (const match of String(html || "").matchAll(/<h2[^>]*id=["']([^"']+)["'][^>]*>([\s\S]*?)<\/h2>/gi)) {
    items.push({ id: match[1], text: text(match[2]) });
  }
  if (!items.length) return "";
  return `<nav class="ssr-toc" aria-label="目次"><h2>目次</h2><ol>${items.map(item => `<li><a href="#${attr(item.id)}">${esc(item.text)}</a></li>`).join("")}</ol></nav>`;
}

function insertAffiliateBlocks(html, affiliate) {
  if (!affiliate) return html;
  const ad = `<div class="ssr-affiliate">${affiliate}</div>`;
  const h2Matches = [...String(html).matchAll(/<h2[^>]*>/gi)];
  if (!h2Matches.length) return ad + html + ad;
  const positions = [...new Set([0, Math.floor(h2Matches.length / 2)])];
  let result = String(html);
  let shift = 0;
  for (const pos of positions) {
    const index = h2Matches[pos].index + shift;
    result = result.slice(0, index) + ad + result.slice(index);
    shift += ad.length;
  }
  return result + ad;
}

function sanitizeAffiliate(value) {
  return String(value || "")
    .replace(/<script(?![^>]*src=["']https:\/\/pagead2\.googlesyndication\.com)[\s\S]*?<\/script>/gi, "")
    .replace(/javascript:/gi, "");
}

function pick(obj, keys) {
  for (const key of keys) {
    const value = obj && obj[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") return value;
  }
  return "";
}

function insertToolLink(html, tool) {
  const box = `<aside class="ssr-inline-tool"><strong>${esc(tool.name)}</strong><p>${esc(tool.description)}</p><a href="${tool.href}">${esc(tool.button)} →</a></aside>`;
  const h2Matches = [...String(html).matchAll(/<h2\b[^>]*>/gi)];
  if (h2Matches.length >= 2) {
    const index = h2Matches[Math.min(1, h2Matches.length - 1)].index;
    return String(html).slice(0, index) + box + String(html).slice(index);
  }
  return String(html) + box;
}

function chooseRelated(current, pool, tags) {
  const currentId = current.id;
  const currentSlug = normalize(current.slug || current.id);
  return [...pool]
    .filter(a => a.id !== currentId && normalize(a.slug || a.id) !== currentSlug)
    .map(a => ({ article: a, score: getTags(a).filter(t => tags.includes(t)).length }))
    .sort((a, b) => b.score - a.score)
    .map(x => x.article);
}

function relatedCard(article) {
  const title = plain(article.title || article.name || "記事");
  const slug = normalize(article.slug || article.urlSlug || article.url_slug || article.permalink || article.id);
  const image = imageUrl(article.thumbnail || article.image || article.eyecatch) || article.thumbnailUrl || article.imageUrl || "";
  return `<a class="ssr-related-card" href="/article?id=${encodeURIComponent(slug)}">${image ? `<img src="${attr(image)}" alt="${attr(title)}" loading="lazy">` : ""}<strong>${esc(title)}</strong></a>`;
}

function stickyTools(selected) {
  const tools = [
    { key: "fund", href: "/fund", icon: "/icon-fund-pig.png", name: "資金診断" },
    { key: "transport", href: "/transport", icon: "/icon-transport-plane.png", name: "遠征計算" },
    { key: "yearly", href: "/yearly", icon: "/icon-goal-flag.png", name: "目標計算" },
    { key: "kakeibo", href: "/kakeibo", icon: "/icon-goal-heart.png", name: "家計簿" }
  ];
  return `<nav class="ssr-sticky" aria-label="無料ツールへのショートカット">${tools.map(t => `<a class="${selected.key === t.key ? "recommended" : ""}" href="${t.href}"><img src="${t.icon}" alt=""><span>${esc(t.name)}</span>${selected.key === t.key ? "<small>おすすめ</small>" : ""}</a>`).join("")}</nav>`;
}

function header() {
  return `<header class="header"><div class="container header-inner"><a class="logo" href="/"><span class="heart">♥</span><span><strong>推し活資金AI</strong><small>推しを諦めないためのお金管理AI</small></span></a><nav class="nav"><a href="/">ホーム</a><a href="/fund">診断ツール</a><a href="/transport">遠征プランナー</a><a href="/yearly">目標シミュレーター</a><a href="/kakeibo">推し活家計簿</a><a class="active" href="/articles">お役立ち記事</a></nav><a class="cta" href="/fund">すべて無料で使えます</a></div></header>`;
}

function footer() {
  return `<footer class="topv3-footer"><div class="topv3-container topv3-footer-grid"><div><h2>推し活資金AI</h2><p>推しを諦めないためのお金管理AI</p></div><div><h3>サービス</h3><p><a href="/fund">推し活資金診断</a></p><p><a href="/saving">娯楽費捻出診断</a></p><p><a href="/transport">遠征プランナー</a></p><p><a href="/yearly">目標シミュレーター</a></p><p><a href="/kakeibo">推し活家計簿</a></p></div><div><h3>お役立ち情報</h3><p><a href="/articles">記事一覧</a></p><p><a href="/categories">カテゴリ一覧</a></p></div><div><h3>運営について</h3><p><a href="/terms">利用規約</a></p><p><a href="/privacy">プライバシーポリシー</a></p><p><a href="/contact">お問い合わせ</a></p><p><a href="/about">運営者情報</a></p><p><a href="/sitemap.xml">サイトマップ</a></p></div></div><p class="topv3-copy">© 2026 推し活資金AI</p></footer>`;
}

function articleCss() {
  return `.ssr-article{width:min(920px,calc(100% - 24px));margin:32px auto 120px}.ssr-article article{overflow:hidden;border:1px solid #ffd1e5;border-radius:24px;background:#fff;box-shadow:0 16px 40px rgba(255,111,174,.12)}.ssr-eye{display:block;width:100%;aspect-ratio:16/9;object-fit:cover}.ssr-inner{padding:clamp(22px,4vw,42px)}.ssr-breadcrumb{display:flex;flex-wrap:wrap;gap:8px;font-size:13px;margin-bottom:18px}.ssr-category{display:inline-block;padding:6px 12px;border-radius:999px;background:#fff3f8;color:#d63384;font-weight:700}.ssr-tags{display:flex;flex-wrap:wrap;gap:7px;margin:12px 0}.ssr-tags a{padding:5px 10px;border-radius:999px;background:#fff8fb;border:1px solid #ffd1e5;color:#c92f78;text-decoration:none;font-size:12px;font-weight:800}.ssr-article h1{font-size:clamp(26px,4vw,38px);line-height:1.4}.ssr-meta{display:flex;flex-wrap:wrap;gap:14px;color:#777;font-size:13px}.ssr-learn,.ssr-author,.ssr-tool-bottom{margin:26px 0;padding:20px;border:1px solid #ffd1e5;border-radius:18px;background:#fff8fb}.ssr-toc{margin:26px 0;padding:20px 22px;border:1px solid #ffd1e5;border-radius:20px;background:linear-gradient(135deg,#fff7fb,#fff);box-shadow:0 10px 26px rgba(255,111,174,.10)}.ssr-toc h2{margin:0 0 14px;color:#c92f78;font-size:18px}.ssr-toc ol{display:grid;gap:10px;margin:0;padding:0;list-style:none}.ssr-toc a{display:block;padding:12px 14px;border:1px solid #ffe1ee;border-radius:14px;background:#fff;color:#3f3038;text-decoration:none;font-weight:700;line-height:1.5}.ssr-body{font-size:16px;line-height:2}.ssr-body h2{scroll-margin-top:100px}.ssr-body h2{margin:44px 0 18px;padding:16px 18px;border-left:7px solid #ff6fae;border-radius:14px;background:#fff3f8}.ssr-body h3{margin:32px 0 14px;color:#d63384;border-bottom:2px dashed #ff9ac7;padding-bottom:8px}.ssr-body img{max-width:100%;height:auto}.ssr-body table{width:100%;border-collapse:collapse}.ssr-body th,.ssr-body td{border:1px solid #ffd1e5;padding:10px}.ssr-affiliate{margin:34px 0;text-align:center;overflow:hidden}.ssr-affiliate img,.ssr-affiliate iframe{max-width:100%;height:auto}.ssr-affiliate a{display:inline-block;max-width:100%}.ssr-inline-tool{margin:34px 0;padding:20px;border:1px solid #ffb6d3;border-radius:18px;background:linear-gradient(135deg,#fff3f8,#fff)}.ssr-inline-tool strong{display:block;color:#c92f78;font-size:19px}.ssr-inline-tool p{margin:8px 0}.ssr-inline-tool a,.ssr-tool-bottom>a{display:inline-flex;padding:10px 16px;border-radius:999px;background:#ef5b91;color:#fff;text-decoration:none;font-weight:900}.ssr-tool-bottom{display:flex;align-items:center;justify-content:space-between;gap:18px}.ssr-tool-bottom h2{margin:5px 0}.ssr-tool-bottom p{margin:0}.ssr-related{margin-top:36px}.ssr-related>div{display:grid;grid-template-columns:repeat(2,1fr);gap:14px}.ssr-related-card{display:block;overflow:hidden;border:1px solid #ffd1e5;border-radius:16px;color:#332733;text-decoration:none}.ssr-related-card img{display:block;width:100%;aspect-ratio:16/9;object-fit:cover}.ssr-related-card strong{display:block;padding:14px;line-height:1.6}.ssr-sticky{position:fixed;z-index:999;left:50%;bottom:12px;transform:translateX(-50%);display:grid;grid-template-columns:repeat(4,1fr);width:min(760px,calc(100% - 20px));background:#fff;border:1px solid #ff9ac7;border-radius:18px;box-shadow:0 10px 30px rgba(255,111,174,.24);overflow:hidden}.ssr-sticky a{position:relative;display:flex;align-items:center;justify-content:center;gap:7px;padding:10px 8px;color:#c92f78;font-weight:800;text-decoration:none;border-right:1px solid #ffe1ee}.ssr-sticky img{width:32px;height:32px;object-fit:contain}.ssr-sticky small{position:absolute;top:2px;right:4px;padding:2px 5px;border-radius:999px;background:#ef5b91;color:#fff;font-size:9px}.ssr-sticky a.recommended{background:#fff3f8}.ssr-sticky a:last-child{border:0}@media(max-width:640px){.ssr-inner{padding:20px}.ssr-related>div{grid-template-columns:1fr}.ssr-tool-bottom{display:block}.ssr-tool-bottom>a{margin-top:12px}.ssr-sticky a{display:grid;gap:2px;font-size:11px;padding:8px 3px}.ssr-sticky img{width:27px;height:27px}}`;
}

function headings(html) {
  const out = [];
  for (const match of String(html).matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)) {
    out.push(plain(match[1]));
    if (out.length === 4) break;
  }
  return out.length ? out : ["記事の要点", "初心者向けの実践方法", "注意点と確認事項"];
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

function sanitize(value) {
  return String(value || "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+\s*=\s*(["']).*?\1/gi, "")
    .replace(/javascript:/gi, "");
}

function imageUrl(value) { return typeof value === "string" ? value : (value && value.url) || ""; }
function first(value) { return Array.isArray(value) ? String(value[0] || "") : String(value || ""); }
function normalize(value) {
  let v = String(value || "").trim();
  if (!v) return "";
  try { v = decodeURIComponent(v); } catch {}
  try {
    if (/^https?:\/\//i.test(v)) {
      const url = new URL(v);
      v = url.searchParams.get("id") || url.pathname;
    }
  } catch {}
  return v.split("#")[0].split("?")[0].replace(/^\/+|\/+$/g, "").replace(/^article(?:\.html)?\//i, "").replace(/\.html?$/i, "").toLowerCase();
}
function articleKeys(article) { return [...new Set([article.slug, article.urlSlug, article.url_slug, article.permalink, article.id].map(normalize).filter(Boolean))]; }
function plain(value) { return String(value || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(); }
function esc(value) { return String(value || "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]); }
function attr(value) { return esc(value); }
function json(value) { return JSON.stringify(value).replace(/</g, "\\u003c"); }
function date(value) { try { return new Intl.DateTimeFormat("ja-JP").format(new Date(value)); } catch { return ""; } }
function iso(value) { try { return new Date(value).toISOString(); } catch { return undefined; } }
function analytics() { return `<script async src="https://www.googletagmanager.com/gtag/js?id=${GA_ID}"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${GA_ID}');</script>`; }
function send404(res) { res.setHeader("Content-Type", "text/html; charset=utf-8"); return res.status(404).send(errorPage("記事が見つかりませんでした", true)); }
function errorPage(message, noindex = false) { return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(message)}｜推し活資金AI</title>${noindex ? '<meta name="robots" content="noindex,follow">' : ""}<link rel="stylesheet" href="/style.css"></head><body>${header()}<main style="max-width:720px;margin:80px auto;padding:24px;text-align:center"><h1>${esc(message)}</h1><p><a href="/articles">記事一覧へ戻る</a></p></main>${footer()}</body></html>`; }
