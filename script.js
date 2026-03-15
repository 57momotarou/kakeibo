document.addEventListener("DOMContentLoaded", () => {

// ===================================
// スプラッシュ画面
// ===================================
(function initSplash() {
  const splash   = document.getElementById("splashScreen");
  const splashText = document.getElementById("splashText");

  // 保存済みテーマカラーを取得してスプラッシュに即時反映
  const savedColor = localStorage.getItem("themeColor") || "#4caf50";
  splash.style.background = savedColor;

  // 背景が白系かどうか判定（輝度が高い＝白に近い）
  function isLightColor(hex) {
    const c = hex.replace("#", "");
    const r = parseInt(c.length === 3 ? c[0]+c[0] : c.slice(0,2), 16);
    const g = parseInt(c.length === 3 ? c[1]+c[1] : c.slice(2,4), 16);
    const b = parseInt(c.length === 3 ? c[2]+c[2] : c.slice(4,6), 16);
    // 輝度計算（0〜255）
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
    return luminance > 200; // 200以上は白系と判定
  }

  if (isLightColor(savedColor)) {
    splash.classList.add("dark-text");
  }

  // 0.8秒後にフェードアウト → 完了後に非表示
  setTimeout(() => {
    splash.classList.add("fade-out");
    splash.addEventListener("transitionend", () => {
      splash.classList.add("hidden");
    }, { once: true });
  }, 800);
})();

// ===================================
// データの読み込み（最初に全部定義）
// ===================================
let records    = JSON.parse(localStorage.getItem("records"))    || [];
let categories = JSON.parse(localStorage.getItem("categories")) || [
  { name: "食費",   type: "expense" },
  { name: "日用品", type: "expense" },
  { name: "交通",   type: "expense" },
  { name: "家賃",   type: "expense" },
  { name: "その他", type: "both"    },
  { name: "給与",   type: "income"  },
];
let periodStartDay = Number(localStorage.getItem("periodStartDay")) || 1;
let themeColor     = localStorage.getItem("themeColor") || "#4caf50";
let editingRecord  = null;
let periodListenerAdded = false;

// タブ表示設定（カレンダーはデフォルト非表示）
const DEFAULT_TAB_VISIBILITY = { calendar: false, account: true };
let tabVisibility = JSON.parse(localStorage.getItem("tabVisibility")) || DEFAULT_TAB_VISIBILITY;

function saveTabVisibility() {
  localStorage.setItem("tabVisibility", JSON.stringify(tabVisibility));
}

// ===================================
// 要素の取得
// ===================================
const list             = document.getElementById("list");
const monthSelector    = document.getElementById("monthSelector");
const topBarNormal     = document.getElementById("topBarNormal");
const topBarSettings   = document.getElementById("topBarSettings");
const settingsBarTitle = document.getElementById("settingsBarTitle");
const openAddBtn       = document.getElementById("openAddBtn");
const openSettingsBtn  = document.getElementById("openSettingsBtn");
const backBtn          = document.getElementById("backBtn");
const closeAddBtn      = document.getElementById("closeAddBtn");
const addOverlay       = document.getElementById("addOverlay");
const addModal         = document.getElementById("addModal");
const dateInput        = document.getElementById("date");
const amountInput      = document.getElementById("amount");
const addTypeToggle    = document.getElementById("addTypeToggle");
const addTypeHidden    = document.getElementById("addTypeHidden");
const categorySelect   = document.getElementById("category");
const memoInput        = document.getElementById("memo");
const addButton        = document.getElementById("addButton");
const closeEditBtn     = document.getElementById("closeEditBtn");
const editOverlay      = document.getElementById("editOverlay");
const editModal        = document.getElementById("editModal");
const editDateInput    = document.getElementById("editDate");
const editAmountInput  = document.getElementById("editAmount");
const editTypeInput    = document.getElementById("editType");
const editCatSelect    = document.getElementById("editCategory");
const editMemoInput    = document.getElementById("editMemo");
const saveEditButton   = document.getElementById("saveEditButton");
const editTypeToggle   = document.getElementById("editTypeToggle");

// ===================================
// 保存
// ===================================
function saveRecords()    { localStorage.setItem("records",    JSON.stringify(records));    }
function saveCategories() { localStorage.setItem("categories", JSON.stringify(categories)); }

// ===================================
// 集計期間
// ===================================
function getPeriodRange(yearMonth) {
  const [year, month] = yearMonth.split("-").map(Number);
  if (periodStartDay === 1) {
    const lastDay = new Date(year, month, 0).getDate();
    return {
      start: `${yearMonth}-01`,
      end:   `${yearMonth}-${String(lastDay).padStart(2, "0")}`,
    };
  }
  const startStr = `${year}-${String(month).padStart(2,"0")}-${String(periodStartDay).padStart(2,"0")}`;
  const endMonth = month === 12 ? 1 : month + 1;
  const endYear  = month === 12 ? year + 1 : year;
  const endStr   = `${endYear}-${String(endMonth).padStart(2,"0")}-${String(periodStartDay - 1).padStart(2,"0")}`;
  return { start: startStr, end: endStr };
}

function filterByPeriod(yearMonth) {
  const { start, end } = getPeriodRange(yearMonth);
  return records.filter(r => r.date >= start && r.date <= end);
}

// ===================================
// テーマカラー
// ===================================
const PRESET_COLORS = [
  { label: "グリーン",   color: "#4caf50" },
  { label: "ブルー",     color: "#2196f3" },
  { label: "パープル",   color: "#9c27b0" },
  { label: "オレンジ",   color: "#ff9800" },
  { label: "レッド",     color: "#f44336" },
  { label: "ティール",   color: "#009688" },
  { label: "インディゴ", color: "#3f51b5" },
  { label: "ブラウン",   color: "#795548" },
];

function darkenColor(hex, amount) {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.max(0, (num >> 16) - amount);
  const g = Math.max(0, ((num >> 8) & 0xff) - amount);
  const b = Math.max(0, (num & 0xff) - amount);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

function applyThemeColor(color) {
  themeColor = color;
  document.documentElement.style.setProperty("--theme", color);
  document.documentElement.style.setProperty("--theme-dark", darkenColor(color, 20));
  localStorage.setItem("themeColor", color);
  const bar = document.getElementById("themePreviewBar");
  if (bar) bar.style.background = color;
  document.querySelectorAll(".color-swatch").forEach(sw => {
    sw.classList.toggle("selected", sw.dataset.color === color);
  });
}

function renderColorPresets() {
  const container = document.getElementById("colorPresets");
  container.innerHTML = "";
  PRESET_COLORS.forEach(({ label, color }) => {
    const btn = document.createElement("button");
    btn.className = "color-swatch";
    btn.dataset.color = color;
    btn.style.background = color;
    btn.title = label;
    btn.innerHTML = `<span class="swatch-check">✓</span><span class="swatch-label">${label}</span>`;
    if (color === themeColor) btn.classList.add("selected");
    btn.addEventListener("click", () => applyThemeColor(color));
    container.appendChild(btn);
  });
  const bar = document.getElementById("themePreviewBar");
  if (bar) bar.style.background = themeColor;
}

document.getElementById("applyCustomColor").addEventListener("click", () => {
  applyThemeColor(document.getElementById("customColorPicker").value);
});

applyThemeColor(themeColor);

// ===================================
// カテゴリプルダウン更新
// ===================================
function updateCategoryOptions(type, catEl, currentValue) {
  catEl.innerHTML = "";
  categories
    .filter(c => c.type === type || c.type === "both")
    .forEach(c => {
      const opt = document.createElement("option");
      opt.value = c.name;
      opt.textContent = c.name;
      if (currentValue && c.name === currentValue) opt.selected = true;
      catEl.appendChild(opt);
    });
}

// ===================================
// 画面スタック管理
// ===================================
let viewStack = ["home"];

const VIEW_CONFIG = {
  home:        { el: document.getElementById("homeView"),        title: null,             showTabs: true  },
  transaction: { el: document.getElementById("transactionView"), title: null,             showTabs: true  },
  calendar:    { el: document.getElementById("calendarView"),    title: null,             showTabs: true  },
  graph:       { el: document.getElementById("graphView"),       title: null,             showTabs: true  },
  account:     { el: document.getElementById("accountView"),     title: null,             showTabs: true  },
  settings:    { el: document.getElementById("settingsView"),    title: "設定",           showTabs: false },
  category:    { el: document.getElementById("categoryView"),    title: "カテゴリ変更",   showTabs: false },
  theme:       { el: document.getElementById("themeView"),       title: "テーマカラー",   showTabs: false },
  period:      { el: document.getElementById("periodView"),      title: "集計期間",       showTabs: false },
  budget:      { el: document.getElementById("budgetView"),      title: "予算設定",       showTabs: false },
  visibility:  { el: document.getElementById("visibilityView"),  title: "表示 / 非表示", showTabs: false },
};

function navigate(viewName) {
  VIEW_CONFIG[viewStack[viewStack.length - 1]].el.classList.remove("active");
  viewStack.push(viewName);
  showCurrentView();
}

function goBack() {
  if (viewStack.length <= 1) return;
  VIEW_CONFIG[viewStack[viewStack.length - 1]].el.classList.remove("active");
  viewStack.pop();
  showCurrentView();
}

function showCurrentView() {
  const name   = viewStack[viewStack.length - 1];
  const config = VIEW_CONFIG[name];
  config.el.classList.add("active");

  const isMain = ["home","transaction","calendar","graph","account"].includes(name);
  topBarNormal.classList.toggle("hidden", !isMain);
  topBarSettings.classList.toggle("hidden", isMain);
  if (!isMain) settingsBarTitle.textContent = config.title;

  const monthNav        = document.getElementById("topBarMonthNav");
  const homeTitleEl     = document.getElementById("topBarHomeTitle");
  const calShortcutBtn  = document.getElementById("calendarShortcutBtn");
  const calBackBtn      = document.getElementById("calendarBackBtn");
  const spacer          = document.getElementById("topBarSpacer");

  if (isMain) {
    const isTransaction = (name === "transaction");
    const isHome        = (name === "home");
    const isCalendar    = (name === "calendar");
    const showNav       = (name === "graph");

    calShortcutBtn.style.display = isTransaction ? "" : "none";
    calBackBtn.style.display     = isCalendar    ? "" : "none";
    monthNav.style.display       = showNav       ? "" : "none";
    homeTitleEl.style.display    = isHome        ? "" : "none";
    spacer.style.display         = !showNav      ? "" : "none";
  }

  document.getElementById("tabBar").classList.toggle("hidden", !config.showTabs);
  openAddBtn.classList.toggle("hidden", !config.showTabs);

  if (name === "transaction") render();
  if (name === "calendar")    renderCalendar();
  if (name === "category")    renderCategoryView();
  if (name === "theme")       renderColorPresets();
  if (name === "graph")       renderGraph();
  if (name === "period")      renderPeriodView();
  if (name === "account")     renderAccountView();
  if (name === "visibility")  renderVisibilityView();
  if (name === "budget")      renderBudgetView();

  applyTabVisibility();
  document.getElementById("homeTab").classList.toggle("active",        name === "home");
  document.getElementById("transactionTab").classList.toggle("active", name === "transaction");
  document.getElementById("graphTab").classList.toggle("active",       name === "graph");
  document.getElementById("accountTab").classList.toggle("active",     name === "account");
}

backBtn.addEventListener("click", goBack);
openSettingsBtn.addEventListener("click", () => navigate("settings"));
// 出入金バー左端のカレンダーボタン → カレンダー画面に遷移
document.getElementById("calendarShortcutBtn").addEventListener("click", () => switchToTab("calendar"));
// カレンダーバー左端の「←」→ 出入金に戻る
document.getElementById("calendarBackBtn").addEventListener("click",    () => switchToTab("transaction"));
document.getElementById("goCategory").addEventListener("click",   () => navigate("category"));
document.getElementById("goTheme").addEventListener("click",      () => navigate("theme"));
document.getElementById("goPeriod").addEventListener("click",     () => navigate("period"));
document.getElementById("goVisibility").addEventListener("click", () => navigate("visibility"));
document.getElementById("goBudget").addEventListener("click",     () => navigate("budget"));

function switchToTab(name) {
  viewStack.forEach(v => VIEW_CONFIG[v].el.classList.remove("active"));
  viewStack = [name];
  showCurrentView();
}
document.getElementById("homeTab").addEventListener("click",        () => switchToTab("home"));
document.getElementById("transactionTab").addEventListener("click", () => switchToTab("transaction"));
document.getElementById("graphTab").addEventListener("click",       () => switchToTab("graph"));
document.getElementById("accountTab").addEventListener("click",     () => switchToTab("account"));

// ===================================
// モーダル共通
// ===================================
function showModal(modal, overlay) {
  modal.classList.remove("hidden");
  overlay.classList.remove("hidden");
  requestAnimationFrame(() => {
    modal.classList.add("show");
    overlay.classList.add("show");
  });
}

function hideModal(modal, overlay) {
  modal.classList.remove("show");
  overlay.classList.remove("show");
  setTimeout(() => {
    modal.classList.add("hidden");
    overlay.classList.add("hidden");
  }, 250);
}

// ===================================
// 追加モーダル
// ===================================
function openAddModal(prefill) {
  dateInput.value     = prefill?.date    || new Date().toISOString().slice(0, 10);
  amountInput.value   = prefill?.amount  || "";
  memoInput.value     = prefill?.title   || "";
  const type          = prefill?.type    || "expense";
  addTypeHidden.value = type;
  addTypeToggle.querySelectorAll(".type-toggle-btn").forEach(b => {
    b.classList.toggle("active", b.dataset.value === type);
  });
  updateCategoryOptions(type, categorySelect, prefill?.category);
  showModal(addModal, addOverlay);
}

addTypeToggle.addEventListener("click", e => {
  const btn = e.target.closest(".type-toggle-btn");
  if (!btn) return;
  const val = btn.dataset.value;
  addTypeToggle.querySelectorAll(".type-toggle-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  addTypeHidden.value = val;
  updateCategoryOptions(val, categorySelect);
});

closeAddBtn.addEventListener("click",  () => hideModal(addModal, addOverlay));
addOverlay.addEventListener("click",   () => hideModal(addModal, addOverlay));

addButton.addEventListener("click", () => {
  if (!dateInput.value || amountInput.value === "") {
    alert("日付と金額を入力してください");
    return;
  }
  records.push({
    date:     dateInput.value,
    amount:   Number(amountInput.value),
    type:     addTypeHidden.value,
    category: categorySelect.value,
    title:    memoInput.value.trim() || categorySelect.value,
  });
  saveRecords();
  render();
  hideModal(addModal, addOverlay);
});

// ===================================
// FABメニュー（展開アニメーション）
// ===================================
const fabMenu    = document.getElementById("fabMenu");
const fabOverlay = document.getElementById("fabOverlay");
let fabOpen = false;

function openFabMenu() {
  fabOpen = true;
  openAddBtn.classList.add("fab-open");
  fabMenu.classList.add("open");
  fabOverlay.classList.remove("hidden");
  fabOverlay.classList.add("show");
}

function closeFabMenu() {
  fabOpen = false;
  openAddBtn.classList.remove("fab-open");
  fabMenu.classList.remove("open");
  fabOverlay.classList.remove("show");
  setTimeout(() => fabOverlay.classList.add("hidden"), 200);
}

openAddBtn.addEventListener("click", () => {
  fabOpen ? closeFabMenu() : openFabMenu();
});

fabOverlay.addEventListener("click", closeFabMenu);

// 手動入力ボタン
document.getElementById("fabManualBtn").addEventListener("click", () => {
  closeFabMenu();
  setTimeout(() => openAddModal(), 200);
});

// ===================================
// レシート読み取り（Google Cloud Vision API）
// ===================================
const VISION_API_KEY = "AIzaSyCK2LY5QwBCWPd7xhc-7Gh3RetAaZApnmo";
const receiptInput   = document.getElementById("receiptInput");
const scanOverlay    = document.getElementById("scanOverlay");

document.getElementById("fabCameraBtn").addEventListener("click", () => {
  closeFabMenu();
  setTimeout(() => receiptInput.click(), 200);
});

receiptInput.addEventListener("change", async e => {
  const file = e.target.files[0];
  if (!file) return;
  receiptInput.value = ""; // 同じファイルを再選択できるようリセット

  // ローディング表示
  scanOverlay.classList.remove("hidden");

  try {
    // 画像をBase64に変換
    const base64 = await fileToBase64(file);

    // Vision APIを呼び出し
    const result = await callVisionAPI(base64);

    // テキストから商品一覧を抽出
    const parsed = parseReceipt(result);

    scanOverlay.classList.add("hidden");

    if (parsed.items.length === 0) {
      alert("商品を読み取れませんでした。手動で入力してください。");
      openAddModal({ date: parsed.date, category: parsed.category, type: "expense" });
      return;
    }

    // 商品数にかかわらず選択UIを表示
    showItemSelector(parsed.items, parsed.date, parsed.category);

  } catch (err) {
    scanOverlay.classList.add("hidden");
    console.error(err);
    alert("エラー詳細:\n" + err.message + "\n\n" + err.stack);
  }
});

// ファイル→Base64変換
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Vision API呼び出し
async function callVisionAPI(base64Image) {
  const res = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${VISION_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: [{
          image:    { content: base64Image },
          features: [{ type: "TEXT_DETECTION", maxResults: 1 }],
        }],
      }),
    }
  );
  if (!res.ok) throw new Error(`Vision API error: ${res.status}`);
  const data = await res.json();
  return data.responses[0]?.fullTextAnnotation?.text || "";
}

// テキストからレシートの商品一覧を解析
function parseReceipt(text) {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);

  const skipPattern = /合計|小計|税|お釣|おつり|預り|お預|ポイント|値引|割引|total|subtotal|change|TEL|電話|登録|QUICPay|paypay|交通系|クレジット|お支払|レジ|No\.|領収|公式|検索|通販|オンライン|^\*|^-|登録番号|だいぞう|ハッピー|LINE|パラダイス|スタンプ|楽曲/i;

  // ¥金額・\金額 の行かどうか判定（内・外・括弧付きも対応）
  const isAmountLine = l =>
    /^[¥￥\\]\s*[\d,]+\s*(?:内|外|込|税抜|税込)?\)?\s*$/.test(l) ||
    /^[¥￥\\]\s*\d[\d,\s]*\)?\s*$/.test(l);

  // 商品名行かどうか判定
  const isNameLine = l =>
    !skipPattern.test(l) &&
    l.length >= 2 &&
    !/^\d/.test(l) &&                    // 数字始まりを除外
    !/^[¥￥\\*＊<>(（▼\-]/.test(l) &&    // 記号・値引き始まりを除外
    !/^\(/.test(l) &&                    // 括弧始まりを除外
    !/\\?\d+\)/.test(l) &&              // \162) のようなパターンを除外
    !isAmountLine(l);

  // --- パターンA: 商品名グループ → 金額グループが連続するレイアウト ---
  // skipPatternの行を先に除外してから処理（「小計」などがブロックを分断しないよう）
  // ※値引き行（▼・-始まり）は除外せず残しておく
  const filtered = lines.filter(l => !skipPattern.test(l));
  const items = [];

  let i = 0;
  while (i < filtered.length) {
    const nameBlock = [];
    while (i < filtered.length && isNameLine(filtered[i])) {
      nameBlock.push(filtered[i]);
      i++;
    }
    const amountBlock = [];
    while (i < filtered.length && isAmountLine(filtered[i])) {
      const m = filtered[i].match(/(\d[\d,]*)/);
      if (m) amountBlock.push(parseInt(m[1].replace(/,/g, ""), 10));
      i++;
    }

    // 値引きブロック（▼〇〇引き → -198 のペア）を検出して合算
    let discountTotal = 0;
    while (i < filtered.length) {
      const l = filtered[i];
      // 値引き名行（▼始まり）
      if (/^▼/.test(l)) { i++; continue; }
      // 値引き額行（-数字 または ¥-数字）
      const discountMatch = l.match(/^[-－]\s*(\d[\d,]*)\s*$/) ||
                            l.match(/^[¥￥]\s*[-－]\s*(\d[\d,]*)\s*$/);
      if (discountMatch) {
        discountTotal += parseInt(discountMatch[1].replace(/,/g, ""), 10);
        i++;
        continue;
      }
      break;
    }

    if (nameBlock.length > 0 && amountBlock.length > 0) {
      const useNames = nameBlock.length >= amountBlock.length
        ? nameBlock.slice(nameBlock.length - amountBlock.length)
        : nameBlock;
      const useAmounts = amountBlock.slice(0, useNames.length);

      useNames.forEach((name, idx) => {
        const cleanName = name.replace(/\s+\d+\s*$/, "").trim();
        let val = useAmounts[idx];
        // 最後の商品に値引き分を適用
        if (idx === useNames.length - 1 && discountTotal > 0) {
          val = Math.max(0, val - discountTotal);
        }
        if (cleanName.length >= 2 && val >= 10 && val <= 100000) {
          items.push({ title: cleanName, amount: val });
        }
      });
    }
    if (nameBlock.length === 0 && amountBlock.length === 0) i++;
  }

  // --- パターンBにフォールバック: 同一行に「商品名 ¥金額」 ---
  if (items.length === 0) {
    for (const line of lines) {
      if (skipPattern.test(line)) continue;
      const m = line.match(/^(.+?)\s+[¥￥]\s*(\d[\d,]*)\s*(?:外|込)?$/);
      if (m) {
        const name = m[1].replace(/\s+\d+\s*$/, "").trim();
        const val  = parseInt(m[2].replace(/,/g, ""), 10);
        if (name.length >= 2 && !/^\d+$/.test(name) && val >= 10 && val <= 100000) {
          items.push({ title: name, amount: val });
        }
      }
    }
  }

  // ---- 日付を探す ----
  let date = new Date().toISOString().slice(0, 10);
  const datePatterns = [
    /(\d{4})[\/\-年](\d{1,2})[\/\-月](\d{1,2})/,
    /(\d{2})[\/\-年](\d{1,2})[\/\-月](\d{1,2})/,
    /(\d{1,2})月(\d{1,2})日/,
  ];
  for (const line of lines) {
    for (const pat of datePatterns) {
      const m = line.match(pat);
      if (m) {
        try {
          let y = m[1].length === 2 ? "20" + m[1] : m[1];
          if (pat.source.includes("月")) y = new Date().getFullYear().toString();
          const mo = String(parseInt(m[2] || m[1])).padStart(2, "0");
          const d  = String(parseInt(m[3] || m[2])).padStart(2, "0");
          date = `${y}-${mo}-${d}`;
        } catch {}
        break;
      }
    }
    if (date !== new Date().toISOString().slice(0, 10)) break;
  }

  // ---- カテゴリを推測 ----
  const shopKeywords = {
    "食費":   /スーパー|コンビニ|セイコーマート|セブン|ローソン|ファミマ|食品|フード|レストラン|食堂|弁当|惣菜|肉|魚|野菜|果物|パン|スタバ|マック|吉野家|すき家|サイゼ/i,
    "日用品": /ドラッグ|薬局|ホームセンター|ダイソー|百均|ニトリ|雑貨|文具|日用/i,
    "交通":   /ガソリン|駐車|バス|電車|タクシー|JR|高速|スタンド/i,
    "家賃":   /家賃|管理費|光熱|電気|ガス|水道/i,
  };
  let category = "その他";
  for (const [cat, pat] of Object.entries(shopKeywords)) {
    if (pat.test(text)) { category = cat; break; }
  }

  // ---- 内税・外税の判別 ----
  // 「¥〇〇内」「税込」が1行でもあれば内税レシートと判定
  const hasTaxIn  = lines.some(l => /[¥￥\\]\s*[\d,]+\s*内\s*$/.test(l) || /税込対象額|内税/.test(l));
  // 「¥〇〇外」が1行でもあれば外税レシートと判定
  const hasTaxOut = lines.some(l => /[¥￥\\]\s*[\d,]+\s*外\s*$/.test(l) || /税抜対象額|外税/.test(l));

  // 内税のみのレシートはスキップ、それ以外（外税・不明・両方）は税額を追加
  if (!hasTaxIn || hasTaxOut) {
    let taxTotal = 0;
    for (let j = 0; j < lines.length; j++) {
      const line = lines[j];
      if (/\d+%税額|消費税額|外税額/.test(line)) {
        const mInline = line.match(/[¥￥\\]\s*(\d[\d,]*)/);
        if (mInline) { taxTotal += parseInt(mInline[1].replace(/,/g, ""), 10); continue; }
        const nextLine = lines[j + 1] || "";
        const mNext = nextLine.match(/^[¥￥\\]\s*(\d[\d,\s]*)\)?\s*$/);
        if (mNext) taxTotal += parseInt(mNext[1].replace(/[,\s]/g, ""), 10);
      }
    }
    if (taxTotal > 0) items.push({ title: "外税", amount: taxTotal });
  }

  return { items, date, category };
}

// 商品選択UIを表示（チェックボックス一括選択・一括保存）
function showItemSelector(items, date, category) {
  const existing = document.getElementById("itemSelectorOverlay");
  if (existing) existing.remove();

  const overlay = document.createElement("div");
  overlay.id = "itemSelectorOverlay";
  overlay.style.cssText = `
    position:fixed;inset:0;background:rgba(0,0,0,0.5);
    z-index:350;display:flex;align-items:flex-end;
  `;

  const sheet = document.createElement("div");
  sheet.style.cssText = `
    background:#f5f5f5;width:100%;border-radius:20px 20px 0 0;
    max-height:80vh;display:flex;flex-direction:column;
  `;

  // ヘッダー
  const header = document.createElement("div");
  header.style.cssText = `
    display:flex;align-items:center;justify-content:space-between;
    padding:16px 20px 12px;border-bottom:1px solid #e0e0e0;
    background:#fff;border-radius:20px 20px 0 0;flex-shrink:0;
  `;
  header.innerHTML = `
    <button id="toggleAllCheck" style="font-size:13px;color:var(--theme,#4caf50);
      background:none;border:none;cursor:pointer;padding:0;font-weight:bold;">全選択</button>
    <span style="font-size:16px;font-weight:bold;">レシートの品目一覧</span>
    <button id="closeItemSelector" style="width:32px;height:32px;border-radius:50%;
      border:none;background:#f0f0f0;font-size:14px;cursor:pointer;
      display:flex;align-items:center;justify-content:center;">✕</button>
  `;
  sheet.appendChild(header);

  // スクロール可能なリスト
  const listWrap = document.createElement("div");
  listWrap.style.cssText = "overflow-y:auto;flex:1;";

  // 合計表示行
  const totalRow = document.createElement("div");
  totalRow.style.cssText = `
    display:flex;justify-content:space-between;align-items:center;
    padding:10px 20px;background:#fff;border-bottom:1px solid #e8e8e8;
    font-size:13px;color:#666;
  `;
  totalRow.innerHTML = `<span>合計金額</span><span id="selectedTotal" style="font-weight:bold;color:#222;">¥0</span>`;
  listWrap.appendChild(totalRow);

  // 商品リスト（チェックボックス付き）
  const ul = document.createElement("ul");
  ul.style.cssText = "list-style:none;padding:0;margin:0;";
  const checkboxes = [];

  items.forEach((item, idx) => {
    const li = document.createElement("li");
    li.style.cssText = `
      display:flex;align-items:center;gap:12px;
      padding:13px 20px;background:#fff;border-bottom:1px solid #f0f0f0;
      cursor:pointer;
    `;

    const cb = document.createElement("input");
    cb.type    = "checkbox";
    cb.checked = true;
    cb.style.cssText = "width:20px;height:20px;flex-shrink:0;accent-color:var(--theme,#4caf50);cursor:pointer;";
    checkboxes.push(cb);

    const label = document.createElement("div");
    label.style.cssText = "flex:1;min-width:0;";
    label.innerHTML = `
      <div style="font-size:14px;font-weight:bold;color:#222;
        overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${item.title}</div>
      <div style="font-size:12px;color:#999;margin-top:2px;">${category}</div>
    `;

    const amountSpan = document.createElement("span");
    amountSpan.style.cssText = "font-size:15px;font-weight:bold;color:#c62828;white-space:nowrap;flex-shrink:0;";
    amountSpan.textContent = `¥${item.amount.toLocaleString()}`;

    // 行タップでチェック切り替え
    li.addEventListener("click", e => {
      if (e.target !== cb) cb.checked = !cb.checked;
      updateTotal();
    });
    cb.addEventListener("click", e => {
      e.stopPropagation();
      updateTotal();
    });

    li.appendChild(cb);
    li.appendChild(label);
    li.appendChild(amountSpan);
    ul.appendChild(li);
  });

  listWrap.appendChild(ul);
  sheet.appendChild(listWrap);

  // 合計更新関数
  function updateTotal() {
    const total = items.reduce((s, item, i) => s + (checkboxes[i].checked ? item.amount : 0), 0);
    const count = checkboxes.filter(c => c.checked).length;
    document.getElementById("selectedTotal").textContent = `¥${total.toLocaleString()}（${count}点）`;
    // 全選択ボタンのテキスト更新
    const allChecked = checkboxes.every(c => c.checked);
    const toggleBtn = document.getElementById("toggleAllCheck");
    if (toggleBtn) toggleBtn.textContent = allChecked ? "全解除" : "全選択";
  }
  // updateTotalはDOM追加後（下部）で呼ぶ

  // 保存ボタン
  const saveBtn = document.createElement("button");
  saveBtn.style.cssText = `
    width:calc(100% - 32px);margin:12px 16px 32px;height:50px;
    background:var(--theme,#4caf50);color:#fff;border:none;border-radius:12px;
    font-size:16px;font-weight:bold;cursor:pointer;flex-shrink:0;
  `;
  saveBtn.textContent = "保存する";
  sheet.appendChild(saveBtn);

  // 全選択/全解除
  header.querySelector("#toggleAllCheck").addEventListener("click", () => {
    const allChecked = checkboxes.every(c => c.checked);
    checkboxes.forEach(c => c.checked = !allChecked);
    updateTotal();
  });

  // 保存処理（選択した商品を一括追加）
  saveBtn.addEventListener("click", () => {
    const selected = items.filter((_, i) => checkboxes[i].checked);
    if (selected.length === 0) { alert("商品を1つ以上選択してください"); return; }
    selected.forEach(item => {
      records.push({
        date,
        amount:   item.amount,
        type:     "expense",
        category,
        title:    item.title,
      });
    });
    saveRecords();
    render();
    overlay.remove();
    // 追加完了トースト表示
    showToast(`${selected.length}件を追加しました`);
  });

  header.querySelector("#closeItemSelector").addEventListener("click", () => overlay.remove());
  overlay.addEventListener("click", e => { if (e.target === overlay) overlay.remove(); });

  overlay.appendChild(sheet);
  document.body.appendChild(overlay);

  // DOM追加後に合計を初期化
  updateTotal();
}

// トースト通知
function showToast(msg) {
  const t = document.createElement("div");
  t.textContent = msg;
  t.style.cssText = `
    position:fixed;bottom:90px;left:50%;transform:translateX(-50%);
    background:rgba(0,0,0,0.75);color:#fff;padding:10px 20px;
    border-radius:20px;font-size:14px;z-index:400;
    animation:fadeInOut 2.2s ease forwards;pointer-events:none;
  `;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2200);
}




// ===================================
// 編集モーダル
// ===================================
function openEditModal(record) {
  editingRecord         = record;
  editDateInput.value   = record.date;
  editAmountInput.value = record.amount;
  editTypeInput.value   = record.type;
  editTypeToggle.querySelectorAll(".type-toggle-btn").forEach(b => {
    b.classList.toggle("active", b.dataset.value === record.type);
  });
  updateCategoryOptions(record.type, editCatSelect, record.category);
  editMemoInput.value = record.title || "";
  showModal(editModal, editOverlay);
}

editTypeToggle.addEventListener("click", e => {
  const btn = e.target.closest(".type-toggle-btn");
  if (!btn) return;
  const val = btn.dataset.value;
  editTypeToggle.querySelectorAll(".type-toggle-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  editTypeInput.value = val;
  updateCategoryOptions(val, editCatSelect, editCatSelect.value);
});

closeEditBtn.addEventListener("click",  () => { hideModal(editModal, editOverlay); editingRecord = null; });
editOverlay.addEventListener("click",   () => { hideModal(editModal, editOverlay); editingRecord = null; });

document.getElementById("deleteRecordBtn").addEventListener("click", () => {
  if (!editingRecord) return;
  if (!confirm("この記録を削除しますか？")) return;
  const i = records.indexOf(editingRecord);
  if (i !== -1) records.splice(i, 1);
  saveRecords();
  render();
  hideModal(editModal, editOverlay);
  editingRecord = null;
});

saveEditButton.addEventListener("click", () => {
  if (!editingRecord) return;
  if (!editDateInput.value || editAmountInput.value === "") {
    alert("日付と金額を入力してください");
    return;
  }
  editingRecord.date     = editDateInput.value;
  editingRecord.amount   = Number(editAmountInput.value);
  editingRecord.type     = editTypeInput.value;
  editingRecord.category = editCatSelect.value;
  editingRecord.title    = editMemoInput.value.trim() || editCatSelect.value;
  saveRecords();
  render();
  hideModal(editModal, editOverlay);
  editingRecord = null;
});

// ===================================
// ホーム描画
// ===================================
function render() {
  list.innerHTML = "";

  if (records.length === 0) {
    const empty = document.createElement("p");
    empty.style.cssText = "text-align:center;color:#aaa;font-size:14px;margin-top:60px;";
    empty.textContent = "記録がありません";
    list.appendChild(empty);
    renderCalendar();
    return;
  }

  // 全件を日付降順で表示
  const sorted = [...records].sort((a, b) => {
    if (b.date !== a.date) return b.date.localeCompare(a.date);
    return records.indexOf(b) - records.indexOf(a);
  });

  // 日付グループ化
  const dayGroups = [];
  sorted.forEach(record => {
    const last = dayGroups[dayGroups.length - 1];
    if (last && last.date === record.date) last.records.push(record);
    else dayGroups.push({ date: record.date, records: [record] });
  });

  dayGroups.forEach(group => {
    // 日付ヘッダー行：年月日（曜日）
    const d = new Date(group.date + "T00:00:00");
    const weekDay = ["日","月","火","水","木","金","土"][d.getDay()];
    const dateHeader = document.createElement("div");
    dateHeader.className = "list-date-header";
    dateHeader.textContent = `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日（${weekDay}）`;
    list.appendChild(dateHeader);

    // 各レコード行
    group.records.forEach(record => {
      const row = document.createElement("div");
      row.className = "mf-record-row";

      const isExpense = record.type === "expense";
      const sign      = isExpense ? "-" : "+";
      const amtClass  = isExpense ? "mf-amount-expense" : "mf-amount-income";

      row.innerHTML = `
        <span class="mf-title">${record.title || record.category}</span>
        <span class="mf-amount ${amtClass}">${sign}¥${record.amount.toLocaleString()}</span>
      `;
      row.addEventListener("click", () => openEditModal(record));
      list.appendChild(row);
    });
  });

  renderCalendar();
}

// ===================================
// カレンダー描画
// ===================================
function renderCalendar() {
  const calendar = document.getElementById("calendar");
  const txList   = document.getElementById("calTransactionList");
  const ymEl     = document.getElementById("calYearMonth");
  const rangeEl  = document.getElementById("calRange");
  if (!calendar) return;
  calendar.innerHTML = "";
  if (txList)  txList.innerHTML  = "";

  const ym = monthSelector.value;
  const [year, m] = ym.split("-").map(Number);

  // 集計期間（基準日〜翌月基準日前日）
  const { start, end } = getPeriodRange(ym);
  const startDate = new Date(start + "T00:00:00");
  const endDate   = new Date(end   + "T00:00:00");

  // 年月・期間ヘッダー
  if (ymEl)    ymEl.textContent   = `${year}年${m}月`;
  if (rangeEl) {
    const fmt = d => `${d.getMonth()+1}月${d.getDate()}日`;
    rangeEl.textContent = `（${fmt(startDate)}〜${fmt(endDate)}）`;
  }

  // 期間の開始曜日から空白セルを埋める
  const firstDow = startDate.getDay();
  for (let i = 0; i < firstDow; i++) {
    calendar.appendChild(document.createElement("div"));
  }

  // 基準日から終了日まで1日ずつ描画
  const cur = new Date(startDate);
  const todayStr = new Date().toISOString().slice(0, 10);

  while (cur <= endDate) {
    const dayStr = `${cur.getFullYear()}-${String(cur.getMonth()+1).padStart(2,"0")}-${String(cur.getDate()).padStart(2,"0")}`;
    let income = 0, expense = 0;
    records.forEach(r => {
      if (r.date === dayStr) r.type === "income" ? income += r.amount : expense += r.amount;
    });

    const div = document.createElement("div");
    div.className = "day";
    div.innerHTML = `
      <div class="date">${cur.getDate()}</div>
      <div class="income">${income  > 0 ? "＋¥" + income.toLocaleString()  : ""}</div>
      <div class="expense">${expense > 0 ? "−¥" + expense.toLocaleString() : ""}</div>
    `;
    if (dayStr === todayStr)            div.classList.add("today");
    if      (expense > 0 && income > 0) div.classList.add("both");
    else if (expense > 0)               div.classList.add("expense-day");
    else if (income > 0)                div.classList.add("income-day");

    calendar.appendChild(div);
    cur.setDate(cur.getDate() + 1);
  }

  // 下部：期間内の出入金リスト（日付降順）
  if (!txList) return;
  const periodRecords = records.filter(r => r.date >= start && r.date <= end);
  if (periodRecords.length === 0) {
    txList.innerHTML = '<p style="text-align:center;color:#aaa;font-size:14px;padding:20px 0;">この期間の記録はありません</p>';
    return;
  }
  const sorted = [...periodRecords].sort((a, b) => {
    if (b.date !== a.date) return b.date.localeCompare(a.date);
    return periodRecords.indexOf(b) - periodRecords.indexOf(a);
  });
  const dayGroups = [];
  sorted.forEach(record => {
    const last = dayGroups[dayGroups.length - 1];
    if (last && last.date === record.date) last.records.push(record);
    else dayGroups.push({ date: record.date, records: [record] });
  });
  dayGroups.forEach(group => {
    const d = new Date(group.date + "T00:00:00");
    const weekDay = ["日","月","火","水","木","金","土"][d.getDay()];
    const dateHeader = document.createElement("div");
    dateHeader.className = "list-date-header";
    dateHeader.textContent = `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日（${weekDay}）`;
    txList.appendChild(dateHeader);
    group.records.forEach(record => {
      const row = document.createElement("div");
      row.className = "mf-record-row";
      const isExpense = record.type === "expense";
      row.innerHTML = `
        <span class="mf-title">${record.title || record.category}</span>
        <span class="mf-amount ${isExpense ? "mf-amount-expense" : "mf-amount-income"}">${isExpense ? "-" : "+"}¥${record.amount.toLocaleString()}</span>
      `;
      row.addEventListener("click", () => openEditModal(record));
      txList.appendChild(row);
    });
  });
}

// ===================================
// カテゴリ管理
// ===================================
function renderCategoryView() {
  const expenseList = document.getElementById("expenseCategoryList");
  const incomeList  = document.getElementById("incomeCategoryList");
  expenseList.innerHTML = "";
  incomeList.innerHTML  = "";

  categories.forEach(cat => {
    const li = document.createElement("li");
    li.className = "category-item";

    const nameSpan = document.createElement("span");
    nameSpan.className   = "category-name";
    nameSpan.textContent = cat.name;
    nameSpan.addEventListener("click", () => {
      const input = document.createElement("input");
      input.type  = "text";
      input.value = cat.name;
      input.style.cssText = "font-size:16px;width:120px;border:1px solid #ccc;border-radius:4px;padding:4px;height:36px;";
      const save = () => {
        const newName = input.value.trim();
        if (!newName) { renderCategoryView(); return; }
        records.forEach(r => { if (r.category === cat.name) r.category = newName; });
        cat.name = newName;
        saveRecords();
        saveCategories();
        renderCategoryView();
      };
      input.addEventListener("blur", save);
      input.addEventListener("keydown", e => { if (e.key === "Enter") save(); });
      li.replaceChild(input, nameSpan);
      input.focus();
    });

    const delBtn = document.createElement("button");
    delBtn.textContent = "削除";
    delBtn.className   = "delete-btn";
    delBtn.addEventListener("click", () => {
      if (records.some(r => r.category === cat.name) && !confirm(`「${cat.name}」は使用中です。削除しますか？`)) return;
      categories.splice(categories.indexOf(cat), 1);
      saveCategories();
      renderCategoryView();
    });

    li.appendChild(nameSpan);
    li.appendChild(delBtn);
    (cat.type === "income" ? incomeList : expenseList).appendChild(li);
  });
}

document.getElementById("addCategoryButton").addEventListener("click", () => {
  const name = document.getElementById("newCategoryName").value.trim();
  const type = document.getElementById("newCategoryType").value;
  if (!name) { alert("カテゴリ名を入力してください"); return; }
  if (categories.some(c => c.name === name)) { alert("同じ名前のカテゴリが既にあります"); return; }
  categories.push({ name, type });
  document.getElementById("newCategoryName").value = "";
  saveCategories();
  renderCategoryView();
});

// ===================================
// 集計期間設定
// ===================================
function renderPeriodView() {
  const sel = document.getElementById("periodStartDay");
  sel.innerHTML = "";
  for (let d = 1; d <= 28; d++) {
    const opt = document.createElement("option");
    opt.value = d;
    opt.textContent = `${d}日`;
    if (d === periodStartDay) opt.selected = true;
    sel.appendChild(opt);
  }
  if (!periodListenerAdded) {
    sel.addEventListener("change", e => {
      periodStartDay = Number(e.target.value);
      localStorage.setItem("periodStartDay", periodStartDay);
      updatePeriodPreview();
      render();
    });
    periodListenerAdded = true;
  }
  updatePeriodPreview();
}

function updatePeriodPreview() {
  const ym = monthSelector.value;
  const { start, end } = getPeriodRange(ym);
  const s  = new Date(start + "T00:00:00");
  const e  = new Date(end   + "T00:00:00");
  const fmt = d => `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日`;
  const mo  = Number(ym.split("-")[1]);
  const el  = document.getElementById("periodPreview");
  if (el) el.textContent = `${mo}月の集計期間：${fmt(s)} 〜 ${fmt(e)}`;
}

// ===================================
// グラフ描画
// ===================================
const CHART_COLORS = [
  "#4caf50","#2196f3","#ff9800","#e91e63","#9c27b0",
  "#00bcd4","#ff5722","#607d8b","#795548","#8bc34a",
];

function aggregateByCategory(type) {
  const month    = document.getElementById("graphMonthSelector").value;
  const filtered = filterByPeriod(month).filter(r => r.type === type);
  const map = {};
  filtered.forEach(r => { map[r.category] = (map[r.category] || 0) + r.amount; });
  return Object.entries(map).sort((a,b) => b[1]-a[1]).map(([name,amount]) => ({name,amount}));
}

function drawPieChart(canvasId, data, totalElId) {
  const canvas = document.getElementById(canvasId);
  const ctx = canvas.getContext("2d");
  const cx = canvas.width / 2, cy = canvas.height / 2;
  const R = Math.min(cx, cy) - 8, r = R * 0.52;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const total = data.reduce((s, d) => s + d.amount, 0);
  const totalEl = document.getElementById(totalElId);
  if (totalEl) totalEl.textContent = total > 0 ? `¥${total.toLocaleString()}` : "";
  if (total === 0) {
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI*2); ctx.fillStyle="#eee"; ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2); ctx.fillStyle="#fff"; ctx.fill();
    ctx.fillStyle="#aaa"; ctx.font="13px sans-serif"; ctx.textAlign="center";
    ctx.fillText("データなし", cx, cy+5);
    return;
  }
  let angle = -Math.PI / 2;
  data.forEach((d, i) => {
    const slice = (d.amount / total) * Math.PI * 2;
    ctx.beginPath(); ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, R, angle, angle + slice); ctx.closePath();
    ctx.fillStyle = CHART_COLORS[i % CHART_COLORS.length]; ctx.fill();
    angle += slice;
  });
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2); ctx.fillStyle="#fff"; ctx.fill();
}

function renderLegend(legendId, data) {
  const el = document.getElementById(legendId);
  el.innerHTML = "";
  const total = data.reduce((s, d) => s + d.amount, 0);
  data.forEach((d, i) => {
    const pct   = total > 0 ? Math.round(d.amount / total * 100) : 0;
    const color = CHART_COLORS[i % CHART_COLORS.length];
    const li    = document.createElement("li");
    li.className = "legend-item";
    li.innerHTML =
      `<span class="legend-dot" style="background:${color}"></span>` +
      `<span class="legend-name">${d.name}</span>` +
      `<span class="legend-pct">${pct}%</span>` +
      `<span class="legend-amount">¥${d.amount.toLocaleString()}</span>`;
    el.appendChild(li);
  });
}

function renderGraph() {
  document.getElementById("graphMonthSelector").value = monthSelector.value;

  // サマリー更新
  const forSummary = filterByPeriod(monthSelector.value);
  let income = 0, expense = 0;
  forSummary.forEach(r => r.type === "income" ? income += r.amount : expense += r.amount);
  document.getElementById("incomeTotal").textContent  = income.toLocaleString();
  document.getElementById("expenseTotal").textContent = expense.toLocaleString();
  const bal   = income - expense;
  const balEl = document.getElementById("balance");
  balEl.textContent = bal.toLocaleString();
  balEl.style.color = bal >= 0 ? "var(--theme)" : "#c62828";

  // 現在選択中のトグルに合わせてグラフを描画
  const activeBtn = document.querySelector("#graphToggle .graph-toggle-btn.active");
  const type = activeBtn ? activeBtn.dataset.value : "expense";
  renderGraphByType(type);
}

function renderGraphByType(type) {
  const data = aggregateByCategory(type);
  drawPieChart("mainChart", data, "mainChartTotal");
  renderLegend("mainLegend", data);
}

document.getElementById("graphMonthSelector").addEventListener("change", renderGraph);

// トグルボタンのイベント
document.getElementById("graphToggle").addEventListener("click", e => {
  const btn = e.target.closest(".graph-toggle-btn");
  if (!btn) return;
  document.querySelectorAll("#graphToggle .graph-toggle-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  renderGraphByType(btn.dataset.value);
});

// ===================================
// 予算管理
// ===================================
let budgets = JSON.parse(localStorage.getItem("budgets")) || {};

function saveBudgets() {
  localStorage.setItem("budgets", JSON.stringify(budgets));
}

function getMonthlySpending() {
  const map = {};
  filterByPeriod(monthSelector.value).forEach(r => {
    if (r.type === "expense") map[r.category] = (map[r.category] || 0) + r.amount;
  });
  return map;
}

function renderBudgetView() {
  const ul = document.getElementById("budgetList");
  ul.innerHTML = "";
  const expenseCats = categories.filter(c => c.type === "expense" || c.type === "both");
  if (expenseCats.length === 0) {
    ul.innerHTML = '<li style="color:#aaa;font-size:14px;padding:12px 0;">支出カテゴリがありません</li>';
    return;
  }
  const spending = getMonthlySpending();
  expenseCats.forEach(cat => {
    const budget   = budgets[cat.name] || 0;
    const spent    = spending[cat.name] || 0;
    const pct      = budget > 0 ? Math.min(spent / budget * 100, 100) : 0;
    const barClass = budget > 0
      ? (spent > budget ? "over" : spent / budget >= 0.8 ? "warn" : "ok")
      : "ok";
    const li = document.createElement("li");
    li.className = "budget-item";
    li.innerHTML = `
      <div class="budget-item-top">
        <span class="budget-item-name">${cat.name}</span>
        <div class="budget-item-input-wrap">
          <span>¥</span>
          <input type="number" class="budget-input" data-cat="${cat.name}"
            value="${budget > 0 ? budget : ""}" placeholder="未設定">
        </div>
      </div>
      <div class="budget-bar-wrap">
        <div class="budget-bar ${barClass}" style="width:${pct}%"></div>
      </div>
      <div class="budget-bar-info">
        <span>使用中：¥${spent.toLocaleString()}</span>
        <span class="${spent > budget && budget > 0 ? "over-text" : ""}">
          ${budget > 0
            ? (spent > budget
                ? `¥${(spent - budget).toLocaleString()} オーバー`
                : `残り ¥${(budget - spent).toLocaleString()}`)
            : "予算未設定"}
        </span>
      </div>
    `;
    const input = li.querySelector(".budget-input");
    input.addEventListener("change", () => {
      const val = Number(input.value);
      if (val > 0) budgets[cat.name] = val;
      else         delete budgets[cat.name];
      saveBudgets();
      renderBudgetView();
    });
    ul.appendChild(li);
  });
}

// ===================================
// 口座管理
// ===================================
let accounts = JSON.parse(localStorage.getItem("accounts")) || [];
let editingAccount  = null;
let nextAccountId   = Math.max(0, ...accounts.map(a => a.id)) + 1;

function saveAccounts() {
  localStorage.setItem("accounts", JSON.stringify(accounts));
}

function renderAccountView() {
  const ul = document.getElementById("accountList");
  ul.innerHTML = "";

  accounts.forEach(account => {
    const li = document.createElement("li");
    li.className = "account-li";

    // 左側：口座名・メモ
    const info = document.createElement("div");
    info.className = "account-info";
    info.innerHTML =
      `<span class="account-name">${account.name}</span>` +
      (account.memo ? `<span class="account-memo">${account.memo}</span>` : "");

    // 右側：残高（タップで即時編集）
    const balWrap = document.createElement("div");
    balWrap.className = "account-balance-wrap";

    const balSpan = document.createElement("span");
    balSpan.className = "account-balance";
    balSpan.textContent = `¥${account.balance.toLocaleString()}`;

    // 残高タップ → インライン編集
    balSpan.addEventListener("click", e => {
      e.stopPropagation();
      const input = document.createElement("input");
      input.type  = "number";
      input.value = account.balance;
      input.className = "account-balance-input";
      const save = () => {
        const v = Number(input.value);
        if (!isNaN(v)) account.balance = v;
        saveAccounts();
        renderAccountView();
      };
      input.addEventListener("blur", save);
      input.addEventListener("keydown", e => { if (e.key === "Enter") { input.blur(); } });
      balWrap.replaceChild(input, balSpan);
      input.focus();
      input.select();
    });

    balWrap.appendChild(balSpan);

    // 編集ボタン
    const editBtn = document.createElement("button");
    editBtn.textContent = "編集";
    editBtn.className   = "account-edit-btn";
    editBtn.addEventListener("click", () => openAccountModal(account));

    li.appendChild(info);
    li.appendChild(balWrap);
    li.appendChild(editBtn);
    ul.appendChild(li);
  });
}

// 口座モーダルを開く（追加 or 編集）
function openAccountModal(account) {
  editingAccount = account || null;
  const isEdit   = !!account;

  document.getElementById("accountModalTitle").textContent = isEdit ? "口座を編集" : "口座を追加";
  document.getElementById("accountName").value    = isEdit ? account.name    : "";
  document.getElementById("accountBalance").value = isEdit ? account.balance : "";
  document.getElementById("accountMemo").value    = isEdit ? account.memo    : "";

  const delBtn = document.getElementById("deleteAccountBtn");
  delBtn.classList.toggle("hidden", !isEdit);

  showModal(document.getElementById("accountModal"), document.getElementById("accountOverlay"));
}

function closeAccountModal() {
  hideModal(document.getElementById("accountModal"), document.getElementById("accountOverlay"));
  editingAccount = null;
}

document.getElementById("openAddAccountBtn").addEventListener("click", () => openAccountModal(null));
document.getElementById("closeAccountBtn").addEventListener("click",   closeAccountModal);
document.getElementById("accountOverlay").addEventListener("click",    closeAccountModal);

document.getElementById("saveAccountBtn").addEventListener("click", () => {
  const name    = document.getElementById("accountName").value.trim();
  const balance = Number(document.getElementById("accountBalance").value);
  const memo    = document.getElementById("accountMemo").value.trim();

  if (!name) { alert("口座名を入力してください"); return; }

  if (editingAccount) {
    editingAccount.name    = name;
    editingAccount.balance = balance;
    editingAccount.memo    = memo;
  } else {
    accounts.push({ id: nextAccountId++, name, balance, memo });
  }
  saveAccounts();
  renderAccountView();
  closeAccountModal();
});

document.getElementById("deleteAccountBtn").addEventListener("click", () => {
  if (!editingAccount) return;
  if (!confirm(`「${editingAccount.name}」を削除しますか？`)) return;
  accounts = accounts.filter(a => a.id !== editingAccount.id);
  saveAccounts();
  renderAccountView();
  closeAccountModal();
});

// ===================================
// 表示 / 非表示
// ===================================
function applyTabVisibility() {
  const accTab = document.getElementById("accountTab");
  accTab.style.display = tabVisibility.account ? "" : "none";

  // 現在非表示のタブにいる場合はホームに戻す
  const cur = viewStack[viewStack.length - 1];
  if (cur === "account" && !tabVisibility.account) switchToTab("home");
}

function renderVisibilityView() {
  document.getElementById("toggleAccount").checked = !!tabVisibility.account;
}

document.getElementById("toggleAccount").addEventListener("change", e => {
  tabVisibility.account = e.target.checked;
  saveTabVisibility();
  applyTabVisibility();
});

// ===================================
// 月ナビゲーション
// ===================================
function updateMonthLabel() {
  const [year, month] = monthSelector.value.split("-").map(Number);
  document.getElementById("monthLabel").textContent = `${year}年${month}月`;
}

// スワイプアニメーション付きで月を変更
// direction: "left"（次月）or "right"（前月）
function changeMonth(delta, direction) {
  const [year, month] = monthSelector.value.split("-").map(Number);
  const d = new Date(year, month - 1 + delta, 1);
  const newVal = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

  // アニメーション対象：現在表示中のメイン画面エリア
  const currentView = viewStack[viewStack.length - 1];
  const viewEl = VIEW_CONFIG[currentView].el;

  // 出ていく方向・入ってくる方向を決定
  const outClass = direction === "left" ? "slide-out-left"  : "slide-out-right";
  const inClass  = direction === "left" ? "slide-in-right"  : "slide-in-left";

  // 現在のコンテンツをスライドアウト
  viewEl.classList.add(outClass);

  setTimeout(() => {
    // 月を更新
    monthSelector.value = newVal;
    updateMonthLabel();
    if (currentView === "graph") {
      document.getElementById("graphMonthSelector").value = newVal;
      renderGraph();
    } else {
      render();
    }
    // スライドインアニメーション
    viewEl.classList.remove(outClass);
    viewEl.classList.add(inClass);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        viewEl.classList.remove(inClass);
      });
    });
  }, 160);
}

document.getElementById("prevMonthBtn").addEventListener("click", () => changeMonth(-1, "right"));
document.getElementById("nextMonthBtn").addEventListener("click", () => changeMonth( 1, "left"));

// タッチスワイプで月変更 ＋ Safari風バックジェスチャー
(function setupSwipe() {
  let startX       = 0;
  let startY       = 0;
  let isBackGesture = false;   // バックジェスチャー中かどうか
  let isMonthSwipe  = false;   // 月切り替えスワイプ中かどうか
  let decided       = false;   // どちらのジェスチャーか決定済みか

  const BACK_EDGE       = 40;  // 左端何px以内から始まればバックとみなすか
  const BACK_THRESHOLD  = 60;  // 離したときにバック確定する最低距離
  const MONTH_THRESHOLD = 50;  // 月切り替えの最低スワイプ距離

  // 現在の画面要素を取得
  function getCurrentEl() {
    return VIEW_CONFIG[viewStack[viewStack.length - 1]].el;
  }

  // バック可能かどうか
  function canGoBack() {
    const cur = viewStack[viewStack.length - 1];
    return viewStack.length > 1 || cur === "calendar";
  }

  // バック実行
  function doGoBack() {
    const cur = viewStack[viewStack.length - 1];
    if (viewStack.length > 1) goBack();
    else if (cur === "calendar") switchToTab("transaction");
  }

  document.addEventListener("touchstart", e => {
    startX        = e.touches[0].clientX;
    startY        = e.touches[0].clientY;
    isBackGesture = false;
    isMonthSwipe  = false;
    decided       = false;
  }, { passive: true });

  document.addEventListener("touchmove", e => {
    if (!addModal.classList.contains("hidden")) return;
    if (!editModal.classList.contains("hidden")) return;

    const curX  = e.touches[0].clientX;
    const curY  = e.touches[0].clientY;
    const dx    = curX - startX;  // 正 = 右方向
    const dy    = curY - startY;

    // どちらのジェスチャーか未確定の場合に判定
    if (!decided) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return; // まだ動き始め
      if (Math.abs(dy) > Math.abs(dx)) { decided = true; return; } // 縦スクロール

      // バックジェスチャー：左端BACK_EDGE以内から右方向
      if (startX <= BACK_EDGE && dx > 0 && canGoBack()) {
        isBackGesture = true;
      } else {
        // 月切り替えスワイプ
        const cur = viewStack[viewStack.length - 1];
        if (["calendar","graph","transaction"].includes(cur)) isMonthSwipe = true;
      }
      decided = true;
    }

    // バックジェスチャー中：現在画面を指に追随
    if (isBackGesture) {
      const el = getCurrentEl();
      const move = Math.max(0, dx); // 左には動かさない
      el.style.transition = "none";
      el.style.transform  = `translateX(${move}px)`;
      // 奥の画面を少し覗かせる（暗くした背景）
      el.style.boxShadow  = `-8px 0 20px rgba(0,0,0,${0.2 * (1 - move / window.innerWidth)})`;
    }
  }, { passive: true });

  document.addEventListener("touchend", e => {
    if (!addModal.classList.contains("hidden")) return;
    if (!editModal.classList.contains("hidden")) return;

    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const dx   = endX - startX;
    const dy   = endY - startY;

    // ── バックジェスチャーの確定 ──
    if (isBackGesture) {
      const el = getCurrentEl();

      if (dx >= BACK_THRESHOLD) {
        // 十分スワイプ → 画面を右に飛ばしてから画面遷移
        el.style.transition = "transform 0.25s cubic-bezier(0.4,0,0.2,1)";
        el.style.transform  = `translateX(${window.innerWidth}px)`;
        el.style.boxShadow  = "none";
        setTimeout(() => {
          el.style.transition = "";
          el.style.transform  = "";
          el.style.boxShadow  = "";
          doGoBack();
        }, 220);
      } else {
        // 不十分 → 元の位置に戻す
        el.style.transition = "transform 0.3s cubic-bezier(0.4,0,0.2,1), box-shadow 0.3s";
        el.style.transform  = "translateX(0)";
        el.style.boxShadow  = "none";
        setTimeout(() => {
          el.style.transition = "";
          el.style.transform  = "";
          el.style.boxShadow  = "";
        }, 300);
      }
      isBackGesture = false;
      return;
    }

    // ── 月切り替えスワイプ ──
    if (isMonthSwipe) {
      if (Math.abs(dy) > Math.abs(dx)) return;
      const diffX = startX - endX;
      if (Math.abs(diffX) < MONTH_THRESHOLD) return;
      if (diffX > 0) changeMonth( 1, "left");
      else           changeMonth(-1, "right");
    }
  }, { passive: true });
})();

// ===================================
// デフォルト表示月の計算
// ===================================
// 今日が集計開始日より前なら前月を表示する
// 例）開始日=21日、今日=3/15 → まだ3月の集計が始まっていない → 2月を表示
function getDefaultMonth() {
  const today = new Date();
  const yyyy  = today.getFullYear();
  const mm    = today.getMonth() + 1; // 1-12
  const dd    = today.getDate();

  if (periodStartDay === 1 || dd >= periodStartDay) {
    // 今日が開始日以降 → 今月
    return `${yyyy}-${String(mm).padStart(2, "0")}`;
  } else {
    // 今日が開始日より前 → 前月
    const prev = new Date(yyyy, mm - 2, 1);
    return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;
  }
}

// ===================================
// 初期化（全関数定義後に実行）
// ===================================
applyThemeColor(themeColor);
monthSelector.value = getDefaultMonth();
updateMonthLabel();
updateCategoryOptions("expense", categorySelect);
applyTabVisibility();
render();

// ===================================
// Service Worker
// ===================================
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./service-worker.js").then(reg => {
    reg.addEventListener("updatefound", () => {
      const nw = reg.installing;
      nw.addEventListener("statechange", () => {
        if (nw.state === "activated") window.location.reload();
      });
    });
  });
  navigator.serviceWorker.addEventListener("controllerchange", () => window.location.reload());
}

}); // DOMContentLoaded end
