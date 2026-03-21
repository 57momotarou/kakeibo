/**
 * features/transactions/TxList.js
 * 出入金リストの描画
 */

import { records, childCategories } from "../../store.js";
import { displayCategory, parseCategoryField, getParentIcon, getParentColor } from "../../utils/category.js";
import { WEEKDAY_NAMES } from "../../utils/calendar.js";

/**
 * カテゴリの大分類アイコンHTML（円形背景つき）を生成
 */
function buildIconEl(record) {
  const { parentId } = parseCategoryField(record.category, childCategories);
  const icon  = getParentIcon(parentId);
  const color = getParentColor(parentId);

  const el = document.createElement("span");
  el.className = "mf-cat-icon";

  if (color) {
    el.style.background = color;
    el.textContent = icon;
  } else {
    // 未分類：背景透過・枠線のみ
    el.classList.add("mf-cat-icon--outline");
    el.textContent = icon;
  }
  return el;
}

/**
 * レコードを日付グループに変換（新しい順）
 */
function groupByDate(recs) {
  const sorted = [...recs].sort((a, b) => {
    if (b.date !== a.date) return b.date.localeCompare(a.date);
    return recs.indexOf(b) - recs.indexOf(a);
  });
  const groups = [];
  sorted.forEach(record => {
    const last = groups[groups.length - 1];
    if (last && last.date === record.date) last.records.push(record);
    else groups.push({ date: record.date, records: [record] });
  });
  return groups;
}

/**
 * 日付グループをDOMに追加（共通）
 */
export function appendGroupsToEl(container, groups, onClickRecord) {
  groups.forEach(group => {
    const d = new Date(group.date + "T00:00:00");
    const weekDay = WEEKDAY_NAMES[d.getDay()];
    const dateHeader = document.createElement("div");
    dateHeader.className = "list-date-header";
    dateHeader.textContent = `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日（${weekDay}）`;
    container.appendChild(dateHeader);

    group.records.forEach(record => {
      const row = document.createElement("div");
      row.className = "mf-record-row";
      const isExpense = record.type === "expense";
      const catLabel  = displayCategory(record.category, childCategories);

      // アイコン
      const iconEl = buildIconEl(record);

      // 左側テキスト
      const leftEl = document.createElement("div");
      leftEl.className = "mf-row-left";
      leftEl.innerHTML = `
        <span class="mf-title">${record.title || catLabel}</span>
        <span class="mf-cat-label">${catLabel}</span>
      `;

      // 金額
      const amountEl = document.createElement("span");
      amountEl.className = `mf-amount ${isExpense ? "mf-amount-expense" : "mf-amount-income"}`;
      amountEl.textContent = `${isExpense ? "-" : "+"}¥${record.amount.toLocaleString()}`;

      row.appendChild(iconEl);
      row.appendChild(leftEl);
      row.appendChild(amountEl);

      row.addEventListener("click", () => onClickRecord(record));
      container.appendChild(row);
    });
  });
}

/**
 * 出入金タブのリスト全体を描画
 */
export function renderTxList(onClickRecord) {
  const list = document.getElementById("list");
  list.innerHTML = "";

  if (records.length === 0) {
    const empty = document.createElement("p");
    empty.style.cssText = "text-align:center;color:#aaa;font-size:14px;margin-top:60px;";
    empty.textContent = "記録がありません";
    list.appendChild(empty);
    return;
  }

  const groups = groupByDate(records);
  appendGroupsToEl(list, groups, onClickRecord);
}
