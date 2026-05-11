"use client";

import { createBrowserClient } from "@supabase/ssr";

/** 브라우저 컴포넌트 전용 Supabase 클라이언트 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

/** Supabase 환경변수가 세팅되어 있는지 검사 — 미설정 시 mock fallback 으로 동작 */
export function isSupabaseConfigured(): boolean {
  return (
    typeof process.env.NEXT_PUBLIC_SUPABASE_URL === "string" &&
    process.env.NEXT_PUBLIC_SUPABASE_URL.length > 0 &&
    typeof process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY === "string" &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length > 0
  );
}
