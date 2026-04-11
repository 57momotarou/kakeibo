/**
 * features/account/AccountView.js
 * 口座の一覧・タップ→収支詳細・編集（⚙️）・追加・削除
 */

import { accounts, saveAccounts, setAccounts, records, childCategories } from "../../store.js";
import { showModal, hideModal } from "../../components/Modal.js";
import { displayCategory } from "../../utils/category.js";
import { WEEKDAY_NAMES } from "../../utils/calendar.js";

let editingAccount = null;
let nextAccountId  = Math.max(0, ...accounts.map(a => a.id || 0)) + 1;

// ===================================
// 口座一覧描画
// ===================================
export function renderAccountView() {
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
    balWrap.appendChild(balSpan);

    const arrow = document.createElement("span");
    arrow.className = "account-arrow";
    arrow.textContent = "›";

    li.appendChild(info);
    li.appendChild(balWrap);
    li.appendChild(arrow);

    // 行タップ → 収支詳細シート
    li.addEventListener("click", () => showAccountDetail(account));

    ul.appendChild(li);
  });
}

// ===================================
// 口座収支詳細シート
// ===================================
function showAccountDetail(account) {
  const existing = document.getElementById("accountDetailOverlay");
  if (existing) existing.remove();

  // この口座に紐づくrecordsを取得
  const acRecords = records
    .filter(r => String(r.accountId) === String(account.id))
    .sort((a, b) => b.date.localeCompare(a.date));

  let income = 0, expense = 0;
  acRecords.forEach(r => {
    if (r.type === "income") income += r.amount;
    else                      expense += r.amount;
  });

  const overlay = document.createElement("div");
  overlay.id = "accountDetailOverlay";
  overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:350;display:flex;align-items:flex-end;";

  const sheet = document.createElement("div");
  sheet.style.cssText = "background:#f5f5f5;width:100%;border-radius:20px 20px 0 0;max-height:88vh;display:flex;flex-direction:column;";

  // ヘッダー（口座名・⚙️・✕）
  const header = document.createElement("div");
  header.style.cssText = "display:grid;grid-template-columns:1fr auto 1fr;align-items:center;padding:16px 16px 12px;background:#fff;border-radius:20px 20px 0 0;border-bottom:1px solid #e0e0e0;flex-shrink:0;";
  header.innerHTML =
    '<div></div>' +
    '<span style="font-size:16px;font-weight:bold;text-align:center;">' + account.name + '</span>' +
    '<div style="display:flex;justify-content:flex-end;gap:8px;">' +
      '<button id="editAccountSheetBtn" style="width:36px;height:36px;border-radius:50%;border:none;background:#f0f0f0;font-size:18px;cursor:pointer;">⚙️</button>' +
      '<button id="closeAccountDetail" style="width:36px;height:36px;border-radius:50%;border:none;background:#f0f0f0;font-size:14px;cursor:pointer;">✕</button>' +
    '</div>';
  sheet.appendChild(header);

  const body = document.createElement("div");
  body.style.cssText = "overflow-y:auto;flex:1;";

  // 残高・収支サマリーカード
  const themeColor = getComputedStyle(document.documentElement).getPropertyValue("--theme").trim() || "#4caf50";
  const summary = document.createElement("div");
  summary.style.cssText = "background:#fff;margin:12px 12px 0;border-radius:12px;padding:16px;";
  summary.innerHTML =
    '<div style="margin-bottom:12px;">' +
      '<div style="font-size:11px;color:#888;margin-bottom:4px;">残高</div>' +
      '<div style="font-size:26px;font-weight:bold;color:' + themeColor + ';">¥' + account.balance.toLocaleString() + '</div>' +
      (account.memo ? '<div style="font-size:12px;color:#aaa;margin-top:3px;">' + account.memo + '</div>' : '') +
    '</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;border-top:1px solid #f0f0f0;padding-top:12px;">' +
      '<div style="background:#f5f5f5;border-radius:8px;padding:10px 12px;">' +
        '<div style="font-size:11px;color:#888;margin-bottom:3px;">入金合計</div>' +
        '<div style="font-size:16px;font-weight:bold;color:' + themeColor + ';">¥' + income.toLocaleString() + '</div>' +
      '</div>' +
      '<div style="background:#f5f5f5;border-radius:8px;padding:10px 12px;">' +
        '<div style="font-size:11px;color:#888;margin-bottom:3px;">出金合計</div>' +
        '<div style="font-size:16px;font-weight:bold;color:#e53935;">¥' + expense.toLocaleString() + '</div>' +
      '</div>' +
    '</div>';
  body.appendChild(summary);

  // 収支リスト
  if (acRecords.length === 0) {
    const empty = document.createElement("div");
    empty.style.cssText = "text-align:center;color:#aaa;font-size:14px;padding:32px 0;";
    empty.textContent = "この口座の記録はありません";
    body.appendChild(empty);
  } else {
    const listTitle = document.createElement("div");
    listTitle.style.cssText = "font-size:13px;font-weight:bold;color:#888;padding:16px 16px 6px;";
    listTitle.textContent = "収支履歴";
    body.appendChild(listTitle);

    // 日付グループ化
    const groups = [];
    acRecords.forEach(r => {
      const last = groups[groups.length - 1];
      if (last && last.date === r.date) last.records.push(r);
      else groups.push({ date: r.date, records: [r] });
    });

    groups.forEach(group => {
      const d = new Date(group.date + "T00:00:00");
      const weekDay = WEEKDAY_NAMES[d.getDay()];

      const dateHeader = document.createElement("div");
      dateHeader.style.cssText = "font-size:12px;color:#888;font-weight:bold;padding:8px 16px 5px;background:#f0f0f0;border-top:1px solid #e0e0e0;border-bottom:1px solid #e0e0e0;";
      dateHeader.textContent = d.getFullYear() + "年" + (d.getMonth()+1) + "月" + d.getDate() + "日（" + weekDay + "）";
      body.appendChild(dateHeader);

      group.records.forEach(record => {
        const row = document.createElement("div");
        row.style.cssText = "display:flex;align-items:center;justify-content:space-between;padding:10px 16px;background:#fff;border-bottom:1px solid #f0f0f0;gap:10px;";
        const isExpense = record.type === "expense";
        const catLabel  = displayCategory(record.category, childCategories);
        row.innerHTML =
          '<div style="flex:1;min-width:0;">' +
            '<div style="font-size:14px;font-weight:bold;color:#222;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + (record.title || catLabel) + '</div>' +
            '<div style="font-size:11px;color:#aaa;margin-top:2px;">' + catLabel + '</div>' +
          '</div>' +
          '<span style="font-size:14px;font-weight:bold;white-space:nowrap;color:' + (isExpense ? "#333" : themeColor) + ';">' +
            (isExpense ? "-" : "+") + '¥' + record.amount.toLocaleString() +
          '</span>';
        body.appendChild(row);
      });
    });
  }

  // 下部の余白
  const spacer = document.createElement("div");
  spacer.style.height = "24px";
  body.appendChild(spacer);

  sheet.appendChild(body);
  overlay.appendChild(sheet);
  document.body.appendChild(overlay);

  header.querySelector("#closeAccountDetail").addEventListener("click", () => overlay.remove());
  header.querySelector("#editAccountSheetBtn").addEventListener("click", () => {
    overlay.remove();
    openAccountModal(account);
  });
  overlay.addEventListener("click", e => { if (e.target === overlay) overlay.remove(); });
}

// ===================================
// 口座追加・編集モーダル
// ===================================
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

export function initAccountEvents() {
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
    setAccounts(accounts.filter(a => a.id !== editingAccount.id));
    saveAccounts();
    renderAccountView();
    closeAccountModal();
  });
}
