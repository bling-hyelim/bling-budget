import clsx from "clsx";
import Link from "next/link";
import { KoreanAmount } from "@/components/KoreanAmount";
import { formatKRW } from "@/lib/formatKorean";
import { getTransactionsByMonth, type TransactionRow } from "@/lib/data";

const DAY_NAMES = ["일", "월", "화", "수", "목", "금", "토"];

type Filter = "all" | "income" | "expense" | "transfer" | "savings";

const FILTERS: { v: Filter; label: string }[] = [
  { v: "all",      label: "전체" },
  { v: "income",   label: "수입" },
  { v: "expense",  label: "지출" },
  { v: "transfer", label: "이동" },
  { v: "savings",  label: "저축" },
];

// 파스텔 톤 카테고리 컬러
const CATEGORY_VISUALS: Record<string, { ch: string; bg: string; color: string }> = {
  식비:        { ch: "식", bg: "#FFE4ED", color: "#C24868" },
  주거비:      { ch: "주", bg: "#D9F0E0", color: "#3E8866" },
  생활비:      { ch: "생", bg: "#FFEDD4", color: "#8F6326" },
  교통비:      { ch: "교", bg: "#E5DEF7", color: "#5C4DA8" },
  "취미/여가":  { ch: "취", bg: "#D9E8FB", color: "#2D6FB5" },
  꾸밈비:      { ch: "꾸", bg: "#FFE0EC", color: "#B5547D" },
  "의료/건강": { ch: "건", bg: "#DBF0CC", color: "#4A7833" },
  자기계발:    { ch: "자", bg: "#D5EEF4", color: "#2E7384" },
  경조사:      { ch: "경", bg: "#FFE0DA", color: "#B5523F" },
  여행:        { ch: "여", bg: "#D8F0E2", color: "#387A5E" },
  사회생활:    { ch: "사", bg: "#FFE3D0", color: "#9C5E29" },
  금융비용:    { ch: "금", bg: "#E5E2EE", color: "#5C5678" },
  기타:        { ch: "기", bg: "#ECE9E0", color: "#6F6A5E" },
  이동:        { ch: "↔", bg: "#ECE9E0", color: "#5F5E5A" },
  저축:        { ch: "저", bg: "#D9F0E0", color: "#1D6E50" },
  월급:        { ch: "수", bg: "#DCEBFE", color: "#2281E7" },
  이자:        { ch: "수", bg: "#DCEBFE", color: "#2281E7" },
  부수입:      { ch: "수", bg: "#DCEBFE", color: "#2281E7" },
};

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: { f?: string; m?: string; y?: string };
}) {
  const now = new Date();
  const realYear = now.getFullYear();
  const realMonth = now.getMonth() + 1;
  const year = clampYear(searchParams.y, realYear);
  const month = clampMonth(searchParams.m, realMonth);
  const filter = parseFilter(searchParams.f);

  const all = await getTransactionsByMonth(year, month);
  const txs = filter === "all" ? all : all.filter((t) => t.kind === filter);

  const income = all.filter((t) => t.kind === "income").reduce((s, t) => s + t.amount, 0);
  const expense = all.filter((t) => t.kind === "expense").reduce((s, t) => s + t.amount, 0);
  const savings = all.filter((t) => t.kind === "savings").reduce((s, t) => s + t.amount, 0);
  const balance = income - expense;
  const grouped = groupByDate(txs);

  const prev = month === 1 ? { y: year - 1, m: 12 } : { y: year, m: month - 1 };
  const next = month === 12 ? { y: year + 1, m: 1 } : { y: year, m: month + 1 };
  const buildHref = (y: number, m: number) =>
    `/transactions?${new URLSearchParams({ f: filter, m: String(m), y: String(y) }).toString()}`;

  return (
    <div className="px-5 pt-4 pb-6 space-y-5">
      <header className="flex items-center justify-between pt-2">
        <div>
          <h1 className="text-[24px] font-medium leading-tight">내역</h1>
          <div className="flex items-center gap-2 text-[13px] text-ink-muted mt-1">
            <Link href={buildHref(prev.y, prev.m)} aria-label="이전 달" className="w-5 h-5 grid place-items-center">
              ‹
            </Link>
            <span>{year}년 {month}월</span>
            <Link href={buildHref(next.y, next.m)} aria-label="다음 달" className="w-5 h-5 grid place-items-center">
              ›
            </Link>
          </div>
        </div>
        <button aria-label="검색" className="w-11 h-11 grid place-items-center rounded-full bg-[var(--surface-soft)] text-ink-soft">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" />
          </svg>
        </button>
      </header>

      <div className="flex gap-1 rounded-full bg-[var(--surface-soft)] p-1">
        {FILTERS.map((f) => {
          const active = filter === f.v;
          return (
            <Link
              key={f.v}
              href={`/transactions?${new URLSearchParams({ f: f.v, m: String(month), y: String(year) }).toString()}`}
              className={clsx(
                "flex-1 py-2 text-[14px] text-center rounded-full transition-colors",
                active
                  ? "bg-[var(--surface)] text-ink font-medium shadow-[0_1px_2px_rgba(0,0,0,0.06)]"
                  : "text-ink-muted"
              )}
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      <div className="card px-6 py-5">
        <div className="flex items-baseline justify-between">
          <span className="text-[14px] text-ink-muted">{month}월 합계</span>
          <span
            className={clsx(
              "text-[24px] font-medium tabular",
              balance >= 0 ? "text-teal-800" : "text-coral-800"
            )}
          >
            {balance >= 0 ? "+" : "-"}
            <KoreanAmount value={Math.abs(balance)} precision="exact" fadeSuffix />
          </span>
        </div>
        <div className="mt-4 pt-4 border-t border-[var(--line)] grid grid-cols-2 gap-3">
          <div>
            <div className="text-[13px] text-ink-muted">수입</div>
            <div className="mt-0.5 text-[17px] font-medium text-teal-800 tabular">
              <KoreanAmount value={income} precision="man" sign />
            </div>
          </div>
          <div>
            <div className="text-[13px] text-ink-muted">지출</div>
            <div className="mt-0.5 text-[17px] font-medium text-coral-800 tabular">
              -<KoreanAmount value={expense} precision="exact" />
            </div>
          </div>
        </div>
      </div>

      {txs.length === 0 ? (
        <div className="card px-5 py-16 text-center">
          <div className="text-[15px] text-ink-soft">
            {filter === "all" ? "아직 거래가 없어요" : `${labelFor(filter)} 내역이 없어요`}
          </div>
          {filter === "all" && (
            <Link
              href="/add"
              className="inline-block mt-4 px-5 py-2.5 rounded-full bg-black text-white text-[14px] font-medium"
            >
              ＋ 첫 거래 입력하기
            </Link>
          )}
        </div>
      ) : (
        <div className="card px-2 py-2 divide-y divide-[var(--line)]">
          {grouped.map(([date, rows]) => {
            // 이동/저축은 자산이 이동만 할 뿐 순증감 0 이므로 일자 합계에서 제외
            const dayTotal = rows.reduce(
              (s, r) =>
                s +
                (r.kind === "income"
                  ? r.amount
                  : r.kind === "expense"
                  ? -r.amount
                  : 0),
              0
            );
            return (
              <div key={date} className="py-2">
                <div className="flex items-baseline justify-between px-3 pt-2 pb-1">
                  <span className="text-[13px] font-medium text-ink-soft">{formatDateLabel(date)}</span>
                  <span
                    className={clsx(
                      "text-[12px] tabular",
                      dayTotal >= 0 ? "text-teal-800" : "text-ink-muted"
                    )}
                  >
                    {dayTotal >= 0 ? "+" : "-"}
                    {formatKRW(Math.abs(dayTotal), { precision: "exact" })}
                  </span>
                </div>
                <ul>
                  {rows.map((r) => (
                    <TxItem key={r.id} row={r} />
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TxItem({ row }: { row: TransactionRow }) {
  const isSavings = row.kind === "savings";
  const isTransfer = row.kind === "transfer";
  const catName =
    row.category_name ?? (isSavings ? "저축" : isTransfer ? "이동" : "기타");
  const vis = CATEGORY_VISUALS[catName] || {
    ch: catName.charAt(0),
    bg: "#F1EFE8",
    color: "#5F5E5A",
  };
  const sign =
    row.kind === "income" ? "+" : row.kind === "expense" ? "-" : isSavings ? "↑" : "↔";
  const amountClass =
    row.kind === "income"
      ? "text-teal-800"
      : row.kind === "expense"
      ? "text-ink"
      : isSavings
      ? "text-[#1D6E50]"
      : "text-ink-soft";

  return (
    <li>
      <Link
        href={`/transactions/${row.id}`}
        className="grid grid-cols-[40px_1fr_auto] items-center gap-3 px-3 py-3 active:bg-[var(--surface-soft)] rounded-2xl"
      >
        <span
          className="grid place-items-center w-10 h-10 rounded-[14px] text-[14px] font-medium"
          style={{ background: vis.bg, color: vis.color }}
        >
          {vis.ch}
        </span>
        <div className="min-w-0">
          <div className="text-[15px] truncate">
            {row.memo || row.subcategory_name || catName}
          </div>
          <div className="text-[12px] text-ink-muted truncate mt-0.5">
            {catName}
            {row.subcategory_name && ` · ${row.subcategory_name}`}
            {row.is_fixed && " · 고정"}
            {row.to_account_name && ` → ${row.to_account_name}`}
          </div>
        </div>
        <div className="text-right whitespace-nowrap">
          <div className={clsx("text-[16px] font-medium tabular", amountClass)}>
            {sign}
            {formatKRW(row.amount, { precision: "exact" })}
          </div>
          <div className="text-[11px] text-ink-muted mt-0.5">{row.account_name}</div>
        </div>
      </Link>
    </li>
  );
}

function clampMonth(raw: string | undefined, fallback: number): number {
  const n = Number(raw);
  if (!n || n < 1 || n > 12) return fallback;
  return n;
}

function clampYear(raw: string | undefined, fallback: number): number {
  const n = Number(raw);
  if (!n || n < 2000 || n > 2100) return fallback;
  return n;
}

function parseFilter(raw: string | undefined): Filter {
  if (raw === "income" || raw === "expense" || raw === "transfer" || raw === "savings") return raw;
  return "all";
}

function labelFor(f: Filter): string {
  return FILTERS.find((x) => x.v === f)?.label ?? "전체";
}

function groupByDate(rows: TransactionRow[]): [string, TransactionRow[]][] {
  const map = new Map<string, TransactionRow[]>();
  for (const r of rows) {
    const list = map.get(r.occurred_on) ?? [];
    list.push(r);
    map.set(r.occurred_on, list);
  }
  return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
}

function formatDateLabel(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const day = new Date(y, m - 1, d).getDay();
  return `${m}월 ${d}일 (${DAY_NAMES[day]})`;
}
