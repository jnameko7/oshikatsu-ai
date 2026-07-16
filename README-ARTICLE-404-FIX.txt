# 記事404・SSR強化版

## 変更内容
- `/article?id=slug` と `/article/slug` の両方をSSR記事ページへ接続
- 存在しないslug、空のID、不正なIDは必ずHTTP 404を返す
- 最新記事への自動フォールバックを完全に廃止
- microCMSの `slug` / `urlSlug` / `url_slug` / `permalink` / `id` を厳密照合
- 記事タイトル、本文、canonical、OGP、Article・Breadcrumb構造化データをサーバー側で生成

## 反映後の確認
1. `/article?id=実在slug` が表示される
2. `/article/実在slug` が表示される
3. `/article?id=存在しない文字列` が404になる
4. `/article/存在しない文字列` が404になる
5. `/article` 単体が404になる

Vercel環境変数 `MICROCMS_SERVICE_DOMAIN` と `MICROCMS_API_KEY` は既存設定を維持してください。
