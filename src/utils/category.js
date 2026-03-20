/**
 * utils/category.js
 * カテゴリのパース・生成・表示名に関するユーティリティ
 * ※ childCategories は store から渡して使う（直接importしない）
 */

import { PARENT_CATEGORIES } from "../constants/categories.js";

/**
 * 大分類IDから名前を取得
 */
export function getParentName(parentId) {
  const p = PARENT_CATEGORIES.find(p => p.id === parentId);
  return p ? p.name : parentId;
}

/**
 * "parentId/childName" 形式の文字列をパース
 * 旧形式（文字列のみ）との互換性あり
 */
export function parseCategoryField(cat, childCategories) {
  if (!cat) return { parentId: "unclassified", childName: "" };
  if (cat.includes("/")) {
    const [parentId, ...rest] = cat.split("/");
    return { parentId, childName: rest.join("/") };
  }
  // 旧形式：小分類名から大分類を推測
  for (const [pid, arr] of Object.entries(childCategories)) {
    if (arr.some(c => c.name === cat)) return { parentId: pid, childName: cat };
  }
  return { parentId: "unclassified", childName: cat };
}

/**
 * "parentId/childName" 形式の文字列を生成
 */
export function makeCategoryField(parentId, childName) {
  return childName ? `${parentId}/${childName}` : parentId;
}

/**
 * 小分類名から "parentId/childName" を生成（childCategoriesを検索）
 */
export function makeCategoryFieldFromChildName(childName, childCategories) {
  for (const [pid, arr] of Object.entries(childCategories)) {
    if (arr.some(c => c.name === childName)) return `${pid}/${childName}`;
  }
  return `unclassified/${childName}`;
}

/**
 * 表示用カテゴリ名（小分類があれば小分類名、なければ大分類名）
 */
export function displayCategory(cat, childCategories) {
  const { parentId, childName } = parseCategoryField(cat, childCategories);
  if (childName) return childName;
  return getParentName(parentId);
}

/**
 * 全小分類名リストをフラット化
 */
export function getAllChildNames(childCategories) {
  const names = new Set();
  Object.values(childCategories).forEach(arr => arr.forEach(c => names.add(c.name)));
  return [...names];
}
