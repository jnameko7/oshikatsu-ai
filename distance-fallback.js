/*
  distance-fallback.js
  未登録ルート用の距離計算＋交通費補完エンジン
*/

const OSHIKATSU_CITY_COORDS = {
  "札幌":{lat:43.06,lng:141.35,area:"hokkaido"},
  "旭川":{lat:43.77,lng:142.36,area:"hokkaido"},
  "函館":{lat:41.77,lng:140.73,area:"hokkaido"},
  "帯広":{lat:42.92,lng:143.20,area:"hokkaido"},
  "釧路":{lat:42.98,lng:144.38,area:"hokkaido"},

  "青森":{lat:40.82,lng:140.74,area:"tohoku"},
  "八戸":{lat:40.51,lng:141.49,area:"tohoku"},
  "弘前":{lat:40.60,lng:140.47,area:"tohoku"},
  "盛岡":{lat:39.70,lng:141.15,area:"tohoku"},
  "仙台":{lat:38.27,lng:140.87,area:"tohoku"},
  "秋田":{lat:39.72,lng:140.10,area:"tohoku"},
  "山形":{lat:38.24,lng:140.36,area:"tohoku"},
  "福島":{lat:37.75,lng:140.47,area:"tohoku"},
  "郡山":{lat:37.40,lng:140.38,area:"tohoku"},

  "水戸":{lat:36.37,lng:140.47,area:"kanto"},
  "宇都宮":{lat:36.56,lng:139.88,area:"kanto"},
  "前橋":{lat:36.39,lng:139.06,area:"kanto"},
  "高崎":{lat:36.32,lng:139.00,area:"kanto"},
  "大宮":{lat:35.91,lng:139.62,area:"kanto"},
  "川越":{lat:35.93,lng:139.49,area:"kanto"},
  "千葉":{lat:35.61,lng:140.12,area:"kanto"},
  "船橋":{lat:35.70,lng:139.98,area:"kanto"},
  "柏":{lat:35.86,lng:139.97,area:"kanto"},
  "東京":{lat:35.68,lng:139.76,area:"kanto"},
  "新宿":{lat:35.69,lng:139.70,area:"kanto"},
  "渋谷":{lat:35.66,lng:139.70,area:"kanto"},
  "池袋":{lat:35.73,lng:139.71,area:"kanto"},
  "上野":{lat:35.71,lng:139.78,area:"kanto"},
  "立川":{lat:35.70,lng:139.41,area:"kanto"},
  "八王子":{lat:35.66,lng:139.34,area:"kanto"},
  "町田":{lat:35.55,lng:139.45,area:"kanto"},
  "横浜":{lat:35.44,lng:139.64,area:"kanto"},
  "川崎":{lat:35.53,lng:139.70,area:"kanto"},
  "藤沢":{lat:35.34,lng:139.49,area:"kanto"},
  "小田原":{lat:35.26,lng:139.15,area:"kanto"},

  "新潟":{lat:37.91,lng:139.06,area:"chubu"},
  "長岡":{lat:37.45,lng:138.85,area:"chubu"},
  "富山":{lat:36.70,lng:137.21,area:"chubu"},
  "高岡":{lat:36.75,lng:137.02,area:"chubu"},
  "金沢":{lat:36.56,lng:136.66,area:"chubu"},
  "福井":{lat:36.06,lng:136.22,area:"chubu"},
  "甲府":{lat:35.66,lng:138.57,area:"chubu"},
  "長野":{lat:36.65,lng:138.19,area:"chubu"},
  "松本":{lat:36.24,lng:137.97,area:"chubu"},
  "静岡":{lat:34.98,lng:138.38,area:"chubu"},
  "浜松":{lat:34.71,lng:137.73,area:"chubu"},
  "名古屋":{lat:35.18,lng:136.91,area:"chubu"},
  "豊橋":{lat:34.77,lng:137.39,area:"chubu"},
  "岐阜":{lat:35.42,lng:136.76,area:"chubu"},
  "大垣":{lat:35.36,lng:136.62,area:"chubu"},
  "津":{lat:34.73,lng:136.51,area:"chubu"},
  "四日市":{lat:34.97,lng:136.62,area:"chubu"},

  "京都":{lat:35.01,lng:135.77,area:"kansai"},
  "大阪":{lat:34.69,lng:135.50,area:"kansai"},
  "梅田":{lat:34.70,lng:135.50,area:"kansai"},
  "難波":{lat:34.66,lng:135.50,area:"kansai"},
  "天王寺":{lat:34.65,lng:135.51,area:"kansai"},
  "堺":{lat:34.57,lng:135.48,area:"kansai"},
  "神戸":{lat:34.69,lng:135.19,area:"kansai"},
  "姫路":{lat:34.82,lng:134.69,area:"kansai"},
  "奈良":{lat:34.68,lng:135.82,area:"kansai"},
  "和歌山":{lat:34.23,lng:135.17,area:"kansai"},

  "鳥取":{lat:35.50,lng:134.24,area:"chugoku"},
  "米子":{lat:35.43,lng:133.33,area:"chugoku"},
  "松江":{lat:35.47,lng:133.05,area:"chugoku"},
  "出雲":{lat:35.37,lng:132.75,area:"chugoku"},
  "岡山":{lat:34.66,lng:133.92,area:"chugoku"},
  "倉敷":{lat:34.59,lng:133.77,area:"chugoku"},
  "広島":{lat:34.39,lng:132.46,area:"chugoku"},
  "福山":{lat:34.49,lng:133.36,area:"chugoku"},
  "山口":{lat:34.18,lng:131.47,area:"chugoku"},
  "下関":{lat:33.96,lng:130.94,area:"chugoku"},

  "高松":{lat:34.34,lng:134.04,area:"shikoku"},
  "徳島":{lat:34.07,lng:134.55,area:"shikoku"},
  "松山":{lat:33.84,lng:132.77,area:"shikoku"},
  "今治":{lat:34.06,lng:133.00,area:"shikoku"},
  "高知":{lat:33.56,lng:133.53,area:"shikoku"},

  "福岡":{lat:33.59,lng:130.40,area:"kyushu"},
  "博多":{lat:33.59,lng:130.42,area:"kyushu"},
  "北九州":{lat:33.88,lng:130.88,area:"kyushu"},
  "小倉":{lat:33.89,lng:130.88,area:"kyushu"},
  "久留米":{lat:33.32,lng:130.51,area:"kyushu"},
  "佐賀":{lat:33.25,lng:130.30,area:"kyushu"},
  "長崎":{lat:32.75,lng:129.87,area:"kyushu"},
  "佐世保":{lat:33.18,lng:129.72,area:"kyushu"},
  "熊本":{lat:32.80,lng:130.71,area:"kyushu"},
  "大分":{lat:33.24,lng:131.61,area:"kyushu"},
  "宮崎":{lat:31.91,lng:131.42,area:"kyushu"},
  "鹿児島":{lat:31.60,lng:130.56,area:"kyushu"},

  "那覇":{lat:26.21,lng:127.68,area:"okinawa"},
  "名護":{lat:26.59,lng:127.98,area:"okinawa"},
  "石垣":{lat:24.34,lng:124.16,area:"okinawa"},
  "宮古島":{lat:24.80,lng:125.28,area:"okinawa"}
};

const OSHIKATSU_CITY_ALIASES = {
  "東京駅":"東京","品川":"東京","舞浜":"東京","ディズニー":"東京","TDL":"東京",
  "名駅":"名古屋","近鉄名古屋":"名古屋",
  "なんば":"難波","USJ":"大阪","ユニバ":"大阪",
  "三宮":"神戸","博多駅":"博多","天神":"福岡","小倉駅":"小倉","札幌駅":"札幌"
};

function normalizeTransportCityName(name){
  const raw = String(name || "").trim();
  return OSHIKATSU_CITY_ALIASES[raw] || raw;
}

function getCityCoord(name){
  const n = normalizeTransportCityName(name);
  return OSHIKATSU_CITY_COORDS[n] || null;
}

function calcDistanceKm(fromName,toName){
  const from = getCityCoord(fromName);
  const to = getCityCoord(toName);
  if(!from || !to) return null;

  const R = 6371;
  const lat1 = from.lat * Math.PI / 180;
  const lat2 = to.lat * Math.PI / 180;
  const dlat = (to.lat - from.lat) * Math.PI / 180;
  const dlng = (to.lng - from.lng) * Math.PI / 180;

  const a = Math.sin(dlat/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dlng/2)**2;
  const straight = 2 * R * Math.atan2(Math.sqrt(a),Math.sqrt(1-a));

  return Math.round(straight * 1.25);
}

function roundFare(value){
  return Math.max(0, Math.round((Number(value)||0) / 100) * 100);
}

function fallbackFareByDistance(fromName,toName){
  const distance = calcDistanceKm(fromName,toName);
  const from = getCityCoord(fromName);
  const to = getCityCoord(toName);

  if(!distance || !from || !to){
    return {
      bus:{min:3500,normal:6500,high:11000,available:true},
      lcc:{min:6000,normal:12000,high:28000,available:true},
      fsc:{min:13000,normal:24000,high:45000,available:true},
      shinkansen:{min:9000,normal:13000,high:18000,available:true},
      local:{min:6500,normal:9000,high:12000,available:true},
      distanceKm:null,
      source:"fallback",
      confidence:"low",
      note:"都市データ未登録のため全国平均からの概算です。実際の価格と大きく異なる場合があります。"
    };
  }

  const includesOkinawa = from.area === "okinawa" || to.area === "okinawa";
  const hokkaidoToOutside = (from.area === "hokkaido") !== (to.area === "hokkaido");

  const busAvailable = !includesOkinawa && !hokkaidoToOutside && distance >= 80;
  const shinkansenAvailable = !includesOkinawa && distance >= 120;
  const localAvailable = !includesOkinawa;
  const flightAvailable = distance >= 250 || includesOkinawa || hokkaidoToOutside;

  const busBase = distance < 150 ? 2500 : distance < 300 ? 4200 : distance < 500 ? 6500 : distance < 800 ? 9500 : 13500;
  const lccBase = distance < 400 ? 6500 : distance < 800 ? 10000 : distance < 1200 ? 15000 : 23000;
  const fscBase = distance < 400 ? 14000 : distance < 800 ? 22000 : distance < 1200 ? 32000 : 48000;
  const shinkansenBase = distance < 200 ? 6000 : distance < 400 ? 11000 : distance < 700 ? 16000 : 23000;
  const localBase = distance * 18;

  const islandBoost = includesOkinawa ? 1.25 : 1;
  const hokkaidoBoost = hokkaidoToOutside ? 1.15 : 1;

  return {
    bus:{
      min:busAvailable ? roundFare(busBase*0.65+500) : 0,
      normal:busAvailable ? roundFare(busBase+500) : 0,
      high:busAvailable ? roundFare(busBase*1.75+500) : 0,
      available:busAvailable
    },
    lcc:{
      min:flightAvailable ? roundFare(lccBase*0.65*islandBoost+500) : 0,
      normal:flightAvailable ? roundFare(lccBase*islandBoost+500) : 0,
      high:flightAvailable ? roundFare(lccBase*2.2*islandBoost+500) : 0,
      available:flightAvailable
    },
    fsc:{
      min:flightAvailable ? roundFare(fscBase*0.75*islandBoost*hokkaidoBoost+500) : 0,
      normal:flightAvailable ? roundFare(fscBase*islandBoost*hokkaidoBoost+500) : 0,
      high:flightAvailable ? roundFare(fscBase*1.9*islandBoost*hokkaidoBoost+500) : 0,
      available:flightAvailable
    },
    shinkansen:{
      min:shinkansenAvailable ? roundFare(shinkansenBase*0.9+500) : 0,
      normal:shinkansenAvailable ? roundFare(shinkansenBase+500) : 0,
      high:shinkansenAvailable ? roundFare(shinkansenBase*1.15+500) : 0,
      available:shinkansenAvailable
    },
    local:{
      min:localAvailable ? roundFare(localBase*0.9+500) : 0,
      normal:localAvailable ? roundFare(localBase+500) : 0,
      high:localAvailable ? roundFare(localBase*1.15+500) : 0,
      available:localAvailable
    },
    distanceKm:distance,
    source:"fallback",
    confidence:"low",
    note:"マイナー路線または未登録区間のため、距離計算および周辺路線相場から算出しています。実際の価格と大きく異なる場合があります。必ず予約サイトで確認してください。"
  };
}
