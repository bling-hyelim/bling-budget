"use client";

import { useState, useTransition } from "react";
import clsx from "clsx";
import { upsertAccount, archiveAccount } from "@/app/actions";
import type { AccountRow } from "@/lib/data";
import { formatKRW } from "@/lib/formatKorean";

interface Props {
  accounts: AccountRow[];
}

const TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "cash", label: "현금" },
  { value: "checking", label: "입출금 통장" },
  { value: "savings", label: "저축/투자" },
  { value: "credit_card", label: "신용카드" },
  { value: "debit_card", label: "체크카드" },
  { value: "pay_app", label: "페이" },
  { value: "loan", label: "대출" },
  { value: "asset", label: "기타 자산" },
];

export function AccountsEditor({ accounts }: Props) {
  const [editing, setEditing] = useState<AccountRow | null>(null);
  const [adding, setAdding] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      {err && (
        <div className="rounded-xl bg-coral-50 px-3 py-2 text-[13px] text-coral-800">
          {err}
        </div>
      )}

      <ul className="space-y-1.5">
        {accounts.map((a) => (
          <li
            key={a.id}
            className="rounded-2xl bg-[var(--surface-soft)] px-3.5 py-3 flex items-center justify-between"
          >
            <button
              onClick={() => {
                setEditing(a);
                setAdding(false);
              }}
              className="flex-1 text-left"
            >
              <div className="text-[15px]">{a.name}</div>
              <div className="text-[12px] text-ink-muted mt-0.5">
                {labelForType(a.type)} · 시작 잔액 {formatKRW(a.initial_balance, { precision: "exact" })}
              </div>
            </button>
            <button
              onClick={async () => {
                if (!confirm("이 계좌를 숨길까요?")) return;
                const r = await archiveAccount(a.id);
                if (!r.ok) setErr(r.error);
              }}
              className="text-[12px] text-ink-muted px-2"
            >
              숨김
            </button>
          </li>
        ))}
      </ul>

      <button
        onClick={() => {
          setAdding(true);
          setEditing(null);
        }}
        className="w-full px-3 py-3 rounded-2xl border border-dashed border-ink-line text-[15px] text-ink-muted"
      >
        ＋ 새 계좌 / 카드 추가
      </button>

      {(editing || adding) && (
        <AccountForm
          existing={editing}
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

function AccountForm({
  existing,
  onClose,
  onError,
}: {
  existing: AccountRow | null;
  onClose: () => void;
  onError: (msg: string) => void;
}) {
  const [name, setName] = useState(existing?.name ?? "");
  const [type, setType] = useState(existing?.type ?? "checking");
  const [bal, setBal] = useState(String(existing?.initial_balance ?? 0));
  const [pending, startTransition] = useTransition();

  const canSave = name.trim().length > 0;

  const handleSave = () => {
    if (!canSave) return;
    startTransition(async () => {
      const res = await upsertAccount({
        id: existing?.id,
        name: name.trim(),
        type,
        initial_balance: Number(bal.replace(/[^0-9-]/g, "")) || 0,
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
        {existing ? "수정" : "새 계좌"}
      </div>
      <div>
        <label className="text-[12px] text-ink-muted">이름</label>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="예: 카카오뱅크, 현대카드"
          className="w-full mt-1 px-3 py-2 rounded-xl bg-[var(--surface-soft)] text-[15px] outline-none"
        />
      </div>
      <div>
        <label className="text-[12px] text-ink-muted">종류</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="w-full mt-1 px-3 py-2 rounded-xl bg-[var(--surface-soft)] text-[15px] outline-none"
        >
          {TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-[12px] text-ink-muted">시작 잔액 (원)</label>
        <input
          inputMode="numeric"
          value={bal}
          onChange={(e) => setBal(e.target.value.replace(/[^0-9-]/g, ""))}
          placeholder="0"
          className="w-full mt-1 px-3 py-2 rounded-xl bg-[var(--surface-soft)] text-[15px] outline-none tabular"
        />
        <p className="text-[12px] text-ink-muted mt-1">
          가입 시점의 잔액을 입력하면, 이후 거래가 누적되어 현재 잔액이 계산돼요
        </p>
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

function labelForType(type: string): string {
  return TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type;
}
