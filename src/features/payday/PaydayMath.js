/** 給料日・残高の計算。端末の時差や夏時間に影響されない日付単位で扱う。 */
export function localDateString(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function isDateString(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  if (y < 1000 || m < 1 || m > 12 || d < 1) return false;
  return d <= new Date(Date.UTC(y, m, 0)).getUTCDate();
}

function monthPayday(year, monthIndex, day) {
  const date = new Date(Date.UTC(year, monthIndex, 1));
  const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(Math.min(day, lastDay)).padStart(2, "0")}`;
}

export function getNextPayday(settings, today = localDateString()) {
  if (!isDateString(today) || !settings || !Number.isInteger(settings.day) || settings.day < 1 || settings.day > 31) return null;
  if (isDateString(settings.nextDate) && settings.nextDate >= today) return settings.nextDate;
  const [year, month] = today.split("-").map(Number);
  const thisMonth = monthPayday(year, month - 1, settings.day);
  return thisMonth >= today ? thisMonth : monthPayday(year, month, settings.day);
}

function signedAmount(record) {
  const amount = Number(record.amount);
  return Number.isFinite(amount) ? (record.type === "income" ? amount : -amount) : 0;
}

export function dayLedger(records, date) {
  return records.filter(r => r.date === date).reduce((sum, r) => sum + signedAmount(r), 0);
}

export function calculatePayday(settings, records, today = localDateString()) {
  const nextDate = getNextPayday(settings, today);
  if (!nextDate || !isDateString(settings.baselineDate)) return null;
  const values = [settings.balance, settings.protectedAmount, settings.plannedAmount, settings.baselineLedger];
  if (!values.every(Number.isFinite)) return null;
  const ledger = records.filter(r => r.date >= settings.baselineDate && r.date <= today)
    .reduce((sum, r) => sum + signedAmount(r), 0);
  const currentBalance = settings.balance + ledger - settings.baselineLedger;
  // 未来の日付で登録した支出は支払い予定。支払日には残高側に移るため二重に引かない。
  const scheduledExpenses = records.filter(r => r.type === "expense" && r.date > today && r.date < nextDate)
    .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  const rawAvailable = currentBalance - settings.protectedAmount - settings.plannedAmount - scheduledExpenses;
  const days = Math.round((Date.parse(nextDate + "T00:00:00Z") - Date.parse(today + "T00:00:00Z")) / 86400000);
  const available = Math.max(0, rawAvailable);
  return {
    nextDate, days, currentBalance, scheduledExpenses, rawAvailable, available,
    shortage: Math.max(0, -rawAvailable),
    daily: days > 0 ? Math.floor(available / days) : null,
  };
}
