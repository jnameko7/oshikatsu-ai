export default async function handler(req, res) {
  const appId = String(process.env.RAKUTEN_APP_ID || "").trim();
  const accessKey = String(process.env.RAKUTEN_ACCESS_KEY || "").trim();

  const keyword = req.query.keyword || "東京";
  const checkinDate = req.query.checkinDate || "";
  const checkoutDate = req.query.checkoutDate || "";
  const adultNum = req.query.adultNum || "2";
  const hits = String(Math.min(Math.max(Number(req.query.hits || 20), 1), 20));

  if (!appId || !accessKey) {
    return res.status(200).json({
      hotels: [],
      error: "楽天APIキー未設定",
      message: "RAKUTEN_APP_ID または RAKUTEN_ACCESS_KEY が未設定です"
    });
  }

  const params = new URLSearchParams({
    applicationId: appId,
    accessKey: accessKey,
    keyword,
    hits,
    format: "json",
    formatVersion: "2",
    adultNum: String(adultNum)
  });

  if (checkinDate) params.set("checkinDate", checkinDate);
  if (checkoutDate) params.set("checkoutDate", checkoutDate);

  const urls = [
    "https://app.rakuten.co.jp/services/api/Travel/KeywordHotelSearch/20170426?" + params.toString(),
    "https://openapi.rakuten.co.jp/engine/api/Travel/KeywordHotelSearch/20170426?" + params.toString()
  ];

  function getHotelInfo(item) {
    if (Array.isArray(item)) return item[0]?.hotelBasicInfo || {};
    return item?.hotelBasicInfo || item?.hotel || item || {};
  }

  function cleanCharge(value) {
    const n = Number(value || 0);
    return !n || n < 1000 ? 0 : n;
  }

  for (const url of urls) {
    try {
      const response = await fetch(url, { cache: "no-store" });
      const data = await response.json();

      if (response.ok && !data.error && !data.errors) {
        const hotels = (data.hotels || [])
          .map(getHotelInfo)
          .filter(h => h.hotelName)
          .map(h => ({
            hotel: {
              ...h,
              hotelMinCharge: cleanCharge(h.hotelMinCharge)
            }
          }));

        return res.status(200).json({
          keyword,
          checkinDate,
          checkoutDate,
          adultNum,
          hits: Number(hits),
          hotels
        });
      }
    } catch (e) {}
  }

  return res.status(200).json({
    hotels: [],
    error: "楽天APIエラー",
    message: "楽天APIに接続できませんでした。APIキーまたは楽天側仕様を確認してください。"
  });
}
