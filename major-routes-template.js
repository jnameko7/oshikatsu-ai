/*
  major-routes-template.js
  地域DB追加時のテンプレートです。
  次のSTEPから、hokkaido-tohoku-routes.js 等として増やしていきます。
*/

registerMajorRoutes({
  "名古屋-東京":{
    bus:{min:3000,normal:5000,high:10000,available:true},
    lcc:{min:5000,normal:10000,high:25000,available:true},
    fsc:{min:12000,normal:20000,high:40000,available:true},
    shinkansen:{min:10600,normal:11500,high:13000,available:true},
    local:{min:6500,normal:7000,high:8000,available:true},
    note:"サンプル主要路線データです。"
  },
  "大阪-東京":{
    bus:{min:3000,normal:5500,high:12000,available:true},
    lcc:{min:4500,normal:9500,high:22000,available:true},
    fsc:{min:11000,normal:19000,high:38000,available:true},
    shinkansen:{min:13000,normal:14500,high:16500,available:true},
    local:{min:8500,normal:9500,high:11000,available:true},
    note:"サンプル主要路線データです。"
  }
});
