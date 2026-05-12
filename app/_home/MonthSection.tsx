import Link from "next/link";
import { KoreanAmount } from "@/components/KoreanAmount";
import { Donut } from "@/components/Donut";
import { formatKRW } from "@/lib/formatKorean";
import { getMonthSummary } from "@/lib/data";

type CatView = "expense" | "income" | "savings";

const VIEW_LABELS: Record<CatView, { center: string; empty: string }> = {
  expense: { center: "총 지출", empty: "이번달 지출이 아직 없어요" },
  income:  { center: "총 수입", empty: "이번달 수입이 아직 없어요" },
  savings: { center: "총 저축", empty: "이번달 저축이 아직 없어요" },
};

const PAY_SHORTS: Record<string, string> = {
  credit_card: "신",
  checking: "통",
  debit_card: "체",
  pay_app: "페",
  cash: "현",
};
const payShort = (t: string) => PAY_SHORTS[t] ?? "기";

interface Props {
  year: number;
  month: number;
  catView: CatView;
  accentColor: string;
  accentSoftColor: string;
}

export async function MonthSection({ year, month, catView, accentColor, accentSoftColor }: Props) {
  const summary = await getMonthSummary(year, month);
  const labels = VIEW_LABELS[catView];
  const breakdown =
    catView === "expense"
      ? summary.expenseCategories
      : catView === "income"
      ? summary.incomeCategories
      : summary.savingsCategories;
  const breakdownTotal = breakdown.reduce((s, c) => s + c.amount, 0);
  const paymentBreakdown =
    catView === "expense"
      ? summary.expensePayments
      : catView === "income"
      ? summary.incomePayments
      : [];

  return (
    <>
      {/* 잔액 카드 */}
      <div className="card px-6 py-5">
        <div className="flex items-baseline justify-between">
          <span className="text-[14px] text-ink-muted">잔액</span>
          <span className="text-[28px] font-medium tabular">
            <KoreanAmount value={summary.balance} precision="exact" fadeSuffix />
          </span>
        </div>
        <div className="mt-4 pt-4 border-t border-[var(--line)] grid grid-cols-2 gap-2">
          <div>
            <div className="text-[13px] text-ink-muted">수입</div>
            <div className="mt-0.5 text-[18px] font-medium text-teal-800 tabular">
              <KoreanAmount value={summary.income} precision="man" sign />
            </div>
          </div>
          <div>
            <div className="text-[13px] text-ink-muted">지출</div>
            <div className="mt-0.5 text-[18px] font-medium text-coral-800 tabular">
              -<KoreanAmount value={summary.expense} precision="exact" />
            </div>
          </div>
        </div>
      </div>

      {/* 카테고리별 */}
      <div className="card px-5 py-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[16px] font-medium">카테고리별</h3>
          <div className="flex gap-1 bg-[var(--surface-soft)] rounded-full p-1">
            <CatTab label="지출" active={catView === "expense"} kind="expense" year={year} month={month} />
            <CatTab label="수입" active={catView === "income"}  kind="income"  year={year} month={month} />
            <CatTab label="저축" active={catView === "savings"} kind="savings" year={year} month={month} />
          </div>
        </div>

        {breakdown.length > 0 ? (
          <div className="grid grid-cols-[128px_1fr] gap-4 items-center">
            <Donut
              size={128}
              strokeWidth={14}
              slices={breakdown.slice(0, 5).map((c) => ({ value: c.amount, color: c.color }))}
              centerLabel={labels.center}
              centerValue={formatKRW(breakdownTotal, { precision: "man", suffix: "" })}
            />
            <ul className="space-y-2.5">
              {breakdown.slice(0, 5).map((c) => (
                <li key={c.name} className="grid grid-cols-[12px_1fr_auto] items-center gap-2.5">
                  <span className="block w-3 h-3 rounded-[3px]" style={{ background: c.color }} />
                  <span className="text-[14px] truncate">{c.name}</span>
                  <span className="text-[13px] text-ink-muted tabular whitespace-nowrap">
                    {breakdownTotal > 0 && `${Math.round((c.amount / breakdownTotal) * 100)}%`}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="rounded-2xl bg-[var(--surface-soft)] px-4 py-8 text-center text-[14px] text-ink-muted">
            {labels.empty}
          </div>
        )}
      </div>

      {/* 지출수단별 */}
      {paymentBreakdown.length > 0 && (
        <div className="card px-5 py-5">
          <h3 className="text-[16px] font-medium mb-4">
            {catView === "expense" ? "지출수단별" : "수입수단별"}
          </h3>
          <ul className="space-y-3.5">
            {paymentBreakdown.map((p) => (
              <li key={p.name} className="grid grid-cols-[40px_1fr_auto] items-center gap-3">
                <span
                  className="grid place-items-center w-10 h-10 rounded-[14px] text-[14px] font-medium"
                  style={{ background: accentSoftColor, color: accentColor }}
                >
                  {payShort(p.type)}
                </span>
                <div>
                  <div className="text-[14px] font-medium">{p.name}</div>
                  <div className="mt-1.5 h-1.5 rounded-full bg-[var(--surface-soft)] overflow-hidden">
                    <span className="block h-full rounded-full" style={{ width: `${p.pct}%`, background: accentColor }} />
                  </div>
                </div>
                <div className="text-right whitespace-nowrap">
                  <div className="text-[15px] font-medium tabular">
                    <KoreanAmount value={p.amount} suffix="" />
                  </div>
                  <div className="text-[11px] text-ink-muted tabular">{p.pct}%</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

export function MonthSectionSkeleton() {
  return (
    <>
      <div className="card px-6 py-5 animate-pulse h-32" />
      <div className="card px-5 py-5 animate-pulse h-44" />
    </>
  );
}

function CatTab({
  label,
  active,
  kind,
  year,
  month,
}: {
  label: string;
  active: boolean;
  kind: "expense" | "income" | "savings";
  year: number;
  month: number;
}) {
  const href = `/?${new URLSearchParams({ cat: kind, m: String(month), y: String(year) }).toString()}`;
  const colors = active
    ? kind === "expense"
      ? { bg: "#FFEAEF", text: "#B82654" }
      : kind === "income"
      ? { bg: "#DCEBFE", text: "#1264C0" }
      : { bg: "#D9F0E0", text: "#1D6E50" }
    : null;
  return (
    <Link
      href={href}
      className={`px-3 py-1 text-[13px] rounded-full transition-colors font-medium ${
        active ? "" : "text-ink-muted"
      }`}
      style={colors ? { background: colors.bg, color: colors.text } : undefined}
    >
      {label}
    </Link>
  );
}
