export default async function handler(req, res) {
  const { url, keyword } = req.query;

  if (!url && !keyword) {
    return res.status(400).json({ error: "URLまたはキーワードが必要です" });
  }

  try {
    const service = detectService(url || "");

    if (service === "rakuten") {
      const item = await getRakutenItem({ url, keyword });

      return res.status(200).json({
        service: "rakuten",
        title: item.title,
        image: item.image,
        price: item.price,
        url: item.url,
        buttonText: "楽天で見る"
      });
    }

    if (service === "amazon") {
      const item = await getAmazonItem(url);

      return res.status(200).json({
        service: "amazon",
        title: item.title,
        image: item.image,
        price: item.price,
        url: item.url,
        buttonText: "Amazonで見る"
      });
    }

    const ogp = await getOgp(url);

    return res.status(200).json({
      service,
      title: ogp.title,
      image: ogp.image,
      description: ogp.description,
      price: null,
      url,
      buttonText: service === "temu" ? "TEMUで見る" : "商品を見る"
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "商品情報を取得できませんでした"
    });
  }
}

function detectService(url) {
  if (url.includes("rakuten.co.jp") || url.includes("a.r10.to")) return "rakuten";
  if (url.includes("amazon.") || url.includes("amzn.to")) return "amazon";
  if (url.includes("temu.")) return "temu";
  return "other";
}

async function getRakutenItem({ url, keyword }) {
  const appId = process.env.RAKUTEN_APP_ID;
  const affiliateId = process.env.RAKUTEN_AFFILIATE_ID;

  if (!appId) {
    throw new Error("RAKUTEN_APP_IDが未設定です");
  }

  let searchKeyword = keyword || "";

  if (!searchKeyword && url) {
    searchKeyword = decodeURIComponent(url)
      .replace(/https?:\/\//g, " ")
      .replace(/[/?&=._-]/g, " ")
      .replace(/rakuten|co|jp|item/g, " ")
      .slice(0, 80);
  }

  const apiUrl = new URL("https://app.rakuten.co.jp/services/api/IchibaItem/Search/20220601");
  apiUrl.searchParams.set("applicationId", appId);
  apiUrl.searchParams.set("keyword", searchKeyword || "推し活");
  apiUrl.searchParams.set("hits", "1");
  apiUrl.searchParams.set("format", "json");

  if (affiliateId) {
    apiUrl.searchParams.set("affiliateId", affiliateId);
  }

  const response = await fetch(apiUrl.toString());
  const data = await response.json();

  if (!data.Items || data.Items.length === 0) {
    throw new Error("楽天商品が見つかりませんでした");
  }

  const item = data.Items[0].Item;

  return {
    title: item.itemName,
    image: item.mediumImageUrls?.[0]?.imageUrl?.replace("?_ex=128x128", "") || "",
    price: item.itemPrice,
    url: item.affiliateUrl || item.itemUrl
  };
}

async function getAmazonItem(url) {
  /*
    Amazon PA-APIは認証署名が必要です。
    ここはPA-API利用可能アカウント向けの接続口です。
    使えない場合はOGP表示にフォールバックします。
  */

  const ogp = await getOgp(url);

  return {
    title: ogp.title || "Amazonの商品",
    image: ogp.image || "",
    price: null,
    url
  };
}

async function getOgp(url) {
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

  return {
    title:
      getMeta("og:title") ||
      html.match(/<title>(.*?)<\/title>/i)?.[1] ||
      "商品情報",
    image: getMeta("og:image"),
    description: getMeta("og:description")
  };
}
