/**
 * features/settings/OtherSettings.js
 * 集計期間・表示/非表示・予算・APIキー・リセットの各設定画面
 */

import { PARENT_CATEGORIES } from "../../constants/categories.js";
import {
  records, setRecords, saveRecords,
  periodStartDay, setPeriodStartDay,
  budgets, saveBudgets,
  accounts, setAccounts, saveAccounts,
  childCategories,
  tabVisibility, saveTabVisibility,
  resetChildCategoriesToDefault,
} from "../../store.js";
import { getPeriodRange } from "../../utils/calendar.js";
import { displayCategory } from "../../utils/category.js";
import { applyTabVisibility } from "../../components/Navigation.js";
import { showToast } from "../../components/Modal.js";

// ===================================
// 集計期間設定
// ===================================
let periodListenerAdded = false;

export function renderPeriodView(monthSelector) {
  const sel = document.getElementById("periodStartDay");
  sel.innerHTML = "";
  for (let d = 1; d <= 28; d++) {
    const opt = document.createElement("option");
    opt.value = d;
    opt.textContent = `${d}日`;
    if (d === periodStartDay) opt.selected = true;
    sel.appendChild(opt);
  }
  if (!periodListenerAdded) {
    sel.addEventListener("change", e => {
      setPeriodStartDay(Number(e.target.value));
      updatePeriodPreview(monthSelector);
    });
    periodListenerAdded = true;
  }
  updatePeriodPreview(monthSelector);
}

function updatePeriodPreview(monthSelector) {
  const ym = monthSelector.value;
  const { start, end } = getPeriodRange(ym, periodStartDay);
  const s  = new Date(start + "T00:00:00");
  const e2 = new Date(end   + "T00:00:00");
  const fmt = d => `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日`;
  const mo  = Number(ym.split("-")[1]);
  const el  = document.getElementById("periodPreview");
  if (el) el.textContent = `${mo}月の集計期間：${fmt(s)} 〜 ${fmt(e2)}`;
}

// ===================================
// 表示 / 非表示設定
// ===================================
export function renderVisibilityView() {
  document.getElementById("toggleAccount").checked = !!tabVisibility.account;
}

export function initVisibilityEvents() {
  document.getElementById("toggleAccount").addEventListener("change", e => {
    tabVisibility.account = e.target.checked;
    saveTabVisibility();
    applyTabVisibility();
  });
}

// ===================================
// 予算設定
// ===================================
function getMonthlySpending(monthSelector) {
  const { start, end } = getPeriodRange(
    monthSelector.value,
    Number(localStorage.getItem("periodStartDay")) || 1
  );
  const map = {};
  records.filter(r => r.date >= start && r.date <= end && r.type === "expense").forEach(r => {
    const label = displayCategory(r.category, childCategories);
    map[label] = (map[label] || 0) + r.amount;
  });
  return map;
}

export function renderBudgetView(monthSelector) {
  const ul = document.getElementById("budgetList");
  ul.innerHTML = "";

  const expenseParents = PARENT_CATEGORIES.filter(p => p.type === "expense" || p.type === "both");
  const allExpenseChildren = [];
  expenseParents.forEach(p => {
    (childCategories[p.id] || []).forEach(c =>
      allExpenseChildren.push({ parentName: p.name, childName: c.name })
    );
  });

  if (allExpenseChildren.length === 0) {
    ul.innerHTML = '<li style="color:#aaa;font-size:14px;padding:12px 0;">支出カテゴリがありません</li>';
    return;
  }

  const spending = getMonthlySpending(monthSelector);

  allExpenseChildren.forEach(({ parentName, childName }) => {
    const budget   = budgets[childName] || 0;
    const spent    = spending[childName] || 0;
    const pct      = budget > 0 ? Math.min(spent / budget * 100, 100) : 0;
    const barClass = budget > 0 ? (spent > budget ? "over" : spent / budget >= 0.8 ? "warn" : "ok") : "ok";

    const li = document.createElement("li");
    li.className = "budget-item";
    li.innerHTML = `
      <div class="budget-item-top">
        <div>
          <span class="budget-item-parent">${parentName}</span>
          <span class="budget-item-name">${childName}</span>
        </div>
        <div class="budget-item-input-wrap">
          <span>¥</span>
          <input type="number" class="budget-input" data-cat="${childName}"
            value="${budget > 0 ? budget : ""}" placeholder="未設定">
        </div>
      </div>
      <div class="budget-bar-wrap">
        <div class="budget-bar ${barClass}" style="width:${pct}%"></div>
      </div>
      <div class="budget-bar-info">
        <span>使用中：¥${spent.toLocaleString()}</span>
        <span class="${spent > budget && budget > 0 ? "over-text" : ""}">
          ${budget > 0
            ? (spent > budget
                ? `¥${(spent - budget).toLocaleString()} オーバー`
                : `残り ¥${(budget - spent).toLocaleString()}`)
            : "予算未設定"}
        </span>
      </div>
    `;
    li.querySelector(".budget-input").addEventListener("change", function() {
      const val = Number(this.value);
      if (val > 0) budgets[childName] = val;
      else         delete budgets[childName];
      saveBudgets();
      renderBudgetView(monthSelector);
    });
    ul.appendChild(li);
  });
}

// ===================================
// Gemini APIキー設定
// ===================================
export function renderApiKeyView() {
  const input     = document.getElementById("geminiApiKeyInput");
  const statusEl  = document.getElementById("apiKeyStatus");
  const deleteBtn = document.getElementById("deleteApiKeyBtn");
  const saved     = localStorage.getItem("geminiApiKey") || "";
  input.value = saved ? "●".repeat(20) : "";
  input.dataset.hasKey = saved ? "1" : "0";
  if (saved) {
    statusEl.textContent = "✅ APIキーが保存されています";
    statusEl.className   = "api-key-status api-key-status-ok";
    deleteBtn.style.display = "";
  } else {
    statusEl.textContent = "⚠️ APIキーが未設定です。レシート読み取りを使うには設定が必要です。";
    statusEl.className   = "api-key-status api-key-status-warn";
    deleteBtn.style.display = "none";
  }
}

export function initApiKeyEvents(onKeyChanged) {
  document.getElementById("geminiApiKeyInput").addEventListener("focus", function() {
    if (this.dataset.hasKey === "1") { this.value = ""; this.dataset.hasKey = "0"; }
  });
  document.getElementById("toggleApiKeyVisible").addEventListener("click", () => {
    const input = document.getElementById("geminiApiKeyInput");
    input.type = input.type === "password" ? "text" : "password";
  });
  document.getElementById("saveApiKeyBtn").addEventListener("click", () => {
    const input = document.getElementById("geminiApiKeyInput");
    const val   = input.value.trim();
    if (!val || val === "●".repeat(20)) { alert("APIキーを入力してください"); return; }
    if (!val.startsWith("AIza") && !confirm("APIキーの形式が正しくない可能性があります。このまま保存しますか？")) return;
    localStorage.setItem("geminiApiKey", val);
    showToast("APIキーを保存しました");
    renderApiKeyView();
    onKeyChanged();
  });
  document.getElementById("deleteApiKeyBtn").addEventListener("click", () => {
    if (!confirm("保存済みのAPIキーを削除しますか？")) return;
    localStorage.removeItem("geminiApiKey");
    showToast("APIキーを削除しました");
    renderApiKeyView();
    onKeyChanged();
  });
}

// ===================================
// リセット機能
// ===================================
const RESET_IDS = ["resetTransactions", "resetAccounts", "resetBudgets", "resetCategories"];

export function renderResetView() {
  ["resetAll", ...RESET_IDS].forEach(id => {
    document.getElementById(id).checked = false;
  });
  updateResetBtn();
}

function updateResetBtn() {
  const anyOn = RESET_IDS.some(id => document.getElementById(id).checked);
  document.getElementById("execResetBtn").disabled = !anyOn;
}

export function initResetEvents(onReset) {
  document.getElementById("resetAll").addEventListener("change", function() {
    RESET_IDS.forEach(id => { document.getElementById(id).checked = this.checked; });
    updateResetBtn();
  });
  RESET_IDS.forEach(id => {
    document.getElementById(id).addEventListener("change", () => {
      const allOn = RESET_IDS.every(i => document.getElementById(i).checked);
      document.getElementById("resetAll").checked = allOn;
      updateResetBtn();
    });
  });

  document.getElementById("execResetBtn").addEventListener("click", () => {
    const doRecords    = document.getElementById("resetTransactions").checked;
    const doAccounts   = document.getElementById("resetAccounts").checked;
    const doBudgets    = document.getElementById("resetBudgets").checked;
    const doCategories = document.getElementById("resetCategories").checked;

    const targets = [];
    if (doRecords)    targets.push("出入金");
    if (doAccounts)   targets.push("口座");
    if (doBudgets)    targets.push("予算");
    if (doCategories) targets.push("カテゴリ");

    if (!confirm(`以下のデータを完全に削除します。\n\n・${targets.join("\n・")}\n\nこの操作は取り消せません。本当に実行しますか？`)) return;

    if (doRecords)    { setRecords([]); saveRecords(); }
    if (doAccounts)   { setAccounts([]); saveAccounts(); }
    if (doBudgets)    { Object.keys(budgets).forEach(k => delete budgets[k]); saveBudgets(); }
    if (doCategories) { resetChildCategoriesToDefault(); }

    showToast(`${targets.join("・")}をリセットしました`);
    renderResetView();
    onReset();
  });
}
