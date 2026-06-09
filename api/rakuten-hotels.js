export default async function handler(req, res) {
  const appId = process.env.RAKUTEN_APP_ID;
  const accessKey = process.env.RAKUTEN_ACCESS_KEY;

  const keyword = req.query.keyword || "東京";

  const params = new URLSearchParams();
  params.set("applicationId", appId);
  params.set("keyword", keyword);
  params.set("hits", "5");
  params.set("format", "json");
  params.set("formatVersion", "2");

  const url =
    "https://openapi.rakuten.co.jp/engine/api/Travel/KeywordHotelSearch/20170426?" +
    params.toString();

  try {
    const response = await fetch(url, {
      headers: {
        "accessKey": accessKey,
        "referer": "https://oshikatsu-ai.vercel.app/",
        "origin": "https://oshikatsu-ai.vercel.app"
      }
    });

    const data = await response.json();

    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({
      error: "ホテル検索に失敗しました",
      message: err.message
    });
  }
}
