// ===================================
// 要素の取得
// ===================================
const list           = document.getElementById("list");
const monthSelector  = document.getElementById("monthSelector");

// 追加モーダル
const openAddBtn     = document.getElementById("openAddBtn");
const closeAddBtn    = document.getElementById("closeAddBtn");
const addOverlay     = document.getElementById("addOverlay");
const addModal       = document.getElementById("addModal");
const dateInput      = document.getElementById("date");
const amountInput    = document.getElementById("amount");
const typeSelect     = document.getElementById("type");
const categorySelect = document.getElementById("category");
const memoInput      = document.getElementById("memo");
const addButton      = document.getElementById("addButton");

// 編集モーダル
const closeEditBtn    = document.getElementById("closeEditBtn");
const editOverlay     = document.getElementById("editOverlay");
const editModal       = document.getElementById("editModal");
const editDateInput   = document.getElementById("editDate");
const editAmountInput = document.getElementById("editAmount");
const editTypeSelect  = document.getElementById("editType");
const editCatSelect   = document.getElementById("editCategory");
const editMemoInput   = document.getElementById("editMemo");
const saveEditButton  = document.getElementById("saveEditButton");

// 設定ドロワー
const openSettingsBtn  = document.getElementById("openSettingsBtn");
const closeSettingsBtn = document.getElementById("closeSettingsBtn");
const settingsOverlay  = document.getElementById("settingsOverlay");
const settingsDrawer   = document.getElementById("settingsDrawer");

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
// テーマカラー
// ===================================
const PRESET_COLORS = [
  { label: "グリーン",    color: "#4caf50" },
  { label: "ブルー",      color: "#2196f3" },
  { label: "パープル",    color: "#9c27b0" },
  { label: "オレンジ",    color: "#ff9800" },
  { label: "レッド",      color: "#f44336" },
  { label: "ティール",    color: "#009688" },
  { label: "インディゴ",  color: "#3f51b5" },
  { label: "ブラウン",    color: "#795548" },
];

let themeColor = localStorage.getItem("themeColor") || "#4caf50";

function applyThemeColor(color) {
  themeColor = color;
  document.documentElement.style.setProperty("--theme", color);
  // 少し暗くしたダーク版を自動生成（ボタンhover等に使用）
  document.documentElement.style.setProperty("--theme-dark", darkenColor(color, 20));
  localStorage.setItem("themeColor", color);
  // プレビューバーを更新
  const bar = document.getElementById("themePreviewBar");
  if (bar) bar.style.background = color;
  // プリセットのチェックマーク更新
  document.querySelectorAll(".color-swatch").forEach(sw => {
    sw.classList.toggle("selected", sw.dataset.color === color);
  });
}

// 16進カラーをやや暗くするユーティリティ
function darkenColor(hex, amount) {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.max(0, (num >> 16) - amount);
  const g = Math.max(0, ((num >> 8) & 0xff) - amount);
  const b = Math.max(0, (num & 0xff) - amount);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

// プリセットスウォッチを描画
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
  // プレビューバー初期化
  const bar = document.getElementById("themePreviewBar");
  if (bar) bar.style.background = themeColor;
}

// カスタムカラー適用
document.getElementById("applyCustomColor").addEventListener("click", () => {
  const color = document.getElementById("customColorPicker").value;
  applyThemeColor(color);
});

// ページ読み込み時にテーマ適用
applyThemeColor(themeColor);

// ===================================
// 初期化
// ===================================
monthSelector.value = new Date().toISOString().slice(0, 7);
monthSelector.addEventListener("change", render);
typeSelect.addEventListener("change", () => updateCategoryOptions(typeSelect, categorySelect));
editTypeSelect.addEventListener("change", () => updateCategoryOptions(editTypeSelect, editCatSelect));

updateCategoryOptions(typeSelect, categorySelect);
render();

// ===================================
// カテゴリプルダウン更新（追加・編集モーダル共用）
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
// 追加モーダルの開閉
// ===================================
function openAddModal() {
  dateInput.value   = new Date().toISOString().slice(0, 10);
  amountInput.value = "";
  memoInput.value   = "";
  typeSelect.value  = "expense";
  updateCategoryOptions(typeSelect, categorySelect);
  showModal(addModal, addOverlay);
  setTimeout(() => amountInput.focus(), 300);
}

function closeAddModal() {
  hideModal(addModal, addOverlay);
}

openAddBtn.addEventListener("click", openAddModal);
closeAddBtn.addEventListener("click", closeAddModal);
addOverlay.addEventListener("click", closeAddModal);

// ===================================
// 編集モーダルの開閉
// ===================================
let editingRecord = null;

function openEditModal(record) {
  editingRecord = record;
  editDateInput.value   = record.date;
  editAmountInput.value = record.amount;
  editTypeSelect.value  = record.type;
  updateCategoryOptions(editTypeSelect, editCatSelect, record.category);
  editMemoInput.value   = record.memo || "";
  showModal(editModal, editOverlay);
}

function closeEditModal() {
  hideModal(editModal, editOverlay);
  editingRecord = null;
}

closeEditBtn.addEventListener("click", closeEditModal);
editOverlay.addEventListener("click", closeEditModal);

saveEditButton.addEventListener("click", () => {
  if (!editingRecord) return;
  const amount = Number(editAmountInput.value);
  if (!editDateInput.value || editAmountInput.value === "") {
    alert("日付と金額を入力してください");
    return;
  }
  editingRecord.date     = editDateInput.value;
  editingRecord.amount   = amount;
  editingRecord.type     = editTypeSelect.value;
  editingRecord.category = editCatSelect.value;
  editingRecord.memo     = editMemoInput.value.trim();
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
// 設定ドロワーの開閉
// ===================================
function openSettings() {
  renderCategoryView();
  renderColorPresets();
  settingsDrawer.classList.remove("hidden");
  settingsOverlay.classList.remove("hidden");
  requestAnimationFrame(() => {
    settingsDrawer.classList.add("show");
    settingsOverlay.classList.add("show");
  });
}

function closeSettings() {
  settingsDrawer.classList.remove("show");
  settingsOverlay.classList.remove("show");
  setTimeout(() => {
    settingsDrawer.classList.add("hidden");
    settingsOverlay.classList.add("hidden");
  }, 300);
}

openSettingsBtn.addEventListener("click", openSettings);
closeSettingsBtn.addEventListener("click", closeSettings);
settingsOverlay.addEventListener("click", closeSettings);

// 設定ドロワー内タブ切り替え
document.querySelectorAll(".settings-tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".settings-tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".settings-tab-content").forEach(c => c.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById(tab.dataset.target).classList.add("active");
  });
});

// ===================================
// 記録の追加
// ===================================
addButton.addEventListener("click", () => {
  const date   = dateInput.value;
  if (!date || amountInput.value === "") {
    alert("日付と金額を入力してください");
    return;
  }
  records.push({
    date,
    amount:   Number(amountInput.value),
    type:     typeSelect.value,
    category: categorySelect.value,
    memo:     memoInput.value.trim(),
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
// ホーム画面の描画
// ===================================
function render() {
  const selectedMonth = monthSelector.value;
  list.innerHTML = "";

  const filtered = records.filter(r => r.date.startsWith(selectedMonth));
  const sorted   = [...filtered].sort((a, b) => new Date(b.date) - new Date(a.date));

  sorted.forEach(record => {
    const li = document.createElement("li");
    li.className = "record-li";

    // ── メインエリア（タップで編集モーダル） ──
    const main = document.createElement("div");
    main.className = "record-main";

    const topRow = document.createElement("div");
    topRow.className = "record-top-row";
    topRow.innerHTML =
      `<span class="record-date">${record.date}</span>` +
      `<span class="record-cat">${record.category}</span>` +
      `<span class="record-badge ${record.type === 'expense' ? 'tag-expense' : 'tag-income'}">${record.type === "expense" ? "支出" : "収入"}</span>` +
      `<span class="record-amount ${record.type === 'expense' ? 'amount-expense' : 'amount-income'}">¥${record.amount.toLocaleString()}</span>`;

    main.appendChild(topRow);

    // メモ行（あれば表示）
    if (record.memo) {
      const memoRow = document.createElement("div");
      memoRow.className = "record-memo";
      memoRow.textContent = `📝 ${record.memo}`;
      main.appendChild(memoRow);
    }

    // メインエリアタップ → 編集モーダル
    main.addEventListener("click", () => openEditModal(record));

    // ── 削除ボタン ──
    const delBtn = document.createElement("button");
    delBtn.textContent = "削除";
    delBtn.className   = "delete-btn";
    delBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const i = records.indexOf(record);
      if (i !== -1) records.splice(i, 1);
      saveRecords();
      render();
    });

    li.appendChild(main);
    li.appendChild(delBtn);
    list.appendChild(li);
  });

  // 合計
  let income = 0, expense = 0;
  filtered.forEach(r => {
    if (r.type === "income") income += r.amount;
    else expense += r.amount;
  });

  document.getElementById("incomeTotal").textContent  = income.toLocaleString();
  document.getElementById("expenseTotal").textContent = expense.toLocaleString();
  const bal   = income - expense;
  const balEl = document.getElementById("balance");
  balEl.textContent = bal.toLocaleString();
  balEl.style.color = bal >= 0 ? "var(--theme)" : "#c62828";

  renderCalendar(filtered);
}

// ===================================
// カレンダーの描画
// ===================================
function renderCalendar(data) {
  const calendar = document.getElementById("calendar");
  calendar.innerHTML = "";

  const month     = monthSelector.value;
  const [year, m] = month.split("-").map(Number);
  const lastDay   = new Date(year, m, 0).getDate();
  const firstDay  = new Date(year, m - 1, 1).getDay();

  for (let i = 0; i < firstDay; i++) {
    calendar.appendChild(document.createElement("div"));
  }

  for (let day = 1; day <= lastDay; day++) {
    const dayStr = `${month}-${String(day).padStart(2, "0")}`;
    let income = 0, expense = 0;
    data.forEach(r => {
      if (r.date === dayStr) {
        r.type === "income" ? income += r.amount : expense += r.amount;
      }
    });

    const div = document.createElement("div");
    div.className = "day";
    div.innerHTML = `
      <div class="date">${day}</div>
      <div class="income">＋¥${income > 0 ? income.toLocaleString() : 0}</div>
      <div class="expense">−¥${expense > 0 ? expense.toLocaleString() : 0}</div>
    `;

    const today = new Date().toISOString().slice(0, 10);
    if (dayStr === today) div.classList.add("today");
    if      (expense > 0 && income > 0) div.classList.add("both");
    else if (expense > 0)               div.classList.add("expense-day");
    else if (income > 0)                div.classList.add("income-day");

    div.addEventListener("click", () => {
      const detailBox = document.getElementById("dayDetail");
      const details = data
        .filter(r => r.date === dayStr)
        .map(r =>
          `<div class="detail-row">
            <span>${r.category}</span>
            <span class="${r.type === 'expense' ? 'tag-expense' : 'tag-income'}">${r.type === "expense" ? "支出" : "収入"}</span>
            <span>¥${r.amount.toLocaleString()}</span>
            ${r.memo ? `<span class="detail-memo">📝${r.memo}</span>` : ""}
          </div>`)
        .join("");
      detailBox.innerHTML = `<h3>${day}日の明細</h3>${details || "<p>記録なし</p>"}`;
    });

    calendar.appendChild(div);
  }
}

// ===================================
// カテゴリ管理（設定ドロワー内）
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
        updateCategoryOptions(typeSelect, categorySelect);
        renderCategoryView();
      }
      input.addEventListener("blur", saveNameEdit);
      input.addEventListener("keydown", e => { if (e.key === "Enter") saveNameEdit(); });
      li.replaceChild(input, nameSpan);
      input.focus();
    });

    const typeBadge = document.createElement("span");
    typeBadge.className   = `type-badge type-${cat.type}`;
    typeBadge.textContent = cat.type === "expense" ? "支出" : cat.type === "income" ? "収入" : "両方";

    const delBtn = document.createElement("button");
    delBtn.textContent = "削除";
    delBtn.className   = "delete-btn";
    delBtn.addEventListener("click", () => {
      const used = records.some(r => r.category === cat.name);
      if (used && !confirm(`「${cat.name}」は使用中です。削除しますか？`)) return;
      categories.splice(index, 1);
      saveCategories();
      updateCategoryOptions(typeSelect, categorySelect);
      renderCategoryView();
    });

    li.appendChild(nameSpan);
    li.appendChild(typeBadge);
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
  updateCategoryOptions(typeSelect, categorySelect);
  renderCategoryView();
});

// ===================================
// 下部タブ切り替え
// ===================================
const tabs = [
  { tab: document.getElementById("homeTab"),     view: document.getElementById("homeView"),     onShow: render },
  { tab: document.getElementById("calendarTab"), view: document.getElementById("calendarView"), onShow: null   },
];

tabs.forEach(({ tab, view, onShow }) => {
  tab.addEventListener("click", () => {
    tabs.forEach(t => {
      t.tab.classList.remove("active");
      t.view.classList.remove("active");
    });
    tab.classList.add("active");
    view.classList.add("active");
    if (onShow) onShow();
  });
});

// ===================================
// Service Worker登録（PWA）
// ===================================
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./service-worker.js");
}
