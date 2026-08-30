/**
 * features/home/HomeView.js
 * ホーム画面（予算進捗カード）
 * - 予算カード行タップ → 月別達成度モーダル
 */

import { records, budgets, childCategories, accounts } from "../../store.js";
import { getPeriodRange } from "../../utils/calendar.js";
import { displayCategory } from "../../utils/category.js";

// ===================================
// 月別支出を取得
// ===================================
function getSpendingForMonth(ym) {
  const periodStartDay = Number(localStorage.getItem("periodStartDay")) || 1;
  const { start, end } = getPeriodRange(ym, periodStartDay);
  const map = {};
  records.filter(r => r.date >= start && r.date <= end && r.type === "expense").forEach(r => {
    const label = displayCategory(r.category, childCategories);
    map[label] = (map[label] || 0) + r.amount;
  });
  return map;
}

function getMonthlySpending(monthSelector) {
  return getSpendingForMonth(monthSelector.value);
}

// ===================================
// ホーム画面描画
// ===================================
export function renderHome(monthSelector) {
  const card    = document.getElementById("homeBudgetCard");
  const rowsEl  = document.getElementById("homeBudgetRows");
  const monthEl = document.getElementById("homeBudgetMonth");
  if (!card || !rowsEl) return;

  const ym = monthSelector.value;
  const [y, m] = ym.split("-").map(Number);
  const periodStartDay = Number(localStorage.getItem("periodStartDay")) || 1;
  const { start, end } = getPeriodRange(ym, periodStartDay);
  const periodRecords = records.filter(r => r.date >= start && r.date <= end);
  const income = periodRecords.reduce((sum, r) => sum + (r.type === "income" ? Number(r.amount || 0) : 0), 0);
  const expense = periodRecords.reduce((sum, r) => sum + (r.type === "expense" ? Number(r.amount || 0) : 0), 0);
  const balance = income - expense;
  const accountTotal = accounts.reduce((sum, a) => sum + Number(a.balance || 0), 0);

  const periodLabel = document.getElementById("homePeriodLabel");
  const incomeEl = document.getElementById("homeIncomeTotal");
  const expenseEl = document.getElementById("homeExpenseTotal");
  const balanceEl = document.getElementById("homeBalanceTotal");
  const accountTotalEl = document.getElementById("homeAccountTotal");
  const accountCountEl = document.getElementById("homeAccountCount");

  if (periodLabel) {
    const [, sm, sd] = start.split("-").map(Number);
    const [, em, ed] = end.split("-").map(Number);
    periodLabel.textContent = `${sm}月${sd}日〜${em}月${ed}日`;
  }
  if (incomeEl) incomeEl.textContent = `¥${income.toLocaleString()}`;
  if (expenseEl) expenseEl.textContent = `¥${expense.toLocaleString()}`;
  if (balanceEl) {
    balanceEl.textContent = `${balance < 0 ? "-" : ""}¥${Math.abs(balance).toLocaleString()}`;
    balanceEl.classList.toggle("is-negative", balance < 0);
  }
  if (accountTotalEl) accountTotalEl.textContent = `${accountTotal < 0 ? "-" : ""}¥${Math.abs(accountTotal).toLocaleString()}`;
  if (accountCountEl) accountCountEl.textContent = `${accounts.length}口座`;
  if (monthEl) monthEl.textContent = `${y}年${m}月`;

  const budgetCats = Object.keys(budgets).filter(k => budgets[k] > 0);
  if (budgetCats.length === 0) {
    card.style.display = "none";
    rowsEl.innerHTML = "";
    return;
  }
  card.style.display = "";
  rowsEl.innerHTML = "";

  const spending = getMonthlySpending(monthSelector);

  budgetCats.forEach(catName => {
    const budget   = budgets[catName];
    const spent    = spending[catName] || 0;
    const pct      = Math.min(spent / budget * 100, 100);
    const over     = spent > budget;
    const warn     = !over && spent / budget >= 0.8;
    const barClass = over ? "over" : warn ? "warn" : "ok";

    const row = document.createElement("div");
    row.className = "home-budget-row";
    row.style.cursor = "pointer";
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
          ${over
            ? `¥${(spent - budget).toLocaleString()} オーバー`
            : `残り ¥${(budget - spent).toLocaleString()}`}
        </span>
        <span class="home-budget-pct">${Math.round(spent / budget * 100)}%</span>
      </div>
    `;

    // タップで月別達成度モーダルを開く
    row.addEventListener("click", () => {
      showBudgetDetailModal(catName, budget, monthSelector.value);
    });

    rowsEl.appendChild(row);
  });
}

// ===================================
// 月別達成度モーダル
// ===================================
function showBudgetDetailModal(catName, budget, currentYm) {
  const existing = document.getElementById("budgetDetailOverlay");
  if (existing) existing.remove();

  const overlay = document.createElement("div");
  overlay.id = "budgetDetailOverlay";
  overlay.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:350;display:flex;align-items:flex-end;`;

  const sheet = document.createElement("div");
  sheet.style.cssText = `background:#f5f5f5;width:100%;border-radius:20px 20px 0 0;max-height:80vh;display:flex;flex-direction:column;`;

  // ヘッダー
  const header = document.createElement("div");
  header.style.cssText = `display:flex;align-items:center;justify-content:space-between;padding:16px 20px 12px;background:#fff;border-radius:20px 20px 0 0;border-bottom:1px solid #e0e0e0;flex-shrink:0;`;
  header.innerHTML = `
    <span style="font-size:16px;font-weight:bold;">${catName} の月別達成度</span>
    <button id="closeBudgetDetail" style="width:32px;height:32px;border-radius:50%;border:none;background:#f0f0f0;font-size:14px;cursor:pointer;">✕</button>
  `;
  sheet.appendChild(header);

  // 月ナビゲーション
  const navRow = document.createElement("div");
  navRow.style.cssText = `display:flex;align-items:center;justify-content:center;gap:16px;padding:12px 20px;background:#fff;border-bottom:1px solid #e8e8e8;flex-shrink:0;`;

  // 表示する月リスト（前後6ヶ月）
  let months = [];
  const [cy, cm] = currentYm.split("-").map(Number);
  for (let i = -6; i <= 0; i++) {
    const d = new Date(cy, cm - 1 + i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`);
  }

  let selectedYm = currentYm;

  // スクロール可能な月セレクタ
  const monthScroll = document.createElement("div");
  monthScroll.style.cssText = `display:flex;gap:8px;overflow-x:auto;padding:10px 16px;background:#fff;border-bottom:1px solid #e8e8e8;flex-shrink:0;-webkit-overflow-scrolling:touch;`;

  const monthBtns = {};
  months.forEach(ym => {
    const [y, m] = ym.split("-").map(Number);
    const btn = document.createElement("button");
    btn.style.cssText = `flex-shrink:0;padding:6px 14px;border-radius:20px;border:1.5px solid #ddd;background:${ym === selectedYm ? "var(--theme,#4caf50)" : "#fff"};color:${ym === selectedYm ? "#fff" : "#333"};font-size:13px;font-weight:bold;cursor:pointer;white-space:nowrap;`;
    btn.textContent = `${y}年${m}月`;
    btn.addEventListener("click", () => {
      selectedYm = ym;
      // 全ボタンのスタイルをリセット
      Object.values(monthBtns).forEach(b => {
        b.style.background = "#fff";
        b.style.color = "#333";
        b.style.borderColor = "#ddd";
      });
      btn.style.background = "var(--theme,#4caf50)";
      btn.style.color = "#fff";
      btn.style.borderColor = "var(--theme,#4caf50)";
      renderDetail(selectedYm);
    });
    monthBtns[ym] = btn;
    monthScroll.appendChild(btn);
  });

  // 詳細エリア
  const detailArea = document.createElement("div");
  detailArea.style.cssText = `overflow-y:auto;flex:1;padding:16px;`;

  function renderDetail(ym) {
    const [y, m] = ym.split("-").map(Number);
    const sp = getSpendingForMonth(ym);
    const spent = sp[catName] || 0;
    const pct   = budget > 0 ? spent / budget * 100 : 0;
    const over  = spent > budget;
    const warn  = !over && pct >= 80;
    const barClass = over ? "#e53935" : warn ? "#ff9800" : "var(--theme,#4caf50)";

    detailArea.innerHTML = `
      <div style="background:#fff;border-radius:12px;padding:16px;margin-bottom:12px;">
        <div style="font-size:14px;color:#888;margin-bottom:8px;">${y}年${m}月</div>
        <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:10px;">
          <span style="font-size:22px;font-weight:bold;color:${over ? "#e53935" : "#222"};">¥${spent.toLocaleString()}</span>
          <span style="font-size:13px;color:#888;">/ ¥${budget.toLocaleString()}</span>
        </div>
        <!-- バー -->
        <div style="height:8px;background:#eee;border-radius:4px;overflow:hidden;margin-bottom:8px;">
          <div style="height:100%;width:${Math.min(pct,100)}%;background:${barClass};border-radius:4px;transition:width 0.4s;"></div>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:13px;">
          <span style="color:${over ? "#e53935" : "#666"};">
            ${over
              ? `¥${(spent - budget).toLocaleString()} オーバー`
              : `残り ¥${(budget - spent).toLocaleString()}`}
          </span>
          <span style="font-weight:bold;color:${over ? "#e53935" : "#333"};">${Math.round(pct)}%</span>
        </div>
      </div>

      <!-- 月別サマリー（過去6ヶ月の棒グラフ） -->
      <div style="background:#fff;border-radius:12px;padding:16px;">
        <div style="font-size:13px;font-weight:bold;color:#444;margin-bottom:12px;">過去6ヶ月の推移</div>
        ${months.map(mo => {
          const [my, mm] = mo.split("-").map(Number);
          const ms = getSpendingForMonth(mo);
          const mspent = ms[catName] || 0;
          const mpct = budget > 0 ? Math.min(mspent / budget * 100, 100) : 0;
          const mover = mspent > budget;
          const mcolor = mover ? "#e53935" : mspent / budget >= 0.8 ? "#ff9800" : "var(--theme,#4caf50)";
          const isSelected = mo === ym;
          return `
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;${isSelected ? "font-weight:bold;" : ""}">
              <span style="font-size:12px;color:#888;width:38px;flex-shrink:0;">${mm}月</span>
              <div style="flex:1;height:6px;background:#eee;border-radius:3px;overflow:hidden;">
                <div style="height:100%;width:${mpct}%;background:${mcolor};border-radius:3px;"></div>
              </div>
              <span style="font-size:12px;color:${mover ? "#e53935" : "#333"};width:72px;text-align:right;flex-shrink:0;">¥${mspent.toLocaleString()}</span>
            </div>
          `;
        }).join("")}
      </div>
    `;
  }

  sheet.appendChild(monthScroll);
  sheet.appendChild(detailArea);
  overlay.appendChild(sheet);
  document.body.appendChild(overlay);

  renderDetail(selectedYm);

  header.querySelector("#closeBudgetDetail").addEventListener("click", () => overlay.remove());
  overlay.addEventListener("click", e => { if (e.target === overlay) overlay.remove(); });

  // 選択中の月ボタンにスクロール
  setTimeout(() => {
    const selectedBtn = monthBtns[selectedYm];
    if (selectedBtn) selectedBtn.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, 50);
}
