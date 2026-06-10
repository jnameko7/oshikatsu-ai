export default async function handler(req, res) {
  const appId = process.env.RAKUTEN_APP_ID;
  const accessKey = process.env.RAKUTEN_ACCESS_KEY;
  const keyword = req.query.keyword || "東京";
  const checkinDate = req.query.checkinDate || "";
  const checkoutDate = req.query.checkoutDate || "";
  const maxCharge = req.query.maxCharge || "";
  const hits = req.query.hits || "5";

  async function fetchHotels(adultNum) {
    const params = new URLSearchParams();
    params.set("applicationId", appId);
    params.set("keyword", keyword);
    params.set("hits", hits);
    params.set("format", "json");
    params.set("formatVersion", "2");
    params.set("adultNum", String(adultNum));
    if (checkinDate) params.set("checkinDate", checkinDate);
    if (checkoutDate) params.set("checkoutDate", checkoutDate);
    if (maxCharge) params.set("maxCharge", maxCharge);

    const url = "https://openapi.rakuten.co.jp/engine/api/Travel/KeywordHotelSearch/20170426?" + params.toString();

    const response = await fetch(url, {
      headers: {
        "accessKey": accessKey,
        "referer": "https://oshikatsu-ai.vercel.app/",
        "origin": "https://oshikatsu-ai.vercel.app"
      }
    });
    return await response.json();
  }

  function getHotelInfo(item) {
    if (Array.isArray(item)) return item[0]?.hotelBasicInfo || {};
    return item?.hotelBasicInfo || item || {};
  }

  try {
    const [oneData, twoData] = await Promise.all([fetchHotels(1), fetchHotels(2)]);
    const oneHotels = (oneData.hotels || []).map(getHotelInfo).filter(h => h.hotelNo);
    const twoHotels = (twoData.hotels || []).map(getHotelInfo).filter(h => h.hotelNo);

    const oneMap = new Map();
    oneHotels.forEach(h => oneMap.set(String(h.hotelNo), h));

    const merged = twoHotels.map(two => {
      const one = oneMap.get(String(two.hotelNo));
      return {
        hotel: two,
        onePersonCharge: one ? Number(one.hotelMinCharge || 0) : null,
        twoPersonCharge: Number(two.hotelMinCharge || 0)
      };
    });

    res.status(200).json({ keyword, checkinDate, checkoutDate, hotels: merged });
  } catch (err) {
    res.status(500).json({ error: "料金比較検索に失敗しました", message: err.message });
  }
}
