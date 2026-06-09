export default async function handler(req, res) {
  const appId = process.env.RAKUTEN_APP_ID;

  const keyword = req.query.keyword || "東京";

  const url =
    `https://app.rakuten.co.jp/services/api/Travel/KeywordHotelSearch/20170426` +
    `?applicationId=${appId}` +
    `&keyword=${encodeURIComponent(keyword)}` +
    `&hits=5&format=json`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({
      error: "hotel search failed"
    });
  }
}
