/**
 * store.js
 * アプリ全体の状態（State）と永続化（localStorage）を一元管理する
 */

import { DEFAULT_CHILD_CATEGORIES } from "./constants/categories.js";

// ===================================
// 小分類の初期化（localStorageから読み込み、なければデフォルト）
// ===================================
// カテゴリ定義を変更したら必ずバージョンを上げる
const CATEGORY_VERSION = "2";

function loadChildCategories() {
  const saved        = localStorage.getItem("childCategories");
  const savedVersion = localStorage.getItem("categoryVersion");
  const obj          = saved ? JSON.parse(saved) : {};

  // バージョンが変わっていたら全キーをチェックして不足分を補完
  let changed = !saved || savedVersion !== CATEGORY_VERSION;

  Object.keys(DEFAULT_CHILD_CATEGORIES).forEach(pid => {
    if (!obj[pid]) {
      obj[pid] = DEFAULT_CHILD_CATEGORIES[pid].map(name => ({ name }));
      changed = true;
    } else {
      // デフォルトにあって既存データにない小分類を末尾に追加
      const existingNames = obj[pid].map(c => c.name);
      DEFAULT_CHILD_CATEGORIES[pid].forEach(name => {
        if (!existingNames.includes(name)) {
          obj[pid].push({ name });
          changed = true;
        }
      });
    }
  });

  if (changed) {
    localStorage.setItem("childCategories", JSON.stringify(obj));
    localStorage.setItem("categoryVersion", CATEGORY_VERSION);
  }
  return obj;
}

// ===================================
// State
// ===================================
export let records        = JSON.parse(localStorage.getItem("records"))     || [];
export let periodStartDay = Number(localStorage.getItem("periodStartDay"))  || 1;
export let themeColor     = localStorage.getItem("themeColor")              || "#4caf50";
export let budgets        = JSON.parse(localStorage.getItem("budgets"))     || {};
// 初回起動時は「財布」をデフォルト口座として追加
function loadAccounts() {
  const saved = localStorage.getItem("accounts");
  if (saved) return JSON.parse(saved);
  const defaults = [{ id: 1, name: "財布", balance: 0, memo: "" }];
  localStorage.setItem("accounts", JSON.stringify(defaults));
  return defaults;
}
export let accounts = loadAccounts();
export let childCategories = loadChildCategories();

// タブ表示設定
const DEFAULT_TAB_VISIBILITY = { calendar: false, account: true };
export let tabVisibility = JSON.parse(localStorage.getItem("tabVisibility")) || DEFAULT_TAB_VISIBILITY;

// ===================================
// 保存関数
// ===================================
export function saveRecords() {
  localStorage.setItem("records", JSON.stringify(records));
}

export function saveChildCategories() {
  localStorage.setItem("childCategories", JSON.stringify(childCategories));
}

export function saveTabVisibility() {
  localStorage.setItem("tabVisibility", JSON.stringify(tabVisibility));
}

export function saveBudgets() {
  localStorage.setItem("budgets", JSON.stringify(budgets));
}

export function saveAccounts() {
  localStorage.setItem("accounts", JSON.stringify(accounts));
}

// ===================================
// State更新関数
// ===================================
export function setRecords(newRecords) {
  records = newRecords;
}

export function setPeriodStartDay(day) {
  periodStartDay = day;
  localStorage.setItem("periodStartDay", day);
}

export function setThemeColor(color) {
  themeColor = color;
  localStorage.setItem("themeColor", color);
}

export function setAccounts(newAccounts) {
  accounts = newAccounts;
}

export function resetChildCategoriesToDefault() {
  const obj = {};
  Object.keys(DEFAULT_CHILD_CATEGORIES).forEach(pid => {
    obj[pid] = DEFAULT_CHILD_CATEGORIES[pid].map(name => ({ name }));
  });
  childCategories = obj;
  saveChildCategories();
}

export function getGeminiApiKey() {
  return localStorage.getItem("geminiApiKey") || "";
}

{
  id: 1735000000000,
  yearMonth: "2026-08",       // 一覧のソート・表示用
  payDate: "2026-08-21",      // 支給年月日
  incomeItems: [{ label: "給料", amount: 234500 }, ...],      // 支給項目(可変長・全項目)
  deductionItems: [{ label: "共済長期", amount: 25620 }, ...], // 控除項目(可変長・全項目)
  incomeTotal: 349995,
  deductionTotal: 95601,
  netAmount: 254394,          // 差引支給額
  transfers: [{ bank: "北見信用金庫本店", amount: 209394 }, ...], // 振込先(任意)
}
