export default async function handler(req, res) {
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

  const urls = staticPages.map(page => ({
    loc: `${siteUrl}/${page}`,
    changefreq: page === "" ? "daily" : "weekly",
    priority: page === "" ? "1.0" : "0.8"
  }));

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(item => `  <url>
    <loc>${escapeXml(item.loc)}</loc>
    <changefreq>${item.changefreq}</changefreq>
    <priority>${item.priority}</priority>
  </url>`).join("\n")}
</urlset>`;

  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.status(200).send(xml);
}

function escapeXml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
