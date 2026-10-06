function normalize(value) {
  return String(value || "").normalize("NFKC").toLowerCase()
    .replace(/[ァ-ヶ]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0x60));
}

export function filterTransactions(records, query) {
  const words = normalize(query).trim().split(/\s+/).filter(Boolean);
  if (!words.length) return records;
  return records.filter(record => {
    const text = normalize(`${record.title || ""} ${record.category || ""}`);
    return words.every(word => text.includes(word));
  });
}

export function initTransactionSearch(onSearch) {
  const input = document.getElementById("txSearchInput");
  const clear = document.getElementById("txSearchClear");
  input.addEventListener("input", onSearch);
  clear.addEventListener("click", () => {
    input.value = "";
    onSearch();
    input.focus();
  });
}
