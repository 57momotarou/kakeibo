/**
 * components/Modal.js
 * モーダルの表示・非表示アニメーション（共通）
 */

export function showModal(modal, overlay) {
  modal.classList.remove("hidden");
  overlay.classList.remove("hidden");
  requestAnimationFrame(() => {
    modal.classList.add("show");
    overlay.classList.add("show");
  });
}

export function hideModal(modal, overlay) {
  modal.classList.remove("show");
  overlay.classList.remove("show");
  setTimeout(() => {
    modal.classList.add("hidden");
    overlay.classList.add("hidden");
  }, 250);
}

/** トースト通知 */
export function showToast(msg) {
  const t = document.createElement("div");
  t.textContent = msg;
  t.style.cssText = `position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.75);color:#fff;padding:10px 20px;border-radius:20px;font-size:14px;z-index:400;animation:fadeInOut 2.2s ease forwards;pointer-events:none;`;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2200);
}
