/**
 * 개발용 mock 데이터 (Supabase 연결 전까지 사용)
 * 실제 데이터로 전환할 때 lib/data.ts 에서 같은 형태를 반환하도록 구현
 */

export type TxType = "income" | "expense" | "transfer";
export type AccountKind =
  | "cash"
  | "checking"
  | "savings"
  | "credit_card"
  | "debit_card"
  | "pay_app"
  | "loan"
  | "asset";

export interface Category {
  id: string;
  name: string;
  parentId: string | null;
  kind: TxType | "saving" | "debt";
  color?: string;
}

export interface Account {
  id: string;
  name: string;
  type: AccountKind;
  balance: number;
}

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  amount: number;
  type: TxType;
  categoryId: string;
  subcategoryId?: string;
  accountId: string;
  toAccountId?: string;
  memo?: string;
  isFixed?: boolean;
}

export interface Budget {
  categoryId: string;
  year: number;
  month: number;
  amount: number;
}

/* -------------------------------------------------------------- */
/* Assets (이번달 11일 기준 임의 잔액)                              */
/* -------------------------------------------------------------- */

/**
 * 기본 결제수단 4개 + 예시 저축/투자 3개
 * — 실제 가입자는 시드로 받은 4개에서 본인 카드·통장 이름으로 자유롭게 편집
 */
export const MOCK_ACCOUNTS: Account[] = [
  { id: "a-cash",     name: "현금",        type: "cash",        balance: 50_000 },
  { id: "a-checking", name: "입출금 통장",  type: "checking",    balance: 3_500_000 },
  { id: "a-credit",   name: "신용카드",     type: "credit_card", balance: 0 },
  { id: "a-debit",    name: "체크카드",     type: "debit_card",  balance: 0 },
  // 데모용 — 실제로는 사용자가 가입 후 본인 자산을 추가
  { id: "a-savings",  name: "적금",        type: "savings",     balance: 8_000_000 },
  { id: "a-stock",    name: "주식 계좌",    type: "savings",     balance: 5_200_000 },
  { id: "a-pension",  name: "연금",        type: "savings",     balance: 12_000_000 },
];

export interface AssetGroup {
  label: string;
  total: number;
  accounts: Account[];
}

export const ASSET_GROUPS: AssetGroup[] = (() => {
  const cashKinds: AccountKind[] = ["cash", "checking", "debit_card", "pay_app"];
  const savingKinds: AccountKind[] = ["savings", "asset"];
  const debtKinds: AccountKind[] = ["loan"];

  const cash = MOCK_ACCOUNTS.filter((a) => cashKinds.includes(a.type));
  const savings = MOCK_ACCOUNTS.filter((a) => savingKinds.includes(a.type));
  const debts = MOCK_ACCOUNTS.filter((a) => debtKinds.includes(a.type));

  return [
    { label: "현금·예금",  total: sum(cash),    accounts: cash },
    { label: "저축·연금",  total: sum(savings), accounts: savings },
    { label: "대출",       total: sum(debts),   accounts: debts },
  ];
})();

export const TOTAL_ASSETS = ASSET_GROUPS[0].total + ASSET_GROUPS[1].total;
export const TOTAL_DEBT = Math.abs(ASSET_GROUPS[2].total);
export const NET_WORTH = TOTAL_ASSETS - TOTAL_DEBT;

/* -------------------------------------------------------------- */
/* 이번달 (5월) 요약                                                */
/* -------------------------------------------------------------- */

export const MONTH_SUMMARY = {
  year: 2026,
  month: 5,
  income: 3_200_000,
  expense: 1_847_200,
  balance: 3_200_000 - 1_847_200,
};

export const CATEGORY_BREAKDOWN_EXPENSE = [
  { name: "식비",        amount: 628_000, color: "#FF8FA6" },
  { name: "주거비",      amount: 410_000, color: "#6BCFA0" },
  { name: "교통비",      amount: 296_000, color: "#9F8FE0" },
  { name: "취미/여가",   amount: 256_000, color: "#6BB5F0" },
  { name: "기타",        amount: 257_200, color: "#FFC371" },
];

export const PAYMENT_BREAKDOWN = [
  { name: "신용카드",          short: "신",  amount: 1_142_000, color: "#D85A30" },
  { name: "체크카드",          short: "체",  amount: 388_000,   color: "#1D9E75" },
  { name: "카카오·네이버페이", short: "페",  amount: 203_000,   color: "#185FA5" },
  { name: "현금",              short: "현",  amount: 114_200,   color: "#BA7517" },
];

/* -------------------------------------------------------------- */
/* 연간 흐름 (월별 지출)                                            */
/* -------------------------------------------------------------- */

export const YEARLY_TREND = [
  { month: 1,  expense: 1_220_000 },
  { month: 2,  expense: 1_670_000 },
  { month: 3,  expense: 1_460_000 },
  { month: 4,  expense: 2_050_000 },
  { month: 5,  expense: 1_847_200 },
  { month: 6,  expense: 0 },
  { month: 7,  expense: 0 },
  { month: 8,  expense: 0 },
  { month: 9,  expense: 0 },
  { month: 10, expense: 0 },
  { month: 11, expense: 0 },
  { month: 12, expense: 0 },
];

/* -------------------------------------------------------------- */
/* 내역 (이번달 거래 샘플)                                          */
/* -------------------------------------------------------------- */

export interface TxRow {
  id: string;
  date: string;
  amount: number;
  type: TxType;
  category: string;
  subcategory?: string;
  accountName: string;
  toAccountName?: string;
  memo: string;
  isFixed?: boolean;
}

/**
 * 데모용 예시 거래 3건 — 지출/수입/이동 각 1개씩
 * 실 사용 시(Supabase 연결 후)에는 사용자 본인 거래만 보입니다
 */
export const MOCK_TRANSACTIONS: TxRow[] = [
  {
    id: "t-1",
    date: "2026-05-09",
    amount: 3_200_000,
    type: "income",
    category: "월급",
    subcategory: "기본급",
    accountName: "입출금 통장",
    memo: "5월 월급 (예시)",
  },
  {
    id: "t-2",
    date: "2026-05-07",
    amount: 13_000,
    type: "expense",
    category: "식비",
    subcategory: "외식",
    accountName: "신용카드",
    memo: "점심 (예시)",
  },
  {
    id: "t-3",
    date: "2026-05-05",
    amount: 500_000,
    type: "transfer",
    category: "이동",
    accountName: "입출금 통장",
    toAccountName: "적금",
    memo: "5월 저축 (예시)",
  },
];

/* -------------------------------------------------------------- */
/* 카테고리별 예산 (이번달)                                         */
/* -------------------------------------------------------------- */

export interface BudgetRow {
  category: string;
  color: string;
  budget: number;
  spent: number;
}

export const MONTH_BUDGETS: BudgetRow[] = [
  { category: "식비",       color: "#FF8FA6", budget: 700_000, spent: 628_000 },
  { category: "주거비",     color: "#6BCFA0", budget: 500_000, spent: 410_000 },
  { category: "교통비",     color: "#9F8FE0", budget: 200_000, spent:  88_000 },
  { category: "취미/여가",  color: "#6BB5F0", budget: 300_000, spent: 256_000 },
  { category: "꾸밈비",     color: "#FF9FB8", budget: 200_000, spent:  45_000 },
  { category: "자기계발",   color: "#7CCEDB", budget: 100_000, spent:   6_210 },
  { category: "생활비",     color: "#FFC371", budget: 200_000, spent: 153_040 },
];

export const TOTAL_BUDGET = MONTH_BUDGETS.reduce((s, b) => s + b.budget, 0);
export const TOTAL_SPENT = MONTH_BUDGETS.reduce((s, b) => s + b.spent, 0);

/* -------------------------------------------------------------- */
/* 카테고리 (대분류 + 소분류)                                       */
/* -------------------------------------------------------------- */

export interface CategoryGroup {
  name: string;
  color: string;
  sub: string[];
}

// 파스텔 톤 카테고리 컬러 (도넛 차트 등에 사용)
export const EXPENSE_CATEGORIES: CategoryGroup[] = [
  { name: "식비",       color: "#FF8FA6", sub: ["식자재", "외식", "배달", "카페", "편의점", "기타"] },
  { name: "주거비",     color: "#6BCFA0", sub: ["관리비", "가스비", "전기세", "수도세", "기타"] },
  { name: "생활비",     color: "#FFC371", sub: ["생활필수품", "가전/가구", "핸드폰", "인터넷", "기타"] },
  { name: "교통비",     color: "#9F8FE0", sub: ["대중교통", "택시"] },
  { name: "취미/여가",  color: "#6BB5F0", sub: ["문화/공연", "구독", "취미", "기타"] },
  { name: "꾸밈비",     color: "#FF9FB8", sub: ["뷰티/화장품", "의류/잡화", "미용/헤어"] },
  { name: "의료/건강",  color: "#88D67E", sub: ["병원", "약·영양제", "운동"] },
  { name: "자기계발",   color: "#7CCEDB", sub: ["독서/구독", "스터디/모임", "강의수강"] },
  { name: "경조사",     color: "#FFA89E", sub: ["경조사", "기부"] },
  { name: "여행",       color: "#95DACA", sub: ["식사", "숙박", "이동수단", "입장료", "관광", "기념품"] },
  { name: "사회생활",   color: "#FFB877", sub: ["식사", "커피/다과", "모임비"] },
  { name: "금융비용",   color: "#A9A4C2", sub: ["이자비용", "세금", "과태료"] },
  { name: "기타",       color: "#C7C2B8", sub: ["기타"] },
];

export const INCOME_CATEGORIES: CategoryGroup[] = [
  { name: "월급",       color: "#1D9E75", sub: ["기본급", "상여"] },
  { name: "부수입",     color: "#BA7517", sub: ["프리랜스", "환급", "선물", "기타"] },
  { name: "이자",       color: "#185FA5", sub: ["예금이자", "투자수익"] },
  { name: "기타",       color: "#888780", sub: ["기타"] },
];

/* 자주 쓰는 결제수단 (입력 화면 초기 노출) — 실제로는 사용 빈도에 따라 정렬 */
export const FAVORITE_ACCOUNT_IDS = [
  "a-credit",
  "a-checking",
  "a-debit",
  "a-cash",
];

/* -------------------------------------------------------------- */
/* 헬퍼                                                            */
/* -------------------------------------------------------------- */

function sum(arr: Account[]): number {
  return arr.reduce((s, a) => s + a.balance, 0);
}
