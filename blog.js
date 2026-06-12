async function loadBlog() {
  const list = document.getElementById("blogList");

  if (!list) return;

  list.innerHTML = "<p>記事を読み込み中...</p>";

  try {

    const res = await fetch("/api/articles");
    const data = await res.json();

    if (!data.contents || data.contents.length === 0) {
      list.innerHTML = "<p>まだ記事がありません。</p>";
      return;
    }

    list.innerHTML = data.contents.map(article => {

      const image = article.thumbnail?.url || "";
      const description = article.description || "";

      const date =
        article.publishedAt
          ? article.publishedAt.slice(0,10)
          : "";

      return `
        <article class="blog-card">

          ${
            image
            ? `<img class="blog-card-image"
                   src="${image}"
                   alt="${article.title}">`
            : ""
          }

          <div class="blog-card-body">

            <span class="blog-category">
              推し活お役立ち記事
            </span>

            <h2>${article.title}</h2>

            <p>${description}</p>

            <div class="blog-date">
              ${date}
            </div>

            <a
              class="blog-read"
              href="article.html?id=${article.id}"
            >
              記事を読む
            </a>

          </div>

        </article>
      `;

    }).join("");

  } catch (e) {

    console.error(e);

    list.innerHTML =
      "<p>記事データを読み込めませんでした。</p>";
  }
}

loadBlog();
