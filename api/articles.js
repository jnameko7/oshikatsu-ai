export default async function handler(req, res) {
  const serviceDomain = process.env.MICROCMS_SERVICE_DOMAIN;
  const apiKey = process.env.MICROCMS_API_KEY;

  if (!serviceDomain || !apiKey) {
    return res.status(500).json({
      error: "microCMSの環境変数が設定されていません"
    });
  }

  const limit = req.query.limit || "20";
  const offset = req.query.offset || "0";

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

    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({
      error: "記事取得に失敗しました",
      message: err.message
    });
  }
}
