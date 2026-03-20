/**
 * main.js
 * アプリの起動口。全モジュールを初期化・接続する。
 */

// --- Store ---
import {
  themeColor, periodStartDay,
} from "./store.js";

// --- Utils ---
import { getDefaultMonth } from "./utils/calendar.js";

// --- Components ---
import { initSplash } from "./components/Splash.js";
import { applyThemeColor, renderColorPresets, initThemeEvents } from "./components/Theme.js";
import { initCategorySelectors } from "./components/CategorySelector.js";
import { showToast } from "./components/Modal.js";
import {
  initViewElements,
  initNavigationEvents,
  initMonthNavEvents,
  initSwipeGesture,
  updateMonthLabel,
  showCurrentView,
  setOnShowView,
  navigate,
  switchToTab,
  viewStack,
} from "./components/Navigation.js";
import { initFabEvents, applyFabVisibility } from "./components/FabMenu.js";

// --- Features ---
import { renderHome }                    from "./features/home/HomeView.js";
import { renderTxList }                  from "./features/transactions/TxList.js";
import { openAddModal, initAddModal, openEditModal, initEditModal } from "./features/transactions/TransactionModal.js";
import { renderCalendar }                from "./features/calendar/CalendarView.js";
import { renderGraph, initGraphEvents }  from "./features/graph/GraphView.js";
import { renderAccountView, initAccountEvents } from "./features/account/AccountView.js";
import { renderCategoryView, renderCategoryDetailView } from "./features/settings/CategorySettings.js";
import {
  renderPeriodView, renderVisibilityView, initVisibilityEvents,
  renderBudgetView, renderApiKeyView, initApiKeyEvents,
  renderResetView, initResetEvents,
} from "./features/settings/OtherSettings.js";
import { initScannerEvents } from "./features/scanner/Receipt.js";

// ===================================
// DOMContentLoaded
// ===================================
document.addEventListener("DOMContentLoaded", () => {

  // --- スプラッシュ ---
  initSplash(themeColor);

  // --- テーマ ---
  applyThemeColor(themeColor);
  initThemeEvents();

  // --- ビュー要素の初期化 ---
  initViewElements();

  // --- 月セレクター ---
  const monthSelector = document.getElementById("monthSelector");
  monthSelector.value = getDefaultMonth(periodStartDay);
  updateMonthLabel(monthSelector);

  // ===================================
  // 描画関数をまとめる（showCurrentViewのコールバック用）
  // ===================================
  function renderAll(viewName) {
    if (viewName === "home")           renderHome(monthSelector);
    if (viewName === "transaction")    renderTxList(record => openEditModal(record, refresh));
    if (viewName === "calendar")       renderCalendar(monthSelector, record => openEditModal(record, refresh));
    if (viewName === "category")       renderCategoryView();
    if (viewName === "categoryDetail") renderCategoryDetailView();
    if (viewName === "theme")          renderColorPresets(themeColor);
    if (viewName === "graph")          renderGraph(monthSelector);
    if (viewName === "period")         renderPeriodView(monthSelector);
    if (viewName === "account")        renderAccountView();
    if (viewName === "visibility")     renderVisibilityView();
    if (viewName === "budget")         renderBudgetView(monthSelector);
    if (viewName === "apiKey")         renderApiKeyView();
    if (viewName === "reset")          renderResetView();
  }

  // ビュー切り替え時の描画コールバックを登録
  setOnShowView(renderAll);

  // ===================================
  // 全データ更新（追加・編集・削除後に呼ぶ）
  // ===================================
  function refresh() {
    const cur = viewStack[viewStack.length - 1];
    renderTxList(record => openEditModal(record, refresh));
    renderCalendar(monthSelector, record => openEditModal(record, refresh));
    renderHome(monthSelector);
    if (cur === "graph") renderGraph(monthSelector);
  }

  // ===================================
  // 月変更コールバック
  // ===================================
  function onMonthChange(currentView, _newVal) {
    if (currentView === "graph") renderGraph(monthSelector);
    else {
      renderTxList(record => openEditModal(record, refresh));
      renderCalendar(monthSelector, record => openEditModal(record, refresh));
      renderHome(monthSelector);
    }
  }

  // ===================================
  // イベント初期化
  // ===================================
  initNavigationEvents();
  initMonthNavEvents(monthSelector, onMonthChange);
  initCategorySelectors();

  // 追加モーダル
  initAddModal(refresh);

  // 編集モーダル
  initEditModal(refresh);

  // FAB
  initFabEvents(
    () => openAddModal(null, refresh),
    () => document.getElementById("receiptInput").click()
  );
  applyFabVisibility();

  // スキャナー
  initScannerEvents(refresh);

  // グラフトグル
  initGraphEvents(monthSelector);

  // 口座
  initAccountEvents();

  // 表示設定
  initVisibilityEvents();

  // APIキー
  initApiKeyEvents(applyFabVisibility);

  // リセット
  initResetEvents(refresh);

  // スワイプジェスチャー
  const addModal  = document.getElementById("addModal");
  const editModal = document.getElementById("editModal");
  initSwipeGesture(addModal, editModal, monthSelector, onMonthChange);

  // ===================================
  // 初期表示
  // ===================================
  showCurrentView();

  // ===================================
  // Service Worker登録
  // ===================================
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./service-worker.js").then(reg => {
      reg.addEventListener("updatefound", () => {
        const nw = reg.installing;
        nw.addEventListener("statechange", () => {
          if (nw.state === "activated") window.location.reload();
        });
      });
    });
    navigator.serviceWorker.addEventListener("controllerchange", () => window.location.reload());
  }

}); // DOMContentLoaded end
