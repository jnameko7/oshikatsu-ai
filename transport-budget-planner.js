function yenBudget(v){return Math.round(Number(v)||0).toLocaleString()+"円";}
function numBudget(id){return Number(document.getElementById(id)?.value||0);}

function transportName(key){
  return {auto:"おすすめ自動",bus:"夜行・高速バス",lcc:"LCC",fsc:"FSC",plane:"飛行機",shinkansen:"新幹線・特急",local:"在来線"}[key]||"交通手段";
}

function mealPlanCost(mealType,mealsPerDay,people,days){
  const meals=Number(mealsPerDay)||2;
  const totalMeals=meals*days*people;
  if(mealType==="restaurant")return {total:totalMeals*1500,detail:`外食 ${totalMeals}食 × 1,500円`};
  if(mealType==="convenience")return {total:totalMeals*1000,detail:`コンビニ食 ${totalMeals}食 × 1,000円`};
  const restaurantMeals=Math.ceil(totalMeals/2);
  const convenienceMeals=totalMeals-restaurantMeals;
  return {total:restaurantMeals*1500+convenienceMeals*1000,detail:`外食 ${restaurantMeals}食 × 1,500円 / コンビニ食 ${convenienceMeals}食 × 1,000円`};
}

function chooseTransportByEngine(fareResult,budget,people,preferred){
  if(typeof chooseBestTransportFromEngine==="function"){
    return chooseBestTransportFromEngine(fareResult,budget,people,preferred);
  }
  return {type:"bus",price:fareResult?.bus?.normal||6500};
}

function suggestHotelCost(budget,transportTotal,foodTotal,reserve,people,nights,goodsMin){
  if(nights<=0)return 0;
  const remaining=budget-transportTotal-foodTotal-reserve-goodsMin;
  const perPersonPerNight=Math.floor(remaining/(people*nights));
  if(perPersonPerNight<=0)return 0;
  if(perPersonPerNight<4000)return perPersonPerNight*people*nights;
  if(perPersonPerNight>9000)return 9000*people*nights;
  return perPersonPerNight*people*nights;
}

function makeRoundTripFareResult(fareResult){
  if(!fareResult || typeof fareResult!=="object")return fareResult;
  const copy=JSON.parse(JSON.stringify(fareResult));
  const priceKeys=["normal","min","max","price","fare","cost","low","high"];
  Object.keys(copy).forEach(key=>{
    const item=copy[key];
    if(item && typeof item==="object"){
      priceKeys.forEach(pk=>{
        if(typeof item[pk]==="number") item[pk]=item[pk]*2;
      });
    }
  });
  return copy;
}

function cleanTransportCardHTML(html){
  return String(html||"")
    .replace(/主要路線データ\s*\/?\s*信頼度：高/g,"")
    .replace(/主要路線データ/g,"")
    .replace(/信頼度：高/g,"")
    .replace(/距離計算による推定料金\s*\/?\s*信頼度：低\s*\/?\s*実料金と大きく異なる場合があります/g,"")
    .replace(/距離計算による推定料金/g,"")
    .replace(/信頼度：低\s*\/?\s*実料金と大きく異なる場合があります/g,"");
}

function buildTransportCards(fareResult){
  const roundTripFareResult=makeRoundTripFareResult(fareResult);
  if(typeof allTransportFareCardsHTML==="function"){
    return cleanTransportCardHTML(allTransportFareCardsHTML(roundTripFareResult));
  }
  return `<div class="budget-cards"><div class="budget-card"><span>夜行・高速バス</span><b>${yenBudget(roundTripFareResult?.bus?.normal||13000)}</b><small>往復目安</small></div></div>`;
}

function buildTransportNotice(fareResult){
  if(typeof transportDisclaimerHTML==="function")return transportDisclaimerHTML(fareResult);
  return `<div class="price-disclaimer"><strong>【重要】料金について</strong><p>掲載料金は遠征計画用の参考価格です。実際の料金と異なる場合があります。必ず予約サイトで確認してください。</p></div>`;
}

function buildPlanner(){
  const budget=numBudget("tripBudget");
  const from=document.getElementById("plannerFrom")?.value||"出発地";
  const to=document.getElementById("plannerTo")?.value||"目的地";
  const preferred=document.getElementById("preferredTransport")?.value||"auto";
  const people=numBudget("plannerPeople")||1;
  const nights=numBudget("plannerNights");
  const days=nights+1;
  const mealType=document.getElementById("mealType")?.value||"mixed";
  const mealsPerDay=numBudget("mealsPerDay")||2;
  const hotelMode=document.getElementById("hotelCostMode")?.value||"auto";
  const manualHotel=numBudget("manualHotelInput");
  const reserve=numBudget("reserveCost");
  const goodsMin=numBudget("goodsMinTarget");
  const result=document.getElementById("budgetPlannerResult");
  if(!result)return;

  const fareResult=typeof getTransportFare==="function" ? getTransportFare(from,to) : fallbackFareByDistance(from,to);
  const chosen=chooseTransportByEngine(fareResult,budget,people,preferred);
  const oneWayPerPerson=Number(chosen.price||0);
  const transportTotal=oneWayPerPerson*2*people;

  const meal=mealPlanCost(mealType,mealsPerDay,people,days);
  const hotelSuggested=suggestHotelCost(budget,transportTotal,meal.total,reserve,people,nights,goodsMin);
  const hotelTotal=hotelMode==="manual"?manualHotel:hotelSuggested;
  const baseTotal=transportTotal+hotelTotal+meal.total+reserve;
  const goods=Math.max(0,budget-baseTotal);
  const shortage=Math.max(0,baseTotal-budget);
  const hotelPerPersonNight=(hotelTotal&&people&&nights)?Math.round(hotelTotal/people/nights):0;
  const hotelMessage=nights===0?"日帰りのため宿泊費は0円です。":hotelMode==="manual"?"自分で入力した宿泊費を使っています。":`予算から逆算した宿泊費提案です。1名1泊あたり約${yenBudget(hotelPerPersonNight)}までを目安に探せます。`;
  const status=shortage>0?`<p>予算を ${yenBudget(shortage)} 超えています。交通手段・宿泊数・食費を見直してください。</p>`:`<p>グッズ代に使える想定残額は ${yenBudget(goods)} です。</p>`;

  result.classList.add("show");
  result.innerHTML=`<div class="result-main"><p>${from} → ${to} の遠征予算プラン</p><strong>グッズ代 ${yenBudget(goods)}</strong>${status}</div>
  <div class="budget-cards"><div class="budget-card"><span>交通費目安</span><b>${yenBudget(transportTotal)}</b><small>${transportName(chosen.type)} / 往復 / ${people}人分</small></div><div class="budget-card"><span>宿泊費提案</span><b>${yenBudget(hotelTotal)}</b><small>${hotelMessage}</small></div><div class="budget-card"><span>理想食費</span><b>${yenBudget(meal.total)}</b><small>${meal.detail}</small></div></div>
  <div class="adjust-box"><h2>手動で調整する</h2><p style="margin-top:0;color:#6e7587;font-weight:800">実際の金額が分かったら、下の金額を変更して再計算できます。</p><div class="adjust-grid"><label>交通費<input type="number" id="manualTransport" value="${transportTotal}"></label><label>宿泊費<input type="number" id="manualHotel" value="${hotelTotal}"></label><label>食費<input type="number" id="manualFood" value="${meal.total}"></label><label>予備費<input type="number" id="manualReserve" value="${reserve}"></label></div><button class="submit-btn" type="button" id="manualRecalc">手動金額で再計算 →</button><button class="mini-btn" type="button" id="applyHotelBudget">この宿泊費を楽天ホテル検索に反映する</button></div>
  <div class="result-summary"><h2>予算配分</h2><ul><li><span>遠征予算</span><b>${yenBudget(budget)}</b></li><li><span>交通費（往復）</span><b>${yenBudget(transportTotal)}</b></li><li><span>宿泊費</span><b>${yenBudget(hotelTotal)}</b></li><li><span>食費</span><b>${yenBudget(meal.total)}</b></li><li><span>予備費</span><b>${yenBudget(reserve)}</b></li><li><span>最低確保したいグッズ代</span><b>${yenBudget(goodsMin)}</b></li><li><span>グッズ代に使える残額</span><b>${yenBudget(goods)}</b></li></ul></div>
  <div class="result-summary"><h2>交通手段別の目安（往復）</h2>${buildTransportCards(fareResult)}<p style="color:#6e7587;font-weight:800;margin-top:12px">${fareResult.note||""}</p></div>${buildTransportNotice(fareResult)}`;

  document.getElementById("manualRecalc").onclick=manualRecalc;
  document.getElementById("applyHotelBudget").onclick=()=>{
    const hotelBudget=document.getElementById("hotelBudget"),hotelKeyword=document.getElementById("hotelKeyword"),hotelAdultNum=document.getElementById("hotelAdultNum");
    if(hotelBudget)hotelBudget.value=Math.max(0,Math.round(hotelTotal/Math.max(people,1)));
    if(hotelKeyword)hotelKeyword.value=to;
    if(hotelAdultNum)hotelAdultNum.value=String(people);
    location.hash="hotelBudget";
  };
}

function manualRecalc(){
  const budget=numBudget("tripBudget"),t=numBudget("manualTransport"),h=numBudget("manualHotel"),f=numBudget("manualFood"),r=numBudget("manualReserve");
  const total=t+h+f+r,goods=Math.max(0,budget-total),shortage=Math.max(0,total-budget),result=document.getElementById("budgetPlannerResult");
  const msg=shortage>0?`予算を ${yenBudget(shortage)} 超えています。`:`グッズ代に使える残額は ${yenBudget(goods)} です。`;
  const top=result.querySelector(".result-main");
  if(top)top.innerHTML=`<p>手動調整後の遠征予算プラン</p><strong>グッズ代 ${yenBudget(goods)}</strong><p>${msg}</p>`;
}

document.addEventListener("DOMContentLoaded",()=>{document.getElementById("budgetPlannerForm")?.addEventListener("submit",e=>{e.preventDefault();buildPlanner();});});
