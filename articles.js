// articles.js：記事一覧検索＋20件ページ分け＋/article?id=スラッグ統一
(function () {
  const root = document.getElementById("articleList");
  const searchInput = document.getElementById("articleSearchInput");
  const pagination = document.getElementById("articlePagination");

  if (!root) return;

  const PER_PAGE = 20;
  let allArticles = [];
  let filteredArticles = [];
  let currentPage = 1;

  loadArticles();

  async function loadArticles() {
    try {
      const res = await fetch("/api/articles", { cache: "no-store" });
      const data = await res.json();

      allArticles = collectArticles(data);
      filteredArticles = allArticles;

      render();
    } catch (e) {
      console.warn(e);
      root.innerHTML = "<p>記事を取得できませんでした。</p>";
    }
  }

  function collectArticles(data) {
    if (Array.isArray(data)) return data;

    if (data && typeof data === "object") {
      for (const key of ["contents", "articles", "posts", "items", "list", "records", "data"]) {
        if (Array.isArray(data[key])) return data[key];
      }
    }

    return [];
  }

  if (searchInput) {
    searchInput.addEventListener("input", function () {
      currentPage = 1;
      runSearch();
    });

    searchInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        currentPage = 1;
        runSearch();
      }
    });
  }

  function runSearch() {
    const keyword = String(searchInput.value || "").trim().toLowerCase();

    if (!keyword) {
      filteredArticles = allArticles;
      render();
      return;
    }

    filteredArticles = allArticles.filter(article => {
      const categoryText = Array.isArray(article.category)
        ? article.category.join(" ")
        : String(article.category || "");

      const text = [
        article.title,
        article.description,
        article.summary,
        article.excerpt,
        article.lead,
        article.slug,
        article.id,
        categoryText
      ].join(" ").toLowerCase();

      return text.includes(keyword);
    });

    render();
  }

  function render() {
    const start = (currentPage - 1) * PER_PAGE;
    const list = filteredArticles.slice(start, start + PER_PAGE);

    root.innerHTML = list.length
      ? list.map(cardHtml).join("")
      : "<p>該当する記事がありません。</p>";

    renderPagination();
  }

  function renderPagination() {
    if (!pagination) return;

    const totalPages = Math.ceil(filteredArticles.length / PER_PAGE);

    if (totalPages <= 1) {
      pagination.innerHTML = "";
      return;
    }

    const buttons = [];

    if (currentPage > 1) {
      buttons.push(`<button type="button" data-page="${currentPage - 1}">前へ</button>`);
    }

    for (let i = 1; i <= totalPages; i++) {
      buttons.push(`<button type="button" class="${i === currentPage ? "active" : ""}" data-page="${i}">${i}</button>`);
    }

    if (currentPage < totalPages) {
      buttons.push(`<button type="button" data-page="${currentPage + 1}">次へ</button>`);
    }

    pagination.innerHTML = buttons.join("");

    pagination.querySelectorAll("button").forEach(btn => {
      btn.addEventListener("click", () => {
        currentPage = Number(btn.dataset.page);
        render();
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    });
  }

  function cardHtml(article) {
    const title = pick(article, ["title", "name"]) || "記事タイトル";
    const desc = (pick(article, ["lead", "intro", "excerpt", "summary", "description"]) || "").slice(0, 90);
    const category = pick(article, ["category", "genre"]) || "推し活コラム";
    const date = pick(article, ["date", "createdAt", "updatedAt", "publishedAt", "publishedAtCustom"]) || "";
    const img = getImage(article);
    const href = buildArticleUrl(article);

    return `
      <a class="article-card blog-card" href="${escapeAttr(href)}">
        ${img ? `<img src="${escapeAttr(img)}" alt="${escapeAttr(title)}">` : ""}
        <div class="article-card-body blog-card-body">
          <span class="article-category">${escapeHtml(String(category))}</span>
          <h2>${escapeHtml(title)}</h2>
          ${date ? `<p class="article-date">${escapeHtml(formatDate(date))}</p>` : ""}
          ${desc ? `<p>${escapeHtml(desc)}</p>` : ""}
        </div>
      </a>
    `;
  }

  function buildArticleUrl(article) {
    const slug =
      article.slug ||
      article.urlSlug ||
      article.url_slug ||
      article.permalink ||
      article.id ||
      article.articleId ||
      article.article_id ||
      article.uid ||
      article.key;

    return slug
      ? "/article?id=" + encodeURIComponent(normalizeSlug(slug))
      : "/articles";
  }

  function getImage(article) {
    let v = pick(article, [
      "image",
      "eyecatch",
      "eyecatchUrl",
      "eyeCatchUrl",
      "thumbnail",
      "thumbnailUrl",
      "imageUrl",
      "coverImage",
      "mainImage",
      "featuredImage",
      "ogImage"
    ]);

    if (v && typeof v === "object") {
      v = v.url || v.src || v.href || "";
    }

    return String(v || "").trim();
  }

  function pick(obj, keys) {
    for (const key of keys) {
      const value = obj && obj[key];

      if (value !== undefined && value !== null && String(value).trim() !== "") {
        return value;
      }
    }

    return "";
  }

  function normalizeSlug(value) {
    return decodeURIComponent(String(value || ""))
      .trim()
      .replace(/^https?:\/\/[^/]+/i, "")
      .replace(/^\/?article\.html\/?/i, "")
      .replace(/^\/?article\/?/i, "")
      .replace(/^\?id=/i, "")
      .replace(/^\?slug=/i, "")
      .replace(/^\/+|\/+$/g, "")
      .replace(/\.html?$/i, "")
      .toLowerCase();
  }

  function formatDate(value) {
    const date = new Date(value);
    return isNaN(date)
      ? String(value || "")
      : date.toLocaleDateString("ja-JP", {
          year: "numeric",
          month: "long",
          day: "numeric"
        });
  }

  function escapeHtml(value) {
    return String(value || "").replace(/[&<>'"]/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;"
    }[char]));
  }

  function escapeAttr(value) {
    return escapeHtml(value);
  }
})();
