/**
 * features/graph/GraphView.js
 * グラフ画面（円グラフ・大分類凡例・中項目展開）
 */

import { records, childCategories } from "../../store.js";
import { getPeriodRange } from "../../utils/calendar.js";
import { parseCategoryField } from "../../utils/category.js";
import { CHART_COLORS, PARENT_CATEGORIES } from "../../constants/categories.js";

// 中項目表示状態
let showSubItems = false;

function filterByPeriod(yearMonth) {
  const periodStartDay = Number(localStorage.getItem("periodStartDay")) || 1;
  const { start, end } = getPeriodRange(yearMonth, periodStartDay);
  return records.filter(r => r.date >= start && r.date <= end);
}

/**
 * 大分類単位で集計し、各大分類の小分類内訳も返す
 * @returns [{parentId, name, icon, color, amount, pct, children:[{name,amount,pct}]}]
 */
function aggregateByParent(type, month) {
  const filtered = filterByPeriod(month).filter(r => r.type === type);

  // 大分類ごとに集計
  const parentMap = {}; // { parentId: { amount, children: {childName: amount} } }
  filtered.forEach(r => {
    const { parentId, childName } = parseCategoryField(r.category, childCategories);
    if (!parentMap[parentId]) parentMap[parentId] = { amount: 0, children: {} };
    parentMap[parentId].amount += r.amount;
    const cname = childName || "(未分類)";
    parentMap[parentId].children[cname] = (parentMap[parentId].children[cname] || 0) + r.amount;
  });

  const total = Object.values(parentMap).reduce((s, v) => s + v.amount, 0);

  return Object.entries(parentMap)
    .sort((a, b) => b[1].amount - a[1].amount)
    .map(([pid, val], i) => {
      const parent = PARENT_CATEGORIES.find(p => p.id === pid);
      const pct = total > 0 ? (val.amount / total * 100) : 0;
      const children = Object.entries(val.children)
        .sort((a, b) => b[1] - a[1])
        .map(([cname, camount]) => ({
          name: cname,
          amount: camount,
          pct: val.amount > 0 ? (camount / val.amount * 100) : 0,
        }));
      return {
        parentId: pid,
        name:   parent?.name  || pid,
        icon:   parent?.icon  || "?",
        color:  parent?.color || CHART_COLORS[i % CHART_COLORS.length],
        isOutline: !parent?.color, // 未分類など
        amount: val.amount,
        pct,
        children,
      };
    });
}

// ===================================
// 円グラフ描画
// ===================================
function drawPieChart(data) {
  const canvas = document.getElementById("mainChart");
  const ctx = canvas.getContext("2d");
  const cx = canvas.width / 2, cy = canvas.height / 2;
  const R = Math.min(cx, cy) - 8, r = R * 0.52;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const total = data.reduce((s, d) => s + d.amount, 0);
  const totalEl = document.getElementById("mainChartTotal");
  if (totalEl) totalEl.textContent = total > 0 ? `¥${total.toLocaleString()}` : "";

  if (total === 0) {
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI*2); ctx.fillStyle="#eee"; ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2); ctx.fillStyle="#fff"; ctx.fill();
    ctx.fillStyle="#aaa"; ctx.font="13px sans-serif"; ctx.textAlign="center";
    ctx.fillText("データなし", cx, cy+5);
    return;
  }

  // スライスに小さすぎるラベルは省略
  let angle = -Math.PI / 2;
  data.forEach(d => {
    const slice = (d.amount / total) * Math.PI * 2;
    ctx.beginPath(); ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, R, angle, angle + slice); ctx.closePath();
    ctx.fillStyle = d.color; ctx.fill();

    // ラベル（3%以上のみ）
    if (slice > 0.18) {
      const midAngle = angle + slice / 2;
      const lx = cx + (R * 0.72) * Math.cos(midAngle);
      const ly = cy + (R * 0.72) * Math.sin(midAngle);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 10px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      // 長い名前は省略
      const label = d.name.length > 5 ? d.name.slice(0, 4) + "…" : d.name;
      ctx.fillText(label, lx, ly);
    }
    angle += slice;
  });
  // 中心の穴
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2); ctx.fillStyle="#fff"; ctx.fill();
}

// ===================================
// 凡例（大分類リスト＋中項目展開）描画
// ===================================
function renderLegend(data) {
  const el = document.getElementById("mainLegend");
  el.innerHTML = "";
  const total = data.reduce((s, d) => s + d.amount, 0);

  data.forEach(d => {
    // 大分類行
    const li = document.createElement("li");
    li.className = "graph-parent-item";

    // アイコン
    const iconEl = document.createElement("span");
    iconEl.className = "graph-parent-icon";
    if (d.isOutline) {
      iconEl.classList.add("graph-parent-icon--outline");
      iconEl.textContent = "?";
    } else {
      iconEl.style.background = d.color;
      iconEl.textContent = d.icon;
    }

    const nameEl = document.createElement("span");
    nameEl.className = "graph-parent-name";
    nameEl.textContent = d.name;

    const rightEl = document.createElement("span");
    rightEl.className = "graph-parent-right";
    rightEl.innerHTML = `
      <span class="graph-parent-amount">¥${d.amount.toLocaleString()}</span>
      <span class="graph-parent-pct">${d.pct.toFixed(2)}%</span>
    `;

    const arrowEl = document.createElement("span");
    arrowEl.className = "graph-parent-arrow";
    arrowEl.textContent = "›";

    li.appendChild(iconEl);
    li.appendChild(nameEl);
    li.appendChild(rightEl);
    li.appendChild(arrowEl);
    el.appendChild(li);

    // 中項目行（showSubItemsがtrueのとき）
    if (showSubItems) {
      d.children.forEach(c => {
        const sub = document.createElement("li");
        sub.className = "graph-child-item";

        const dot = document.createElement("span");
        dot.className = "graph-child-dot";
        dot.style.background = d.color;

        const cname = document.createElement("span");
        cname.className = "graph-child-name";
        cname.textContent = c.name;

        const cright = document.createElement("span");
        cright.className = "graph-child-right";
        cright.innerHTML = `
          <span class="graph-child-amount">¥${c.amount.toLocaleString()}</span>
          <span class="graph-child-arr">›</span>
        `;

        sub.appendChild(dot);
        sub.appendChild(cname);
        sub.appendChild(cright);
        el.appendChild(sub);
      });
    }
  });
}

// ===================================
// 中項目表示トグルUI描画
// ===================================
function renderSubToggle(type, month) {
  let wrap = document.getElementById("subItemToggleWrap");
  if (!wrap) {
    wrap = document.createElement("div");
    wrap.id = "subItemToggleWrap";
    wrap.style.cssText = "display:flex;align-items:center;justify-content:flex-end;gap:8px;padding:8px 16px 0;font-size:13px;color:#666;";
    const legendEl = document.getElementById("mainLegend");
    legendEl.parentNode.insertBefore(wrap, legendEl);
  }
  wrap.innerHTML = `
    <span>中項目表示</span>
    <button id="subItemToggleBtn" style="
      padding:3px 12px;border-radius:12px;border:1.5px solid #ccc;background:${showSubItems ? "#333" : "#fff"};
      color:${showSubItems ? "#fff" : "#333"};font-size:12px;font-weight:bold;cursor:pointer;
    ">${showSubItems ? "ON" : "OFF"}</button>
  `;
  document.getElementById("subItemToggleBtn").addEventListener("click", () => {
    showSubItems = !showSubItems;
    renderGraphByType(type, month);
  });
}

// ===================================
// グラフ全体描画
// ===================================
function renderGraphByType(type, month) {
  const data = aggregateByParent(type, month);
  drawPieChart(data);
  renderSubToggle(type, month);
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
