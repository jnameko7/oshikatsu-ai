const yen = (n) => `${Math.round(n).toLocaleString()}円`;

function num(id){
  return Number(document.getElementById(id).value || 0);
}

function show(id, html){
  const el = document.getElementById(id);
  el.innerHTML = html;
  el.classList.add("show");
}

document.getElementById("fundForm").addEventListener("submit", (e) => {
  e.preventDefault();

  const income = num("income");
  const expenses =
    num("rent") +
    num("food") +
    num("mobile") +
    num("utility") +
    num("subs") +
    num("transport") +
    num("other") +
    num("save");

  const monthly = Math.max(income - expenses, 0);
  const yearly = monthly * 12;
  const tripCost = 40000;
  const trips = Math.floor(yearly / tripCost);
  const goods = Math.floor(monthly * 0.45);

  document.getElementById("sideMonthly").textContent = yen(monthly);
  document.getElementById("sideYearly").textContent = yen(yearly);
  document.getElementById("sideTrips").textContent = `${trips}回`;

  show("fundResult", `
    <strong>毎月の推し活予算：${yen(monthly)}</strong>
    <ul>
      <li>年間推し活予算：${yen(yearly)}</li>
      <li>遠征可能回数の目安：年間${trips}回</li>
      <li>グッズ予算の目安：月${yen(goods)}</li>
    </ul>
    <p>これは目安です。貯金や生活費を優先し、無理のない範囲で判断してください。</p>
  `);
});

document.getElementById("savingForm").addEventListener("submit", (e) => {
  e.preventDefault();

  const mobileCut = Math.max(num("sMobile") - 3000, 0);
  const subsCut = Math.floor(num("sSubs") * 0.35);
  const foodCut = Math.floor(num("sFood") * 0.08);
  const convenienceCut = Math.floor(num("sConvenience") * 0.45);
  const total = mobileCut + subsCut + foodCut + convenienceCut;

  document.getElementById("sideSaving").textContent = `月${yen(total)}`;

  show("savingResult", `
    <strong>月${yen(total)}を捻出できる可能性があります。</strong>
    <ul>
      <li>通信費見直し候補：${yen(mobileCut)}</li>
      <li>サブスク整理候補：${yen(subsCut)}</li>
      <li>食費改善候補：${yen(foodCut)}</li>
      <li>コンビニ利用改善候補：${yen(convenienceCut)}</li>
      <li>年間換算：${yen(total * 12)}</li>
    </ul>
    <p>削りたくない支出は無理に削らず、優先順位を見て選んでください。</p>
  `);
});

const routeBase = {
  "nagoya-tokyo": 9000,
  "nagoya-osaka": 3500,
  "tokyo-osaka": 8000,
  "tokyo-sapporo": 14000,
  "tokyo-fukuoka": 15000,
  "osaka-fukuoka": 9000,
  "osaka-sapporo": 16000,
  "nagoya-sapporo": 16000,
  "nagoya-fukuoka": 13000,
  "sapporo-fukuoka": 22000
};

function routeCost(from, to){
  if(from === to) return 1000;
  return routeBase[`${from}-${to}`] || routeBase[`${to}-${from}`] || 12000;
}

document.getElementById("tripForm").addEventListener("submit", (e) => {
  e.preventDefault();

  const from = document.getElementById("fromCity").value;
  const to = document.getElementById("toCity").value;
  const nights = num("nights");
  const meals = num("mealBudget");
  const transport = routeCost(from, to);
  const hotel = nights * 5500;
  const food = meals * Math.max(nights + 1, 1);

  const cheapest = transport + hotel + food;
  const balance = Math.floor(cheapest * 1.35);
  const comfort = Math.floor(cheapest * 1.85);

  show("tripResult", `
    <strong>最安目安：${yen(cheapest)}</strong>
    <ul>
      <li>交通費目安：${yen(transport)}</li>
      <li>宿泊費目安：${yen(hotel)}</li>
      <li>食費目安：${yen(food)}</li>
      <li>バランス重視：${yen(balance)}</li>
      <li>快適重視：${yen(comfort)}</li>
    </ul>
    <p>実際の交通費・宿泊費は日程で変動します。予約前に各公式サイトで確認してください。</p>
  `);
});

document.getElementById("goalForm").addEventListener("submit", (e) => {
  e.preventDefault();

  const name = document.getElementById("goalName").value || "目標";
  const amount = num("goalAmount");
  const monthly = num("monthlySaving");
  const months = monthly > 0 ? Math.ceil(amount / monthly) : 0;
  const short = months <= 12;

  show("goalResult", `
    <strong>${name}の達成目安：${months}か月</strong>
    <ul>
      <li>必要金額：${yen(amount)}</li>
      <li>毎月積立：${yen(monthly)}</li>
      <li>年間積立：${yen(monthly * 12)}</li>
    </ul>
    <p>${short ? "1年以内に達成できる可能性があります。" : "達成を早めるなら、娯楽費捻出診断で追加予算を探すのがおすすめです。"}</p>
  `);
});
