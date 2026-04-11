/**
 * features/scanner/Receipt.js
 * Gemini APIを使ったレシート画像読み取り
 */

import { records, saveRecords, childCategories, getGeminiApiKey } from "../../store.js";
import { getAllChildNames, makeCategoryFieldFromChildName, parseCategoryField, getParentName } from "../../utils/category.js";
import { PARENT_CATEGORIES } from "../../constants/categories.js";
import { showToast } from "../../components/Modal.js";
import { updateParentSelect, updateChildSelect } from "../../components/CategorySelector.js";

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
      showItemSelector(parsed.items, parsed.discounts, parsed.date, parsed.category, onAdded);
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
      showItemSelector(parsed.items, parsed.discounts, parsed.date, parsed.category, onAdded);
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
  const today = new Date().toISOString().slice(0, 10);
  const allChildNames = getAllChildNames(childCategories);
  const taxMode = localStorage.getItem("receiptTaxMode") || "inclusive";
  const isInclusive = taxMode === "inclusive";

  // ── 共通部分 ──
  const commonHeader = "あなたはレシート解析AIです。添付画像のレシートを読み取り、以下のJSON形式のみで回答してください。余分なテキストや```は不要です.\n\n"
    + "{\n"
    + '  "date": "YYYY-MM-DD形式の購入日（不明な場合は' + today + '）",\n'
    + '  "category": "以下のカテゴリから最も適切なもの1つ：' + allChildNames.join("・") + '",\n'
    + '  "items": [\n'
    + '    {\n'
    + '      "title": "商品名（簡潔に20文字以内）",\n';

  const commonDiscounts = '  ],\n'
    + '  "discounts": [\n'
    + '    { "title": "string", "amount": 0 }\n'
    + '  ]\n'
    + "}\n\n"
    + "【割引の分類ルール】\n"
    + "- discounts[].title：割引名（例：ポイント値引き・クーポン）\n"
    + "- discounts[].amount：割引額（正の整数・円）\n"
    + "- 「商品個別の値引き」：商品行の直下・隣などその商品専用の割引 → itemDiscount に金額を入れる\n"
    + "- 「合計への値引き」：小計の下にまとめて書かれるポイント値引き・クーポン・まとめ割引など → discounts に入れる\n"
    + "- itemDiscountがない商品は必ず 0 を返す\n"
    + "- discountsが1件もない場合は空配列 [] を返す\n\n";

  const commonFooter = "- レシートに「外税」「税抜」「＋税」等の記載があれば税抜価格と判断する\n"
    + "- ポイント支払い・プリカ支払いはdiscountsに含めない（支払い手段のため）\n"
    + "- 合計・小計・税額・税合計・お釣りはitemsにもdiscountsにも含めない\n"
    + "- カタカナ略称は正式な日本語名に変換する";

  // ── モード別プロンプト ──
  let prompt;
  if (isInclusive) {
    // 税込モード：税抜→税込に換算して返す
    prompt = commonHeader
      + '      "amount": 0,\n'
      + '      "itemDiscount": 0\n'
      + '    }\n'
      + commonDiscounts
      + "【amountの計算ルール】\n"
      + "- amountは必ず税込の整数（円）で返すこと\n"
      + "- itemDiscount がある場合のamountは値引き前の税込金額\n"
      + "- レシートに税込価格が明記されている場合 → そのまま使用\n"
      + "- 税抜価格の場合は以下のルールで税率を判定する\n"
      + "  ・商品名の前に「*」「＊」がある → 軽減税率8%対象\n"
      + "  ・商品名の前に「★」「☆」がある → 標準税率10%対象\n"
      + "  ・「※」「軽」「(軽)」等のマークがある → 軽減税率8%\n"
      + "  ・マークがなく食料品・飲料（酒類除く）・新聞 → 8%\n"
      + "  ・マークがなく外食・日用品・衣類・家電など → 10%\n"
      + "- 税込金額の計算方法（優先順）\n"
      + "  1. レシートに税率ごとの税額合計（例：「8%外税 ¥208」「10%外税 ¥26」）が記載されている場合\n"
      + "     → 同じ税率の商品の税抜合計に税額合計を按分して各商品の税込金額を求める\n"
      + "     → 具体的には：商品税込 = 税抜価格 + round(税抜価格 / 同税率の税抜合計 × 税率ごとの税額合計)\n"
      + "     → ただし端数調整により合計が合わない場合は、最も金額の大きい商品で±1円調整してよい\n"
      + "  2. 税額合計の記載がない場合 → 税抜 × 1.08 または × 1.10 を切り捨て\n"
      + commonFooter;
  } else {
    // レシートどおりモード：税抜価格をそのまま返す＋消費税を taxes に格納
    prompt = commonHeader
      + '      "amount": 0,\n'
      + '      "itemDiscount": 0,\n'
      + '      "taxRate": 0\n'
      + '    }\n'
      + '  ],\n'
      + '  "taxes": { "rate8": 0, "rate10": 0 },\n'
      + '  "discounts": [\n'
      + '    { "title": "string", "amount": 0 }\n'
      + '  ]\n'
      + "}\n\n"
      + "【割引の分類ルール】\n"
      + "- discounts[].title：割引名（例：ポイント値引き・クーポン）\n"
      + "- discounts[].amount：割引額（正の整数・円）\n"
      + "- 「商品個別の値引き」：商品行の直下・隣などその商品専用の割引 → itemDiscount に金額を入れる\n"
      + "- 「合計への値引き」：小計の下にまとめて書かれるポイント値引き・クーポン・まとめ割引など → discounts に入れる\n"
      + "- itemDiscountがない商品は必ず 0 を返す\n"
      + "- discountsが1件もない場合は空配列 [] を返す\n\n"
      + "【amountの計算ルール】\n"
      + "- amountはレシートに記載の価格をそのまま整数（円）で返す（税込・税抜どちらでも記載どおり）\n"
      + "- itemDiscount がある場合のamountは値引き前の価格\n"
      + "- taxRate：税抜価格の場合は適用される消費税率（8 or 10）を入れる。税込価格の場合は 0\n"
      + "  ・商品名の前に「*」「＊」→ 8、「★」「☆」→ 10\n"
      + "  ・「※」「軽」「(軽)」等のマーク → 8\n"
      + "  ・マークがなく食料品・飲料（酒類除く）・新聞 → 8\n"
      + "  ・マークがなく外食・日用品・衣類・家電など → 10\n"
      + "- レシートに税率ごとの税額合計（例：「8%外税 ¥208」「10%外税 ¥26」）が記載されている場合\n"
      + "  → taxes フィールドにその情報を入れる\n"
      + '- taxes.rate8：8%分の税額合計（整数・なければ0）\n'
      + '- taxes.rate10：10%分の税額合計（整数・なければ0）\n'
      + commonFooter;
  }

  const res = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + apiKey,
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
    throw new Error("Gemini API error: " + (errBody?.error?.message || res.status));
  }

  const data = await res.json();
  let text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  text = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const parsed = JSON.parse(text);

  if (!Array.isArray(parsed.items))     parsed.items     = [];
  if (!Array.isArray(parsed.discounts)) parsed.discounts = [];

  if (isInclusive) {
    // 税込モード：値引き後の税込金額をamountにする
    parsed.items = parsed.items
      .filter(item => typeof item.amount === "number" && item.amount >= 1 && item.amount <= 1000000)
      .map(item => {
        const discount = (typeof item.itemDiscount === "number" && item.itemDiscount > 0)
          ? item.itemDiscount : 0;
        return {
          title:        item.title,
          amount:       Math.max(1, item.amount - discount),
          itemDiscount: discount,
          category:     parsed.category,
          isIncome:     false,
        };
      });
  } else {
    // レシートどおりモード：税抜価格そのまま＋消費税品目を追加
    const taxes = parsed.taxes || { rate8: 0, rate10: 0 };
    parsed.items = parsed.items
      .filter(item => typeof item.amount === "number" && item.amount >= 1 && item.amount <= 1000000)
      .map(item => {
        const discount = (typeof item.itemDiscount === "number" && item.itemDiscount > 0)
          ? item.itemDiscount : 0;
        return {
          title:        item.title,
          amount:       Math.max(1, item.amount - discount),
          itemDiscount: discount,
          taxRate:      item.taxRate || 0,
          category:     parsed.category,
          isIncome:     false,
        };
      });

    // 消費税品目を追加（税額合計が取れた場合はそれを使い、なければ計算）
    const tax8Total  = taxes.rate8  > 0 ? taxes.rate8
      : parsed.items.filter(i => i.taxRate === 8).reduce((s, i) => s + Math.floor(i.amount * 0.08), 0);
    const tax10Total = taxes.rate10 > 0 ? taxes.rate10
      : parsed.items.filter(i => i.taxRate === 10).reduce((s, i) => s + Math.floor(i.amount * 0.10), 0);

    if (tax8Total > 0) {
      parsed.discounts.push({
        title:        "消費税（8%）",
        amount:       tax8Total,
        itemDiscount: 0,
        category:     "税・社会保障",
        isIncome:     false,
        isTax:        true,
      });
    }
    if (tax10Total > 0) {
      parsed.discounts.push({
        title:        "消費税（10%）",
        amount:       tax10Total,
        itemDiscount: 0,
        category:     "税・社会保障",
        isIncome:     false,
        isTax:        true,
      });
    }
  }

  // 合計割引（ポイント等）：その他入金として扱う
  parsed.discounts = parsed.discounts
    .filter(d => typeof d.amount === "number" && d.amount >= 1 && d.amount <= 1000000)
    .map(d => d.isTax ? d : {
      title:        d.title,
      amount:       d.amount,
      itemDiscount: 0,
      category:     "その他入金",
      isIncome:     true,
    });

  return parsed;
}

// ===================================
// 汎用画像解析 Gemini API（家計簿メモ・手書き・スクショ等）
// ===================================
async function callGeminiImageAPI(base64Image, mimeType, apiKey) {
  const today = new Date().toISOString().slice(0, 10);
  const allChildNames = getAllChildNames(childCategories);

  const prompt = "あなたは家計簿AIです。添付画像から収支情報を読み取り、以下のJSON形式のみで回答してください。余分なテキストや```は不要です.\n\n"
    + "{\n"
    + '  "date": "YYYY-MM-DD形式の日付（不明な場合は' + today + '）",\n'
    + '  "category": "以下のカテゴリから最も適切なもの1つ：' + allChildNames.join("・") + '",\n'
    + '  "items": [\n'
    + '    { "title": "品目名（20文字以内）", "amount": 0, "itemDiscount": 0 }\n'
    + '  ],\n'
    + '  "discounts": [\n'
    + '    { "title": "割引名", "amount": 0 }\n'
    + '  ]\n'
    + "}\n\n"
    + "【読み取りルール】\n"
    + "- レシート・手書きメモ・スクリーンショット・家計簿画像など収支情報を含む画像に対応\n"
    + "- 金額は税込の整数（円）で返す\n"
    + "- 支出か収入かは内容から判断し、収入は isIncome: true を items に追加\n"
    + "- 合計・小計・税額はitemsに含めない\n"
    + "- 値引き・ポイント値引きはdiscountsに入れる（amountは正の整数）\n"
    + "- discountsが1件もない場合は空配列 [] を返す\n"
    + "- itemDiscountがない商品は 0 を返す\n"
    + "- カタカナ略称は正式な日本語名に変換する";

  const res = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + apiKey,
    {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: mimeType, data: base64Image } }] }],
        generationConfig: { temperature: 0 },
      }),
    }
  );

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error("Gemini API error: " + (errBody?.error?.message || res.status));
  }

  const data = await res.json();
  let text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  text = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const parsed = JSON.parse(text);

  if (!Array.isArray(parsed.items))     parsed.items     = [];
  if (!Array.isArray(parsed.discounts)) parsed.discounts = [];

  parsed.items = parsed.items
    .filter(item => typeof item.amount === "number" && item.amount >= 1 && item.amount <= 1000000)
    .map(item => {
      const discount = (typeof item.itemDiscount === "number" && item.itemDiscount > 0) ? item.itemDiscount : 0;
      return {
        title:        item.title,
        amount:       Math.max(1, item.amount - discount),
        itemDiscount: discount,
        category:     parsed.category,
        isIncome:     !!item.isIncome,
      };
    });

  parsed.discounts = parsed.discounts
    .filter(d => typeof d.amount === "number" && d.amount >= 1 && d.amount <= 1000000)
    .map(d => ({ title: d.title, amount: d.amount, itemDiscount: 0, category: "その他入金", isIncome: true }));

  return parsed;
}

// ===================================
// 品目選択シート
// ===================================
function showItemSelector(items, discounts, date, defaultCategory, onAdded) {
  const existing = document.getElementById("itemSelectorOverlay");
  if (existing) existing.remove();

  // 支出品目 + 消費税品目 + 割引（収入）を1つの配列で管理
  const itemData = [
    ...items.map(item => ({
      title:        item.title,
      amount:       item.amount,
      itemDiscount: item.itemDiscount || 0,
      category:     item.category || defaultCategory,
      isIncome:     false,
      isTax:        false,
    })),
    ...(discounts || []).filter(d => d.isTax).map(d => ({
      title:        d.title,
      amount:       d.amount,
      itemDiscount: 0,
      category:     d.category || "税・社会保障",
      isIncome:     false,
      isTax:        true,
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
  overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:350;display:flex;align-items:flex-end;";

  const sheet = document.createElement("div");
  sheet.style.cssText = "background:#f5f5f5;width:100%;border-radius:20px 20px 0 0;max-height:80vh;display:flex;flex-direction:column;";

  const header = document.createElement("div");
  header.style.cssText = "display:flex;align-items:center;justify-content:space-between;padding:16px 20px 12px;border-bottom:1px solid #e0e0e0;background:#fff;border-radius:20px 20px 0 0;flex-shrink:0;";
  header.innerHTML =
    '<div style="width:32px;"></div>'
    + '<span style="font-size:16px;font-weight:bold;">レシートの品目一覧</span>'
    + '<button id="closeItemSelector" style="width:32px;height:32px;border-radius:50%;border:none;background:#f0f0f0;font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;">✕</button>';
  sheet.appendChild(header);

  const listWrap = document.createElement("div");
  listWrap.style.cssText = "overflow-y:auto;flex:1;";

  const totalRow = document.createElement("div");
  totalRow.style.cssText = "display:flex;justify-content:space-between;align-items:center;padding:10px 20px;background:#fff;border-bottom:1px solid #e8e8e8;font-size:13px;color:#666;";
  totalRow.innerHTML = '<span>合計金額</span><span id="selectedTotal" style="font-weight:bold;color:#222;">¥0</span>';
  listWrap.appendChild(totalRow);

  const ul = document.createElement("ul");
  ul.style.cssText = "list-style:none;padding:0;margin:0;";
  const liEls = [];

  function buildItemRow(idx) {
    const item = itemData[idx];
    const li = document.createElement("li");
    li.style.cssText = "display:flex;align-items:center;gap:12px;padding:13px 20px;background:#fff;border-bottom:1px solid #f0f0f0;cursor:pointer;";

    const label = document.createElement("div");
    label.style.cssText = "flex:1;min-width:0;";

    const badge = item.isTax
      ? '<span style="display:inline-block;font-size:10px;background:#fff3e0;color:#e65100;border-radius:4px;padding:1px 5px;margin-left:4px;vertical-align:middle;">消費税</span>'
      : item.isIncome
      ? '<span style="display:inline-block;font-size:10px;background:#e8f5e9;color:#2e7d32;border-radius:4px;padding:1px 5px;margin-left:4px;vertical-align:middle;">収入</span>'
      : "";
    const discountNote = (!item.isIncome && item.itemDiscount > 0)
      ? '<span style="font-size:11px;color:#2e7d32;margin-left:6px;">（値引 -¥' + item.itemDiscount.toLocaleString() + ' 適用済）</span>'
      : "";

    // 「大分類 › 小分類」形式で表示
    const catField2 = makeCategoryFieldFromChildName(item.category, childCategories);
    const { parentId: catParentId, childName: catChildName } = parseCategoryField(catField2, childCategories);
    const catLabel = catChildName
      ? getParentName(catParentId) + ' › ' + catChildName
      : getParentName(catParentId);

    label.innerHTML =
      '<div style="font-size:14px;font-weight:bold;color:#222;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'
      + item.title + badge + '</div>'
      + '<div style="font-size:12px;color:#999;margin-top:2px;">' + catLabel + discountNote + '</div>';

    const amountColor  = item.isIncome ? "var(--theme,#4caf50)" : "#c62828";
    const amountPrefix = item.isIncome ? "+" : "";
    const amountSpan = document.createElement("span");
    amountSpan.style.cssText = "font-size:15px;font-weight:bold;color:" + amountColor + ";white-space:nowrap;flex-shrink:0;";
    amountSpan.textContent = amountPrefix + "¥" + item.amount.toLocaleString();

    // 行全体タップで編集モーダルを開く
    li.addEventListener("click", () => showItemEditModal(idx, itemData, {
      onSaved: () => {
        const newLi = buildItemRow(idx);
        ul.replaceChild(newLi, liEls[idx]);
        liEls[idx] = newLi;
        updateTotal();
      },
      onDeleted: () => {
        itemData.splice(idx, 1);
        liEls.splice(idx, 1);
        // ul全体を再描画
        ul.innerHTML = "";
        itemData.forEach((_, i) => {
          const newLi = buildItemRow(i);
          liEls[i] = newLi;
          ul.appendChild(newLi);
        });
        updateTotal();
      },
    }));
    li.addEventListener("touchstart", () => { li.style.background = "#f5f5f5"; }, { passive: true });
    li.addEventListener("touchend",   () => { li.style.background = "#fff"; },     { passive: true });

    li.appendChild(label);
    li.appendChild(amountSpan);
    return li;
  }

  const expenseCount = items.length;
  // discountsの中でisTax（消費税品目）とそれ以外（ポイント等）を分類
  const taxItems      = (discounts || []).filter(d => d.isTax);
  const incomeItems   = (discounts || []).filter(d => !d.isTax);

  itemData.forEach((item, idx) => {
    // 消費税セクションの区切り（レシートどおりモード）
    if (idx === expenseCount && taxItems.length > 0) {
      const divider = document.createElement("li");
      divider.style.cssText = "padding:6px 20px;background:#f0f0f0;font-size:12px;color:#888;font-weight:bold;border-bottom:1px solid #e0e0e0;";
      divider.textContent = "消費税（支出として記録）";
      ul.appendChild(divider);
    }
    // 割引・ポイントセクションの区切り
    if (idx === expenseCount + taxItems.length && incomeItems.length > 0) {
      const divider = document.createElement("li");
      divider.style.cssText = "padding:6px 20px;background:#f0f0f0;font-size:12px;color:#888;font-weight:bold;border-bottom:1px solid #e0e0e0;";
      divider.textContent = "割引・ポイント還元（収入として記録）";
      ul.appendChild(divider);
    }
    const li = buildItemRow(idx);
    liEls.push(li);
    ul.appendChild(li);
  });

  listWrap.appendChild(ul);
  sheet.appendChild(listWrap);

  function updateTotal() {
    let expense = 0, income = 0;
    itemData.forEach(item => {
      if (item.isIncome) income += item.amount;
      else               expense += item.amount;
    });
    const net = expense - income;
    const totalEl = document.getElementById("selectedTotal");
    if (totalEl) {
      totalEl.textContent = "¥" + net.toLocaleString() + "（" + itemData.length + "点）";
      totalEl.style.color = net < 0 ? "var(--theme,#4caf50)" : "#222";
    }
  }

  const saveBtn = document.createElement("button");
  saveBtn.style.cssText = "width:calc(100% - 32px);margin:12px 16px 32px;height:50px;background:var(--theme,#4caf50);color:#fff;border:none;border-radius:12px;font-size:16px;font-weight:bold;cursor:pointer;flex-shrink:0;";
  saveBtn.textContent = "保存する";
  sheet.appendChild(saveBtn);

  saveBtn.addEventListener("click", () => {
    if (itemData.length === 0) { alert("品目がありません"); return; }
    itemData.forEach(item => {
      if (item.isIncome) {
        records.push({
          date,
          amount:   item.amount,
          type:     "income",
          category: "income/その他入金",
          title:    item.title,
        });
      } else {
        const catField = makeCategoryFieldFromChildName(item.category, childCategories);
        records.push({ date, amount: item.amount, type: "expense", category: catField, title: item.title });
      }
    });
    // ↑ isTax品目も isIncome:false なので上のelse側で tax/所得税カテゴリとして保存される
    saveRecords();
    overlay.remove();
    const savedExpense = itemData.filter(i => !i.isIncome).length;
    const savedIncome  = itemData.filter(i =>  i.isIncome).length;
    const msg = savedIncome > 0
      ? savedExpense + "件の支出・" + savedIncome + "件の割引を追加しました"
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
  overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:400;display:flex;align-items:flex-end;";

  const modal = document.createElement("div");
  modal.style.cssText = "background:#fff;width:100%;border-radius:20px 20px 0 0;padding:0 0 32px;";

  const catField = makeCategoryFieldFromChildName(item.category, childCategories);
  const { parentId: currentParentId, childName: currentChildName } = parseCategoryField(catField, childCategories);
  const currentType = item.isIncome ? "income" : "expense";

  modal.innerHTML =
    '<div class="edit-modal-header" style="border-radius:20px 20px 0 0;border-bottom:1px solid #eee;">'
    + '<button id="deleteItemBtn" class="modal-delete-btn">🗑️ 削除</button>'
    + '<span class="modal-title">品目を編集</span>'
    + '<button id="closeItemEdit" class="modal-close">✕</button>'
    + '</div>'
    + '<div style="padding:12px 20px;">'
    + '<label class="field-label">商品名</label>'
    + '<input id="editItemTitle" type="text" value="' + item.title + '">'
    + '<label class="field-label">金額（円）</label>'
    + '<input id="editItemAmount" type="number" value="' + item.amount + '">'
    + '<label class="field-label">カテゴリ</label>'
    + '<div class="category-selector"><div class="cat-select-row">'
    + '<select id="editItemParentCat" class="cat-select-parent"></select>'
    + '<select id="editItemChildCat"  class="cat-select-child"></select>'
    + '</div></div>'
    + '<button id="saveItemEdit" class="btn-primary">保存する</button>'
    + '</div>';

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

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
    if (isNaN(newAmount) || newAmount <= 0) { alert("正しい金額を入力してください"); return; }

    itemData[idx].title    = newTitle;
    itemData[idx].amount   = newAmount;
    itemData[idx].category = newChildName || newParentId;

    const parent = PARENT_CATEGORIES.find(p => p.id === newParentId);
    if (parent) itemData[idx].isIncome = (parent.type === "income");

    overlay.remove();
    onSaved();
  });
}
