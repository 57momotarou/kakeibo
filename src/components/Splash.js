/**
 * components/Splash.js
 * スプラッシュ画面の表示・フェードアウト
 */

import { isLightColor } from "../utils/color.js";

export function initSplash(savedColor) {
  const splash = document.getElementById("splashScreen");
  splash.style.background = savedColor;
  if (isLightColor(savedColor)) splash.classList.add("dark-text");

  // ステータスバーの色をテーマカラーに合わせる
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) metaTheme.setAttribute("content", savedColor);

  setTimeout(() => {
    splash.classList.add("fade-out");
    splash.addEventListener("transitionend", () => splash.classList.add("hidden"), { once: true });
  }, 800);
}
