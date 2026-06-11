/*
  transport-disclaimer.js
  交通費・宿泊費・食費の注意書き表示用
*/

function transportCommonDisclaimerHTML(){
  return `
    <div class="price-disclaimer transport-common-disclaimer">
      <strong>【重要】料金について</strong>
      <p>
        当サイトの交通費・宿泊費・食費は、遠征計画を立てるための参考価格です。
        実際の販売価格ではありません。
        料金は日付・曜日・空席状況・繁忙期・イベント開催状況・予約タイミング・利用会社により大きく変動します。
        掲載料金は予約時と異なる場合があります。
        必ず楽天トラベル、エアトリ、各交通機関公式サイト等で最新料金をご確認ください。
      </p>
    </div>
  `;
}

function busDisclaimerHTML(source){
  const fallbackText = source === "fallback"
    ? "この区間はマイナー路線または未登録区間のため、距離計算および周辺路線相場から算出しています。実際の価格と大きく異なる場合があります。"
    : "この区間は主要路線データをもとにした目安料金です。";

  return `
    <div class="price-disclaimer transport-bus-disclaimer">
      <strong>【夜行バス料金について】</strong>
      <p>
        夜行バス料金は主要路線の相場データを参考に算出しています。
        ${fallbackText}
        直通便が存在しない場合や、季節運行・臨時便のみの場合があります。
        料金は日付・曜日・空席・繁忙期・座席タイプ・予約タイミングで大きく変わります。
        必ず予約サイトで正確な料金をご確認ください。
      </p>
    </div>
  `;
}

function flightDisclaimerHTML(source){
  const fallbackText = source === "fallback"
    ? "この区間はマイナー路線または未登録区間のため、距離計算および周辺路線相場から算出しています。実際の航空券価格と大きく異なる場合があります。"
    : "この区間は主要路線データをもとにした目安料金です。";

  return `
    <div class="price-disclaimer transport-flight-disclaimer">
      <strong>【航空券料金について】</strong>
      <p>
        LCC・FSCの航空券料金は目安です。
        ${fallbackText}
        航空券は空席状況、購入時期、曜日、繁忙期、セール、手荷物条件により大きく変動します。
        同一路線でも便や予約タイミングによって料金が大幅に異なる場合があります。
        正確な料金は航空会社公式サイトや予約サイトで必ずご確認ください。
      </p>
    </div>
  `;
}

function railDisclaimerHTML(source){
  const fallbackText = source === "fallback"
    ? "この区間はマイナー路線または未登録区間のため、距離計算および周辺路線相場から算出しています。実際の鉄道料金と大きく異なる場合があります。"
    : "この区間は主要路線データをもとにした目安料金です。";

  return `
    <div class="price-disclaimer transport-rail-disclaimer">
      <strong>【新幹線・在来線料金について】</strong>
      <p>
        新幹線・在来線料金は目安です。
        ${fallbackText}
        指定席・自由席・グリーン車・繁忙期料金・割引きっぷ・乗継条件によって料金が変わる場合があります。
        正確な料金はJR各社公式サイト、乗換案内、予約サイトで必ずご確認ください。
      </p>
    </div>
  `;
}

function transportDisclaimerHTML(result){
  const source = result?.source || "fallback";
  return `
    ${transportCommonDisclaimerHTML()}
    ${busDisclaimerHTML(source)}
    ${flightDisclaimerHTML(source)}
    ${railDisclaimerHTML(source)}
  `;
}
