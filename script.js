const dateInput = document.getElementById("date");
const amountInput = document.getElementById("amount");
const typeSelect = document.getElementById("type");
const addButton = document.getElementById("addButton");
const list = document.getElementById("list");
const monthSelector = document.getElementById("monthSelector");
const categorySelect = document.getElementById("category");

// 初期値：今月
monthSelector.value = new Date().toISOString().slice(0, 7);

monthSelector.addEventListener("change", render);

// 保存用配列
let records = JSON.parse(localStorage.getItem("records")) || [];

// 初期表示
render();

addButton.addEventListener("click", () => {
  const date = dateInput.value;
  const amount = Number(amountInput.value);
  const type = typeSelect.value;

  if (!date || !amount) {
    alert("日付と金額を入力してください");
    return;
  }

  records.push({ date, amount, type, category: categorySelect.value });
  save();
  render();

  amountInput.value = "";
});


function save() {
  localStorage.setItem("records", JSON.stringify(records));
}

function render() {
const selectedMonth = monthSelector.value;

  list.innerHTML = "";

  // 日付の新しい順に並び替え
const filtered = records.filter(record =>
  record.date.startsWith(selectedMonth)
);

const sorted = [...filtered].sort((a, b) => {
  return new Date(b.date) - new Date(a.date);
});

sorted.forEach((record, index) => {
  const li = document.createElement("li");

const text = document.createElement("span");
text.textContent =
  `${record.date}：${record.category} ${
    record.type === "expense" ? "支出" : "収入"
  } ¥${record.amount}`;

text.addEventListener("click", () => {
  const input = document.createElement("input");
  input.type = "number";
  input.value = record.amount;

  input.addEventListener("blur", saveEdit);
  input.addEventListener("keydown", e => {
    if (e.key === "Enter") saveEdit();
  });

  function saveEdit() {
    record.amount = Number(input.value);
    save();
    render();
  }

  li.replaceChild(input, text);
  input.focus();
});

  const delBtn = document.createElement("button");
  delBtn.textContent = "削除";
  delBtn.className = "delete-btn";

delBtn.addEventListener("click", () => {
  const i = records.indexOf(record);
  records.splice(i, 1);
  save();
  render();
});

  li.appendChild(text);
  li.appendChild(delBtn);
  list.appendChild(li);
});

  // 合計計算
  let income = 0;
  let expense = 0;

filtered.forEach(record => {
  if (record.type === "income") {
    income += record.amount;
  } else {
    expense += record.amount;
  }
});

  document.getElementById("incomeTotal").textContent = income;
  document.getElementById("expenseTotal").textContent = expense;
  document.getElementById("balance").textContent = income - expense;

  renderCalendar(filtered);
}

function renderCalendar(data) {
  const calendar = document.getElementById("calendar");
  calendar.innerHTML = "";

  const month = monthSelector.value;
  const [year, m] = month.split("-").map(Number);
  const lastDay = new Date(year, m, 0).getDate();
  const firstDay = new Date(year, m - 1, 1).getDay();

  // 空白マス
  for (let i = 0; i < firstDay; i++) {
    calendar.appendChild(document.createElement("div"));
  }

  for (let day = 1; day <= lastDay; day++) {
    const dayStr = `${month}-${String(day).padStart(2, "0")}`;

    let income = 0;
    let expense = 0;

    data.forEach(record => {
      if (record.date === dayStr) {
        record.type === "income"
          ? income += record.amount
          : expense += record.amount;
      }
    });

    const div = document.createElement("div");
    div.className = "day";

    div.innerHTML = `
      <div class="date">${day}</div>
      <div class="income">＋¥${income}</div>
      <div class="expense">−¥${expense}</div>
    `;

    // 色分け
    if (expense > 0 && income > 0) div.classList.add("both");
    else if (expense > 0) div.classList.add("expense-day");
    else if (income > 0) div.classList.add("income-day");

    // 日タップ → 明細表示
    div.addEventListener("click", () => {
      const detailBox = document.getElementById("dayDetail");

      const details = data
        .filter(r => r.date === dayStr)
        .map(r =>
          `<div>${r.category}：${r.type === "expense" ? "支出" : "収入"} ¥${r.amount}</div>`
        )
        .join("");

      detailBox.innerHTML = `
        <h3>${day}日</h3>
        ${details || "<p>記録なし</p>"}
      `;
    });

    calendar.appendChild(div);
  }
}

const homeTab = document.getElementById("homeTab");
const calendarTab = document.getElementById("calendarTab");
const homeView = document.getElementById("homeView");
const calendarView = document.getElementById("calendarView");

homeTab.addEventListener("click", () => {
  homeView.classList.add("active");
  calendarView.classList.remove("active");

  homeTab.classList.add("active");
  calendarTab.classList.remove("active");
});

calendarTab.addEventListener("click", () => {
  calendarView.classList.add("active");
  homeView.classList.remove("active");

  calendarTab.classList.add("active");
  homeTab.classList.remove("active");
});