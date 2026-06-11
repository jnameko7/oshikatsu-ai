export default async function handler(req, res) {
  const appId = process.env.RAKUTEN_APP_ID;
  const accessKey = process.env.RAKUTEN_ACCESS_KEY;

  const keyword = req.query.keyword || "東京";
  const checkinDate = req.query.checkinDate || "";
  const checkoutDate = req.query.checkoutDate || "";
  const adultNum = req.query.adultNum || "2";
  const requestedHits = Number(req.query.hits || 20);
  const hits = String(Math.min(Math.max(requestedHits, 1), 20));

  const params = new URLSearchParams();
  params.set("applicationId", appId);
  params.set("keyword", keyword);
  params.set("hits", hits);
  params.set("format", "json");
  params.set("formatVersion", "2");
  params.set("adultNum", String(adultNum));

  if (checkinDate) params.set("checkinDate", checkinDate);
  if (checkoutDate) params.set("checkoutDate", checkoutDate);

  const url =
    "https://openapi.rakuten.co.jp/engine/api/Travel/KeywordHotelSearch/20170426?" +
    params.toString();

  function getHotelInfo(item) {
    if (Array.isArray(item)) return item[0]?.hotelBasicInfo || {};
    return item?.hotelBasicInfo || item || {};
  }

  function cleanCharge(value) {
    const n = Number(value || 0);

    // 楽天API側で 1円・数百円などが返る場合があるため非表示にする
    if (!n || n < 1000) return 0;

    return n;
  }

  try {
    const response = await fetch(url, {
      headers: {
        accessKey: accessKey || "",
        referer: "https://oshikatsu-ai.vercel.app/",
        origin: "https://oshikatsu-ai.vercel.app"
      }
    });

    const data = await response.json();

    if (data.errors || data.error) {
      res.status(200).json(data);
      return;
    }

    const hotels = (data.hotels || [])
      .map(getHotelInfo)
      .filter(h => h.hotelName)
      .map(h => {
        const fixedCharge = cleanCharge(h.hotelMinCharge);

        return {
          hotel: {
            ...h,
            hotelMinCharge: fixedCharge
          }
        };
      });

    res.status(200).json({
      keyword,
      checkinDate,
      checkoutDate,
      adultNum,
      hits: Number(hits),
      hotels
    });
  } catch (err) {
    res.status(500).json({
      error: "ホテル検索に失敗しました",
      message: err.message
    });
  }
}
