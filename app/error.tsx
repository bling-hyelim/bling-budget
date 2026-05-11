"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="px-6 pt-20 text-center space-y-4">
      <div className="inline-grid place-items-center w-14 h-14 rounded-2xl bg-coral-50 text-coral-800 text-[22px] font-medium">
        ⚠
      </div>
      <h1 className="text-[20px] font-medium">잠시 문제가 생겼어요</h1>
      <p className="text-[14px] text-ink-muted leading-relaxed">
        화면을 불러오는 중에 오류가 발생했어요.
        <br />
        다시 시도해도 같은 문제가 계속되면 새로고침 해주세요.
      </p>
      {error.message && (
        <details className="text-[12px] text-ink-muted">
          <summary className="cursor-pointer">상세 보기</summary>
          <code className="block mt-2 px-3 py-2 bg-[var(--surface-soft)] rounded-xl text-left whitespace-pre-wrap">
            {error.message}
          </code>
        </details>
      )}
      <button
        onClick={reset}
        className="mt-4 px-5 py-2.5 rounded-full bg-black text-white text-[15px] font-medium"
      >
        다시 시도
      </button>
    </div>
  );
}
