export default async function handler(req, res) {
const appId = process.env.RAKUTEN_APP_ID;
const accessKey = process.env.RAKUTEN_ACCESS_KEY;

const keyword = req.query.keyword || "東京";

const params = new URLSearchParams({
applicationId: appId,
keyword: keyword,
hits: "5",
format: "json",
formatVersion: "2"
});

const url =
"https://openapi.rakuten.co.jp/engine/api/Travel/KeywordHotelSearch/20170426?" +
params.toString();

try {
const response = await fetch(url, {
headers: {
accessKey: accessKey,
Referer: "https://oshikatsu-ai.vercel.app/",
Origin: "https://oshikatsu-ai.vercel.app",
"User-Agent": "oshikatsu-ai"
}
});

```
const data = await response.json();
res.status(200).json(data);
```

} catch (err) {
res.status(500).json({
error: "hotel search failed",
message: err.message
});
}
}
