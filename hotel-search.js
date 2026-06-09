function yenHotel(value){return Math.round(Number(value)||0).toLocaleString()+"円";}
function getHotelInfo(item){if(Array.isArray(item)){return item[0]?.hotelBasicInfo||{};}return item?.hotelBasicInfo||item||{};}
function safeHotelUrl(hotel){return hotel.hotelInformationUrl||hotel.planListUrl||"https://travel.rakuten.co.jp/";}
function safeHotelImage(hotel){return hotel.hotelThumbnailUrl||hotel.hotelImageUrl||"";}
async function searchRakutenHotels(){
  const keyword=document.getElementById("hotelKeyword")?.value||"東京";
  const budget=Number(document.getElementById("hotelBudget")?.value||0);
  const result=document.getElementById("rakutenHotelResult");
  if(!result)return;
  result.classList.add("show");
  result.innerHTML='<div class="hotel-error">ホテル情報を検索中です...</div>';
  try{
    const res=await fetch(`/api/rakuten-hotels?keyword=${encodeURIComponent(keyword)}`);
    const data=await res.json();
    if(data.errors||data.error){result.innerHTML='<div class="hotel-error">ホテル検索に失敗しました。時間を置いて再度お試しください。</div>';return;}
    const hotels=(data.hotels||[]).map(getHotelInfo).filter(h=>h.hotelName);
    if(!hotels.length){result.innerHTML='<div class="hotel-error">ホテルが見つかりませんでした。検索ワードを広めにして試してください。</div>';return;}
    const prices=hotels.map(h=>Number(h.hotelMinCharge||0)).filter(n=>n>0);
    const avg=prices.length?Math.round(prices.reduce((a,b)=>a+b,0)/prices.length):0;
    const cheapest=prices.length?Math.min(...prices):0;
    let advice="ホテル候補を取得しました。";
    if(budget&&avg){advice=avg<=budget?"宿泊予算内で探せる可能性があります。":"平均宿泊費が予算を超えています。エリアを広げるか、日程調整がおすすめです。";}
    const cards=hotels.map(h=>{
      const price=Number(h.hotelMinCharge||0),img=safeHotelImage(h),url=safeHotelUrl(h);
      const station=h.nearestStation||"最寄駅情報なし",review=h.reviewAverage?`評価 ${h.reviewAverage}`:"評価情報なし";
      const address=`${h.address1||""}${h.address2||""}`;
      return `<div class="hotel-card">${img?`<img src="${img}" alt="${h.hotelName}">`:`<div></div>`}<div><h3>${h.hotelName}</h3><p>${station} / ${review}</p><p>${address}</p><p>${h.hotelSpecial||""}</p></div><div class="hotel-price"><b>${price?yenHotel(price):"料金未取得"}</b><a href="${url}" target="_blank" rel="nofollow sponsored noopener">楽天で見る</a></div></div>`;
    }).join("");
    result.innerHTML=`<div class="hotel-summary"><p>${keyword} のホテル検索結果</p><strong>平均 ${avg?yenHotel(avg):"料金未取得"}</strong><p>${advice}</p><p>最安目安：${cheapest?yenHotel(cheapest):"料金未取得"}</p></div><div class="hotel-list">${cards}</div>`;
  }catch(err){result.innerHTML='<div class="hotel-error">ホテル検索に失敗しました。API設定を確認してください。</div>';}
}
document.addEventListener("DOMContentLoaded",()=>{const btn=document.getElementById("hotelSearchBtn");if(btn)btn.addEventListener("click",e=>{e.preventDefault();searchRakutenHotels();});});