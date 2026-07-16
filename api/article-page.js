const SITE = "https://www.oshikatsu-kakeibo.com";
const GA_ID = "G-3CGGLYQE0X";

export default async function handler(req, res) {
  const rawKey = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
  const key = normalize(rawKey);
  if (!key || key === "undefined" || key === "null") return send404(res);

  const config = getConfig();
  if (!config) return res.status(503).send(errorPage("記事を取得できませんでした"));

  try {
    const list = await fetchAllArticles(config);
    const article = list.find(item => articleKeys(item).includes(key));
    if (!article) return send404(res);

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=86400");
    return res.status(200).send(renderArticle(article, list));
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

async function fetchAllArticles({ serviceDomain, apiKey }) {
  const limit = 100;
  const all = [];
  let offset = 0;
  let total = Infinity;
  while (offset < total) {
    const url = `https://${serviceDomain}.microcms.io/api/v1/articles?limit=${limit}&offset=${offset}&orders=-publishedAt`;
    const response = await fetch(url, { headers: { "X-MICROCMS-API-KEY": apiKey } });
    if (!response.ok) throw new Error(`microCMS ${response.status}`);
    const data = await response.json();
    const contents = Array.isArray(data.contents) ? data.contents : [];
    all.push(...contents);
    total = Number(data.totalCount ?? all.length);
    if (!contents.length) break;
    offset += contents.length;
  }
  const now = Date.now();
  return all.filter(article => {
    const published = article.publishDate || article["予約公開日時"] || article.publishedAt || article.createdAt;
    return !published || new Date(published).getTime() <= now;
  });
}

function renderArticle(article, list) {
  const title = plain(article.title || article.name || "お役立ち記事");
  const desc = plain(article.seoDescription || article.description || article.summary || article.excerpt || title).slice(0, 160);
  const slug = normalize(article.slug || article.urlSlug || article.url_slug || article.permalink || article.id);
  const canonical = `${SITE}/article?id=${encodeURIComponent(slug)}`;
  const rawBody = sanitize(article.body || article.content || article.articleBody || article.contentHtml || article.articleHtml || "<p>本文がありません。</p>");
  const image = imageUrl(article.thumbnail || article.image || article.eyecatch) || article.thumbnailUrl || article.imageUrl || "";
  const category = label(article.category || article.genre) || "推し活コラム";
  const tags = getTags(article);
  const published = article.publishDate || article["予約公開日時"] || article.publishedAt || article.createdAt || "";
  const updated = article.updatedAt || article.revisedAt || article.modifiedAt || published;
  const tool = chooseTool([...tags, category, title]);
  const body = injectToolLink(rawBody, tool);
  const related = relatedArticles(article, list, tags, category).slice(0, 6);

  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description: desc,
    mainEntityOfPage: { "@type": "WebPage", "@id": canonical },
    author: { "@type": "Organization", name: "推し活資金AI編集部" },
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

  const learnItems = headings(body).map(h => `<li>${esc(h)}</li>`).join("");
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}｜推し活資金AI</title><meta name="description" content="${attr(desc)}"><meta name="robots" content="index,follow,max-image-preview:large"><link rel="canonical" href="${attr(canonical)}"><meta property="og:type" content="article"><meta property="og:title" content="${attr(title)}"><meta property="og:description" content="${attr(desc)}"><meta property="og:url" content="${attr(canonical)}">${image ? `<meta property="og:image" content="${attr(image)}">` : ""}<link rel="stylesheet" href="/style.css">${analytics()}<script async src="https://pagead2.googlesyndication.com/pagead/js?client=ca-pub-6088406710027099" crossorigin="anonymous"></script><script type="application/ld+json">${json(articleLd)}</script><script type="application/ld+json">${json(breadcrumbLd)}</script><style>${articleCss()}</style></head><body>${header()}<main class="ssr-article"><article>${image ? `<img class="ssr-eye" src="${attr(image)}" alt="${attr(title)}" loading="eager">` : ""}<div class="ssr-inner"><nav class="ssr-breadcrumb"><a href="/">ホーム</a><span>›</span><a href="/articles">お役立ち記事</a><span>›</span><span>${esc(title)}</span></nav><div class="ssr-category">♡ ${esc(category)}</div><h1>${esc(title)}</h1><div class="ssr-meta">${published ? `<span>公開日：${date(published)}</span>` : ""}${updated ? `<span>更新日：${date(updated)}</span>` : ""}<span>読了目安：約${readMinutes(body)}分</span></div><section class="ssr-learn"><h2>この記事でわかること</h2><ul>${learnItems}</ul></section><div class="ssr-body">${body}</div><section class="ssr-author"><h2>この記事を書いた人</h2><h3>推し活資金AI編集部</h3><p>ライブ遠征、ホテル、交通費、チケット、夜行バス、推し活の節約方法を中心に、初心者にも実践しやすい情報を発信しています。公式サイトや運営会社の情報を確認し、必要に応じて内容を見直しています。</p><a href="/about">編集方針・運営者情報を見る →</a></section>${related.length ? `<section class="ssr-related"><h2>あわせて読みたい記事</h2><div>${related.map(card).join("")}</div></section>` : ""}</div></article></main>${footer()}${stickyBanner(tool)}${stickyScript()}</body></html>`;
}

function chooseTool(values) {
  const haystack = values.map(label).join(" ").toLowerCase();
  const tools = [
    { key: "transport", url: "/transport", name: "遠征プランナー", sub: "交通費・宿泊費を計算", icon: "/icon-transport-plane.png", words: ["遠征", "ホテル", "夜行バス", "新幹線", "飛行機", "交通", "旅行", "会場", "ドーム", "アリーナ"] },
    { key: "kakeibo", url: "/kakeibo", name: "推し活家計簿", sub: "推し活の支出を記録", icon: "/icon-saving-heart.png", words: ["貯金", "家計簿", "節約", "出費", "支出", "お金がない", "予算管理", "グッズ代"] },
    { key: "yearly", url: "/yearly", name: "目標シミュレーター", sub: "目標までの積立を計算", icon: "/icon-goal-flag.png", words: ["目標", "年間", "積立", "シミュレーション", "100万円"] },
    { key: "fund", url: "/fund", name: "推し活資金診断", sub: "毎月使える金額を診断", icon: "/icon-fund-pig.png", words: ["資金", "費用", "いくら", "診断", "初心者", "チケット", "うちわ", "持ち物"] }
  ];
  return tools.find(tool => tool.words.some(word => haystack.includes(word))) || tools[3];
}

function injectToolLink(body, tool) {
  const box = `<aside class="context-tool-link"><img src="${attr(tool.icon)}" alt="" loading="lazy"><div><small>この記事におすすめの無料ツール</small><strong>${esc(tool.name)}</strong><span>${esc(tool.sub)}</span></div><a href="${tool.url}">無料で使う →</a></aside>`;
  const matches = [...body.matchAll(/<h2\b[^>]*>/gi)];
  if (matches.length >= 2) {
    const position = matches[1].index;
    return body.slice(0, position) + box + body.slice(position);
  }
  const paragraph = body.match(/<\/p>/i);
  if (paragraph && typeof paragraph.index === "number") {
    const end = paragraph.index + paragraph[0].length;
    return body.slice(0, end) + box + body.slice(end);
  }
  return box + body;
}

function stickyBanner(recommended) {
  const tools = [
    { key: "fund", url: "/fund", name: "資金診断", icon: "/icon-fund-pig.png" },
    { key: "transport", url: "/transport", name: "遠征計算", icon: "/icon-transport-plane.png" },
    { key: "yearly", url: "/yearly", name: "目標計算", icon: "/icon-goal-flag.png" },
    { key: "kakeibo", url: "/kakeibo", name: "家計簿", icon: "/icon-saving-heart.png" }
  ];
  return `<aside id="toolSticky" class="tool-sticky" aria-label="無料ツール"><button id="toolStickyClose" type="button" aria-label="閉じる">×</button>${tools.map(tool => `<a class="${tool.key === recommended.key ? "recommended" : ""}" href="${tool.url}"><img src="${tool.icon}" alt=""><span>${tool.name}</span>${tool.key === recommended.key ? "<small>おすすめ</small>" : ""}</a>`).join("")}</aside>`;
}

function stickyScript() {
  return `<script>(()=>{const key='oshiToolStickyClosedAt';const bar=document.getElementById('toolSticky');const close=document.getElementById('toolStickyClose');const closed=Number(localStorage.getItem(key)||0);if(Date.now()-closed<86400000&&bar)bar.hidden=true;if(close)close.addEventListener('click',()=>{if(bar)bar.hidden=true;localStorage.setItem(key,String(Date.now()))})})();</script>`;
}

function relatedArticles(current, list, tags, category) {
  const tagSet = new Set(tags);
  return list
    .filter(item => item.id !== current.id)
    .map(item => {
      const itemTags = getTags(item);
      let score = itemTags.filter(tag => tagSet.has(tag)).length * 3;
      if (label(item.category || item.genre) === category) score += 2;
      return { item, score };
    })
    .sort((a, b) => b.score - a.score)
    .map(entry => entry.item);
}

function card(article) {
  const title = plain(article.title || article.name || "記事");
  const slug = normalize(article.slug || article.urlSlug || article.url_slug || article.permalink || article.id);
  return `<a href="/article?id=${encodeURIComponent(slug)}">${esc(title)}</a>`;
}

function header() {
  return `<header class="header"><div class="container header-inner"><a class="logo" href="/"><span class="heart">♥</span><span><strong>推し活資金AI</strong><small>推しを諦めないためのお金管理AI</small></span></a><nav class="nav"><a href="/">ホーム</a><a href="/fund">診断ツール</a><a href="/transport">遠征プランナー</a><a href="/yearly">目標シミュレーター</a><a href="/kakeibo">推し活家計簿</a><a class="active" href="/articles">お役立ち記事</a></nav><a class="cta" href="/fund">すべて無料で使えます</a></div></header>`;
}

function footer() {
  return `<footer class="topv3-footer"><div class="topv3-container topv3-footer-grid"><div><h2>推し活資金AI</h2><p>推しを諦めないためのお金管理AI</p></div><div><h3>サービス</h3><p><a href="/fund">推し活資金診断</a></p><p><a href="/saving">娯楽費捻出診断</a></p><p><a href="/transport">遠征プランナー</a></p><p><a href="/yearly">目標シミュレーター</a></p><p><a href="/kakeibo">推し活家計簿</a></p></div><div><h3>お役立ち情報</h3><p><a href="/articles">記事一覧</a></p><p><a href="/categories">カテゴリ一覧</a></p></div><div><h3>運営について</h3><p><a href="/terms">利用規約</a></p><p><a href="/privacy">プライバシーポリシー</a></p><p><a href="/contact">お問い合わせ</a></p><p><a href="/about">運営者情報</a></p><p><a href="/sitemap.xml">サイトマップ</a></p></div></div><p class="topv3-copy">© 2026 推し活資金AI</p></footer>`;
}

function analytics() {
  return `<script async src="https://www.googletagmanager.com/gtag/js?id=${GA_ID}"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${GA_ID}');</script>`;
}

function articleCss() {
  return `.ssr-article{width:min(920px,calc(100% - 24px));margin:32px auto 120px}.ssr-article article{overflow:hidden;border:1px solid #ffd1e5;border-radius:24px;background:#fff;box-shadow:0 16px 40px rgba(255,111,174,.12)}.ssr-eye{width:100%;aspect-ratio:16/9;object-fit:cover}.ssr-inner{padding:clamp(22px,4vw,42px)}.ssr-breadcrumb{display:flex;flex-wrap:wrap;gap:8px;font-size:13px;margin-bottom:18px}.ssr-category{display:inline-block;padding:6px 12px;border-radius:999px;background:#fff3f8;color:#d63384;font-weight:700}.ssr-article h1{font-size:clamp(26px,4vw,38px);line-height:1.4}.ssr-meta{display:flex;flex-wrap:wrap;gap:14px;color:#777;font-size:13px}.ssr-learn,.ssr-author{margin:26px 0;padding:20px;border:1px solid #ffd1e5;border-radius:18px;background:#fff8fb}.ssr-body{font-size:16px;line-height:2}.ssr-body h2{margin:44px 0 18px;padding:16px 18px;border-left:7px solid #ff6fae;border-radius:14px;background:#fff3f8}.ssr-body h3{margin:32px 0 14px;color:#d63384;border-bottom:2px dashed #ff9ac7;padding-bottom:8px}.ssr-body img{max-width:100%;height:auto}.ssr-body table{width:100%;border-collapse:collapse}.ssr-body th,.ssr-body td{border:1px solid #ffd1e5;padding:10px}.context-tool-link{display:grid;grid-template-columns:58px 1fr auto;gap:14px;align-items:center;margin:32px 0;padding:18px;border:1px solid #ffb8d3;border-radius:18px;background:linear-gradient(135deg,#fff4f9,#fff)}.context-tool-link img{width:58px;height:58px;object-fit:contain}.context-tool-link small,.context-tool-link span{display:block}.context-tool-link strong{display:block;color:#c92f78;font-size:19px}.context-tool-link a{padding:11px 15px;border-radius:12px;background:#ef5b91;color:#fff;text-decoration:none;font-weight:800}.ssr-related{margin-top:36px}.ssr-related>div{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}.ssr-related a{display:block;padding:14px;border:1px solid #ffd1e5;border-radius:14px;text-decoration:none}.tool-sticky{position:fixed;z-index:999;left:50%;bottom:12px;transform:translateX(-50%);display:grid;grid-template-columns:repeat(4,1fr);width:min(760px,calc(100% - 20px));background:#fff;border:1px solid #ff9ac7;border-radius:18px;box-shadow:0 10px 30px rgba(255,111,174,.24);overflow:visible}.tool-sticky>a{position:relative;display:flex;align-items:center;justify-content:center;gap:7px;padding:11px 8px;color:#c92f78;font-weight:800;text-decoration:none;border-right:1px solid #ffe1ee}.tool-sticky>a:last-of-type{border:0}.tool-sticky img{width:30px;height:30px;object-fit:contain}.tool-sticky .recommended{background:#fff1f7}.tool-sticky small{position:absolute;top:-9px;padding:2px 7px;border-radius:999px;background:#ef5b91;color:#fff;font-size:10px}.tool-sticky button{position:absolute;right:-8px;top:-12px;width:28px;height:28px;border:0;border-radius:50%;background:#555;color:#fff;cursor:pointer}@media(max-width:640px){.ssr-inner{padding:20px}.ssr-related>div{grid-template-columns:1fr}.context-tool-link{grid-template-columns:48px 1fr}.context-tool-link img{width:48px;height:48px}.context-tool-link a{grid-column:1/-1;text-align:center}.tool-sticky>a{flex-direction:column;gap:2px;font-size:11px;padding:8px 2px}.tool-sticky img{width:25px;height:25px}}`;
}

function getTags(article) {
  const raw = article && article.tags;
  if (!raw) return [];
  const list = Array.isArray(raw) ? raw : typeof raw === "string" ? raw.split(/[、,\s]+/) : [raw];
  return [...new Set(list.map(label).filter(Boolean))];
}

function headings(html) {
  const out = [];
  for (const match of html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)) {
    out.push(plain(match[1]));
    if (out.length === 4) break;
  }
  return out.length ? out : ["記事の要点", "初心者向けの実践方法", "注意点と確認事項"];
}

function readMinutes(html) {
  const chars = plain(html).length;
  return Math.max(1, Math.ceil(chars / 500));
}

function sanitize(value) {
  return String(value || "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+\s*=\s*(["']).*?\1/gi, "")
    .replace(/javascript:/gi, "");
}

function imageUrl(value) { return typeof value === "string" ? value : (value && value.url) || ""; }
function label(value) { return typeof value === "object" && value ? plain(value.name || value.label || value.title || value.value || value.id || "") : plain(value); }
function articleKeys(article) { return [...new Set([article.slug, article.urlSlug, article.url_slug, article.permalink, article.id].map(normalize).filter(Boolean))]; }
function normalize(value) {
  let result = String(value || "").trim();
  if (!result) return "";
  try { result = decodeURIComponent(result); } catch {}
  try {
    if (/^https?:\/\//i.test(result)) {
      const url = new URL(result);
      result = url.searchParams.get("id") || url.pathname;
    }
  } catch {}
  result = result.split("#")[0];
  if (result.includes("?")) {
    try { result = new URLSearchParams(result.split("?")[1]).get("id") || result.split("?")[0]; } catch { result = result.split("?")[0]; }
  }
  return result.trim().replace(/^\/+|\/+$/g, "").replace(/^article(?:\.html)?\//i, "").replace(/\.html?$/i, "").toLowerCase();
}
function plain(value) { return String(value || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(); }
function esc(value) { return String(value || "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]); }
function attr(value) { return esc(value); }
function json(value) { return JSON.stringify(value).replace(/</g, "\\u003c"); }
function date(value) { try { return new Intl.DateTimeFormat("ja-JP").format(new Date(value)); } catch { return ""; } }
function iso(value) { try { return new Date(value).toISOString(); } catch { return ""; } }
function send404(res) { res.setHeader("Content-Type", "text/html; charset=utf-8"); return res.status(404).send(errorPage("記事が見つかりませんでした", true)); }
function errorPage(message, noindex = false) { return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(message)}｜推し活資金AI</title>${noindex ? '<meta name="robots" content="noindex,follow">' : ""}<link rel="stylesheet" href="/style.css"></head><body><main style="max-width:720px;margin:80px auto;padding:24px;text-align:center"><h1>${esc(message)}</h1><p><a href="/articles">記事一覧へ戻る</a></p></main></body></html>`; }
