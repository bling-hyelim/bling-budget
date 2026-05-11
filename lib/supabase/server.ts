import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

/** 서버 컴포넌트 / Route Handler 전용 Supabase 클라이언트 */
export function createClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component 에서 호출된 경우 — middleware 가 처리
          }
        },
      },
    }
  );
}

/** Supabase 환경변수 세팅 여부 (서버 사이드) */
export function isSupabaseConfiguredServer(): boolean {
  return (
    typeof process.env.NEXT_PUBLIC_SUPABASE_URL === "string" &&
    process.env.NEXT_PUBLIC_SUPABASE_URL.length > 0 &&
    typeof process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY === "string" &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length > 0
  );
}
