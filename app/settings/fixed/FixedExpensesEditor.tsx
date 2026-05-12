"use client";

import { useMemo, useState, useTransition } from "react";
import clsx from "clsx";
import { upsertRecurring, archiveRecurring } from "@/app/actions";
import { formatKRW } from "@/lib/formatKorean";
import type { AccountRow, CategoryTreeNode, RecurringRow } from "@/lib/data";

interface Props {
  recurring: RecurringRow[];
  categories: CategoryTreeNode[];
  accounts: AccountRow[];
}

export function FixedExpensesEditor({ recurring, categories, accounts }: Props) {
  const [editing, setEditing] = useState<RecurringRow | null>(null);
  const [adding, setAdding] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const expenseList = recurring.filter((r) => r.type === "expense");
  const incomeList = recurring.filter((r) => r.type === "income");

  return (
    <div className="space-y-5">
      {err && (
        <div className="rounded-xl bg-coral-50 px-3 py-2 text-[13px] text-coral-800">
          {err}
        </div>
      )}

      <Section
        title="고정 지출"
        empty="등록된 고정 지출이 없어요"
        items={expenseList}
        onEdit={(r) => {
          setEditing(r);
          setAdding(false);
        }}
        onArchive={async (id) => {
          if (!confirm("이 고정 지출을 삭제할까요?")) return;
          const res = await archiveRecurring(id);
          if (!res.ok) setErr(res.error);
        }}
      />

      <Section
        title="고정 수입"
        empty="등록된 고정 수입이 없어요"
        items={incomeList}
        onEdit={(r) => {
          setEditing(r);
          setAdding(false);
        }}
        onArchive={async (id) => {
          if (!confirm("이 고정 수입을 삭제할까요?")) return;
          const res = await archiveRecurring(id);
          if (!res.ok) setErr(res.error);
        }}
      />

      <button
        onClick={() => {
          setAdding(true);
          setEditing(null);
        }}
        className="w-full py-3 rounded-2xl bg-black text-white text-[15px] font-medium"
      >
        ＋ 고정 항목 추가
      </button>

      {(editing || adding) && (
        <RecurringForm
          existing={editing}
          categories={categories}
          accounts={accounts}
          onClose={() => {
            setEditing(null);
            setAdding(false);
          }}
          onError={setErr}
        />
      )}
    </div>
  );
}

function Section({
  title,
  empty,
  items,
  onEdit,
  onArchive,
}: {
  title: string;
  empty: string;
  items: RecurringRow[];
  onEdit: (r: RecurringRow) => void;
  onArchive: (id: string) => void | Promise<void>;
}) {
  return (
    <section>
      <h3 className="text-[14px] font-medium px-1 mb-2">{title}</h3>
      {items.length === 0 ? (
        <div className="card px-4 py-5 text-center text-[13px] text-ink-muted">
          {empty}
        </div>
      ) : (
        <ul className="space-y-1.5">
          {items.map((r) => (
            <li
              key={r.id}
              className="rounded-2xl bg-[var(--surface-soft)] px-3.5 py-3 flex items-center justify-between"
            >
              <button onClick={() => onEdit(r)} className="flex-1 text-left">
                <div className="text-[15px]">
                  {r.name}{" "}
                  <span className="ml-1 text-[12px] text-ink-muted">매월 {r.day_of_month}일</span>
                </div>
                <div className="text-[12px] text-ink-muted mt-0.5 tabular">
                  {formatKRW(r.amount, { precision: "exact" })}
                  {r.account_name && ` · ${r.account_name}`}
                  {r.category_name && ` · ${r.category_name}`}
                </div>
              </button>
              <button
                onClick={() => onArchive(r.id)}
                className="text-[12px] text-ink-muted px-2"
              >
                삭제
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function RecurringForm({
  existing,
  categories,
  accounts,
  onClose,
  onError,
}: {
  existing: RecurringRow | null;
  categories: CategoryTreeNode[];
  accounts: AccountRow[];
  onClose: () => void;
  onError: (msg: string) => void;
}) {
  const [name, setName] = useState(existing?.name ?? "");
  const [type, setType] = useState<"income" | "expense">(existing?.type ?? "expense");
  const [amountStr, setAmountStr] = useState(String(existing?.amount ?? ""));
  const [day, setDay] = useState<number>(existing?.day_of_month ?? new Date().getDate());
  const [categoryId, setCategoryId] = useState<string | null>(existing?.category_id ?? null);
  const [subcategoryId, setSubcategoryId] = useState<string | null>(
    existing?.subcategory_id ?? null
  );
  const [accountId, setAccountId] = useState<string | null>(existing?.account_id ?? null);
  const [pending, startTransition] = useTransition();

  const amount = Number(amountStr) || 0;

  const visibleParents = useMemo(
    () => categories.filter((c) => c.kind === type),
    [categories, type]
  );
  const currentParent = visibleParents.find((c) => c.id === categoryId) ?? null;
  // 결제수단: 입출금 + 지출수단 (저축은 고정거래 출금처로 부적합)
  const visibleAccounts = accounts.filter(
    (a) => a.role === "checking" || a.role === "spending"
  );

  const canSave = name.trim().length > 0 && amount > 0 && !!accountId;

  const handleSave = () => {
    if (!canSave) return;
    startTransition(async () => {
      const res = await upsertRecurring({
        id: existing?.id,
        name: name.trim(),
        type,
        amount,
        day_of_month: day,
        category_id: categoryId,
        subcategory_id: subcategoryId,
        account_id: accountId,
      });
      if (!res.ok) {
        onError(res.error);
        return;
      }
      onClose();
    });
  };

  return (
    <div className="rounded-2xl border border-coral-600 bg-[var(--surface)] p-4 space-y-3">
      <div className="text-[15px] font-medium">
        {existing ? "고정 항목 수정" : "새 고정 항목"}
      </div>

      <div>
        <label className="text-[12px] text-ink-muted">종류</label>
        <div className="mt-1 flex gap-1.5">
          <button
            type="button"
            onClick={() => {
              setType("expense");
              setCategoryId(null);
              setSubcategoryId(null);
            }}
            className={clsx(
              "flex-1 py-2 rounded-xl text-[14px]",
              type === "expense"
                ? "bg-coral-50 text-coral-800 font-medium"
                : "bg-[var(--surface-soft)] text-ink-muted"
            )}
          >
            지출
          </button>
          <button
            type="button"
            onClick={() => {
              setType("income");
              setCategoryId(null);
              setSubcategoryId(null);
            }}
            className={clsx(
              "flex-1 py-2 rounded-xl text-[14px]",
              type === "income"
                ? "bg-teal-50 text-teal-800 font-medium"
                : "bg-[var(--surface-soft)] text-ink-muted"
            )}
          >
            수입
          </button>
        </div>
      </div>

      <div>
        <label className="text-[12px] text-ink-muted">이름</label>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={type === "expense" ? "예: 월세, 통신비, 넷플릭스" : "예: 월급, 부수입"}
          className="w-full mt-1 px-3 py-2 rounded-xl bg-[var(--surface-soft)] text-[15px] outline-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[12px] text-ink-muted">금액 (원)</label>
          <input
            inputMode="numeric"
            value={amountStr}
            onChange={(e) => setAmountStr(e.target.value.replace(/[^0-9]/g, ""))}
            placeholder="0"
            className="w-full mt-1 px-3 py-2 rounded-xl bg-[var(--surface-soft)] text-[15px] outline-none tabular"
          />
        </div>
        <div>
          <label className="text-[12px] text-ink-muted">매월</label>
          <div className="flex items-center gap-1 mt-1">
            <input
              inputMode="numeric"
              value={day}
              onChange={(e) => {
                const n = Number(e.target.value.replace(/[^0-9]/g, ""));
                if (n >= 1 && n <= 31) setDay(n);
                else if (e.target.value === "") setDay(1);
              }}
              className="flex-1 px-3 py-2 rounded-xl bg-[var(--surface-soft)] text-[15px] outline-none tabular"
            />
            <span className="text-[13px] text-ink-muted">일</span>
          </div>
        </div>
      </div>

      <div>
        <label className="text-[12px] text-ink-muted">결제수단</label>
        <select
          value={accountId ?? ""}
          onChange={(e) => setAccountId(e.target.value || null)}
          className="w-full mt-1 px-3 py-2 rounded-xl bg-[var(--surface-soft)] text-[15px] outline-none"
        >
          <option value="">선택하세요</option>
          {visibleAccounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-[12px] text-ink-muted">카테고리 (선택)</label>
        <div className="grid grid-cols-2 gap-2 mt-1">
          <select
            value={categoryId ?? ""}
            onChange={(e) => {
              setCategoryId(e.target.value || null);
              setSubcategoryId(null);
            }}
            className="px-3 py-2 rounded-xl bg-[var(--surface-soft)] text-[15px] outline-none"
          >
            <option value="">대분류</option>
            {visibleParents.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            value={subcategoryId ?? ""}
            onChange={(e) => setSubcategoryId(e.target.value || null)}
            disabled={!currentParent}
            className="px-3 py-2 rounded-xl bg-[var(--surface-soft)] text-[15px] outline-none disabled:opacity-50"
          >
            <option value="">소분류</option>
            {currentParent?.children.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <button
          onClick={handleSave}
          disabled={!canSave || pending}
          className={clsx(
            "flex-1 py-2.5 rounded-xl text-[15px] font-medium",
            canSave && !pending
              ? "bg-black text-white"
              : "bg-[var(--surface-soft)] text-ink-muted"
          )}
        >
          {pending ? "저장 중..." : "저장"}
        </button>
        <button
          onClick={onClose}
          className="px-4 py-2.5 rounded-xl text-[15px] text-ink-soft"
        >
          취소
        </button>
      </div>
    </div>
  );
}
