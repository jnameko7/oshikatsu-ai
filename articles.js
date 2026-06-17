async function loadArticles(){
  const mount = document.getElementById('blogList') || document.getElementById('articleList');
  if(!mount) return;
  try{
    let data;
    try{
      const res = await fetch('/api/articles', { cache:'no-store' });
      if(!res.ok) throw new Error('api failed');
      data = await res.json();
    }catch(_){
      const res = await fetch('/articles.json', { cache:'no-store' });
      data = await res.json();
    }
    const today = new Date().toISOString().slice(0,10);
    const articles = Array.isArray(data) ? data : (data.contents || data.articles || data.posts || data.items || []);
    mount.innerHTML = articles
      .filter(a => !a.publishDate || a.publishDate <= today)
      .map(a => {
        const title = a.title || a.name || '記事タイトル';
        const category = a.category || a.genre || '推し活コラム';
        const summary = a.summary || a.description || a.excerpt || '';
        const slug = a.slug || a.urlSlug || a.url_slug || a.permalink || a.id;
        const href = slug ? `/article/${encodeURIComponent(String(slug).replace(/^\/+|\/+$/g,'').replace(/\.html?$/i,''))}` : '/articles';
        const img = a.thumbnail?.url || a.image?.url || a.eyecatch?.url || a.thumbnailUrl || a.imageUrl || '';
        return `<article class="article-card">${img?`<img src="${img}" alt="${title}">`:''}<span class="tag">${category}</span><h3>${title}</h3><p>${summary}</p><a class="btn pink" href="${href}">読む</a></article>`;
      })
      .join('');
  }catch(e){
    console.error(e);
    mount.innerHTML = '<p>記事を取得できませんでした。</p>';
  }
}
loadArticles();
