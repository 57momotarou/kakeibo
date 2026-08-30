/**
 * features/report/MonthlyReport.js
 * 月次レポートの生成・プレビュー・共有・画像保存
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

  let income = 0, expense = 0;
  filtered.forEach(r => {
    if (r.type === "income") income += r.amount;
    else                      expense += r.amount;
  });

  const catMap = {};
  filtered.filter(r => r.type === "expense").forEach(r => {
    const { parentId } = parseCategoryField(r.category, childCategories);
    const name = getParentName(parentId);
    catMap[name] = (catMap[name] || 0) + r.amount;
  });
  const topCategories = Object.entries(catMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

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
  lines.push(`${period.year}年${period.month}月 家計簿レポート`);
  lines.push(`（${period.start} 〜 ${period.end}）`);
  lines.push("");
  lines.push("━━━━━━━━━━━━━━━━━━");
  lines.push(`収入合計　　¥${income.toLocaleString()}`);
  lines.push(`支出合計　　¥${expense.toLocaleString()}`);
  lines.push(`収支差額　　${sign}¥${Math.abs(balance).toLocaleString()}`);
  lines.push("━━━━━━━━━━━━━━━━━━");
  if (topCategories.length > 0) {
    lines.push("");
    lines.push("支出カテゴリ TOP5");
    topCategories.forEach(([name, amount], i) => {
      const pct = expense > 0 ? Math.round(amount / expense * 100) : 0;
      lines.push(`${i + 1}. ${name}　¥${amount.toLocaleString()}（${pct}%）`);
    });
  }
  if (budgetStatus.length > 0) {
    lines.push("");
    lines.push("予算達成状況");
    budgetStatus.forEach(({ catName, budget, spent, over }) => {
      const pct = Math.round(spent / budget * 100);
      const mark = over ? "×" : pct >= 80 ? "△" : "○";
      lines.push(`${mark} ${catName}　¥${spent.toLocaleString()} / ¥${budget.toLocaleString()}（${pct}%）`);
    });
  }
  lines.push("");
  lines.push("家計簿アプリより");
  return lines.join("\n");
}

// ===================================
// Canvas で画像生成
// ===================================
function buildReportImage(data) {
  const { period, income, expense, balance, topCategories, budgetStatus } = data;
  const themeColor = getComputedStyle(document.documentElement)
    .getPropertyValue("--theme").trim() || "#12b8d6";

  // 保存画像は内容量に合わせた高さにする。
  // 以前は2868px固定の透明領域が残り、iPhone上で下半分が黒く見えていた。
  const W = 1080;
  const PADDING = 34;
  const COL = W - PADDING * 2;
  const HEADER_H = 112;
  const GAP = 22;
  const SUMMARY_H = 176;
  const CATEGORY_ROW_H = 70;
  const BUDGET_ROW_H = 78;
  const categoryH = topCategories.length > 0 ? 62 + topCategories.length * CATEGORY_ROW_H + 20 : 0;
  const budgetH = budgetStatus.length > 0 ? 62 + budgetStatus.length * BUDGET_ROW_H + 20 : 0;
  const sectionsGap = (topCategories.length > 0 ? GAP : 0) + (budgetStatus.length > 0 ? GAP : 0);
  const footerH = 58;
  const H = HEADER_H + GAP + SUMMARY_H + sectionsGap + categoryH + budgetH + footerH;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");

  // 背景はcanvas全体を必ず塗る（透明な黒帯を残さない）
  ctx.fillStyle = "#f3f5f7";
  ctx.fillRect(0, 0, W, H);

  // --- ヘッダー ---
  ctx.fillStyle = themeColor;
  ctx.fillRect(0, 0, W, HEADER_H);
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.font = "700 34px -apple-system, BlinkMacSystemFont, 'Hiragino Sans', sans-serif";
  ctx.fillText(`${period.year}年${period.month}月 家計簿レポート`, W / 2, 50);
  ctx.font = "500 18px -apple-system, BlinkMacSystemFont, 'Hiragino Sans', sans-serif";
  ctx.globalAlpha = 0.92;
  ctx.fillText(`${period.start.replaceAll("-", ".")} 〜 ${period.end.replaceAll("-", ".")}`, W / 2, 82);
  ctx.globalAlpha = 1;

  let y = HEADER_H + GAP;

  // --- 収支サマリー ---
  roundRect(ctx, PADDING, y, COL, SUMMARY_H, 18, "#fff");
  const inner = 18;
  const miniGap = 14;
  const halfW = (COL - inner * 2 - miniGap) / 2;
  const miniY = y + inner;
  roundRect(ctx, PADDING + inner, miniY, halfW, 92, 12, "#f5f7f9");
  roundRect(ctx, PADDING + inner + halfW + miniGap, miniY, halfW, 92, 12, "#f5f7f9");

  ctx.textAlign = "left";
  ctx.font = "500 16px -apple-system, BlinkMacSystemFont, 'Hiragino Sans', sans-serif";
  ctx.fillStyle = "#8a9199";
  ctx.fillText("収入", PADDING + inner + 16, miniY + 28);
  ctx.fillText("支出", PADDING + inner + halfW + miniGap + 16, miniY + 28);

  ctx.font = "700 31px -apple-system, BlinkMacSystemFont, 'Hiragino Sans', sans-serif";
  ctx.fillStyle = themeColor;
  ctx.fillText(`¥${income.toLocaleString()}`, PADDING + inner + 16, miniY + 68);
  ctx.fillStyle = "#e84545";
  ctx.fillText(`¥${expense.toLocaleString()}`, PADDING + inner + halfW + miniGap + 16, miniY + 68);

  const balanceY = y + 128;
  ctx.strokeStyle = "#edf0f2";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(PADDING + inner, balanceY - 8);
  ctx.lineTo(PADDING + COL - inner, balanceY - 8);
  ctx.stroke();

  ctx.font = "500 17px -apple-system, BlinkMacSystemFont, 'Hiragino Sans', sans-serif";
  ctx.fillStyle = "#666d75";
  ctx.textAlign = "left";
  ctx.fillText("収支差額", PADDING + inner, balanceY + 24);

  const balSign = balance >= 0 ? "+" : "-";
  ctx.font = "700 31px -apple-system, BlinkMacSystemFont, 'Hiragino Sans', sans-serif";
  ctx.fillStyle = balance >= 0 ? themeColor : "#e84545";
  ctx.textAlign = "right";
  ctx.fillText(`${balSign}¥${Math.abs(balance).toLocaleString()}`, PADDING + COL - inner, balanceY + 25);

  y += SUMMARY_H;

  // --- 支出カテゴリ TOP5 ---
  if (topCategories.length > 0) {
    y += GAP;
    roundRect(ctx, PADDING, y, COL, categoryH, 18, "#fff");
    ctx.textAlign = "left";
    ctx.fillStyle = "#343a40";
    ctx.font = "700 19px -apple-system, BlinkMacSystemFont, 'Hiragino Sans', sans-serif";
    ctx.fillText("支出カテゴリ TOP5", PADDING + 20, y + 38);

    let rowY = y + 60;
    topCategories.forEach(([name, amount], i) => {
      const pct = expense > 0 ? Math.round(amount / expense * 100) : 0;
      const availableBarW = COL - 40;
      const barW = Math.max(0, Math.min(availableBarW, availableBarW * (amount / Math.max(expense, 1))));

      ctx.textAlign = "left";
      ctx.font = "500 17px -apple-system, BlinkMacSystemFont, 'Hiragino Sans', sans-serif";
      ctx.fillStyle = "#343a40";
      ctx.fillText(`${i + 1}. ${name}`, PADDING + 20, rowY + 22);

      ctx.textAlign = "right";
      ctx.font = "700 16px -apple-system, BlinkMacSystemFont, 'Hiragino Sans', sans-serif";
      ctx.fillStyle = "#50575e";
      ctx.fillText(`¥${amount.toLocaleString()}  ${pct}%`, PADDING + COL - 20, rowY + 22);

      roundRect(ctx, PADDING + 20, rowY + 36, availableBarW, 8, 4, "#edf0f2");
      if (barW > 0) roundRect(ctx, PADDING + 20, rowY + 36, barW, 8, 4, themeColor);
      rowY += CATEGORY_ROW_H;
    });
    y += categoryH;
  }

  // --- 予算達成状況 ---
  if (budgetStatus.length > 0) {
    y += GAP;
    roundRect(ctx, PADDING, y, COL, budgetH, 18, "#fff");
    ctx.textAlign = "left";
    ctx.fillStyle = "#343a40";
    ctx.font = "700 19px -apple-system, BlinkMacSystemFont, 'Hiragino Sans', sans-serif";
    ctx.fillText("予算達成状況", PADDING + 20, y + 38);

    let rowY = y + 60;
    budgetStatus.forEach(({ catName, budget, spent, over }) => {
      const pct = Math.round(spent / budget * 100);
      const warn = !over && pct >= 80;
      const barColor = over ? "#e84545" : warn ? "#f5a623" : themeColor;
      const availableBarW = COL - 40;
      const barW = Math.min(availableBarW, Math.max(0, availableBarW * spent / budget));

      ctx.beginPath();
      ctx.arc(PADDING + 25, rowY + 20, 6, 0, Math.PI * 2);
      ctx.fillStyle = barColor;
      ctx.fill();

      ctx.textAlign = "left";
      ctx.font = "500 17px -apple-system, BlinkMacSystemFont, 'Hiragino Sans', sans-serif";
      ctx.fillStyle = "#343a40";
      ctx.fillText(catName, PADDING + 42, rowY + 25);

      ctx.textAlign = "right";
      ctx.font = "700 16px -apple-system, BlinkMacSystemFont, 'Hiragino Sans', sans-serif";
      ctx.fillStyle = over ? "#e84545" : "#50575e";
      ctx.fillText(`${pct}%`, PADDING + COL - 20, rowY + 25);

      roundRect(ctx, PADDING + 20, rowY + 38, availableBarW, 8, 4, "#edf0f2");
      if (barW > 0) roundRect(ctx, PADDING + 20, rowY + 38, barW, 8, 4, barColor);

      ctx.textAlign = "right";
      ctx.font = "500 14px -apple-system, BlinkMacSystemFont, 'Hiragino Sans', sans-serif";
      ctx.fillStyle = "#9aa1a8";
      ctx.fillText(`¥${spent.toLocaleString()} / ¥${budget.toLocaleString()}`, PADDING + COL - 20, rowY + 66);
      rowY += BUDGET_ROW_H;
    });
    y += budgetH;
  }

  // フッター。余白だけで終わらず、レポート画像として自然に締める。
  ctx.textAlign = "center";
  ctx.font = "500 14px -apple-system, BlinkMacSystemFont, 'Hiragino Sans', sans-serif";
  ctx.fillStyle = "#a5abb1";
  ctx.fillText("家計簿レポート", W / 2, H - 22);

  return canvas;
}

// 角丸矩形ユーティリティ
function roundRect(ctx, x, y, w, h, r, fill) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
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
    let catHtml = '<div style="font-size:13px;font-weight:bold;color:#444;margin-bottom:12px;">支出カテゴリ TOP5</div>';
    topCategories.forEach(([name, amount], i) => {
      const pct  = expense > 0 ? Math.round(amount / expense * 100) : 0;
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
    let budHtml = '<div style="font-size:13px;font-weight:bold;color:#444;margin-bottom:12px;">予算達成状況</div>';
    budgetStatus.forEach(({ catName, budget, spent, over }) => {
      const pct      = Math.round(spent / budget * 100);
      const warn     = !over && pct >= 80;
      const barColor = over ? "#e53935" : warn ? "#ff9800" : "var(--theme,#4caf50)";
      const dotColor = over ? "#e53935" : warn ? "#ff9800" : "var(--theme,#4caf50)";
      budHtml +=
        '<div style="margin-bottom:10px;">' +
          '<div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px;">' +
            '<span><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:' + dotColor + ';margin-right:6px;vertical-align:middle;"></span>' + catName + '</span>' +
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

  // ボタンエリア
  const btnArea = document.createElement("div");
  btnArea.style.cssText = "padding:12px 16px 32px;flex-shrink:0;display:flex;flex-direction:column;gap:8px;";

  // 画像として保存ボタン（メイン）
  const imgBtn = document.createElement("button");
  imgBtn.style.cssText = "width:100%;height:50px;background:var(--theme,#4caf50);color:#fff;border:none;border-radius:12px;font-size:16px;font-weight:bold;cursor:pointer;";
  imgBtn.textContent = "🖼️ 画像として保存";
  imgBtn.addEventListener("click", async () => {
    imgBtn.textContent = "生成中...";
    imgBtn.disabled = true;
    try {
      const canvas  = buildReportImage(data);
      const dataUrl = canvas.toDataURL("image/png");
      const fileName = period.year + "-" + String(period.month).padStart(2, "0") + "_report.png";

      // iPhoneでWeb Share APIが使える場合は画像共有シートを開く
      if (navigator.share && navigator.canShare) {
        const blob = await (await fetch(dataUrl)).blob();
        const file = new File([blob], fileName, { type: "image/png" });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: period.year + "年" + period.month + "月 家計簿レポート" });
          return;
        }
      }
      // フォールバック：<a download> でダウンロード
      const a = document.createElement("a");
      a.href     = dataUrl;
      a.download = fileName;
      a.click();
    } catch (e) {
      if (e.name !== "AbortError") alert("画像の生成に失敗しました");
    } finally {
      imgBtn.textContent = "🖼️ 画像として保存";
      imgBtn.disabled = false;
    }
  });
  btnArea.appendChild(imgBtn);

  // テキスト共有ボタン
  const canShare = !!navigator.share;
  if (canShare) {
    const shareBtn = document.createElement("button");
    shareBtn.style.cssText = "width:100%;height:44px;background:#fff;color:#333;border:1.5px solid #ddd;border-radius:12px;font-size:15px;cursor:pointer;";
    shareBtn.textContent = "📤 テキストで共有";
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

  // コピーボタン
  const copyBtn = document.createElement("button");
  copyBtn.style.cssText = "width:100%;height:44px;background:#fff;color:#333;border:1.5px solid #ddd;border-radius:12px;font-size:15px;cursor:pointer;";
  copyBtn.textContent = "📋 テキストをコピー";
  copyBtn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(text);
      copyBtn.textContent = "✅ コピーしました";
      setTimeout(() => { copyBtn.textContent = "📋 テキストをコピー"; }, 2000);
    } catch {
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
