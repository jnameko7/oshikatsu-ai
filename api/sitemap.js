export default async function handler(req, res) {
  const siteUrl = "https://www.oshikatsu-kakeibo.com";
  const serviceDomain = process.env.MICROCMS_SERVICE_DOMAIN;
  const apiKey = process.env.MICROCMS_API_KEY;
  const limit = 100;

  let totalCount = 0;

  try {
    if (serviceDomain && apiKey) {
      const url =
        `https://${serviceDomain}.microcms.io/api/v1/articles` +
        `?limit=1&offset=0&orders=-publishedAt`;

      const response = await fetch(url, {
        headers: {
          "X-MICROCMS-API-KEY": apiKey
        }
      });

      if (response.ok) {
        const data = await response.json();
        totalCount = Number(data.totalCount || 0);
      }
    }

    const articleSitemapCount = Math.max(1, Math.ceil(totalCount / limit));

    const sitemapUrls = [
      `${siteUrl}/sitemap-pages.xml`,
      ...Array.from(
        { length: articleSitemapCount },
        (_, i) => `${siteUrl}/sitemap-articles-${i + 1}.xml`
      )
    ];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapUrls.map(url => `  <sitemap>
    <loc>${escapeXml(url)}</loc>
  </sitemap>`).join("\n")}
</sitemapindex>`;

    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.status(200).send(xml);

  } catch (error) {
    res.status(500).send("sitemap index 生成に失敗しました: " + error.message);
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
