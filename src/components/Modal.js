/**
 * components/Modal.js
 * モーダルの表示・非表示アニメーション（共通）
 */

export function initModalViewport() {
  const update = () => {
    const viewport = window.visualViewport;
    const height = viewport?.height || window.innerHeight;
    const top = viewport?.offsetTop || 0;
    const layoutHeight = Math.max(document.documentElement.clientHeight, window.innerHeight);
    document.documentElement.style.setProperty("--app-visible-height", height + "px");
    document.documentElement.style.setProperty("--app-visible-top", top + "px");
    document.documentElement.style.setProperty("--app-keyboard-offset", Math.max(0, layoutHeight - height - top) + "px");
  };
  update();
  window.addEventListener("resize", update);
  window.visualViewport?.addEventListener("resize", update);
  window.visualViewport?.addEventListener("scroll", update);
}

export function showModal(modal, overlay) {
  // スクロール・横スワイプするpageWrapperのクリップ領域から外す。
  if (modal.parentElement !== document.body) document.body.appendChild(modal);
  if (overlay.parentElement !== document.body) document.body.appendChild(overlay);
  const body = modal.querySelector(".modal-body");
  if (body) body.scrollTop = 0;
  modal.classList.remove("hidden");
  overlay.classList.remove("hidden");
  requestAnimationFrame(() => {
    modal.classList.add("show");
    overlay.classList.add("show");
  });
}

export function hideModal(modal, overlay) {
  if (modal.contains(document.activeElement)) document.activeElement.blur();
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
