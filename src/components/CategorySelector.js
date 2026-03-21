/**
 * components/CategorySelector.js
 * 追加・編集モーダル内の2段階カテゴリ選択UI
 */

import { PARENT_CATEGORIES } from "../constants/categories.js";
import { childCategories } from "../store.js";

/** 大分類セレクト更新 */
export function updateParentSelect(selectEl, type, currentParentId) {
  selectEl.innerHTML = "";
  const filtered = PARENT_CATEGORIES.filter(p => {
    // unclassified・otherは選択肢に出さない
    if (p.id === "unclassified" || p.id === "other") return false;
    return p.type === type || (p.type === "both" && type !== "income");
  });
  filtered.forEach(p => {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = p.name;  // アイコンなし
    if (p.id === currentParentId) opt.selected = true;
    selectEl.appendChild(opt);
  });
}

/** 小分類セレクト更新 */
export function updateChildSelect(childSelectEl, parentId, currentChildName) {
  childSelectEl.innerHTML = "";
  const children = childCategories[parentId] || [];
  if (children.length === 0) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "（小分類なし）";
    childSelectEl.appendChild(opt);
    return;
  }
  children.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c.name;
    opt.textContent = c.name;
    if (c.name === currentChildName) opt.selected = true;
    childSelectEl.appendChild(opt);
  });
}

/** 追加モーダル・編集モーダルのchange連動を初期化 */
export function initCategorySelectors() {
  document.getElementById("addParentCat").addEventListener("change", function() {
    updateChildSelect(document.getElementById("addChildCat"), this.value, "");
  });
  document.getElementById("editParentCat").addEventListener("change", function() {
    updateChildSelect(document.getElementById("editChildCat"), this.value, "");
  });
}
