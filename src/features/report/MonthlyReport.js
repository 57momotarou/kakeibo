/**
 * features/report/MonthlyReport.js
 * 月次レポートの生成・プレビュー・共有
 */

import { records, budgets, childCategories } from "../../store.js";
import { getPeriodRange } from "../../utils/calendar.js";
import { parseCategoryField, getParentName } from "../../utils/category.js";

// ===================================
// データ集計
// ===================================
function buildReportData(ym) {
  const periodStartDay = Number(localStorage.getItem("periodStartDay")) || 1;
  const { start, end } = getPeriodRange(ym, periodStartDay);
  const [y, m] = ym.split("-").map(Number);

  const period = { ym, year: y, month: m, start, end };
  const filtered = records.filter(r => r.date >= start && r.date <= end);

  // 収入・支出合計
  let income = 0, expense = 0;
  filtered.forEach(r => {
    if (r.type === "income") income += r.amount;
    else                      expense += r.amount;
  });

  // カテゴリ別支出集計（大分類）
  const catMap = {};
  filtered.filter(r => r.type === "expense").forEach(r => {
    const { parentId } = parseCategoryField(r.category, childCategories);
    const name = getParentName(parentId);
    catMap[name] = (catMap[name] || 0) + r.amount;
  });
  const topCategories = Object.entries(catMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // 予算達成状況
  const budgetStatus = [];
  const catSpendMap = {};
  filtered.filter(r => r.type === "expense").forEach(r => {
    const { childName, parentId } = parseCategoryField(r.category, childCategories);
    const label = childName || getParentName(parentId);
    catSpendMap[label] = (catSpendMap[label] || 0) + r.amount;
  });
  Object.entries(budgets).forEach(([catName, budget]) => {
    if (budget <= 0) return;
    const spent = catSpendMap[catName] || 0;
    budgetStatus.push({ catName, budget, spent, over: spent > budget });
  });

  return { period, income, expense, balance: income - expense, topCategories, budgetStatus };
}

// ===================================
// テキストレポート生成
// ===================================
function buildReportText(data) {
  const { period, income, expense, balance, topCategories, budgetStatus } = data;
  const sign = balance >= 0 ? "+" : "";
  const lines = [];

  lines.push(`📊 ${period.year}年${period.month}月 家計簿レポート`);
  lines.push(`（${period.start} 〜 ${period.end}）`);
  lines.push("");
  lines.push("━━━━━━━━━━━━━━━━━━");
  lines.push(`収入合計　　¥${income.toLocaleString()}`);
  lines.push(`支出合計　　¥${expense.toLocaleString()}`);
  lines.push(`収支差額　　${sign}¥${Math.abs(balance).toLocaleString()}`);
  lines.push("━━━━━━━━━━━━━━━━━━");

  if (topCategories.length > 0) {
    lines.push("");
    lines.push("📌 支出カテゴリ TOP5");
    topCategories.forEach(([name, amount], i) => {
      const pct = expense > 0 ? Math.round(amount / expense * 100) : 0;
      lines.push(`${i + 1}. ${name}　¥${amount.toLocaleString()}（${pct}%）`);
    });
  }

  if (budgetStatus.length > 0) {
    lines.push("");
    lines.push("🎯 予算達成状況");
    budgetStatus.forEach(({ catName, budget, spent, over }) => {
      const pct = Math.round(spent / budget * 100);
      const mark = over ? "❌" : pct >= 80 ? "⚠️" : "✅";
      lines.push(`${mark} ${catName}　¥${spent.toLocaleString()} / ¥${budget.toLocaleString()}（${pct}%）`);
    });
  }

  lines.push("");
  lines.push("家計簿アプリより");
  return lines.join("\n");
}

// ===================================
// プレビューシート表示
// ===================================
function showReportSheet(ym) {
  const existing = document.getElementById("reportSheetOverlay");
  if (existing) existing.remove();

  const data = buildReportData(ym);
  const text = buildReportText(data);
  const { period, income, expense, balance, topCategories, budgetStatus } = data;
  const sign = balance >= 0 ? "+" : "-";
  const balColor = balance >= 0 ? "var(--theme,#4caf50)" : "#e53935";

  const overlay = document.createElement("div");
  overlay.id = "reportSheetOverlay";
  overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:350;display:flex;align-items:flex-end;";

  const sheet = document.createElement("div");
  sheet.style.cssText = "background:#f5f5f5;width:100%;border-radius:20px 20px 0 0;max-height:85vh;display:flex;flex-direction:column;";

  // ヘッダー
  const header = document.createElement("div");
  header.style.cssText = "display:flex;align-items:center;justify-content:space-between;padding:16px 20px 12px;background:#fff;border-radius:20px 20px 0 0;border-bottom:1px solid #e0e0e0;flex-shrink:0;";
  header.innerHTML =
    '<div style="width:32px;"></div>' +
    '<span style="font-size:16px;font-weight:bold;">' + period.year + '年' + period.month + '月 レポート</span>' +
    '<button id="closeReportSheet" style="width:32px;height:32px;border-radius:50%;border:none;background:#f0f0f0;font-size:14px;cursor:pointer;">✕</button>';
  sheet.appendChild(header);

  // スクロールエリア
  const body = document.createElement("div");
  body.style.cssText = "overflow-y:auto;flex:1;padding:16px;";

  // サマリーカード
  const summary = document.createElement("div");
  summary.style.cssText = "background:#fff;border-radius:12px;padding:16px;margin-bottom:12px;";
  summary.innerHTML =
    '<div style="font-size:12px;color:#888;margin-bottom:10px;">' + period.start + ' 〜 ' + period.end + '</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;">' +
      '<div style="background:#f5f5f5;border-radius:8px;padding:10px 12px;">' +
        '<div style="font-size:11px;color:#888;margin-bottom:4px;">収入</div>' +
        '<div style="font-size:18px;font-weight:bold;color:var(--theme,#4caf50);">¥' + income.toLocaleString() + '</div>' +
      '</div>' +
      '<div style="background:#f5f5f5;border-radius:8px;padding:10px 12px;">' +
        '<div style="font-size:11px;color:#888;margin-bottom:4px;">支出</div>' +
        '<div style="font-size:18px;font-weight:bold;color:#e53935;">¥' + expense.toLocaleString() + '</div>' +
      '</div>' +
    '</div>' +
    '<div style="border-top:1px solid #f0f0f0;padding-top:10px;display:flex;justify-content:space-between;align-items:center;">' +
      '<span style="font-size:13px;color:#666;">収支差額</span>' +
      '<span style="font-size:20px;font-weight:bold;color:' + balColor + ';">' + sign + '¥' + Math.abs(balance).toLocaleString() + '</span>' +
    '</div>';
  body.appendChild(summary);

  // カテゴリ別支出
  if (topCategories.length > 0) {
    const catCard = document.createElement("div");
    catCard.style.cssText = "background:#fff;border-radius:12px;padding:16px;margin-bottom:12px;";
    let catHtml = '<div style="font-size:13px;font-weight:bold;color:#444;margin-bottom:12px;">📌 支出カテゴリ TOP5</div>';
    topCategories.forEach(([name, amount], i) => {
      const pct = expense > 0 ? Math.round(amount / expense * 100) : 0;
      const barW = expense > 0 ? Math.min(amount / expense * 100, 100) : 0;
      catHtml +=
        '<div style="margin-bottom:10px;">' +
          '<div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px;">' +
            '<span style="color:#333;">' + (i + 1) + '. ' + name + '</span>' +
            '<span style="color:#555;font-weight:bold;">¥' + amount.toLocaleString() + ' <span style="font-weight:normal;color:#aaa;">(' + pct + '%)</span></span>' +
          '</div>' +
          '<div style="height:5px;background:#eee;border-radius:3px;overflow:hidden;">' +
            '<div style="height:100%;width:' + barW + '%;background:var(--theme,#4caf50);border-radius:3px;"></div>' +
          '</div>' +
        '</div>';
    });
    catCard.innerHTML = catHtml;
    body.appendChild(catCard);
  }

  // 予算達成状況
  if (budgetStatus.length > 0) {
    const budgetCard = document.createElement("div");
    budgetCard.style.cssText = "background:#fff;border-radius:12px;padding:16px;margin-bottom:12px;";
    let budHtml = '<div style="font-size:13px;font-weight:bold;color:#444;margin-bottom:12px;">🎯 予算達成状況</div>';
    budgetStatus.forEach(({ catName, budget, spent, over }) => {
      const pct = Math.round(spent / budget * 100);
      const warn = !over && pct >= 80;
      const barColor = over ? "#e53935" : warn ? "#ff9800" : "var(--theme,#4caf50)";
      const mark = over ? "❌" : warn ? "⚠️" : "✅";
      budHtml +=
        '<div style="margin-bottom:10px;">' +
          '<div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px;">' +
            '<span>' + mark + ' ' + catName + '</span>' +
            '<span style="color:' + (over ? "#e53935" : "#555") + ';font-weight:bold;">' + pct + '%</span>' +
          '</div>' +
          '<div style="height:5px;background:#eee;border-radius:3px;overflow:hidden;">' +
            '<div style="height:100%;width:' + Math.min(pct, 100) + '%;background:' + barColor + ';border-radius:3px;"></div>' +
          '</div>' +
          '<div style="font-size:11px;color:#aaa;margin-top:3px;text-align:right;">¥' + spent.toLocaleString() + ' / ¥' + budget.toLocaleString() + '</div>' +
        '</div>';
    });
    budgetCard.innerHTML = budHtml;
    body.appendChild(budgetCard);
  }

  sheet.appendChild(body);

  // 共有ボタン
  const btnArea = document.createElement("div");
  btnArea.style.cssText = "padding:12px 16px 32px;flex-shrink:0;display:flex;flex-direction:column;gap:8px;";

  // Web Share API が使えるか判定
  const canShare = !!navigator.share;

  if (canShare) {
    const shareBtn = document.createElement("button");
    shareBtn.style.cssText = "width:100%;height:50px;background:var(--theme,#4caf50);color:#fff;border:none;border-radius:12px;font-size:16px;font-weight:bold;cursor:pointer;";
    shareBtn.textContent = "📤 共有する";
    shareBtn.addEventListener("click", async () => {
      try {
        await navigator.share({
          title: period.year + "年" + period.month + "月 家計簿レポート",
          text:  text,
        });
      } catch (e) {
        if (e.name !== "AbortError") alert("共有に失敗しました");
      }
    });
    btnArea.appendChild(shareBtn);
  }

  // コピーボタン（Share API 非対応環境のフォールバック、またはサブ手段として常に表示）
  const copyBtn = document.createElement("button");
  copyBtn.style.cssText = "width:100%;height:44px;background:#fff;color:#333;border:1.5px solid #ddd;border-radius:12px;font-size:15px;cursor:pointer;";
  copyBtn.textContent = "📋 テキストをコピー";
  copyBtn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(text);
      copyBtn.textContent = "✅ コピーしました";
      setTimeout(() => { copyBtn.textContent = "📋 テキストをコピー"; }, 2000);
    } catch {
      // clipboard API が使えない場合のフォールバック
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.cssText = "position:fixed;opacity:0;";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      copyBtn.textContent = "✅ コピーしました";
      setTimeout(() => { copyBtn.textContent = "📋 テキストをコピー"; }, 2000);
    }
  });
  btnArea.appendChild(copyBtn);

  sheet.appendChild(btnArea);
  overlay.appendChild(sheet);
  document.body.appendChild(overlay);

  header.querySelector("#closeReportSheet").addEventListener("click", () => overlay.remove());
  overlay.addEventListener("click", e => { if (e.target === overlay) overlay.remove(); });
}

// ===================================
// 初期化（main.jsから呼ぶ）
// ===================================
export function initShareReport(monthSelector) {
  const btn = document.getElementById("shareReportBtn");
  if (!btn) return;
  btn.addEventListener("click", () => showReportSheet(monthSelector.value));
}
