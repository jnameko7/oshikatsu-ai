const SITE = "https://www.oshikatsu-kakeibo.com";
const PER_PAGE = 20;
const GA_ID = "G-3CGGLYQE0X";

export default async function handler(req, res) {
  const config = getConfig();
  if (!config) return res.status(503).send(errorPage("記事一覧を取得できませんでした"));
  try {
    const all = await fetchAllArticles(config);
    const q = single(req.query.q).trim();
    const tag = single(req.query.tag).trim();
    const page = Math.max(1, Number(single(req.query.page)) || 1);
    const filtered = all.filter(a => matches(a, q, tag));
    const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
    const safePage = Math.min(page, totalPages);
    const list = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);
    const html = renderPage({ all, list, q, tag, page:safePage, totalPages, total:filtered.length });
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=86400");
    return res.status(200).send(html);
  } catch (error) {
    console.error(error);
    return res.status(500).send(errorPage("記事一覧の表示中にエラーが発生しました"));
  }
}
function getConfig(){const serviceDomain=process.env.MICROCMS_SERVICE_DOMAIN;const apiKey=process.env.MICROCMS_API_KEY;return serviceDomain&&apiKey?{serviceDomain,apiKey}:null}
async function fetchAllArticles({serviceDomain,apiKey}){const limit=100;const all=[];let offset=0,total=Infinity;while(offset<total){const url=`https://${serviceDomain}.microcms.io/api/v1/articles?limit=${limit}&offset=${offset}&orders=-publishedAt`;const r=await fetch(url,{headers:{"X-MICROCMS-API-KEY":apiKey}});if(!r.ok)throw new Error(`microCMS ${r.status}`);const d=await r.json();const c=Array.isArray(d.contents)?d.contents:[];all.push(...c);total=Number(d.totalCount??all.length);if(!c.length)break;offset+=c.length}const now=Date.now();return all.filter(a=>{const d=a.publishDate||a["予約公開日時"]||a.publishedAt||a.createdAt;return !d||new Date(d).getTime()<=now})}
function renderPage({all,list,q,tag,page,totalPages,total}){
  const tags=allTags(all);
  const hasFilter=Boolean(q||tag);
  const canonical=hasFilter?`${SITE}/articles`:`${SITE}/articles${page>1?`?page=${page}`:""}`;
  const robots=q?"noindex,follow":"index,follow,max-image-preview:large";
  const heading=tag?`「${esc(tag)}」の記事`:q?`「${esc(q)}」の検索結果`:"最新記事";
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${hasFilter?`${esc(q||tag)}の記事検索｜`:page>1?`お役立ち記事 ${page}ページ目｜`:"お役立ち記事｜"}推し活資金AI</title><meta name="description" content="遠征費、グッズ費、家計管理など、推し活を続けるためのヒントをまとめています。"><meta name="robots" content="${robots}"><link rel="canonical" href="${canonical}"><meta property="og:type" content="website"><meta property="og:title" content="お役立ち記事｜推し活資金AI"><meta property="og:description" content="推し活・遠征・節約のお役立ち記事をまとめています。"><meta property="og:url" content="${canonical}"><link rel="stylesheet" href="/style.css">${analytics()}<script async src="https://pagead2.googlesyndication.com/pagead/js?client=ca-pub-6088406710027099" crossorigin="anonymous"></script><style>${pageCss()}</style></head><body>${header()}<main><section class="blog-hero"><div class="container"><div class="blog-hero-box"><h1>推し活・遠征・節約のお役立ち記事</h1><p>遠征費、グッズ費、家計管理など、推し活を続けるためのヒントをまとめています。</p></div></div></section><section class="section"><div class="container"><div class="title"><h2>${heading}</h2></div><form class="article-tools ssr-search-form" method="get" action="/articles"><input id="articleSearchInput" name="q" type="search" value="${attr(q)}" placeholder="記事を検索する"><button type="submit">検索</button>${hasFilter?'<a class="ssr-clear" href="/articles">条件をクリア</a>':''}</form>${tags.length?`<div class="article-tag-filter-wrap"><p class="article-tag-filter-title">タグで絞り込み</p><nav class="article-tag-filter" aria-label="タグで絞り込み"><a class="article-tag-button ${!tag?"active":""}" href="/articles">すべて</a>${tags.map(t=>`<a class="article-tag-button ${tag===t?"active":""}" href="/articles?tag=${encodeURIComponent(t)}">${esc(t)}</a>`).join("")}</nav>${tag?`<p class="article-tag-active">「${esc(tag)}」の記事を表示中</p>`:""}</div>`:""}<div class="blog-grid" id="articleList">${list.length?list.map(card).join(""):'<p class="ssr-empty">該当する記事がありません。</p>'}</div>${pagination(page,totalPages,q,tag)}</div></section></main>${footer()}</body></html>`
}
function card(a){
  const title=plain(a.title||a.name||"記事タイトル");
  const desc=plain(a.lead||a.intro||a.excerpt||a.summary||a.description||"").slice(0,90);
  const cat=label(a.category||a.genre)||"推し活コラム";
  const dt=a.date||a.publishDate||a["予約公開日時"]||a.createdAt||a.updatedAt||a.publishedAt||"";
  const img=imageUrl(a.image||a.eyecatch||a.thumbnail)||a.eyecatchUrl||a.eyeCatchUrl||a.thumbnailUrl||a.imageUrl||a.coverImage||a.mainImage||a.featuredImage||a.ogImage||"";
  const slug=normalize(a.slug||a.urlSlug||a.url_slug||a.permalink||a.id||a.articleId||a.article_id||a.uid||a.key);
  const tags=getTags(a);
  return `<a class="article-card blog-card" href="/article?id=${encodeURIComponent(slug)}">${img?`<img class="ssr-card-image" src="${attr(img)}" alt="${attr(title)}" loading="lazy">`:""}<div class="article-card-body blog-card-body"><span class="article-category blog-category">${esc(cat)}</span><h2>${esc(title)}</h2>${dt?`<p class="article-date blog-date">${date(dt)}</p>`:""}${desc?`<p>${esc(desc)}</p>`:""}${tags.length?`<div class="article-card-tags article-tags">${tags.map(t=>`<span class="article-card-tag article-tag">${esc(t)}</span>`).join("")}</div>`:""}</div></a>`
}
function pagination(page,totalPages,q,tag){
  if(totalPages<=1)return"";
  const items=[];
  const makeHref=i=>{const params=new URLSearchParams();if(q)params.set("q",q);if(tag)params.set("tag",tag);if(i>1)params.set("page",String(i));return "/articles"+(params.toString()?`?${params}`:"")};
  if(page>1)items.push(`<a href="${makeHref(page-1)}">前へ</a>`);
  for(let i=1;i<=totalPages;i++)items.push(`<a class="${i===page?"active":""}" href="${makeHref(i)}">${i}</a>`);
  if(page<totalPages)items.push(`<a href="${makeHref(page+1)}">次へ</a>`);
  return `<nav class="article-pagination" aria-label="ページ送り">${items.join("")}</nav>`
}
function matches(a,q,tag){const tags=getTags(a);if(tag&&!tags.includes(tag))return false;if(!q)return true;const hay=[a.title,a.description,a.summary,a.excerpt,a.lead,a.slug,a.id,label(a.category),tags.join(" ")].map(plain).join(" ").toLowerCase();return hay.includes(q.toLowerCase())}
function allTags(list){const s=new Set();list.forEach(a=>getTags(a).forEach(t=>s.add(t)));return [...s].sort((a,b)=>a.localeCompare(b,"ja")).slice(0,30)}
function getTags(a){const raw=a&&a.tags;if(!raw)return[];const arr=Array.isArray(raw)?raw:typeof raw==="string"?raw.split(/[、,\s]+/):[raw];return [...new Set(arr.map(label).filter(Boolean))]}
function label(v){if(!v)return"";if(typeof v==="object")return plain(v.name||v.label||v.title||v.value||v.id||"");return plain(v)}
function imageUrl(v){return typeof v==="string"?v:(v&&v.url)||""}
function normalize(v){let s=String(v||"").trim();try{s=decodeURIComponent(s)}catch{}return s.replace(/^https?:\/\/[^/]+/i,"").replace(/^\/?article(?:\.html)?\/?/i,"").replace(/^\/+|\/+$/g,"").replace(/\.html?$/i,"")}
function single(v){return Array.isArray(v)?String(v[0]||""):String(v||"")}
function plain(v){return String(v||"").replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim()}
function esc(v){return String(v||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]))}
function attr(v){return esc(v)}
function date(v){try{return new Intl.DateTimeFormat("ja-JP").format(new Date(v))}catch{return""}}
function analytics(){return `<script async src="https://www.googletagmanager.com/gtag/js?id=${GA_ID}"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${GA_ID}');</script>`}
function header(){return `<header class="header"><div class="container header-inner"><a class="logo" href="/"><span class="heart">♥</span><span><strong>推し活資金AI</strong><small>推しを諦めないためのお金管理AI</small></span></a><nav class="nav"><a href="/">ホーム</a><a href="/fund">診断ツール</a><a href="/transport">遠征プランナー</a><a href="/yearly">目標シミュレーター</a><a href="/kakeibo">推し活家計簿</a><a class="active" href="/articles">お役立ち記事</a></nav><a class="cta" href="/fund">すべて無料で使えます</a></div></header>`}
function footer(){return `<footer class="topv3-footer"><div class="topv3-container topv3-footer-grid"><div><h2>推し活資金AI</h2><p>推しを諦めないためのお金管理AI</p><div class="topv3-social"><span>𝕏</span><span>◎</span><span>▶</span></div></div><div><h3>サービス</h3><p><a href="/fund">推し活資金診断</a></p><p><a href="/saving">娯楽費捻出診断</a></p><p><a href="/transport">遠征プランナー</a></p><p><a href="/yearly">目標シミュレーター</a></p><p><a href="/kakeibo">推し活家計簿</a></p></div><div><h3>お役立ち情報</h3><p><a href="/articles">お役立ち記事一覧</a></p><p><a href="/articles">節約術</a></p><p><a href="/articles">遠征のコツ</a></p><p><a href="/articles">ホテル比較</a></p><p><a href="/articles">ライブ準備</a></p></div><div><h3>運営について</h3><p><a href="/terms">利用規約</a></p><p><a href="/privacy">プライバシーポリシー</a></p><p><a href="/contact">お問い合わせ</a></p><p><a href="/about">運営者情報</a></p><p><a href="/categories">カテゴリ一覧</a></p><p><a href="/sitemap.xml">サイトマップ</a></p></div></div><p class="topv3-copy">© 2025 推し活資金AI</p></footer>`}
function pageCss(){return `.ssr-search-form{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px}.ssr-search-form input{width:100%}.ssr-search-form button,.ssr-clear{border:0;background:#ff77aa;color:#fff;padding:0 18px;border-radius:14px;font-weight:900;text-decoration:none;display:grid;place-items:center;min-height:48px}.ssr-clear{grid-column:1/-1;justify-self:start;padding:9px 16px;min-height:auto}.article-tag-filter a{text-decoration:none;display:inline-flex;align-items:center}.article-tag-active{margin:10px 0 0;color:#6e7587;font-size:13px;font-weight:800}.article-card.blog-card{text-decoration:none;color:inherit}.ssr-card-image{width:100%;height:220px;object-fit:cover;display:block}.article-card-tags{display:flex;flex-wrap:wrap;gap:7px;margin-top:12px}.article-pagination a{border:none;background:#fff;padding:10px 16px;border-radius:999px;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.08);text-decoration:none;color:inherit}.article-pagination a.active{background:#ff77aa;color:#fff}.ssr-empty{grid-column:1/-1;text-align:center;padding:40px}@media(max-width:640px){.ssr-search-form{grid-template-columns:1fr}.ssr-search-form button{padding:12px}.ssr-card-image{height:auto;aspect-ratio:16/9}}`}
function errorPage(msg){return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,follow"><title>${esc(msg)}｜推し活資金AI</title><link rel="stylesheet" href="/style.css"></head><body><main style="max-width:720px;margin:80px auto;padding:24px;text-align:center"><h1>${esc(msg)}</h1><p><a href="/">ホームへ戻る</a></p></main></body></html>`}
