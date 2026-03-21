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
  account:        { el: null, title: null,               showTabs: true  },
  settings:       { el: null, title: "設定",             showTabs: false },
  category:       { el: null, title: "カテゴリ変更",     showTabs: false },
  categoryDetail: { el: null, title: "",                 showTabs: false },
  theme:          { el: null, title: "テーマカラー",     showTabs: false },
  period:         { el: null, title: "集計期間",         showTabs: false },
  budget:         { el: null, title: "予算設定",         showTabs: false },
  apiKey:         { el: null, title: "Gemini APIキー",   showTabs: false },
  reset:          { el: null, title: "データのリセット", showTabs: false },
  visibility:     { el: null, title: "表示 / 非表示",    showTabs: false },
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
}

export function goBack() {
  if (viewStack.length <= 1) return;
  VIEW_CONFIG[viewStack[viewStack.length - 1]].el.classList.remove("active");
  viewStack.pop();
  showCurrentView();
}

export function switchToTab(name) {
  viewStack.forEach(v => VIEW_CONFIG[v].el.classList.remove("active"));
  viewStack = [name];
  showCurrentView();
}

export function showCurrentView() {
  const name   = viewStack[viewStack.length - 1];
  const config = VIEW_CONFIG[name];
  config.el.classList.add("active");

  const topBarNormal   = document.getElementById("topBarNormal");
  const topBarSettings = document.getElementById("topBarSettings");
  const settingsBarTitle = document.getElementById("settingsBarTitle");
  const openAddBtn     = document.getElementById("openAddBtn");

  const isMain = ["home","transaction","calendar","graph","account"].includes(name);
  topBarNormal.classList.toggle("hidden", !isMain);
  topBarSettings.classList.toggle("hidden", isMain);
  if (!isMain) {
    if (name === "categoryDetail" && currentCategoryParentId) {
      import("../constants/categories.js").then(({ PARENT_CATEGORIES }) => {
        const p = PARENT_CATEGORIES.find(p => p.id === currentCategoryParentId);
        settingsBarTitle.textContent = p ? `${p.icon} ${p.name}` : "小分類";
      });
    } else {
      settingsBarTitle.textContent = config.title;
    }
  }

  const monthNav       = document.getElementById("topBarMonthNav");
  const homeTitleEl    = document.getElementById("topBarHomeTitle");
  const calShortcutBtn = document.getElementById("calendarShortcutBtn");
  const calBackBtn     = document.getElementById("calendarBackBtn");
  const spacer         = document.getElementById("topBarSpacer");

  if (isMain) {
    const isTransaction = (name === "transaction");
    const isHome        = (name === "home");
    const isCalendar    = (name === "calendar");
    const showNav       = (name === "graph");
    calShortcutBtn.style.display = isTransaction ? "" : "none";
    calBackBtn.style.display     = isCalendar    ? "" : "none";
    monthNav.style.display       = showNav       ? "" : "none";
    homeTitleEl.style.display    = isHome        ? "" : "none";
    spacer.style.display         = !showNav      ? "" : "none";
  }

  document.getElementById("tabBar").classList.toggle("hidden", !config.showTabs);
  openAddBtn.classList.toggle("hidden", !config.showTabs);

  // コールバック経由で各機能の描画を呼ぶ
  if (_onShowView) _onShowView(name);

  applyTabVisibility();
  document.getElementById("homeTab").classList.toggle("active",        name === "home");
  document.getElementById("transactionTab").classList.toggle("active", name === "transaction");
  document.getElementById("graphTab").classList.toggle("active",       name === "graph");
  document.getElementById("accountTab").classList.toggle("active",     name === "account");
}

// ===================================
// タブ表示切り替え
// ===================================
export function applyTabVisibility() {
  const accTab = document.getElementById("accountTab");
  accTab.style.display = tabVisibility.account ? "" : "none";
  const cur = viewStack[viewStack.length - 1];
  if (cur === "account" && !tabVisibility.account) switchToTab("home");
}

// ===================================
// ナビゲーションイベント初期化
// ===================================
export function initNavigationEvents() {
  document.getElementById("backBtn").addEventListener("click", goBack);
  document.getElementById("openSettingsBtn").addEventListener("click", () => navigate("settings"));
  document.getElementById("calendarShortcutBtn").addEventListener("click", () => switchToTab("calendar"));
  document.getElementById("calendarBackBtn").addEventListener("click",    () => switchToTab("transaction"));
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
  document.getElementById("accountTab").addEventListener("click",     () => switchToTab("account"));
}

// ===================================
// 月ナビゲーション
// ===================================
export function updateMonthLabel(monthSelector) {
  const [year, month] = monthSelector.value.split("-").map(Number);
  document.getElementById("monthLabel").textContent = `${year}年${month}月`;
}

export function initMonthNavEvents(monthSelector, onMonthChange) {
  document.getElementById("prevMonthBtn").addEventListener("click", () => changeMonth(-1, "right", monthSelector, onMonthChange));
  document.getElementById("nextMonthBtn").addEventListener("click", () => changeMonth( 1, "left",  monthSelector, onMonthChange));
}

export function changeMonth(delta, direction, monthSelector, onMonthChange) {
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
  let isBackGesture = false, isMonthSwipe = false, decided = false;
  const BACK_EDGE = 40, BACK_THRESHOLD = 80, MONTH_THRESHOLD = 50;

  const pageWrapper = document.getElementById("pageWrapper");
  const backLayer   = document.getElementById("backLayer");
  const backDim     = document.getElementById("backLayerDim");
  const topBar      = document.getElementById("topBar");

  function canGoBack() {
    const cur = viewStack[viewStack.length - 1];
    return viewStack.length > 1 || cur === "calendar";
  }
  function doGoBack() {
    const cur = viewStack[viewStack.length - 1];
    if (viewStack.length > 1) goBack();
    else if (cur === "calendar") switchToTab("transaction");
  }

  function prepareBackLayer() {
    let prevViewEl = null;
    if (viewStack.length >= 2) {
      const prevName = viewStack[viewStack.length - 2];
      prevViewEl = VIEW_CONFIG[prevName]?.el;
    } else if (viewStack[viewStack.length - 1] === "calendar") {
      prevViewEl = VIEW_CONFIG["transaction"]?.el;
    }
    if (prevViewEl) {
      prevViewEl._originalParent = prevViewEl.parentNode;
      prevViewEl._originalNextSibling = prevViewEl.nextSibling;
      backLayer.insertBefore(prevViewEl, backDim);
      prevViewEl.classList.add("back-gesture-prev");
    }
    backDim.style.transition = "none";
    backDim.style.opacity    = "0.35";
    document.body.classList.add("back-gesture-active");
  }

  function cleanupBackLayer() {
    document.body.classList.remove("back-gesture-active");
    const prevEl = backLayer.querySelector(".back-gesture-prev");
    if (prevEl) {
      prevEl.classList.remove("back-gesture-prev");
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
    pageWrapper.style.transition = "";
    pageWrapper.style.transform  = "";
    pageWrapper.style.boxShadow  = "";
    backDim.style.transition     = "";
    backDim.style.opacity        = "";
    topBar.querySelectorAll(".top-bar-normal, .top-bar-settings").forEach(el => {
      el.style.transition = "";
      el.style.transform  = "";
      el.style.opacity    = "";
    });
  }

  document.addEventListener("touchstart", e => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    isBackGesture = false;
    isMonthSwipe  = false;
    decided       = false;
  }, { passive: true });

  document.addEventListener("touchmove", e => {
    if (!addModal.classList.contains("hidden")) return;
    if (!editModal.classList.contains("hidden")) return;
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
      const move     = Math.max(0, dx);
      const progress = Math.min(move / window.innerWidth, 1);
      pageWrapper.style.transition = "none";
      pageWrapper.style.transform  = `translateX(${move}px)`;
      pageWrapper.style.boxShadow  = `-6px 0 16px rgba(0,0,0,${0.15 * (1 - progress)})`;
      backDim.style.transition = "none";
      backDim.style.opacity    = String(0.35 * (1 - progress));
      // TopBar内部要素をスライド量に応じて右にずらしながらフェードアウト
      const shift   = move * 0.25; // pageWrapperの1/4の速さで右にずれる
      const opacity = Math.max(0, 1 - progress * 2);
      topBar.querySelectorAll(".top-bar-normal, .top-bar-settings").forEach(el => {
        el.style.transition = "none";
        el.style.transform  = `translateX(${shift}px)`;
        el.style.opacity    = String(opacity);
      });
    }
  }, { passive: true });

  document.addEventListener("touchend", e => {
    if (!addModal.classList.contains("hidden")) return;
    if (!editModal.classList.contains("hidden")) return;
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const dx = endX - startX;
    const dy = endY - startY;
    if (isBackGesture) {
      if (dx >= BACK_THRESHOLD) {
        const trans = "transform 0.22s cubic-bezier(0.4,0,0.2,1)";
        pageWrapper.style.transition = trans;
        pageWrapper.style.transform  = `translateX(${window.innerWidth}px)`;
        pageWrapper.style.boxShadow  = "none";
        backDim.style.transition     = "opacity 0.22s";
        backDim.style.opacity        = "0";
        topBar.querySelectorAll(".top-bar-normal, .top-bar-settings").forEach(el => {
          el.style.transition = "transform 0.22s cubic-bezier(0.4,0,0.2,1), opacity 0.22s";
          el.style.transform  = `translateX(${window.innerWidth * 0.25}px)`;
          el.style.opacity    = "0";
        });
        setTimeout(() => {
          doGoBack();
          requestAnimationFrame(() => { cleanupBackLayer(); });
        }, 220);
      } else {
        pageWrapper.style.transition = "transform 0.28s cubic-bezier(0.4,0,0.2,1), box-shadow 0.28s";
        pageWrapper.style.transform  = "translateX(0)";
        pageWrapper.style.boxShadow  = "none";
        backDim.style.transition     = "opacity 0.28s";
        backDim.style.opacity        = "0.35";
        topBar.querySelectorAll(".top-bar-normal, .top-bar-settings").forEach(el => {
          el.style.transition = "transform 0.28s cubic-bezier(0.4,0,0.2,1), opacity 0.28s";
          el.style.transform  = "translateX(0)";
          el.style.opacity    = "1";
        });
        setTimeout(() => { cleanupBackLayer(); }, 300);
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
}
