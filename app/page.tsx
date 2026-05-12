import { Suspense } from "react";
import Link from "next/link";
import { processRecurringDue } from "@/lib/data";
import { AssetHero, AssetHeroSkeleton } from "@/app/_home/AssetHero";
import { MonthSection, MonthSectionSkeleton } from "@/app/_home/MonthSection";
import { YearlyTrend, YearlyTrendSkeleton } from "@/app/_home/YearlyTrend";

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
  const accent = VIEW_COLORS[catView];
  const isCurrentMonth = month === realMonth && year === realYear;
  const isCurrentYear = year === realYear;

  // 만기 고정비 자동 기록 — 비어있을 때는 SELECT 1번으로 매우 빠름
  await processRecurringDue();

  return (
    <div className="px-5 pt-3 pb-6 space-y-7">
      <HomeHeader />

      {/* 1. 현재 총 자산 */}
      <section>
        <SectionHeader title="현재 총 자산" cta="상세" href="/assets" />
        <Suspense fallback={<AssetHeroSkeleton />}>
          <AssetHero />
        </Suspense>
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

        <Suspense fallback={<MonthSectionSkeleton />}>
          <MonthSection
            year={year}
            month={month}
            catView={catView}
            accentColor={accent.accent}
            accentSoftColor={accent.soft}
          />
        </Suspense>
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
        <Suspense fallback={<YearlyTrendSkeleton />}>
          <YearlyTrend
            year={year}
            month={month}
            catView={catView}
            accentColor={accent.accent}
            accentSoftColor={accent.soft}
            realMonth={realMonth}
            realYear={realYear}
          />
        </Suspense>
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
  const prev =
    month === 1 ? { y: year - 1, m: 12 } : { y: year, m: month - 1 };
  const next =
    month === 12 ? { y: year + 1, m: 1 } : { y: year, m: month + 1 };

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
