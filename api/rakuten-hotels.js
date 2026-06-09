export default async function handler(req, res) {
  res.status(200).json({
    appIdExists: !!process.env.RAKUTEN_APP_ID,
    accessKeyExists: !!process.env.RAKUTEN_ACCESS_KEY,
    appIdLength: process.env.RAKUTEN_APP_ID?.length || 0,
    accessKeyLength: process.env.RAKUTEN_ACCESS_KEY?.length || 0
  });
}
