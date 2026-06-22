async function loadArticle() {

  const params = new URLSearchParams(location.search);
  const id = params.get('id');

  const mount = document.getElementById('articleDetail');

  if (!id) {
    mount.innerHTML = '<p>記事が見つかりません。</p>';
    return;
  }

  try {

    const res = await fetch('/api/articles', {
      cache: 'no-store'
    });

    const data = await res.json();

    const list = Array.isArray(data)
      ? data
      : (data.contents || []);

    const article = list.find(x =>
      x.id === id ||
      x.slug === id ||
      x.urlSlug === id
    );

    if (!article) {
      mount.innerHTML = '<p>記事が見つかりません。</p>';
      return;
    }

    mount.innerHTML = `
      <article>

        ${
          article.thumbnail?.url
          ? `<img src="${article.thumbnail.url}" style="width:100%;border-radius:20px">`
          : ''
        }

        <h1>${article.title}</h1>

        <p>${article.description || ''}</p>

        <div>
          ${article.body || ''}
        </div>

      </article>
    `;

  } catch (e) {

    mount.innerHTML =
      '<p>記事の読み込みに失敗しました。</p>';

  }

}

loadArticle();
