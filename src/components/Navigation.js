import { getPeriodRange, getDefaultMonth } from "../utils/calendar.js";

/**
 * components/Navigation.js
 * ビュースタック管理・タブバー・月ナビゲーション・スワイプジェスチャー
 */

import { tabVisibility, saveTabVisibility } from "../store.js";

// ===================================
// ビュー設定マップ
// ===================================
export const VIEW_CONFIG = {
  home:           { el: null, title: null,               showTabs: true  },
  transaction:    { el: null, title: null,               showTabs: true  },
  calendar:       { el: null, title: null,               showTabs: true  },
  graph:          { el: null, title: null,               showTabs: true  },
  payroll:        { el: null, title: null,               showTabs: true  },
  account:        { el: null, title: null,               showTabs: true  },
  settings:       { el: null, title: "設定",             showTabs: true  },
  category:       { el: null, title: "カテゴリ変更",     showTabs: true  },
  categoryDetail: { el: null, title: "",                 showTabs: true  },
  theme:          { el: null, title: "テーマカラー",     showTabs: true  },
  period:         { el: null, title: "集計期間",         showTabs: true  },
  budget:         { el: null, title: "予算設定",         showTabs: true  },
  apiKey:         { el: null, title: "Gemini APIキー",   showTabs: true  },
  reset:          { el: null, title: "データのリセット", showTabs: true  },
  visibility:     { el: null, title: "表示 / 非表示",    showTabs: true  },
};

export let viewStack = ["home"];
export let currentCategoryParentId = null;

export function setCurrentCategoryParentId(id) {
  currentCategoryParentId = id;
}

/** VIEW_CONFIG に DOM 要素をセット（DOMContentLoaded後に呼ぶ） */
export function initViewElements() {
  VIEW_CONFIG.home.el           = document.getElementById("homeView");
  VIEW_CONFIG.transaction.el    = document.getElementById("transactionView");
  VIEW_CONFIG.calendar.el       = document.getElementById("calendarView");
  VIEW_CONFIG.graph.el          = document.getElementById("graphView");
  VIEW_CONFIG.payroll.el        = document.getElementById("payrollView");
  VIEW_CONFIG.account.el        = document.getElementById("accountView");
  VIEW_CONFIG.settings.el       = document.getElementById("settingsView");
  VIEW_CONFIG.category.el       = document.getElementById("categoryView");
  VIEW_CONFIG.categoryDetail.el = document.getElementById("categoryDetailView");
  VIEW_CONFIG.theme.el          = document.getElementById("themeView");
  VIEW_CONFIG.period.el         = document.getElementById("periodView");
  VIEW_CONFIG.budget.el         = document.getElementById("budgetView");
  VIEW_CONFIG.apiKey.el         = document.getElementById("apiKeyView");
  VIEW_CONFIG.reset.el          = document.getElementById("resetView");
  VIEW_CONFIG.visibility.el     = document.getElementById("visibilityView");
}

// ===================================
// ナビゲーション
// ===================================
let _onShowView = null; // showCurrentView時のコールバック（main.jsから注入）

export function setOnShowView(fn) { _onShowView = fn; }

export function navigate(viewName) {
  VIEW_CONFIG[viewStack[viewStack.length - 1]].el.classList.remove("active");
  viewStack.push(viewName);
  showCurrentView();
  requestAnimationFrame(() => {
    const pw = document.getElementById("pageWrapper");
    if (pw) pw.scrollTop = 0;
  });
}

export function goBack() {
  if (viewStack.length <= 1) return;
  VIEW_CONFIG[viewStack[viewStack.length - 1]].el.classList.remove("active");
  viewStack.pop();
  showCurrentView();
  // 描画完了後にscrollTopをリセット（描画がDOMを書き換えた後に確実に実行）
  requestAnimationFrame(() => {
    const pw = document.getElementById("pageWrapper");
    if (pw) pw.scrollTop = 0;
  });
}

export function switchToTab(name) {
  viewStack.forEach(v => VIEW_CONFIG[v].el.classList.remove("active"));
  viewStack = [name];
  showCurrentView();
  requestAnimationFrame(() => {
    const pw = document.getElementById("pageWrapper");
    if (pw) pw.scrollTop = 0;
  });
}

export function showCurrentView() {
  const name   = viewStack[viewStack.length - 1];
  const config = VIEW_CONFIG[name];
  config.el.classList.add("active");
  // ビュー表示時点でスクロールを先頭にリセット
  const _pw = document.getElementById("pageWrapper");
  if (_pw) _pw.scrollTop = 0;

  const topBarNormal   = document.getElementById("topBarNormal");
  const topBarSettings = document.getElementById("topBarSettings");
  const settingsBarTitle = document.getElementById("settingsBarTitle");
  const openAddBtn     = document.getElementById("openAddBtn");
  const openSettingsBtn = document.getElementById("openSettingsBtn");

  const isMain = ["home","transaction","calendar","graph","payroll","account"].includes(name);
  topBarNormal.classList.toggle("hidden", !isMain);
  topBarSettings.classList.toggle("hidden", isMain);
  // TopBar編集ボタン制御
  const topBarEditBtn = document.getElementById("topBarEditBtn");

  if (!isMain) {
    if (name === "categoryDetail" && currentCategoryParentId) {
      import("../constants/categories.js").then(({ PARENT_CATEGORIES }) => {
        const p = PARENT_CATEGORIES.find(p => p.id === currentCategoryParentId);
        settingsBarTitle.textContent = p ? `${p.icon} ${p.name}` : "小分類";
      });
      // 小分類画面のみ編集ボタン表示
      if (topBarEditBtn) topBarEditBtn.classList.remove("hidden");
    } else {
      settingsBarTitle.textContent = config.title;
      if (topBarEditBtn) topBarEditBtn.classList.add("hidden");
    }
  } else {
    if (topBarEditBtn) topBarEditBtn.classList.add("hidden");
  }

  const monthNav       = document.getElementById("topBarMonthNav");
  const homeTitleEl    = document.getElementById("topBarHomeTitle");
  const calShortcutBtn = document.getElementById("calendarShortcutBtn");
  const calBackBtn     = document.getElementById("calendarBackBtn");
  const spacer         = document.getElementById("topBarSpacer");
  const shareBtn       = document.getElementById("shareReportBtn");
  const graphLeftBtn   = document.getElementById("graphLeftBtn");
  const graphRightBtn  = document.getElementById("graphRightBtn");

  document.body.classList.toggle("graph-topbar-mode", name === "graph");

  if (isMain) {
    const isTransaction = (name === "transaction");
    const isHome        = (name === "home");
    const isCalendar    = (name === "calendar");
    const isPayroll     = (name === "payroll");
    const showNav       = (name === "graph");
    calShortcutBtn.style.display = isTransaction ? "" : "none";
    calBackBtn.style.display     = isCalendar    ? "" : "none";
    monthNav.style.display       = showNav       ? "" : "none";
    homeTitleEl.style.display    = (isHome || isPayroll) ? "" : "none";
    homeTitleEl.textContent      = isPayroll ? "給与明細" : "ホーム";
    // 給与明細は左に40pxのダミーを置き、右の設定ボタンと釣り合わせる
    spacer.style.display         = isPayroll || (!showNav && !isHome) ? "" : "none";
    spacer.classList.toggle("payroll-spacer", isPayroll);
    if (shareBtn) shareBtn.style.display = isHome ? "" : "none";
    if (graphLeftBtn) graphLeftBtn.style.display = showNav ? "" : "none";
    if (graphRightBtn) graphRightBtn.style.display = showNav ? "" : "none";
    if (openSettingsBtn) openSettingsBtn.style.display = showNav ? "none" : "";
  } else {
    if (shareBtn) shareBtn.style.display = "none";
    if (graphLeftBtn) graphLeftBtn.style.display = "none";
    if (graphRightBtn) graphRightBtn.style.display = "none";
    if (openSettingsBtn) openSettingsBtn.style.display = "";
  }

  document.getElementById("tabBar").classList.toggle("hidden", !config.showTabs);
  // 給与明細画面では専用の「写真から追加」ボタンを使うためFABは非表示
  const showFab = ["home","transaction","calendar","graph","account"].includes(name);
  openAddBtn.classList.toggle("hidden", !showFab);

  // コールバック経由で各機能の描画を呼ぶ
  if (_onShowView) _onShowView(name);

  applyTabVisibility();
  document.getElementById("homeTab").classList.toggle("active",        name === "home");
  document.getElementById("transactionTab").classList.toggle("active", name === "transaction");
  document.getElementById("graphTab").classList.toggle("active",       name === "graph");
  document.getElementById("payrollTab").classList.toggle("active",     name === "payroll");
  document.getElementById("accountTab").classList.toggle("active",     name === "account");
}

// ===================================
// タブ表示切り替え
// ===================================
export function applyTabVisibility() {
  const accTab = document.getElementById("accountTab");
  const payrollTab = document.getElementById("payrollTab");
  accTab.style.display = tabVisibility.account ? "" : "none";
  payrollTab.style.display = tabVisibility.payroll ? "" : "none";
  const cur = viewStack[viewStack.length - 1];
  if (cur === "account" && !tabVisibility.account) switchToTab("home");
  if (cur === "payroll" && !tabVisibility.payroll) switchToTab("home");
}

// ===================================
// ナビゲーションイベント初期化
// ===================================
export function initNavigationEvents() {
  document.getElementById("backBtn").addEventListener("click", goBack);
  document.getElementById("openSettingsBtn").addEventListener("click", () => navigate("settings"));
  document.getElementById("calendarShortcutBtn").addEventListener("click", () => switchToTab("calendar"));
  document.getElementById("calendarBackBtn").addEventListener("click",    () => switchToTab("transaction"));
  document.getElementById("graphLeftBtn").addEventListener("click",       () => navigate("settings"));
  document.getElementById("graphRightBtn").addEventListener("click",      () => switchToTab("calendar"));
  document.getElementById("goCategory").addEventListener("click",   () => navigate("category"));
  document.getElementById("goTheme").addEventListener("click",      () => navigate("theme"));
  document.getElementById("goPeriod").addEventListener("click",     () => navigate("period"));
  document.getElementById("goVisibility").addEventListener("click", () => navigate("visibility"));
  document.getElementById("goBudget").addEventListener("click",     () => navigate("budget"));
  document.getElementById("goApiKey").addEventListener("click",     () => navigate("apiKey"));
  document.getElementById("goReset").addEventListener("click",      () => navigate("reset"));

  document.getElementById("homeTab").addEventListener("click",        () => switchToTab("home"));
  document.getElementById("transactionTab").addEventListener("click", () => switchToTab("transaction"));
  document.getElementById("graphTab").addEventListener("click",       () => switchToTab("graph"));
  document.getElementById("payrollTab").addEventListener("click",     () => switchToTab("payroll"));
  document.getElementById("accountTab").addEventListener("click",     () => switchToTab("account"));
}

// ===================================
// 月ナビゲーション
// ===================================
function updateMonthRangeLabel(monthSelector) {
  const monthRangeEl = document.getElementById("monthRangeLabel");
  if (!monthRangeEl) return;
  const periodStartDay = Number(localStorage.getItem("periodStartDay")) || 1;
  const { start, end } = getPeriodRange(monthSelector.value, periodStartDay);
  const [startY, startM, startD] = start.split("-").map(Number);
  const [endY, endM, endD] = end.split("-").map(Number);
  monthRangeEl.textContent = startY === endY
    ? `${startM}月${startD}日〜${endM}月${endD}日`
    : `${startY}/${startM}/${startD}〜${endY}/${endM}/${endD}`;
}

function syncMonthNavState(monthSelector) {
  const nextBtn = document.getElementById("nextMonthBtn");
  if (!nextBtn) return;
  const maxMonth = getDefaultMonth(Number(localStorage.getItem("periodStartDay")) || 1);
  const disableNext = monthSelector.value >= maxMonth;
  nextBtn.disabled = disableNext;
  nextBtn.classList.toggle("is-disabled", disableNext);
}

export function updateMonthLabel(monthSelector) {
  const [year, month] = monthSelector.value.split("-").map(Number);
  document.getElementById("monthLabel").textContent = `${year}年${month}月`;
  updateMonthRangeLabel(monthSelector);
  syncMonthNavState(monthSelector);
}

export function initMonthNavEvents(monthSelector, onMonthChange) {
  document.getElementById("prevMonthBtn").addEventListener("click", () => changeMonth(-1, "right", monthSelector, onMonthChange));
  document.getElementById("nextMonthBtn").addEventListener("click", () => changeMonth( 1, "left",  monthSelector, onMonthChange));
}

export function changeMonth(delta, direction, monthSelector, onMonthChange) {
  if (delta > 0 && document.getElementById("nextMonthBtn")?.disabled) return;
  const [year, month] = monthSelector.value.split("-").map(Number);
  const d = new Date(year, month - 1 + delta, 1);
  const newVal = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  const currentView = viewStack[viewStack.length - 1];
  const viewEl = VIEW_CONFIG[currentView].el;
  const outClass = direction === "left" ? "slide-out-left"  : "slide-out-right";
  const inClass  = direction === "left" ? "slide-in-right"  : "slide-in-left";
  viewEl.classList.add(outClass);
  setTimeout(() => {
    monthSelector.value = newVal;
    updateMonthLabel(monthSelector);
    onMonthChange(currentView, newVal);
    viewEl.classList.remove(outClass);
    viewEl.classList.add(inClass);
    requestAnimationFrame(() => requestAnimationFrame(() => viewEl.classList.remove(inClass)));
  }, 160);
}

// ===================================
// スワイプジェスチャー
// ===================================
export function initSwipeGesture(addModal, editModal, monthSelector, onMonthChange) {
  let startX = 0, startY = 0;
  let isBackGesture = false, isMonthSwipe = false, decided = false, gestureEnabled = false;
  const BACK_EDGE = 40, BACK_THRESHOLD = 80, MONTH_THRESHOLD = 50;

  const pageWrapper = document.getElementById("pageWrapper");
  const backLayer   = document.getElementById("backLayer");
  const backDim     = document.getElementById("backLayerDim");
  const tabBar      = document.getElementById("tabBar");

  function getBackTargetName() {
    if (viewStack.length >= 2) return viewStack[viewStack.length - 2];
    if (viewStack[viewStack.length - 1] === "calendar") return "transaction";
    return null;
  }

  function canGoBack() {
    return !!getBackTargetName();
  }

  function doGoBack() {
    const cur = viewStack[viewStack.length - 1];
    if (viewStack.length > 1) goBack();
    else if (cur === "calendar") switchToTab("transaction");
  }

  function isGestureBlocked() {
    if (!addModal.classList.contains("hidden")) return true;
    if (!editModal.classList.contains("hidden")) return true;
    if (document.getElementById("reportSheetOverlay")) return true;
    if (document.querySelector(".scan-overlay:not(.hidden), .fab-overlay:not(.hidden), .overlay:not(.hidden)")) return true;
    return false;
  }

  function stripIds(root) {
    if (root.id) root.removeAttribute("id");
    root.querySelectorAll("[id]").forEach(el => el.removeAttribute("id"));
  }

  function previewTitle(viewName) {
    const mainTitles = {
      home: "ホーム",
      transaction: "入出金",
      calendar: "カレンダー",
      graph: "家計簿",
      payroll: "給与明細",
      account: "口座",
    };
    return mainTitles[viewName] || VIEW_CONFIG[viewName]?.title || "";
  }

  function createTopPreview(viewName) {
    const isMain = ["home","transaction","calendar","graph","payroll","account"].includes(viewName);
    const preview = document.createElement("div");
    preview.className = "back-gesture-top-preview";

    const inner = document.createElement("div");
    inner.className = "back-gesture-top-preview-inner";

    const left = document.createElement("span");
    left.className = "back-gesture-preview-side";
    left.textContent = isMain ? "" : "‹";

    const title = document.createElement("strong");
    title.className = "back-gesture-preview-title";
    title.textContent = previewTitle(viewName);

    const right = document.createElement("span");
    right.className = "back-gesture-preview-side back-gesture-preview-side--right";
    right.textContent = isMain ? "⚙︎" : "";

    inner.append(left, title, right);
    preview.appendChild(inner);
    return preview;
  }

  function createTabPreview(viewName) {
    const preview = tabBar.cloneNode(true);
    preview.classList.add("back-gesture-tab-preview");
    preview.classList.remove("hidden");

    const targetId = {
      home: "homeTab",
      transaction: "transactionTab",
      graph: "graphTab",
      payroll: "payrollTab",
      account: "accountTab",
    }[viewName];

    if (targetId) {
      preview.querySelectorAll(".tab").forEach(el => el.classList.remove("active"));
      const active = preview.querySelector(`#${targetId}`);
      if (active) active.classList.add("active");
    }
    stripIds(preview);
    return preview;
  }

  function prepareBackLayer() {
    const prevName = getBackTargetName();
    if (!prevName) return;

    const prevViewEl = VIEW_CONFIG[prevName]?.el;
    if (!prevViewEl) return;

    // 戻り先を背景に実表示して、動画のように指の移動に合わせて露出させる。
    prevViewEl._originalParent = prevViewEl.parentNode;
    prevViewEl._originalNextSibling = prevViewEl.nextSibling;
    backLayer.insertBefore(prevViewEl, backDim);
    prevViewEl.classList.add("back-gesture-prev");

    const previewTop = createTopPreview(prevName);
    const previewTabs = createTabPreview(prevName);
    backLayer.insertBefore(previewTop, prevViewEl);
    backLayer.insertBefore(previewTabs, backDim);

    document.body.style.setProperty("--back-preview-top-height", prevName === "graph" ? "86px" : "52px");
    document.body.style.setProperty("--back-gesture-x", "0px");
    backDim.style.transition = "none";
    backDim.style.opacity = "0.28";
    document.body.classList.add("back-gesture-active");
  }

  function cleanupBackLayer() {
    document.body.classList.remove("back-gesture-active", "back-gesture-animating", "back-gesture-cancelling");
    document.body.style.removeProperty("--back-gesture-x");
    document.body.style.removeProperty("--back-preview-top-height");

    backLayer.querySelectorAll(".back-gesture-top-preview, .back-gesture-tab-preview").forEach(el => el.remove());

    const prevEl = backLayer.querySelector(".back-gesture-prev");
    if (prevEl) {
      prevEl.classList.remove("back-gesture-prev");
      prevEl.style.cssText = "";
      if (prevEl._originalParent) {
        if (prevEl._originalNextSibling) {
          prevEl._originalParent.insertBefore(prevEl, prevEl._originalNextSibling);
        } else {
          prevEl._originalParent.appendChild(prevEl);
        }
        prevEl._originalParent = null;
        prevEl._originalNextSibling = null;
      }
    }

    pageWrapper.style.pointerEvents = "";
    backDim.style.transition = "";
    backDim.style.opacity = "";
  }

  document.addEventListener("touchstart", e => {
    isBackGesture = false;
    isMonthSwipe = false;
    decided = false;
    gestureEnabled = !isGestureBlocked();
    if (!gestureEnabled) return;
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
  }, { passive: true });

  document.addEventListener("touchmove", e => {
    if (!gestureEnabled) return;
    const curX = e.touches[0].clientX;
    const curY = e.touches[0].clientY;
    const dx = curX - startX;
    const dy = curY - startY;

    if (!decided) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      if (Math.abs(dy) > Math.abs(dx)) { decided = true; return; }

      if (startX <= BACK_EDGE && dx > 0 && canGoBack()) {
        isBackGesture = true;
        prepareBackLayer();
      } else {
        const cur = viewStack[viewStack.length - 1];
        if (["calendar","graph","transaction"].includes(cur)) isMonthSwipe = true;
      }
      decided = true;
    }

    if (isBackGesture) {
      const move = Math.max(0, Math.min(dx, window.innerWidth));
      const progress = Math.min(move / window.innerWidth, 1);
      document.body.style.setProperty("--back-gesture-x", `${move}px`);
      backDim.style.transition = "none";
      backDim.style.opacity = String(0.28 * (1 - progress));
    }
  }, { passive: true });

  document.addEventListener("touchend", e => {
    if (!gestureEnabled) return;
    gestureEnabled = false;
    if (!decided) return;
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const dx = endX - startX;
    const dy = endY - startY;

    if (isBackGesture) {
      if (dx >= BACK_THRESHOLD) {
        pageWrapper.style.pointerEvents = "none";
        document.body.classList.add("back-gesture-animating");
        document.body.style.setProperty("--back-gesture-x", `${window.innerWidth}px`);
        backDim.style.transition = "opacity 0.22s cubic-bezier(0.4,0,0.2,1)";
        backDim.style.opacity = "0";

        setTimeout(() => {
          // 戻り先へ切り替えてから背景レイヤーを片付けると、画面が瞬間的に白くならない。
          doGoBack();
          cleanupBackLayer();
          requestAnimationFrame(() => {
            requestAnimationFrame(() => { pageWrapper.scrollTop = 0; });
          });
        }, 225);
      } else {
        document.body.classList.add("back-gesture-cancelling");
        document.body.style.setProperty("--back-gesture-x", "0px");
        backDim.style.transition = "opacity 0.28s cubic-bezier(0.4,0,0.2,1)";
        backDim.style.opacity = "0.28";
        setTimeout(cleanupBackLayer, 290);
      }
      isBackGesture = false;
      return;
    }

    if (isMonthSwipe) {
      if (Math.abs(dy) > Math.abs(dx)) return;
      const diffX = startX - endX;
      if (Math.abs(diffX) < MONTH_THRESHOLD) return;
      if (diffX > 0) changeMonth( 1, "left",  monthSelector, onMonthChange);
      else           changeMonth(-1, "right", monthSelector, onMonthChange);
    }
  }, { passive: true });

  document.addEventListener("touchcancel", () => {
    if (!gestureEnabled) return;
    gestureEnabled = false;
    if (!isBackGesture) return;
    document.body.classList.add("back-gesture-cancelling");
    document.body.style.setProperty("--back-gesture-x", "0px");
    setTimeout(cleanupBackLayer, 290);
    isBackGesture = false;
  }, { passive: true });
}
