/**
 * utils/calendar.js
 * 月・期間・日付に関するユーティリティ関数
 */

/**
 * 集計期間の開始日・終了日を返す
 * @param {string} yearMonth - "YYYY-MM" 形式
 * @param {number} periodStartDay - 集計開始日（1〜28）
 * @returns {{ start: string, end: string }} - "YYYY-MM-DD" 形式
 */
export function getPeriodRange(yearMonth, periodStartDay) {
  const [year, month] = yearMonth.split("-").map(Number);
  if (periodStartDay === 1) {
    const lastDay = new Date(year, month, 0).getDate();
    return {
      start: `${yearMonth}-01`,
      end:   `${yearMonth}-${String(lastDay).padStart(2, "0")}`,
    };
  }
  const startStr = `${year}-${String(month).padStart(2,"0")}-${String(periodStartDay).padStart(2,"0")}`;
  const endMonth = month === 12 ? 1   : month + 1;
  const endYear  = month === 12 ? year + 1 : year;
  const endStr   = `${endYear}-${String(endMonth).padStart(2,"0")}-${String(periodStartDay - 1).padStart(2,"0")}`;
  return { start: startStr, end: endStr };
}

/**
 * デフォルト表示月（集計開始日を考慮）
 * @param {number} periodStartDay
 * @returns {string} "YYYY-MM"
 */
export function getDefaultMonth(periodStartDay) {
  const today = new Date();
  const yyyy = today.getFullYear(), mm = today.getMonth() + 1, dd = today.getDate();
  if (periodStartDay === 1 || dd >= periodStartDay)
    return `${yyyy}-${String(mm).padStart(2, "0")}`;
  const prev = new Date(yyyy, mm - 2, 1);
  return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * 曜日名配列
 */
export const WEEKDAY_NAMES = ["日","月","火","水","木","金","土"];
