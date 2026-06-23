// articles.js：記事一覧検索＋タグ表示/絞り込み＋20件ページ分け＋/article?id=スラッグ統一
(function () {
  const root = document.getElementById("articleList");
  const searchInput = document.getElementById("articleSearchInput");
  const pagination = document.getElementById("articlePagination");

  if (!root) return;

  injectTagStyles();

  const PER_PAGE = 20;
  let allArticles = [];
  let filteredArticles = [];
  let currentPage = 1;
  let selectedTag = "";

  loadArticles();

  async function loadArticles() {
    try {
      const res = await fetch("/api/articles", { cache: "no-store" });
      const data = await res.json();

      allArticles = collectArticles(data);
      filteredArticles = allArticles;

      renderTagFilterArea();
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

  function renderTagFilterArea() {
    const tools = document.querySelector(".article-tools");
    if (!tools || document.getElementById("articleTagFilter")) return;

    tools.insertAdjacentHTML(
      "beforeend",
      '<div id="articleTagFilter" class="article-tag-filter" aria-live="polite"></div>'
    );

    renderTagFilterButtons();
  }

  function renderTagFilterButtons() {
    const mount = document.getElementById("articleTagFilter");
    if (!mount) return;

    const tags = getAllTags();

    if (!tags.length) {
      mount.innerHTML = "";
      return;
    }

    mount.innerHTML = `
      <div class="article-tag-filter-title">タグで絞り込み</div>
      <div class="article-tag-filter-buttons">
        <button type="button" class="article-tag-button ${!selectedTag ? "active" : ""}" data-tag="">すべて</button>
        ${tags.map(tag => `
          <button type="button" class="article-tag-button ${selectedTag === tag ? "active" : ""}" data-tag="${escapeAttr(tag)}">${escapeHtml(tag)}</button>
        `).join("")}
      </div>
      ${selectedTag ? `<p class="article-tag-active">「${escapeHtml(selectedTag)}」の記事を表示中</p>` : ""}
    `;

    mount.querySelectorAll(".article-tag-button").forEach(button => {
      button.addEventListener("click", function () {
        selectedTag = String(button.dataset.tag || "");
        currentPage = 1;
        runSearch();
        renderTagFilterButtons();
      });
    });
  }

  function getAllTags() {
    const set = new Set();
    allArticles.forEach(article => {
      getTags(article).forEach(tag => set.add(tag));
    });
    return Array.from(set);
  }

  function runSearch() {
    const keyword = String(searchInput && searchInput.value || "").trim().toLowerCase();

    filteredArticles = allArticles.filter(article => {
      const tags = getTags(article);
      const categoryText = Array.isArray(article.category)
        ? article.category.join(" ")
        : String(article.category || "");

      const tagMatch = !selectedTag || tags.includes(selectedTag);

      if (!keyword) return tagMatch;

      const text = [
        article.title,
        article.description,
        article.summary,
        article.excerpt,
        article.lead,
        article.slug,
        article.id,
        categoryText,
        tags.join(" ")
      ].join(" ").toLowerCase();

      return tagMatch && text.includes(keyword);
    });

    render();
  }

  function render() {
    const start = (currentPage - 1) * PER_PAGE;
    const list = filteredArticles.slice(start, start + PER_PAGE);

    root.innerHTML = list.length
      ? list.map(cardHtml).join("")
      : "<p>該当する記事がありません。</p>";

    bindCardTagButtons();
    renderPagination();
    renderTagFilterButtons();
  }

  function bindCardTagButtons() {
    root.querySelectorAll(".article-card-tag").forEach(button => {
      button.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        selectedTag = String(button.dataset.tag || "");
        currentPage = 1;
        runSearch();
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    });
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
    const tags = getTags(article);
    const tagsHtml = tags.length
      ? `<div class="article-card-tags">${tags.map(tag => `<button type="button" class="article-card-tag" data-tag="${escapeAttr(tag)}">${escapeHtml(tag)}</button>`).join("")}</div>`
      : "";

    return `
      <a class="article-card blog-card" href="${escapeAttr(href)}">
        ${img ? `<img src="${escapeAttr(img)}" alt="${escapeAttr(title)}">` : ""}
        <div class="article-card-body blog-card-body">
          <span class="article-category">${escapeHtml(String(category))}</span>
          <h2>${escapeHtml(title)}</h2>
          ${date ? `<p class="article-date">${escapeHtml(formatDate(date))}</p>` : ""}
          ${desc ? `<p>${escapeHtml(desc)}</p>` : ""}
          ${tagsHtml}
        </div>
      </a>
    `;
  }

  function getTags(article) {
    const raw = article && article.tags;
    if (!raw) return [];

    if (Array.isArray(raw)) {
      return raw.map(tagToText).filter(Boolean);
    }

    if (typeof raw === "string") {
      return raw.split(/[、,\s]+/).map(tagToText).filter(Boolean);
    }

    return [tagToText(raw)].filter(Boolean);
  }

  function tagToText(value) {
    if (!value) return "";
    if (typeof value === "object") {
      return String(value.name || value.label || value.title || value.value || value.id || "").trim();
    }
    return String(value || "").trim();
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

  function injectTagStyles() {
    if (document.getElementById("articleTagStyle")) return;

    const style = document.createElement("style");
    style.id = "articleTagStyle";
    style.textContent = `
      .article-tools{display:grid;gap:14px;margin-bottom:22px}
      .article-tag-filter{display:grid;gap:10px}
      .article-tag-filter-title{font-size:13px;font-weight:900;color:#7a4d62}
      .article-tag-filter-buttons{display:flex;flex-wrap:wrap;gap:8px}
      .article-tag-button,.article-card-tag{appearance:none;border:1px solid #ffd1e5;border-radius:999px;background:#fff3f8;color:#d63384;font-weight:800;cursor:pointer;line-height:1.2;transition:.15s ease}
      .article-tag-button{padding:8px 12px;font-size:13px}
      .article-card-tag{padding:5px 9px;font-size:12px}
      .article-tag-button:hover,.article-card-tag:hover,.article-tag-button.active{background:#ff6fae;color:#fff;border-color:#ff6fae}
      .article-tag-active{margin:0;color:#7a4d62;font-size:13px;font-weight:700}
      .article-card-tags{display:flex;flex-wrap:wrap;gap:6px;margin-top:12px}
    `;
    document.head.appendChild(style);
  }
})();
