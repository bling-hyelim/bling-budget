"use client";

import { useState, useTransition } from "react";
import clsx from "clsx";
import { upsertCategory, archiveCategory } from "@/app/actions";
import type { CategoryTreeNode } from "@/lib/data";

interface Props {
  categories: CategoryTreeNode[];
}

const PARENT_PALETTE = [
  "#FF8FA6", "#6BCFA0", "#FFC371", "#9F8FE0", "#6BB5F0",
  "#FF9FB8", "#88D67E", "#7CCEDB", "#FFA89E", "#95DACA",
  "#FFB877", "#A9A4C2", "#C7C2B8",
];

export function CategoriesEditor({ categories }: Props) {
  const [openIdx, setOpenIdx] = useState<string | null>(null);
  const [addingSubTo, setAddingSubTo] = useState<string | null>(null);
  const [addingParent, setAddingParent] = useState(false);
  const [newName, setNewName] = useState("");
  // parent form state
  const [pName, setPName] = useState("");
  const [pKind, setPKind] = useState<"income" | "expense">("expense");
  const [pColor, setPColor] = useState(PARENT_PALETTE[0]);
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const handleAddParent = () => {
    if (!pName.trim()) return;
    startTransition(async () => {
      const res = await upsertCategory({
        name: pName.trim(),
        parent_id: null,
        kind: pKind,
        color: pColor,
      });
      if (!res.ok) {
        setErr(res.error);
        return;
      }
      setPName("");
      setPColor(PARENT_PALETTE[0]);
      setPKind("expense");
      setAddingParent(false);
    });
  };

  const handleAddSub = (parent: CategoryTreeNode) => {
    if (!newName.trim()) return;
    startTransition(async () => {
      const res = await upsertCategory({
        name: newName.trim(),
        parent_id: parent.id,
        kind: parent.kind,
        color: parent.color ?? undefined,
      });
      if (!res.ok) {
        setErr(res.error);
        return;
      }
      setNewName("");
      setAddingSubTo(null);
    });
  };

  const handleArchiveSub = (id: string) => {
    if (!confirm("이 소분류를 숨길까요? (거래 데이터는 보존)")) return;
    startTransition(async () => {
      const res = await archiveCategory(id);
      if (!res.ok) setErr(res.error);
    });
  };

  return (
    <div className="space-y-2">
      {err && (
        <div className="rounded-xl bg-coral-50 px-3 py-2 text-[13px] text-coral-800">
          {err}
        </div>
      )}

      {/* 대분류 추가 영역 */}
      {addingParent ? (
        <div className="rounded-2xl border border-coral-600 bg-[var(--surface)] p-4 space-y-3">
          <div className="text-[15px] font-medium">새 대분류</div>
          <div>
            <label className="text-[12px] text-ink-muted">이름</label>
            <input
              autoFocus
              value={pName}
              onChange={(e) => setPName(e.target.value)}
              placeholder="예: 반려동물, 자녀교육"
              className="w-full mt-1 px-3 py-2 rounded-xl bg-[var(--surface-soft)] text-[15px] outline-none"
              onKeyDown={(e) => e.key === "Enter" && handleAddParent()}
            />
          </div>
          <div>
            <label className="text-[12px] text-ink-muted">종류</label>
            <div className="mt-1 flex gap-1.5">
              <button
                type="button"
                onClick={() => setPKind("expense")}
                className={clsx(
                  "flex-1 py-2 rounded-xl text-[14px]",
                  pKind === "expense"
                    ? "bg-coral-50 text-coral-800 font-medium"
                    : "bg-[var(--surface-soft)] text-ink-muted"
                )}
              >
                지출
              </button>
              <button
                type="button"
                onClick={() => setPKind("income")}
                className={clsx(
                  "flex-1 py-2 rounded-xl text-[14px]",
                  pKind === "income"
                    ? "bg-teal-50 text-teal-800 font-medium"
                    : "bg-[var(--surface-soft)] text-ink-muted"
                )}
              >
                수입
              </button>
            </div>
          </div>
          <div>
            <label className="text-[12px] text-ink-muted">색상</label>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {PARENT_PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setPColor(c)}
                  aria-label={c}
                  className={clsx(
                    "w-7 h-7 rounded-full transition-transform",
                    pColor === c && "ring-2 ring-offset-2 ring-ink scale-105"
                  )}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleAddParent}
              disabled={pending || !pName.trim()}
              className={clsx(
                "flex-1 py-2.5 rounded-xl text-[15px] font-medium",
                pName.trim() && !pending
                  ? "bg-black text-white"
                  : "bg-[var(--surface-soft)] text-ink-muted"
              )}
            >
              {pending ? "저장 중..." : "추가"}
            </button>
            <button
              onClick={() => {
                setAddingParent(false);
                setPName("");
              }}
              className="px-4 py-2.5 rounded-xl text-[15px] text-ink-soft"
            >
              취소
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAddingParent(true)}
          className="w-full px-3 py-3 rounded-2xl border border-dashed border-ink-line text-[14px] text-ink-muted"
        >
          ＋ 대분류 추가
        </button>
      )}

      {categories.map((c) => {
        const open = openIdx === c.id;
        return (
          <div key={c.id} className="rounded-2xl bg-[var(--surface-soft)] overflow-hidden">
            <button
              onClick={() => setOpenIdx(open ? null : c.id)}
              className="w-full px-3.5 py-3 flex items-center justify-between"
            >
              <span className="flex items-center gap-2.5">
                <span
                  className="w-2.5 h-2.5 rounded-sm"
                  style={{ background: c.color ?? "#888780" }}
                />
                <span className="text-[15px]">{c.name}</span>
                <span className="text-[12px] text-ink-muted">
                  · {c.children.length}개
                </span>
              </span>
              <span className="text-[14px] text-ink-muted">{open ? "▾" : "▸"}</span>
            </button>
            {open && (
              <div className="px-3.5 pb-3 space-y-1.5">
                {c.children.map((sub) => (
                  <div
                    key={sub.id}
                    className="flex items-center justify-between px-3 py-2 rounded-xl bg-[var(--surface)]"
                  >
                    <span className="text-[14px]">{sub.name}</span>
                    <button
                      onClick={() => handleArchiveSub(sub.id)}
                      className="text-[12px] text-ink-muted"
                    >
                      숨김
                    </button>
                  </div>
                ))}
                {addingSubTo === c.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      autoFocus
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="새 소분류 이름"
                      className="flex-1 px-3 py-2 rounded-xl bg-[var(--surface)] text-[14px] outline-none"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleAddSub(c);
                      }}
                    />
                    <button
                      onClick={() => handleAddSub(c)}
                      disabled={pending || !newName.trim()}
                      className={clsx(
                        "px-3 py-2 rounded-xl text-[13px] font-medium",
                        newName.trim() && !pending
                          ? "bg-black text-white"
                          : "bg-[var(--surface-soft)] text-ink-muted"
                      )}
                    >
                      추가
                    </button>
                    <button
                      onClick={() => {
                        setAddingSubTo(null);
                        setNewName("");
                      }}
                      className="text-[13px] text-ink-muted"
                    >
                      취소
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setAddingSubTo(c.id)}
                    className="w-full px-3 py-2 rounded-xl border border-dashed border-ink-line text-[14px] text-ink-muted"
                  >
                    ＋ 소분류 추가
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
