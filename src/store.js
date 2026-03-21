/**
 * store.js
 * アプリ全体の状態（State）と永続化（localStorage）を一元管理する
 */

import { DEFAULT_CHILD_CATEGORIES } from "./constants/categories.js";

// ===================================
// State
// ===================================
export let records        = JSON.parse(localStorage.getItem("records"))     || [];
export let periodStartDay = Number(localStorage.getItem("periodStartDay"))  || 1;
export let themeColor     = localStorage.getItem("themeColor")              || "#4caf50";
export let budgets        = JSON.parse(localStorage.getItem("budgets"))     || {};
export let accounts       = JSON.parse(localStorage.getItem("accounts"))    || [];
export let childCategories = loadChildCategories();

// タブ表示設定
const DEFAULT_TAB_VISIBILITY = { calendar: false, account: true };
export let tabVisibility = JSON.parse(localStorage.getItem("tabVisibility")) || DEFAULT_TAB_VISIBILITY;

// ===================================
// 小分類の初期化（localStorageから読み込み、なければデフォルト）
// ===================================
function loadChildCategories() {
  const saved = localStorage.getItem("childCategories");
  const obj = saved ? JSON.parse(saved) : {};

  let changed = false;
  Object.keys(DEFAULT_CHILD_CATEGORIES).forEach(pid => {
    if (!obj[pid]) {
      // キー自体がない場合はデフォルトで初期化
      obj[pid] = DEFAULT_CHILD_CATEGORIES[pid].map(name => ({ name }));
      changed = true;
    } else {
      // キーはあるが、デフォルトにある小分類が不足している場合は末尾に追加
      const existingNames = obj[pid].map(c => c.name);
      DEFAULT_CHILD_CATEGORIES[pid].forEach(name => {
        if (!existingNames.includes(name)) {
          obj[pid].push({ name });
          changed = true;
        }
      });
    }
  });

  if (!saved || changed) {
    localStorage.setItem("childCategories", JSON.stringify(obj));
  }
  return obj;
}

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
