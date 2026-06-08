
function saveDiagnosis(type, title, total, detail){
  const key = "oshikatsu_saved_results";
  const list = JSON.parse(localStorage.getItem(key) || "[]");
  list.unshift({
    id: Date.now(),
    type,
    title,
    total,
    detail,
    date: new Date().toLocaleString("ja-JP")
  });
  localStorage.setItem(key, JSON.stringify(list.slice(0,50)));
  alert("診断結果を保存しました");
}
function renderSavedResults(targetId){
  const area = document.getElementById(targetId);
  if(!area) return;
  const list = JSON.parse(localStorage.getItem("oshikatsu_saved_results") || "[]");
  if(list.length === 0){ area.innerHTML = "<p>保存済みの診断結果はありません。</p>"; return; }
  area.innerHTML = list.map(item => `
    <div class="save-item">
      <div><strong>${item.title}</strong><br><small>${item.date} / ${Number(item.total||0).toLocaleString()}円</small></div>
      <div class="save-actions">
        <button class="mini-btn" onclick='alert(${JSON.stringify("詳細：")} + ${JSON.stringify("")} + ${JSON.stringify("${item.detail}")})'>詳細</button>
        <button class="mini-btn gray" onclick="deleteSavedResult(${item.id}, '${targetId}')">削除</button>
      </div>
    </div>
  `).join("");
}
function deleteSavedResult(id,targetId){
  const list = JSON.parse(localStorage.getItem("oshikatsu_saved_results") || "[]").filter(x=>x.id!==id);
  localStorage.setItem("oshikatsu_saved_results", JSON.stringify(list));
  renderSavedResults(targetId);
}
