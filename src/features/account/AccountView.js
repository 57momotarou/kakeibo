/**
 * features/account/AccountView.js
 * 口座の一覧・追加・編集・削除
 */

import { accounts, saveAccounts, setAccounts } from "../../store.js";
import { showModal, hideModal } from "../../components/Modal.js";

let editingAccount = null;
let nextAccountId  = Math.max(0, ...accounts.map(a => a.id || 0)) + 1;

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
