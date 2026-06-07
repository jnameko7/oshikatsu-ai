const yen=n=>`${Math.round(Number(n)||0).toLocaleString()}円`;
const q=id=>document.getElementById(id);
const num=id=>Number(q(id).value||0);
const siteUrl=location.href.split("#")[0];

function show(id,html){const el=q(id);el.innerHTML=html;el.classList.add("show")}
function saveLocal(data){const arr=JSON.parse(localStorage.getItem("diagnosisResults")||"[]");arr.unshift({...data,savedAt:new Date().toLocaleString("ja-JP")});localStorage.setItem("diagnosisResults",JSON.stringify(arr.slice(0,20)));renderSaved()}
async function sendToServer(data){try{await fetch("/api/collect",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)})}catch(e){console.log("collect skipped",e)}}

q("fundForm").addEventListener("submit",async e=>{
 e.preventDefault();
 const income=num("income");
 const expenses=num("rent")+num("food")+num("mobile")+num("utility")+num("subs")+num("other")+num("save");
 const monthly=Math.max(income-expenses,0), yearly=monthly*12, trips=Math.floor(yearly/40000);
 const result={type:"推し活資金診断",monthly,yearly,trips,income,expenses};
 show("fundResult",`<strong>毎月の推し活予算：${yen(monthly)}</strong><ul><li>年間推し活予算：${yen(yearly)}</li><li>遠征可能回数の目安：${trips}回</li></ul><p>結果は参考情報です。最終判断はご自身で行ってください。</p>`);
 q("shareText").value=`私の推し活予算は月${yen(monthly)}、年間${yen(yearly)}でした！ 推し活資金AIで診断 → ${siteUrl}`;
 if(q("agreeSave").checked){saveLocal(result);await sendToServer(result)}
});

const stationBase={
"東京":{"大阪":{shinkansen:14500,plane:13000,bus:4500,local:9000},"名古屋":{shinkansen:11000,plane:12000,bus:3500,local:6500},"札幌":{shinkansen:28000,plane:16000,bus:22000,local:25000},"福岡":{shinkansen:23000,plane:15000,bus:9000,local:16000}},
"名古屋":{"大阪":{shinkansen:6500,plane:12000,bus:2500,local:3500},"東京":{shinkansen:11000,plane:12000,bus:3500,local:6500},"札幌":{shinkansen:30000,plane:16000,bus:22000,local:26000},"福岡":{shinkansen:18000,plane:13000,bus:7000,local:12000}},
"大阪":{"東京":{shinkansen:14500,plane:13000,bus:4500,local:9000},"名古屋":{shinkansen:6500,plane:12000,bus:2500,local:3500},"福岡":{shinkansen:15000,plane:12000,bus:5000,local:9000},"札幌":{shinkansen:32000,plane:17000,bus:24000,local:28000}}
};
function estimateFare(from,to,type){if(from===to)return 1000;if(stationBase[from]?.[to]?.[type])return stationBase[from][to][type];if(stationBase[to]?.[from]?.[type])return stationBase[to][from][type];return {shinkansen:12000,plane:15000,bus:5000,local:7000}[type]||8000}
function tname(type){return {shinkansen:"新幹線",plane:"飛行機",bus:"夜行バス",local:"在来線"}[type]||type}

q("fareForm").addEventListener("submit",e=>{
 e.preventDefault();
 const from=q("fromStation").value.trim(), to=q("toStation").value.trim(), type=q("transportType").value, nights=num("nights");
 const fare=estimateFare(from,to,type), hotel=nights*5500, total=fare+hotel;
 show("fareResult",`<strong>${from} → ${to}：${yen(total)}</strong><ul><li>交通手段：${tname(type)}</li><li>交通費目安：${yen(fare)}</li><li>宿泊費目安：${yen(hotel)}</li><li>合計目安：${yen(total)}</li></ul><p>実際の料金は変動します。予約前に公式サイトで確認してください。</p>`);
 q("shareText").value=`${from}→${to}の${tname(type)}遠征費目安は${yen(total)}でした！ 推し活資金AIで診断 → ${siteUrl}`;
});

q("shareX").addEventListener("click",()=>window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(q("shareText").value)}`,"_blank"));
q("shareLine").addEventListener("click",()=>window.open(`https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(siteUrl)}&text=${encodeURIComponent(q("shareText").value)}`,"_blank"));
q("copyInstagram").addEventListener("click",async()=>{await navigator.clipboard.writeText(q("shareText").value);alert("Instagram投稿用テキストをコピーしました")});

function renderSaved(){const arr=JSON.parse(localStorage.getItem("diagnosisResults")||"[]");const box=q("savedList");if(!arr.length){box.innerHTML="<p>保存された診断結果はありません。</p>";return}box.innerHTML=arr.map(item=>`<div class="saved-item"><strong>${item.type}</strong><br><small>${item.savedAt}</small><br>${item.monthly!==undefined?`月予算：${yen(item.monthly)} / 年間：${yen(item.yearly)} / 遠征：${item.trips}回`:""}</div>`).join("")}
q("clearSaved").addEventListener("click",()=>{if(confirm("保存結果を削除しますか？")){localStorage.removeItem("diagnosisResults");renderSaved()}});
renderSaved();
