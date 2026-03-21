/**
 * features/graph/GraphView.js
 * グラフ画面（円グラフ・凡例・サマリー）
 */

import { records, childCategories } from "../../store.js";
import { getPeriodRange } from "../../utils/calendar.js";
import { displayCategory, parseCategoryField } from "../../utils/category.js";
import { CHART_COLORS, PARENT_CATEGORIES } from "../../constants/categories.js";

function filterByPeriod(yearMonth) {
  const periodStartDay = Number(localStorage.getItem("periodStartDay")) || 1;
  const { start, end } = getPeriodRange(yearMonth, periodStartDay);
  return records.filter(r => r.date >= start && r.date <= end);
}

function aggregateByCategory(type, month) {
  const filtered = filterByPeriod(month).filter(r => r.type === type);
  const map = {};
  const colorMap = {};
  filtered.forEach(r => {
    const label = displayCategory(r.category, childCategories);
    map[label] = (map[label] || 0) + r.amount;
    // 大分類のcolorを記録（未設定はCHART_COLORSにフォールバック）
    if (!colorMap[label]) {
      const { parentId } = parseCategoryField(r.category, childCategories);
      const parent = PARENT_CATEGORIES.find(p => p.id === parentId);
      colorMap[label] = parent?.color || null;
    }
  });
  return Object.entries(map)
    .sort((a,b) => b[1]-a[1])
    .map(([name, amount], i) => ({
      name,
      amount,
      color: colorMap[name] || CHART_COLORS[i % CHART_COLORS.length],
    }));
}

function drawPieChart(canvasId, data, totalElId) {
  const canvas = document.getElementById(canvasId);
  const ctx = canvas.getContext("2d");
  const cx = canvas.width / 2, cy = canvas.height / 2;
  const R = Math.min(cx, cy) - 8, r = R * 0.52;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const total = data.reduce((s, d) => s + d.amount, 0);
  const totalEl = document.getElementById(totalElId);
  if (totalEl) totalEl.textContent = total > 0 ? `¥${total.toLocaleString()}` : "";
  if (total === 0) {
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI*2); ctx.fillStyle="#eee"; ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2); ctx.fillStyle="#fff"; ctx.fill();
    ctx.fillStyle="#aaa"; ctx.font="13px sans-serif"; ctx.textAlign="center";
    ctx.fillText("データなし", cx, cy+5);
    return;
  }
  let angle = -Math.PI / 2;
  data.forEach((d, i) => {
    const slice = (d.amount / total) * Math.PI * 2;
    ctx.beginPath(); ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, R, angle, angle + slice); ctx.closePath();
    ctx.fillStyle = d.color || CHART_COLORS[i % CHART_COLORS.length]; ctx.fill();
    angle += slice;
  });
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2); ctx.fillStyle="#fff"; ctx.fill();
}

function renderLegend(data) {
  const el = document.getElementById("mainLegend");
  el.innerHTML = "";
  const total = data.reduce((s, d) => s + d.amount, 0);
  data.forEach((d, i) => {
    const pct   = total > 0 ? Math.round(d.amount / total * 100) : 0;
    const color = d.color || CHART_COLORS[i % CHART_COLORS.length];
    const li    = document.createElement("li");
    li.className = "legend-item";
    li.innerHTML =
      `<span class="legend-dot" style="background:${color}"></span>` +
      `<span class="legend-name">${d.name}</span>` +
      `<span class="legend-pct">${pct}%</span>` +
      `<span class="legend-amount">¥${d.amount.toLocaleString()}</span>`;
    el.appendChild(li);
  });
}

function renderGraphByType(type, month) {
  const data = aggregateByCategory(type, month);
  drawPieChart("mainChart", data, "mainChartTotal");
  renderLegend(data);
}

export function renderGraph(monthSelector) {
  const month = monthSelector.value;
  document.getElementById("graphMonthSelector").value = month;
  const forSummary = filterByPeriod(month);
  let income = 0, expense = 0;
  forSummary.forEach(r => r.type === "income" ? income += r.amount : expense += r.amount);
  document.getElementById("incomeTotal").textContent  = income.toLocaleString();
  document.getElementById("expenseTotal").textContent = expense.toLocaleString();
  const bal   = income - expense;
  const balEl = document.getElementById("balance");
  balEl.textContent = bal.toLocaleString();
  balEl.style.color = bal >= 0 ? "var(--theme)" : "#c62828";

  const activeBtn = document.querySelector("#graphToggle .graph-toggle-btn.active");
  const type = activeBtn ? activeBtn.dataset.value : "expense";
  renderGraphByType(type, month);
}

export function initGraphEvents(monthSelector) {
  document.getElementById("graphMonthSelector").addEventListener("change", () => renderGraph(monthSelector));
  document.getElementById("graphToggle").addEventListener("click", e => {
    const btn = e.target.closest(".graph-toggle-btn");
    if (!btn) return;
    document.querySelectorAll("#graphToggle .graph-toggle-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    renderGraphByType(btn.dataset.value, monthSelector.value);
  });
}
