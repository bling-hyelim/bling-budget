"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

type Mode = "password" | "magic";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const configured = isSupabaseConfigured();

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!configured) {
      setError(".env.local 에 Supabase URL/Key 를 먼저 설정해주세요.");
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });

    if (err) {
      setError(err.message);
      setLoading(false);
    } else {
      router.push("/");
      router.refresh();
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!configured) {
      setError(".env.local 에 Supabase URL/Key 를 먼저 설정해주세요.");
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${location.origin}/auth/callback` },
    });

    if (err) {
      setError(err.message);
    } else {
      setSent(true);
    }
    setLoading(false);
  };

  return (
    <div className="px-6 pt-20 pb-12">
      <div className="text-center mb-10">
        <div className="inline-grid place-items-center w-14 h-14 rounded-2xl bg-coral-50 text-coral-800 text-[22px] font-medium mb-4">
          블
        </div>
        <h1 className="text-[24px] font-medium">블링 가계부</h1>
        <p className="mt-1 text-[14px] text-ink-muted">
          {mode === "password" ? "이메일과 비밀번호로 로그인하세요" : "이메일로 로그인 링크를 받으세요"}
        </p>
      </div>

      {!configured && (
        <div className="rounded-2xl bg-[var(--surface-soft)] px-4 py-3 text-[14px] text-ink-soft mb-6 leading-relaxed">
          <b className="text-ink">Supabase 환경변수가 비어 있어요.</b>
          <br />
          <code className="text-[13px]">.env.local</code> 에{" "}
          <code className="text-[13px]">NEXT_PUBLIC_SUPABASE_URL</code> 과{" "}
          <code className="text-[13px]">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> 를 채워주세요.
        </div>
      )}

      {sent ? (
        <div className="rounded-2xl bg-teal-50 px-4 py-4 text-center">
          <div className="text-[16px] font-medium text-teal-800">메일을 확인해 주세요</div>
          <div className="mt-1 text-[13px] text-teal-800/85">
            {email} 으로 로그인 링크를 보냈어요
          </div>
          <button
            onClick={() => {
              setSent(false);
              setMode("password");
            }}
            className="mt-3 text-[13px] text-teal-800 underline"
          >
            비밀번호로 로그인하기
          </button>
        </div>
      ) : (
        <>
          {/* 모드 토글 */}
          <div className="flex gap-1 rounded-full bg-[var(--surface-soft)] p-1 mb-4">
            <button
              type="button"
              onClick={() => { setMode("password"); setError(null); }}
              className={clsx(
                "flex-1 py-2 text-[13px] text-center rounded-full transition-colors",
                mode === "password"
                  ? "bg-[var(--surface)] text-ink font-medium shadow-[0_1px_2px_rgba(0,0,0,0.06)]"
                  : "text-ink-muted"
              )}
            >
              비밀번호
            </button>
            <button
              type="button"
              onClick={() => { setMode("magic"); setError(null); }}
              className={clsx(
                "flex-1 py-2 text-[13px] text-center rounded-full transition-colors",
                mode === "magic"
                  ? "bg-[var(--surface)] text-ink font-medium shadow-[0_1px_2px_rgba(0,0,0,0.06)]"
                  : "text-ink-muted"
              )}
            >
              매직링크 (이메일)
            </button>
          </div>

          {mode === "password" ? (
            <form onSubmit={handlePasswordLogin} className="space-y-3">
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="이메일 주소"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-[var(--surface-soft)] outline-none text-[16px] placeholder:text-ink-muted/70 focus:ring-2 focus:ring-black"
              />
              <input
                type="password"
                required
                autoComplete="current-password"
                placeholder="비밀번호"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-[var(--surface-soft)] outline-none text-[16px] placeholder:text-ink-muted/70 focus:ring-2 focus:ring-black"
              />
              <button
                type="submit"
                disabled={loading || !email || !password}
                className={clsx(
                  "w-full py-3.5 rounded-2xl text-[16px] font-medium",
                  loading || !email || !password
                    ? "bg-[var(--surface-soft)] text-ink-muted"
                    : "bg-black text-white active:scale-[0.99]"
                )}
              >
                {loading ? "로그인 중…" : "로그인"}
              </button>
              {error && (
                <p className="text-[13px] text-coral-800 text-center pt-1">{error}</p>
              )}
              <p className="text-[12px] text-ink-muted text-center pt-2 leading-relaxed">
                비밀번호는 Supabase 대시보드 → Authentication → Users → 본인 행 → ⋯ → Reset password 에서 설정할 수 있어요
              </p>
            </form>
          ) : (
            <form onSubmit={handleMagicLink} className="space-y-3">
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="이메일 주소"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-[var(--surface-soft)] outline-none text-[16px] placeholder:text-ink-muted/70 focus:ring-2 focus:ring-black"
              />
              <button
                type="submit"
                disabled={loading || !email}
                className={clsx(
                  "w-full py-3.5 rounded-2xl text-[16px] font-medium",
                  loading || !email
                    ? "bg-[var(--surface-soft)] text-ink-muted"
                    : "bg-black text-white active:scale-[0.99]"
                )}
              >
                {loading ? "보내는 중…" : "로그인 링크 보내기"}
              </button>
              {error && (
                <p className="text-[13px] text-coral-800 text-center pt-1">{error}</p>
              )}
              <p className="text-[12px] text-ink-muted text-center pt-2 leading-relaxed">
                Supabase Free 플랜은 시간당 메일 4통 제한이 있어요. 막히면 비밀번호 로그인으로 전환하세요
              </p>
            </form>
          )}
        </>
      )}

      <p className="mt-8 text-center text-[12px] text-ink-muted">
        이메일 외 다른 정보는 받지 않아요.
      </p>
    </div>
  );
}
