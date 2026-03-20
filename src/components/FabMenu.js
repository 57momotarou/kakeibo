/**
 * components/FabMenu.js
 * 右下FABボタン・メニュー展開ロジック
 */

import { getGeminiApiKey } from "../store.js";

let fabOpen = false;

export function applyFabVisibility() {
  const hasKey = !!getGeminiApiKey();
  document.getElementById("fabCameraItem").style.display = hasKey ? "" : "none";
}

export function openFabMenu() {
  fabOpen = true;
  document.getElementById("openAddBtn").classList.add("fab-open");
  document.getElementById("fabMenu").classList.add("open");
  const fabOverlay = document.getElementById("fabOverlay");
  fabOverlay.classList.remove("hidden");
  fabOverlay.classList.add("show");
}

export function closeFabMenu() {
  fabOpen = false;
  document.getElementById("openAddBtn").classList.remove("fab-open");
  document.getElementById("fabMenu").classList.remove("open");
  const fabOverlay = document.getElementById("fabOverlay");
  fabOverlay.classList.remove("show");
  setTimeout(() => fabOverlay.classList.add("hidden"), 200);
}

export function initFabEvents(onOpenAddModal, onOpenCamera) {
  const openAddBtn = document.getElementById("openAddBtn");
  const fabOverlay = document.getElementById("fabOverlay");

  openAddBtn.addEventListener("click", () => {
    if (fabOpen) { closeFabMenu(); return; }
    if (!getGeminiApiKey()) onOpenAddModal();
    else openFabMenu();
  });

  fabOverlay.addEventListener("click", closeFabMenu);

  document.getElementById("fabManualBtn").addEventListener("click", () => {
    closeFabMenu();
    setTimeout(() => onOpenAddModal(), 200);
  });

  document.getElementById("fabCameraBtn").addEventListener("click", () => {
    closeFabMenu();
    setTimeout(() => onOpenCamera(), 200);
  });
}
