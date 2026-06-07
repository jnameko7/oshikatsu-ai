# 使い方

1. ZIPを解凍
2. 中のファイルを全部GitHubにアップロード
3. Vercelが自動で再デプロイ

## 入っている機能
- AdSense枠
- アフィリエイト枠
- 推し活年間予算シミュレーター
- 遠征格安検索リンク
- 交通費概算
- 推し活家計簿・グッズ集計
- API連携用の土台 `/api/ai-budget.js`

## 注意
APIキーは app.js や index.html に直接書かず、VercelのEnvironment Variablesに入れてください。
