/**
 * utils/color.js
 * 色に関するユーティリティ関数
 */

/**
 * 明るい色かどうか判定
 * @param {string} hex - "#RRGGBB" 形式
 * @returns {boolean}
 */
export function isLightColor(hex) {
  const c = hex.replace("#", "");
  const r = parseInt(c.length === 3 ? c[0]+c[0] : c.slice(0,2), 16);
  const g = parseInt(c.length === 3 ? c[1]+c[1] : c.slice(2,4), 16);
  const b = parseInt(c.length === 3 ? c[2]+c[2] : c.slice(4,6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) > 200;
}

/**
 * 色を暗くする
 * @param {string} hex - "#RRGGBB" 形式
 * @param {number} amount - 暗くする量（0〜255）
 * @returns {string} "#RRGGBB"
 */
export function darkenColor(hex, amount) {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.max(0, (num >> 16) - amount);
  const g = Math.max(0, ((num >> 8) & 0xff) - amount);
  const b = Math.max(0, (num & 0xff) - amount);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

// 淡いテーマにも読める文字色を組み合わせる。
export function themeForeground(hex) {
  const channels = hex.slice(1).match(/../g).map(c => parseInt(c, 16) / 255);
  const linear = channels.map(c => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const luminance = linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
  return 1.05 / (luminance + 0.05) >= 4.5 ? "#ffffff" : "#17384d";
}
