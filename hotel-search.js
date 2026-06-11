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

  if(adult && !adult.value) adult.value = "2";
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

function setDefaultHotelTypeByPeople(){
  const adult = document.getElementById("hotelAdultNum");
  const type = document.getElementById("hotelTypeFilter");

  if(!adult || !type) return;

  const people = Number(adult.value) || 1;

  if(people === 1){
    type.value = "capsule";
  }else{
    type.value = "business";
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

function getDisplayPrice(hotel){
  const n = Number(hotel.hotelMinCharge || 0);
  if(!n || n < 1000) return 0;
  return n;
}

function sortHotels(items, sortType){
  return [...items].sort((a,b)=>{
    const pa = getDisplayPrice(a.hotel) || 999999999;
    const pb = getDisplayPrice(b.hotel) || 999999999;
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
    if(item.hotel) return { hotel: item.hotel };

    if(Array.isArray(item)){
      const h = item[0]?.hotelBasicInfo || {};
      return { hotel: h };
    }

    const h = item.hotelBasicInfo || item || {};
    return { hotel: h };
  }).filter(item => item.hotel && item.hotel.hotelName);
}

function priceCautionText(adultNum, hotelTypeText){
  const people = Number(adultNum) || 1;
  const typeText = hotelTypeText || "";

  if(people >= 2){
    return `
      <div class="hotel-price-caution">
        複数人利用時の1人あたり料金です。合計額は予約サイトでご確認ください。
      </div>
    `;
  }

  if(typeText.includes("ビジネス") || typeText.includes("旅館") || typeText.includes("温泉") || typeText.includes("リゾート")){
    return `
      <div class="hotel-price-caution">
        1名料金と異なる場合があります。実際の料金は予約サイトでご確認ください。
      </div>
    `;
  }

  return `
    <div class="hotel-price-caution">
      料金は変動します。実際の料金は予約サイトでご確認ください。
    </div>
  `;
}

async function searchRakutenHotels(){
  const baseKeyword = document.getElementById("hotelKeyword")?.value || "東京";
  const checkinDate = document.getElementById("hotelCheckinDate")?.value || "";
  const checkoutDate = document.getElementById("hotelCheckoutDate")?.value || "";
  const adultNum = document.getElementById("hotelAdultNum")?.value || "2";
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
    const params = new URLSearchParams({
      keyword,
      hits,
      adultNum,
      cacheBust: String(Date.now())
    });

    if(checkinDate) params.set("checkinDate", checkinDate);
    if(checkoutDate) params.set("checkoutDate", checkoutDate);

    const res = await fetch(`/api/rakuten-hotel-rates?${params.toString()}`, {
      cache: "no-store"
    });

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
      .map(item => getDisplayPrice(item.hotel))
      .filter(n => n > 0);

    const avg = prices.length ? Math.round(prices.reduce((a,b)=>a+b,0) / prices.length) : 0;
    const cheapest = prices.length ? Math.min(...prices) : 0;
    const sortLabel = {cheap:"安い順", expensive:"高い順", review:"評価順"}[sortType] || "安い順";
    const typeLabel = typeWord || "すべて";
    const people = Number(adultNum) || 1;

    const cards = hotels.map(item=>{
      const h = item.hotel;
      const price = getDisplayPrice(h);
      const img = safeHotelImage(h);
      const url = safeHotelUrl(h);
      const station = h.nearestStation || "最寄駅情報なし";
      const review = h.reviewAverage ? `評価 ${h.reviewAverage}` : "評価情報なし";
      const address = `${h.address1 || ""}${h.address2 || ""}`;
      const hotelType = getHotelType(h);
      const priceMain = price ? `${people}名利用時 ${yenHotel(price)}/人〜` : "料金は楽天で確認";

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
            ${priceCautionText(adultNum, hotelType)}
            <b>${priceMain}</b>
            <a href="${url}" target="_blank" rel="nofollow sponsored noopener">楽天で見る</a>
          </div>
        </div>
      `;
    }).join("");

    result.innerHTML = `
      <div class="hotel-summary">
        <p>${baseKeyword} のホテル検索結果</p>
        <strong>平均 ${avg ? yenHotel(avg) + "/人〜" : "料金未取得"}</strong>
        <p>最安目安：${cheapest ? yenHotel(cheapest) + "/人〜" : "料金未取得"}</p>
        <p>ホテル種別：${typeLabel} / ${hotels.length}件を${sortLabel}で表示</p>
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
  setDefaultHotelTypeByPeople();

  document.getElementById("hotelAdultNum")?.addEventListener("change", function(){
    setDefaultHotelTypeByPeople();
  });

  document.getElementById("hotelSearchBtn")?.addEventListener("click", e=>{
    e.preventDefault();
    searchRakutenHotels();
  });
});
