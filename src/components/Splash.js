/**
 * components/Splash.js
 * スプラッシュ画面の表示・フェードアウト
 */

import { isLightColor } from "../utils/color.js";

export function initSplash(savedColor) {
  const splash = document.getElementById("splashScreen");
  if (!splash) return;

  // index.html 側のフェイルセーフより通常処理を優先する。
  if (window.__splashSafetyTimer) {
    clearTimeout(window.__splashSafetyTimer);
    window.__splashSafetyTimer = null;
  }

  splash.style.background = savedColor;
  splash.classList.toggle("dark-text", isLightColor(savedColor));

  const hideSplash = () => splash.classList.add("hidden");

  setTimeout(() => {
    splash.classList.add("fade-out");
    // iOS/PWAで transitionend が発火しないケースでも必ず閉じる。
    splash.addEventListener("transitionend", hideSplash, { once: true });
    setTimeout(hideSplash, 700);
  }, 800);
}
