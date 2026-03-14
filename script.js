// ===================================
// 要素の取得
// ===================================
const dateInput      = document.getElementById("date");
const amountInput    = document.getElementById("amount");
const typeSelect     = document.getElementById("type");
const addButton      = document.getElementById("addButton");
const list           = document.getElementById("list");
const monthSelector  = document.getElementById("monthSelector");
const categorySelect = document.getElementById("category");

// モーダル・ドロワー関連
const openAddBtn       = document.getElementById("openAddBtn");
const closeAddBtn      = document.getElementById("closeAddBtn");
const addOverlay       = document.getElementById("addOverlay");
const addModal         = document.getElementById("addModal");

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
// 初期化
// ===================================
monthSelector.value = new Date().toISOString().slice(0, 7);
monthSelector.addEventListener("change", render);
typeSelect.addEventListener("change", updateCategoryOptions);

updateCategoryOptions();
render();

// ===================================
// カテゴリプルダウン更新
// ===================================
function updateCategoryOptions() {
  const type = typeSelect.value;
  categorySelect.innerHTML = "";
  categories
    .filter(c => c.type === type || c.type === "both")
    .forEach(c => {
      const opt = document.createElement("option");
      opt.value = c.name;
      opt.textContent = c.name;
      categorySelect.appendChild(opt);
    });
}

// ===================================
// ポップアップ（収支入力）の開閉
// ===================================
function openAddModal() {
  // 日付の初期値を今日に
  dateInput.value = new Date().toISOString().slice(0, 10);
  amountInput.value = "";
  updateCategoryOptions();
  addModal.classList.remove("hidden");
  addOverlay.classList.remove("hidden");
  // 少し待ってからアニメーション開始
  requestAnimationFrame(() => {
    addModal.classList.add("show");
    addOverlay.classList.add("show");
  });
  amountInput.focus();
}

function closeAddModal() {
  addModal.classList.remove("show");
  addOverlay.classList.remove("show");
  setTimeout(() => {
    addModal.classList.add("hidden");
    addOverlay.classList.add("hidden");
  }, 250);
}

openAddBtn.addEventListener("click", openAddModal);
closeAddBtn.addEventListener("click", closeAddModal);
addOverlay.addEventListener("click", closeAddModal);

// ===================================
// 設定ドロワーの開閉
// ===================================
function openSettings() {
  renderCategoryView();
  settingsDrawer.classList.remove("hidden");
  settingsOverlay.classList.remove("hidden");
  requestAnimationFrame(() => {
    settingsDrawer.classList.add("show");
    settingsOverlay.classList.add("show");
  });
}

// 設定ドロワー内タブ切り替え
document.querySelectorAll(".settings-tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".settings-tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".settings-tab-content").forEach(c => c.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById(tab.dataset.target).classList.add("active");
  });
});

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

// ===================================
// 記録の追加
// ===================================
addButton.addEventListener("click", () => {
  const date   = dateInput.value;
  const amount = Number(amountInput.value);

  if (!date || amountInput.value === "") {
    alert("日付と金額を入力してください");
    return;
  }

  records.push({ date, amount, type: typeSelect.value, category: categorySelect.value });
  saveRecords();
  render();
  closeAddModal();
});

// ===================================
// 保存
// ===================================
function saveRecords() {
  localStorage.setItem("records", JSON.stringify(records));
}
function saveCategories() {
  localStorage.setItem("categories", JSON.stringify(categories));
}

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

    const text = document.createElement("span");
    text.className = "record-text";
    text.innerHTML =
      `<span class="record-date">${record.date}</span>` +
      `<span class="record-cat">${record.category}</span>` +
      `<span class="record-type ${record.type === 'expense' ? 'tag-expense' : 'tag-income'}">${record.type === "expense" ? "支出" : "収入"}</span>` +
      `<span class="record-amount">¥${record.amount.toLocaleString()}</span>`;

    // タップで金額編集
    text.addEventListener("click", () => {
      const input = document.createElement("input");
      input.type  = "number";
      input.value = record.amount;
      input.style.cssText = "width:90px;font-size:16px;border:1px solid #ccc;border-radius:4px;padding:4px;";
      function saveEdit() {
        const v = Number(input.value);
        if (!isNaN(v) && v >= 0) record.amount = v;
        saveRecords();
        render();
      }
      input.addEventListener("blur", saveEdit);
      input.addEventListener("keydown", e => { if (e.key === "Enter") saveEdit(); });
      li.replaceChild(input, text);
      input.focus();
    });

    const delBtn = document.createElement("button");
    delBtn.textContent = "削除";
    delBtn.className   = "delete-btn";
    delBtn.addEventListener("click", () => {
      const i = records.indexOf(record);
      if (i !== -1) records.splice(i, 1);
      saveRecords();
      render();
    });

    li.appendChild(text);
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
  const bal = income - expense;
  const balEl = document.getElementById("balance");
  balEl.textContent = bal.toLocaleString();
  balEl.style.color = bal >= 0 ? "#2e7d32" : "#c62828";

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
        .map(r => `<div class="detail-row"><span>${r.category}</span><span class="${r.type === 'expense' ? 'tag-expense' : 'tag-income'}">${r.type === "expense" ? "支出" : "収入"}</span><span>¥${r.amount.toLocaleString()}</span></div>`)
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
      input.style.cssText = "font-size:16px;width:120px;border:1px solid #ccc;border-radius:4px;padding:4px;";
      function saveNameEdit() {
        const newName = input.value.trim();
        if (!newName) { renderCategoryView(); return; }
        records.forEach(r => { if (r.category === cat.name) r.category = newName; });
        cat.name = newName;
        saveRecords();
        saveCategories();
        updateCategoryOptions();
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
      updateCategoryOptions();
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
  updateCategoryOptions();
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
