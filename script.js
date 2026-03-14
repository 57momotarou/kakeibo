// ===================================
// 要素の取得
// ===================================
const dateInput       = document.getElementById("date");
const amountInput     = document.getElementById("amount");
const typeSelect      = document.getElementById("type");
const addButton       = document.getElementById("addButton");
const list            = document.getElementById("list");
const monthSelector   = document.getElementById("monthSelector");
const categorySelect  = document.getElementById("category");

// ===================================
// データの読み込み（localStorage）
// ===================================
let records = JSON.parse(localStorage.getItem("records")) || [];

// デフォルトカテゴリ
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

// カテゴリのプルダウンを種別に応じて更新する
function updateCategoryOptions() {
  const type = typeSelect.value;
  categorySelect.innerHTML = "";

  const filtered = categories.filter(c => c.type === type || c.type === "both");
  filtered.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c.name;
    opt.textContent = c.name;
    categorySelect.appendChild(opt);
  });
}

updateCategoryOptions();
render();

// ===================================
// 記録の追加
// ===================================
addButton.addEventListener("click", () => {
  dateInput.value ||= new Date().toISOString().slice(0, 10);
  const date   = dateInput.value;
  const amount = Number(amountInput.value);
  const type   = typeSelect.value;

  if (!date || amountInput.value === "") {
    alert("日付と金額を入力してください");
    return;
  }

  records.push({ date, amount, type, category: categorySelect.value });
  saveRecords();
  render();
  amountInput.value = "";
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

    // ── テキスト部分 ──
    const text = document.createElement("span");
    text.textContent =
      `${record.date}：${record.category} ${record.type === "expense" ? "支出" : "収入"} ¥${record.amount}`;

    // タップで金額編集
    text.addEventListener("click", () => {
      const input = document.createElement("input");
      input.type  = "number";
      input.value = record.amount;
      input.style.cssText = "width:100px;font-size:16px;";

      function saveEdit() {
        record.amount = Number(input.value);
        saveRecords();
        render();
      }
      input.addEventListener("blur", saveEdit);
      input.addEventListener("keydown", e => { if (e.key === "Enter") saveEdit(); });

      li.replaceChild(input, text);
      input.focus();
    });

    // ── 削除ボタン ──
    const delBtn = document.createElement("button");
    delBtn.textContent = "削除";
    delBtn.className   = "delete-btn";

    delBtn.addEventListener("click", () => {
      // ★バグ修正：recordオブジェクトを直接参照して削除
      const i = records.indexOf(record);
      if (i !== -1) records.splice(i, 1);
      saveRecords();
      render();
    });

    li.appendChild(text);
    li.appendChild(delBtn);
    list.appendChild(li);
  });

  // 合計計算
  let income = 0, expense = 0;
  filtered.forEach(r => {
    if (r.type === "income") income += r.amount;
    else expense += r.amount;
  });

  document.getElementById("incomeTotal").textContent  = income.toLocaleString();
  document.getElementById("expenseTotal").textContent = expense.toLocaleString();
  document.getElementById("balance").textContent      = (income - expense).toLocaleString();

  renderCalendar(filtered);
}

// ===================================
// カレンダーの描画
// ===================================
function renderCalendar(data) {
  const calendar = document.getElementById("calendar");
  calendar.innerHTML = "";

  const month    = monthSelector.value;
  const [year, m] = month.split("-").map(Number);
  const lastDay  = new Date(year, m, 0).getDate();
  const firstDay = new Date(year, m - 1, 1).getDay();

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
        .map(r => `<div>${r.category}：${r.type === "expense" ? "支出" : "収入"} ¥${r.amount.toLocaleString()}</div>`)
        .join("");
      detailBox.innerHTML = `<h3>${day}日の明細</h3>${details || "<p>記録なし</p>"}`;
    });

    calendar.appendChild(div);
  }
}

// ===================================
// カテゴリ管理画面の描画
// ===================================
function renderCategoryView() {
  const expenseList = document.getElementById("expenseCategoryList");
  const incomeList  = document.getElementById("incomeCategoryList");
  expenseList.innerHTML = "";
  incomeList.innerHTML  = "";

  categories.forEach((cat, index) => {
    const li = document.createElement("li");
    li.className = "category-item";

    // カテゴリ名の表示（タップで編集）
    const nameSpan = document.createElement("span");
    nameSpan.className   = "category-name";
    nameSpan.textContent = cat.name;

    nameSpan.addEventListener("click", () => {
      const input = document.createElement("input");
      input.type  = "text";
      input.value = cat.name;
      input.style.cssText = "font-size:16px;width:120px;";

      function saveNameEdit() {
        const newName = input.value.trim();
        if (!newName) { render(); renderCategoryView(); return; }

        // 既存レコードのカテゴリ名も更新
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

    // 種別バッジ
    const typeBadge = document.createElement("span");
    typeBadge.className = `type-badge type-${cat.type}`;
    typeBadge.textContent = cat.type === "expense" ? "支出" : cat.type === "income" ? "収入" : "両方";

    // 削除ボタン
    const delBtn = document.createElement("button");
    delBtn.textContent = "削除";
    delBtn.className   = "delete-btn";

    delBtn.addEventListener("click", () => {
      // そのカテゴリを使っているレコードがあれば警告
      const used = records.some(r => r.category === cat.name);
      if (used) {
        if (!confirm(`「${cat.name}」は記録で使用中です。削除しますか？`)) return;
      }
      categories.splice(index, 1);
      saveCategories();
      updateCategoryOptions();
      renderCategoryView();
    });

    li.appendChild(nameSpan);
    li.appendChild(typeBadge);
    li.appendChild(delBtn);

    if (cat.type === "income") {
      incomeList.appendChild(li);
    } else {
      expenseList.appendChild(li);
    }
  });
}

// カテゴリ追加ボタン
document.getElementById("addCategoryButton").addEventListener("click", () => {
  const name = document.getElementById("newCategoryName").value.trim();
  const type = document.getElementById("newCategoryType").value;

  if (!name) { alert("カテゴリ名を入力してください"); return; }

  const exists = categories.some(c => c.name === name);
  if (exists) { alert("同じ名前のカテゴリが既にあります"); return; }

  categories.push({ name, type });
  document.getElementById("newCategoryName").value = "";

  saveCategories();
  updateCategoryOptions();
  renderCategoryView();
});

// ===================================
// タブ切り替え
// ===================================
const tabs = [
  { tab: document.getElementById("homeTab"),     view: document.getElementById("homeView"),     onShow: render },
  { tab: document.getElementById("calendarTab"), view: document.getElementById("calendarView"), onShow: null   },
  { tab: document.getElementById("categoryTab"), view: document.getElementById("categoryView"), onShow: renderCategoryView },
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
