/**
 * store.js
 * アプリ全体の状態（State）と永続化（localStorage）を一元管理する
 */

import { DEFAULT_CHILD_CATEGORIES } from "./constants/categories.js";

function readJsonStorage(key, fallback) {
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch (err) {
    console.warn(`Invalid localStorage JSON: ${key}`, err);
    return fallback;
  }
}

// ===================================
// 小分類の初期化（localStorageから読み込み、なければデフォルト）
// ===================================
// カテゴリ定義を変更したら必ずバージョンを上げる
const CATEGORY_VERSION = "2";

function loadChildCategories() {
  const saved        = localStorage.getItem("childCategories");
  const savedVersion = localStorage.getItem("categoryVersion");
  const obj          = saved ? readJsonStorage("childCategories", {}) : {};

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
export let records        = readJsonStorage("records", []);
export let periodStartDay = Number(localStorage.getItem("periodStartDay"))  || 1;
export let themeColor     = localStorage.getItem("themeColor")              || "#4caf50";
export let budgets        = readJsonStorage("budgets", {});
export let payrollSlips   = readJsonStorage("payrollSlips", []);
// 初回起動時は「財布」をデフォルト口座として追加
function loadAccounts() {
  const saved = localStorage.getItem("accounts");
  if (saved) {
    const parsed = readJsonStorage("accounts", null);
    if (Array.isArray(parsed)) return parsed;
  }
  const defaults = [{ id: 1, name: "財布", balance: 0, memo: "" }];
  localStorage.setItem("accounts", JSON.stringify(defaults));
  return defaults;
}
export let accounts = loadAccounts();
export let childCategories = loadChildCategories();

// タブ表示設定
// 給与明細は初期状態ではOFF。使いたい人だけ「表示 / 非表示」から有効化する。
const DEFAULT_TAB_VISIBILITY = { calendar: false, account: true, payroll: false };
function loadTabVisibility() {
  const saved = readJsonStorage("tabVisibility", {});
  return { ...DEFAULT_TAB_VISIBILITY, ...(saved && typeof saved === "object" ? saved : {}) };
}
export let tabVisibility = loadTabVisibility();

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

export function savePayrollSlips() {
  localStorage.setItem("payrollSlips", JSON.stringify(payrollSlips));
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

export function setPayrollSlips(newSlips) {
  payrollSlips = newSlips;
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
