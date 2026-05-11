"use client";

import { useState, useTransition } from "react";
import clsx from "clsx";
import { upsertBudget } from "@/app/actions";
import type { BudgetWithProgress, CategoryTreeNode } from "@/lib/data";

interface Props {
  year: number;
  month: number;
  categories: CategoryTreeNode[];
  budgets: BudgetWithProgress[];
}

export function BudgetEditor({ year, month, categories, budgets }: Props) {
  const initialMap = new Map(budgets.map((b) => [b.category_id, b.budget]));
  const [values, setValues] = useState<Record<string, string>>(() => {
    const o: Record<string, string> = {};
    for (const c of categories) {
      o[c.id] = String(initialMap.get(c.id) ?? "");
    }
    return o;
  });
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  const handleSave = (categoryId: string) => {
    const num = Number(values[categoryId]?.replace(/[^0-9]/g, "")) || 0;
    startTransition(async () => {
      const res = await upsertBudget({
        category_id: categoryId,
        year,
        month,
        amount: num,
      });
      if (!res.ok) {
        setErr(res.error);
        return;
      }
      setSavedId(categoryId);
      setTimeout(() => setSavedId(null), 1000);
    });
  };

  const total = Object.values(values)
    .map((v) => Number(v.replace(/[^0-9]/g, "")) || 0)
    .reduce((s, n) => s + n, 0);

  return (
    <div className="space-y-3">
      {err && (
        <div className="rounded-xl bg-coral-50 px-3 py-2 text-[13px] text-coral-800">
          {err}
        </div>
      )}

      <div className="rounded-2xl bg-coral-50 px-4 py-3 flex items-center justify-between">
        <span className="text-[13px] text-coral-800">총 예산</span>
        <span className="text-[18px] font-medium text-coral-900 tabular">
          {total.toLocaleString("ko-KR")}원
        </span>
      </div>

      <ul className="space-y-1.5">
        {categories.map((c) => (
          <li
            key={c.id}
            className="rounded-2xl bg-[var(--surface-soft)] px-3.5 py-3"
          >
            <div className="flex items-center gap-2.5 mb-2">
              <span
                className="w-2.5 h-2.5 rounded-sm"
                style={{ background: c.color ?? "#888780" }}
              />
              <span className="text-[15px] flex-1">{c.name}</span>
              {savedId === c.id && (
                <span className="text-[12px] text-teal-800">✓ 저장됨</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <input
                inputMode="numeric"
                value={
                  Number(values[c.id]?.replace(/[^0-9]/g, "") || 0) > 0
                    ? Number(values[c.id].replace(/[^0-9]/g, "")).toLocaleString("ko-KR")
                    : values[c.id] ?? ""
                }
                onChange={(e) =>
                  setValues((v) => ({
                    ...v,
                    [c.id]: e.target.value.replace(/[^0-9]/g, ""),
                  }))
                }
                placeholder="0"
                className="flex-1 px-3 py-2 rounded-xl bg-[var(--surface)] text-[15px] outline-none tabular text-right"
              />
              <span className="text-[14px] text-ink-muted">원</span>
              <button
                onClick={() => handleSave(c.id)}
                disabled={pending}
                className={clsx(
                  "px-3 py-2 rounded-xl text-[13px] font-medium",
                  pending
                    ? "bg-[var(--surface-soft)] text-ink-muted"
                    : "bg-black text-white"
                )}
              >
                저장
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
