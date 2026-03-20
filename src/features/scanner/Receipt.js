/**
 * features/scanner/Receipt.js
 * Gemini APIを使ったレシート画像読み取り
 */

import { records, saveRecords, childCategories, getGeminiApiKey } from "../../store.js";
import { getAllChildNames, makeCategoryFieldFromChildName } from "../../utils/category.js";
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
  return parsed;
}

// ===================================
// 品目選択シート
// ===================================
function showItemSelector(items, date, category, onAdded) {
  const existing = document.getElementById("itemSelectorOverlay");
  if (existing) existing.remove();

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

  items.forEach(item => {
    const li = document.createElement("li");
    li.style.cssText = `display:flex;align-items:center;gap:12px;padding:13px 20px;background:#fff;border-bottom:1px solid #f0f0f0;cursor:pointer;`;
    const cb = document.createElement("input");
    cb.type    = "checkbox";
    cb.checked = true;
    cb.style.cssText = "width:20px;height:20px;flex-shrink:0;accent-color:var(--theme,#4caf50);cursor:pointer;";
    checkboxes.push(cb);
    const label = document.createElement("div");
    label.style.cssText = "flex:1;min-width:0;";
    label.innerHTML = `<div style="font-size:14px;font-weight:bold;color:#222;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${item.title}</div><div style="font-size:12px;color:#999;margin-top:2px;">${category}</div>`;
    const amountSpan = document.createElement("span");
    amountSpan.style.cssText = "font-size:15px;font-weight:bold;color:#c62828;white-space:nowrap;flex-shrink:0;";
    amountSpan.textContent = `¥${item.amount.toLocaleString()}`;
    li.addEventListener("click", e => { if (e.target !== cb) cb.checked = !cb.checked; updateTotal(); });
    cb.addEventListener("click", e => { e.stopPropagation(); updateTotal(); });
    li.appendChild(cb); li.appendChild(label); li.appendChild(amountSpan);
    ul.appendChild(li);
  });

  listWrap.appendChild(ul);
  sheet.appendChild(listWrap);

  function updateTotal() {
    const total = items.reduce((s, item, i) => s + (checkboxes[i].checked ? item.amount : 0), 0);
    const count = checkboxes.filter(c => c.checked).length;
    document.getElementById("selectedTotal").textContent = `¥${total.toLocaleString()}（${count}点）`;
    const toggleBtn = document.getElementById("toggleAllCheck");
    if (toggleBtn) toggleBtn.textContent = checkboxes.every(c => c.checked) ? "全解除" : "全選択";
  }

  const saveBtn = document.createElement("button");
  saveBtn.style.cssText = `width:calc(100% - 32px);margin:12px 16px 32px;height:50px;background:var(--theme,#4caf50);color:#fff;border:none;border-radius:12px;font-size:16px;font-weight:bold;cursor:pointer;flex-shrink:0;`;
  saveBtn.textContent = "保存する";
  sheet.appendChild(saveBtn);

  header.querySelector("#toggleAllCheck").addEventListener("click", () => {
    const allChecked = checkboxes.every(c => c.checked);
    checkboxes.forEach(c => c.checked = !allChecked);
    updateTotal();
  });

  saveBtn.addEventListener("click", () => {
    const selected = items.filter((_, i) => checkboxes[i].checked);
    if (selected.length === 0) { alert("商品を1つ以上選択してください"); return; }
    const catField = makeCategoryFieldFromChildName(category, childCategories);
    selected.forEach(item => {
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
