import clsx from "clsx";
import Link from "next/link";
import { KoreanAmount } from "@/components/KoreanAmount";
import { formatKRW } from "@/lib/formatKorean";
import { getBudgetsByMonth, type BudgetWithProgress } from "@/lib/data";

export default async function BudgetPage({
  searchParams,
}: {
  searchParams: { y?: string; m?: string };
}) {
  const now = new Date();
  const realYear = now.getFullYear();
  const realMonth = now.getMonth() + 1;
  const year = clampYear(searchParams.y, realYear);
  const month = clampMonth(searchParams.m, realMonth);
  const budgets = await getBudgetsByMonth(year, month);

  const totalBudget = budgets.reduce((s, b) => s + b.budget, 0);
  const totalSpent = budgets.reduce((s, b) => s + b.spent, 0);
  const remaining = totalBudget - totalSpent;
  const usedPct = totalBudget > 0 ? Math.min(Math.round((totalSpent / totalBudget) * 100), 999) : 0;

  const today = new Date(year, month - 1, now.getDate());
  const lastDay = new Date(year, month, 0);
  const daysLeft = Math.max(1, lastDay.getDate() - today.getDate() + 1);
  const perDay = totalBudget > 0 ? Math.max(0, Math.floor(remaining / daysLeft)) : 0;

  const warning = budgets.find((b) => b.budget > 0 && b.spent / b.budget >= 0.9);
  const sorted = [...budgets].sort((a, b) => b.pct - a.pct);

  return (
    <div className="px-5 pt-4 pb-6 space-y-5">
      <header className="flex items-center justify-between pt-2">
        <div>
          <h1 className="text-[24px] font-medium leading-tight">예산</h1>
          <div className="flex items-center gap-2 text-[13px] text-ink-muted mt-1">
            <Link
              href={`/budget?${new URLSearchParams({ y: String(month === 1 ? year - 1 : year), m: String(month === 1 ? 12 : month - 1) }).toString()}`}
              aria-label="이전 달"
              className="w-5 h-5 grid place-items-center"
            >
              ‹
            </Link>
            <span>{year}년 {month}월</span>
            <Link
              href={`/budget?${new URLSearchParams({ y: String(month === 12 ? year + 1 : year), m: String(month === 12 ? 1 : month + 1) }).toString()}`}
              aria-label="다음 달"
              className="w-5 h-5 grid place-items-center"
            >
              ›
            </Link>
          </div>
        </div>
        <Link href="/settings/budget" aria-label="예산 설정" className="w-11 h-11 grid place-items-center rounded-full bg-[var(--surface-soft)] text-ink-soft">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19 12a7 7 0 0 0-.2-1.7l2-1.5-2-3.4-2.3 1a7 7 0 0 0-3-1.7L13 2h-4l-.4 2.7a7 7 0 0 0-3 1.7l-2.3-1-2 3.4 2 1.5A7 7 0 0 0 5 12c0 .6.1 1.2.2 1.7l-2 1.5 2 3.4 2.3-1a7 7 0 0 0 3 1.7L11 22h4l.4-2.7a7 7 0 0 0 3-1.7l2.3 1 2-3.4-2-1.5c.1-.5.2-1.1.2-1.7z" />
          </svg>
        </Link>
      </header>

      {budgets.length === 0 ? (
        <div className="card px-5 py-16 text-center">
          <div className="text-[15px] text-ink-soft">아직 예산이 없어요</div>
          <Link
            href="/settings/budget"
            className="inline-block mt-4 px-5 py-2.5 rounded-full bg-black text-white text-[14px] font-medium"
          >
            ＋ 예산 설정하기
          </Link>
        </div>
      ) : (
        <>
          <div className="card px-6 py-6" style={{ background: "#000000" }}>
            <div className="text-[14px] text-white/65">남은 예산</div>
            <div className="mt-1 mb-4 text-[36px] font-medium tracking-tight text-white tabular leading-none">
              <KoreanAmount value={remaining} precision="exact" fadeSuffix suffixClassName="text-white/40" />
            </div>
            <div className="h-2.5 rounded-full bg-white/15 overflow-hidden">
              <span
                className="block h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(usedPct, 100)}%`,
                  background: usedPct >= 95 ? "#FF8FA6" : usedPct >= 80 ? "#FFC371" : "#FFFFFF",
                }}
              />
            </div>
            <div className="mt-3 flex justify-between text-[13px] text-white/70">
              <span>
                예산 <KoreanAmount value={totalBudget} precision="man" />
              </span>
              <span className="font-medium text-white">{usedPct}% 사용</span>
            </div>
            <div className="mt-1 flex justify-between text-[13px] text-white/55">
              <span>하루 평균 가능</span>
              <span className="tabular">≈ {formatKRW(perDay, { precision: "exact" })}</span>
            </div>
          </div>

          {warning && (
            <div className="card px-5 py-4 flex items-center gap-3" style={{ background: "var(--coral-50)" }}>
              <span className="grid place-items-center w-9 h-9 rounded-full bg-coral-600 text-white text-[16px] font-medium flex-shrink-0">
                !
              </span>
              <div className="text-[14px] text-coral-900 leading-relaxed">
                <span className="font-medium text-coral-950">
                  {warning.category_name} 예산 {warning.pct}%
                </span>{" "}
                도달 — 이번달 살짝 조절해볼까요?
              </div>
            </div>
          )}

          <section>
            <div className="flex items-center justify-between mb-4 px-1">
              <h2 className="text-[18px] font-medium">카테고리별</h2>
              <Link href="/settings/budget" className="text-[13px] text-coral-800 font-medium">
                편집 ›
              </Link>
            </div>
            <ul className="card px-5 py-4 space-y-5">
              {sorted.map((b) => (
                <BudgetRowItem key={b.category_id} row={b} />
              ))}
            </ul>
          </section>
        </>
      )}
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

function BudgetRowItem({ row }: { row: BudgetWithProgress }) {
  const pct = row.pct;
  return (
    <li>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2.5">
          <span
            className="block w-3 h-3 rounded-[3px]"
            style={{ background: row.color }}
          />
          <span className="text-[15px]">{row.category_name}</span>
        </div>
        <span
          className={clsx(
            "text-[14px] tabular",
            pct >= 95 && "text-coral-800 font-medium",
            pct < 95 && "text-ink-muted"
          )}
        >
          {pct}%
        </span>
      </div>
      <div className="h-2 rounded-full bg-[var(--surface-soft)] overflow-hidden">
        <span
          className="block h-full rounded-full"
          style={{ width: `${Math.min(pct, 100)}%`, background: row.color }}
        />
      </div>
      <div className="mt-1.5 flex justify-between text-[12px] text-ink-muted tabular">
        <span>
          <KoreanAmount value={row.spent} precision="exact" /> 사용
        </span>
        <span>
          예산 <KoreanAmount value={row.budget} precision="man" />
        </span>
      </div>
    </li>
  );
}
