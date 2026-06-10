function yenBudget(v){return Math.round(Number(v)||0).toLocaleString()+"円";}
function numBudget(id){return Number(document.getElementById(id)?.value||0);}

function routeCosts(from,to){
  let costs={bus:6000,shinkansen:15000,plane:18000,local:9000};

  if(from.includes("名古屋")&&to.includes("東京")){
    costs={bus:4500,shinkansen:11000,plane:16000,local:6500};
  }else if((from.includes("大阪")&&to.includes("東京"))||(from.includes("東京")&&to.includes("大阪"))){
    costs={bus:5500,shinkansen:14500,plane:15000,local:9000};
  }else if(to.includes("福岡")||from.includes("福岡")){
    costs={bus:9000,shinkansen=23000,plane:18000,local:16000};
  }else if(to.includes("札幌")||from.includes("札幌")){
    costs={bus:0,shinkansen:0,plane:20000,local:0};
  }

  return costs;
}

function transportName(key){
  return {auto:"おすすめ自動",bus:"夜行・高速バス",shinkansen:"新幹線・特急",plane:"飛行機",local:"在来線"}[key]||"交通手段";
}

function mealPlanCost(mealType,mealsPerDay,people,days){
  const meals=Number(mealsPerDay)||2;
  const totalMeals=meals*days*people;

  if(mealType==="restaurant"){
    return {total:totalMeals*1500, detail:`外食 ${totalMeals}食 × 1,500円`};
  }

  if(mealType==="convenience"){
    return {total:totalMeals*1000, detail:`コンビニ食 ${totalMeals}食 × 1,000円`};
  }

  const restaurantMeals=Math.ceil(totalMeals/2);
  const convenienceMeals=totalMeals-restaurantMeals;
  return {
    total:restaurantMeals*1500+convenienceMeals*1000,
    detail:`外食 ${restaurantMeals}食 × 1,500円 / コンビニ食 ${convenienceMeals}食 × 1,000円`
  };
}

function chooseTransport(costs,budget,preferred){
  const usable=Object.entries(costs).filter(([k,v])=>v>0);
  if(preferred!=="auto" && costs[preferred]>0){
    return {key:preferred,price:costs[preferred]};
  }
  const affordable=usable.filter(([k,v])=>v<=budget*0.45).sort((a,b)=>a[1]-b[1]);
  const sorted=(affordable.length?affordable:usable).sort((a,b)=>a[1]-b[1]);
  return {key:sorted[0][0],price:sorted[0][1]};
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

function buildPlanner(){
  const budget=numBudget("tripBudget");
  const from=document.getElementById("plannerFrom").value||"出発地";
  const to=document.getElementById("plannerTo").value||"目的地";
  const preferred=document.getElementById("preferredTransport").value||"auto";
  const people=numBudget("plannerPeople")||1;
  const nights=numBudget("plannerNights");
  const days=nights+1;
  const mealType=document.getElementById("mealType").value||"mixed";
  const mealsPerDay=numBudget("mealsPerDay")||2;
  const hotelMode=document.getElementById("hotelCostMode").value||"auto";
  const manualHotel=numBudget("manualHotelInput");
  const reserve=numBudget("reserveCost");
  const goodsMin=numBudget("goodsMinTarget");
  const result=document.getElementById("budgetPlannerResult");

  const costs=routeCosts(from,to);
  const chosen=chooseTransport(costs,budget,preferred);

  const transportTotal=chosen.price*people;
  const meal=mealPlanCost(mealType,mealsPerDay,people,days);
  const hotelSuggested=suggestHotelCost(budget,transportTotal,meal.total,reserve,people,nights,goodsMin);
  const hotelTotal=hotelMode==="manual"?manualHotel:hotelSuggested;

  const baseTotal=transportTotal+hotelTotal+meal.total+reserve;
  const goods=Math.max(0,budget-baseTotal);
  const shortage=Math.max(0,baseTotal-budget);

  const hotelPerPersonNight=(hotelTotal&&people&&nights)?Math.round(hotelTotal/people/nights):0;
  const hotelMessage=nights===0
    ?"日帰りのため宿泊費は0円です。"
    : hotelMode==="manual"
      ?"自分で入力した宿泊費を使っています。"
      : `予算から逆算した宿泊費提案です。1名1泊あたり約${yenBudget(hotelPerPersonNight)}までを目安に探せます。`;

  const otherOptions=Object.entries(costs).filter(([k,v])=>v>0).map(([k,v])=>{
    return `<div class="budget-card"><span>${transportName(k)}</span><b>${yenBudget(v*people)}</b><small>${people}人分の目安</small></div>`;
  }).join("");

  const status=shortage>0
    ? `<p>予算を ${yenBudget(shortage)} 超えています。交通手段・宿泊数・食費を見直してください。</p>`
    : `<p>グッズ代に使える想定残額は ${yenBudget(goods)} です。</p>`;

  result.classList.add("show");
  result.innerHTML=`
    <div class="result-main">
      <p>${from} → ${to} の遠征予算プラン</p>
      <strong>グッズ代 ${yenBudget(goods)}</strong>
      ${status}
    </div>

    <div class="budget-cards">
      <div class="budget-card"><span>交通費目安</span><b>${yenBudget(transportTotal)}</b><small>${transportName(chosen.key)} / ${people}人分</small></div>
      <div class="budget-card"><span>宿泊費提案</span><b>${yenBudget(hotelTotal)}</b><small>${hotelMessage}</small></div>
      <div class="budget-card"><span>理想食費</span><b>${yenBudget(meal.total)}</b><small>${meal.detail}</small></div>
    </div>

    <div class="adjust-box">
      <h2>手動で調整する</h2>
      <p style="margin-top:0;color:#6e7587;font-weight:800">実際の金額が分かったら、下の金額を変更して再計算できます。</p>
      <div class="adjust-grid">
        <label>交通費<input type="number" id="manualTransport" value="${transportTotal}"></label>
        <label>宿泊費<input type="number" id="manualHotel" value="${hotelTotal}"></label>
        <label>食費<input type="number" id="manualFood" value="${meal.total}"></label>
        <label>予備費<input type="number" id="manualReserve" value="${reserve}"></label>
      </div>
      <button class="submit-btn" type="button" id="manualRecalc">手動金額で再計算 →</button>
      <button class="mini-btn" type="button" id="applyHotelBudget">この宿泊費を楽天ホテル検索に反映する</button>
    </div>

    <div class="result-summary">
      <h2>予算配分</h2>
      <ul>
        <li><span>遠征予算</span><b>${yenBudget(budget)}</b></li>
        <li><span>交通費</span><b>${yenBudget(transportTotal)}</b></li>
        <li><span>宿泊費</span><b>${yenBudget(hotelTotal)}</b></li>
        <li><span>食費</span><b>${yenBudget(meal.total)}</b></li>
        <li><span>予備費</span><b>${yenBudget(reserve)}</b></li>
        <li><span>最低確保したいグッズ代</span><b>${yenBudget(goodsMin)}</b></li>
        <li><span>グッズ代に使える残額</span><b>${yenBudget(goods)}</b></li>
      </ul>
    </div>

    <div class="price-disclaimer">
      <strong>金額について</strong>
      <p>交通費・宿泊費・食費は想定金額です。正確な金額は、ホテル・交通機関・予約サイトで必ずご確認ください。宿泊費提案は、予算から逆算した「探す時の目安」です。</p>
    </div>

    <div class="result-summary">
      <h2>交通手段別の目安</h2>
      <div class="budget-cards">${otherOptions}</div>
    </div>
  `;

  document.getElementById("manualRecalc").onclick=manualRecalc;
  document.getElementById("applyHotelBudget").onclick=()=>{
    const hotelBudget=document.getElementById("hotelBudget");
    const hotelKeyword=document.getElementById("hotelKeyword");
    const hotelAdultNum=document.getElementById("hotelAdultNum");
    if(hotelBudget)hotelBudget.value=Math.max(0,Math.round(hotelTotal/Math.max(people,1)));
    if(hotelKeyword)hotelKeyword.value=to;
    if(hotelAdultNum)hotelAdultNum.value=String(people);
    location.hash="hotelBudget";
  };
}

function manualRecalc(){
  const budget=numBudget("tripBudget");
  const t=numBudget("manualTransport");
  const h=numBudget("manualHotel");
  const f=numBudget("manualFood");
  const r=numBudget("manualReserve");
  const total=t+h+f+r;
  const goods=Math.max(0,budget-total);
  const shortage=Math.max(0,total-budget);
  const result=document.getElementById("budgetPlannerResult");

  const msg=shortage>0
    ? `予算を ${yenBudget(shortage)} 超えています。`
    : `グッズ代に使える残額は ${yenBudget(goods)} です。`;

  const top=result.querySelector(".result-main");
  if(top){
    top.innerHTML=`<p>手動調整後の遠征予算プラン</p><strong>グッズ代 ${yenBudget(goods)}</strong><p>${msg}</p>`;
  }
}

document.addEventListener("DOMContentLoaded",()=>{
  document.getElementById("budgetPlannerForm")?.addEventListener("submit",e=>{
    e.preventDefault();
    buildPlanner();
  });
});
