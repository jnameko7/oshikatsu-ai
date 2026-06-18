export default async function handler(req, res) {
  const appId = String(process.env.RAKUTEN_APP_ID || "").trim();
  const accessKey = String(process.env.RAKUTEN_ACCESS_KEY || "").trim();

  const keyword = req.query.keyword || "東京";

  if (!appId || !accessKey) {
    return res.status(200).json({
      error: "env_missing",
      message: "RAKUTEN_APP_ID または RAKUTEN_ACCESS_KEY が未設定です",
      hasAppId: !!appId,
      hasAccessKey: !!accessKey,
      appIdLength: appId.length,
      accessKeyLength: accessKey.length
    });
  }

  const params = new URLSearchParams({
    applicationId: appId,
    accessKey: accessKey,
    keyword,
    hits: "5",
    format: "json",
    formatVersion: "2",
    adultNum: "2"
  });

  const url =
    "https://openapi.rakuten.co.jp/engine/api/Travel/KeywordHotelSearch/20170426?" +
    params.toString();

  try {
    const response = await fetch(url, {
  cache: "no-store",
  headers: {
    referer: "https://www.oshikatsu-kakeibo.com/",
    origin: "https://www.oshikatsu-kakeibo.com",
    "user-agent": "oshikatsu-kakeibo"
  }
});
    const text = await response.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    return res.status(200).json({
      status: response.status,
      hasAppId: !!appId,
      hasAccessKey: !!accessKey,
      appIdLength: appId.length,
      accessKeyLength: accessKey.length,
      detail: data
    });
  } catch (err) {
    return res.status(500).json({
      error: "fetch_failed",
      message: err.message
    });
  }
}
