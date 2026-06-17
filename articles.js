async function loadArticles() {

  const mount =
    document.getElementById("blogList") ||
    document.getElementById("articleList");

  if (!mount) return;

  try {

    let data;

    try {

      const res = await fetch("/api/articles", {
        cache: "no-store"
      });

      if (!res.ok) throw new Error();

      data = await res.json();

    } catch (_) {

      const res = await fetch("/articles.json");

      data = await res.json();

    }

    const today = new Date().toISOString().slice(0,10);

    const articles = Array.isArray(data)
      ? data
      : (
          data.contents ||
          data.articles ||
          data.posts ||
          []
        );

    mount.innerHTML = articles

      .filter(a => !a.publishDate || a.publishDate <= today)

      .map(a => {

        const title =
          a.title || "記事タイトル";

        const category =
          a.category || "推し活コラム";

        const summary =
          a.summary ||
          a.description ||
          "";

        const slug =
          a.slug ||
          a.urlSlug ||
          a.url_slug ||
          a.permalink ||
          a.id;

        const img =
          a.thumbnail?.url ||
          a.image?.url ||
          a.eyecatch?.url ||
          "";

        return `

<article class="blog-card">

${
img
? `<img class="blog-thumb"
src="${img}"
alt="${title}">`
: `<div class="blog-card-thumb">
💗
</div>`
}

<div class="blog-card-body">

<span class="blog-category">
${category}
</span>

<h2>
${title}
</h2>

<p>
${summary}
</p>

<a class="blog-read"
href="article.html?id=${encodeURIComponent(slug)}">

読む →

</a>

</div>

</article>

`;

      })

      .join("");

  }

  catch (e) {

    console.error(e);

    mount.innerHTML =
      "<p>記事を取得できませんでした。</p>";

  }

}

loadArticles();
