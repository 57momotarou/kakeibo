/**
 * features/transactions/TransactionModal.js
 * 収支の追加・編集・削除モーダル
 */

import { records, saveRecords, childCategories } from "../../store.js";
import { showModal, hideModal } from "../../components/Modal.js";
import { updateParentSelect, updateChildSelect } from "../../components/CategorySelector.js";
import { parseCategoryField, makeCategoryField, getParentName, displayCategory } from "../../utils/category.js";

let editingRecord = null;

// ===================================
// 追加モーダル
// ===================================
export function openAddModal(prefill, onAdded) {
  const addModal   = document.getElementById("addModal");
  const addOverlay = document.getElementById("addOverlay");
  const dateInput     = document.getElementById("date");
  const amountInput   = document.getElementById("amount");
  const memoInput     = document.getElementById("memo");
  const addTypeHidden = document.getElementById("addTypeHidden");
  const addTypeToggle = document.getElementById("addTypeToggle");

  const type = prefill?.type || "expense";
  dateInput.value     = prefill?.date   || new Date().toISOString().slice(0, 10);
  amountInput.value   = prefill?.amount || "";
  memoInput.value     = prefill?.title  || "";
  addTypeHidden.value = type;
  addTypeToggle.querySelectorAll(".type-toggle-btn").forEach(b => {
    b.classList.toggle("active", b.dataset.value === type);
  });

  const { parentId, childName } = parseCategoryField(prefill?.category || "", childCategories);
  const defaultParent = type === "income" ? "income_sal" : "food";
  const pid = parentId !== "unclassified" ? parentId : defaultParent;
  updateParentSelect(document.getElementById("addParentCat"), type, pid);
  updateChildSelect(document.getElementById("addChildCat"), pid, childName);

  showModal(addModal, addOverlay);
}

export function initAddModal(onAdded) {
  const addModal      = document.getElementById("addModal");
  const addOverlay    = document.getElementById("addOverlay");
  const closeAddBtn   = document.getElementById("closeAddBtn");
  const addTypeToggle = document.getElementById("addTypeToggle");
  const addTypeHidden = document.getElementById("addTypeHidden");
  const addButton     = document.getElementById("addButton");
  const dateInput     = document.getElementById("date");
  const amountInput   = document.getElementById("amount");
  const memoInput     = document.getElementById("memo");

  closeAddBtn.addEventListener("click",  () => hideModal(addModal, addOverlay));
  addOverlay.addEventListener("click",   () => hideModal(addModal, addOverlay));

  addTypeToggle.addEventListener("click", e => {
    const btn = e.target.closest(".type-toggle-btn");
    if (!btn) return;
    const val = btn.dataset.value;
    addTypeToggle.querySelectorAll(".type-toggle-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    addTypeHidden.value = val;
    const defaultParent = val === "income" ? "income_sal" : "food";
    updateParentSelect(document.getElementById("addParentCat"), val, defaultParent);
    updateChildSelect(document.getElementById("addChildCat"), defaultParent, "");
  });

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
    hideModal(addModal, addOverlay);
    onAdded();
  });
}

// ===================================
// 編集モーダル
// ===================================
export function openEditModal(record, onEdited) {
  editingRecord = record;
  const editModal   = document.getElementById("editModal");
  const editOverlay = document.getElementById("editOverlay");

  document.getElementById("editDate").value   = record.date;
  document.getElementById("editAmount").value = record.amount;
  document.getElementById("editType").value   = record.type;
  document.getElementById("editTypeToggle").querySelectorAll(".type-toggle-btn").forEach(b => {
    b.classList.toggle("active", b.dataset.value === record.type);
  });
  document.getElementById("editMemo").value = record.title || "";

  const { parentId, childName } = parseCategoryField(record.category, childCategories);
  updateParentSelect(document.getElementById("editParentCat"), record.type, parentId);
  updateChildSelect(document.getElementById("editChildCat"), parentId, childName);

  showModal(editModal, editOverlay);
}

export function initEditModal(onEdited) {
  const editModal      = document.getElementById("editModal");
  const editOverlay    = document.getElementById("editOverlay");
  const closeEditBtn   = document.getElementById("closeEditBtn");
  const editTypeToggle = document.getElementById("editTypeToggle");
  const editTypeInput  = document.getElementById("editType");
  const saveEditButton = document.getElementById("saveEditButton");

  const closeEdit = () => { hideModal(editModal, editOverlay); editingRecord = null; };
  closeEditBtn.addEventListener("click",  closeEdit);
  editOverlay.addEventListener("click",   closeEdit);

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

  document.getElementById("deleteRecordBtn").addEventListener("click", () => {
    if (!editingRecord) return;
    if (!confirm("この記録を削除しますか？")) return;
    const i = records.indexOf(editingRecord);
    if (i !== -1) records.splice(i, 1);
    saveRecords();
    closeEdit();
    onEdited();
  });

  saveEditButton.addEventListener("click", () => {
    if (!editingRecord) return;
    const editDateInput   = document.getElementById("editDate");
    const editAmountInput = document.getElementById("editAmount");
    const editMemoInput   = document.getElementById("editMemo");
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
    closeEdit();
    onEdited();
  });
}
