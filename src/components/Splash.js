/**
 * components/Splash.js
 * スプラッシュ画面の表示・フェードアウト
 */

import { isLightColor } from "../utils/color.js";

export function initSplash(savedColor) {
  const splash = document.getElementById("splashScreen");
  splash.style.background = savedColor;
  if (isLightColor(savedColor)) splash.classList.add("dark-text");

  setTimeout(() => {
    splash.classList.add("fade-out");
    splash.addEventListener("transitionend", () => splash.classList.add("hidden"), { once: true });
  }, 800);
}
