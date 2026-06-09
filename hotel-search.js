function yenHotel(value){
  return Math.round(Number(value) || 0).toLocaleString() + "円";
}

function getHotelInfo(item){
  if(Array.isArray(item)){
    return item[0]?.hotelBasicInfo || {};
  }
  return item?.hotelBasicInfo || item || {};
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

async function searchRakutenHotels(){
  const keyword = document.getElementById("hotelKeyword")?.value || "東京";
  const budget = Number(document.getElementById("hotelBudget")?.value || 0);
  const checkinDate = document.getElementById("hotelCheckinDate")?.value || "";
  const checkoutDate = document.getElementById("hotelCheckoutDate")?.value || "";
  const adultNum = document.getElementById("hotelAdultNum")?.value || "1";
  const result = document.getElementById("rakutenHotelResult");

  if(!result) return;

  result.classList.add("show");
  result.innerHTML = `<div class="hotel-error">ホテル情報を検索中です...</div>`;

  try{
    const params = new URLSearchParams({
      keyword,
      hits: "5",
      adultNum
    });

    if(checkinDate) params.set("checkinDate", checkinDate);
    if(checkoutDate) params.set("checkoutDate", checkoutDate);
    if(budget > 0) params.set("maxCharge", String(budget));

    const res = await fetch(`/api/rakuten-vacant-hotels?${params.toString()}`);
    const data = await res.json();

    if(data.errors || data.error){
      result.innerHTML = `<div class="hotel-error">ホテル検索に失敗しました。検索条件を変えて再度お試しください。</div>`;
      return;
    }

    const hotels = (data.hotels || [])
      .map(getHotelInfo)
      .filter(hotel => hotel.hotelName);

    if(hotels.length === 0){
      result.innerHTML = `<div class="hotel-error">条件に合うホテルが見つかりませんでした。予算を上げるか、検索キーワードを「東京」「大阪」など広めにしてください。</div>`;
      return;
    }

    const prices = hotels
      .map(h => Number(h.hotelMinCharge || 0))
      .filter(n => n > 0);

    const avg = prices.length ? Math.round(prices.reduce((a,b)=>a+b,0) / prices.length) : 0;
    const cheapest = prices.length ? Math.min(...prices) : 0;

    let advice = "ホテル候補を取得しました。";
    if(budget && avg){
      advice = avg <= budget
        ? "宿泊予算内で探せる可能性があります。"
        : "平均宿泊費が予算を超えています。エリアを広げるか、日程調整がおすすめです。";
    }

    const hotelCards = hotels.map(hotel => {
      const price = Number(hotel.hotelMinCharge || 0);
      const img = safeHotelImage(hotel);
      const url = safeHotelUrl(hotel);
      const station = hotel.nearestStation || "最寄駅情報なし";
      const review = hotel.reviewAverage ? `評価 ${hotel.reviewAverage}` : "評価情報なし";
      const address = `${hotel.address1 || ""}${hotel.address2 || ""}`;

      return `
        <div class="hotel-card">
          ${img ? `<img src="${img}" alt="${hotel.hotelName}">` : `<div></div>`}
          <div>
            <h3>${hotel.hotelName}</h3>
            <p>${station} / ${review}</p>
            <p>${address}</p>
            <p>${hotel.hotelSpecial || ""}</p>
          </div>
          <div class="hotel-price">
            <b>${price ? yenHotel(price) : "料金未取得"}</b>
            <a href="${url}" target="_blank" rel="nofollow sponsored noopener">楽天で見る</a>
          </div>
        </div>
      `;
    }).join("");

    result.innerHTML = `
      <div class="hotel-summary">
        <p>${keyword} のホテル検索結果</p>
        <strong>平均 ${avg ? yenHotel(avg) : "料金未取得"}</strong>
        <p>${advice}</p>
        <p>最安目安：${cheapest ? yenHotel(cheapest) : "料金未取得"} / 人数：${adultNum}人</p>
      </div>
      <div class="hotel-list">${hotelCards}</div>
    `;
  }catch(err){
    result.innerHTML = `<div class="hotel-error">ホテル検索に失敗しました。API設定を確認してください。</div>`;
  }
}

function suggestTraffic(){
  const from = document.getElementById("trafficFrom")?.value || "出発地";
  const to = document.getElementById("trafficTo")?.value || "遠征先";
  const budget = Number(document.getElementById("trafficBudget")?.value || 0);
  const result = document.getElementById("trafficSuggestResult");

  if(!result) return;

  let bus = 6000;
  let shinkansen = 15000;
  let plane = 18000;
  let local = 9000;

  const routeText = `${from} → ${to}`;

  if(from.includes("名古屋") && to.includes("東京")){
    bus = 4500; shinkansen = 11000; plane = 16000; local = 6500;
  }else if(from.includes("大阪") && to.includes("東京")){
    bus = 5500; shinkansen = 14500; plane = 15000; local = 9000;
  }else if(from.includes("東京") && to.includes("大阪")){
    bus = 5500; shinkansen = 14500; plane = 15000; local = 9000;
  }else if(to.includes("福岡") || from.includes("福岡")){
    bus = 9000; shinkansen = 23000; plane = 18000; local = 16000;
  }else if(to.includes("札幌") || from.includes("札幌")){
    bus = 0; shinkansen = 0; plane = 20000; local = 0;
  }

  const options = [
    {name:"夜行・高速バス", icon:"🚌", price:bus, note:"最安重視。宿代を浮かせたい人向け"},
    {name:"新幹線・特急", icon:"🚄", price:shinkansen, note:"時間と快適さのバランス重視"},
    {name:"飛行機", icon:"✈️", price:plane, note:"長距離遠征向け。早割確認がおすすめ"},
    {name:"在来線", icon:"🚃", price:local, note:"近距離・節約向け。時間に余裕がある人向け"}
  ].filter(x => x.price > 0);

  let best = options[0];
  const affordable = options.filter(x => x.price <= budget);
  if(affordable.length){
    best = affordable.sort((a,b)=>a.price-b.price)[0];
  }else{
    best = options.sort((a,b)=>a.price-b.price)[0];
  }

  const cards = options.map(x => `
    <div class="traffic-card">
      <span>${x.icon} ${x.name}</span>
      <b>${yenHotel(x.price)}</b>
      <small>${x.note}</small>
    </div>
  `).join("");

  result.classList.add("show");
  result.innerHTML = `
    <div class="traffic-summary">
      <p>${routeText} の交通手段提案</p>
      <strong>おすすめ：${best.name}</strong>
      <p>入力予算：${yenHotel(budget)} / 目安交通費：${yenHotel(best.price)}</p>
    </div>
    <div class="traffic-cards">${cards}</div>
    <div class="traffic-link-grid">
      <div class="traffic-link-card"><span>🚌</span>夜行バスを探す<br><a href="https://px.a8.net/svt/ejp?a8mat=4B5Q87+62I63U+AD2+3H18R6" target="_blank" rel="nofollow sponsored noopener">エアトリへ</a></div>
      <div class="traffic-link-card"><span>🚄</span>新幹線を探す<br><a href="https://px.a8.net/svt/ejp?a8mat=4B5Q87+72TM0A+4R8G+BWVTE" target="_blank" rel="nofollow sponsored noopener">予約サイトへ</a></div>
      <div class="traffic-link-card"><span>✈️</span>航空券を探す<br><a href="https://a.r10.to/hgDzCx" target="_blank" rel="nofollow sponsored noopener">航空券比較へ</a></div>
      <div class="traffic-link-card"><span>🏨</span>ホテルも探す<br><a href="https://a.r10.to/hYbXg0" target="_blank" rel="nofollow sponsored noopener">楽天トラベルへ</a></div>
    </div>
  `;
}

document.addEventListener("DOMContentLoaded", function(){
  setTomorrowDefaults();

  const hotelBtn = document.getElementById("hotelSearchBtn");
  if(hotelBtn){
    hotelBtn.addEventListener("click", function(e){
      e.preventDefault();
      searchRakutenHotels();
    });
  }

  const trafficBtn = document.getElementById("trafficSuggestBtn");
  if(trafficBtn){
    trafficBtn.addEventListener("click", function(e){
      e.preventDefault();
      suggestTraffic();
    });
  }
});
