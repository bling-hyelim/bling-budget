import Link from "next/link";
import { getYearlyTrend } from "@/lib/data";

type CatView = "expense" | "income" | "savings";

const VIEW_CHART_LABEL: Record<CatView, string> = {
  expense: "월별 지출 · 탭해서 이동",
  income:  "월별 수입 · 탭해서 이동",
  savings: "월별 저축 · 탭해서 이동",
};
const VIEW_NAME: Record<CatView, string> = {
  expense: "지출",
  income: "수입",
  savings: "저축",
};

interface Props {
  year: number;
  month: number;
  catView: CatView;
  accentColor: string;
  accentSoftColor: string;
  realMonth: number;
  realYear: number;
}

export async function YearlyTrend({
  year, month, catView, accentColor, accentSoftColor, realMonth, realYear,
}: Props) {
  const yearly = await getYearlyTrend(year);
  const yearlyValues = yearly.map((y) =>
    catView === "expense" ? y.expense : catView === "income" ? y.income : y.savings
  );
  const yearMax = Math.max(...yearlyValues) || 1;
  const yearTotal = yearlyValues.reduce((s, n) => s + n, 0);
  const hasYearData = yearTotal > 0;
  const isCurrentYear = year === realYear;

  const hrefWith = (m: number) =>
    `/?${new URLSearchParams({ cat: catView, m: String(m), y: String(year) }).toString()}`;

  return (
    <div className="card px-5 py-5">
      <div className="flex justify-between items-center text-[12px] text-ink-muted mb-3">
        <span>{VIEW_CHART_LABEL[catView]}</span>
        <span style={{ color: accentColor }} className="font-medium">{month}월</span>
      </div>
      <div className="flex items-end justify-between gap-1.5 h-[88px] px-0.5">
        {yearly.map((y) => {
          const value =
            catView === "expense" ? y.expense : catView === "income" ? y.income : y.savings;
          const isOn = y.month === month;
          const isFuture = isCurrentYear && value === 0 && y.month > realMonth;
          const pct = (value / yearMax) * 100;
          const barHeight = value > 0 ? Math.max(pct, 4) : 3;
          return (
            <Link
              key={y.month}
              href={hrefWith(y.month)}
              className="flex-1 rounded-t-lg cursor-pointer active:opacity-70 transition-opacity"
              style={{
                height: `${barHeight}%`,
                background: isOn ? accentColor : accentSoftColor,
                opacity: isFuture ? 0.4 : value === 0 ? 0.5 : 1,
              }}
              aria-label={`${y.month}월 보기`}
            />
          );
        })}
      </div>
      <div className="flex justify-between gap-1.5 pt-2.5 text-[11px] text-ink-muted">
        {yearly.map((y) => (
          <span
            key={y.month}
            className={`flex-1 text-center ${y.month === month ? "font-medium" : ""}`}
            style={y.month === month ? { color: accentColor } : undefined}
          >
            {y.month}
          </span>
        ))}
      </div>
      {!hasYearData && (
        <div className="mt-4 rounded-2xl bg-[var(--surface-soft)] px-4 py-3 text-[12px] text-ink-muted text-center">
          {year}년 {VIEW_NAME[catView]} 데이터가 없어요
        </div>
      )}
    </div>
  );
}

export function YearlyTrendSkeleton() {
  return <div className="card h-[160px] animate-pulse" />;
}
