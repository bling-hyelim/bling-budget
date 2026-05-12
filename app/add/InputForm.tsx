"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { Chip } from "@/components/Chip";
import { toKoreanReading } from "@/lib/formatKorean";
import {
  createTransaction,
  updateTransaction,
  deleteTransaction,
} from "@/app/actions";
import type { AccountRow, CategoryTreeNode } from "@/lib/data";
import { getAccountRole } from "@/lib/accountRole";

type TxType = "income" | "expense" | "transfer";
type TxMode = "income" | "expense" | "transfer" | "savings";

interface InitialValues {
  id: string;
  type: TxType;
  amount: number;
  categoryId: string | null;
  subcategoryId: string | null;
  accountId: string | null;
  toAccountId: string | null;
  memo: string;
  occurredOn: string;
  isFixed?: boolean;
}

interface Props {
  categories: CategoryTreeNode[];
  accounts: AccountRow[];
  mode?: "create" | "edit";
  initial?: InitialValues;
}

/** initial.type + toAccount.role 로 모드 추론 */
function inferMode(initial: InitialValues | undefined, accounts: AccountRow[]): TxMode {
  if (!initial) return "expense";
  if (initial.type !== "transfer") return initial.type;
  const to = accounts.find((a) => a.id === initial.toAccountId);
  return to?.role === "savings" ? "savings" : "transfer";
}

export function InputForm({ categories, accounts, mode = "create", initial }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [txMode, setTxMode] = useState<TxMode>(inferMode(initial, accounts));
  const [amountStr, setAmountStr] = useState<string>(
    initial ? String(initial.amount) : ""
  );
  const [categoryId, setCategoryId] = useState<string | null>(initial?.categoryId ?? null);
  const [subcategoryId, setSubcategoryId] = useState<string | null>(
    initial?.subcategoryId ?? null
  );
  const [accountId, setAccountId] = useState<string | null>(initial?.accountId ?? null);
  const [toAccountId, setToAccountId] = useState<string | null>(
    initial?.toAccountId ?? null
  );
  const [memo, setMemo] = useState<string>(initial?.memo ?? "");
  const [occurredOn, setOccurredOn] = useState<string>(initial?.occurredOn ?? todayIso());
  const [isFixed, setIsFixed] = useState<boolean>(initial?.isFixed ?? false);
  const [editingStep, setEditingStep] = useState<number | null>(null);
  const [toast, setToast] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  const amountNum = Number(amountStr) || 0;
  const isTransferLike = txMode === "transfer" || txMode === "savings";

  const visibleParents = useMemo(() => {
    if (txMode === "income") return categories.filter((c) => c.kind === "income");
    if (txMode === "expense") return categories.filter((c) => c.kind === "expense");
    return [];
  }, [txMode, categories]);

  const currentParent = useMemo(
    () => visibleParents.find((c) => c.id === categoryId) ?? null,
    [visibleParents, categoryId]
  );

  const activeStep = useMemo<number>(() => {
    if (editingStep !== null) return editingStep;
    if (isTransferLike) {
      if (!accountId) return 1;
      if (!toAccountId) return 2;
      return 3;
    }
    if (!categoryId) return 1;
    if (!subcategoryId) return 2;
    if (!accountId) return 3;
    return 4;
  }, [isTransferLike, accountId, toAccountId, categoryId, subcategoryId, editingStep]);

  const totalSteps = isTransferLike ? 3 : 4;

  const handleModeChange = (m: TxMode) => {
    setTxMode(m);
    setCategoryId(null);
    setSubcategoryId(null);
    setAccountId(null);
    setToAccountId(null);
    setEditingStep(null);
  };

  const handleAmount = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAmountStr(e.target.value.replace(/[^0-9]/g, ""));
  };

  const handleSelectCategory = (id: string) => {
    if (categoryId !== id) {
      setCategoryId(id);
      setSubcategoryId(null);
    }
    setEditingStep(null);
  };

  const resetForm = () => {
    setAmountStr("");
    setCategoryId(null);
    setSubcategoryId(null);
    setAccountId(null);
    setToAccountId(null);
    setMemo("");
    setOccurredOn(todayIso());
    setIsFixed(false);
    setEditingStep(null);
  };

  const canSave =
    amountNum > 0 &&
    (isTransferLike
      ? !!accountId && !!toAccountId && accountId !== toAccountId
      : !!categoryId && !!subcategoryId && !!accountId);

  const handleSave = () => {
    if (!canSave || !accountId) return;

    startTransition(async () => {
      // 저장 시 type 은 항상 income/expense/transfer 중 하나 (저축은 transfer 로 저장)
      const persistedType: TxType =
        txMode === "savings" ? "transfer" : (txMode as TxType);
      const payload = {
        type: persistedType,
        amount: amountNum,
        occurred_on: occurredOn,
        category_id: isTransferLike ? null : categoryId,
        subcategory_id: isTransferLike ? null : subcategoryId,
        account_id: accountId!,
        to_account_id: isTransferLike ? toAccountId : null,
        memo: memo || undefined,
        is_fixed: isFixed,
      };

      const res =
        mode === "edit" && initial
          ? await updateTransaction(initial.id, payload)
          : await createTransaction(payload);

      if (res.ok) {
        setToast({ kind: "ok", msg: mode === "edit" ? "수정됐어요" : "저장됐어요" });
        if (mode === "create") resetForm();
        setTimeout(() => {
          setToast(null);
          router.push("/transactions");
        }, 700);
      } else {
        setToast({ kind: "err", msg: res.error });
        setTimeout(() => setToast(null), 2500);
      }
    });
  };

  const handleDelete = () => {
    if (!initial || mode !== "edit") return;
    if (!confirm("이 거래를 삭제할까요?")) return;
    startTransition(async () => {
      const res = await deleteTransaction(initial.id);
      if (res.ok) {
        router.push("/transactions");
      } else {
        setToast({ kind: "err", msg: res.error });
      }
    });
  };

  return (
    <div className="px-5 pt-4 pb-6 space-y-4">
      <header className="flex items-center justify-between">
        <Link
          href={mode === "edit" ? "/transactions" : "/"}
          aria-label="닫기"
          className="grid place-items-center w-8 h-8 rounded-full bg-[var(--surface-soft)] text-ink-soft"
        >
          ✕
        </Link>
        <h1 className="text-[17px] font-medium">
          {mode === "edit" ? "거래 수정" : (
            <>
              {txMode === "income"
                ? "수입"
                : txMode === "expense"
                ? "지출"
                : txMode === "savings"
                ? "저축"
                : "이동"} 입력
            </>
          )}
        </h1>
        {mode === "edit" ? (
          <button
            onClick={handleDelete}
            className="text-[13px] text-coral-800 px-2"
          >
            삭제
          </button>
        ) : (
          <span className="text-[13px] text-ink-muted tabular">
            {Math.min(activeStep, totalSteps)} / {totalSteps}
          </span>
        )}
      </header>

      <StepBar total={totalSteps} active={activeStep} />

      <div className="flex gap-1.5">
        <TypeTab label="수입" active={txMode === "income"}   accent="income"   onClick={() => handleModeChange("income")} />
        <TypeTab label="지출" active={txMode === "expense"}  accent="expense"  onClick={() => handleModeChange("expense")} />
        <TypeTab label="이동" active={txMode === "transfer"} accent="transfer" onClick={() => handleModeChange("transfer")} />
        <TypeTab label="저축" active={txMode === "savings"}  accent="savings"  onClick={() => handleModeChange("savings")} />
      </div>
      {txMode === "transfer" && (
        <p className="text-[12px] text-ink-muted px-1 leading-relaxed">
          💡 신용카드 결제, 통장 간 이체 등 단순 자금 이동을 기록해요
        </p>
      )}
      {txMode === "savings" && (
        <p className="text-[12px] text-ink-muted px-1 leading-relaxed">
          💡 적금·주식·청약·연금 등 저축·투자 계좌로 보내는 금액을 기록해요
        </p>
      )}

      <div className="text-center py-2 space-y-2">
        <DateField value={occurredOn} onChange={setOccurredOn} />
        <div>
          <div className="text-[13px] text-ink-muted">금액</div>
          <div className="relative inline-flex items-baseline mt-1">
            <input
              inputMode="numeric"
              autoFocus={mode === "create"}
              placeholder="0"
              value={amountNum > 0 ? amountNum.toLocaleString("ko-KR") : ""}
              onChange={handleAmount}
              className="bg-transparent outline-none text-center font-medium tabular tracking-tight text-[48px] caret-coral-600 placeholder:text-ink-muted/30 placeholder:font-normal w-[12ch] leading-none"
            />
            <span className="ml-1.5 text-[24px] text-ink-muted font-normal">원</span>
          </div>
          <div className={clsx("text-[13px] mt-1", amountNum > 0 ? "text-coral-800" : "text-transparent")}>
            {amountNum > 0 ? toKoreanReading(amountNum) : "0"}
          </div>
        </div>
        {(txMode === "income" || txMode === "expense") && (
          <FixedToggle
            checked={isFixed}
            mode={txMode}
            onChange={() => setIsFixed((v) => !v)}
          />
        )}
      </div>

      {!isTransferLike ? (
        <>
          <StepCard
            num={1}
            title="대분류"
            done={!!categoryId}
            active={activeStep === 1}
            value={visibleParents.find((c) => c.id === categoryId)?.name}
            onEdit={() => setEditingStep(1)}
          >
            <ChipGrid>
              {visibleParents.map((g) => (
                <Chip
                  key={g.id}
                  active={categoryId === g.id}
                  onClick={() => handleSelectCategory(g.id)}
                >
                  {g.name}
                </Chip>
              ))}
            </ChipGrid>
          </StepCard>

          <StepCard
            num={2}
            title="소분류"
            done={!!subcategoryId}
            active={activeStep === 2}
            value={currentParent?.children.find((c) => c.id === subcategoryId)?.name}
            lockedHint={categoryId ? undefined : "대분류 선택 후"}
            onEdit={() => setEditingStep(2)}
          >
            {currentParent ? (
              <ChipGrid>
                {currentParent.children.map((s) => (
                  <Chip
                    key={s.id}
                    active={subcategoryId === s.id}
                    onClick={() => {
                      setSubcategoryId(s.id);
                      setEditingStep(null);
                    }}
                  >
                    {s.name}
                  </Chip>
                ))}
                {currentParent.children.length === 0 && (
                  <span className="text-[13px] text-ink-muted px-2 py-1">
                    소분류가 없어요
                  </span>
                )}
                <Link href="/settings/categories" className="text-[13px] text-coral-800 px-3 py-1.5">
                  ＋ 설정에서 추가
                </Link>
              </ChipGrid>
            ) : null}
          </StepCard>

          <StepCard
            num={3}
            title="결제수단"
            done={!!accountId}
            active={activeStep === 3}
            value={accounts.find((a) => a.id === accountId)?.name}
            lockedHint={
              subcategoryId || currentParent?.children.length === 0
                ? undefined
                : "소분류 선택 후"
            }
            onEdit={() => setEditingStep(3)}
          >
            <AccountChips
              accounts={accounts}
              selected={accountId}
              onSelect={(id) => {
                setAccountId(id);
                setEditingStep(null);
              }}
            />
          </StepCard>

          <StepCard
            num={4}
            title="메모"
            done={memo.length > 0}
            active={activeStep === 4}
            value={memo || undefined}
            optional
            lockedHint={accountId ? undefined : "결제수단 선택 후"}
            onEdit={() => setEditingStep(4)}
          >
            <input
              type="text"
              placeholder="메모를 남겨두면 나중에 찾기 좋아요"
              maxLength={80}
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              className="w-full mt-2 px-3 py-2 text-[14px] rounded-xl bg-[var(--surface-soft)] outline-none placeholder:text-ink-muted/70"
            />
          </StepCard>
        </>
      ) : (
        <>
          <StepCard
            num={1}
            title="출금 계좌"
            done={!!accountId}
            active={activeStep === 1}
            value={accounts.find((a) => a.id === accountId)?.name}
            onEdit={() => setEditingStep(1)}
          >
            <AccountChips
              accounts={accounts}
              selected={accountId}
              onSelect={(id) => {
                setAccountId(id);
                setEditingStep(null);
              }}
            />
          </StepCard>

          <StepCard
            num={2}
            title={txMode === "savings" ? "저축·투자 계좌" : "입금 계좌"}
            done={!!toAccountId}
            active={activeStep === 2}
            value={accounts.find((a) => a.id === toAccountId)?.name}
            lockedHint={accountId ? undefined : "출금 계좌 선택 후"}
            onEdit={() => setEditingStep(2)}
          >
            <AccountChips
              accounts={accounts
                .filter((a) => a.id !== accountId)
                .filter((a) => txMode === "savings" ? a.role === "savings" : true)}
              selected={toAccountId}
              onSelect={(id) => {
                setToAccountId(id);
                setEditingStep(null);
              }}
              emptyHint={
                txMode === "savings"
                  ? "저축·투자 계좌가 없어요"
                  : undefined
              }
            />
          </StepCard>

          <StepCard
            num={3}
            title="메모"
            done={memo.length > 0}
            active={activeStep === 3}
            value={memo || undefined}
            optional
            lockedHint={toAccountId ? undefined : "입금 계좌 선택 후"}
            onEdit={() => setEditingStep(3)}
          >
            <input
              type="text"
              placeholder="메모"
              maxLength={80}
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              className="w-full mt-2 px-3 py-2 text-[14px] rounded-xl bg-[var(--surface-soft)] outline-none placeholder:text-ink-muted/70"
            />
          </StepCard>
        </>
      )}

      <button
        onClick={handleSave}
        disabled={!canSave || pending}
        className={clsx(
          "w-full py-4 rounded-[20px] text-[16px] font-medium transition-all",
          canSave && !pending
            ? "bg-black text-white active:scale-[0.99]"
            : "bg-[var(--surface-soft)] text-ink-muted cursor-not-allowed"
        )}
      >
        {pending ? "저장 중..." : canSave ? (mode === "edit" ? "수정 저장" : "저장") : "필수 항목을 마저 채워주세요"}
      </button>

      {toast && (
        <div
          className={clsx(
            "fixed left-1/2 -translate-x-1/2 top-6 z-50 px-4 py-2.5 rounded-xl text-[14px] font-medium shadow-lg",
            toast.kind === "ok" ? "bg-teal-600 text-white" : "bg-coral-600 text-white"
          )}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function DateField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const today = todayIso();
  const label = formatDateLabel(value, today);
  return (
    <label className="relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--surface-soft)] text-[14px] text-ink-soft cursor-pointer">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M3 10h18" />
        <path d="M8 2v4M16 2v4" />
      </svg>
      <span>{label}</span>
      <span className="text-[12px] text-coral-800 ml-0.5">변경</span>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 opacity-0 cursor-pointer"
        aria-label="날짜 선택"
      />
    </label>
  );
}

function formatDateLabel(iso: string, today: string): string {
  if (iso === today) {
    const [, m, d] = iso.split("-").map(Number);
    const day = new Date(iso).getDay();
    const DAY_NAMES = ["일", "월", "화", "수", "목", "금", "토"];
    return `오늘 · ${m}월 ${d}일 (${DAY_NAMES[day]})`;
  }
  const [, m, d] = iso.split("-").map(Number);
  const day = new Date(iso).getDay();
  const DAY_NAMES = ["일", "월", "화", "수", "목", "금", "토"];
  return `${m}월 ${d}일 (${DAY_NAMES[day]})`;
}

function StepBar({ total, active }: { total: number; active: number }) {
  return (
    <div className="flex gap-1.5">
      {Array.from({ length: total }).map((_, i) => {
        const idx = i + 1;
        const state = idx < active ? "done" : idx === active ? "on" : "todo";
        return (
          <div
            key={i}
            className={clsx(
              "flex-1 h-1 rounded-full",
              state === "on" && "bg-coral-600",
              state === "done" && "bg-coral-600/55",
              state === "todo" && "bg-[var(--surface-soft)]"
            )}
          />
        );
      })}
    </div>
  );
}

function FixedToggle({
  checked,
  mode,
  onChange,
}: {
  checked: boolean;
  mode: "income" | "expense";
  onChange: () => void;
}) {
  const label = mode === "income" ? "고정 수입" : "고정 지출";
  return (
    <button
      type="button"
      onClick={onChange}
      aria-pressed={checked}
      className={clsx(
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] transition-colors",
        checked
          ? "bg-ink text-white"
          : "bg-[var(--surface-soft)] text-ink-muted"
      )}
    >
      <span className="text-[11px]">{checked ? "✓" : "○"}</span>
      <span>{label}</span>
    </button>
  );
}

function TypeTab({
  label,
  active,
  accent,
  onClick,
}: {
  label: string;
  active: boolean;
  accent: "income" | "expense" | "transfer" | "savings";
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "flex-1 py-2 rounded-full text-[14px] transition-colors",
        !active && "bg-[var(--surface-soft)] text-ink-muted",
        active && accent === "income"   && "bg-teal-50 text-teal-800 font-medium",
        active && accent === "expense"  && "bg-coral-50 text-coral-800 font-medium",
        active && accent === "transfer" && "bg-[var(--surface)] text-ink font-medium border border-ink-line",
        active && accent === "savings"  && "font-medium",
      )}
      style={
        active && accent === "savings"
          ? { background: "#D9F0E0", color: "#1D6E50" }
          : undefined
      }
    >
      {label}
    </button>
  );
}

function StepCard({
  num,
  title,
  done,
  active,
  value,
  lockedHint,
  optional,
  onEdit,
  children,
}: {
  num: number;
  title: string;
  done: boolean;
  active: boolean;
  value?: string;
  lockedHint?: string;
  optional?: boolean;
  onEdit?: () => void;
  children?: React.ReactNode;
}) {
  const locked = !active && !done && !!lockedHint;
  return (
    <section
      className={clsx(
        "rounded-[20px] px-5 py-4 transition-all",
        active && "border border-coral-600 bg-[var(--surface)]",
        !active && done && "bg-[var(--surface-soft)]",
        !active && !done && "surface",
        locked && "opacity-50"
      )}
    >
      <header className="flex items-center gap-2.5">
        <span
          className={clsx(
            "grid place-items-center w-[22px] h-[22px] rounded-full text-[13px] font-medium",
            done && "bg-teal-600 text-white",
            !done && active && "bg-black text-white",
            !done && !active && "bg-[var(--surface-soft)] text-ink-muted"
          )}
        >
          {done ? "✓" : num}
        </span>
        <span className="flex-1 text-[14px] font-medium">
          {title}
          {optional && <span className="ml-1 text-ink-muted font-normal">(선택)</span>}
        </span>
        {done && !active && (
          <button onClick={onEdit} className="text-[13px] text-coral-800 font-medium">
            {value} · 변경
          </button>
        )}
        {!done && lockedHint && <span className="text-[13px] text-ink-muted">{lockedHint}</span>}
        {!done && active && !lockedHint && <span className="text-[13px] text-ink-muted">선택해주세요</span>}
      </header>
      {active && children && <div className="mt-3">{children}</div>}
    </section>
  );
}

function ChipGrid({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap gap-1.5 items-center">{children}</div>;
}

function AccountChips({
  accounts,
  selected,
  onSelect,
  emptyHint,
}: {
  accounts: AccountRow[];
  selected: string | null;
  onSelect: (id: string) => void;
  emptyHint?: string;
}) {
  const FAVORITE_TYPES = ["credit_card", "checking", "debit_card", "cash"];
  const favorites = accounts
    .filter((a) => FAVORITE_TYPES.includes(a.type))
    .slice(0, 6);
  const others = accounts.filter((a) => !favorites.some((f) => f.id === a.id));

  if (accounts.length === 0) {
    return (
      <div className="text-[13px] text-ink-muted py-2">
        {emptyHint ?? "등록된 계좌가 없어요."}{" "}
        <Link href="/settings/accounts" className="text-coral-800 font-medium">
          설정에서 추가
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <ChipGrid>
        {favorites.map((a) => (
          <Chip key={a.id} active={selected === a.id} onClick={() => onSelect(a.id)}>
            {a.name}
          </Chip>
        ))}
      </ChipGrid>
      {others.length > 0 && (
        <details className="text-[13px] text-ink-muted">
          <summary className="cursor-pointer">모든 계좌 보기 ›</summary>
          <div className="mt-2">
            <ChipGrid>
              {others.map((a) => (
                <Chip key={a.id} active={selected === a.id} onClick={() => onSelect(a.id)}>
                  {a.name}
                </Chip>
              ))}
            </ChipGrid>
          </div>
        </details>
      )}
    </div>
  );
}
