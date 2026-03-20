// ===================================
// 大分類マスターデータ
// ===================================
export const PARENT_CATEGORIES = [
  { id: "food",        name: "食費",         icon: "🍽️",  type: "expense" },
  { id: "daily",       name: "日用品",        icon: "🛒",  type: "expense" },
  { id: "hobby",       name: "趣味・娯楽",    icon: "🎮",  type: "expense" },
  { id: "social",      name: "交際費",        icon: "🥂",  type: "expense" },
  { id: "transport",   name: "交通費",        icon: "🚃",  type: "expense" },
  { id: "fashion",     name: "衣服・美容",    icon: "👗",  type: "expense" },
  { id: "health",      name: "健康・医療",    icon: "💊",  type: "expense" },
  { id: "car",         name: "自動車",        icon: "🚗",  type: "expense" },
  { id: "education",   name: "教養・教育",    icon: "📚",  type: "expense" },
  { id: "special",     name: "特別な支出",    icon: "💸",  type: "expense" },
  { id: "cash",        name: "現金・カード",  icon: "💳",  type: "expense" },
  { id: "utility",     name: "水道・光熱費",  icon: "💡",  type: "expense" },
  { id: "telecom",     name: "通信費",        icon: "📱",  type: "expense" },
  { id: "housing",     name: "住宅",          icon: "🏠",  type: "expense" },
  { id: "tax",         name: "税・社会保障",  icon: "🏛️",  type: "expense" },
  { id: "insurance",   name: "保険",          icon: "🛡️",  type: "expense" },
  { id: "other",       name: "その他",        icon: "📦",  type: "both"    },
  { id: "unclassified",name: "未分類",        icon: "❓",  type: "both"    },
  { id: "income_sal",  name: "給与",          icon: "💰",  type: "income"  },
  { id: "income_other",name: "その他収入",    icon: "💹",  type: "income"  },
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
  income_sal:   ["給与","賞与","残業代","その他給与"],
  income_other: ["副業","投資","ポイント還元","その他収入"],
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
