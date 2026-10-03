/**
 * features/payroll/PayrollView.js
 * 任意で有効化できる給与明細管理機能。
 * 画像をギャラリーから選択し、Gemini APIで解析した結果をlocalStorageへ保存する。
 */

import {
  payrollSlips,
  savePayrollSlips,
  getGeminiApiKey,
} from "../../store.js";
import { showToast } from "../../components/Modal.js";

let initialized = false;
let onChangedCallback = () => {};

// ===================================
// 初期化
// ===================================
export function initPayrollEvents(onChanged = () => {}) {
  onChangedCallback = onChanged;
  if (initialized) return;
  initialized = true;

  const importBtn = document.getElementById("payrollImportBtn");
  const fileInput = document.getElementById("payrollImageInput");
  const yearSelect = document.getElementById("payrollYearSelect");

  importBtn.addEventListener("click", () => {
    if (!getGeminiApiKey()) {
      alert("Gemini APIキーが設定されていません。\n設定 → Gemini APIキー から登録してください。");
      return;
    }
    fileInput.click();
  });

  fileInput.addEventListener("change", async e => {
    const file = e.target.files?.[0];
    fileInput.value = "";
    if (!file) return;

    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      alert("Gemini APIキーが設定されていません。\n設定 → Gemini APIキー から登録してください。");
      return;
    }

    const overlay = document.getElementById("scanOverlay");
    const scanText = overlay.querySelector(".scan-text");
    const oldText = scanText.textContent;
    scanText.textContent = "給与明細を解析中…";
    overlay.classList.remove("hidden");

    try {
      const base64 = await fileToBase64(file);
      const mimeType = file.type || "image/jpeg";
      const parsed = await callGeminiPayrollAPI(base64, mimeType, apiKey);
      const normalized = normalizePayroll(parsed);

      if (!normalized.payrollMonth && !normalized.paymentDate && normalized.grossPay <= 0 && normalized.netPay <= 0) {
        alert("給与明細として読み取れませんでした。\n明細全体が写っている画像でもう一度お試しください。");
        return;
      }

      showPayrollEditor(normalized, { mode: "add" });
    } catch (err) {
      console.error(err);
      alert("給与明細の読み取りエラー:\n" + err.message);
    } finally {
      overlay.classList.add("hidden");
      scanText.textContent = oldText;
    }
  });

  yearSelect.addEventListener("change", () => {
    localStorage.setItem("payrollSelectedYear", yearSelect.value);
    renderPayrollView();
  });
}

// ===================================
// 一覧画面
// ===================================
export function renderPayrollView() {
  const yearSelect = document.getElementById("payrollYearSelect");
  const summary = document.getElementById("payrollSummary");
  const list = document.getElementById("payrollList");
  const apiHint = document.getElementById("payrollApiHint");
  if (!yearSelect || !summary || !list) return;

  apiHint.style.display = getGeminiApiKey() ? "none" : "block";

  const currentYear = String(new Date().getFullYear());
  const years = [...new Set(payrollSlips.map(getSlipYear).filter(Boolean))]
    .sort((a, b) => Number(b) - Number(a));
  if (!years.includes(currentYear)) years.push(currentYear);
  years.sort((a, b) => Number(b) - Number(a));

  const savedYear = localStorage.getItem("payrollSelectedYear") || years[0] || currentYear;
  const selectedYear = years.includes(savedYear) ? savedYear : (years[0] || currentYear);

  yearSelect.innerHTML = "";
  years.forEach(year => {
    const opt = document.createElement("option");
    opt.value = year;
    opt.textContent = `${year}年`;
    opt.selected = year === selectedYear;
    yearSelect.appendChild(opt);
  });

  const yearSlips = payrollSlips
    .filter(slip => getSlipYear(slip) === selectedYear)
    .sort((a, b) => getSortKey(b).localeCompare(getSortKey(a)));

  const totals = yearSlips.reduce((acc, slip) => {
    acc.gross += toNumber(slip.grossPay);
    acc.deductions += toNumber(slip.totalDeductions);
    acc.net += toNumber(slip.netPay);
    return acc;
  }, { gross: 0, deductions: 0, net: 0 });

  summary.innerHTML = "";
  [
    ["総支給", totals.gross, "payroll-summary-gross"],
    ["控除", totals.deductions, "payroll-summary-deduction"],
    ["手取り", totals.net, "payroll-summary-net"],
  ].forEach(([label, value, cls]) => {
    const card = document.createElement("div");
    card.className = `payroll-summary-item ${cls}`;
    const labelEl = document.createElement("span");
    labelEl.className = "payroll-summary-label";
    labelEl.textContent = label;
    const valueEl = document.createElement("strong");
    valueEl.className = "payroll-summary-value";
    valueEl.textContent = yen(value);
    card.append(labelEl, valueEl);
    summary.appendChild(card);
  });

  list.innerHTML = "";
  if (yearSlips.length === 0) {
    const empty = document.createElement("div");
    empty.className = "payroll-empty";
    empty.innerHTML = "<div class=\"payroll-empty-icon\">📄</div><strong>給与明細がありません</strong><p>「写真から給与明細を追加」から画像を選ぶと、Geminiが明細を解析します。</p>";
    list.appendChild(empty);
    return;
  }

  yearSlips.forEach(slip => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "payroll-slip-card";

    const top = document.createElement("div");
    top.className = "payroll-slip-top";
    const month = document.createElement("div");
    month.className = "payroll-slip-month";
    month.textContent = formatPayrollMonth(slip);
    const date = document.createElement("div");
    date.className = "payroll-slip-date";
    date.textContent = slip.paymentDate ? `支給日 ${formatDate(slip.paymentDate)}` : "";
    top.append(month, date);

    const net = document.createElement("div");
    net.className = "payroll-slip-net";
    net.innerHTML = `<span>手取り</span><strong>${yen(slip.netPay)}</strong>`;

    const sub = document.createElement("div");
    sub.className = "payroll-slip-sub";
    sub.innerHTML = `<span>総支給 ${yen(slip.grossPay)}</span><span>控除 ${yen(slip.totalDeductions)}</span>`;

    card.append(top, net, sub);
    card.addEventListener("click", () => showPayrollDetail(slip.id));
    list.appendChild(card);
  });
}

// ===================================
// Gemini API
// ===================================
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function callGeminiPayrollAPI(base64Image, mimeType, apiKey) {
  const prompt = `あなたは日本の給与明細を正確に読み取るOCR・構造化AIです。
添付画像から給与明細の情報を読み取り、次のJSONだけを返してください。説明文、Markdown、\`\`\`は不要です。

{
  "documentTitle": "明細の表題。読めなければ給与明細",
  "paymentDate": "YYYY-MM-DD。支給年月日。読めなければ空文字",
  "payrollMonth": "YYYY-MM。何年何月分の給与か。読めなければpaymentDateから推定。どちらも不明なら空文字",
  "grossPay": 0,
  "totalDeductions": 0,
  "netPay": 0,
  "work": [
    { "name": "勤務項目名", "value": "表示されている値", "unit": "時間・日・回など。明記がなければ空文字" }
  ],
  "earnings": [
    { "name": "支給項目名", "amount": 0 }
  ],
  "deductions": [
    { "name": "控除項目名", "amount": 0 }
  ],
  "transfers": [
    { "name": "振込先金融機関名", "amount": 0 }
  ],
  "notes": ["その他、給与計算に関係する明確に読める注記"]
}

ルール:
- 金額はカンマや円記号を除いた整数にする。
- 「支給額合計」「支給総額」「総支給」などはgrossPay。
- 「控除額合計」「控除合計」などはtotalDeductions。
- 「差引支給額」「手取額」「振込支給額」など、最終的に本人へ支払われる総額はnetPay。
- 支給項目・控除項目は、画像に項目名と金額が表示されている行をできるだけ漏らさず列挙する。0円の行も項目名が読める場合は含めてよい。
- 勤務実績は金額ではなく、日数・時間数・回数など表示値をworkへ入れる。
- 振込先は金融機関名と振込金額だけをtransfersへ入れる。口座番号、氏名、職員番号など個人識別情報は抽出しない。
- 和暦は西暦へ変換する。令和1年=2019年、令和8年=2026年。
- 読めない値を勝手に補完しない。不明な文字列は空文字、不明な金額は0、配列要素がなければ[]。
- grossPay / totalDeductions / netPayが画像に明記されている場合は、その明記値を最優先する。
- 同じ項目を重複して入れない。`;

  const res = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + encodeURIComponent(apiKey),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            { inline_data: { mime_type: mimeType, data: base64Image } },
          ],
        }],
        generationConfig: {
          temperature: 0,
          responseMimeType: "application/json",
        },
      }),
    }
  );

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message || `Gemini API error: ${res.status}`);
  }

  const data = await res.json();
  let text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  text = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  if (!text) throw new Error("Geminiから解析結果が返りませんでした");

  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Geminiの解析結果をJSONとして読み取れませんでした");
  }
}

function normalizePayroll(raw = {}) {
  const paymentDate = normalizeDate(raw.paymentDate);
  let payrollMonth = normalizeMonth(raw.payrollMonth);
  if (!payrollMonth && paymentDate) payrollMonth = paymentDate.slice(0, 7);

  const earnings = normalizeAmountRows(raw.earnings);
  const deductions = normalizeAmountRows(raw.deductions);
  const transfers = normalizeAmountRows(raw.transfers);
  const work = normalizeWorkRows(raw.work);

  let grossPay = toNumber(raw.grossPay);
  let totalDeductions = toNumber(raw.totalDeductions);
  let netPay = toNumber(raw.netPay);

  if (!grossPay && earnings.length) {
    grossPay = earnings.reduce((s, row) => s + toNumber(row.amount), 0);
  }
  if (!totalDeductions && deductions.length) {
    totalDeductions = deductions.reduce((s, row) => s + toNumber(row.amount), 0);
  }
  if (!netPay && grossPay) {
    netPay = Math.max(0, grossPay - totalDeductions);
  }

  return {
    id: raw.id || createId(),
    documentTitle: cleanText(raw.documentTitle) || "給与明細",
    paymentDate,
    payrollMonth,
    grossPay,
    totalDeductions,
    netPay,
    work,
    earnings,
    deductions,
    transfers,
    notes: Array.isArray(raw.notes) ? raw.notes.map(cleanText).filter(Boolean) : [],
    importedAt: raw.importedAt || new Date().toISOString(),
  };
}

function normalizeAmountRows(rows) {
  if (!Array.isArray(rows)) return [];
  return rows.map(row => ({
    name: cleanText(row?.name || row?.title || row?.label || row?.institution),
    amount: toNumber(row?.amount ?? row?.value),
  })).filter(row => row.name);
}

function normalizeWorkRows(rows) {
  if (!Array.isArray(rows)) return [];
  return rows.map(row => ({
    name: cleanText(row?.name || row?.title || row?.label),
    value: cleanText(row?.value ?? row?.amount),
    unit: cleanText(row?.unit),
  })).filter(row => row.name);
}

// ===================================
// 追加 / 編集シート
// ===================================
function showPayrollEditor(source, { mode }) {
  document.getElementById("payrollEditorOverlay")?.remove();
  const data = normalizePayroll(source);

  const overlay = document.createElement("div");
  overlay.id = "payrollEditorOverlay";
  overlay.className = "payroll-sheet-overlay";

  const sheet = document.createElement("div");
  sheet.className = "payroll-sheet payroll-editor-sheet";

  const header = document.createElement("div");
  header.className = "payroll-sheet-header";
  const title = document.createElement("strong");
  title.textContent = mode === "edit" ? "給与明細を編集" : "読み取り結果を確認";
  const close = document.createElement("button");
  close.type = "button";
  close.className = "modal-close";
  close.textContent = "✕";
  header.append(document.createElement("span"), title, close);
  sheet.appendChild(header);

  const body = document.createElement("div");
  body.className = "payroll-sheet-body";

  const note = document.createElement("p");
  note.className = "payroll-editor-note";
  note.textContent = "Geminiの読み取り結果です。数字に誤りがないか確認してから保存してください。";
  body.appendChild(note);

  const titleInput = createField(body, "表題", "text", data.documentTitle);
  const monthInput = createField(body, "給与の対象月", "month", data.payrollMonth);
  const dateInput = createField(body, "支給日", "date", data.paymentDate);

  const totalGrid = document.createElement("div");
  totalGrid.className = "payroll-editor-total-grid";
  const grossInput = createCompactNumberField(totalGrid, "総支給", data.grossPay);
  const deductionInput = createCompactNumberField(totalGrid, "控除合計", data.totalDeductions);
  const netInput = createCompactNumberField(totalGrid, "手取り", data.netPay);
  body.appendChild(totalGrid);

  const earningsEditor = createAmountSection(body, "支給項目", data.earnings);
  const deductionsEditor = createAmountSection(body, "控除項目", data.deductions);
  const workEditor = createWorkSection(body, "勤務実績", data.work);
  const transfersEditor = createAmountSection(body, "振込先", data.transfers, "金融機関名");

  const saveBtn = document.createElement("button");
  saveBtn.type = "button";
  saveBtn.className = "btn-primary payroll-save-btn";
  saveBtn.textContent = mode === "edit" ? "変更を保存" : "この内容で保存";
  body.appendChild(saveBtn);

  sheet.appendChild(body);
  overlay.appendChild(sheet);
  document.body.appendChild(overlay);

  const closeSheet = () => overlay.remove();
  close.addEventListener("click", closeSheet);
  overlay.addEventListener("click", e => { if (e.target === overlay) closeSheet(); });

  saveBtn.addEventListener("click", () => {
    const edited = normalizePayroll({
      ...data,
      documentTitle: titleInput.value.trim(),
      payrollMonth: monthInput.value,
      paymentDate: dateInput.value,
      grossPay: grossInput.value,
      totalDeductions: deductionInput.value,
      netPay: netInput.value,
      earnings: readAmountSection(earningsEditor),
      deductions: readAmountSection(deductionsEditor),
      work: readWorkSection(workEditor),
      transfers: readAmountSection(transfersEditor),
    });

    if (!edited.payrollMonth && !edited.paymentDate) {
      alert("給与の対象月か支給日のどちらかを入力してください");
      return;
    }
    if (edited.grossPay <= 0 && edited.netPay <= 0) {
      alert("総支給額または手取り額を確認してください");
      return;
    }

    if (mode === "edit") {
      const idx = payrollSlips.findIndex(s => s.id === data.id);
      if (idx >= 0) payrollSlips[idx] = edited;
      else payrollSlips.push(edited);
    } else {
      const dupIndex = edited.payrollMonth
        ? payrollSlips.findIndex(s => s.payrollMonth === edited.payrollMonth)
        : -1;
      if (dupIndex >= 0) {
        if (!confirm(`${formatPayrollMonth(edited)}の明細はすでに登録されています。\n新しい内容に置き換えますか？`)) return;
        edited.id = payrollSlips[dupIndex].id;
        payrollSlips[dupIndex] = edited;
      } else {
        payrollSlips.push(edited);
      }
    }

    savePayrollSlips();
    localStorage.setItem("payrollSelectedYear", getSlipYear(edited));
    closeSheet();
    renderPayrollView();
    showToast(mode === "edit" ? "給与明細を更新しました" : "給与明細を保存しました");
    onChangedCallback();
  });
}

function createField(parent, label, type, value) {
  const labelEl = document.createElement("label");
  labelEl.className = "field-label";
  labelEl.textContent = label;
  const input = document.createElement("input");
  input.type = type;
  input.value = value || "";
  parent.append(labelEl, input);
  return input;
}

function createCompactNumberField(parent, label, value) {
  const wrap = document.createElement("label");
  wrap.className = "payroll-total-field";
  const span = document.createElement("span");
  span.textContent = label;
  const input = document.createElement("input");
  input.type = "number";
  input.inputMode = "numeric";
  input.min = "0";
  input.value = toNumber(value) || "";
  wrap.append(span, input);
  parent.appendChild(wrap);
  return input;
}

function createAmountSection(parent, title, rows, namePlaceholder = "項目名") {
  const section = document.createElement("section");
  section.className = "payroll-editor-section";
  const head = document.createElement("div");
  head.className = "payroll-editor-section-head";
  const h = document.createElement("h3");
  h.textContent = title;
  const add = document.createElement("button");
  add.type = "button";
  add.textContent = "＋追加";
  head.append(h, add);

  const rowsWrap = document.createElement("div");
  rowsWrap.className = "payroll-editor-rows";
  section.append(head, rowsWrap);
  parent.appendChild(section);

  const appendRow = (row = { name: "", amount: 0 }) => {
    const el = document.createElement("div");
    el.className = "payroll-editor-row payroll-editor-row-amount";
    const name = document.createElement("input");
    name.type = "text";
    name.placeholder = namePlaceholder;
    name.className = "payroll-row-name";
    name.value = row.name || "";
    const amount = document.createElement("input");
    amount.type = "number";
    amount.inputMode = "numeric";
    amount.placeholder = "金額";
    amount.className = "payroll-row-value";
    amount.value = toNumber(row.amount);
    const del = document.createElement("button");
    del.type = "button";
    del.className = "payroll-row-delete";
    del.textContent = "✕";
    del.addEventListener("click", () => el.remove());
    el.append(name, amount, del);
    rowsWrap.appendChild(el);
  };

  (rows || []).forEach(appendRow);
  if (!rows?.length) appendRow();
  add.addEventListener("click", () => appendRow());
  return section;
}

function createWorkSection(parent, title, rows) {
  const section = document.createElement("section");
  section.className = "payroll-editor-section";
  const head = document.createElement("div");
  head.className = "payroll-editor-section-head";
  const h = document.createElement("h3");
  h.textContent = title;
  const add = document.createElement("button");
  add.type = "button";
  add.textContent = "＋追加";
  head.append(h, add);

  const rowsWrap = document.createElement("div");
  rowsWrap.className = "payroll-editor-rows";
  section.append(head, rowsWrap);
  parent.appendChild(section);

  const appendRow = (row = { name: "", value: "", unit: "" }) => {
    const el = document.createElement("div");
    el.className = "payroll-editor-row payroll-editor-row-work";
    const name = document.createElement("input");
    name.type = "text";
    name.placeholder = "勤務項目";
    name.className = "payroll-row-name";
    name.value = row.name || "";
    const value = document.createElement("input");
    value.type = "text";
    value.placeholder = "値";
    value.className = "payroll-row-value";
    value.value = row.value || "";
    const unit = document.createElement("input");
    unit.type = "text";
    unit.placeholder = "単位";
    unit.className = "payroll-row-unit";
    unit.value = row.unit || "";
    const del = document.createElement("button");
    del.type = "button";
    del.className = "payroll-row-delete";
    del.textContent = "✕";
    del.addEventListener("click", () => el.remove());
    el.append(name, value, unit, del);
    rowsWrap.appendChild(el);
  };

  (rows || []).forEach(appendRow);
  if (!rows?.length) appendRow();
  add.addEventListener("click", () => appendRow());
  return section;
}

function readAmountSection(section) {
  return [...section.querySelectorAll(".payroll-editor-row")]
    .map(row => ({
      name: row.querySelector(".payroll-row-name")?.value.trim() || "",
      amount: toNumber(row.querySelector(".payroll-row-value")?.value),
    }))
    .filter(row => row.name);
}

function readWorkSection(section) {
  return [...section.querySelectorAll(".payroll-editor-row")]
    .map(row => ({
      name: row.querySelector(".payroll-row-name")?.value.trim() || "",
      value: row.querySelector(".payroll-row-value")?.value.trim() || "",
      unit: row.querySelector(".payroll-row-unit")?.value.trim() || "",
    }))
    .filter(row => row.name);
}

// ===================================
// 詳細シート
// ===================================
function showPayrollDetail(id) {
  document.getElementById("payrollDetailOverlay")?.remove();
  const slip = payrollSlips.find(s => s.id === id);
  if (!slip) return;

  const overlay = document.createElement("div");
  overlay.id = "payrollDetailOverlay";
  overlay.className = "payroll-sheet-overlay";
  const sheet = document.createElement("div");
  sheet.className = "payroll-sheet";

  const header = document.createElement("div");
  header.className = "payroll-sheet-header payroll-detail-header";
  const edit = document.createElement("button");
  edit.type = "button";
  edit.className = "payroll-header-action";
  edit.textContent = "編集";
  const title = document.createElement("strong");
  title.textContent = formatPayrollMonth(slip);
  const close = document.createElement("button");
  close.type = "button";
  close.className = "modal-close";
  close.textContent = "✕";
  header.append(edit, title, close);

  const body = document.createElement("div");
  body.className = "payroll-sheet-body";

  const meta = document.createElement("div");
  meta.className = "payroll-detail-meta";
  const docTitle = document.createElement("strong");
  docTitle.textContent = slip.documentTitle || "給与明細";
  const payDate = document.createElement("span");
  payDate.textContent = slip.paymentDate ? `支給日 ${formatDate(slip.paymentDate)}` : "支給日 未登録";
  meta.append(docTitle, payDate);
  body.appendChild(meta);

  const totals = document.createElement("div");
  totals.className = "payroll-detail-totals";
  totals.append(
    createDetailTotal("総支給", slip.grossPay),
    createDetailTotal("控除合計", slip.totalDeductions),
    createDetailTotal("手取り", slip.netPay, true),
  );
  body.appendChild(totals);

  appendDetailRows(body, "支給", slip.earnings, row => yen(row.amount));
  appendDetailRows(body, "控除", slip.deductions, row => yen(row.amount));
  appendDetailRows(body, "勤務実績", slip.work, row => `${row.value || "-"}${row.unit ? ` ${row.unit}` : ""}`);
  appendDetailRows(body, "振込先", slip.transfers, row => yen(row.amount));

  if (slip.notes?.length) {
    const section = document.createElement("section");
    section.className = "payroll-detail-section";
    const h = document.createElement("h3");
    h.textContent = "注記";
    section.appendChild(h);
    slip.notes.forEach(note => {
      const p = document.createElement("p");
      p.className = "payroll-note-row";
      p.textContent = note;
      section.appendChild(p);
    });
    body.appendChild(section);
  }

  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.className = "btn-danger payroll-delete-btn";
  deleteBtn.textContent = "この給与明細を削除";
  body.appendChild(deleteBtn);

  sheet.append(header, body);
  overlay.appendChild(sheet);
  document.body.appendChild(overlay);

  const closeSheet = () => overlay.remove();
  close.addEventListener("click", closeSheet);
  overlay.addEventListener("click", e => { if (e.target === overlay) closeSheet(); });
  edit.addEventListener("click", () => {
    closeSheet();
    showPayrollEditor(slip, { mode: "edit" });
  });
  deleteBtn.addEventListener("click", () => {
    if (!confirm(`${formatPayrollMonth(slip)}の給与明細を削除しますか？`)) return;
    const idx = payrollSlips.findIndex(s => s.id === id);
    if (idx >= 0) payrollSlips.splice(idx, 1);
    savePayrollSlips();
    closeSheet();
    renderPayrollView();
    showToast("給与明細を削除しました");
    onChangedCallback();
  });
}

function createDetailTotal(label, value, emphasized = false) {
  const el = document.createElement("div");
  el.className = "payroll-detail-total" + (emphasized ? " payroll-detail-total-emphasis" : "");
  const l = document.createElement("span");
  l.textContent = label;
  const v = document.createElement("strong");
  v.textContent = yen(value);
  el.append(l, v);
  return el;
}

function appendDetailRows(parent, title, rows, valueFormatter) {
  if (!Array.isArray(rows) || rows.length === 0) return;
  const section = document.createElement("section");
  section.className = "payroll-detail-section";
  const h = document.createElement("h3");
  h.textContent = title;
  section.appendChild(h);

  rows.forEach(row => {
    const line = document.createElement("div");
    line.className = "payroll-detail-row";
    const name = document.createElement("span");
    name.textContent = row.name || "-";
    const value = document.createElement("strong");
    value.textContent = valueFormatter(row);
    line.append(name, value);
    section.appendChild(line);
  });
  parent.appendChild(section);
}

// ===================================
// Helpers
// ===================================
function createId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `payroll_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function cleanText(value) {
  if (value === null || value === undefined) return "";
  return String(value).replace(/[\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim();
}

function toNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, Math.round(value));
  if (value === null || value === undefined || value === "") return 0;
  const n = Number(String(value).replace(/[¥￥円,，\s]/g, "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0;
}

function normalizeDate(value) {
  const text = cleanText(value);
  const era = parseJapaneseEra(text);
  if (era && era.day) {
    return `${era.year}-${String(era.month).padStart(2, "0")}-${String(era.day).padStart(2, "0")}`;
  }
  const m = text.match(/(\d{4})[-/.年](\d{1,2})[-/.月](\d{1,2})/);
  if (!m) return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "";
  return `${m[1]}-${String(Number(m[2])).padStart(2, "0")}-${String(Number(m[3])).padStart(2, "0")}`;
}

function normalizeMonth(value) {
  const text = cleanText(value);
  const era = parseJapaneseEra(text);
  if (era) return `${era.year}-${String(era.month).padStart(2, "0")}`;
  const m = text.match(/(\d{4})[-/.年](\d{1,2})/);
  if (!m) return /^\d{4}-\d{2}$/.test(text) ? text : "";
  return `${m[1]}-${String(Number(m[2])).padStart(2, "0")}`;
}

function parseJapaneseEra(text) {
  const m = String(text || "").match(/(令和|平成)\s*(元|\d+)\s*年\s*(\d{1,2})\s*月(?:\s*(\d{1,2})\s*日)?/);
  if (!m) return null;
  const eraYear = m[2] === "元" ? 1 : Number(m[2]);
  const base = m[1] === "令和" ? 2018 : 1988;
  return { year: base + eraYear, month: Number(m[3]), day: m[4] ? Number(m[4]) : 0 };
}

function getSlipYear(slip) {
  return (slip.payrollMonth || slip.paymentDate || "").slice(0, 4);
}

function getSortKey(slip) {
  return slip.paymentDate || `${slip.payrollMonth || "0000-00"}-01` || slip.importedAt || "";
}

function formatPayrollMonth(slip) {
  const ym = slip.payrollMonth || (slip.paymentDate ? slip.paymentDate.slice(0, 7) : "");
  const m = ym.match(/^(\d{4})-(\d{2})$/);
  return m ? `${Number(m[1])}年${Number(m[2])}月` : "給与明細";
}

function formatDate(date) {
  const m = String(date || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${Number(m[1])}/${Number(m[2])}/${Number(m[3])}` : date || "";
}

function yen(value) {
  return `¥${toNumber(value).toLocaleString("ja-JP")}`;
}
