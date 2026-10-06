import { DEFAULT_CHILD_CATEGORIES } from "../../constants/categories.js";
import { isDateString } from "../payday/PaydayMath.js";

const APP_ID = "kakeibo-pwa";
const FORMAT_VERSION = 1;
export const UNDO_KEY = "kakeiboRestoreUndo";
const defaultCategories = () => Object.fromEntries(Object.entries(DEFAULT_CHILD_CATEGORIES)
  .map(([id, names]) => [id, names.map(name => ({ name }))]));

const JSON_DEFAULTS = {
  records: [], accounts: [{ id: 1, name: "財布", balance: 0, memo: "" }], budgets: {},
  childCategories: null, payrollSlips: [], tabVisibility: { calendar: false, account: true, payroll: false }, paydaySettings: null,
};
const TEXT_DEFAULTS = {
  periodStartDay: "1", themeColor: "#83c7f4", categoryVersion: "2", themeDefaultVersion: "sky-blue-1",
  receiptTaxMode: "inclusive", payrollSelectedYear: null,
};
const KEYS = [...Object.keys(JSON_DEFAULTS), ...Object.keys(TEXT_DEFAULTS)];
const plainObject = value => value !== null && typeof value === "object" && !Array.isArray(value)
  && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
const finite = value => typeof value === "number" && Number.isFinite(value);
const text = value => typeof value === "string";
const optionalText = value => value === undefined || value === null || text(value);
const check = (condition, message) => { if (!condition) throw new Error(message); };

function assertSafeKeys(value) {
  if (!value || typeof value !== "object") return;
  for (const key of Object.keys(value)) {
    check(!["__proto__", "prototype", "constructor"].includes(key), "バックアップの項目名が不正です。");
    assertSafeKeys(value[key]);
  }
}

function validateTax(details) {
  if (details === undefined || details === null) return;
  check(plainObject(details), "消費税の内訳が不正です。");
  check([details.netAmount, details.taxAmount, details.totalAmount].every(v => finite(v) && v >= 0), "消費税の金額が不正です。");
  check(Math.abs(details.netAmount + details.taxAmount - details.totalAmount) < 0.01, "消費税の内訳と合計が一致しません。");
  check([0, 8, 10].includes(details.rate) && ["inclusive", "exclusive"].includes(details.basis), "消費税の形式が不正です。");
  check(typeof details.estimated === "boolean" && typeof details.allocated === "boolean", "消費税の形式が不正です。");
}

function validatePayday(settings) {
  if (settings === null) return;
  check(plainObject(settings) && Number.isInteger(settings.day) && settings.day >= 1 && settings.day <= 31, "給料日の設定が不正です。");
  check(isDateString(settings.baselineDate) && (settings.nextDate === "" || isDateString(settings.nextDate)), "給料日の設定日が不正です。");
  check([settings.balance, settings.baselineLedger, settings.protectedAmount, settings.plannedAmount].every(finite)
    && settings.protectedAmount >= 0 && settings.plannedAmount >= 0, "給料日までの金額が不正です。");
}

export function validateBackup(envelope) {
  check(plainObject(envelope) && envelope.app === APP_ID, "このアプリのバックアップファイルを選んでください。");
  check(envelope.formatVersion === FORMAT_VERSION, "このバージョンのバックアップには対応していません。");
  check(text(envelope.exportedAt) && Number.isFinite(Date.parse(envelope.exportedAt)), "バックアップの保存日時が不正です。");
  const data = envelope.data;
  check(plainObject(data) && KEYS.every(key => Object.hasOwn(data, key)), "バックアップに必要なデータが不足しています。");
  assertSafeKeys(data);
  check(Array.isArray(data.records), "収支データの形式が不正です。");
  for (const record of data.records) {
    check(plainObject(record) && isDateString(record.date) && finite(record.amount)
      && ["expense", "income"].includes(record.type) && text(record.category) && optionalText(record.title), "収支データの内容が不正です。");
    check(record.accountId === undefined || record.accountId === null || record.accountId === ""
      || (Number.isSafeInteger(record.accountId) && record.accountId > 0)
      || (text(record.accountId) && /^\d+$/.test(record.accountId)), "収支の口座情報が不正です。");
    validateTax(record.taxDetails);
  }
  check(Array.isArray(data.accounts), "口座データの形式が不正です。");
  const ids = new Set();
  for (const account of data.accounts) {
    check(plainObject(account) && Number.isSafeInteger(account.id) && account.id > 0 && !ids.has(account.id)
      && text(account.name) && finite(account.balance) && optionalText(account.memo), "口座データの内容が不正です。");
    ids.add(account.id);
  }
  check(plainObject(data.budgets) && Object.values(data.budgets).every(v => finite(v) && v >= 0), "予算データが不正です。");
  check(plainObject(data.childCategories) && Object.values(data.childCategories).every(list => Array.isArray(list)
    && list.every(row => plainObject(row) && text(row.name))), "カテゴリデータが不正です。");
  check(plainObject(data.tabVisibility) && Object.values(data.tabVisibility).every(v => typeof v === "boolean"), "タブの設定が不正です。");
  check(Number.isInteger(data.periodStartDay) && data.periodStartDay >= 1 && data.periodStartDay <= 28, "集計期間の設定が不正です。");
  check(text(data.themeColor) && /^#[0-9a-f]{6}$/i.test(data.themeColor), "テーマカラーが不正です。");
  check(text(data.categoryVersion) && text(data.themeDefaultVersion) && ["inclusive", "exclusive"].includes(data.receiptTaxMode), "表示設定が不正です。");
  check(data.payrollSelectedYear === null || (text(data.payrollSelectedYear) && /^\d{4}$/.test(data.payrollSelectedYear)), "給与明細の表示年が不正です。");
  check(Array.isArray(data.payrollSlips), "給与明細データの形式が不正です。");
  const slipIds = new Set();
  for (const slip of data.payrollSlips) {
    check(plainObject(slip) && text(slip.id) && slip.id && !slipIds.has(slip.id) && text(slip.documentTitle)
      && (slip.paymentDate === "" || isDateString(slip.paymentDate))
      && (slip.payrollMonth === "" || /^\d{4}-(0[1-9]|1[0-2])$/.test(slip.payrollMonth))
      && [slip.grossPay, slip.totalDeductions, slip.netPay].every(finite), "給与明細の内容が不正です。");
    slipIds.add(slip.id);
    check(["earnings", "deductions", "transfers"].every(key => Array.isArray(slip[key])
      && slip[key].every(row => plainObject(row) && text(row.name) && finite(row.amount))), "給与明細の金額項目が不正です。");
    check(Array.isArray(slip.work) && slip.work.every(row => plainObject(row) && text(row.name) && text(row.value) && text(row.unit))
      && Array.isArray(slip.notes) && slip.notes.every(text) && optionalText(slip.importedAt), "給与明細の勤務項目が不正です。");
  }
  validatePayday(data.paydaySettings);
  // 許可した項目だけを取り込む。APIキーなど別の保存領域には触れない。
  const selected = Object.fromEntries(KEYS.map(key => [key, data[key]]));
  return { app: APP_ID, formatVersion: FORMAT_VERSION, exportedAt: envelope.exportedAt, data: JSON.parse(JSON.stringify(selected)) };
}

export function createBackup(storage = localStorage, now = new Date()) {
  const data = {};
  for (const [key, fallback] of Object.entries(JSON_DEFAULTS)) {
    const raw = storage.getItem(key);
    try {
      data[key] = raw === null ? (key === "childCategories" ? defaultCategories() : fallback) : JSON.parse(raw);
    } catch { throw new Error(`保存済みの${key}を読み込めませんでした。`); }
  }
  for (const [key, fallback] of Object.entries(TEXT_DEFAULTS)) data[key] = storage.getItem(key) ?? fallback;
  data.periodStartDay = Number(data.periodStartDay);
  return validateBackup({ app: APP_ID, formatVersion: FORMAT_VERSION, exportedAt: now.toISOString(), data });
}

export function parseBackup(json) {
  let parsed;
  try { parsed = JSON.parse(json); } catch { throw new Error("JSONファイルを読み込めませんでした。"); }
  return validateBackup(parsed);
}

function rawSnapshot(storage) {
  return Object.fromEntries(KEYS.map(key => [key, storage.getItem(key)]));
}

function writeRaw(storage, values) {
  for (const key of KEYS) {
    if (values[key] === null) storage.removeItem(key);
    else storage.setItem(key, values[key]);
  }
}

function rollbackRaw(storage, values) {
  // 一旦取り込み中の値を外してから戻すと、容量不足でも元のサイズで復旧できる。
  for (const key of KEYS) storage.removeItem(key);
  writeRaw(storage, values);
}

function backupRaw(data) {
  const raw = {};
  for (const key of Object.keys(JSON_DEFAULTS)) raw[key] = JSON.stringify(data[key]);
  for (const key of Object.keys(TEXT_DEFAULTS)) raw[key] = data[key] === null ? null : String(data[key]);
  // 復元した色は本人の保存済みの設定として扱い、初期色の移行で変えない。
  raw.themeDefaultVersion = "sky-blue-1";
  return raw;
}

export function restoreBackup(envelope, storage = localStorage) {
  const validated = validateBackup(envelope);
  const before = rawSnapshot(storage);
  const oldUndo = storage.getItem(UNDO_KEY);
  let rollbackSaved = false;
  try {
    storage.setItem(UNDO_KEY, JSON.stringify({ formatVersion: 1, savedAt: new Date().toISOString(), values: before }));
    rollbackSaved = true;
    writeRaw(storage, backupRaw(validated.data));
  } catch {
    if (rollbackSaved) {
      storage.removeItem(UNDO_KEY);
      rollbackRaw(storage, before);
      if (oldUndo !== null) storage.setItem(UNDO_KEY, oldUndo);
    }
    throw new Error("復元できませんでした。端末の空き容量を確認してください。現在のデータは保持しています。");
  }
  return validated;
}

function readUndo(storage) {
  const raw = storage.getItem(UNDO_KEY);
  if (!raw) return null;
  try {
    const undo = JSON.parse(raw);
    if (undo.formatVersion !== 1 || !plainObject(undo.values)
      || !KEYS.every(key => Object.hasOwn(undo.values, key) && (undo.values[key] === null || text(undo.values[key])))) return null;
    createBackup({ getItem: key => undo.values[key] ?? null });
    return undo;
  } catch { return null; }
}

export function hasRestoreUndo(storage = localStorage) { return !!readUndo(storage); }

export function undoRestore(storage = localStorage) {
  const undo = readUndo(storage);
  check(undo, "復元前のデータが見つかりません。");
  const current = rawSnapshot(storage);
  try {
    writeRaw(storage, undo.values);
    storage.removeItem(UNDO_KEY);
  } catch {
    rollbackRaw(storage, current);
    throw new Error("復元前に戻せませんでした。端末の空き容量を確認してください。");
  }
}
