"use client";

import { useState, useTransition } from "react";
import clsx from "clsx";
import { upsertAccount, archiveAccount } from "@/app/actions";
import type { AccountRow } from "@/lib/data";
import { getAccountRole, type AccountRole } from "@/lib/accountRole";
import { formatKRW } from "@/lib/formatKorean";

interface Props {
  accounts: AccountRow[];
}

const TYPE_OPTIONS: { value: string; label: string; role: AccountRole }[] = [
  // 입출금
  { value: "checking",    label: "입출금 통장", role: "checking" },
  { value: "cash",        label: "현금",        role: "checking" },
  { value: "pay_app",     label: "페이",        role: "checking" },
  // 지출수단
  { value: "credit_card", label: "신용카드",    role: "spending" },
  { value: "debit_card",  label: "체크카드",    role: "spending" },
  // 저축·투자
  { value: "savings",     label: "저축/투자",   role: "savings"  },
  { value: "asset",       label: "기타 자산",   role: "savings"  },
  // 부채
  { value: "loan",        label: "대출",        role: "debt"     },
];

const ROLE_LABELS: { role: AccountRole; title: string; hint: string }[] = [
  { role: "checking", title: "입출금",     hint: "예금, 현금, 페이" },
  { role: "spending", title: "지출수단",   hint: "신용카드, 체크카드" },
  { role: "savings",  title: "저축·투자",  hint: "적금, 주식, 청약, 연금" },
  { role: "debt",     title: "대출",       hint: "마이너스 잔액으로 표시" },
];

export function AccountsEditor({ accounts }: Props) {
  const [editing, setEditing] = useState<AccountRow | null>(null);
  const [adding, setAdding] = useState(false);
  const [defaultRole, setDefaultRole] = useState<AccountRole>("checking");
  const [err, setErr] = useState<string | null>(null);

  // role 별 그룹화
  const grouped: Record<AccountRole, AccountRow[]> = {
    checking: [],
    spending: [],
    savings: [],
    debt: [],
  };
  for (const a of accounts) {
    grouped[a.role].push(a);
  }

  return (
    <div className="space-y-5">
      {err && (
        <div className="rounded-xl bg-coral-50 px-3 py-2 text-[13px] text-coral-800">
          {err}
        </div>
      )}

      {ROLE_LABELS.map((rl) => (
        <section key={rl.role}>
          <div className="flex items-baseline justify-between px-1 mb-2">
            <h3 className="text-[14px] font-medium">{rl.title}</h3>
            <span className="text-[11px] text-ink-muted">{rl.hint}</span>
          </div>
          <ul className="space-y-1.5">
            {grouped[rl.role].map((a) => {
              const isDebt = rl.role === "debt";
              const displayInit = isDebt ? -Math.abs(a.initial_balance) : a.initial_balance;
              return (
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
                      {labelForType(a.type)} · 시작{" "}
                      <span className={displayInit < 0 ? "text-coral-800" : ""}>
                        {formatKRW(displayInit, { precision: "exact" })}
                      </span>
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
              );
            })}
            {grouped[rl.role].length === 0 && (
              <li className="rounded-2xl bg-[var(--surface-soft)]/50 px-3.5 py-3 text-[13px] text-ink-muted">
                없음
              </li>
            )}
            <li>
              <button
                onClick={() => {
                  setAdding(true);
                  setEditing(null);
                  setDefaultRole(rl.role);
                }}
                className="w-full px-3 py-2.5 rounded-2xl border border-dashed border-ink-line text-[13px] text-ink-muted"
              >
                ＋ {rl.title} 추가
              </button>
            </li>
          </ul>
        </section>
      ))}

      {(editing || adding) && (
        <AccountForm
          existing={editing}
          defaultRole={defaultRole}
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
  defaultRole,
  onClose,
  onError,
}: {
  existing: AccountRow | null;
  defaultRole: AccountRole;
  onClose: () => void;
  onError: (msg: string) => void;
}) {
  const initialType =
    existing?.type ?? TYPE_OPTIONS.find((o) => o.role === defaultRole)?.value ?? "checking";
  const [name, setName] = useState(existing?.name ?? "");
  const [type, setType] = useState(initialType);
  const [bal, setBal] = useState(String(existing?.initial_balance ?? 0));
  const [pending, startTransition] = useTransition();

  const role = getAccountRole(type);
  const isDebt = role === "debt";
  const canSave = name.trim().length > 0;

  const handleSave = () => {
    if (!canSave) return;
    startTransition(async () => {
      // 대출은 양수로 입력받아도 |amount| 로 저장 (자산 페이지에서 -|amount| 로 표시)
      let amount = Number(bal.replace(/[^0-9-]/g, "")) || 0;
      if (isDebt) amount = Math.abs(amount);
      const res = await upsertAccount({
        id: existing?.id,
        name: name.trim(),
        type,
        initial_balance: amount,
      });
      if (!res.ok) {
        onError(res.error);
        return;
      }
      onClose();
    });
  };

  return (
    <div className="rounded-2xl border border-coral-600 bg-[var(--surface)] p-4 space-y-3 sticky bottom-4">
      <div className="text-[15px] font-medium">
        {existing ? "수정" : `새 ${ROLE_LABELS.find((r) => r.role === role)?.title ?? "계좌"}`}
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
        <label className="text-[12px] text-ink-muted">
          {isDebt ? "잔여 대출 (원)" : "시작 잔액 (원)"}
        </label>
        <input
          inputMode="numeric"
          value={bal}
          onChange={(e) => setBal(e.target.value.replace(/[^0-9-]/g, ""))}
          placeholder="0"
          className="w-full mt-1 px-3 py-2 rounded-xl bg-[var(--surface-soft)] text-[15px] outline-none tabular"
        />
        <p className="text-[12px] text-ink-muted mt-1">
          {isDebt
            ? "갚을 금액을 양수로 입력하세요. 자산 합계에서 자동 차감돼요"
            : "가입 시점의 잔액을 입력하면 이후 거래가 누적되어 현재 잔액이 계산돼요"}
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
