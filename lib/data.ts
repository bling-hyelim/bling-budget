/**
 * 데이터 레이어
 * - Supabase 가 설정되어 있고 로그인된 상태 → 실 DB
 * - 그렇지 않으면 mock 데이터
 *
 * 모든 페이지는 mockData 를 직접 import 하지 않고 이 파일을 사용
 */

import "server-only";
import { createClient } from "@/lib/supabase/server";
import * as mock from "@/lib/mockData";
import { getAccountRole as _getAccountRole, type AccountRole } from "@/lib/accountRole";

export { type AccountRole };
export const getAccountRole = _getAccountRole;

/* ---------------- 타입 ---------------- */

export type TxType = "income" | "expense" | "transfer";

/**
 * 거래의 표시 분류
 * - 저장 시: type 은 항상 income/expense/transfer 중 하나
 * - 표시 시: transfer 중 to_account 가 저축·투자 계좌이면 'savings' 로 분류
 */
export type TxKind = "income" | "expense" | "transfer" | "savings";

export interface CategoryRow {
  id: string;
  name: string;
  kind: string;
  color: string | null;
  parent_id: string | null;
  sort_order: number;
}

export interface CategoryTreeNode extends CategoryRow {
  children: CategoryRow[];
}

export interface AccountRow {
  id: string;
  name: string;
  type: string;
  role: AccountRole;
  initial_balance: number;
  balance: number; // 시작 잔액 + 거래 누적
  color: string | null;
  sort_order: number;
}

export interface TransactionRow {
  id: string;
  occurred_on: string;
  amount: number;
  type: TxType;
  /** 표시 분류 (transfer→savings 변환 포함) */
  kind: TxKind;
  category_name: string | null;
  subcategory_name: string | null;
  account_name: string;
  to_account_name: string | null;
  to_account_role: AccountRole | null;
  memo: string | null;
  is_fixed: boolean;
}

export interface MonthSummary {
  income: number;
  expense: number;
  /** 저축 총액 (transfer→savings) */
  savings: number;
  balance: number;
  /** 지출 카테고리 (큰 순) */
  expenseCategories: { name: string; color: string; amount: number }[];
  /** 수입 카테고리 (큰 순) */
  incomeCategories: { name: string; color: string; amount: number }[];
  /** 저축 — destination account 별 */
  savingsCategories: { name: string; color: string; amount: number }[];
  /** 지출수단별 */
  expensePayments: { name: string; type: string; amount: number; pct: number }[];
  /** 수입수단별 */
  incomePayments: { name: string; type: string; amount: number; pct: number }[];
}

export interface AssetGroupDetail {
  label: "입출금" | "지출수단" | "저축·투자" | "대출";
  role: AccountRole;
  total: number;
  /** 자산 합산에 들어가는 부호 (대출만 -1, 나머지 +1) */
  sign: 1 | -1;
  accounts: AccountRow[];
}

export interface AssetSummary {
  netWorth: number;
  groups: AssetGroupDetail[];
}

export interface BudgetWithProgress {
  category_id: string;
  category_name: string;
  color: string;
  budget: number;
  spent: number;
  pct: number;
}

/* ---------------- 공통 헬퍼 ---------------- */

const PAYMENT_LABELS: Record<string, string> = {
  cash: "현금",
  checking: "입출금",
  pay_app: "페이",
  credit_card: "신용카드",
  debit_card: "체크카드",
  savings: "저축",
  asset: "자산",
  loan: "대출",
  other: "기타",
};

function isConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

async function getUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/* ---------------- 카테고리 ---------------- */

export async function getCategoryTree(): Promise<CategoryTreeNode[]> {
  if (isConfigured()) {
    const user = await getUser();
    if (user) {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_archived", false)
        .order("sort_order");
      if (!error && data) {
        return assembleTree(data as CategoryRow[]);
      }
    }
  }
  // mock fallback
  return assembleTree(mockCategoriesFlat());
}

function assembleTree(flat: CategoryRow[]): CategoryTreeNode[] {
  const parents = flat.filter((c) => !c.parent_id);
  const childrenByParent = new Map<string, CategoryRow[]>();
  for (const c of flat) {
    if (c.parent_id) {
      const list = childrenByParent.get(c.parent_id) ?? [];
      list.push(c);
      childrenByParent.set(c.parent_id, list);
    }
  }
  return parents.map((p) => ({
    ...p,
    children: (childrenByParent.get(p.id) ?? []).sort(
      (a, b) => a.sort_order - b.sort_order
    ),
  }));
}

function mockCategoriesFlat(): CategoryRow[] {
  const all: CategoryRow[] = [];
  let order = 0;
  const push = (
    name: string,
    kind: string,
    color: string,
    subs: string[]
  ): string => {
    const id = `mock-${name}`;
    all.push({
      id,
      name,
      kind,
      color,
      parent_id: null,
      sort_order: order++,
    });
    subs.forEach((s, i) => {
      all.push({
        id: `${id}-${s}`,
        name: s,
        kind,
        color,
        parent_id: id,
        sort_order: i,
      });
    });
    return id;
  };

  push("수입", "income", "#1D9E75", ["월급", "부수입", "이자", "기타"]);
  for (const g of mock.EXPENSE_CATEGORIES) {
    push(g.name, "expense", g.color, g.sub);
  }
  push("이동", "transfer", "#888780", []);
  return all;
}

/* ---------------- 계좌 ---------------- */

export async function getAccounts(): Promise<AccountRow[]> {
  if (isConfigured()) {
    const user = await getUser();
    if (user) {
      const supabase = createClient();
      const [accountsRes, txRes] = await Promise.all([
        supabase
          .from("accounts")
          .select("*")
          .eq("user_id", user.id)
          .eq("is_archived", false)
          .order("sort_order"),
        supabase
          .from("transactions")
          .select("account_id, to_account_id, amount, type")
          .eq("user_id", user.id),
      ]);
      if (!accountsRes.error && accountsRes.data) {
        // 거래 누적분 계산
        const delta = new Map<string, number>();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const t of (txRes.data ?? []) as any[]) {
          const amt = Number(t.amount);
          if (t.type === "income") {
            delta.set(t.account_id, (delta.get(t.account_id) ?? 0) + amt);
          } else if (t.type === "expense") {
            delta.set(t.account_id, (delta.get(t.account_id) ?? 0) - amt);
          } else if (t.type === "transfer") {
            delta.set(t.account_id, (delta.get(t.account_id) ?? 0) - amt);
            if (t.to_account_id) {
              delta.set(t.to_account_id, (delta.get(t.to_account_id) ?? 0) + amt);
            }
          }
        }
        return accountsRes.data.map((a) => {
          const init = Number(a.initial_balance ?? 0);
          return {
            id: a.id,
            name: a.name,
            type: a.type,
            role: getAccountRole(a.type),
            initial_balance: init,
            balance: init + (delta.get(a.id) ?? 0),
            color: a.color ?? null,
            sort_order: a.sort_order ?? 0,
          };
        });
      }
    }
  }
  return mock.MOCK_ACCOUNTS.map((a, i) => ({
    id: a.id,
    name: a.name,
    type: a.type,
    role: getAccountRole(a.type),
    initial_balance: a.balance,
    balance: a.balance,
    color: null,
    sort_order: i,
  }));
}

/* ---------------- 거래 ---------------- */

export async function getTransactionsByMonth(
  year: number,
  month: number
): Promise<TransactionRow[]> {
  if (isConfigured()) {
    const user = await getUser();
    if (user) {
      const supabase = createClient();
      const start = isoDate(year, month, 1);
      const end = isoDate(year, month + 1, 1);
      const { data, error } = await supabase
        .from("transactions")
        .select(
          `id, occurred_on, amount, type, memo, is_fixed,
           category:categories!transactions_category_id_fkey(name),
           subcategory:categories!transactions_subcategory_id_fkey(name),
           account:accounts!transactions_account_id_fkey(name),
           to_account:accounts!transactions_to_account_id_fkey(name, type)`
        )
        .eq("user_id", user.id)
        .gte("occurred_on", start)
        .lt("occurred_on", end)
        .order("occurred_on", { ascending: false });
      if (!error && data) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (data as any[]).map((r) => {
          const toRole: AccountRole | null = r.to_account?.type
            ? getAccountRole(r.to_account.type)
            : null;
          const type = r.type as TxType;
          const kind: TxKind =
            type === "transfer" && toRole === "savings" ? "savings" : type;
          return {
            id: r.id,
            occurred_on: r.occurred_on,
            amount: Number(r.amount),
            type,
            kind,
            category_name: r.category?.name ?? null,
            subcategory_name: r.subcategory?.name ?? null,
            account_name: r.account?.name ?? "",
            to_account_name: r.to_account?.name ?? null,
            to_account_role: toRole,
            memo: r.memo,
            is_fixed: r.is_fixed,
          };
        });
      }
    }
  }
  // mock — 월 필터링 (계좌 type 정보 동기 조회)
  const accountTypeByName = new Map<string, string>(
    mock.MOCK_ACCOUNTS.map((a) => [a.name, a.type])
  );
  return mock.MOCK_TRANSACTIONS.filter((t) => {
    const [y, m] = t.date.split("-").map(Number);
    return y === year && m === month;
  }).map((t) => {
    const toType = t.toAccountName ? accountTypeByName.get(t.toAccountName) : undefined;
    const toRole: AccountRole | null = toType ? getAccountRole(toType) : null;
    const kind: TxKind =
      t.type === "transfer" && toRole === "savings" ? "savings" : t.type;
    return {
      id: t.id,
      occurred_on: t.date,
      amount: t.amount,
      type: t.type,
      kind,
      category_name: t.category,
      subcategory_name: t.subcategory ?? null,
      account_name: t.accountName,
      to_account_name: t.toAccountName ?? null,
      to_account_role: toRole,
      memo: t.memo,
      is_fixed: !!t.isFixed,
    };
  });
}

export interface RawTransaction {
  id: string;
  occurred_on: string;
  amount: number;
  type: TxType;
  category_id: string | null;
  subcategory_id: string | null;
  account_id: string;
  to_account_id: string | null;
  memo: string | null;
  is_fixed: boolean;
}

export async function getTransaction(id: string): Promise<RawTransaction | null> {
  if (isConfigured()) {
    const user = await getUser();
    if (user) {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("transactions")
        .select(
          "id, occurred_on, amount, type, category_id, subcategory_id, account_id, to_account_id, memo, is_fixed"
        )
        .eq("id", id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!error && data) {
        return {
          id: data.id,
          occurred_on: data.occurred_on,
          amount: Number(data.amount),
          type: data.type as TxType,
          category_id: data.category_id,
          subcategory_id: data.subcategory_id,
          account_id: data.account_id,
          to_account_id: data.to_account_id,
          memo: data.memo,
          is_fixed: data.is_fixed,
        };
      }
    }
  }
  // mock fallback: lookup in MOCK_TRANSACTIONS, resolve IDs
  const t = mock.MOCK_TRANSACTIONS.find((m) => m.id === id);
  if (!t) return null;
  const tree = await getCategoryTree();
  const parent = tree.find((c) => c.name === t.category);
  const sub = parent?.children.find((c) => c.name === t.subcategory);
  const accounts = await getAccounts();
  const acc = accounts.find((a) => a.name === t.accountName);
  return {
    id: t.id,
    occurred_on: t.date,
    amount: t.amount,
    type: t.type,
    category_id: parent?.id ?? null,
    subcategory_id: sub?.id ?? null,
    account_id: acc?.id ?? "",
    to_account_id: null,
    memo: t.memo,
    is_fixed: !!t.isFixed,
  };
}

/* ---------------- 월별 요약 ---------------- */

export async function getMonthSummary(
  year: number,
  month: number
): Promise<MonthSummary> {
  const txs = await getTransactionsByMonth(year, month);
  const accounts = await getAccounts();
  const accountByName = new Map(accounts.map((a) => [a.name, a.type]));

  const income = sum(txs.filter((t) => t.kind === "income").map((t) => t.amount));
  const expense = sum(txs.filter((t) => t.kind === "expense").map((t) => t.amount));
  const savings = sum(txs.filter((t) => t.kind === "savings").map((t) => t.amount));

  // 카테고리별 지출
  const expMap = new Map<string, { color: string; amount: number }>();
  for (const t of txs) {
    if (t.kind !== "expense" || !t.category_name) continue;
    const prev = expMap.get(t.category_name);
    expMap.set(t.category_name, {
      color: colorForCategory(t.category_name),
      amount: (prev?.amount ?? 0) + t.amount,
    });
  }
  const expenseCategories = [...expMap.entries()]
    .map(([name, v]) => ({ name, color: v.color, amount: v.amount }))
    .sort((a, b) => b.amount - a.amount);

  // 카테고리별 수입 — 수입은 대분류가 1개라 의미 없으니 소분류 기준으로 노출
  const incMap = new Map<string, number>();
  for (const t of txs) {
    if (t.kind !== "income") continue;
    const name = t.subcategory_name ?? t.category_name;
    if (!name) continue;
    incMap.set(name, (incMap.get(name) ?? 0) + t.amount);
  }
  const incomeCategories = [...incMap.entries()]
    .map(([name, amount]) => ({
      name,
      color: colorForIncomeSub(name),
      amount,
    }))
    .sort((a, b) => b.amount - a.amount);

  // 저축 — destination account 별
  const SAVINGS_PALETTE = ["#7CCEDB", "#88D67E", "#A9A4C2", "#FFC371", "#9F8FE0"];
  const savMap = new Map<string, number>();
  for (const t of txs) {
    if (t.kind !== "savings" || !t.to_account_name) continue;
    savMap.set(t.to_account_name, (savMap.get(t.to_account_name) ?? 0) + t.amount);
  }
  const savingsCategories = [...savMap.entries()]
    .map(([name, amount], i) => ({
      name,
      color: SAVINGS_PALETTE[i % SAVINGS_PALETTE.length],
      amount,
    }))
    .sort((a, b) => b.amount - a.amount);

  // 결제수단별 (계좌 type 기준 묶기) — 지출/수입 각각
  const expPayMap = new Map<string, { type: string; amount: number }>();
  const incPayMap = new Map<string, { type: string; amount: number }>();
  for (const t of txs) {
    if (t.kind !== "expense" && t.kind !== "income") continue;
    const type = accountByName.get(t.account_name) ?? "other";
    const label = paymentLabel(type);
    const map = t.kind === "expense" ? expPayMap : incPayMap;
    const prev = map.get(label);
    map.set(label, { type, amount: (prev?.amount ?? 0) + t.amount });
  }
  const buildPayments = (map: Map<string, { type: string; amount: number }>) => {
    const total = sum([...map.values()].map((v) => v.amount));
    return [...map.entries()]
      .map(([name, v]) => ({
        name,
        type: v.type,
        amount: v.amount,
        pct: total > 0 ? Math.round((v.amount / total) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  };

  return {
    income,
    expense,
    savings,
    balance: income - expense,
    expenseCategories,
    incomeCategories,
    savingsCategories,
    expensePayments: buildPayments(expPayMap),
    incomePayments: buildPayments(incPayMap),
  };
}

function paymentLabel(type: string): string {
  if (type === "pay_app") return "카카오·네이버페이";
  return PAYMENT_LABELS[type] ?? "기타";
}

function colorForCategory(name: string): string {
  const found = mock.EXPENSE_CATEGORIES.find((c) => c.name === name);
  if (found) return found.color;
  return "#888780";
}

const INCOME_SUB_BUILTIN: Record<string, string> = {
  월급:   "#2281E7",
  부수입: "#6BB5F0",
  이자:   "#185FA5",
  기타:   "#88D67E",
};
const INCOME_SUB_FALLBACK = ["#7CCEDB", "#A9A4C2", "#FFC371", "#9F8FE0", "#FFA89E"];

function colorForIncomeSub(name: string): string {
  if (INCOME_SUB_BUILTIN[name]) return INCOME_SUB_BUILTIN[name];
  // 이름 hash 기반 안정적 배색
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return INCOME_SUB_FALLBACK[h % INCOME_SUB_FALLBACK.length];
}

/* ---------------- 자산 요약 ---------------- */

export async function getAssetSummary(): Promise<AssetSummary> {
  const accounts = await getAccounts();

  const checking = accounts.filter((a) => a.role === "checking");
  const spending = accounts.filter((a) => a.role === "spending");
  const savings = accounts.filter((a) => a.role === "savings");
  const debts = accounts.filter((a) => a.role === "debt");

  const checkingTotal = sum(checking.map((a) => a.balance));
  const spendingTotal = sum(spending.map((a) => a.balance));
  const savingTotal = sum(savings.map((a) => a.balance));
  // 대출 잔액(= 갚을 금액)은 항상 음수로 반환 — netWorth 계산과 표시 모두 일관되게.
  const debtTotal = -sum(debts.map((a) => Math.abs(a.balance)));

  const netWorth = checkingTotal + spendingTotal + savingTotal + debtTotal;

  return {
    netWorth,
    groups: [
      { label: "입출금",     role: "checking", total: checkingTotal, sign: 1,  accounts: checking },
      { label: "지출수단",   role: "spending", total: spendingTotal, sign: 1,  accounts: spending },
      { label: "저축·투자",  role: "savings",  total: savingTotal,   sign: 1,  accounts: savings },
      { label: "대출",       role: "debt",     total: debtTotal,     sign: -1, accounts: debts },
    ],
  };
}

/* ---------------- 예산 ---------------- */

export async function getBudgetsByMonth(
  year: number,
  month: number
): Promise<BudgetWithProgress[]> {
  if (isConfigured()) {
    const user = await getUser();
    if (user) {
      const supabase = createClient();
      const { data: budgets } = await supabase
        .from("budgets")
        .select(
          `amount, category_id,
           category:categories!budgets_category_id_fkey(name, color)`
        )
        .eq("user_id", user.id)
        .eq("year", year)
        .eq("month", month);

      const txs = await getTransactionsByMonth(year, month);
      const spentByCat = new Map<string, number>();
      for (const t of txs) {
        if (t.type !== "expense" || !t.category_name) continue;
        spentByCat.set(
          t.category_name,
          (spentByCat.get(t.category_name) ?? 0) + t.amount
        );
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return ((budgets ?? []) as any[]).map((b) => ({
        category_id: b.category_id,
        category_name: b.category?.name ?? "",
        color: b.category?.color ?? "#888780",
        budget: Number(b.amount),
        spent: spentByCat.get(b.category?.name ?? "") ?? 0,
        pct: Math.round(
          ((spentByCat.get(b.category?.name ?? "") ?? 0) / Number(b.amount)) *
            100
        ),
      }));
    }
  }
  return mock.MONTH_BUDGETS.map((b) => ({
    category_id: `mock-${b.category}`,
    category_name: b.category,
    color: b.color,
    budget: b.budget,
    spent: b.spent,
    pct: Math.round((b.spent / b.budget) * 100),
  }));
}

/* ---------------- 연간 요약 (연말정산용) ---------------- */

export interface YearlySummary {
  year: number;
  totalIncome: number;
  totalExpense: number;
  paymentTotals: { type: string; label: string; total: number }[];
  incomeCategories: { name: string; color: string; amount: number }[];
  expenseCategories: { name: string; color: string; amount: number }[];
  byMonth: { month: number; income: number; expense: number }[];
}

export async function getYearlySummary(year: number): Promise<YearlySummary> {
  const accounts = await getAccounts();
  const typeByName = new Map(accounts.map((a) => [a.name, a.type]));

  // 12 개월 모든 거래 모으기
  const monthly: { month: number; income: number; expense: number }[] = [];
  const allTxs: TransactionRow[] = [];
  for (let m = 1; m <= 12; m++) {
    const txs = await getTransactionsByMonth(year, m);
    allTxs.push(...txs);
    monthly.push({
      month: m,
      income: sum(txs.filter((t) => t.type === "income").map((t) => t.amount)),
      expense: sum(txs.filter((t) => t.type === "expense").map((t) => t.amount)),
    });
  }

  const totalIncome = sum(monthly.map((m) => m.income));
  const totalExpense = sum(monthly.map((m) => m.expense));

  // 결제수단별 (지출 거래만)
  const payMap = new Map<string, number>();
  for (const t of allTxs) {
    if (t.type !== "expense") continue;
    const type = typeByName.get(t.account_name) ?? "other";
    payMap.set(type, (payMap.get(type) ?? 0) + t.amount);
  }
  const paymentTotals = [...payMap.entries()]
    .map(([type, total]) => ({ type, label: paymentLabel(type), total }))
    .sort((a, b) => b.total - a.total);

  // 카테고리별 (수입 / 지출)
  const incMap = new Map<string, { color: string; amount: number }>();
  const expMap = new Map<string, { color: string; amount: number }>();
  for (const t of allTxs) {
    if (!t.category_name) continue;
    const color = colorForCategory(t.category_name);
    if (t.type === "income") {
      const prev = incMap.get(t.category_name);
      incMap.set(t.category_name, {
        color: prev?.color ?? "#1D9E75",
        amount: (prev?.amount ?? 0) + t.amount,
      });
    } else if (t.type === "expense") {
      const prev = expMap.get(t.category_name);
      expMap.set(t.category_name, {
        color,
        amount: (prev?.amount ?? 0) + t.amount,
      });
    }
  }

  const incomeCategories = [...incMap.entries()]
    .map(([name, v]) => ({ name, color: v.color, amount: v.amount }))
    .sort((a, b) => b.amount - a.amount);
  const expenseCategories = [...expMap.entries()]
    .map(([name, v]) => ({ name, color: v.color, amount: v.amount }))
    .sort((a, b) => b.amount - a.amount);

  return {
    year,
    totalIncome,
    totalExpense,
    paymentTotals,
    incomeCategories,
    expenseCategories,
    byMonth: monthly,
  };
}

/* ---------------- 월간 인사이트 리포트 ---------------- */

export interface MonthlyInsights {
  year: number;
  month: number;
  totalIncome: number;
  totalExpense: number;
  balance: number;
  txCount: number;
  topCategory: { name: string; amount: number; pct: number } | null;
  topDay: { date: string; amount: number; count: number } | null;
  fixedAmount: number;
  variableAmount: number;
  prevMonthExpense: number;
  expenseDelta: number | null; // % change vs prev month
  creditCardPct: number;
  weekdayExpense: number;
  weekendExpense: number;
}

export async function getMonthlyInsights(
  year: number,
  month: number
): Promise<MonthlyInsights> {
  const [txs, prevTxs, accounts] = await Promise.all([
    getTransactionsByMonth(year, month),
    getTransactionsByMonth(
      month === 1 ? year - 1 : year,
      month === 1 ? 12 : month - 1
    ),
    getAccounts(),
  ]);
  const typeByName = new Map(accounts.map((a) => [a.name, a.type]));

  const expense = txs.filter((t) => t.type === "expense");
  const income = txs.filter((t) => t.type === "income");
  const totalExpense = sum(expense.map((t) => t.amount));
  const totalIncome = sum(income.map((t) => t.amount));
  const prevMonthExpense = sum(
    prevTxs.filter((t) => t.type === "expense").map((t) => t.amount)
  );

  // 1위 카테고리
  const catMap = new Map<string, number>();
  for (const t of expense) {
    if (!t.category_name) continue;
    catMap.set(t.category_name, (catMap.get(t.category_name) ?? 0) + t.amount);
  }
  let topCategory: MonthlyInsights["topCategory"] = null;
  for (const [name, amount] of catMap) {
    if (!topCategory || amount > topCategory.amount) {
      topCategory = {
        name,
        amount,
        pct: totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0,
      };
    }
  }

  // 가장 많이 쓴 날
  const dayMap = new Map<string, { amount: number; count: number }>();
  for (const t of expense) {
    const prev = dayMap.get(t.occurred_on);
    dayMap.set(t.occurred_on, {
      amount: (prev?.amount ?? 0) + t.amount,
      count: (prev?.count ?? 0) + 1,
    });
  }
  let topDay: MonthlyInsights["topDay"] = null;
  for (const [date, v] of dayMap) {
    if (!topDay || v.amount > topDay.amount) {
      topDay = { date, amount: v.amount, count: v.count };
    }
  }

  // 고정 vs 변동
  const fixedAmount = sum(expense.filter((t) => t.is_fixed).map((t) => t.amount));
  const variableAmount = totalExpense - fixedAmount;

  // 신용카드 의존도
  const creditExpense = sum(
    expense
      .filter((t) => typeByName.get(t.account_name) === "credit_card")
      .map((t) => t.amount)
  );
  const creditCardPct =
    totalExpense > 0 ? Math.round((creditExpense / totalExpense) * 100) : 0;

  // 주중 vs 주말
  let weekdayExpense = 0;
  let weekendExpense = 0;
  for (const t of expense) {
    const d = new Date(t.occurred_on).getDay(); // 0=일, 6=토
    if (d === 0 || d === 6) weekendExpense += t.amount;
    else weekdayExpense += t.amount;
  }

  // 전월 대비 변화율
  const expenseDelta =
    prevMonthExpense > 0
      ? Math.round(((totalExpense - prevMonthExpense) / prevMonthExpense) * 100)
      : null;

  return {
    year,
    month,
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense,
    txCount: txs.length,
    topCategory,
    topDay,
    fixedAmount,
    variableAmount,
    prevMonthExpense,
    expenseDelta,
    creditCardPct,
    weekdayExpense,
    weekendExpense,
  };
}

/* ---------------- 연간 흐름 (간단) ---------------- */

export async function getYearlyExpense(
  year: number
): Promise<{ month: number; expense: number }[]> {
  const trend = await getYearlyTrend(year);
  return trend.map(({ month, expense }) => ({ month, expense }));
}

/** 월별 수입/지출/저축 반환 */
export async function getYearlyTrend(
  year: number
): Promise<{ month: number; income: number; expense: number; savings: number }[]> {
  const result: { month: number; income: number; expense: number; savings: number }[] = [];
  if (isConfigured()) {
    const user = await getUser();
    if (user) {
      const supabase = createClient();
      const start = isoDate(year, 1, 1);
      const end = isoDate(year + 1, 1, 1);
      const { data } = await supabase
        .from("transactions")
        .select(
          `occurred_on, amount, type,
           to_account:accounts!transactions_to_account_id_fkey(type)`
        )
        .eq("user_id", user.id)
        .gte("occurred_on", start)
        .lt("occurred_on", end);
      const incMap = new Map<number, number>();
      const expMap = new Map<number, number>();
      const savMap = new Map<number, number>();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const r of (data ?? []) as any[]) {
        const m = Number(r.occurred_on.split("-")[1]);
        const amt = Number(r.amount);
        if (r.type === "income") {
          incMap.set(m, (incMap.get(m) ?? 0) + amt);
        } else if (r.type === "expense") {
          expMap.set(m, (expMap.get(m) ?? 0) + amt);
        } else if (r.type === "transfer") {
          const toType: string | undefined = r.to_account?.type;
          if (toType && getAccountRole(toType) === "savings") {
            savMap.set(m, (savMap.get(m) ?? 0) + amt);
          }
        }
      }
      for (let m = 1; m <= 12; m++) {
        result.push({
          month: m,
          income: incMap.get(m) ?? 0,
          expense: expMap.get(m) ?? 0,
          savings: savMap.get(m) ?? 0,
        });
      }
      return result;
    }
  }
  // mock fallback — 과거/미래 년에는 데이터 없음
  const realYear = new Date().getFullYear();
  if (year !== realYear) {
    for (let m = 1; m <= 12; m++) {
      result.push({ month: m, income: 0, expense: 0, savings: 0 });
    }
    return result;
  }
  // 올해 — 실제 mock 거래에서만 합산
  const incomeByMonth = new Map<number, number>();
  const expenseByMonth = new Map<number, number>();
  const savingsByMonth = new Map<number, number>();
  const accountTypeByName = new Map<string, string>(
    mock.MOCK_ACCOUNTS.map((a) => [a.name, a.type])
  );
  for (const t of mock.MOCK_TRANSACTIONS) {
    const [ty, m] = t.date.split("-").map(Number);
    if (ty !== year) continue;
    if (t.type === "income") {
      incomeByMonth.set(m, (incomeByMonth.get(m) ?? 0) + t.amount);
    } else if (t.type === "expense") {
      expenseByMonth.set(m, (expenseByMonth.get(m) ?? 0) + t.amount);
    } else if (t.type === "transfer" && t.toAccountName) {
      const toType = accountTypeByName.get(t.toAccountName);
      if (toType && getAccountRole(toType) === "savings") {
        savingsByMonth.set(m, (savingsByMonth.get(m) ?? 0) + t.amount);
      }
    }
  }
  for (let m = 1; m <= 12; m++) {
    result.push({
      month: m,
      income: incomeByMonth.get(m) ?? 0,
      expense: expenseByMonth.get(m) ?? 0,
      savings: savingsByMonth.get(m) ?? 0,
    });
  }
  return result;
}

/* ---------------- 고정비 (recurring) ---------------- */

export interface RecurringRow {
  id: string;
  name: string;
  type: "income" | "expense";
  amount: number;
  day_of_month: number;
  category_id: string | null;
  subcategory_id: string | null;
  category_name: string | null;
  subcategory_name: string | null;
  account_id: string | null;
  account_name: string | null;
  is_active: boolean;
  next_due: string | null;
}

export async function getRecurringList(): Promise<RecurringRow[]> {
  if (!isConfigured()) return [];
  const user = await getUser();
  if (!user) return [];
  const supabase = createClient();
  const { data, error } = await supabase
    .from("recurring")
    .select(
      `id, name, type, amount, day_of_month, is_active, next_due,
       category_id, subcategory_id, account_id,
       category:categories!recurring_category_id_fkey(name),
       subcategory:categories!recurring_subcategory_id_fkey(name),
       account:accounts!recurring_account_id_fkey(name)`
    )
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("day_of_month", { nullsFirst: false });
  if (error || !data) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any[]).map((r) => ({
    id: r.id,
    name: r.name,
    type: r.type,
    amount: Number(r.amount),
    day_of_month: r.day_of_month,
    category_id: r.category_id,
    subcategory_id: r.subcategory_id,
    category_name: r.category?.name ?? null,
    subcategory_name: r.subcategory?.name ?? null,
    account_id: r.account_id,
    account_name: r.account?.name ?? null,
    is_active: r.is_active,
    next_due: r.next_due,
  }));
}

/**
 * 만기된 고정비 → 거래내역 자동 생성 (서버 컴포넌트에서 silent 호출)
 * - next_due <= today 인 활성 recurring 을 찾아 transaction insert
 * - 이후 next_due 를 다음달 같은 일자로 bump → idempotent
 * - revalidatePath 는 호출하지 않음 (render path 안전)
 */
export async function processRecurringDue(): Promise<number> {
  if (!isConfigured()) return 0;
  const user = await getUser();
  if (!user) return 0;
  const supabase = createClient();

  const today = new Date();
  const todayStr = isoOfDate(today);

  const { data: due } = await supabase
    .from("recurring")
    .select("id, name, type, amount, day_of_month, category_id, subcategory_id, account_id, next_due")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .lte("next_due", todayStr);

  if (!due || due.length === 0) return 0;

  let inserted = 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const r of due as any[]) {
    if (!r.account_id) continue;
    let cursor = r.next_due as string;
    let safety = 0;
    while (cursor && cursor <= todayStr && safety < 12) {
      const { error: insErr } = await supabase.from("transactions").insert({
        user_id: user.id,
        occurred_on: cursor,
        amount: Number(r.amount),
        type: r.type,
        category_id: r.category_id,
        subcategory_id: r.subcategory_id,
        account_id: r.account_id,
        memo: r.name,
        is_fixed: true,
      });
      if (!insErr) inserted++;
      cursor = bumpMonth(cursor, r.day_of_month);
      safety++;
    }
    await supabase
      .from("recurring")
      .update({ next_due: cursor })
      .eq("id", r.id)
      .eq("user_id", user.id);
  }
  return inserted;
}

function isoOfDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function bumpMonth(currentIso: string, dayOfMonth: number): string {
  const [y, m] = currentIso.split("-").map(Number);
  const d = new Date(y, m, dayOfMonth);
  return isoOfDate(d);
}

/* ---------------- 헬퍼 ---------------- */

function sum(arr: number[]): number {
  return arr.reduce((s, n) => s + n, 0);
}

function isoDate(year: number, month: number, day: number): string {
  const y = year + Math.floor((month - 1) / 12);
  const m = ((month - 1) % 12) + 1;
  const mm = String(m).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${y}-${mm}-${dd}`;
}
