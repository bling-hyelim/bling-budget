import Link from "next/link";
import { getBudgetsByMonth, getCategoryTree } from "@/lib/data";
import { BudgetEditor } from "./BudgetEditor";

export default async function BudgetSettingsPage() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const [categories, budgets] = await Promise.all([
    getCategoryTree(),
    getBudgetsByMonth(year, month),
  ]);

  // 지출 대분류만
  const expenseCategories = categories.filter((c) => c.kind === "expense");

  return (
    <div className="px-4 pt-4 space-y-3">
      <header className="flex items-center gap-3 pt-1">
        <Link href="/settings" className="text-[17px] text-ink-soft">
          ‹
        </Link>
        <h1 className="text-[18px] font-medium flex-1">
          예산 설정 — {year}년 {month}월
        </h1>
      </header>
      <BudgetEditor
        year={year}
        month={month}
        categories={expenseCategories}
        budgets={budgets}
      />
    </div>
  );
}
