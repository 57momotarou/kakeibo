/**
 * features/scanner/Receipt.js
 * Gemini APIを使ったレシート画像読み取り
 */

import { records, saveRecords, childCategories, getGeminiApiKey } from "../../store.js";
import { getAllChildNames, makeCategoryFieldFromChildName, parseCategoryField, getParentName } from "../../utils/category.js";
import { PARENT_CATEGORIES } from "../../constants/categories.js";
import { showToast } from "../../components/Modal.js";
import { updateParentSelect, updateChildSelect } from "../../components/CategorySelector.js";
import { buildReceiptPrompt, RECEIPT_RESPONSE_SCHEMA, normalizeReceipt, formatTaxBreakdown, updateTaxDetails } from "./ReceiptData.js";

function itemCategoryField(item) {
  const category = item.category || "未分類";
  let field = category.includes("/") || PARENT_CATEGORIES.some(p => p.id === category)
    ? category : makeCategoryFieldFromChildName(category, childCategories);
  const { parentId } = parseCategoryField(field, childCategories);
  const parent = PARENT_CATEGORIES.find(p => p.id === parentId);
  if (item.isIncome && parent?.type === "expense") field = "income/その他入金";
  if (!item.isIncome && parent?.type === "income") field = "unclassified/未分類";
  return field;
}

// ===================================
// レシート読み取りイベント初期化
// ===================================
export function initScannerEvents(onAdded) {
  const receiptInput = document.getElementById("receiptInput");
  const scanOverlay  = document.getElementById("scanOverlay");

  receiptInput.addEventListener("change", async e => {
    const file = e.target.files[0];
    if (!file) return;
    receiptInput.value = "";

    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      alert("Gemini APIキーが設定されていません。\n設定 → Gemini APIキー から登録してください。");
      return;
    }

    scanOverlay.classList.remove("hidden");
    try {
      const base64   = await fileToBase64(file);
      const mimeType = file.type || "image/jpeg";
      const parsed   = await callGeminiReceiptAPI(base64, mimeType, apiKey);

      if (!parsed || parsed.items.length === 0) {
        alert("商品を読み取れませんでした。手動で入力してください。");
        return;
      }
      showItemSelector(parsed.items, parsed.discounts, parsed.date, parsed.category, onAdded, parsed);
    } catch (err) {
      console.error(err);
      alert("読み取りエラー:\n" + err.message);
    } finally {
      scanOverlay.classList.add("hidden");
    }
  });
}

// ===================================
// 画像ファイルからの読み取りイベント初期化
// ===================================
export function initImageScannerEvents(onAdded) {
  const imageInput  = document.getElementById("imageInput");
  const scanOverlay = document.getElementById("scanOverlay");

  imageInput.addEventListener("change", async e => {
    const file = e.target.files[0];
    if (!file) return;
    imageInput.value = "";

    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      alert("Gemini APIキーが設定されていません。\n設定 → Gemini APIキー から登録してください。");
      return;
    }

    scanOverlay.classList.remove("hidden");
    try {
      const base64   = await fileToBase64(file);
      const mimeType = file.type || "image/jpeg";
      const parsed   = await callGeminiImageAPI(base64, mimeType, apiKey);

      if (!parsed || parsed.items.length === 0) {
        alert("収支情報を読み取れませんでした。手動で入力してください。");
        return;
      }
      showItemSelector(parsed.items, parsed.discounts, parsed.date, parsed.category, onAdded, parsed);
    } catch (err) {
      console.error(err);
      alert("読み取りエラー:\n" + err.message);
    } finally {
      scanOverlay.classList.add("hidden");
    }
  });
}

// ===================================
// ファイル→Base64変換
// ===================================
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ===================================
// Gemini API呼び出し
// ===================================
async function callGeminiReceiptAPI(base64Image, mimeType, apiKey) {
  return callGeminiImageAPI(base64Image, mimeType, apiKey, false);
}

// カメラ・ギャラリーで同じ転記ルールと税計算を使う。
async function callGeminiImageAPI(base64Image, mimeType, apiKey, fromGallery = true) {
  const prompt = buildReceiptPrompt(getAllChildNames(childCategories), fromGallery);
  const res = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + encodeURIComponent(apiKey),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: mimeType, data: base64Image } }] }],
        generationConfig: {
          temperature: 0,
          responseMimeType: "application/json",
          responseSchema: RECEIPT_RESPONSE_SCHEMA,
        },
      }),
    }
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error("Gemini API error: " + (body?.error?.message || res.status));
  }
  const data = await res.json();
  const text = (data.candidates?.[0]?.content?.parts || [])
    .filter(part => !part.thought && typeof part.text === "string")
    .map(part => part.text).join("").replace(/```(?:json)?\s*/gi, "").trim();
  if (!text) throw new Error("解析結果が空でした。文字がはっきり見える画像を選び直してください。");
  let parsed;
  try { parsed = JSON.parse(text); }
  catch { throw new Error("解析結果を読み取れませんでした。もう一度読み取ってください。"); }
  return normalizeReceipt(parsed, localStorage.getItem("receiptTaxMode") || "inclusive");
}

// ===================================
// 品目選択シート
// ===================================
function showItemSelector(items, discounts, date, defaultCategory, onAdded, receipt = {}) {
  const existing = document.getElementById("itemSelectorOverlay");
  if (existing) existing.remove();

  // 支出品目 + 消費税品目 + 割引（収入）を1つの配列で管理
  const itemData = [
    ...items.map(item => ({
      title:        item.title,
      amount:       item.amount,
      itemDiscount: item.itemDiscount || 0,
      category:     item.category || defaultCategory,
      isIncome:     !!item.isIncome,
      isTax:        false,
      taxDetails:   item.taxDetails || null,
    })),
    ...(discounts || []).filter(d => d.isTax).map(d => ({
      title:        d.title,
      amount:       d.amount,
      itemDiscount: 0,
      category:     d.category || "税・社会保障",
      isIncome:     false,
      isTax:        true,
      taxRate:      d.taxRate,
    })),
    ...(discounts || []).filter(d => !d.isTax).map(d => ({
      title:        d.title,
      amount:       d.amount,
      itemDiscount: 0,
      category:     "その他入金",
      isIncome:     true,
      isTax:        false,
    })),
  ];

  const overlay = document.createElement("div");
  overlay.id = "itemSelectorOverlay";
  overlay.className = "receipt-sheet-overlay";

  const sheet = document.createElement("div");
  sheet.className = "receipt-sheet";
  sheet.setAttribute("role", "dialog");
  sheet.setAttribute("aria-modal", "true");
  sheet.setAttribute("aria-label", "レシートの品目一覧");

  const header = document.createElement("div");
  header.style.cssText = "display:flex;align-items:center;justify-content:space-between;padding:16px 20px 12px;border-bottom:1px solid #e0e0e0;background:#fff;border-radius:20px 20px 0 0;flex-shrink:0;";
  header.innerHTML =
    '<div style="width:32px;"></div>'
    + '<span style="font-size:16px;font-weight:bold;">レシートの品目一覧</span>'
    + '<button id="closeItemSelector" style="width:32px;height:32px;border-radius:50%;border:none;background:#f0f0f0;font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;">✕</button>';
  sheet.appendChild(header);

  const listWrap = document.createElement("div");
  listWrap.style.cssText = "overflow-y:auto;flex:1;min-height:0;overscroll-behavior:contain;";

  const totalRow = document.createElement("div");
  totalRow.style.cssText = "display:flex;justify-content:space-between;align-items:center;padding:10px 20px;background:#fff;border-bottom:1px solid #e8e8e8;font-size:13px;color:#666;";
  totalRow.innerHTML = '<span>合計金額</span><span id="selectedTotal" style="font-weight:bold;color:#222;">¥0</span>';
  listWrap.appendChild(totalRow);

  const dateRow = document.createElement("label");
  dateRow.className = "receipt-date-row";
  dateRow.textContent = "購入・取引日";
  const dateInput = document.createElement("input");
  dateInput.type = "date";
  dateInput.value = date;
  dateInput.id = "receiptDate";
  dateRow.appendChild(dateInput);
  listWrap.appendChild(dateRow);

  const reviewNote = document.createElement("p");
  reviewNote.className = "receipt-review-note";
  reviewNote.setAttribute("role", "status");
  listWrap.appendChild(reviewNote);

  const ul = document.createElement("ul");
  ul.style.cssText = "list-style:none;padding:0;margin:0;";
  const liEls = [];

  function buildItemRow(idx) {
    const item = itemData[idx];
    const li = document.createElement("li");
    li.style.cssText = "display:flex;align-items:center;gap:12px;padding:13px 20px;background:#fff;border-bottom:1px solid #f0f0f0;cursor:pointer;";

    const label = document.createElement("div");
    label.style.cssText = "flex:1;min-width:0;";

    const title = document.createElement("div");
    title.style.cssText = "font-size:14px;font-weight:bold;color:#222;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;";
    title.textContent = item.title;
    if (item.isTax || item.isIncome) {
      const badge = document.createElement("span");
      badge.className = "receipt-item-badge";
      badge.textContent = item.isTax ? "消費税" : "収入";
      title.appendChild(badge);
    }
    label.appendChild(title);
    const catField2 = itemCategoryField(item);
    const { parentId: catParentId, childName: catChildName } = parseCategoryField(catField2, childCategories);
    const category = document.createElement("div");
    category.style.cssText = "font-size:12px;color:#999;margin-top:2px;";
    category.textContent = catChildName ? getParentName(catParentId) + " › " + catChildName : getParentName(catParentId);
    if (!item.isIncome && item.itemDiscount > 0) category.textContent += "（値引 -¥" + item.itemDiscount.toLocaleString() + " 適用済）";
    label.appendChild(category);
    const taxNote = document.createElement("div");
    taxNote.className = "receipt-tax-note";
    taxNote.textContent = formatTaxBreakdown(item.taxDetails);
    if (taxNote.textContent) label.appendChild(taxNote);

    const amountColor  = item.isIncome ? "var(--theme,#4caf50)" : "#c62828";
    const amountPrefix = item.isIncome ? "+" : "";
    const amountSpan = document.createElement("span");
    amountSpan.style.cssText = "font-size:15px;font-weight:bold;color:" + amountColor + ";white-space:nowrap;flex-shrink:0;";
    amountSpan.textContent = amountPrefix + "¥" + item.amount.toLocaleString();

    // 行全体タップで編集モーダルを開く
    li.addEventListener("click", () => showItemEditModal(idx, itemData, {
      onSaved: () => {
        renderItems();
        updateTotal();
      },
      onDeleted: () => {
        itemData.splice(idx, 1);
        renderItems();
        updateTotal();
      },
    }));
    li.addEventListener("touchstart", () => { li.style.background = "#f5f5f5"; }, { passive: true });
    li.addEventListener("touchend",   () => { li.style.background = "#fff"; },     { passive: true });

    li.appendChild(label);
    li.appendChild(amountSpan);
    return li;
  }

  function renderItems() {
    ul.replaceChildren();
    liEls.length = 0;
    itemData.forEach((item, idx) => {
      const li = buildItemRow(idx);
      liEls.push(li);
      ul.appendChild(li);
    });
  }
  renderItems();

  listWrap.appendChild(ul);
  sheet.appendChild(listWrap);

  function updateTotal() {
    let expense = 0, income = 0;
    itemData.forEach(item => {
      if (item.isIncome) income += item.amount;
      else               expense += item.amount;
    });
    const net = expense - income;
    const messages = [...(receipt.warnings || [])];
    if (receipt.total !== null && Number.isSafeInteger(receipt.total) && net !== receipt.total) {
      const difference = net - receipt.total;
      messages.unshift("レシート合計 ¥" + receipt.total.toLocaleString() + " と " + (difference > 0 ? "+" : "") + difference.toLocaleString() + "円の差があります。品目・税・値引きを確認してください。");
    }
    reviewNote.textContent = messages.join("\n");
    reviewNote.hidden = messages.length === 0;
    const totalEl = sheet.querySelector("#selectedTotal");
    if (totalEl) {
      totalEl.textContent = "¥" + net.toLocaleString() + "（" + itemData.length + "点）";
      totalEl.style.color = net < 0 ? "var(--theme,#4caf50)" : "#222";
    }
  }

  const saveBtn = document.createElement("button");
  saveBtn.style.cssText = "width:calc(100% - 32px);margin:12px 16px 16px;height:50px;background:var(--theme,#4caf50);color:#fff;border:none;border-radius:12px;font-size:16px;font-weight:bold;cursor:pointer;flex-shrink:0;";
  saveBtn.textContent = "保存する";
  sheet.appendChild(saveBtn);

  saveBtn.addEventListener("click", () => {
    if (itemData.length === 0) { alert("品目がありません"); return; }
    if (!dateInput.value) { alert("日付を入力してください"); return; }
    const savedDate = dateInput.value;
    itemData.forEach(item => {
      if (item.isIncome) {
        records.push({
          date: savedDate,
          amount:   item.amount,
          type:     "income",
          category: itemCategoryField(item),
          title:    item.title,
        });
      } else {
        const catField = itemCategoryField(item);
        records.push({ date: savedDate, amount: item.amount, type: "expense", category: catField, title: item.title, ...(item.taxDetails ? { taxDetails: item.taxDetails } : {}) });
      }
    });
    saveRecords();
    overlay.remove();
    const savedExpense = itemData.filter(i => !i.isIncome).length;
    const savedIncome  = itemData.filter(i =>  i.isIncome).length;
    const msg = savedIncome > 0
      ? savedExpense + "件の支出・" + savedIncome + "件の収入を追加しました"
      : savedExpense + "件を追加しました";
    showToast(msg);
    onAdded();
  });

  header.querySelector("#closeItemSelector").addEventListener("click", () => overlay.remove());
  overlay.addEventListener("click", e => { if (e.target === overlay) overlay.remove(); });
  overlay.appendChild(sheet);
  document.body.appendChild(overlay);
  updateTotal();
}

// ===================================
// 品目編集モーダル
// ===================================
function showItemEditModal(idx, itemData, { onSaved, onDeleted }) {
  const item = itemData[idx];

  const existing = document.getElementById("itemEditModalOverlay");
  if (existing) existing.remove();

  const overlay = document.createElement("div");
  overlay.id = "itemEditModalOverlay";
  overlay.className = "receipt-sheet-overlay receipt-edit-overlay";

  const modal = document.createElement("div");
  modal.className = "receipt-item-editor";
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-label", "品目を編集");

  const catField = itemCategoryField(item);
  const { parentId: currentParentId, childName: currentChildName } = parseCategoryField(catField, childCategories);
  const currentType = item.isIncome ? "income" : "expense";

  modal.innerHTML =
    '<div class="edit-modal-header" style="border-radius:20px 20px 0 0;border-bottom:1px solid #eee;">'
    + '<button id="deleteItemBtn" class="modal-delete-btn">🗑️ 削除</button>'
    + '<span class="modal-title">品目を編集</span>'
    + '<button id="closeItemEdit" class="modal-close">✕</button>'
    + '</div>'
    + '<div class="modal-body">'
    + '<label class="field-label">商品名</label>'
    + '<input id="editItemTitle" type="text">'
    + '<label class="field-label">金額（円）</label>'
    + '<input id="editItemAmount" type="number" min="0" step="1">'
    + '<p id="editItemTaxBreakdown" class="receipt-tax-note"></p>'
    + '<label class="field-label">カテゴリ</label>'
    + '<div class="category-selector"><div class="cat-select-row">'
    + '<select id="editItemParentCat" class="cat-select-parent"></select>'
    + '<select id="editItemChildCat"  class="cat-select-child"></select>'
    + '</div></div>'
    + '<button id="saveItemEdit" class="btn-primary">保存する</button>'
    + '</div>';

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  modal.querySelector("#editItemTitle").value = item.title;
  modal.querySelector("#editItemAmount").value = item.amount;
  const taxNote = modal.querySelector("#editItemTaxBreakdown");
  const updateNote = () => {
    const input = modal.querySelector("#editItemAmount");
    taxNote.textContent = input.value === "" ? "" : formatTaxBreakdown(updateTaxDetails(item.taxDetails, Number(input.value), item.isIncome));
    taxNote.hidden = !taxNote.textContent;
  };
  modal.querySelector("#editItemAmount").addEventListener("input", updateNote);
  updateNote();

  const parentSel = modal.querySelector("#editItemParentCat");
  const childSel  = modal.querySelector("#editItemChildCat");
  updateParentSelect(parentSel, currentType, currentParentId);
  updateChildSelect(childSel, currentParentId, currentChildName);

  parentSel.addEventListener("change", () => {
    updateChildSelect(childSel, parentSel.value, "");
  });

  modal.querySelector("#closeItemEdit").addEventListener("click", () => overlay.remove());
  overlay.addEventListener("click", e => { if (e.target === overlay) overlay.remove(); });

  modal.querySelector("#deleteItemBtn").addEventListener("click", () => {
    overlay.remove();
    onDeleted();
  });

  modal.querySelector("#saveItemEdit").addEventListener("click", () => {
    const newTitle     = modal.querySelector("#editItemTitle").value.trim();
    const newAmount    = Number(modal.querySelector("#editItemAmount").value);
    const newParentId  = parentSel.value;
    const newChildName = childSel.value;

    if (!newTitle)                          { alert("商品名を入力してください"); return; }
    if (modal.querySelector("#editItemAmount").value === "" || !Number.isSafeInteger(newAmount) || newAmount < 0) { alert("正しい金額を入力してください"); return; }

    itemData[idx].title    = newTitle;
    itemData[idx].amount   = newAmount;
    itemData[idx].category = newChildName || newParentId;

    const parent = PARENT_CATEGORIES.find(p => p.id === newParentId);
    if (parent) itemData[idx].isIncome = (parent.type === "income");

    itemData[idx].taxDetails = updateTaxDetails(item.taxDetails, newAmount, itemData[idx].isIncome);
    overlay.remove();
    onSaved();
  });
}
