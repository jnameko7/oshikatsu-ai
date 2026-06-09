export default async function handler(req, res) {
  res.status(200).json({
    appIdExists: !!process.env.RAKUTEN_APP_ID,
    appIdLength: process.env.RAKUTEN_APP_ID
      ? process.env.RAKUTEN_APP_ID.length
      : 0
  });
}
