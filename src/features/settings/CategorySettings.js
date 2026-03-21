/**
 * features/settings/CategorySettings.js
 * カテゴリ設定（大分類一覧・小分類の追加・編集・削除）
 */

import { PARENT_CATEGORIES } from "../../constants/categories.js";
import {
  childCategories, saveChildCategories,
  records, saveRecords,
} from "../../store.js";
import { makeCategoryField } from "../../utils/category.js";
import {
  navigate, currentCategoryParentId, setCurrentCategoryParentId,
} from "../../components/Navigation.js";

// ===================================
// 大分類一覧
// ===================================
export function renderCategoryView() {
  const ul = document.getElementById("parentCategoryList");
  ul.innerHTML = "";
  PARENT_CATEGORIES.forEach(parent => {
    const childCount = (childCategories[parent.id] || []).length;
    const li = document.createElement("li");
    li.className = "parent-category-item";

    // アイコン（円形背景）
    const iconEl = buildParentIconEl(parent);

    const nameEl = document.createElement("span");
    nameEl.className = "parent-cat-name";
    nameEl.textContent = parent.name;

    // 未分類は個数と矢印を表示しない・タップ無効
    if (parent.id === "unclassified") {
      li.appendChild(iconEl);
      li.appendChild(nameEl);
      li.style.cursor = "default";
      ul.appendChild(li);
      return;
    }

    const countEl = document.createElement("span");
    countEl.className = "parent-cat-count";
    countEl.textContent = `${childCount}個`;

    const arrowEl = document.createElement("span");
    arrowEl.className = "parent-cat-arrow";
    arrowEl.textContent = "›";

    li.appendChild(iconEl);
    li.appendChild(nameEl);
    li.appendChild(countEl);
    li.appendChild(arrowEl);

    li.addEventListener("click", () => {
      setCurrentCategoryParentId(parent.id);
      navigate("categoryDetail");
    });
    ul.appendChild(li);
  });
}

// 大分類アイコン要素を生成
function buildParentIconEl(parent) {
  const el = document.createElement("span");
  el.className = "parent-cat-icon";
  if (parent.color) {
    el.style.background = parent.color;
    el.textContent = parent.icon;
  } else {
    el.classList.add("parent-cat-icon--outline");
    el.textContent = parent.icon;
  }
  return el;
}

// ===================================
// 小分類一覧
// ===================================
export function renderCategoryDetailView() {
  const pid = currentCategoryParentId;
  if (!pid) return;
  if (!childCategories[pid]) childCategories[pid] = [];

  // 現在の大分類情報を取得（アイコン・色）
  const parent = PARENT_CATEGORIES.find(p => p.id === pid);

  const ul = document.getElementById("childCategoryList");
  ul.innerHTML = "";

  // ヘッダー行
  const headerLi = document.createElement("li");
  headerLi.className = "child-cat-section-header";
  headerLi.innerHTML = `
    <span class="child-cat-section-title">小分類</span>
    <button class="child-cat-add-btn" id="addChildCatBtn">＋</button>
  `;
  ul.appendChild(headerLi);

  const children = childCategories[pid] || [];

  if (children.length === 0) {
    const emptyLi = document.createElement("li");
    emptyLi.className = "child-cat-empty";
    emptyLi.textContent = "小分類がありません。＋から追加してください。";
    ul.appendChild(emptyLi);
  }

  children.forEach((child, idx) => {
    const li = document.createElement("li");
    li.className = "child-category-item";

    // 小分類アイコン（親の色・アイコンを継承。「未分類」は?アイコン）
    const childIconEl = document.createElement("span");
    childIconEl.className = "child-cat-icon";
    if (child.name === "未分類") {
      // 未分類：親の色背景 + ?
      if (parent?.color) {
        childIconEl.style.background = parent.color;
      } else {
        childIconEl.classList.add("child-cat-icon--outline");
      }
      childIconEl.textContent = "?";
    } else if (parent?.color) {
      childIconEl.style.background = parent.color;
      childIconEl.textContent = parent.icon;
    } else {
      childIconEl.classList.add("child-cat-icon--outline");
      childIconEl.textContent = parent?.icon || "?";
    }

    const nameSpan = document.createElement("span");
    nameSpan.className = "child-cat-name";
    nameSpan.textContent = child.name;

    const delBtn = document.createElement("button");
    delBtn.className = "child-cat-del-btn";
    delBtn.textContent = "削除";

    // 名前タップ → インライン編集
    nameSpan.addEventListener("click", () => {
      const input = document.createElement("input");
      input.type  = "text";
      input.value = child.name;
      input.className = "child-cat-edit-input";
      const save = () => {
        const newName = input.value.trim();
        if (!newName) { renderCategoryDetailView(); return; }
        const oldField = makeCategoryField(pid, child.name);
        const newField = makeCategoryField(pid, newName);
        records.forEach(r => { if (r.category === oldField) r.category = newField; });
        child.name = newName;
        saveChildCategories();
        saveRecords();
        renderCategoryDetailView();
      };
      input.addEventListener("blur",    save);
      input.addEventListener("keydown", e => { if (e.key === "Enter") save(); });
      li.replaceChild(input, nameSpan);
      input.focus();
    });

    // 削除ボタン
    delBtn.addEventListener("click", () => {
      const usedCount = records.filter(r => {
        const parts = r.category?.split("/");
        return parts?.[0] === pid && parts?.[1] === child.name;
      }).length;
      if (usedCount > 0 && !confirm(`「${child.name}」は${usedCount}件の記録で使用中です。削除しますか？`)) return;
      childCategories[pid].splice(idx, 1);
      saveChildCategories();
      renderCategoryDetailView();
    });

    li.appendChild(childIconEl);
    li.appendChild(nameSpan);
    li.appendChild(delBtn);
    ul.appendChild(li);
  });

  // ＋ボタン
  document.getElementById("addChildCatBtn").addEventListener("click", () => {
    showAddChildDialog(pid);
  });
}

// ===================================
// 小分類追加ダイアログ
// ===================================
function showAddChildDialog(pid) {
  const existing = document.getElementById("addChildDialogOverlay");
  if (existing) existing.remove();

  const overlay = document.createElement("div");
  overlay.id = "addChildDialogOverlay";
  overlay.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:400;display:flex;align-items:center;justify-content:center;padding:20px;`;

  const dialog = document.createElement("div");
  dialog.style.cssText = `background:#fff;border-radius:16px;padding:24px 20px;width:100%;max-width:360px;`;
  dialog.innerHTML = `
    <p style="font-size:16px;font-weight:bold;margin:0 0 14px;text-align:center;">小分類を追加</p>
    <input type="text" id="newChildCatInput" placeholder="小分類名を入力"
      style="width:100%;height:44px;font-size:16px;padding:8px 12px;border:1px solid #ddd;border-radius:8px;box-sizing:border-box;">
    <div style="display:flex;gap:10px;margin-top:14px;">
      <button id="cancelChildCat" style="flex:1;height:44px;border:1.5px solid #ddd;border-radius:10px;background:#fff;font-size:15px;cursor:pointer;">キャンセル</button>
      <button id="confirmChildCat" style="flex:1;height:44px;border:none;border-radius:10px;background:var(--theme,#4caf50);color:#fff;font-size:15px;font-weight:bold;cursor:pointer;">追加</button>
    </div>
  `;
  overlay.appendChild(dialog);
  document.body.appendChild(overlay);

  const input = dialog.querySelector("#newChildCatInput");
  input.focus();

  const confirm_ = () => {
    const name = input.value.trim();
    if (!name) { alert("名前を入力してください"); return; }
    if (!childCategories[pid]) childCategories[pid] = [];
    if (childCategories[pid].some(c => c.name === name)) {
      alert("同じ名前の小分類が既にあります"); return;
    }
    childCategories[pid].push({ name });
    saveChildCategories();
    overlay.remove();
    renderCategoryDetailView();
  };

  dialog.querySelector("#cancelChildCat").addEventListener("click", () => overlay.remove());
  dialog.querySelector("#confirmChildCat").addEventListener("click", confirm_);
  input.addEventListener("keydown", e => { if (e.key === "Enter") confirm_(); });
  overlay.addEventListener("click", e => { if (e.target === overlay) overlay.remove(); });
}
