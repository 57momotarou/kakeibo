/**
 * features/scanner/Receipt.js
 * Gemini APIを使ったレシート画像読み取り
 */

import { records, saveRecords, childCategories, getGeminiApiKey } from "../../store.js";
import { getAllChildNames, makeCategoryFieldFromChildName } from "../../utils/category.js";
import { PARENT_CATEGORIES } from "../../constants/categories.js";
import { showToast } from "../../components/Modal.js";

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
      scanOverlay.classList.add("hidden");

      if (!parsed || parsed.items.length === 0) {
        alert("商品を読み取れませんでした。手動で入力してください。");
        return;
      }
      showItemSelector(parsed.items, parsed.date, parsed.category, onAdded);
    } catch (err) {
      scanOverlay.classList.add("hidden");
      console.error(err);
      alert("読み取りエラー:\n" + err.message);
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
  const today = new Date().toISOString().slice(0, 10);
  const allChildNames = getAllChildNames(childCategories);
  const prompt = `あなたはレシート解析AIです。添付画像のレシートを読み取り、以下のJSON形式のみで回答してください。余分なテキストや\`\`\`は不要です。

{
  "date": "YYYY-MM-DD形式の購入日（不明な場合は${today}）",
  "category": "以下のカテゴリから最も適切なもの1つ：${allChildNames.join("・")}",
  "items": [
    { "title": "商品名（簡潔に）", "amount": 金額の数値（税込・円・整数） }
  ]
}

【金額の計算ルール】
- 金額は必ず「税込」の整数（円）で返すこと
- レシートに税込価格が明記されている場合 → そのまま使用
- レシートに税抜価格しか書かれていない場合 → 以下のルールで税込に換算する
  ・食料品・飲料（酒類除く）・新聞 → 軽減税率8%：税抜 × 1.08 を四捨五入
  ・上記以外（外食・日用品・衣類・家電など） → 標準税率10%：税抜 × 1.10 を四捨五入
  ・同一レシートに「※」「★」「軽」等の軽減税率マークがある場合はその商品に8%を適用
- 合計・小計・税額・ポイント・お釣り・値引き行はitemsに含めない
- 値引きがある商品は値引き後の税込金額を使う
- 商品名は20文字以内。カタカナ略称は正式な日本語名に変換する`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            { inline_data: { mime_type: mimeType, data: base64Image } },
          ],
        }],
        generationConfig: { temperature: 0 },
      }),
    }
  );

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(`Gemini API error: ${errBody?.error?.message || res.status}`);
  }

  const data = await res.json();
  let text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  text = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const parsed = JSON.parse(text);
  if (!Array.isArray(parsed.items)) parsed.items = [];
  parsed.items = parsed.items.filter(item =>
    typeof item.amount === "number" && item.amount >= 1 && item.amount <= 1000000
  );
  // 各itemにcategoryを持たせる（個別編集できるように）
  parsed.items = parsed.items.map(item => ({
    title:    item.title,
    amount:   item.amount,
    category: parsed.category,
  }));
  return parsed;
}

// ===================================
// 品目選択シート
// ===================================
function showItemSelector(items, date, defaultCategory, onAdded) {
  const existing = document.getElementById("itemSelectorOverlay");
  if (existing) existing.remove();

  // 各品目の編集可能データを管理（参照渡しで編集反映）
  const itemData = items.map(item => ({
    title:    item.title,
    amount:   item.amount,
    category: item.category || defaultCategory,
  }));

  const overlay = document.createElement("div");
  overlay.id = "itemSelectorOverlay";
  overlay.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:350;display:flex;align-items:flex-end;`;

  const sheet = document.createElement("div");
  sheet.style.cssText = `background:#f5f5f5;width:100%;border-radius:20px 20px 0 0;max-height:80vh;display:flex;flex-direction:column;`;

  // ヘッダー
  const header = document.createElement("div");
  header.style.cssText = `display:flex;align-items:center;justify-content:space-between;padding:16px 20px 12px;border-bottom:1px solid #e0e0e0;background:#fff;border-radius:20px 20px 0 0;flex-shrink:0;`;
  header.innerHTML = `
    <button id="toggleAllCheck" style="font-size:13px;color:var(--theme,#4caf50);background:none;border:none;cursor:pointer;padding:0;font-weight:bold;">全選択</button>
    <span style="font-size:16px;font-weight:bold;">レシートの品目一覧</span>
    <button id="closeItemSelector" style="width:32px;height:32px;border-radius:50%;border:none;background:#f0f0f0;font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;">✕</button>
  `;
  sheet.appendChild(header);

  const listWrap = document.createElement("div");
  listWrap.style.cssText = "overflow-y:auto;flex:1;";

  const totalRow = document.createElement("div");
  totalRow.style.cssText = `display:flex;justify-content:space-between;align-items:center;padding:10px 20px;background:#fff;border-bottom:1px solid #e8e8e8;font-size:13px;color:#666;`;
  totalRow.innerHTML = `<span>合計金額</span><span id="selectedTotal" style="font-weight:bold;color:#222;">¥0</span>`;
  listWrap.appendChild(totalRow);

  const ul = document.createElement("ul");
  ul.style.cssText = "list-style:none;padding:0;margin:0;";
  const checkboxes = [];
  const liEls = [];

  // 品目行を構築する関数（編集後の再描画にも使う）
  function buildItemRow(idx) {
    const item = itemData[idx];
    const li = document.createElement("li");
    li.style.cssText = `display:flex;align-items:center;gap:12px;padding:13px 20px;background:#fff;border-bottom:1px solid #f0f0f0;`;

    const cb = checkboxes[idx] || document.createElement("input");
    if (!checkboxes[idx]) {
      cb.type    = "checkbox";
      cb.checked = true;
      cb.style.cssText = "width:20px;height:20px;flex-shrink:0;accent-color:var(--theme,#4caf50);cursor:pointer;";
      checkboxes[idx] = cb;
    }

    const label = document.createElement("div");
    label.style.cssText = "flex:1;min-width:0;cursor:pointer;";
    label.innerHTML = `
      <div style="font-size:14px;font-weight:bold;color:#222;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${item.title}</div>
      <div style="font-size:12px;color:#999;margin-top:2px;">${item.category}</div>
    `;

    const amountSpan = document.createElement("span");
    amountSpan.style.cssText = "font-size:15px;font-weight:bold;color:#c62828;white-space:nowrap;flex-shrink:0;cursor:pointer;";
    amountSpan.textContent = `¥${item.amount.toLocaleString()}`;

    // チェックボックスのクリック
    cb.addEventListener("click", e => { e.stopPropagation(); updateTotal(); });

    // 品目行タップ → 編集モーダルを開く
    const openEdit = () => showItemEditModal(idx, itemData, () => {
      // 編集後に行を再描画
      const newLi = buildItemRow(idx);
      ul.replaceChild(newLi, liEls[idx]);
      liEls[idx] = newLi;
      updateTotal();
    });

    label.addEventListener("click", openEdit);
    amountSpan.addEventListener("click", openEdit);
    // チェックボックス以外の行タップはチェック切り替え
    li.addEventListener("click", e => {
      if (e.target === cb) return;
      // ラベル・金額タップは編集モーダル（上で処理済み）
      // li自体（余白部分）タップはチェック切り替え
      if (e.target === li) { cb.checked = !cb.checked; updateTotal(); }
    });

    li.appendChild(cb);
    li.appendChild(label);
    li.appendChild(amountSpan);
    return li;
  }

  itemData.forEach((_, idx) => {
    const li = buildItemRow(idx);
    liEls.push(li);
    ul.appendChild(li);
  });

  listWrap.appendChild(ul);
  sheet.appendChild(listWrap);

  function updateTotal() {
    const total = itemData.reduce((s, item, i) => s + (checkboxes[i]?.checked ? item.amount : 0), 0);
    const count = checkboxes.filter(c => c?.checked).length;
    const totalEl = document.getElementById("selectedTotal");
    if (totalEl) totalEl.textContent = `¥${total.toLocaleString()}（${count}点）`;
    const toggleBtn = document.getElementById("toggleAllCheck");
    if (toggleBtn) toggleBtn.textContent = checkboxes.every(c => c?.checked) ? "全解除" : "全選択";
  }

  const saveBtn = document.createElement("button");
  saveBtn.style.cssText = `width:calc(100% - 32px);margin:12px 16px 32px;height:50px;background:var(--theme,#4caf50);color:#fff;border:none;border-radius:12px;font-size:16px;font-weight:bold;cursor:pointer;flex-shrink:0;`;
  saveBtn.textContent = "保存する";
  sheet.appendChild(saveBtn);

  header.querySelector("#toggleAllCheck").addEventListener("click", () => {
    const allChecked = checkboxes.every(c => c?.checked);
    checkboxes.forEach(c => { if (c) c.checked = !allChecked; });
    updateTotal();
  });

  saveBtn.addEventListener("click", () => {
    const selected = itemData.filter((_, i) => checkboxes[i]?.checked);
    if (selected.length === 0) { alert("商品を1つ以上選択してください"); return; }
    selected.forEach(item => {
      const catField = makeCategoryFieldFromChildName(item.category, childCategories);
      records.push({ date, amount: item.amount, type: "expense", category: catField, title: item.title });
    });
    saveRecords();
    overlay.remove();
    showToast(`${selected.length}件を追加しました`);
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
function showItemEditModal(idx, itemData, onSaved) {
  const item = itemData[idx];

  const existing = document.getElementById("itemEditModalOverlay");
  if (existing) existing.remove();

  const overlay = document.createElement("div");
  overlay.id = "itemEditModalOverlay";
  overlay.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:400;display:flex;align-items:flex-end;`;

  const modal = document.createElement("div");
  modal.style.cssText = `background:#fff;width:100%;border-radius:20px 20px 0 0;padding:0 0 32px;`;

  // 全小分類をフラット化してセレクト用に
  const allChildren = [];
  Object.entries(childCategories).forEach(([pid, arr]) => {
    const parent = PARENT_CATEGORIES.find(p => p.id === pid);
    if (!parent || parent.type === "income") return; // 支出のみ（Geminiはexpense想定）
    arr.forEach(c => allChildren.push({ parentName: parent.name, childName: c.name }));
  });
  // 収入カテゴリも追加
  Object.entries(childCategories).forEach(([pid, arr]) => {
    const parent = PARENT_CATEGORIES.find(p => p.id === pid);
    if (!parent || parent.type !== "income") return;
    arr.forEach(c => allChildren.push({ parentName: parent.name, childName: c.name }));
  });

  const catOptions = allChildren.map(c =>
    `<option value="${c.childName}" ${c.childName === item.category ? "selected" : ""}>${c.parentName} › ${c.childName}</option>`
  ).join("");

  modal.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:16px 20px 12px;border-bottom:1px solid #eee;">
      <span style="font-size:16px;font-weight:bold;">品目を編集</span>
      <button id="closeItemEdit" style="width:32px;height:32px;border-radius:50%;border:none;background:#f0f0f0;font-size:14px;cursor:pointer;">✕</button>
    </div>
    <div style="padding:12px 20px;">
      <label style="display:block;font-size:13px;color:#888;margin:8px 0 4px;">商品名</label>
      <input id="editItemTitle" type="text" value="${item.title}"
        style="width:100%;height:44px;font-size:16px;padding:8px 10px;border:1px solid #e0e0e0;border-radius:8px;box-sizing:border-box;">

      <label style="display:block;font-size:13px;color:#888;margin:10px 0 4px;">金額（円）</label>
      <input id="editItemAmount" type="number" value="${item.amount}"
        style="width:100%;height:44px;font-size:16px;padding:8px 10px;border:1px solid #e0e0e0;border-radius:8px;box-sizing:border-box;">

      <label style="display:block;font-size:13px;color:#888;margin:10px 0 4px;">カテゴリ</label>
      <select id="editItemCategory"
        style="width:100%;height:44px;font-size:15px;padding:8px 10px;border:1px solid #e0e0e0;border-radius:8px;box-sizing:border-box;background:#fafafa;">
        ${catOptions}
      </select>

      <button id="saveItemEdit"
        style="width:100%;height:48px;background:var(--theme,#4caf50);color:#fff;border:none;border-radius:8px;font-size:16px;font-weight:bold;cursor:pointer;margin-top:16px;">
        保存する
      </button>
    </div>
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  modal.querySelector("#closeItemEdit").addEventListener("click", () => overlay.remove());
  overlay.addEventListener("click", e => { if (e.target === overlay) overlay.remove(); });

  modal.querySelector("#saveItemEdit").addEventListener("click", () => {
    const newTitle  = modal.querySelector("#editItemTitle").value.trim();
    const newAmount = Number(modal.querySelector("#editItemAmount").value);
    const newCat    = modal.querySelector("#editItemCategory").value;

    if (!newTitle)          { alert("商品名を入力してください"); return; }
    if (isNaN(newAmount) || newAmount <= 0) { alert("正しい金額を入力してください"); return; }

    itemData[idx].title    = newTitle;
    itemData[idx].amount   = newAmount;
    itemData[idx].category = newCat;

    overlay.remove();
    onSaved();
  });
}
