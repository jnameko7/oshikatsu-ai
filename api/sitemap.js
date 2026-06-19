export default async function handler(req, res) {
  const serviceDomain = process.env.MICROCMS_SERVICE_DOMAIN;
  const apiKey = process.env.MICROCMS_API_KEY;
  const siteUrl = "https://www.oshikatsu-kakeibo.com";

  const staticPages = [
    "",
    "fund",
    "saving",
    "transport",
    "yearly",
    "kakeibo",
    "articles",
    "terms",
    "privacy",
    "contact"
  ];

  let articleUrls = [];

  try {
    if (!serviceDomain || !apiKey) {
      throw new Error("microCMSの環境変数が未設定です");
    }

    const url = `https://${serviceDomain}.microcms.io/api/v1/articles?limit=100&orders=-publishedAt`;

    const response = await fetch(url, {
      headers: {
        "X-MICROCMS-API-KEY": apiKey
      }
    });

    if (!response.ok) {
      throw new Error(`microCMS取得失敗: ${response.status}`);
    }

    const data = await response.json();
    const contents = data.contents || [];

    articleUrls = contents
      .map(article => {
        const slug =
          article.slug ||
          article.urlSlug ||
          article.url_slug ||
          article.permalink ||
          article.id;

        if (!slug) return null;

        return `${siteUrl}/article?id=${encodeURIComponent(slug)}`;
      })
      .filter(Boolean);

    const urls = [
      ...staticPages.map(page => `${siteUrl}/${page}`),
      ...articleUrls
    ];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!-- articles count: ${articleUrls.length} -->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    url => `  <url>
    <loc>${url}</loc>
  </url>`
  )
  .join("\n")}
</urlset>`;

    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.status(200).send(xml);
  } catch (error) {
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.status(500).send(error.message);
  }
}
