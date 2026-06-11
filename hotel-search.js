function yenHotel(value){
  const n = Number(value) || 0;
  return Math.round(n).toLocaleString() + "円";
}

function safeHotelUrl(hotel){
  return hotel.hotelInformationUrl || hotel.planListUrl || "https://travel.rakuten.co.jp/";
}

function safeHotelImage(hotel){
  return hotel.hotelThumbnailUrl || hotel.hotelImageUrl || "";
}

function setTomorrowDefaults(){
  const checkin = document.getElementById("hotelCheckinDate");
  const checkout = document.getElementById("hotelCheckoutDate");
  const adult = document.getElementById("hotelAdultNum");

  if(adult && !adult.value) adult.value = "1";
  if(!checkin || !checkout) return;

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const dayAfter = new Date(today);
  dayAfter.setDate(today.getDate() + 2);

  const toDate = d => d.toISOString().slice(0,10);

  if(!checkin.value) checkin.value = toDate(tomorrow);
  if(!checkout.value) checkout.value = toDate(dayAfter);
}

function ensureHotelExtraControls(){
  const form = document.querySelector(".rakuten-hotel-form");
  const button = document.getElementById("hotelSearchBtn");
  if(!form || !button) return;

  if(!document.getElementById("hotelTypeFilter")){
    const typeLabel = document.createElement("label");
    typeLabel.className = "rakuten-hotel-label";
    typeLabel.innerHTML = `
      ホテル種別
      <select id="hotelTypeFilter">
        <option value="">すべて</option>
        <option value="capsule">カプセルホテル</option>
        <option value="business">ビジネスホテル</option>
        <option value="hotel">ホテル</option>
        <option value="ryokan">旅館</option>
        <option value="onsen">温泉</option>
        <option value="resort">リゾート</option>
      </select>
    `;
    form.insertBefore(typeLabel, button);
  }

  if(!document.getElementById("hotelSort")){
    const sortLabel = document.createElement("label");
    sortLabel.className = "rakuten-hotel-label";
    sortLabel.innerHTML = `
      並び替え
      <select id="hotelSort">
        <option value="cheap" selected>安い順</option>
        <option value="expensive">高い順</option>
        <option value="review">評価順</option>
      </select>
    `;
    form.insertBefore(sortLabel, button);
  }

  if(!document.getElementById("hotelHits")){
    const hitsLabel = document.createElement("label");
    hitsLabel.className = "rakuten-hotel-label";
    hitsLabel.innerHTML = `
      表示件数
      <select id="hotelHits">
        <option value="5">5件</option>
        <option value="10">10件</option>
        <option value="20" selected>20件</option>
      </select>
    `;
    form.insertBefore(hitsLabel, button);
  }
}

function hotelTypeKeyword(type){
  return {
    capsule: "カプセルホテル",
    business: "ビジネスホテル",
    hotel: "ホテル",
    ryokan: "旅館",
    onsen: "温泉",
    resort: "リゾートホテル"
  }[type] || "";
}

function getHotelType(h){
  const text = ((h.hotelName || "") + " " + (h.hotelSpecial || "") + " " + (h.address1 || "") + " " + (h.address2 || "")).toLowerCase();

  if(text.includes("カプセル")) return "🛌 カプセルホテル";
  if(text.includes("ビジネス")) return "🏢 ビジネスホテル";
  if(text.includes("温泉")) return "♨ 温泉";
  if(text.includes("旅館")) return "🏯 旅館";
  if(text.includes("リゾート")) return "🏝 リゾートホテル";

  return "🏨 ホテル";
}

function matchHotelType(h,type){
  if(!type) return true;

  const text = ((h.hotelName || "") + " " + (h.hotelSpecial || "") + " " + (h.address1 || "") + " " + (h.address2 || "")).toLowerCase();

  if(type === "capsule") return text.includes("カプセル");
  if(type === "business") return text.includes("ビジネス");
  if(type === "ryokan") return text.includes("旅館");
  if(type === "onsen") return text.includes("温泉");
  if(type === "resort") return text.includes("リゾート");
  if(type === "hotel") return !text.includes("カプセル") && !text.includes("旅館");

  return true;
}

/*
  重要：
  料金は必ず楽天APIの hotelBasicInfo.hotelMinCharge だけを使います。
  rakutenCharge は使いません。
  adultNum で割りません。
  adultNum を掛けません。
*/
function getRakutenDisplayPrice(hotel){
  return Number(hotel.hotelMinCharge || 0);
}

function priceTextByRakuten(hotel){
  const charge = getRakutenDisplayPrice(hotel);

  return {
    main: charge ? `楽天表示料金 ${yenHotel(charge)}〜` : "料金未取得",
    sub: "楽天APIの hotelMinCharge をそのまま表示",
    numeric: charge || 0
  };
}

function hotelDisclaimer(){
  return `
    <div class="price-disclaimer">
      <strong>宿泊料金について</strong>
      <p>
        当サイトの宿泊料金は、楽天トラベルAPIから取得した hotelMinCharge をそのまま表示しています。
        人数で割ったり、人数分を掛けたりしていません。
        宿泊日・空室状況・プラン内容・キャンペーンにより実際の予約ページの料金と異なる場合があります。
        正確な料金は必ず「楽天で見る」から予約ページでご確認ください。
      </p>
    </div>
  `;
}

function sortHotels(items, sortType){
  return [...items].sort((a,b)=>{
    const pa = getRakutenDisplayPrice(a.hotel) || 999999999;
    const pb = getRakutenDisplayPrice(b.hotel) || 999999999;
    const ra = Number(a.hotel?.reviewAverage || 0);
    const rb = Number(b.hotel?.reviewAverage || 0);

    if(sortType === "expensive") return pb - pa;
    if(sortType === "review") return rb - ra;

    return pa - pb;
  });
}

function normalizeHotelItems(data){
  if(!data || !Array.isArray(data.hotels)) return [];

  return data.hotels.map(item=>{
    if(item.hotel){
      return { hotel: item.hotel };
    }

    if(Array.isArray(item)){
      const h = item[0]?.hotelBasicInfo || {};
      return { hotel: h };
    }

    const h = item.hotelBasicInfo || item || {};
    return { hotel: h };
  }).filter(item => item.hotel && item.hotel.hotelName);
}

async function searchRakutenHotels(){
  const baseKeyword = document.getElementById("hotelKeyword")?.value || "東京";
  const budget = Number(document.getElementById("hotelBudget")?.value || 0);
  const checkinDate = document.getElementById("hotelCheckinDate")?.value || "";
  const checkoutDate = document.getElementById("hotelCheckoutDate")?.value || "";
  const adultNum = document.getElementById("hotelAdultNum")?.value || "1";
  const type = document.getElementById("hotelTypeFilter")?.value || "";
  const sortType = document.getElementById("hotelSort")?.value || "cheap";
  const hits = document.getElementById("hotelHits")?.value || "20";
  const result = document.getElementById("rakutenHotelResult");

  if(!result) return;

  const typeWord = hotelTypeKeyword(type);
  const keyword = typeWord ? `${baseKeyword} ${typeWord}` : baseKeyword;

  result.classList.add("show");
  result.innerHTML = '<div class="hotel-error">ホテル情報を検索中です...</div>';

  try{
    /*
      adultNum は検索条件としてAPIに渡すだけ。
      表示料金の計算には使いません。
    */
    const params = new URLSearchParams({
      keyword,
      hits,
      adultNum
    });

    if(checkinDate) params.set("checkinDate", checkinDate);
    if(checkoutDate) params.set("checkoutDate", checkoutDate);
    if(budget > 0) params.set("maxCharge", String(budget));

    const res = await fetch(`/api/rakuten-hotel-rates?${params.toString()}`);
    const data = await res.json();

    if(data.errors || data.error){
      result.innerHTML = '<div class="hotel-error">ホテル検索に失敗しました。API設定または検索条件を確認してください。</div>';
      return;
    }

    let hotels = normalizeHotelItems(data).filter(item => matchHotelType(item.hotel, type));
    hotels = sortHotels(hotels, sortType);

    if(!hotels.length){
      result.innerHTML = '<div class="hotel-error">条件に合うホテルが見つかりませんでした。ホテル種別を「すべて」にするか、検索キーワードを広めにしてください。</div>';
      return;
    }

    const prices = hotels
      .map(item => getRakutenDisplayPrice(item.hotel))
      .filter(n => n > 0);

    const avg = prices.length ? Math.round(prices.reduce((a,b)=>a+b,0) / prices.length) : 0;
    const cheapest = prices.length ? Math.min(...prices) : 0;
    const sortLabel = {cheap:"安い順", expensive:"高い順", review:"評価順"}[sortType] || "安い順";
    const typeLabel = typeWord || "すべて";

    const cards = hotels.map(item=>{
      const h = item.hotel;
      const txt = priceTextByRakuten(h);
      const img = safeHotelImage(h);
      const url = safeHotelUrl(h);
      const station = h.nearestStation || "最寄駅情報なし";
      const review = h.reviewAverage ? `評価 ${h.reviewAverage}` : "評価情報なし";
      const address = `${h.address1 || ""}${h.address2 || ""}`;
      const hotelType = getHotelType(h);

      return `
        <div class="hotel-card">
          ${img ? `<img src="${img}" alt="${h.hotelName}">` : `<div></div>`}

          <div>
            <h3>${h.hotelName}</h3>
            <p class="hotel-type">${hotelType}</p>
            <p>${station} / ${review}</p>
            <p>${address}</p>
            <p>${h.hotelSpecial || ""}</p>
          </div>

          <div class="hotel-price">
            <b>${txt.main}</b>
            <small>${txt.sub}</small>
            <a href="${url}" target="_blank" rel="nofollow sponsored noopener">楽天で見る</a>
          </div>
        </div>
      `;
    }).join("");

    result.innerHTML = `
      ${hotelDisclaimer()}

      <div class="hotel-summary">
        <p>${baseKeyword} のホテル検索結果</p>
        <strong>平均 ${avg ? yenHotel(avg) : "料金未取得"}</strong>
        <p>最安目安：${cheapest ? yenHotel(cheapest) : "料金未取得"}</p>
        <p>ホテル種別：${typeLabel} / ${hotels.length}件を${sortLabel}で表示</p>
        <p>※料金は楽天APIの hotelMinCharge をそのまま表示しています。人数割りはしていません。</p>
      </div>

      <div class="hotel-list">${cards}</div>
    `;
  }catch(err){
    result.innerHTML = '<div class="hotel-error">ホテル検索に失敗しました。API設定を確認してください。</div>';
  }
}

document.addEventListener("DOMContentLoaded", function(){
  setTomorrowDefaults();
  ensureHotelExtraControls();

  document.getElementById("hotelSearchBtn")?.addEventListener("click", e=>{
    e.preventDefault();
    searchRakutenHotels();
  });
});
