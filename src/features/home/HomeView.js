/**
 * features/home/HomeView.js
 * ホーム画面（予算進捗カード）の描画
 */

import { records, budgets, childCategories } from "../../store.js";
import { getPeriodRange } from "../../utils/calendar.js";
import { displayCategory } from "../../utils/category.js";

function getMonthlySpending(monthSelector) {
  const periodStartDay = Number(localStorage.getItem("periodStartDay")) || 1;
  const { start, end } = getPeriodRange(monthSelector.value, periodStartDay);
  const map = {};
  records.filter(r => r.date >= start && r.date <= end && r.type === "expense").forEach(r => {
    const label = displayCategory(r.category, childCategories);
    map[label] = (map[label] || 0) + r.amount;
  });
  return map;
}

export function renderHome(monthSelector) {
  const card    = document.getElementById("homeBudgetCard");
  const rowsEl  = document.getElementById("homeBudgetRows");
  const monthEl = document.getElementById("homeBudgetMonth");
  if (!card || !rowsEl) return;

  const budgetCats = Object.keys(budgets).filter(k => budgets[k] > 0);
  if (budgetCats.length === 0) { card.style.display = "none"; return; }
  card.style.display = "";
  rowsEl.innerHTML   = "";

  const ym = monthSelector.value;
  const [y, m] = ym.split("-").map(Number);
  if (monthEl) monthEl.textContent = `${y}年${m}月`;

  const spending = getMonthlySpending(monthSelector);

  budgetCats.forEach(catName => {
    const budget = budgets[catName];
    const spent  = spending[catName] || 0;
    const pct    = Math.min(spent / budget * 100, 100);
    const over   = spent > budget;
    const warn   = !over && spent / budget >= 0.8;
    const barClass = over ? "over" : warn ? "warn" : "ok";
    const row = document.createElement("div");
    row.className = "home-budget-row";
    row.innerHTML = `
      <div class="home-budget-row-top">
        <span class="home-budget-cat">${catName}</span>
        <span class="home-budget-amt ${over ? "over-text" : ""}">
          ¥${spent.toLocaleString()} <span class="home-budget-limit">/ ¥${budget.toLocaleString()}</span>
        </span>
      </div>
      <div class="home-budget-bar-wrap">
        <div class="home-budget-bar ${barClass}" style="width:${pct}%"></div>
      </div>
      <div class="home-budget-row-foot">
        <span class="${over ? "over-text" : "home-budget-remain"}">
          ${over ? `¥${(spent - budget).toLocaleString()} オーバー` : `残り ¥${(budget - spent).toLocaleString()}`}
        </span>
        <span class="home-budget-pct">${Math.round(spent / budget * 100)}%</span>
      </div>
    `;
    rowsEl.appendChild(row);
  });
}
