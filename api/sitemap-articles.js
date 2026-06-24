export default async function handler(req, res) {
  const siteUrl = "https://www.oshikatsu-kakeibo.com";
  const serviceDomain = process.env.MICROCMS_SERVICE_DOMAIN;
  const apiKey = process.env.MICROCMS_API_KEY;

  const page = Math.max(Number(req.query.page || 1), 1);
  const limit = 100;
  const offset = (page - 1) * limit;

  let articles = [];

  try {
    if (serviceDomain && apiKey) {
      const url =
        `https://${serviceDomain}.microcms.io/api/v1/articles` +
        `?limit=${limit}&offset=${offset}&orders=-publishedAt`;

      const response = await fetch(url, {
        headers: {
          "X-MICROCMS-API-KEY": apiKey
        }
      });

      if (response.ok) {
        const data = await response.json();
        const now = new Date();

        articles = (data.contents || []).filter(article => {
          const publishDate =
            article.publishDate ||
            article["予約公開日時"] ||
            article.publishedAt ||
            article.createdAt;

          if (!publishDate) return true;

          return new Date(publishDate) <= now;
        });
      }
    }

    const urls = articles
      .map(article => {
        const slug =
          article.slug ||
          article.urlSlug ||
          article.url_slug ||
          article.permalink ||
          article.id;

        if (!slug) return null;

        const lastmod =
          article.updatedAt ||
          article.revisedAt ||
          article.publishedAt ||
          article.createdAt ||
          "";

        return {
          loc: `${siteUrl}/article?id=${encodeURIComponent(String(slug).trim())}`,
          lastmod
        };
      })
      .filter(Boolean);

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(item => `  <url>
    <loc>${escapeXml(item.loc)}</loc>${item.lastmod ? `
    <lastmod>${escapeXml(new Date(item.lastmod).toISOString())}</lastmod>` : ""}
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`).join("\n")}
</urlset>`;

    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.status(200).send(xml);

  } catch (error) {
    res.status(500).send("記事サイトマップ生成に失敗しました: " + error.message);
  }
}

function escapeXml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
