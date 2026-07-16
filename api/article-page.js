const SITE = "https://www.oshikatsu-kakeibo.com";

export default async function handler(req, res) {
  // /article?id=slug と /article/slug の両方に対応。
  // IDがない場合や不正な値の場合は、最新記事へフォールバックせず必ず404を返します。
  const rawKey = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
  const key = normalize(rawKey);
  if (!key || key === "undefined" || key === "null") return send404(res);

  const serviceDomain = process.env.MICROCMS_SERVICE_DOMAIN;
  const apiKey = process.env.MICROCMS_API_KEY;
  if (!serviceDomain || !apiKey) return res.status(503).send(errorPage("記事を取得できませんでした"));

  try {
    const endpoint = `https://${serviceDomain}.microcms.io/api/v1/articles?limit=100&orders=-publishedAt`;
    const response = await fetch(endpoint, { headers: { "X-MICROCMS-API-KEY": apiKey } });
    if (!response.ok) return res.status(502).send(errorPage("記事を取得できませんでした"));
    const data = await response.json();
    const now = Date.now();
    const list = (data.contents || []).filter(a => {
      const d = a.publishDate || a["予約公開日時"] || a.publishedAt || a.createdAt;
      return !d || new Date(d).getTime() <= now;
    });
    const article = list.find(a => articleKeys(a).includes(key));
    if (!article) return send404(res);

    const html = renderArticle(article, list);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=86400");
    return res.status(200).send(html);
  } catch (e) {
    return res.status(500).send(errorPage("記事の表示中にエラーが発生しました"));
  }
}

function renderArticle(a, list) {
  const title = text(a.title || a.name || "お役立ち記事");
  const desc = text(a.seoDescription || a.description || a.summary || a.excerpt || title).slice(0,160);
  const slug = normalize(a.slug || a.urlSlug || a.url_slug || a.permalink || a.id);
  const canonical = `${SITE}/article?id=${encodeURIComponent(slug)}`;
  const body = sanitize(a.body || a.content || a.articleBody || a.contentHtml || a.articleHtml || "<p>本文がありません。</p>");
  const image = imageUrl(a.thumbnail || a.image || a.eyecatch) || a.thumbnailUrl || a.imageUrl || "";
  const category = text(a.category || a.genre || "推し活コラム");
  const published = a.publishDate || a["予約公開日時"] || a.publishedAt || a.createdAt || "";
  const updated = a.updatedAt || a.revisedAt || a.modifiedAt || published;
  const related = list.filter(x => x.id !== a.id).slice(0,6);
  const articleLd = {"@context":"https://schema.org","@type":"Article",headline:title,description:desc,mainEntityOfPage:{"@type":"WebPage","@id":canonical},author:{"@type":"Organization",name:"推し活資金AI編集部"},publisher:{"@type":"Organization",name:"推し活資金AI",url:SITE}};
  if (image) articleLd.image=[image];
  if (published) articleLd.datePublished=new Date(published).toISOString();
  if (updated) articleLd.dateModified=new Date(updated).toISOString();
  const breadcrumbLd={"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"ホーム","item":SITE+"/"},{"@type":"ListItem","position":2,"name":"お役立ち記事","item":SITE+"/articles"},{"@type":"ListItem","position":3,"name":title,"item":canonical}]};
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}｜推し活資金AI</title><meta name="description" content="${attr(desc)}"><meta name="robots" content="index,follow,max-image-preview:large"><link rel="canonical" href="${attr(canonical)}"><meta property="og:type" content="article"><meta property="og:title" content="${attr(title)}"><meta property="og:description" content="${attr(desc)}"><meta property="og:url" content="${attr(canonical)}">${image?`<meta property="og:image" content="${attr(image)}">`:''}<link rel="stylesheet" href="/style.css"><script async src="https://pagead2.googlesyndication.com/pagead/js?client=ca-pub-6088406710027099" crossorigin="anonymous"></script><script type="application/ld+json">${json(articleLd)}</script><script type="application/ld+json">${json(breadcrumbLd)}</script><style>${articleCss()}</style></head><body><header class="header"><div class="container header-inner"><a class="logo" href="/"><span class="heart">♥</span><span><strong>推し活資金AI</strong><small>推しを諦めないためのお金管理AI</small></span></a><nav class="nav"><a href="/">ホーム</a><a href="/fund">診断ツール</a><a href="/transport">遠征プランナー</a><a href="/yearly">目標シミュレーター</a><a href="/kakeibo">推し活家計簿</a><a class="active" href="/articles">お役立ち記事</a></nav><a class="cta" href="/fund">すべて無料で使えます</a></div></header><main class="ssr-article"><article>${image?`<img class="ssr-eye" src="${attr(image)}" alt="${attr(title)}">`:''}<div class="ssr-inner"><nav class="ssr-breadcrumb"><a href="/">ホーム</a><span>›</span><a href="/articles">お役立ち記事</a><span>›</span><span>${esc(title)}</span></nav><div class="ssr-category">♡ ${esc(category)}</div><h1>${esc(title)}</h1><div class="ssr-meta">${published?`<span>公開日：${date(published)}</span>`:''}${updated?`<span>更新日：${date(updated)}</span>`:''}</div><section class="ssr-learn"><h2>この記事でわかること</h2><ul>${headings(body).map(h=>`<li>${esc(h)}</li>`).join('')}</ul></section><div class="ssr-body">${body}</div><section class="ssr-author"><h2>この記事を書いた人</h2><h3>推し活資金AI編集部</h3><p>ライブ遠征、ホテル、交通費、チケット、夜行バス、推し活の節約方法を中心に、初心者にも実践しやすい情報を発信しています。公式サイトや運営会社の情報を確認し、必要に応じて内容を見直しています。</p><a href="/about">編集方針・運営者情報を見る →</a></section>${related.length?`<section class="ssr-related"><h2>あわせて読みたい記事</h2><div>${related.map(card).join('')}</div></section>`:''}</div></article></main>${footer()}<div class="ssr-sticky"><a href="/fund">資金診断</a><a href="/transport">遠征計算</a><a href="/yearly">目標計算</a><a href="/kakeibo">家計簿</a></div></body></html>`;
}
function card(a){const t=text(a.title||a.name||"記事");const s=normalize(a.slug||a.urlSlug||a.url_slug||a.permalink||a.id);return `<a href="/article?id=${encodeURIComponent(s)}">${esc(t)}</a>`}
function footer(){return `<footer class="topv3-footer"><div class="topv3-container topv3-footer-grid"><div><h2>推し活資金AI</h2><p>推しを諦めないためのお金管理AI</p></div><div><h3>サービス</h3><p><a href="/fund">推し活資金診断</a></p><p><a href="/saving">娯楽費捻出診断</a></p><p><a href="/transport">遠征プランナー</a></p><p><a href="/yearly">目標シミュレーター</a></p><p><a href="/kakeibo">推し活家計簿</a></p></div><div><h3>お役立ち情報</h3><p><a href="/articles">記事一覧</a></p><p><a href="/categories">カテゴリ一覧</a></p></div><div><h3>運営について</h3><p><a href="/terms">利用規約</a></p><p><a href="/privacy">プライバシーポリシー</a></p><p><a href="/contact">お問い合わせ</a></p><p><a href="/about">運営者情報</a></p><p><a href="/sitemap.xml">サイトマップ</a></p></div></div><p class="topv3-copy">© 2026 推し活資金AI</p></footer>`}
function articleCss(){return `.ssr-article{width:min(920px,calc(100% - 24px));margin:32px auto 120px}.ssr-article article{overflow:hidden;border:1px solid #ffd1e5;border-radius:24px;background:#fff;box-shadow:0 16px 40px rgba(255,111,174,.12)}.ssr-eye{width:100%;aspect-ratio:16/9;object-fit:cover}.ssr-inner{padding:clamp(22px,4vw,42px)}.ssr-breadcrumb{display:flex;flex-wrap:wrap;gap:8px;font-size:13px;margin-bottom:18px}.ssr-category{display:inline-block;padding:6px 12px;border-radius:999px;background:#fff3f8;color:#d63384;font-weight:700}.ssr-article h1{font-size:clamp(26px,4vw,38px);line-height:1.4}.ssr-meta{display:flex;gap:14px;color:#777;font-size:13px}.ssr-learn,.ssr-author{margin:26px 0;padding:20px;border:1px solid #ffd1e5;border-radius:18px;background:#fff8fb}.ssr-body{font-size:16px;line-height:2}.ssr-body h2{margin:44px 0 18px;padding:16px 18px;border-left:7px solid #ff6fae;border-radius:14px;background:#fff3f8}.ssr-body h3{margin:32px 0 14px;color:#d63384;border-bottom:2px dashed #ff9ac7;padding-bottom:8px}.ssr-body img{max-width:100%;height:auto}.ssr-body table{width:100%;border-collapse:collapse}.ssr-body th,.ssr-body td{border:1px solid #ffd1e5;padding:10px}.ssr-related{margin-top:36px}.ssr-related>div{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}.ssr-related a{display:block;padding:14px;border:1px solid #ffd1e5;border-radius:14px;text-decoration:none}.ssr-sticky{position:fixed;z-index:999;left:50%;bottom:12px;transform:translateX(-50%);display:grid;grid-template-columns:repeat(4,1fr);width:min(760px,calc(100% - 20px));background:#fff;border:1px solid #ff9ac7;border-radius:18px;box-shadow:0 10px 30px rgba(255,111,174,.24);overflow:hidden}.ssr-sticky a{padding:13px 8px;text-align:center;color:#c92f78;font-weight:800;text-decoration:none;border-right:1px solid #ffe1ee}.ssr-sticky a:last-child{border:0}@media(max-width:640px){.ssr-inner{padding:20px}.ssr-related>div{grid-template-columns:1fr}.ssr-sticky a{font-size:12px;padding:11px 4px}}`}
function headings(html){const out=[];for(const m of html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)){out.push(text(m[1]));if(out.length===4)break;}return out.length?out:["記事の要点","初心者向けの実践方法","注意点と確認事項"]}
function sanitize(v){return String(v||"").replace(/<script[\s\S]*?<\/script>/gi,"").replace(/\son\w+\s*=\s*(["']).*?\1/gi,"").replace(/javascript:/gi,"")}
function imageUrl(v){return typeof v==='string'?v:(v&&v.url)||""}
function normalize(v){
  let value = String(v || "").trim();
  if (!value) return "";
  try { value = decodeURIComponent(value); } catch {}
  // permalinkに完全URLが入っている場合もslugだけを比較する。
  try {
    if (/^https?:\/\//i.test(value)) {
      const url = new URL(value);
      value = url.searchParams.get("id") || url.pathname;
    }
  } catch {}
  value = value.split("#")[0].split("?")[0];
  return value.trim().replace(/^\/+|\/+$/g, "").replace(/^article\//, "");
}
function articleKeys(article){
  return [...new Set([article.slug,article.urlSlug,article.url_slug,article.permalink,article.id].map(normalize).filter(Boolean))];
}
function text(v){return String(v||"").replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim()}
function esc(v){return String(v||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]))}
function attr(v){return esc(v)}
function json(v){return JSON.stringify(v).replace(/</g,"\\u003c")}
function date(v){try{return new Intl.DateTimeFormat("ja-JP").format(new Date(v))}catch{return ""}}
function send404(res){res.setHeader("Content-Type","text/html; charset=utf-8");return res.status(404).send(errorPage("記事が見つかりませんでした", true))}
function errorPage(msg, noindex=false){return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(msg)}｜推し活資金AI</title>${noindex?'<meta name="robots" content="noindex,follow">':''}<link rel="stylesheet" href="/style.css"></head><body><main style="max-width:720px;margin:80px auto;padding:24px;text-align:center"><h1>${esc(msg)}</h1><p><a href="/articles">記事一覧へ戻る</a></p></main></body></html>`}
