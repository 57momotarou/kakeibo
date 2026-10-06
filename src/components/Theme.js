/**
 * components/Theme.js
 * テーマカラーの適用・プリセットUI
 */

import { PRESET_COLORS } from "../constants/categories.js";
import { darkenColor, themeForeground } from "../utils/color.js";
import { setThemeColor } from "../store.js";

export function applyThemeColor(color) {
  setThemeColor(color);
  document.documentElement.style.setProperty("--theme", color);
  const deepColor = darkenColor(color, 90);
  document.documentElement.style.setProperty("--theme-dark", themeForeground(deepColor) === "#ffffff" ? deepColor : "#17384d");
  document.documentElement.style.setProperty("--theme-foreground", themeForeground(color));
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = color;
  const picker = document.getElementById("customColorPicker");
  if (picker) picker.value = color;
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
    btn.style.color = themeForeground(color);
    btn.title = label;
    btn.innerHTML = `<span class="swatch-check">✓</span><span class="swatch-label">${label}</span>`;
    if (color === currentColor) btn.classList.add("selected");
    btn.addEventListener("click", () => applyThemeColor(color));
    container.appendChild(btn);
  });
  const bar = document.getElementById("themePreviewBar");
  if (bar) bar.style.background = currentColor;
  document.getElementById("customColorPicker").value = currentColor;
}

export function initThemeEvents() {
  document.getElementById("applyCustomColor").addEventListener("click", () => {
    applyThemeColor(document.getElementById("customColorPicker").value);
  });
}
