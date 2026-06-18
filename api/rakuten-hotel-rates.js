export default async function handler(req, res) {
  const appId = process.env.RAKUTEN_APP_ID;
  const accessKey = process.env.RAKUTEN_ACCESS_KEY;

  const keyword = req.query.keyword || "東京";

  if (!appId || !accessKey) {
    return res.status(200).json({
      error: "env_missing",
      message: "RAKUTEN_APP_ID または RAKUTEN_ACCESS_KEY が未設定です",
      hasAppId: !!appId,
      hasAccessKey: !!accessKey
    });
  }

  const params = new URLSearchParams();
  params.set("applicationId", appId.trim());
  params.set("accessKey", accessKey.trim());
  params.set("keyword", keyword);
  params.set("format", "json");
  params.set("formatVersion", "2");
  params.set("hits", "5");
  params.set("adultNum", "2");

  const url =
    "https://openapi.rakuten.co.jp/engine/api/Travel/KeywordHotelSearch/20170426?" +
    params.toString();

  try {
    const response = await fetch(url, {
      headers: {
        "Referer": "https://www.oshikatsu-kakeibo.com/",
        "Origin": "https://www.oshikatsu-kakeibo.com"
      }
    });

    const text = await response.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    if (!response.ok || data.errors || data.error) {
      return res.status(200).json({
        error: "rakuten_api_error",
        status: response.status,
        detail: data,
        appIdLength: appId.length,
        accessKeyLength: accessKey.length
      });
    }

    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({
      error: "fetch_failed",
      message: err.message
    });
  }
}
