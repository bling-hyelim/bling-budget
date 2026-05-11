"use client";

import { useState, useTransition } from "react";
import clsx from "clsx";
import { upsertCategory, archiveCategory } from "@/app/actions";
import type { CategoryTreeNode } from "@/lib/data";

interface Props {
  categories: CategoryTreeNode[];
}

export function CategoriesEditor({ categories }: Props) {
  const [openIdx, setOpenIdx] = useState<string | null>(null);
  const [addingSubTo, setAddingSubTo] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

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
      <p className="text-[12px] text-ink-muted text-center pt-2">
        대분류 추가/이름 변경은 다음 업데이트에서 지원 예정
      </p>
    </div>
  );
}
