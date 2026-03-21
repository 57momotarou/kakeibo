// ===================================
// 大分類マスターデータ
// color: 円形背景の色
// ===================================
export const PARENT_CATEGORIES = [
  { id: "food",        name: "食費",        icon: "🍴",  type: "expense", color: "#e05c5c" },
  { id: "daily",       name: "日用品",       icon: "🪥",  type: "expense", color: "#4caf7d" },
  { id: "hobby",       name: "趣味・娯楽",   icon: "⭐",  type: "expense", color: "#e05ca0" },
  { id: "social",      name: "交際費",       icon: "👥",  type: "expense", color: "#5b8ed6" },
  { id: "transport",   name: "交通費",       icon: "🚃",  type: "expense", color: "#7b6ec6" },
  { id: "fashion",     name: "衣服・美容",   icon: "👕",  type: "expense", color: "#e8a030" },
  { id: "health",      name: "健康・医療",   icon: "➕",  type: "expense", color: "#e06840" },
  { id: "car",         name: "自動車",       icon: "🚗",  type: "expense", color: "#888888" },
  { id: "education",   name: "教養・教育",   icon: "📖",  type: "expense", color: "#5b8ed6" },
  { id: "special",     name: "特別な支出",   icon: "❗",  type: "expense", color: "#4caf7d" },
  { id: "cash",        name: "現金・カード", icon: "🎞️", type: "expense", color: "#c87d3a" },
  { id: "utility",     name: "水道・光熱費", icon: "🚿",  type: "expense", color: "#40aacc" },
  { id: "telecom",     name: "通信費",       icon: "📡",  type: "expense", color: "#8860c0" },
  { id: "housing",     name: "住宅",         icon: "🏠",  type: "expense", color: "#4caf7d" },
  { id: "tax",         name: "税・社会保障", icon: "¥",   type: "expense", color: "#c8b040" },
  { id: "insurance",   name: "保険",         icon: "➕",  type: "expense", color: "#e05ca0" },
  { id: "other",       name: "その他",       icon: "···", type: "both",    color: "#888888" },
  { id: "unclassified",name: "未分類",       icon: "?",   type: "both",    color: null },
  // 収入（給与・その他収入を統合）
  { id: "income",      name: "収入",         icon: "¥",   type: "income",  color: "#40aacc" },
];

// ===================================
// デフォルト小分類
// ===================================
export const DEFAULT_CHILD_CATEGORIES = {
  food:         ["食費","食料品","外食","朝ご飯","昼ご飯","夜ご飯","カフェ","その他食費"],
  daily:        ["日用品","ドラッグストア","おこづかい","ペット用品","その他日用品"],
  hobby:        ["映画","音楽","ゲーム","本","旅行","秘密の趣味","その他趣味・娯楽"],
  social:       ["交際費","飲み会","プレゼント代","冠婚葬祭","その他交際費"],
  transport:    ["交通費","電車","バス","タクシー","飛行機","その他交通費"],
  fashion:      ["衣服","クリーニング","美容院・理髪","化粧品","アクセサリー","その他衣服・美容"],
  health:       ["フィットネス","ボディケア","医療費","薬","その他健康・医療"],
  car:          ["自動車ローン","ガソリン","駐車場","車両","車検・整備","自動車保険","その他自動車"],
  education:    ["書籍","新聞・雑誌","習いごと","学費","塾","その他教養・教育"],
  special:      ["家具・家電","住宅・リフォーム","その他特別な支出"],
  cash:         ["ATM引き落とし","カード引き落とし","電子マネー","使途不明金","その他現金・カード"],
  utility:      ["光熱費","電気代","ガス・灯油代","水道代","その他水道・光熱費"],
  telecom:      ["携帯電話","固定電話","インターネット","情報サービス","宅配便・運送","その他通信費"],
  housing:      ["住宅","家賃","ローン返済","管理費・積立金","地震・火災保険","その他住宅"],
  tax:          ["所得税・住民税","年金保険料","健康保険","その他税・社会保障"],
  insurance:    ["生命保険","医療保険","その他保険"],
  other:        ["仕送り","事業経費","事業原価","事業投資","寄付金","雑費"],
  unclassified: [],
  // 収入（統合）
  income:       ["給与","一時所得","事業・副業","年金","配当所得","不動産所得","不明な入金","その他入金"],
  // 旧キーとの互換性（既存データが壊れないよう残す）
  income_sal:   [],
  income_other: [],
};

// ===================================
// テーマカラープリセット
// ===================================
export const PRESET_COLORS = [
  { label: "グリーン",   color: "#4caf50" },
  { label: "ブルー",     color: "#2196f3" },
  { label: "パープル",   color: "#9c27b0" },
  { label: "オレンジ",   color: "#ff9800" },
  { label: "レッド",     color: "#f44336" },
  { label: "ティール",   color: "#009688" },
  { label: "インディゴ", color: "#3f51b5" },
  { label: "ブラウン",   color: "#795548" },
];

// ===================================
// グラフ用カラーパレット
// ===================================
export const CHART_COLORS = [
  "#4caf50","#2196f3","#ff9800","#e91e63","#9c27b0",
  "#00bcd4","#ff5722","#607d8b","#795548","#8bc34a",
];
