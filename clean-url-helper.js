// TOPページなどに古い article?id= / .html リンクが残っていても、表示後に自動で /article/slug 形式へ直す補助JSです。
(function(){
  function cleanArticleUrl(url){
    try{
      const u=new URL(url, location.origin);
      if(u.pathname==='/article' || u.pathname==='/article.html'){
        const id=u.searchParams.get('id')||u.searchParams.get('slug');
        if(id)return '/article/'+encodeURIComponent(id);
      }
      return u.pathname.replace(/\.html$/,'') + u.search + u.hash;
    }catch(_){return url;}
  }
  function fixLinks(){
    document.querySelectorAll('a[href]').forEach(a=>{
      const old=a.getAttribute('href');
      const fixed=cleanArticleUrl(old);
      if(fixed!==old)a.setAttribute('href',fixed);
    });
  }
  fixLinks();
  new MutationObserver(fixLinks).observe(document.documentElement,{childList:true,subtree:true});
})();
