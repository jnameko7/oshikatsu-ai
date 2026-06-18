// articles.js 完成版（/article?id=スラッグ に統一）
(function(){
  const candidates=['articleList','articlesList','articles','blogList','blogArticles','posts','contents'];
  const root=candidates.map(id=>document.getElementById(id)).find(Boolean)
    ||document.querySelector('[data-articles]')
    ||document.querySelector('.articles-grid')
    ||document.querySelector('.blog-grid');

  if(!root)return;

  loadArticles();

  async function loadArticles(){
    try{
      const data=await fetch('/api/articles',{cache:'no-store'})
        .then(r=>r.ok?r.json():null)
        .catch(()=>null);

      const list=collectArticles(data);

      if(!list.length)return;

      root.innerHTML=list.map(cardHtml).join('');
    }catch(e){
      console.warn(e);
    }
  }

  function collectArticles(data){
    if(Array.isArray(data))return data;

    if(data&&typeof data==='object'){
      for(const k of ['contents','articles','posts','items','list','records','data']){
        if(Array.isArray(data[k]))return data[k];
      }
    }

    return [];
  }

  function cardHtml(article){
    const title=pick(article,['title','name'])||'記事タイトル';
    const desc=pick(article,['lead','intro','excerpt','summary','description'])||'';
    const category=pick(article,['category','genre'])||'推し活コラム';
    const date=pick(article,['date','createdAt','updatedAt','publishedAt'])||'';
    const img=getImage(article);
    const href=buildArticleUrl(article);

    return `
      <a class="article-card blog-card" href="${escapeAttr(href)}">
        ${img?`<img src="${escapeAttr(img)}" alt="${escapeAttr(title)}">`:''}
        <div class="article-card-body blog-card-body">
          <span class="article-category">${escapeHtml(category)}</span>
          <h2>${escapeHtml(title)}</h2>
          ${date?`<p class="article-date">${escapeHtml(formatDate(date))}</p>`:''}
          ${desc?`<p>${escapeHtml(desc)}</p>`:''}
        </div>
      </a>
    `;
  }

  function buildArticleUrl(article){
    const slug=pick(article,[
      'slug',
      'urlSlug',
      'url_slug',
      'permalink',
      'id',
      'articleId',
      'article_id',
      'uid',
      'key'
    ]);

    return slug
      ? '/article?id='+encodeURIComponent(normalizeSlug(slug))
      : '/articles';
  }

  function getImage(article){
    let v=pick(article,[
      'image',
      'eyecatch',
      'eyecatchUrl',
      'eyeCatchUrl',
      'thumbnail',
      'thumbnailUrl',
      'imageUrl',
      'coverImage',
      'mainImage',
      'featuredImage',
      'ogImage'
    ]);

    if(v&&typeof v==='object'){
      v=v.url||v.src||v.href||'';
    }

    return String(v||'').trim();
  }

  function pick(obj,keys){
    for(const k of keys){
      const v=obj&&obj[k];

      if(v!==undefined&&v!==null&&String(v).trim()!==''){
        return v;
      }
    }

    return '';
  }

  function normalizeSlug(v){
    return decodeURIComponent(String(v||''))
      .trim()
      .replace(/^https?:\/\/[^/]+/,'')
      .replace(/^\/?article\.html\/?/i,'')
      .replace(/^\/?article\/?/i,'')
      .replace(/^\?id=/i,'')
      .replace(/^\?slug=/i,'')
      .replace(/^\/+|\/+$/g,'')
      .replace(/\.html?$/i,'')
      .toLowerCase();
  }

  function formatDate(v){
    const d=new Date(v);

    return isNaN(d)
      ? String(v||'')
      : d.toLocaleDateString('ja-JP',{
          year:'numeric',
          month:'long',
          day:'numeric'
        });
  }

  function escapeHtml(s){
    return String(s||'').replace(/[&<>'"]/g,c=>({
      '&':'&amp;',
      '<':'&lt;',
      '>':'&gt;',
      "'":'&#39;',
      '"':'&quot;'
    }[c]));
  }

  function escapeAttr(s){
    return escapeHtml(s);
  }

})();
