/*
  transport-engine.js
  主要路線DB＋距離補完のハイブリッド交通費エンジン
*/

window.OSHIKATSU_MAJOR_ROUTE_DB = window.OSHIKATSU_MAJOR_ROUTE_DB || {};

function makeRouteKey(from,to){
  const f = normalizeTransportCityName ? normalizeTransportCityName(from) : String(from||"").trim();
  const t = normalizeTransportCityName ? normalizeTransportCityName(to) : String(to||"").trim();
  return [f,t].sort().join("-");
}

function registerMajorRoutes(routeObject){
  window.OSHIKATSU_MAJOR_ROUTE_DB = window.OSHIKATSU_MAJOR_ROUTE_DB || {};
  Object.assign(window.OSHIKATSU_MAJOR_ROUTE_DB, routeObject || {});
}

function getTransportFare(from,to){
  const key = makeRouteKey(from,to);
  const db = window.OSHIKATSU_MAJOR_ROUTE_DB || {};
  const hit = db[key];

  if(hit){
    return {
      ...hit,
      key,
      source:"database",
      confidence:"high",
      note:hit.note || "主要路線データをもとにした目安料金です。料金は必ず予約サイトで確認してください。"
    };
  }

  const fallback = fallbackFareByDistance(from,to);
  return {
    ...fallback,
    key,
    source:"fallback",
    confidence:"low"
  };
}

function transportTypeName(type){
  return {
    bus:"夜行・高速バス",
    lcc:"LCC",
    fsc:"FSC",
    shinkansen:"新幹線・特急",
    local:"在来線"
  }[type] || type;
}

function transportFareCardHTML(type,fare,source){
  if(!fare || fare.available === false || !fare.normal){
    return `
      <div class="budget-card">
        <span>${transportTypeName(type)}</span>
        <b>対象外</b>
        <small>この区間では利用しにくい可能性があります</small>
      </div>
    `;
  }

  const sourceText = source === "database" ? "主要路線データ" : "距離計算の推定";
  return `
    <div class="budget-card">
      <span>${transportTypeName(type)}</span>
      <b>${Math.round(fare.normal).toLocaleString()}円前後</b>
      <small>安い日 ${Math.round(fare.min).toLocaleString()}円〜 / 高い日 ${Math.round(fare.high).toLocaleString()}円前後<br>${sourceText}</small>
    </div>
  `;
}

function allTransportFareCardsHTML(result){
  return `
    <div class="budget-cards">
      ${transportFareCardHTML("bus",result.bus,result.source)}
      ${transportFareCardHTML("lcc",result.lcc,result.source)}
      ${transportFareCardHTML("fsc",result.fsc,result.source)}
      ${transportFareCardHTML("shinkansen",result.shinkansen,result.source)}
      ${transportFareCardHTML("local",result.local,result.source)}
    </div>
  `;
}

function chooseBestTransportFromEngine(result,budget,people,preferred){
  const types = ["bus","lcc","fsc","shinkansen","local"];

  if(preferred && preferred !== "auto"){
    const mapped = preferred === "plane" ? "lcc" : preferred;
    const fare = result[mapped];
    if(fare && fare.available !== false && fare.normal){
      return {type:mapped, price:fare.normal};
    }
  }

  const options = types
    .map(type => ({type, fare:result[type]}))
    .filter(item => item.fare && item.fare.available !== false && item.fare.normal)
    .map(item => ({type:item.type, price:item.fare.normal}));

  const affordable = options.filter(item => item.price * people <= budget * 0.45);
  const list = affordable.length ? affordable : options;

  return list.sort((a,b)=>a.price-b.price)[0] || {type:"bus",price:6500};
}
