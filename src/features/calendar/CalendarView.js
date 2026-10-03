/**
 * features/calendar/CalendarView.js
 * カレンダー画面の描画
 */

import { records, childCategories } from "../../store.js";
import { getPeriodRange } from "../../utils/calendar.js";
import { displayCategory } from "../../utils/category.js";
import { appendGroupsToEl } from "../transactions/TxList.js";
import { WEEKDAY_NAMES } from "../../utils/calendar.js";

export function renderCalendar(monthSelector, onClickRecord) {
  const calendar = document.getElementById("calendar");
  const txList   = document.getElementById("calTransactionList");
  const ymEl     = document.getElementById("calYearMonth");
  const rangeEl  = document.getElementById("calRange");
  if (!calendar) return;
  calendar.innerHTML = "";
  if (txList) txList.innerHTML = "";

  const ym = monthSelector.value;
  const [year, m] = ym.split("-").map(Number);
  const periodStartDay = Number(localStorage.getItem("periodStartDay")) || 1;
  const { start, end } = getPeriodRange(ym, periodStartDay);
  const startDate = new Date(start + "T00:00:00");
  const endDate   = new Date(end   + "T00:00:00");

  if (ymEl)    ymEl.textContent = `${year}年${m}月`;
  if (rangeEl) {
    const fmt = d => `${d.getMonth()+1}月${d.getDate()}日`;
    rangeEl.textContent = `（${fmt(startDate)}〜${fmt(endDate)}）`;
  }

  // 最初の曜日分の空欄
  const firstDow = startDate.getDay();
  for (let i = 0; i < firstDow; i++) calendar.appendChild(document.createElement("div"));

  const cur = new Date(startDate);
  const todayStr = new Date().toISOString().slice(0, 10);

  while (cur <= endDate) {
    const dayStr = `${cur.getFullYear()}-${String(cur.getMonth()+1).padStart(2,"0")}-${String(cur.getDate()).padStart(2,"0")}`;
    let income = 0, expense = 0;
    records.forEach(r => {
      if (r.date === dayStr) r.type === "income" ? income += r.amount : expense += r.amount;
    });
    const div = document.createElement("div");
    div.className = "day";
    div.innerHTML = `
      <div class="date">${cur.getDate()}</div>
      <div class="income">${income  > 0 ? "＋¥" + income.toLocaleString()  : ""}</div>
      <div class="expense">${expense > 0 ? "−¥" + expense.toLocaleString() : ""}</div>
    `;
    if (dayStr === todayStr)            div.classList.add("today");
    if      (expense > 0 && income > 0) div.classList.add("both");
    else if (expense > 0)               div.classList.add("expense-day");
    else if (income > 0)                div.classList.add("income-day");
    calendar.appendChild(div);
    cur.setDate(cur.getDate() + 1);
  }

  if (!txList) return;
  const periodRecords = records.filter(r => r.date >= start && r.date <= end);
  if (periodRecords.length === 0) {
    txList.innerHTML = '<p style="text-align:center;color:#aaa;font-size:14px;padding:20px 0;">この期間の記録はありません</p>';
    return;
  }
  // 日付グループを構築
  const sorted = [...periodRecords].sort((a, b) => b.date.localeCompare(a.date));
  const groups = [];
  sorted.forEach(record => {
    const last = groups[groups.length - 1];
    if (last && last.date === record.date) last.records.push(record);
    else groups.push({ date: record.date, records: [record] });
  });
  appendGroupsToEl(txList, groups, onClickRecord);
}
