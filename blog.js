async function loadBlog(){
  const list = document.getElementById("blogList");
  if(!list) return;

  try{
    const res = await fetch("blog-data.json");
    const articles = await res.json();

    list.innerHTML = articles.map(article => `
      <article class="blog-card">
        <div class="blog-card-thumb">${article.emoji || "📝"}</div>
        <div class="blog-card-body">
          <span class="blog-category">${article.category}</span>
          <h2>${article.title}</h2>
          <p>${article.summary}</p>
          <div class="blog-date">${article.date}</div>
          <a class="blog-read" href="${article.url}">記事を読む</a>
        </div>
      </article>
    `).join("");
  }catch(e){
    list.innerHTML = "<p>記事データを読み込めませんでした。</p>";
  }
}
loadBlog();
