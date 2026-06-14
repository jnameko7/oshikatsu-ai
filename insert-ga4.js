// GA4タグを全HTMLファイルの </head> 直前に自動挿入するスクリプト
// デザイン・本文・CSSには触れません。
// 使い方: このファイルをサイトの一番上の階層に置いて、ターミナルで node insert-ga4.js を実行

const fs = require('fs');
const path = require('path');

const GA_ID = 'G-3CGGLYQE0X';
const GA_TAG = `<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${GA_ID}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', '${GA_ID}');
</script>`;

const ignoreDirs = new Set(['node_modules', '.git', '.vercel', 'dist', 'build']);

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!ignoreDirs.has(entry.name)) walk(fullPath);
      continue;
    }
    if (entry.isFile() && entry.name.toLowerCase().endsWith('.html')) {
      updateHtml(fullPath);
    }
  }
}

function updateHtml(filePath) {
  let html = fs.readFileSync(filePath, 'utf8');

  if (html.includes(GA_ID) || html.includes('googletagmanager.com/gtag/js')) {
    console.log(`SKIP: ${filePath} 既にGA4タグがあります`);
    return;
  }

  if (!/<\/head>/i.test(html)) {
    console.log(`WARN: ${filePath} </head> が見つかりません`);
    return;
  }

  html = html.replace(/<\/head>/i, `\n${GA_TAG}\n</head>`);
  fs.writeFileSync(filePath, html, 'utf8');
  console.log(`OK: ${filePath} にGA4タグを追加しました`);
}

walk(process.cwd());
