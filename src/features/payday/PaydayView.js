import { records, paydaySettings, setPaydaySettings } from "../../store.js";
import { showToast } from "../../components/Modal.js";
import { calculatePayday, dayLedger, getNextPayday, isDateString, localDateString } from "./PaydayMath.js";

const yen = value => `${value < 0 ? "-" : ""}¥${Math.abs(Math.round(value)).toLocaleString("ja-JP")}`;
const shortDate = date => `${Number(date.slice(5, 7))}月${Number(date.slice(8))}日`;

export function renderPaydayHome() {
  const result = calculatePayday(paydaySettings, records);
  document.getElementById("paydayHomeEmpty").classList.toggle("hidden", !!result);
  document.getElementById("paydayHomeResult").classList.toggle("hidden", !result);
  document.getElementById("homePaydaySettings").textContent = result ? "設定" : "設定する";
  if (!result) return;
  document.getElementById("paydayHomeDate").textContent = result.days === 0
    ? "今日は給料日" : `${shortDate(result.nextDate)}まで あと${result.days}日`;
  document.getElementById("paydayAvailable").textContent = yen(result.available);
  document.getElementById("paydayDaily").textContent = result.daily === null ? "今日は給料日です" : `1日あたり ${yen(result.daily)}`;
  const status = document.getElementById("paydayHomeStatus");
  status.classList.toggle("is-short", result.shortage > 0);
  status.textContent = result.shortage > 0 ? `予定の支払いに ${yen(result.shortage)} 不足しています` : "残しておくお金・支払い予定を差し引いた目安";
}

export function renderPaydayView() {
  const daySelect = document.getElementById("paydayDay");
  if (!daySelect.options.length) {
    daySelect.add(new Option("選んでください", ""));
    for (let day = 1; day <= 31; day++) daySelect.add(new Option(day === 31 ? "月末" : `${day}日`, day));
  }
  const result = calculatePayday(paydaySettings, records);
  daySelect.value = paydaySettings?.day || "";
  document.getElementById("paydayNextDate").value = paydaySettings?.nextDate >= localDateString() ? paydaySettings.nextDate : "";
  document.getElementById("paydayNextDate").min = localDateString();
  document.getElementById("paydayBalance").value = result ? Math.round(result.currentBalance) : "";
  document.getElementById("paydayProtected").value = paydaySettings?.protectedAmount || "";
  document.getElementById("paydayPlanned").value = paydaySettings?.plannedAmount || "";
  document.getElementById("paydayError").textContent = "";
  document.getElementById("paydaySavedNote").textContent = paydaySettings
    ? `${shortDate(paydaySettings.baselineDate)}に設定した残高に、その後の収支を反映しています。残高を直したい時は、今の金額で保存してください。` : "";
  updatePaydayPreview();
}

function updatePaydayPreview() {
  const nextDate = getNextPayday({
    day: Number(document.getElementById("paydayDay").value),
    nextDate: document.getElementById("paydayNextDate").value,
  });
  document.getElementById("paydayDatePreview").textContent = nextDate ? `次の給料日：${shortDate(nextDate)}` : "給料日を選ぶと次の日付が表示されます";
}

export function initPaydayEvents(onUpdate, onOpenSettings) {
  document.getElementById("homePaydaySettings").addEventListener("click", onOpenSettings);
  document.getElementById("paydayDay").addEventListener("change", updatePaydayPreview);
  document.getElementById("paydayNextDate").addEventListener("change", updatePaydayPreview);
  document.getElementById("paydayForm").addEventListener("submit", event => {
    event.preventDefault();
    const today = localDateString();
    const day = Number(document.getElementById("paydayDay").value);
    const nextDate = document.getElementById("paydayNextDate").value;
    const balanceInput = document.getElementById("paydayBalance").value.trim();
    const balance = Number(balanceInput);
    const protectedAmount = Number(document.getElementById("paydayProtected").value || 0);
    const plannedAmount = Number(document.getElementById("paydayPlanned").value || 0);
    const error = document.getElementById("paydayError");
    if (!Number.isInteger(day) || day < 1 || day > 31) { error.textContent = "給料日を選んでください。"; return; }
    if (nextDate && (!isDateString(nextDate) || nextDate < today)) { error.textContent = "次の給料日には今日以降の日付を選んでください。"; return; }
    if (!balanceInput || ![balance, protectedAmount, plannedAmount].every(Number.isFinite) || protectedAmount < 0 || plannedAmount < 0) {
      error.textContent = "残高を入力し、残しておくお金・支払い予定には0以上の金額を入力してください。";
      return;
    }
    try {
      setPaydaySettings({ day, nextDate, balance, protectedAmount, plannedAmount, baselineDate: today, baselineLedger: dayLedger(records, today) });
      renderPaydayView();
      onUpdate();
      showToast("給料日と残高を保存しました");
    } catch {
      error.textContent = "保存できませんでした。端末の空き容量を確認してください。";
    }
  });
}
