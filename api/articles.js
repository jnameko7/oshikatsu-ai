export default async function handler(req, res) {
  const serviceDomain = process.env.MICROCMS_SERVICE_DOMAIN;
  const apiKey = process.env.MICROCMS_API_KEY;

  if (!serviceDomain || !apiKey) {
    return res.status(500).json({
      error: "microCMSの環境変数が設定されていません"
    });
  }

  const limit = String(Math.min(Math.max(Number(req.query.limit || 100), 1), 100));
  const offset = String(Math.max(Number(req.query.offset || 0), 0));

  const url =
    `https://${serviceDomain}.microcms.io/api/v1/articles` +
    `?limit=${limit}&offset=${offset}&orders=-publishedAt`;

  try {
    const response = await fetch(url, {
      headers: {
        "X-MICROCMS-API-KEY": apiKey
      }
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    const now = new Date();

    const filteredContents = (data.contents || []).filter(article => {
      const publishDate =
        article.publishDate ||
        article["予約公開日時"] ||
        article.publishedAt ||
        article.createdAt;

      if (!publishDate) return true;

      return new Date(publishDate) <= now;
    });

    res.setHeader("Cache-Control", "no-store, max-age=0");
    const sortedContents = [...filteredContents].sort((a, b) => {
      const getTime = article => {
        const value = article.publishDate || article["予約公開日時"] || article.publishedAt || article.createdAt || article.updatedAt;
        const time = value ? new Date(value).getTime() : 0;
        return Number.isNaN(time) ? 0 : time;
      };
      return getTime(b) - getTime(a);
    });

    return res.status(200).json({
      ...data,
      contents: sortedContents
    });

  } catch (err) {
    return res.status(500).json({
      error: "記事取得に失敗しました",
      message: err.message
    });
  }
}
