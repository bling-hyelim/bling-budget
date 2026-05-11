import Link from "next/link";
import { KoreanAmount } from "@/components/KoreanAmount";
import { formatKRW } from "@/lib/formatKorean";
import { getMonthlyInsights, type MonthlyInsights } from "@/lib/data";

const DAY_NAMES = ["일", "월", "화", "수", "목", "금", "토"];

export default async function MonthlyReportPage({
  searchParams,
}: {
  searchParams: { y?: string; m?: string };
}) {
  const now = new Date();
  const year = Number(searchParams.y) || now.getFullYear();
  const month = Number(searchParams.m) || now.getMonth() + 1;
  const insights = await getMonthlyInsights(year, month);
  const headline = makeHeadline(insights);

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
          <h1 className="text-[20px] font-medium leading-tight">월간 리포트</h1>
          <div className="text-[12px] text-ink-muted mt-0.5">
            {year}년 {month}월
          </div>
        </div>
      </header>

      {insights.txCount === 0 ? (
        <div className="card px-5 py-16 text-center">
          <div className="text-[15px] text-ink-soft">{month}월 거래가 아직 없어요</div>
          <Link
            href="/add"
            className="inline-block mt-4 px-5 py-2.5 rounded-full bg-black text-white text-[14px] font-medium"
          >
            ＋ 입력하기
          </Link>
        </div>
      ) : (
        <>
          {/* 헤드라인 */}
          <div className="card px-6 py-6" style={{ background: "#000000" }}>
            <div className="text-[13px] text-white/65">{month}월 한 줄 요약</div>
            <div className="mt-2 text-[19px] leading-relaxed text-white font-medium">
              {headline}
            </div>
            <div className="mt-5 pt-5 border-t border-white/15 grid grid-cols-3 gap-3">
              <div>
                <div className="text-[11px] text-white/55">수입</div>
                <div className="mt-0.5 text-[16px] font-medium tabular" style={{ color: "#6BB5F0" }}>
                  +<KoreanAmount value={insights.totalIncome} precision="man" />
                </div>
              </div>
              <div>
                <div className="text-[11px] text-white/55">지출</div>
                <div className="mt-0.5 text-[16px] font-medium tabular" style={{ color: "#FF8FA6" }}>
                  -<KoreanAmount value={insights.totalExpense} precision="man" />
                </div>
              </div>
              <div>
                <div className="text-[11px] text-white/55">건수</div>
                <div className="mt-0.5 text-[16px] font-medium tabular text-white">{insights.txCount}건</div>
              </div>
            </div>
          </div>

          {/* 인사이트 카드들 */}
          <div className="grid grid-cols-2 gap-3">
            {insights.topCategory && (
              <Card
                badge="1위 카테고리"
                bigText={insights.topCategory.name}
                subText={`${formatKRW(insights.topCategory.amount, { precision: "man" })} · ${insights.topCategory.pct}%`}
              />
            )}
            {insights.topDay && (
              <Card
                badge="최고 지출 날"
                bigText={formatDate(insights.topDay.date)}
                subText={`${formatKRW(insights.topDay.amount, { precision: "exact" })} (${insights.topDay.count}건)`}
              />
            )}
            <Card
              badge="고정 vs 변동"
              bigText={`${pct(insights.fixedAmount, insights.totalExpense)}%`}
              subText={`고정 ${formatKRW(insights.fixedAmount, { precision: "man" })}`}
              note="총 지출 중 고정비"
            />
            <Card
              badge="신용카드 의존도"
              bigText={`${insights.creditCardPct}%`}
              subText={
                insights.creditCardPct >= 70
                  ? "조금 높네요"
                  : insights.creditCardPct >= 40
                  ? "적당해요"
                  : "여유 있어요"
              }
            />
          </div>

          {/* 주중 vs 주말 */}
          <section className="card px-5 py-5">
            <h3 className="text-[15px] font-medium mb-4">주중 vs 주말</h3>
            <WeekdayBar
              weekday={insights.weekdayExpense}
              weekend={insights.weekendExpense}
            />
            <p className="mt-4 text-[13px] text-ink-soft leading-relaxed">
              {makeWeekdayInsight(insights)}
            </p>
          </section>

          {/* 전월 비교 */}
          {insights.expenseDelta !== null && (
            <section className="card px-5 py-5">
              <h3 className="text-[15px] font-medium mb-3">지난달 대비</h3>
              <div className="flex items-baseline gap-3">
                <span
                  className={`text-[34px] font-medium tabular leading-none ${
                    insights.expenseDelta > 0 ? "text-coral-800" : "text-teal-800"
                  }`}
                >
                  {insights.expenseDelta > 0 ? "+" : ""}
                  {insights.expenseDelta}%
                </span>
                <span className="text-[12px] text-ink-muted">
                  지난달 {formatKRW(insights.prevMonthExpense, { precision: "man" })}
                </span>
              </div>
              <p className="mt-3 text-[13px] text-ink-soft leading-relaxed">
                {makeDeltaInsight(insights.expenseDelta)}
              </p>
            </section>
          )}

          <Link
            href={`/yearly?y=${year}`}
            className="block card px-5 py-4 text-center text-[14px] text-ink font-medium"
            style={{ background: "var(--surface-soft)" }}
          >
            {year}년 전체 보기 ›
          </Link>
        </>
      )}
    </div>
  );
}

function Card({
  badge,
  bigText,
  subText,
  note,
}: {
  badge: string;
  bigText: string;
  subText: string;
  note?: string;
}) {
  return (
    <div className="card px-4 py-4">
      <div className="text-[11px] text-ink-muted">{badge}</div>
      <div className="mt-1.5 text-[19px] font-medium leading-tight">{bigText}</div>
      <div className="text-[12px] text-ink-soft mt-1">{subText}</div>
      {note && <div className="text-[10px] text-ink-muted mt-2">{note}</div>}
    </div>
  );
}

function WeekdayBar({ weekday, weekend }: { weekday: number; weekend: number }) {
  const total = weekday + weekend;
  const wpct = total > 0 ? (weekday / total) * 100 : 0;
  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-3 text-[13px]">
        <span className="w-12 text-ink-muted">주중</span>
        <div className="flex-1 h-2.5 rounded-full bg-[var(--surface-soft)] overflow-hidden">
          <span className="block h-full bg-teal-600" style={{ width: `${wpct}%` }} />
        </div>
        <span className="w-24 text-right tabular text-ink-soft">
          {formatKRW(weekday, { precision: "man" })}
        </span>
      </div>
      <div className="flex items-center gap-3 text-[13px]">
        <span className="w-12 text-ink-muted">주말</span>
        <div className="flex-1 h-2.5 rounded-full bg-[var(--surface-soft)] overflow-hidden">
          <span className="block h-full bg-coral-600" style={{ width: `${100 - wpct}%` }} />
        </div>
        <span className="w-24 text-right tabular text-ink-soft">
          {formatKRW(weekend, { precision: "man" })}
        </span>
      </div>
    </div>
  );
}

function makeHeadline(i: MonthlyInsights): string {
  if (i.totalExpense === 0 && i.totalIncome === 0) return "기록된 거래가 없어요";
  if (i.balance > 0) {
    return `이번달 ${formatKRW(i.balance, { precision: "man" })} 모았어요. ${i.topCategory ? i.topCategory.name + " 비중이 가장 컸고요." : ""}`;
  }
  if (i.balance < 0) {
    return `이번달 ${formatKRW(Math.abs(i.balance), { precision: "man" })} 더 썼어요. ${i.topCategory ? i.topCategory.name + " 한 번 살펴볼까요?" : ""}`;
  }
  return "수입과 지출이 비슷해요";
}

function makeWeekdayInsight(i: MonthlyInsights): string {
  const w = i.weekdayExpense;
  const e = i.weekendExpense;
  if (w === 0 && e === 0) return "데이터가 부족해요";
  const ratio = e === 0 ? 0 : w / e;
  if (ratio > 2) return "주중에 주로 쓰시네요 — 출퇴근·평일 식사 영향이 클 거예요";
  if (ratio < 0.5) return "주말에 더 많이 쓰시네요 — 외식·여가가 큰 비중일 가능성이 높아요";
  return "주중·주말 비슷한 패턴이에요";
}

function makeDeltaInsight(delta: number): string {
  if (delta > 30) return "지난달보다 많이 늘었어요. 한 번 짚어볼 만해요";
  if (delta > 10) return "조금 늘었네요. 어디서 늘었는지 카테고리로 확인해보세요";
  if (delta < -30) return "확 줄었네요! 어떻게 줄였는지 기억해두세요";
  if (delta < -10) return "조금 줄였어요. 좋은 흐름이에요";
  return "지난달과 비슷해요";
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const day = new Date(y, m - 1, d).getDay();
  return `${m}월 ${d}일 (${DAY_NAMES[day]})`;
}

function pct(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return Math.round((part / whole) * 100);
}
