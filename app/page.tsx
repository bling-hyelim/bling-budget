import Link from "next/link";
import { KoreanAmount } from "@/components/KoreanAmount";
import { Donut } from "@/components/Donut";
import { formatKRW } from "@/lib/formatKorean";
import {
  getAssetSummary,
  getMonthSummary,
  getYearlyTrend,
  processRecurringDue,
} from "@/lib/data";

type CatView = "expense" | "income" | "savings";

interface SearchParams {
  cat?: string;
  m?: string;
  y?: string;
}

function parseCatView(raw: string | undefined): CatView {
  if (raw === "income" || raw === "savings") return raw;
  return "expense";
}

const VIEW_COLORS: Record<CatView, { accent: string; soft: string }> = {
  expense: { accent: "#FF5F85", soft: "#FFEAEF" },
  income:  { accent: "#2281E7", soft: "#DCEBFE" },
  savings: { accent: "#1D9E75", soft: "#D9F0E0" },
};

const VIEW_LABELS: Record<CatView, { center: string; chart: string; empty: string }> = {
  expense: { center: "총 지출", chart: "월별 지출 · 탭해서 이동", empty: "이번달 지출이 아직 없어요" },
  income:  { center: "총 수입", chart: "월별 수입 · 탭해서 이동", empty: "이번달 수입이 아직 없어요" },
  savings: { center: "총 저축", chart: "월별 저축 · 탭해서 이동", empty: "이번달 저축이 아직 없어요" },
};

export default async function HomePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const now = new Date();
  const realYear = now.getFullYear();
  const realMonth = now.getMonth() + 1;
  const year = clampYear(searchParams.y, realYear);
  const month = clampMonth(searchParams.m, realMonth);
  const catView: CatView = parseCatView(searchParams.cat);

  // 홈 진입 시 만기 고정비 자동 기록 (idempotent)
  await processRecurringDue();

  const [asset, summary, yearly] = await Promise.all([
    getAssetSummary(),
    getMonthSummary(year, month),
    getYearlyTrend(year),
  ]);

  const yearlyValues = yearly.map((y) =>
    catView === "expense" ? y.expense : catView === "income" ? y.income : y.savings
  );
  const yearMax = Math.max(...yearlyValues) || 1;
  const yearTotal = yearlyValues.reduce((s, n) => s + n, 0);
  const hasYearData = yearTotal > 0;
  const hasData = asset.netWorth !== 0 || summary.income !== 0 || summary.expense !== 0;

  const breakdown =
    catView === "expense"
      ? summary.expenseCategories
      : catView === "income"
      ? summary.incomeCategories
      : summary.savingsCategories;
  const breakdownTotal = breakdown.reduce((s, c) => s + c.amount, 0);
  // 결제수단별은 지출/수입에만 의미 — 저축은 destination account 별로 이미 카테고리에 노출됨
  const paymentBreakdown =
    catView === "expense"
      ? summary.expensePayments
      : catView === "income"
      ? summary.incomePayments
      : [];
  const isCurrentMonth = month === realMonth && year === realYear;
  const isCurrentYear = year === realYear;
  const accentColor = VIEW_COLORS[catView].accent;
  const accentSoftColor = VIEW_COLORS[catView].soft;
  const labels = VIEW_LABELS[catView];

  return (
    <div className="px-5 pt-3 pb-6 space-y-7">
      <HomeHeader />

      {/* 1. 현재 총 자산 */}
      <section>
        <SectionHeader title="현재 총 자산" cta="상세" href="/assets" />
        <Link
          href="/assets"
          className="block card px-6 py-6 active:scale-[0.99] transition-transform"
          style={{ background: "#000000" }}
        >
          <div className="text-[15px] text-white/65">순자산</div>
          <div className="mt-1 mb-5 text-[40px] font-medium tracking-tight text-white tabular leading-none">
            <KoreanAmount value={asset.netWorth} precision="man" fadeSuffix suffixClassName="text-white/40" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            {asset.groups.map((g) => (
              <div key={g.label} className="rounded-2xl bg-white/10 px-3 py-2.5">
                <div className="text-[12px] text-white/60">{g.label}</div>
                <div
                  className={`mt-0.5 text-[15px] font-medium tabular ${
                    g.total < 0 ? "text-[#FF8FA6]" : "text-white"
                  }`}
                >
                  <KoreanAmount value={g.total} precision="man" />
                </div>
              </div>
            ))}
          </div>
        </Link>
      </section>

      {/* 2. 이번달 현황 */}
      <section className="space-y-5">
        <div className="flex items-baseline justify-between">
          <div>
            <h2 className="text-[20px] font-medium leading-tight">
              {isCurrentMonth ? "이번달 현황" : `${year}년 ${month}월 현황`}
            </h2>
            <MonthNav year={year} month={month} isCurrent={isCurrentMonth} catView={catView} />
          </div>
          <Link
            href={`/monthly?y=${year}&m=${month}`}
            className="text-[14px] text-coral-800 font-medium"
          >
            리포트 ›
          </Link>
        </div>

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
              <CatTab label="지출"  active={catView === "expense"} kind="expense" href={hrefWith({ cat: "expense", m: String(month), y: String(year) })} />
              <CatTab label="수입"  active={catView === "income"}  kind="income"  href={hrefWith({ cat: "income",  m: String(month), y: String(year) })} />
              <CatTab label="저축"  active={catView === "savings"} kind="savings" href={hrefWith({ cat: "savings", m: String(month), y: String(year) })} />
            </div>
          </div>

          {breakdown.length > 0 ? (
            <div className="grid grid-cols-[128px_1fr] gap-4 items-center">
              <Donut
                size={128}
                strokeWidth={14}
                slices={breakdown.slice(0, 5).map((c) => ({
                  value: c.amount,
                  color: c.color,
                }))}
                centerLabel={labels.center}
                centerValue={formatKRW(breakdownTotal, { precision: "man", suffix: "" })}
              />
              <ul className="space-y-2.5">
                {breakdown.slice(0, 5).map((c) => (
                  <li
                    key={c.name}
                    className="grid grid-cols-[12px_1fr_auto] items-center gap-2.5"
                  >
                    <span
                      className="block w-3 h-3 rounded-[3px]"
                      style={{ background: c.color }}
                    />
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
                <li
                  key={p.name}
                  className="grid grid-cols-[40px_1fr_auto] items-center gap-3"
                >
                  <span
                    className="grid place-items-center w-10 h-10 rounded-[14px] text-[14px] font-medium"
                    style={{ background: accentSoftColor, color: accentColor }}
                  >
                    {payShort(p.type)}
                  </span>
                  <div>
                    <div className="text-[14px] font-medium">{p.name}</div>
                    <div className="mt-1.5 h-1.5 rounded-full bg-[var(--surface-soft)] overflow-hidden">
                      <span
                        className="block h-full rounded-full"
                        style={{ width: `${p.pct}%`, background: accentColor }}
                      />
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
      </section>

      {/* 3. 연간 흐름 */}
      <section>
        <div className="flex items-baseline justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <Link
              href={hrefWith({ cat: catView, m: String(month), y: String(year - 1) })}
              aria-label="이전 년"
              className="w-7 h-7 grid place-items-center rounded-full bg-[var(--surface-soft)] text-ink-soft text-[14px]"
            >
              ‹
            </Link>
            <h2 className="text-[20px] font-medium leading-tight">{year}년 흐름</h2>
            {!isCurrentYear ? (
              <Link
                href={hrefWith({ cat: catView, m: String(month), y: String(year + 1) })}
                aria-label="다음 년"
                className="w-7 h-7 grid place-items-center rounded-full bg-[var(--surface-soft)] text-ink-soft text-[14px]"
              >
                ›
              </Link>
            ) : (
              <span className="w-7 h-7 grid place-items-center text-ink-muted/30 text-[14px]">›</span>
            )}
          </div>
          <Link href={`/yearly?y=${year}`} className="text-[14px] text-coral-800 font-medium">
            연간 요약 ›
          </Link>
        </div>
        <div className="card px-5 py-5">
          <div className="flex justify-between items-center text-[12px] text-ink-muted mb-3">
            <span>{labels.chart}</span>
            <span style={{ color: accentColor }} className="font-medium">{month}월</span>
          </div>
          <div className="flex items-end justify-between gap-1.5 h-[88px] px-0.5">
            {yearly.map((y) => {
              const value =
                catView === "expense" ? y.expense : catView === "income" ? y.income : y.savings;
              const isOn = y.month === month;
              const isFuture = isCurrentYear && value === 0 && y.month > realMonth;
              const pct = (value / yearMax) * 100;
              // 실제 비율 그대로. 데이터 없으면 아주 얇은 막대(3%)로 클릭만 가능.
              const barHeight = value > 0 ? Math.max(pct, 4) : 3;
              return (
                <Link
                  key={y.month}
                  href={hrefWith({ cat: catView, m: String(y.month), y: String(year) })}
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
              {year}년 {catView === "expense" ? "지출" : catView === "income" ? "수입" : "저축"} 데이터가 없어요
            </div>
          )}
          {!hasData && hasYearData === false && (
            <div className="mt-2 rounded-2xl bg-[var(--surface-soft)] px-4 py-3 text-[12px] text-ink-muted text-center">
              하단 ＋ 버튼으로 첫 거래를 기록해보세요
            </div>
          )}
        </div>
      </section>
    </div>
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

function hrefWith(params: Record<string, string>): string {
  const u = new URLSearchParams(params);
  return `/?${u.toString()}`;
}

/* ---------- 컴포넌트 ---------- */

const PAY_COLORS: Record<string, string> = {
  credit_card: "#D85A30",
  checking: "#1D9E75",
  debit_card: "#1D9E75",
  pay_app: "#185FA5",
  cash: "#BA7517",
};
const PAY_SHORTS: Record<string, string> = {
  credit_card: "신",
  checking: "통",
  debit_card: "체",
  pay_app: "페",
  cash: "현",
};
function payColor(type: string) {
  return PAY_COLORS[type] ?? "#888780";
}
function payShort(type: string) {
  return PAY_SHORTS[type] ?? "기";
}

function HomeHeader() {
  return (
    <header className="flex items-center justify-between pt-3">
      <div className="flex items-center gap-3">
        <div className="grid place-items-center w-11 h-11 rounded-full bg-coral-50 text-coral-800 font-medium text-[16px]">
          블
        </div>
        <div>
          <div className="text-[15px] font-medium leading-tight">블링님</div>
          <div className="text-[12px] text-ink-muted mt-0.5">오늘도 가볍게 기록해요</div>
        </div>
      </div>
      <button
        aria-label="알림"
        className="relative grid place-items-center w-10 h-10 rounded-full bg-[var(--surface-soft)]"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8" />
          <path d="M10 21a2 2 0 0 0 4 0" />
        </svg>
      </button>
    </header>
  );
}

function MonthNav({
  year,
  month,
  isCurrent,
  catView,
}: {
  year: number;
  month: number;
  isCurrent: boolean;
  catView: CatView;
}) {
  // 1월 ‹ → 작년 12월, 12월 › → 내년 1월
  const prev =
    month === 1
      ? { y: year - 1, m: 12 }
      : { y: year, m: month - 1 };
  const next =
    month === 12
      ? { y: year + 1, m: 1 }
      : { y: year, m: month + 1 };

  const prevHref = hrefWith({ cat: catView, m: String(prev.m), y: String(prev.y) });
  const nextHref = hrefWith({ cat: catView, m: String(next.m), y: String(next.y) });

  return (
    <div className="mt-1 flex items-center gap-2 text-[13px] text-ink-muted">
      <Link href={prevHref} aria-label="이전 달" className="w-5 h-5 grid place-items-center text-ink-muted">
        ‹
      </Link>
      <span>{year}년 {month}월</span>
      <Link href={nextHref} aria-label="다음 달" className="w-5 h-5 grid place-items-center text-ink-muted">
        ›
      </Link>
      {!isCurrent && (
        <Link href="/" className="ml-1 text-[12px] text-coral-700 font-medium">
          이번달로
        </Link>
      )}
    </div>
  );
}

function SectionHeader({
  title,
  cta,
  href,
}: {
  title: string;
  cta?: string;
  href?: string;
}) {
  return (
    <div className="flex items-baseline justify-between mb-3">
      <h2 className="text-[20px] font-medium leading-tight">{title}</h2>
      {cta &&
        (href ? (
          <Link href={href} className="text-[14px] text-coral-800 font-medium">
            {cta} ›
          </Link>
        ) : (
          <span className="text-[14px] text-ink-muted">{cta}</span>
        ))}
    </div>
  );
}

function CatTab({
  label,
  active,
  href,
  kind,
}: {
  label: string;
  active: boolean;
  href: string;
  kind: "expense" | "income" | "savings";
}) {
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
