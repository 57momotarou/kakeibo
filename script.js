document.addEventListener("DOMContentLoaded", () => {

// ===================================
// スプラッシュ画面
// ===================================
(function initSplash() {
  const splash     = document.getElementById("splashScreen");
  const savedColor = localStorage.getItem("themeColor") || "#4caf50";
  splash.style.background = savedColor;

  function isLightColor(hex) {
    const c = hex.replace("#", "");
    const r = parseInt(c.length === 3 ? c[0]+c[0] : c.slice(0,2), 16);
    const g = parseInt(c.length === 3 ? c[1]+c[1] : c.slice(2,4), 16);
    const b = parseInt(c.length === 3 ? c[2]+c[2] : c.slice(4,6), 16);
    return (0.299 * r + 0.587 * g + 0.114 * b) > 200;
  }
  if (isLightColor(savedColor)) splash.classList.add("dark-text");

  setTimeout(() => {
    splash.classList.add("fade-out");
    splash.addEventListener("transitionend", () => splash.classList.add("hidden"), { once: true });
  }, 800);
})();

// ===================================
// 大分類・小分類マスターデータ
// ===================================
const PARENT_CATEGORIES = [
  { id: "food",        name: "食費",         icon: "🍽️",  type: "expense" },
  { id: "daily",       name: "日用品",        icon: "🛒",  type: "expense" },
  { id: "hobby",       name: "趣味・娯楽",    icon: "🎮",  type: "expense" },
  { id: "social",      name: "交際費",        icon: "🥂",  type: "expense" },
  { id: "transport",   name: "交通費",        icon: "🚃",  type: "expense" },
  { id: "fashion",     name: "衣服・美容",    icon: "👗",  type: "expense" },
  { id: "health",      name: "健康・医療",    icon: "💊",  type: "expense" },
  { id: "car",         name: "自動車",        icon: "🚗",  type: "expense" },
  { id: "education",   name: "教養・教育",    icon: "📚",  type: "expense" },
  { id: "special",     name: "特別な支出",    icon: "💸",  type: "expense" },
  { id: "cash",        name: "現金・カード",  icon: "💳",  type: "expense" },
  { id: "utility",     name: "水道・光熱費",  icon: "💡",  type: "expense" },
  { id: "telecom",     name: "通信費",        icon: "📱",  type: "expense" },
  { id: "housing",     name: "住宅",          icon: "🏠",  type: "expense" },
  { id: "tax",         name: "税・社会保障",  icon: "🏛️",  type: "expense" },
  { id: "insurance",   name: "保険",          icon: "🛡️",  type: "expense" },
  { id: "other",       name: "その他",        icon: "📦",  type: "both"    },
  { id: "unclassified",name: "未分類",        icon: "❓",  type: "both"    },
  // 収入専用
  { id: "income_sal",  name: "給与",          icon: "💰",  type: "income"  },
  { id: "income_other",name: "その他収入",    icon: "💹",  type: "income"  },
];

// デフォルト小分類
const DEFAULT_CHILD_CATEGORIES = {
  food:         ["食費","食料品","外食","朝ご飯","昼ご飯","夜ご飯","カフェ","その他食費"],
  daily:        ["日用品","ドラッグストア","おこづかい","ペット用品","その他日用品"],
  hobby:        ["映画","音楽","ゲーム","本","旅行","秘密の趣味","その他趣味・娯楽"],
  social:       ["交際費","飲み会","プレゼント代","冠婚葬祭","その他交際費"],
  transport:    ["交通費","電車","バス","タクシー","飛行機","その他交通費"],
  fashion:      ["衣服","クリーニング","美容院・理髪","化粧品","アクセサリー","その他衣服・美容"],
  health:       ["フィットネス","ボディケア","医療費","薬","その他健康・医療"],
  car:          ["自動車ローン","ガソリン","駐車場","車両","車検・整備","自動車保険","その他自動車"],
  education:    ["書籍","新聞・雑誌","習いごと","学費","塾","その他教養・教育"],
  special:      ["家具・家電","住宅・リフォーム","その他特別な支出"],
  cash:         ["ATM引き落とし","カード引き落とし","電子マネー","使途不明金","その他現金・カード"],
  utility:      ["光熱費","電気代","ガス・灯油代","水道代","その他水道・光熱費"],
  telecom:      ["携帯電話","固定電話","インターネット","情報サービス","宅配便・運送","その他通信費"],
  housing:      ["住宅","家賃","ローン返済","管理費・積立金","地震・火災保険","その他住宅"],
  tax:          ["所得税・住民税","年金保険料","健康保険","その他税・社会保障"],
  insurance:    ["生命保険","医療保険","その他保険"],
  other:        ["仕送り","事業経費","事業原価","事業投資","寄付金","雑費"],
  unclassified: [],
  income_sal:   ["給与","賞与","残業代","その他給与"],
  income_other: ["副業","投資","ポイント還元","その他収入"],
};

// ===================================
// データの読み込み
// ===================================
let records        = JSON.parse(localStorage.getItem("records"))     || [];
let periodStartDay = Number(localStorage.getItem("periodStartDay"))  || 1;
let themeColor     = localStorage.getItem("themeColor")              || "#4caf50";
let editingRecord  = null;
let periodListenerAdded = false;

// 小分類データ：localStorageから読み込み、なければデフォルト
function loadChildCategories() {
  const saved = localStorage.getItem("childCategories");
  if (saved) return JSON.parse(saved);
  // デフォルト初期化
  const obj = {};
  Object.keys(DEFAULT_CHILD_CATEGORIES).forEach(pid => {
    obj[pid] = DEFAULT_CHILD_CATEGORIES[pid].map(name => ({ name }));
  });
  // 初回は即保存して以降リセットされないようにする
  localStorage.setItem("childCategories", JSON.stringify(obj));
  return obj;
}
let childCategories = loadChildCategories();

function saveChildCategories() {
  localStorage.setItem("childCategories", JSON.stringify(childCategories));
}

// タブ表示設定
const DEFAULT_TAB_VISIBILITY = { calendar: false, account: true };
let tabVisibility = JSON.parse(localStorage.getItem("tabVisibility")) || DEFAULT_TAB_VISIBILITY;
function saveTabVisibility() { localStorage.setItem("tabVisibility", JSON.stringify(tabVisibility)); }

// ===================================
// カテゴリヘルパー
// ===================================

// 大分類IDから名前を取得
function getParentName(parentId) {
  const p = PARENT_CATEGORIES.find(p => p.id === parentId);
  return p ? p.name : parentId;
}

// 大分類IDから小分類一覧を取得
function getChildren(parentId) {
  return childCategories[parentId] || [];
}

// 全小分類名リストをフラット化（表示・互換用）
function getAllChildNames() {
  const names = new Set();
  Object.values(childCategories).forEach(arr => arr.forEach(c => names.add(c.name)));
  return [...names];
}

// レコードの "category" フィールドを「大分類ID/小分類名」形式で保存
// 旧形式（文字列のみ）との互換性を持たせる
function parseCategoryField(cat) {
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

function makeCategoryField(parentId, childName) {
  return childName ? `${parentId}/${childName}` : parentId;
}

// 表示用カテゴリ名（小分類があれば小分類名、なければ大分類名）
function displayCategory(cat) {
  const { parentId, childName } = parseCategoryField(cat);
  if (childName) return childName;
  return getParentName(parentId);
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
const memoInput        = document.getElementById("memo");
const addButton        = document.getElementById("addButton");
const closeEditBtn     = document.getElementById("closeEditBtn");
const editOverlay      = document.getElementById("editOverlay");
const editModal        = document.getElementById("editModal");
const editDateInput    = document.getElementById("editDate");
const editAmountInput  = document.getElementById("editAmount");
const editTypeInput    = document.getElementById("editType");
const editMemoInput    = document.getElementById("editMemo");
const saveEditButton   = document.getElementById("saveEditButton");
const editTypeToggle   = document.getElementById("editTypeToggle");

// ===================================
// 保存
// ===================================
function saveRecords() { localStorage.setItem("records", JSON.stringify(records)); }

// ===================================
// 集計期間
// ===================================
function getPeriodRange(yearMonth) {
  const [year, month] = yearMonth.split("-").map(Number);
  if (periodStartDay === 1) {
    const lastDay = new Date(year, month, 0).getDate();
    return { start: `${yearMonth}-01`, end: `${yearMonth}-${String(lastDay).padStart(2, "0")}` };
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
// 2段階カテゴリ選択UI
// ===================================

// 大分類セレクト更新
function updateParentSelect(selectEl, type, currentParentId) {
  selectEl.innerHTML = "";
  const filtered = PARENT_CATEGORIES.filter(p => p.type === type || p.type === "both");
  filtered.forEach(p => {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = `${p.icon} ${p.name}`;
    if (p.id === currentParentId) opt.selected = true;
    selectEl.appendChild(opt);
  });
}

// 小分類セレクト更新
function updateChildSelect(childSelectEl, parentId, currentChildName) {
  childSelectEl.innerHTML = "";
  const children = getChildren(parentId);
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

// 追加モーダル用：大分類変更時に小分類を連動更新
document.getElementById("addParentCat").addEventListener("change", function() {
  updateChildSelect(document.getElementById("addChildCat"), this.value, "");
});

// 編集モーダル用
document.getElementById("editParentCat").addEventListener("change", function() {
  updateChildSelect(document.getElementById("editChildCat"), this.value, "");
});

// ===================================
// 画面スタック管理
// ===================================
let viewStack = ["home"];
let currentCategoryParentId = null; // 小分類編集中の大分類ID

const VIEW_CONFIG = {
  home:           { el: document.getElementById("homeView"),           title: null,               showTabs: true  },
  transaction:    { el: document.getElementById("transactionView"),    title: null,               showTabs: true  },
  calendar:       { el: document.getElementById("calendarView"),       title: null,               showTabs: true  },
  graph:          { el: document.getElementById("graphView"),          title: null,               showTabs: true  },
  account:        { el: document.getElementById("accountView"),        title: null,               showTabs: true  },
  settings:       { el: document.getElementById("settingsView"),       title: "設定",             showTabs: false },
  category:       { el: document.getElementById("categoryView"),       title: "カテゴリ変更",     showTabs: false },
  categoryDetail: { el: document.getElementById("categoryDetailView"), title: "",                 showTabs: false },
  theme:          { el: document.getElementById("themeView"),          title: "テーマカラー",     showTabs: false },
  period:         { el: document.getElementById("periodView"),         title: "集計期間",         showTabs: false },
  budget:         { el: document.getElementById("budgetView"),         title: "予算設定",         showTabs: false },
  apiKey:         { el: document.getElementById("apiKeyView"),         title: "Gemini APIキー",   showTabs: false },
  reset:          { el: document.getElementById("resetView"),          title: "データのリセット", showTabs: false },
  visibility:     { el: document.getElementById("visibilityView"),     title: "表示 / 非表示",    showTabs: false },
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
  if (!isMain) {
    // categoryDetailの場合は大分類名をタイトルに
    if (name === "categoryDetail" && currentCategoryParentId) {
      const p = PARENT_CATEGORIES.find(p => p.id === currentCategoryParentId);
      settingsBarTitle.textContent = p ? `${p.icon} ${p.name}` : "小分類";
    } else {
      settingsBarTitle.textContent = config.title;
    }
  }

  const monthNav       = document.getElementById("topBarMonthNav");
  const homeTitleEl    = document.getElementById("topBarHomeTitle");
  const calShortcutBtn = document.getElementById("calendarShortcutBtn");
  const calBackBtn     = document.getElementById("calendarBackBtn");
  const spacer         = document.getElementById("topBarSpacer");

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

  if (name === "home")           renderHome();
  if (name === "transaction")    render();
  if (name === "calendar")       renderCalendar();
  if (name === "category")       renderCategoryView();
  if (name === "categoryDetail") renderCategoryDetailView();
  if (name === "theme")          renderColorPresets();
  if (name === "graph")          renderGraph();
  if (name === "period")         renderPeriodView();
  if (name === "account")        renderAccountView();
  if (name === "visibility")     renderVisibilityView();
  if (name === "budget")         renderBudgetView();
  if (name === "apiKey")         renderApiKeyView();
  if (name === "reset")          renderResetView();

  applyTabVisibility();
  document.getElementById("homeTab").classList.toggle("active",        name === "home");
  document.getElementById("transactionTab").classList.toggle("active", name === "transaction");
  document.getElementById("graphTab").classList.toggle("active",       name === "graph");
  document.getElementById("accountTab").classList.toggle("active",     name === "account");
}

backBtn.addEventListener("click", goBack);
openSettingsBtn.addEventListener("click", () => navigate("settings"));
document.getElementById("calendarShortcutBtn").addEventListener("click", () => switchToTab("calendar"));
document.getElementById("calendarBackBtn").addEventListener("click",    () => switchToTab("transaction"));
document.getElementById("goCategory").addEventListener("click",   () => navigate("category"));
document.getElementById("goTheme").addEventListener("click",      () => navigate("theme"));
document.getElementById("goPeriod").addEventListener("click",     () => navigate("period"));
document.getElementById("goVisibility").addEventListener("click", () => navigate("visibility"));
document.getElementById("goBudget").addEventListener("click",     () => navigate("budget"));
document.getElementById("goApiKey").addEventListener("click",     () => navigate("apiKey"));
document.getElementById("goReset").addEventListener("click",      () => navigate("reset"));

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
  const type = prefill?.type || "expense";
  dateInput.value     = prefill?.date   || new Date().toISOString().slice(0, 10);
  amountInput.value   = prefill?.amount || "";
  memoInput.value     = prefill?.title  || "";
  addTypeHidden.value = type;
  addTypeToggle.querySelectorAll(".type-toggle-btn").forEach(b => {
    b.classList.toggle("active", b.dataset.value === type);
  });

  // カテゴリ初期化
  const { parentId, childName } = parseCategoryField(prefill?.category || "");
  const defaultParent = type === "income" ? "income_sal" : "food";
  const pid = parentId !== "unclassified" ? parentId : defaultParent;
  updateParentSelect(document.getElementById("addParentCat"), type, pid);
  updateChildSelect(document.getElementById("addChildCat"), pid, childName);

  showModal(addModal, addOverlay);
}

addTypeToggle.addEventListener("click", e => {
  const btn = e.target.closest(".type-toggle-btn");
  if (!btn) return;
  const val = btn.dataset.value;
  addTypeToggle.querySelectorAll(".type-toggle-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  addTypeHidden.value = val;
  // 大分類を再構築
  const defaultParent = val === "income" ? "income_sal" : "food";
  updateParentSelect(document.getElementById("addParentCat"), val, defaultParent);
  updateChildSelect(document.getElementById("addChildCat"), defaultParent, "");
});

closeAddBtn.addEventListener("click",  () => hideModal(addModal, addOverlay));
addOverlay.addEventListener("click",   () => hideModal(addModal, addOverlay));

addButton.addEventListener("click", () => {
  if (!dateInput.value || amountInput.value === "") {
    alert("日付と金額を入力してください");
    return;
  }
  const parentId  = document.getElementById("addParentCat").value;
  const childName = document.getElementById("addChildCat").value;
  records.push({
    date:     dateInput.value,
    amount:   Number(amountInput.value),
    type:     addTypeHidden.value,
    category: makeCategoryField(parentId, childName),
    title:    memoInput.value.trim() || childName || getParentName(parentId),
  });
  saveRecords();
  render();
  hideModal(addModal, addOverlay);
});

// ===================================
// FABメニュー
// ===================================
const fabMenu    = document.getElementById("fabMenu");
const fabOverlay = document.getElementById("fabOverlay");
let fabOpen = false;

function getGeminiApiKey() { return localStorage.getItem("geminiApiKey") || ""; }

function applyFabVisibility() {
  const hasKey = !!getGeminiApiKey();
  document.getElementById("fabCameraItem").style.display = hasKey ? "" : "none";
}

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
  if (fabOpen) { closeFabMenu(); return; }
  if (!getGeminiApiKey()) openAddModal();
  else openFabMenu();
});

fabOverlay.addEventListener("click", closeFabMenu);

document.getElementById("fabManualBtn").addEventListener("click", () => {
  closeFabMenu();
  setTimeout(() => openAddModal(), 200);
});

// ===================================
// レシート読み取り（Gemini API）
// ===================================
const receiptInput = document.getElementById("receiptInput");
const scanOverlay  = document.getElementById("scanOverlay");

document.getElementById("fabCameraBtn").addEventListener("click", () => {
  closeFabMenu();
  setTimeout(() => receiptInput.click(), 200);
});

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
      openAddModal({ date: parsed?.date, type: "expense" });
      return;
    }
    showItemSelector(parsed.items, parsed.date, parsed.category);
  } catch (err) {
    scanOverlay.classList.add("hidden");
    console.error(err);
    alert("読み取りエラー:\n" + err.message);
  }
});

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function callGeminiReceiptAPI(base64Image, mimeType, apiKey) {
  const today = new Date().toISOString().slice(0, 10);
  const allChildNames = getAllChildNames();
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

function showItemSelector(items, date, category) {
  const existing = document.getElementById("itemSelectorOverlay");
  if (existing) existing.remove();

  const overlay = document.createElement("div");
  overlay.id = "itemSelectorOverlay";
  overlay.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:350;display:flex;align-items:flex-end;`;

  const sheet = document.createElement("div");
  sheet.style.cssText = `background:#f5f5f5;width:100%;border-radius:20px 20px 0 0;max-height:80vh;display:flex;flex-direction:column;`;

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
    // カテゴリ名から大分類を推測
    const catField = makeCategoryFieldFromChildName(category);
    selected.forEach(item => {
      records.push({ date, amount: item.amount, type: "expense", category: catField, title: item.title });
    });
    saveRecords();
    render();
    overlay.remove();
    showToast(`${selected.length}件を追加しました`);
  });

  header.querySelector("#closeItemSelector").addEventListener("click", () => overlay.remove());
  overlay.addEventListener("click", e => { if (e.target === overlay) overlay.remove(); });
  overlay.appendChild(sheet);
  document.body.appendChild(overlay);
  updateTotal();
}

// 小分類名から大分類フィールドを作成
function makeCategoryFieldFromChildName(childName) {
  for (const [pid, arr] of Object.entries(childCategories)) {
    if (arr.some(c => c.name === childName)) return `${pid}/${childName}`;
  }
  return `unclassified/${childName}`;
}

function showToast(msg) {
  const t = document.createElement("div");
  t.textContent = msg;
  t.style.cssText = `position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.75);color:#fff;padding:10px 20px;border-radius:20px;font-size:14px;z-index:400;animation:fadeInOut 2.2s ease forwards;pointer-events:none;`;
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
  editMemoInput.value = record.title || "";

  const { parentId, childName } = parseCategoryField(record.category);
  updateParentSelect(document.getElementById("editParentCat"), record.type, parentId);
  updateChildSelect(document.getElementById("editChildCat"), parentId, childName);

  showModal(editModal, editOverlay);
}

editTypeToggle.addEventListener("click", e => {
  const btn = e.target.closest(".type-toggle-btn");
  if (!btn) return;
  const val = btn.dataset.value;
  editTypeToggle.querySelectorAll(".type-toggle-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  editTypeInput.value = val;
  const defaultParent = val === "income" ? "income_sal" : "food";
  updateParentSelect(document.getElementById("editParentCat"), val, defaultParent);
  updateChildSelect(document.getElementById("editChildCat"), defaultParent, "");
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
  const parentId  = document.getElementById("editParentCat").value;
  const childName = document.getElementById("editChildCat").value;
  editingRecord.date     = editDateInput.value;
  editingRecord.amount   = Number(editAmountInput.value);
  editingRecord.type     = editTypeInput.value;
  editingRecord.category = makeCategoryField(parentId, childName);
  editingRecord.title    = editMemoInput.value.trim() || childName || getParentName(parentId);
  saveRecords();
  render();
  hideModal(editModal, editOverlay);
  editingRecord = null;
});

// ===================================
// 出入金リスト描画
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
  const sorted = [...records].sort((a, b) => {
    if (b.date !== a.date) return b.date.localeCompare(a.date);
    return records.indexOf(b) - records.indexOf(a);
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
    list.appendChild(dateHeader);
    group.records.forEach(record => {
      const row = document.createElement("div");
      row.className = "mf-record-row";
      const isExpense = record.type === "expense";
      const catLabel  = displayCategory(record.category);
      row.innerHTML = `
        <div class="mf-row-left">
          <span class="mf-title">${record.title || catLabel}</span>
          <span class="mf-cat-label">${catLabel}</span>
        </div>
        <span class="mf-amount ${isExpense ? "mf-amount-expense" : "mf-amount-income"}">${isExpense ? "-" : "+"}¥${record.amount.toLocaleString()}</span>
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
  if (txList) txList.innerHTML = "";

  const ym = monthSelector.value;
  const [year, m] = ym.split("-").map(Number);
  const { start, end } = getPeriodRange(ym);
  const startDate = new Date(start + "T00:00:00");
  const endDate   = new Date(end   + "T00:00:00");

  if (ymEl)    ymEl.textContent = `${year}年${m}月`;
  if (rangeEl) {
    const fmt = d => `${d.getMonth()+1}月${d.getDate()}日`;
    rangeEl.textContent = `（${fmt(startDate)}〜${fmt(endDate)}）`;
  }

  const firstDow = startDate.getDay();
  for (let i = 0; i < firstDow; i++) calendar.appendChild(document.createElement("div"));

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

  if (!txList) return;
  const periodRecords = records.filter(r => r.date >= start && r.date <= end);
  if (periodRecords.length === 0) {
    txList.innerHTML = '<p style="text-align:center;color:#aaa;font-size:14px;padding:20px 0;">この期間の記録はありません</p>';
    return;
  }
  const sorted = [...periodRecords].sort((a, b) => b.date.localeCompare(a.date));
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
      const catLabel  = displayCategory(record.category);
      row.innerHTML = `
        <div class="mf-row-left">
          <span class="mf-title">${record.title || catLabel}</span>
          <span class="mf-cat-label">${catLabel}</span>
        </div>
        <span class="mf-amount ${isExpense ? "mf-amount-expense" : "mf-amount-income"}">${isExpense ? "-" : "+"}¥${record.amount.toLocaleString()}</span>
      `;
      row.addEventListener("click", () => openEditModal(record));
      txList.appendChild(row);
    });
  });
}

// ===================================
// カテゴリ設定（大分類一覧）
// ===================================
function renderCategoryView() {
  const ul = document.getElementById("parentCategoryList");
  ul.innerHTML = "";
  PARENT_CATEGORIES.forEach(parent => {
    const children  = getChildren(parent.id);
    const childCount = children.length;
    const li = document.createElement("li");
    li.className = "parent-category-item";
    li.innerHTML = `
      <span class="parent-cat-icon">${parent.icon}</span>
      <span class="parent-cat-name">${parent.name}</span>
      <span class="parent-cat-count">${childCount}個</span>
      <span class="parent-cat-arrow">›</span>
    `;
    li.addEventListener("click", () => {
      currentCategoryParentId = parent.id;
      navigate("categoryDetail");
    });
    ul.appendChild(li);
  });
}

// ===================================
// カテゴリ設定（小分類一覧）
// ===================================
function renderCategoryDetailView() {
  const pid = currentCategoryParentId;
  if (!pid) return;
  if (!childCategories[pid]) childCategories[pid] = [];

  const ul = document.getElementById("childCategoryList");
  ul.innerHTML = "";

  // ヘッダー行：「小分類」ラベル ＋ ＋ボタン
  const headerLi = document.createElement("li");
  headerLi.className = "child-cat-section-header";
  headerLi.innerHTML = `
    <span class="child-cat-section-title">小分類</span>
    <button class="child-cat-add-btn" id="addChildCatBtn">＋</button>
  `;
  ul.appendChild(headerLi);

  const children = getChildren(pid);

  if (children.length === 0) {
    const emptyLi = document.createElement("li");
    emptyLi.className = "child-cat-empty";
    emptyLi.textContent = "小分類がありません。＋から追加してください。";
    ul.appendChild(emptyLi);
  }

  children.forEach((child, idx) => {
    const li = document.createElement("li");
    li.className = "child-category-item";
    li.innerHTML = `
      <span class="child-cat-name">${child.name}</span>
      <button class="child-cat-del-btn" data-idx="${idx}">削除</button>
    `;
    // 名前タップ → インライン編集
    const nameSpan = li.querySelector(".child-cat-name");
    nameSpan.addEventListener("click", () => {
      const input = document.createElement("input");
      input.type  = "text";
      input.value = child.name;
      input.className = "child-cat-edit-input";
      const save = () => {
        const newName = input.value.trim();
        if (!newName) { renderCategoryDetailView(); return; }
        // records のカテゴリも更新
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
    li.querySelector(".child-cat-del-btn").addEventListener("click", () => {
      const usedCount = records.filter(r => {
        const { parentId, childName } = parseCategoryField(r.category);
        return parentId === pid && childName === child.name;
      }).length;
      if (usedCount > 0 && !confirm(`「${child.name}」は${usedCount}件の記録で使用中です。削除しますか？`)) return;
      childCategories[pid].splice(idx, 1);
      saveChildCategories();
      renderCategoryDetailView();
    });
    ul.appendChild(li);
  });

  // ＋ボタンのイベント（DOM追加後に設定）
  document.getElementById("addChildCatBtn").addEventListener("click", () => {
    showAddChildDialog(pid);
  });
}

// 小分類追加ダイアログ
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
    <input type="text" id="newChildCatInput" placeholder="小分類名を入力" style="width:100%;height:44px;font-size:16px;padding:8px 12px;border:1px solid #ddd;border-radius:8px;box-sizing:border-box;">
    <div style="display:flex;gap:10px;margin-top:14px;">
      <button id="cancelChildCat" style="flex:1;height:44px;border:1.5px solid #ddd;border-radius:10px;background:#fff;font-size:15px;cursor:pointer;">キャンセル</button>
      <button id="confirmChildCat" style="flex:1;height:44px;border:none;border-radius:10px;background:var(--theme,#4caf50);color:#fff;font-size:15px;font-weight:bold;cursor:pointer;">追加</button>
    </div>
  `;
  overlay.appendChild(dialog);
  document.body.appendChild(overlay);

  const input = dialog.querySelector("#newChildCatInput");
  input.focus();

  dialog.querySelector("#cancelChildCat").addEventListener("click", () => overlay.remove());
  dialog.querySelector("#confirmChildCat").addEventListener("click", () => {
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
  });
  input.addEventListener("keydown", e => {
    if (e.key === "Enter") dialog.querySelector("#confirmChildCat").click();
  });
  overlay.addEventListener("click", e => { if (e.target === overlay) overlay.remove(); });
}

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
  const e2 = new Date(end   + "T00:00:00");
  const fmt = d => `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日`;
  const mo  = Number(ym.split("-")[1]);
  const el  = document.getElementById("periodPreview");
  if (el) el.textContent = `${mo}月の集計期間：${fmt(s)} 〜 ${fmt(e2)}`;
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
  filtered.forEach(r => {
    const label = displayCategory(r.category);
    map[label] = (map[label] || 0) + r.amount;
  });
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
  const forSummary = filterByPeriod(monthSelector.value);
  let income = 0, expense = 0;
  forSummary.forEach(r => r.type === "income" ? income += r.amount : expense += r.amount);
  document.getElementById("incomeTotal").textContent  = income.toLocaleString();
  document.getElementById("expenseTotal").textContent = expense.toLocaleString();
  const bal   = income - expense;
  const balEl = document.getElementById("balance");
  balEl.textContent = bal.toLocaleString();
  balEl.style.color = bal >= 0 ? "var(--theme)" : "#c62828";
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
document.getElementById("graphToggle").addEventListener("click", e => {
  const btn = e.target.closest(".graph-toggle-btn");
  if (!btn) return;
  document.querySelectorAll("#graphToggle .graph-toggle-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  renderGraphByType(btn.dataset.value);
});

// ===================================
// ホーム描画
// ===================================
let budgets = JSON.parse(localStorage.getItem("budgets")) || {};
function saveBudgets() { localStorage.setItem("budgets", JSON.stringify(budgets)); }

function getMonthlySpending() {
  const map = {};
  filterByPeriod(monthSelector.value).forEach(r => {
    if (r.type === "expense") {
      const label = displayCategory(r.category);
      map[label] = (map[label] || 0) + r.amount;
    }
  });
  return map;
}

function renderHome() {
  const card    = document.getElementById("homeBudgetCard");
  const rowsEl  = document.getElementById("homeBudgetRows");
  const monthEl = document.getElementById("homeBudgetMonth");
  if (!card || !rowsEl) return;
  const budgetCats = Object.keys(budgets).filter(k => budgets[k] > 0);
  if (budgetCats.length === 0) { card.style.display = "none"; return; }
  card.style.display = "";
  rowsEl.innerHTML   = "";
  const ym = monthSelector.value;
  const [y, m] = ym.split("-").map(Number);
  if (monthEl) monthEl.textContent = `${y}年${m}月`;
  const spending = getMonthlySpending();
  budgetCats.forEach(catName => {
    const budget = budgets[catName];
    const spent  = spending[catName] || 0;
    const pct    = Math.min(spent / budget * 100, 100);
    const over   = spent > budget;
    const warn   = !over && spent / budget >= 0.8;
    const barClass = over ? "over" : warn ? "warn" : "ok";
    const row = document.createElement("div");
    row.className = "home-budget-row";
    row.innerHTML = `
      <div class="home-budget-row-top">
        <span class="home-budget-cat">${catName}</span>
        <span class="home-budget-amt ${over ? "over-text" : ""}">
          ¥${spent.toLocaleString()} <span class="home-budget-limit">/ ¥${budget.toLocaleString()}</span>
        </span>
      </div>
      <div class="home-budget-bar-wrap">
        <div class="home-budget-bar ${barClass}" style="width:${pct}%"></div>
      </div>
      <div class="home-budget-row-foot">
        <span class="${over ? "over-text" : "home-budget-remain"}">
          ${over ? `¥${(spent - budget).toLocaleString()} オーバー` : `残り ¥${(budget - spent).toLocaleString()}`}
        </span>
        <span class="home-budget-pct">${Math.round(spent / budget * 100)}%</span>
      </div>
    `;
    rowsEl.appendChild(row);
  });
}

// ===================================
// 予算管理
// ===================================
function renderBudgetView() {
  const ul = document.getElementById("budgetList");
  ul.innerHTML = "";
  // 支出系の全小分類を取得
  const expenseParents = PARENT_CATEGORIES.filter(p => p.type === "expense" || p.type === "both");
  const allExpenseChildren = [];
  expenseParents.forEach(p => {
    const children = getChildren(p.id);
    children.forEach(c => allExpenseChildren.push({ parentName: p.name, childName: c.name }));
  });
  if (allExpenseChildren.length === 0) {
    ul.innerHTML = '<li style="color:#aaa;font-size:14px;padding:12px 0;">支出カテゴリがありません</li>';
    return;
  }
  const spending = getMonthlySpending();
  allExpenseChildren.forEach(({ parentName, childName }) => {
    const budget   = budgets[childName] || 0;
    const spent    = spending[childName] || 0;
    const pct      = budget > 0 ? Math.min(spent / budget * 100, 100) : 0;
    const barClass = budget > 0 ? (spent > budget ? "over" : spent / budget >= 0.8 ? "warn" : "ok") : "ok";
    const li = document.createElement("li");
    li.className = "budget-item";
    li.innerHTML = `
      <div class="budget-item-top">
        <div>
          <span class="budget-item-parent">${parentName}</span>
          <span class="budget-item-name">${childName}</span>
        </div>
        <div class="budget-item-input-wrap">
          <span>¥</span>
          <input type="number" class="budget-input" data-cat="${childName}"
            value="${budget > 0 ? budget : ""}" placeholder="未設定">
        </div>
      </div>
      <div class="budget-bar-wrap">
        <div class="budget-bar ${barClass}" style="width:${pct}%"></div>
      </div>
      <div class="budget-bar-info">
        <span>使用中：¥${spent.toLocaleString()}</span>
        <span class="${spent > budget && budget > 0 ? "over-text" : ""}">
          ${budget > 0 ? (spent > budget ? `¥${(spent - budget).toLocaleString()} オーバー` : `残り ¥${(budget - spent).toLocaleString()}`) : "予算未設定"}
        </span>
      </div>
    `;
    const input = li.querySelector(".budget-input");
    input.addEventListener("change", () => {
      const val = Number(input.value);
      if (val > 0) budgets[childName] = val;
      else         delete budgets[childName];
      saveBudgets();
      renderBudgetView();
      renderHome();
    });
    ul.appendChild(li);
  });
}

// ===================================
// Gemini APIキー設定
// ===================================
function renderApiKeyView() {
  const input     = document.getElementById("geminiApiKeyInput");
  const statusEl  = document.getElementById("apiKeyStatus");
  const deleteBtn = document.getElementById("deleteApiKeyBtn");
  const saved     = localStorage.getItem("geminiApiKey") || "";
  input.value = saved ? "●".repeat(20) : "";
  input.dataset.hasKey = saved ? "1" : "0";
  if (saved) {
    statusEl.textContent = "✅ APIキーが保存されています";
    statusEl.className   = "api-key-status api-key-status-ok";
    deleteBtn.style.display = "";
  } else {
    statusEl.textContent = "⚠️ APIキーが未設定です。レシート読み取りを使うには設定が必要です。";
    statusEl.className   = "api-key-status api-key-status-warn";
    deleteBtn.style.display = "none";
  }
}

document.getElementById("geminiApiKeyInput").addEventListener("focus", function() {
  if (this.dataset.hasKey === "1") { this.value = ""; this.dataset.hasKey = "0"; }
});
document.getElementById("toggleApiKeyVisible").addEventListener("click", () => {
  const input = document.getElementById("geminiApiKeyInput");
  input.type = input.type === "password" ? "text" : "password";
});
document.getElementById("saveApiKeyBtn").addEventListener("click", () => {
  const input = document.getElementById("geminiApiKeyInput");
  const val   = input.value.trim();
  if (!val || val === "●".repeat(20)) { alert("APIキーを入力してください"); return; }
  if (!val.startsWith("AIza") && !confirm("APIキーの形式が正しくない可能性があります。このまま保存しますか？")) return;
  localStorage.setItem("geminiApiKey", val);
  showToast("APIキーを保存しました");
  renderApiKeyView();
  applyFabVisibility();
});
document.getElementById("deleteApiKeyBtn").addEventListener("click", () => {
  if (!confirm("保存済みのAPIキーを削除しますか？")) return;
  localStorage.removeItem("geminiApiKey");
  showToast("APIキーを削除しました");
  renderApiKeyView();
  applyFabVisibility();
});

// ===================================
// リセット機能
// ===================================
const RESET_IDS = ["resetTransactions", "resetAccounts", "resetBudgets", "resetCategories"];

function renderResetView() {
  ["resetAll", ...RESET_IDS].forEach(id => {
    document.getElementById(id).checked = false;
  });
  updateResetBtn();
}

function updateResetBtn() {
  const anyOn = RESET_IDS.some(id => document.getElementById(id).checked);
  document.getElementById("execResetBtn").disabled = !anyOn;
}

document.getElementById("resetAll").addEventListener("change", function() {
  RESET_IDS.forEach(id => { document.getElementById(id).checked = this.checked; });
  updateResetBtn();
});
RESET_IDS.forEach(id => {
  document.getElementById(id).addEventListener("change", () => {
    const allOn = RESET_IDS.every(i => document.getElementById(i).checked);
    document.getElementById("resetAll").checked = allOn;
    updateResetBtn();
  });
});

document.getElementById("execResetBtn").addEventListener("click", () => {
  const doRecords    = document.getElementById("resetTransactions").checked;
  const doAccounts   = document.getElementById("resetAccounts").checked;
  const doBudgets    = document.getElementById("resetBudgets").checked;
  const doCategories = document.getElementById("resetCategories").checked;
  const targets = [];
  if (doRecords)    targets.push("出入金");
  if (doAccounts)   targets.push("口座");
  if (doBudgets)    targets.push("予算");
  if (doCategories) targets.push("カテゴリ");
  if (!confirm(`以下のデータを完全に削除します。\n\n・${targets.join("\n・")}\n\nこの操作は取り消せません。本当に実行しますか？`)) return;
  if (doRecords)  { records = []; saveRecords(); }
  if (doAccounts) { accounts = []; saveAccounts(); }
  if (doBudgets)  { budgets = {}; saveBudgets(); }
  if (doCategories) {
    // デフォルトに戻してlocalStorageへ保存
    const obj = {};
    Object.keys(DEFAULT_CHILD_CATEGORIES).forEach(pid => {
      obj[pid] = DEFAULT_CHILD_CATEGORIES[pid].map(name => ({ name }));
    });
    childCategories = obj;
    saveChildCategories();
  }
  showToast(`${targets.join("・")}をリセットしました`);
  renderResetView();
  render();
  renderHome();
});

// ===================================
// 口座管理
// ===================================
let accounts      = JSON.parse(localStorage.getItem("accounts")) || [];
let editingAccount  = null;
let nextAccountId   = Math.max(0, ...accounts.map(a => a.id || 0)) + 1;

function saveAccounts() { localStorage.setItem("accounts", JSON.stringify(accounts)); }

function renderAccountView() {
  const ul = document.getElementById("accountList");
  ul.innerHTML = "";
  accounts.forEach(account => {
    const li = document.createElement("li");
    li.className = "account-li";
    const info = document.createElement("div");
    info.className = "account-info";
    info.innerHTML =
      `<span class="account-name">${account.name}</span>` +
      (account.memo ? `<span class="account-memo">${account.memo}</span>` : "");
    const balWrap = document.createElement("div");
    balWrap.className = "account-balance-wrap";
    const balSpan = document.createElement("span");
    balSpan.className = "account-balance";
    balSpan.textContent = `¥${account.balance.toLocaleString()}`;
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
      input.addEventListener("keydown", e => { if (e.key === "Enter") input.blur(); });
      balWrap.replaceChild(input, balSpan);
      input.focus();
      input.select();
    });
    balWrap.appendChild(balSpan);
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

function openAccountModal(account) {
  editingAccount = account || null;
  const isEdit   = !!account;
  document.getElementById("accountModalTitle").textContent = isEdit ? "口座を編集" : "口座を追加";
  document.getElementById("accountName").value    = isEdit ? account.name    : "";
  document.getElementById("accountBalance").value = isEdit ? account.balance : "";
  document.getElementById("accountMemo").value    = isEdit ? account.memo    : "";
  document.getElementById("deleteAccountBtn").classList.toggle("hidden", !isEdit);
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
    editingAccount.name = name; editingAccount.balance = balance; editingAccount.memo = memo;
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

function changeMonth(delta, direction) {
  const [year, month] = monthSelector.value.split("-").map(Number);
  const d = new Date(year, month - 1 + delta, 1);
  const newVal = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  const currentView = viewStack[viewStack.length - 1];
  const viewEl = VIEW_CONFIG[currentView].el;
  const outClass = direction === "left" ? "slide-out-left"  : "slide-out-right";
  const inClass  = direction === "left" ? "slide-in-right"  : "slide-in-left";
  viewEl.classList.add(outClass);
  setTimeout(() => {
    monthSelector.value = newVal;
    updateMonthLabel();
    if (currentView === "graph") {
      document.getElementById("graphMonthSelector").value = newVal;
      renderGraph();
    } else { render(); }
    viewEl.classList.remove(outClass);
    viewEl.classList.add(inClass);
    requestAnimationFrame(() => requestAnimationFrame(() => viewEl.classList.remove(inClass)));
  }, 160);
}

document.getElementById("prevMonthBtn").addEventListener("click", () => changeMonth(-1, "right"));
document.getElementById("nextMonthBtn").addEventListener("click", () => changeMonth( 1, "left"));

// ===================================
// スワイプジェスチャー
// ===================================
(function setupSwipe() {
  let startX = 0, startY = 0;
  let isBackGesture = false, isMonthSwipe = false, decided = false;
  const BACK_EDGE = 40, BACK_THRESHOLD = 80, MONTH_THRESHOLD = 50;

  const pageWrapper = document.getElementById("pageWrapper");
  const backLayer   = document.getElementById("backLayer");
  const backDim     = document.getElementById("backLayerDim");
  const topBar      = document.getElementById("topBar");

  function canGoBack() {
    const cur = viewStack[viewStack.length - 1];
    return viewStack.length > 1 || cur === "calendar";
  }
  function doGoBack() {
    const cur = viewStack[viewStack.length - 1];
    if (viewStack.length > 1) goBack();
    else if (cur === "calendar") switchToTab("transaction");
  }

  // ジェスチャー開始時：前のビューをbackLayerに移動して表示
  function prepareBackLayer() {
    let prevViewEl = null;
    if (viewStack.length >= 2) {
      const prevName = viewStack[viewStack.length - 2];
      prevViewEl = VIEW_CONFIG[prevName]?.el;
    } else if (viewStack[viewStack.length - 1] === "calendar") {
      prevViewEl = VIEW_CONFIG["transaction"]?.el;
    }

    if (prevViewEl) {
      // 元の親を記録してからbackLayerに移動
      prevViewEl._originalParent = prevViewEl.parentNode;
      prevViewEl._originalNextSibling = prevViewEl.nextSibling;
      // backLayerDimの前に挿入（オーバーレイが前のビューの上に来るように）
      backLayer.insertBefore(prevViewEl, backDim);
      // activeクラスを付けてfixedで全画面表示
      prevViewEl.classList.add("back-gesture-prev");
    }

    backDim.style.transition = "none";
    backDim.style.opacity    = "0.35";
    document.body.classList.add("back-gesture-active");
  }

  // ジェスチャー終了時：前のビューを元の場所に戻す
  function cleanupBackLayer() {
    document.body.classList.remove("back-gesture-active");

    // backLayerに移動していたビューを元の位置に戻す
    const prevEl = backLayer.querySelector(".back-gesture-prev");
    if (prevEl) {
      prevEl.classList.remove("back-gesture-prev");
      if (prevEl._originalParent) {
        if (prevEl._originalNextSibling) {
          prevEl._originalParent.insertBefore(prevEl, prevEl._originalNextSibling);
        } else {
          prevEl._originalParent.appendChild(prevEl);
        }
        prevEl._originalParent = null;
        prevEl._originalNextSibling = null;
      }
    }

    pageWrapper.style.transition = "";
    pageWrapper.style.transform  = "";
    pageWrapper.style.boxShadow  = "";
    backDim.style.transition     = "";
    backDim.style.opacity        = "";
    topBar.style.transition      = "";
    topBar.style.opacity         = "";
    topBar.querySelectorAll(".top-bar-title, .top-bar-btn").forEach(el => {
      el.style.transition = "";
      el.style.opacity    = "";
    });
  }

  document.addEventListener("touchstart", e => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    isBackGesture = false;
    isMonthSwipe  = false;
    decided       = false;
  }, { passive: true });

  document.addEventListener("touchmove", e => {
    if (!addModal.classList.contains("hidden")) return;
    if (!editModal.classList.contains("hidden")) return;

    const curX = e.touches[0].clientX;
    const curY = e.touches[0].clientY;
    const dx = curX - startX;
    const dy = curY - startY;

    if (!decided) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      if (Math.abs(dy) > Math.abs(dx)) { decided = true; return; }
      if (startX <= BACK_EDGE && dx > 0 && canGoBack()) {
        isBackGesture = true;
        prepareBackLayer();
      } else {
        const cur = viewStack[viewStack.length - 1];
        if (["calendar","graph","transaction"].includes(cur)) isMonthSwipe = true;
      }
      decided = true;
    }

    if (isBackGesture) {
      const move     = Math.max(0, dx);
      const progress = Math.min(move / window.innerWidth, 1);

      pageWrapper.style.transition = "none";
      pageWrapper.style.transform  = `translateX(${move}px)`;
      pageWrapper.style.boxShadow  = `-6px 0 16px rgba(0,0,0,${0.15 * (1 - progress)})`;

      // 背面オーバーレイを徐々に薄く（前のページが見えてくる）
      backDim.style.transition = "none";
      backDim.style.opacity    = String(0.35 * (1 - progress));

      // ヘッダー要素をフェードアウト
      const fadeOpacity = Math.max(0, 1 - progress * 2);
      topBar.querySelectorAll(".top-bar-title, .top-bar-btn").forEach(el => {
        el.style.opacity = String(fadeOpacity);
      });
    }
  }, { passive: true });

  document.addEventListener("touchend", e => {
    if (!addModal.classList.contains("hidden")) return;
    if (!editModal.classList.contains("hidden")) return;

    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const dx = endX - startX;
    const dy = endY - startY;

    if (isBackGesture) {
      if (dx >= BACK_THRESHOLD) {
        // 確定：アニメーション後にgoBack → cleanup
        const trans = "transform 0.22s cubic-bezier(0.4,0,0.2,1)";
        pageWrapper.style.transition = trans;
        pageWrapper.style.transform  = `translateX(${window.innerWidth}px)`;
        pageWrapper.style.boxShadow  = "none";
        backDim.style.transition     = "opacity 0.22s";
        backDim.style.opacity        = "0";
        topBar.style.transition      = "opacity 0.22s";
        topBar.style.opacity         = "0";
        setTimeout(() => {
          // goBack先を表示してからリセット
          doGoBack();
          // 次のフレームでリセット（goBack直後にtransformを消すと戻って見えるのを防ぐ）
          requestAnimationFrame(() => {
            cleanupBackLayer();
          });
        }, 220);
      } else {
        // キャンセル：元の位置に戻す
        pageWrapper.style.transition = "transform 0.28s cubic-bezier(0.4,0,0.2,1), box-shadow 0.28s";
        pageWrapper.style.transform  = "translateX(0)";
        pageWrapper.style.boxShadow  = "none";
        backDim.style.transition     = "opacity 0.28s";
        backDim.style.opacity        = "0.35";
        topBar.querySelectorAll(".top-bar-title, .top-bar-btn").forEach(el => {
          el.style.transition = "opacity 0.28s";
          el.style.opacity    = "1";
        });
        setTimeout(() => { cleanupBackLayer(); }, 300);
      }
      isBackGesture = false;
      return;
    }

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
// デフォルト表示月
// ===================================
function getDefaultMonth() {
  const today = new Date();
  const yyyy = today.getFullYear(), mm = today.getMonth() + 1, dd = today.getDate();
  if (periodStartDay === 1 || dd >= periodStartDay)
    return `${yyyy}-${String(mm).padStart(2, "0")}`;
  const prev = new Date(yyyy, mm - 2, 1);
  return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;
}

// ===================================
// 初期化
// ===================================
applyThemeColor(themeColor);
monthSelector.value = getDefaultMonth();
updateMonthLabel();
applyTabVisibility();
applyFabVisibility();
render();
renderHome(); // ← ホーム画面の予算カードを初期表示時にも描画

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
