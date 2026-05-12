import Link from "next/link";
import { getAccounts, getCategoryTree, getRecurringList } from "@/lib/data";
import { FixedExpensesEditor } from "./FixedExpensesEditor";

export default async function FixedExpensesPage() {
  const [recurring, categories, accounts] = await Promise.all([
    getRecurringList(),
    getCategoryTree(),
    getAccounts(),
  ]);

  return (
    <div className="px-5 pt-4 pb-6 space-y-4">
      <header className="flex items-center gap-3 pt-2">
        <Link
          href="/settings"
          aria-label="설정으로"
          className="w-10 h-10 grid place-items-center rounded-full bg-[var(--surface-soft)] text-ink-soft text-[18px]"
        >
          ‹
        </Link>
        <h1 className="text-[20px] font-medium leading-tight">고정 수입·지출</h1>
      </header>

      <div className="rounded-2xl bg-[var(--surface-soft)] px-4 py-3 text-[13px] text-ink-soft leading-relaxed">
        여기에 등록된 항목은 매월 지정한 날짜에 거래내역으로
        <b className="text-ink"> 자동 기록</b>돼요.
        월간 리포트의 고정/유동 비중에도 반영됩니다.
      </div>

      <FixedExpensesEditor
        recurring={recurring}
        categories={categories}
        accounts={accounts}
      />
    </div>
  );
}
