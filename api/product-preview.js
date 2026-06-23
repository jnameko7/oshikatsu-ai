export default async function handler(req, res) {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: "URLがありません" });
  }

  try {
    const service = detectService(url);

    // 楽天
    if (service === "rakuten") {
      return res.status(200).json({
        service,
        title: "楽天の商品",
        image: "",
        price: null,
        url,
        buttonText: "楽天で見る"
      });
    }

    // Amazon
    if (service === "amazon") {
      return res.status(200).json({
        service,
        title: "Amazonの商品",
        image: "",
        price: null,
        url,
        buttonText: "Amazonで見る"
      });
    }

    // TEMU・その他はOGP取得
    const html = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0"
      }
    }).then(r => r.text());

    const getMeta = (key) => {
      const regex = new RegExp(
        `<meta[^>]+(?:property|name)=["']${key}["'][^>]+content=["']([^"']+)["']`,
        "i"
      );
      return html.match(regex)?.[1] || "";
    };

    const title =
      getMeta("og:title") ||
      html.match(/<title>(.*?)<\/title>/i)?.[1] ||
      "商品情報";

    const image = getMeta("og:image");
    const description = getMeta("og:description");

    return res.status(200).json({
      service,
      title,
      image,
      description,
      price: null,
      url,
      buttonText: service === "temu" ? "TEMUで見る" : "商品を見る"
    });

  } catch (error) {
    return res.status(500).json({
      error: "商品情報を取得できませんでした"
    });
  }
}

function detectService(url) {
  if (url.includes("amazon.") || url.includes("amzn.to")) return "amazon";
  if (url.includes("rakuten.")) return "rakuten";
  if (url.includes("temu.")) return "temu";
  return "other";
}
