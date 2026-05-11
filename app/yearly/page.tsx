import Link from "next/link";
import { KoreanAmount } from "@/components/KoreanAmount";
import { formatKRW } from "@/lib/formatKorean";
import { getYearlySummary } from "@/lib/data";

const PAY_ACCENT: Record<string, { bg: string; color: string; short: string }> = {
  credit_card: { bg: "#FAECE7", color: "#993C1D", short: "신" },
  checking:    { bg: "#E1F5EE", color: "#0F6E56", short: "통" },
  debit_card:  { bg: "#E1F5EE", color: "#0F6E56", short: "체" },
  pay_app:     { bg: "#E6F1FB", color: "#0C447C", short: "페" },
  cash:        { bg: "#FAEEDA", color: "#854F0B", short: "현" },
};

export default async function YearlyPage({
  searchParams,
}: {
  searchParams: { y?: string };
}) {
  const now = new Date();
  const thisYear = now.getFullYear();
  const year = Number(searchParams.y) || thisYear;
  const summary = await getYearlySummary(year);

  const maxMonthly = Math.max(
    ...summary.byMonth.map((m) => Math.max(m.income, m.expense)),
    1
  );

  return (
    <div className="px-5 pt-4 pb-6 space-y-5">
      <header className="flex items-center gap-3 pt-2">
        <Link
          href="/"
          aria-label="홈으로"
          className="w-10 h-10 grid place-items-center rounded-full bg-[var(--surface-soft)] text-ink-soft text-[18px]"
        >
          ‹
        </Link>
        <div className="flex-1">
          <h1 className="text-[20px] font-medium leading-tight">연간 요약</h1>
          <div className="text-[12px] text-ink-muted mt-0.5">연말정산 참고용</div>
        </div>
      </header>

      <div className="flex items-center justify-center gap-5 py-1">
        <Link
          href={`/yearly?y=${year - 1}`}
          className="w-9 h-9 grid place-items-center rounded-full bg-[var(--surface-soft)] text-ink-soft"
        >
          ‹
        </Link>
        <span className="text-[22px] font-medium tabular">{year}년</span>
        {year < thisYear ? (
          <Link
            href={`/yearly?y=${year + 1}`}
            className="w-9 h-9 grid place-items-center rounded-full bg-[var(--surface-soft)] text-ink-soft"
          >
            ›
          </Link>
        ) : (
          <span className="w-9 h-9 grid place-items-center text-ink-muted/30">›</span>
        )}
      </div>

      {/* 총 수입·지출·순저축 */}
      <div className="card px-6 py-6" style={{ background: "#000000" }}>
        <div className="text-[14px] text-white/65">연간 순저축</div>
        <div className="mt-1 text-[36px] font-medium tracking-tight text-white tabular leading-none">
          <KoreanAmount
            value={summary.totalIncome - summary.totalExpense}
            precision="exact"
            sign
            fadeSuffix
            suffixClassName="text-white/40"
          />
        </div>
        <div className="mt-5 pt-5 border-t border-white/15 grid grid-cols-2 gap-3">
          <div>
            <div className="text-[12px] text-white/55">총 수입</div>
            <div className="text-[18px] font-medium tabular mt-1" style={{ color: "#6BB5F0" }}>
              +<KoreanAmount value={summary.totalIncome} precision="exact" />
            </div>
          </div>
          <div>
            <div className="text-[12px] text-white/55">총 지출</div>
            <div className="text-[18px] font-medium tabular mt-1" style={{ color: "#FF8FA6" }}>
              -<KoreanAmount value={summary.totalExpense} precision="exact" />
            </div>
          </div>
        </div>
      </div>

      {/* 결제수단별 (연말정산 핵심) */}
      <section>
        <h2 className="text-[18px] font-medium mb-1 px-1">결제수단별 사용 총액</h2>
        <p className="text-[12px] text-ink-muted mb-3 px-1">연말정산 소득공제 참고</p>
        {summary.paymentTotals.length === 0 ? (
          <div className="card px-5 py-8 text-center text-[14px] text-ink-muted">
            아직 지출 거래가 없어요
          </div>
        ) : (
          <ul className="card divide-y divide-[var(--line)]">
            {summary.paymentTotals.map((p) => {
              const acc = PAY_ACCENT[p.type] ?? {
                bg: "#F1EFE8",
                color: "#5F5E5A",
                short: p.label.charAt(0),
              };
              const pct =
                summary.totalExpense > 0
                  ? Math.round((p.total / summary.totalExpense) * 100)
                  : 0;
              return (
                <li key={p.type} className="px-5 py-4 flex items-center gap-3">
                  <span
                    className="grid place-items-center w-11 h-11 rounded-[14px] text-[14px] font-medium"
                    style={{ background: acc.bg, color: acc.color }}
                  >
                    {acc.short}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-medium">{p.label}</div>
                    <div className="mt-1.5 h-1.5 rounded-full bg-[var(--surface-soft)] overflow-hidden">
                      <span
                        className="block h-full rounded-full"
                        style={{ width: `${pct}%`, background: acc.color }}
                      />
                    </div>
                  </div>
                  <div className="text-right whitespace-nowrap">
                    <div className="text-[16px] font-medium tabular">
                      <KoreanAmount value={p.total} precision="exact" />
                    </div>
                    <div className="text-[11px] text-ink-muted tabular mt-0.5">{pct}%</div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <p className="text-[12px] text-ink-muted mt-3 px-2 leading-relaxed">
          💡 신용카드 소득공제는 총 급여의 25% 초과 사용분에 적용돼요. 체크카드·현금영수증은 30% 공제율로 신용카드(15%)보다 높아요.
        </p>
      </section>

      {/* 월별 추이 */}
      <section>
        <h2 className="text-[18px] font-medium mb-3 px-1">월별 추이</h2>
        <div className="card px-5 py-5">
          <div className="flex items-end justify-between gap-1.5 h-[110px]">
            {summary.byMonth.map((m) => {
              const incH = (m.income / maxMonthly) * 100;
              const expH = (m.expense / maxMonthly) * 100;
              return (
                <div
                  key={m.month}
                  className="flex-1 flex flex-col items-center gap-0.5 h-full justify-end"
                >
                  <div className="w-full flex gap-px items-end h-full">
                    <div
                      className="flex-1 rounded-t bg-teal-600 min-h-[2px]"
                      style={{ height: `${incH}%` }}
                    />
                    <div
                      className="flex-1 rounded-t bg-coral-600 min-h-[2px]"
                      style={{ height: `${expH}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-between gap-1.5 pt-2 text-[11px] text-ink-muted">
            {summary.byMonth.map((m) => (
              <span key={m.month} className="flex-1 text-center">
                {m.month}
              </span>
            ))}
          </div>
          <div className="flex gap-4 mt-3 pt-3 border-t border-[var(--line)] text-[12px]">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-teal-600 rounded-sm" /> 수입
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-coral-600 rounded-sm" /> 지출
            </span>
          </div>
        </div>
      </section>

      {summary.incomeCategories.length > 0 && (
        <section>
          <h2 className="text-[18px] font-medium mb-3 px-1">수입 카테고리</h2>
          <CategoryList items={summary.incomeCategories} total={summary.totalIncome} />
        </section>
      )}

      {summary.expenseCategories.length > 0 && (
        <section>
          <h2 className="text-[18px] font-medium mb-3 px-1">지출 카테고리</h2>
          <CategoryList items={summary.expenseCategories} total={summary.totalExpense} />
        </section>
      )}

      <Link
        href={`/monthly?y=${year}&m=${now.getMonth() + 1}`}
        className="block card px-5 py-4 text-center text-[14px] text-ink font-medium"
        style={{ background: "var(--surface-soft)" }}
      >
        월간 인사이트 리포트 보기 ›
      </Link>

      <p className="text-[12px] text-ink-muted text-center pt-2 leading-relaxed">
        * 신용카드 납부(이동)는 지출에 포함되지 않습니다.
        <br />
        실제 사용액 기준으로 집계돼요.
      </p>
    </div>
  );
}

function CategoryList({
  items,
  total,
}: {
  items: { name: string; color: string; amount: number }[];
  total: number;
}) {
  return (
    <ul className="card divide-y divide-[var(--line)]">
      {items.map((c) => {
        const pct = total > 0 ? Math.round((c.amount / total) * 100) : 0;
        return (
          <li key={c.name} className="px-5 py-4">
            <div className="flex items-center justify-between mb-2">
              <span className="flex items-center gap-2.5">
                <span
                  className="block w-3 h-3 rounded-[3px]"
                  style={{ background: c.color }}
                />
                <span className="text-[15px]">{c.name}</span>
              </span>
              <span className="text-[16px] font-medium tabular">
                {formatKRW(c.amount, { precision: "exact" })}
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="flex-1 h-1.5 rounded-full bg-[var(--surface-soft)] overflow-hidden">
                <span
                  className="block h-full rounded-full"
                  style={{ width: `${pct}%`, background: c.color }}
                />
              </div>
              <span className="text-[12px] text-ink-muted tabular w-10 text-right">
                {pct}%
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
