import { reloadStoreFromStorage } from "../../store.js";
import { showToast } from "../../components/Modal.js";
import { createBackup, parseBackup, restoreBackup, undoRestore, hasRestoreUndo } from "./BackupData.js";

let pendingBackup = null;
let selectionId = 0;

function setStatus(message, error = false) {
  const status = document.getElementById("backupStatus");
  status.textContent = message;
  status.classList.toggle("is-error", error);
}

function resetPreview() {
  pendingBackup = null;
  document.getElementById("backupRestorePreview").classList.add("hidden");
  document.getElementById("restoreBackupBtn").disabled = true;
}

export function renderBackupView() {
  resetPreview();
  selectionId++;
  document.getElementById("backupFileInput").value = "";
  document.getElementById("undoRestoreBtn").classList.toggle("hidden", !hasRestoreUndo());
  setStatus("");
}

function backupFile() {
  const now = new Date();
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;
  return new File([JSON.stringify(createBackup(localStorage, now), null, 2)], `kakeibo_backup_${stamp}.json`, { type: "application/json" });
}

function downloadFile(file) {
  const url = URL.createObjectURL(file);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = file.name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
  setStatus("バックアップの保存を開始しました。");
}

export function initBackupEvents(onRestore) {
  document.getElementById("downloadBackupBtn").addEventListener("click", () => {
    try { downloadFile(backupFile()); } catch (err) { setStatus(err.message, true); }
  });
  document.getElementById("shareBackupBtn").addEventListener("click", async () => {
    try {
      const file = backupFile();
      if (navigator.canShare?.({ files: [file] }) && navigator.share) {
        await navigator.share({ files: [file], title: "家計簿のバックアップ" });
        setStatus("共有を完了しました。");
      } else downloadFile(file);
    } catch (err) {
      if (err.name !== "AbortError") setStatus("共有できませんでした。「バックアップを保存」をお使いください。", true);
    }
  });
  document.getElementById("backupFileInput").addEventListener("change", async event => {
    resetPreview();
    setStatus("");
    const file = event.target.files?.[0];
    const selected = ++selectionId;
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) { setStatus("20MB以下のバックアップファイルを選んでください。", true); return; }
    try {
      const backup = parseBackup(await file.text());
      if (selected !== selectionId) return;
      pendingBackup = backup;
      const { data } = backup;
      document.getElementById("backupPreviewName").textContent = file.name;
      document.getElementById("backupPreviewDate").textContent = `保存日時：${new Date(backup.exportedAt).toLocaleString("ja-JP")}`;
      document.getElementById("backupPreviewCounts").textContent = `収支 ${data.records.length}件・口座 ${data.accounts.length}件・給与明細 ${data.payrollSlips.length}件`;
      document.getElementById("backupRestorePreview").classList.remove("hidden");
      document.getElementById("restoreBackupBtn").disabled = false;
    } catch (err) { if (selected === selectionId) setStatus(err.message || "ファイルを読み込めませんでした。", true); }
  });
  document.getElementById("restoreBackupBtn").addEventListener("click", () => {
    if (!pendingBackup) return;
    try {
      restoreBackup(pendingBackup);
      reloadStoreFromStorage();
      renderBackupView();
      onRestore();
      setStatus("バックアップを復元しました。");
      showToast("バックアップを復元しました");
    } catch (err) { setStatus(err.message, true); }
  });
  document.getElementById("undoRestoreBtn").addEventListener("click", () => {
    try {
      undoRestore();
      reloadStoreFromStorage();
      renderBackupView();
      onRestore();
      setStatus("復元前のデータに戻しました。");
      showToast("復元前のデータに戻しました");
    } catch (err) { setStatus(err.message, true); }
  });
}
