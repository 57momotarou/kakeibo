/**
 * components/Theme.js
 * テーマカラーの適用・プリセットUI
 */

import { PRESET_COLORS } from "../constants/categories.js";
import { darkenColor } from "../utils/color.js";
import { setThemeColor } from "../store.js";

export function applyThemeColor(color) {
  setThemeColor(color);
  document.documentElement.style.setProperty("--theme", color);
  document.documentElement.style.setProperty("--theme-dark", darkenColor(color, 20));
  // ステータスバーの色も同時に更新
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) metaTheme.setAttribute("content", color);
  const bar = document.getElementById("themePreviewBar");
  if (bar) bar.style.background = color;
  document.querySelectorAll(".color-swatch").forEach(sw => {
    sw.classList.toggle("selected", sw.dataset.color === color);
  });
}

export function renderColorPresets(currentColor) {
  const container = document.getElementById("colorPresets");
  container.innerHTML = "";
  PRESET_COLORS.forEach(({ label, color }) => {
    const btn = document.createElement("button");
    btn.className = "color-swatch";
    btn.dataset.color = color;
    btn.style.background = color;
    btn.title = label;
    btn.innerHTML = `<span class="swatch-check">✓</span><span class="swatch-label">${label}</span>`;
    if (color === currentColor) btn.classList.add("selected");
    btn.addEventListener("click", () => applyThemeColor(color));
    container.appendChild(btn);
  });
  const bar = document.getElementById("themePreviewBar");
  if (bar) bar.style.background = currentColor;
}

export function initThemeEvents() {
  document.getElementById("applyCustomColor").addEventListener("click", () => {
    applyThemeColor(document.getElementById("customColorPicker").value);
  });
}
