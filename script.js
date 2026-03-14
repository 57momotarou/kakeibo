// ===================================
// 要素の取得
// ===================================
const list          = document.getElementById("list");
const monthSelector = document.getElementById("monthSelector");

// 上部バー
const topBarNormal   = document.getElementById("topBarNormal");
const topBarSettings = document.getElementById("topBarSettings");
const settingsBarTitle = document.getElementById("settingsBarTitle");
const openAddBtn     = document.getElementById("openAddBtn");
const openSettingsBtn= document.getElementById("openSettingsBtn");
const backBtn        = document.getElementById("backBtn");

// 追加モーダル
const closeAddBtn    = document.getElementById("closeAddBtn");
const addOverlay     = document.getElementById("addOverlay");
const addModal       = document.getElementById("addModal");
const dateInput      = document.getElementById("date");
const amountInput    = document.getElementById("amount");
const addTypeToggle  = document.getElementById("addTypeToggle");
const addTypeHidden  = document.getElementById("addTypeHidden");
const categorySelect = document.getElementById("category");
const memoInput      = document.getElementById("memo");
const addButton      = document.getElementById("addButton");

// 編集モーダル
const closeEditBtn    = document.getElementById("closeEditBtn");
const editOverlay     = document.getElementById("editOverlay");
const editModal       = document.getElementById("editModal");
const editDateInput   = document.getElementById("editDate");
const editAmountInput = document.getElementById("editAmount");
const editTypeInput   = document.getElementById("editType");
const editCatSelect   = document.getElementById("editCategory");
const editMemoInput   = document.getElementById("editMemo");
const saveEditButton  = document.getElementById("saveEditButton");
const editTypeToggle  = document.getElementById("editTypeToggle");

// ===================================
// データの読み込み
// ===================================
let records = JSON.parse(localStorage.getItem("records")) || [];

const DEFAULT_CATEGORIES = [
  { name: "食費",   type: "expense" },
  { name: "日用品", type: "expense" },
  { name: "交通",   type: "expense" },
  { name: "家賃",   type: "expense" },
  { name: "その他", type: "both"    },
  { name: "給与",   type: "income"  },
];
let categories = JSON.parse(localStorage.getItem("categories")) || DEFAULT_CATEGORIES;

// ===================================
// 画面スタック管理
// ===================================
// スタック例: ["home"] → ["home","settings"] → ["home","settings","category"]
let viewStack = ["home"];

const VIEW_CONFIG = {
  home:     { el: document.getElementById("homeView"),     title: null,           showTabs: true  },
  calendar: { el: document.getElementById("calendarView"), title: null,           showTabs: true  },
  graph:    { el: document.getElementById("graphView"),    title: null,           showTabs: true  },
  settings: { el: document.getElementById("settingsView"), title: "設定",         showTabs: false },
  category: { el: document.getElementById("categoryView"), title: "カテゴリ変更", showTabs: false },
  theme:    { el: document.getElementById("themeView"),    title: "テーマカラー", showTabs: false },
  period:   { el: document.getElementById("periodView"),   title: "集計期間",     showTabs: false },
};

function navigate(viewName) {
  // 現在の画面を非表示
  const current = viewStack[viewStack.length - 1];
  VIEW_CONFIG[current].el.classList.remove("active");

  // 新しい画面をスタックに積む
  viewStack.push(viewName);
  showCurrentView();
}

function goBack() {
  if (viewStack.length <= 1) return;
  const current = viewStack[viewStack.length - 1];
  VIEW_CONFIG[current].el.classList.remove("active");
  viewStack.pop();
  showCurrentView();
}

function showCurrentView() {
  const name   = viewStack[viewStack.length - 1];
  const config = VIEW_CONFIG[name];

  config.el.classList.add("active");

  // 上部バーの切り替え
  const isMain = (name === "home" || name === "calendar" || name === "graph");
  topBarNormal.classList.toggle("hidden", !isMain);
  topBarSettings.classList.toggle("hidden", isMain);
  if (!isMain) settingsBarTitle.textContent = config.title;

  // 下部タブの表示切り替え
  const tabBar = document.getElementById("tabBar");
  tabBar.classList.toggle("hidden", !config.showTabs);

  // FABの表示切り替え（タブがある画面のみ表示）
  document.getElementById("openAddBtn").classList.toggle("hidden", !config.showTabs);

  // 画面ごとの初期化
  if (name === "home")     render();
  if (name === "category") renderCategoryView();
  if (name === "theme")    renderColorPresets();
  if (name === "graph")    renderGraph();
  if (name === "period")   renderPeriodView();

  // タブのactive同期
  document.getElementById("homeTab").classList.toggle("active",     name === "home");
  document.getElementById("calendarTab").classList.toggle("active", name === "calendar");
  document.getElementById("graphTab").classList.toggle("active",    name === "graph");
}

// 戻るボタン
backBtn.addEventListener("click", goBack);

// 設定ボタン
openSettingsBtn.addEventListener("click", () => navigate("settings"));

// 設定メニューの各項目
document.getElementById("goCategory").addEventListener("click", () => navigate("category"));
document.getElementById("goTheme").addEventListener("click", () => navigate("theme"));
document.getElementById("goPeriod").addEventListener("click", () => navigate("period"));

// 下部タブ
document.getElementById("homeTab").addEventListener("click", () => {
  // settingsにいる場合はスタックをリセットしてhomeへ
  viewStack.forEach((_, i) => {
    if (i > 0) VIEW_CONFIG[viewStack[i]].el.classList.remove("active");
  });
  VIEW_CONFIG[viewStack[0]].el.classList.remove("active");
  viewStack = ["home"];
  showCurrentView();
});

document.getElementById("calendarTab").addEventListener("click", () => {
  viewStack.forEach((_, i) => {
    if (i > 0) VIEW_CONFIG[viewStack[i]].el.classList.remove("active");
  });
  VIEW_CONFIG[viewStack[0]].el.classList.remove("active");
  viewStack = ["calendar"];
  showCurrentView();
});

document.getElementById("graphTab").addEventListener("click", () => {
  viewStack.forEach((_, i) => {
    if (i > 0) VIEW_CONFIG[viewStack[i]].el.classList.remove("active");
  });
  VIEW_CONFIG[viewStack[0]].el.classList.remove("active");
  viewStack = ["graph"];
  showCurrentView();
});

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

let themeColor = localStorage.getItem("themeColor") || "#4caf50";

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

function darkenColor(hex, amount) {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.max(0, (num >> 16) - amount);
  const g = Math.max(0, ((num >> 8) & 0xff) - amount);
  const b = Math.max(0, (num & 0xff) - amount);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
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
// 初期化
// ===================================
monthSelector.value = new Date().toISOString().slice(0, 7);
monthSelector.addEventListener("change", render);

updateCategoryOptions({ value: "expense" }, categorySelect);
render();

// ===================================
// カテゴリプルダウン更新
// ===================================
function updateCategoryOptions(typeEl, catEl, currentValue) {
  const type = typeEl.value;
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
// 追加モーダルのトグル
// ===================================
addTypeToggle.addEventListener("click", e => {
  const btn = e.target.closest(".type-toggle-btn");
  if (!btn) return;
  const val = btn.dataset.value;
  addTypeToggle.querySelectorAll(".type-toggle-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  addTypeHidden.value = val;
  updateCategoryOptions({ value: val }, categorySelect);
});

// 編集モーダルのトグル
editTypeToggle.addEventListener("click", e => {
  const btn = e.target.closest(".type-toggle-btn");
  if (!btn) return;
  const val = btn.dataset.value;
  editTypeToggle.querySelectorAll(".type-toggle-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  editTypeInput.value = val;
  updateCategoryOptions({ value: val }, editCatSelect, editCatSelect.value);
});

// ===================================
// 追加モーダルの開閉
// ===================================
function openAddModal() {
  dateInput.value   = new Date().toISOString().slice(0, 10);
  amountInput.value = "";
  memoInput.value   = "";
  addTypeHidden.value = "expense";
  addTypeToggle.querySelectorAll(".type-toggle-btn").forEach(b => {
    b.classList.toggle("active", b.dataset.value === "expense");
  });
  updateCategoryOptions({ value: "expense" }, categorySelect);
  showModal(addModal, addOverlay);
}

function closeAddModal() { hideModal(addModal, addOverlay); }

openAddBtn.addEventListener("click", openAddModal);
closeAddBtn.addEventListener("click", closeAddModal);
addOverlay.addEventListener("click", closeAddModal);

// ===================================
// 編集モーダルの開閉
// ===================================
let editingRecord = null;

function openEditModal(record) {
  editingRecord         = record;
  editDateInput.value   = record.date;
  editAmountInput.value = record.amount;
  editTypeInput.value   = record.type;
  editTypeToggle.querySelectorAll(".type-toggle-btn").forEach(b => {
    b.classList.toggle("active", b.dataset.value === record.type);
  });
  updateCategoryOptions({ value: record.type }, editCatSelect, record.category);
  editMemoInput.value   = record.title || "";
  showModal(editModal, editOverlay);
}

function closeEditModal() {
  hideModal(editModal, editOverlay);
  editingRecord = null;
}

closeEditBtn.addEventListener("click", closeEditModal);
editOverlay.addEventListener("click", closeEditModal);

document.getElementById("deleteRecordBtn").addEventListener("click", () => {
  if (!editingRecord) return;
  if (!confirm("この記録を削除しますか？")) return;
  const i = records.indexOf(editingRecord);
  if (i !== -1) records.splice(i, 1);
  saveRecords();
  render();
  closeEditModal();
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
  closeEditModal();
});

// ===================================
// モーダル共通アニメーション
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
// 記録の追加
// ===================================
addButton.addEventListener("click", () => {
  const date = dateInput.value;
  if (!date || amountInput.value === "") {
    alert("日付と金額を入力してください");
    return;
  }
  records.push({
    date,
    amount:   Number(amountInput.value),
    type:     addTypeHidden.value,
    category: categorySelect.value,
    title:    memoInput.value.trim() || categorySelect.value,
  });
  saveRecords();
  render();
  closeAddModal();
});

// ===================================
// 保存
// ===================================
function saveRecords()    { localStorage.setItem("records",    JSON.stringify(records));    }
function saveCategories() { localStorage.setItem("categories", JSON.stringify(categories)); }

// ===================================
// 集計期間
// ===================================
// 集計開始日（1〜28、デフォルト1）
let periodStartDay = Number(localStorage.getItem("periodStartDay")) || 1;

// 選択中の「基準月」から実際の集計開始日・終了日を計算する
// 例）基準月=2025-03、開始日=25 → 2025-02-25 〜 2025-03-24
function getPeriodRange(yearMonth) {
  const [year, month] = yearMonth.split("-").map(Number);

  if (periodStartDay === 1) {
    // 開始日が1日の場合はそのまま
    const start = `${yearMonth}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const end   = `${yearMonth}-${String(lastDay).padStart(2, "0")}`;
    return { start, end };
  }

  // 開始日がN日の場合：前月N日〜当月(N-1)日
  const startMonth = month === 1 ? 12 : month - 1;
  const startYear  = month === 1 ? year - 1 : year;
  const startStr   = `${startYear}-${String(startMonth).padStart(2,"0")}-${String(periodStartDay).padStart(2,"0")}`;

  const endDay   = periodStartDay - 1;
  const endStr   = `${year}-${String(month).padStart(2,"0")}-${String(endDay).padStart(2,"0")}`;

  return { start: startStr, end: endStr };
}

// 指定期間内のレコードを返す
function filterByPeriod(yearMonth) {
  const { start, end } = getPeriodRange(yearMonth);
  return records.filter(r => r.date >= start && r.date <= end);
}

// 集計期間画面の描画
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
  updatePeriodPreview();
}

function updatePeriodPreview() {
  const ym      = monthSelector.value;
  const { start, end } = getPeriodRange(ym);
  const s = new Date(start + "T00:00:00");
  const e = new Date(end   + "T00:00:00");
  const fmt = d => `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日`;
  document.getElementById("periodPreview").textContent =
    `現在の設定：${fmt(s)} 〜 ${fmt(e)}`;
}

document.getElementById("periodStartDay").addEventListener("change", e => {
  periodStartDay = Number(e.target.value);
  localStorage.setItem("periodStartDay", periodStartDay);
  updatePeriodPreview();
  render(); // ホーム画面の集計も即時反映
});



// ===================================
// ホーム画面の描画
// ===================================
function render() {
  const selectedMonth = monthSelector.value;
  list.innerHTML = "";

  const filtered = filterByPeriod(selectedMonth);
  const sorted   = [...filtered].sort((a, b) => new Date(b.date) - new Date(a.date));

  // 日付ごとにグループ化
  const groups = [];
  sorted.forEach(record => {
    const last = groups[groups.length - 1];
    if (last && last.date === record.date) last.records.push(record);
    else groups.push({ date: record.date, records: [record] });
  });

  groups.forEach(group => {
    // 日付ヘッダー
    const header = document.createElement("li");
    header.className = "date-header";
    const d = new Date(group.date + "T00:00:00");
    const weekDay = ["日","月","火","水","木","金","土"][d.getDay()];
    header.innerHTML =
      `<span class="date-header-label">${d.getMonth()+1}月${d.getDate()}日（${weekDay}）</span>`;
    list.appendChild(header);

    // 各記録
    group.records.forEach(record => {
      const li   = document.createElement("li");
      li.className = "record-li";

      const main = document.createElement("div");
      main.className = "record-main";

      const row = document.createElement("div");
      row.className = "record-main-row";
      row.innerHTML =
        `<span class="record-title">${record.title || record.category}</span>` +
        `<span class="record-amount ${record.type === 'expense' ? 'amount-expense' : 'amount-income'}">¥${record.amount.toLocaleString()}</span>`;

      main.appendChild(row);
      main.addEventListener("click", () => openEditModal(record));

      li.appendChild(main);
      list.appendChild(li);
    });
  });

  // 合計
  let income = 0, expense = 0;
  filtered.forEach(r => r.type === "income" ? income += r.amount : expense += r.amount);

  document.getElementById("incomeTotal").textContent  = income.toLocaleString();
  document.getElementById("expenseTotal").textContent = expense.toLocaleString();
  const bal   = income - expense;
  const balEl = document.getElementById("balance");
  balEl.textContent = bal.toLocaleString();
  balEl.style.color = bal >= 0 ? "var(--theme)" : "#c62828";

  renderCalendar();
}

// ===================================
// カレンダーの描画
// ===================================
function renderCalendar() {
  const calendar = document.getElementById("calendar");
  calendar.innerHTML = "";

  const month     = monthSelector.value;
  const [year, m] = month.split("-").map(Number);
  const lastDay   = new Date(year, m, 0).getDate();
  const firstDay  = new Date(year, m - 1, 1).getDay();

  // 集計期間（グレーアウト判定用）
  const { start, end } = getPeriodRange(month);

  // 空白マス
  for (let i = 0; i < firstDay; i++) {
    calendar.appendChild(document.createElement("div"));
  }

  for (let day = 1; day <= lastDay; day++) {
    const dayStr = `${month}-${String(day).padStart(2, "0")}`;

    // その日の全レコードを取得（期間フィルタなし）
    let income = 0, expense = 0;
    records.forEach(r => {
      if (r.date === dayStr) r.type === "income" ? income += r.amount : expense += r.amount;
    });

    const inPeriod = dayStr >= start && dayStr <= end;

    const div = document.createElement("div");
    div.className = "day" + (inPeriod ? "" : " out-of-period");
    div.innerHTML = `
      <div class="date">${day}</div>
      <div class="income">＋¥${income > 0 ? income.toLocaleString() : 0}</div>
      <div class="expense">−¥${expense > 0 ? expense.toLocaleString() : 0}</div>
    `;

    const today = new Date().toISOString().slice(0, 10);
    if (dayStr === today) div.classList.add("today");
    if (inPeriod) {
      if      (expense > 0 && income > 0) div.classList.add("both");
      else if (expense > 0)               div.classList.add("expense-day");
      else if (income > 0)                div.classList.add("income-day");
    }

    div.addEventListener("click", () => {
      const detailBox = document.getElementById("dayDetail");
      const dayRecords = records.filter(r => r.date === dayStr);
      const details = dayRecords
        .map(r => `<div class="detail-row">
          <span>${r.title || r.category}</span>
          <span class="${r.type === 'expense' ? 'tag-expense' : 'tag-income'}">${r.type === "expense" ? "支出" : "収入"}</span>
          <span>¥${r.amount.toLocaleString()}</span>
        </div>`).join("");
      detailBox.innerHTML = `<h3>${m}月${day}日の明細</h3>${details || "<p>記録なし</p>"}`;
    });

    calendar.appendChild(div);
  }
}

// ===================================
// カテゴリ管理
// ===================================
function renderCategoryView() {
  const expenseList = document.getElementById("expenseCategoryList");
  const incomeList  = document.getElementById("incomeCategoryList");
  expenseList.innerHTML = "";
  incomeList.innerHTML  = "";

  categories.forEach((cat, index) => {
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
      function saveNameEdit() {
        const newName = input.value.trim();
        if (!newName) { renderCategoryView(); return; }
        records.forEach(r => { if (r.category === cat.name) r.category = newName; });
        cat.name = newName;
        saveRecords();
        saveCategories();
        renderCategoryView();
      }
      input.addEventListener("blur", saveNameEdit);
      input.addEventListener("keydown", e => { if (e.key === "Enter") saveNameEdit(); });
      li.replaceChild(input, nameSpan);
      input.focus();
    });

    const delBtn = document.createElement("button");
    delBtn.textContent = "削除";
    delBtn.className   = "delete-btn";
    delBtn.addEventListener("click", () => {
      const used = records.some(r => r.category === cat.name);
      if (used && !confirm(`「${cat.name}」は使用中です。削除しますか？`)) return;
      const i = categories.indexOf(cat);   // ★オブジェクト直接参照に変更
      if (i !== -1) categories.splice(i, 1);
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
// グラフ描画
// ===================================

// カテゴリ別に集計してデータを返す
function aggregateByCategory(type) {
  const month = document.getElementById("graphMonthSelector").value;
  const filtered = filterByPeriod(month).filter(r => r.type === type);
  const map = {};
  filtered.forEach(r => {
    map[r.category] = (map[r.category] || 0) + r.amount;
  });
  // 金額の多い順に並び替え
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .map(([name, amount]) => ({ name, amount }));
}

// グラフ用カラーパレット（10色）
const CHART_COLORS = [
  "#4caf50","#2196f3","#ff9800","#e91e63","#9c27b0",
  "#00bcd4","#ff5722","#607d8b","#795548","#8bc34a",
];

function drawPieChart(canvasId, data, totalElId) {
  const canvas = document.getElementById(canvasId);
  const ctx    = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;
  const cx = W / 2, cy = H / 2;
  const R  = Math.min(W, H) / 2 - 8;   // 外径
  const r  = R * 0.52;                   // 内径（ドーナツ型）

  ctx.clearRect(0, 0, W, H);

  const total = data.reduce((s, d) => s + d.amount, 0);

  // 合計金額を中央に表示
  const totalEl = document.getElementById(totalElId);
  if (totalEl) totalEl.textContent = total > 0 ? `¥${total.toLocaleString()}` : "";

  if (total === 0) {
    // データなし
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fillStyle = "#eee";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = "#fff";
    ctx.fill();
    ctx.fillStyle = "#aaa";
    ctx.font = "13px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("データなし", cx, cy + 5);
    return;
  }

  let startAngle = -Math.PI / 2;

  data.forEach((d, i) => {
    const slice = (d.amount / total) * Math.PI * 2;
    const color = CHART_COLORS[i % CHART_COLORS.length];

    // 扇形
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, R, startAngle, startAngle + slice);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();

    startAngle += slice;
  });

  // ドーナツの穴（白抜き）
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = "#fff";
  ctx.fill();
}

function renderLegend(legendId, data) {
  const el = document.getElementById(legendId);
  el.innerHTML = "";
  const total = data.reduce((s, d) => s + d.amount, 0);

  data.forEach((d, i) => {
    const pct  = total > 0 ? Math.round(d.amount / total * 100) : 0;
    const color = CHART_COLORS[i % CHART_COLORS.length];
    const li   = document.createElement("li");
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
  // グラフ月をホームの月と同期（先にセットしてから集計）
  const gSel = document.getElementById("graphMonthSelector");
  if (!gSel.value) gSel.value = monthSelector.value;
  else gSel.value = monthSelector.value;

  const expenseData = aggregateByCategory("expense");
  const incomeData  = aggregateByCategory("income");

  drawPieChart("expenseChart", expenseData, "expenseChartTotal");
  renderLegend("expenseLegend", expenseData);

  drawPieChart("incomeChart", incomeData, "incomeChartTotal");
  renderLegend("incomeLegend", incomeData);
}

document.getElementById("graphMonthSelector").addEventListener("change", renderGraph);

// ===================================
// Service Worker
// ===================================
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./service-worker.js").then(reg => {
    reg.addEventListener("updatefound", () => {
      const newWorker = reg.installing;
      newWorker.addEventListener("statechange", () => {
        if (newWorker.state === "activated") window.location.reload();
      });
    });
  });
  navigator.serviceWorker.addEventListener("controllerchange", () => window.location.reload());
}
