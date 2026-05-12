"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface TxInput {
  type: "income" | "expense" | "transfer";
  amount: number;
  occurred_on: string; // YYYY-MM-DD
  category_id?: string | null;
  subcategory_id?: string | null;
  account_id: string;
  to_account_id?: string | null;
  memo?: string;
  is_fixed?: boolean;
}

export type ActionResult = { ok: true } | { ok: false; error: string };

function isConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export async function createTransaction(input: TxInput): Promise<ActionResult> {
  if (!isConfigured()) {
    return {
      ok: false,
      error: "Supabase 가 아직 연결되지 않았어요. docs/SETUP.md 참고",
    };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요해요" };

  const { error } = await supabase.from("transactions").insert({
    user_id: user.id,
    occurred_on: input.occurred_on,
    amount: input.amount,
    type: input.type,
    category_id: input.category_id ?? null,
    subcategory_id: input.subcategory_id ?? null,
    account_id: input.account_id,
    to_account_id: input.to_account_id ?? null,
    memo: input.memo ?? null,
    is_fixed: input.is_fixed ?? false,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/");
  revalidatePath("/transactions");
  revalidatePath("/budget");
  return { ok: true };
}

export async function updateTransaction(
  id: string,
  input: TxInput
): Promise<ActionResult> {
  if (!isConfigured()) return { ok: false, error: "DB 미연결" };
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요해요" };

  const { error } = await supabase
    .from("transactions")
    .update({
      occurred_on: input.occurred_on,
      amount: input.amount,
      type: input.type,
      category_id: input.category_id ?? null,
      subcategory_id: input.subcategory_id ?? null,
      account_id: input.account_id,
      to_account_id: input.to_account_id ?? null,
      memo: input.memo ?? null,
      is_fixed: input.is_fixed ?? false,
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/");
  revalidatePath("/transactions");
  revalidatePath("/budget");
  return { ok: true };
}

export async function deleteTransaction(id: string): Promise<ActionResult> {
  if (!isConfigured()) return { ok: false, error: "DB 미연결" };
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요해요" };

  const { error } = await supabase
    .from("transactions")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/");
  revalidatePath("/transactions");
  revalidatePath("/budget");
  return { ok: true };
}

/* ------------- 카테고리 / 계좌 / 예산 관리 ------------- */

export async function upsertCategory(input: {
  id?: string;
  name: string;
  parent_id?: string | null;
  kind: string;
  color?: string;
}): Promise<ActionResult> {
  if (!isConfigured()) return { ok: false, error: "DB 미연결" };
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요해요" };

  if (input.id) {
    const { error } = await supabase
      .from("categories")
      .update({
        name: input.name,
        parent_id: input.parent_id ?? null,
        color: input.color ?? null,
      })
      .eq("id", input.id)
      .eq("user_id", user.id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await supabase.from("categories").insert({
      user_id: user.id,
      name: input.name,
      parent_id: input.parent_id ?? null,
      kind: input.kind,
      color: input.color ?? null,
    });
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath("/settings/categories");
  revalidatePath("/add");
  return { ok: true };
}

export async function archiveCategory(id: string): Promise<ActionResult> {
  if (!isConfigured()) return { ok: false, error: "DB 미연결" };
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요해요" };

  const { error } = await supabase
    .from("categories")
    .update({ is_archived: true })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/settings/categories");
  return { ok: true };
}

export async function upsertAccount(input: {
  id?: string;
  name: string;
  type: string;
  initial_balance?: number;
}): Promise<ActionResult> {
  if (!isConfigured()) return { ok: false, error: "DB 미연결" };
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요해요" };

  if (input.id) {
    const { error } = await supabase
      .from("accounts")
      .update({
        name: input.name,
        type: input.type,
        initial_balance: input.initial_balance ?? 0,
      })
      .eq("id", input.id)
      .eq("user_id", user.id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await supabase.from("accounts").insert({
      user_id: user.id,
      name: input.name,
      type: input.type,
      initial_balance: input.initial_balance ?? 0,
    });
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath("/settings/accounts");
  revalidatePath("/add");
  revalidatePath("/");
  return { ok: true };
}

export async function archiveAccount(id: string): Promise<ActionResult> {
  if (!isConfigured()) return { ok: false, error: "DB 미연결" };
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요해요" };

  const { error } = await supabase
    .from("accounts")
    .update({ is_archived: true })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/settings/accounts");
  return { ok: true };
}

export async function upsertBudget(input: {
  category_id: string;
  year: number;
  month: number;
  amount: number;
}): Promise<ActionResult> {
  if (!isConfigured()) return { ok: false, error: "DB 미연결" };
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요해요" };

  const { error } = await supabase
    .from("budgets")
    .upsert(
      {
        user_id: user.id,
        category_id: input.category_id,
        year: input.year,
        month: input.month,
        amount: input.amount,
      },
      { onConflict: "user_id,category_id,year,month" }
    );
  if (error) return { ok: false, error: error.message };

  revalidatePath("/budget");
  revalidatePath("/settings/budget");
  return { ok: true };
}

export async function signOut(): Promise<void> {
  if (!isConfigured()) return;
  const supabase = createClient();
  await supabase.auth.signOut();
}

/* ------------- 고정비 (recurring) ------------- */

export interface RecurringInput {
  id?: string;
  name: string;
  type: "income" | "expense";
  amount: number;
  day_of_month: number; // 1~31
  category_id?: string | null;
  subcategory_id?: string | null;
  account_id?: string | null;
}

export async function upsertRecurring(input: RecurringInput): Promise<ActionResult> {
  if (!isConfigured()) return { ok: false, error: "DB 미연결" };
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요해요" };

  // 다음 발생일 계산 — 이번달 day_of_month 가 미래면 이번달, 아니면 다음달
  const next = computeNextDue(input.day_of_month, new Date());

  if (input.id) {
    const { error } = await supabase
      .from("recurring")
      .update({
        name: input.name,
        type: input.type,
        amount: input.amount,
        day_of_month: input.day_of_month,
        cycle: "monthly",
        category_id: input.category_id ?? null,
        subcategory_id: input.subcategory_id ?? null,
        account_id: input.account_id ?? null,
        next_due: next,
        is_active: true,
      })
      .eq("id", input.id)
      .eq("user_id", user.id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await supabase.from("recurring").insert({
      user_id: user.id,
      name: input.name,
      type: input.type,
      amount: input.amount,
      day_of_month: input.day_of_month,
      cycle: "monthly",
      category_id: input.category_id ?? null,
      subcategory_id: input.subcategory_id ?? null,
      account_id: input.account_id ?? null,
      next_due: next,
    });
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath("/settings/fixed");
  revalidatePath("/");
  return { ok: true };
}

export async function archiveRecurring(id: string): Promise<ActionResult> {
  if (!isConfigured()) return { ok: false, error: "DB 미연결" };
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요해요" };

  const { error } = await supabase
    .from("recurring")
    .update({ is_active: false })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/settings/fixed");
  return { ok: true };
}

/**
 * 오늘 기준 만기가 된 고정비를 거래내역으로 자동 생성.
 * 홈 페이지 진입 시 서버에서 silently 호출. 멀티 호출에도 idempotent
 * (next_due 가 미래로 bump 되므로 같은 날 재호출 시 skip).
 */
export async function runDueRecurring(): Promise<{ inserted: number }> {
  if (!isConfigured()) return { inserted: 0 };
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { inserted: 0 };

  const today = new Date();
  const todayIso = isoOf(today);

  const { data: due } = await supabase
    .from("recurring")
    .select("id, name, type, amount, day_of_month, category_id, subcategory_id, account_id, next_due")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .lte("next_due", todayIso);

  if (!due || due.length === 0) return { inserted: 0 };

  let inserted = 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const r of due as any[]) {
    if (!r.account_id) continue; // 결제수단 없으면 skip
    // next_due 가 today 이거나 과거면 한 번씩 캐치업 (최대 12회로 폭주 방지)
    let cursor = r.next_due as string;
    let safety = 0;
    while (cursor && cursor <= todayIso && safety < 12) {
      const { error: insErr } = await supabase.from("transactions").insert({
        user_id: user.id,
        occurred_on: cursor,
        amount: Number(r.amount),
        type: r.type,
        category_id: r.category_id,
        subcategory_id: r.subcategory_id,
        account_id: r.account_id,
        memo: r.name,
        is_fixed: true,
      });
      if (!insErr) inserted++;
      // 다음달 같은 일자로 이동
      cursor = bumpMonthly(cursor, r.day_of_month);
      safety++;
    }
    await supabase
      .from("recurring")
      .update({ next_due: cursor })
      .eq("id", r.id)
      .eq("user_id", user.id);
  }

  if (inserted > 0) {
    revalidatePath("/");
    revalidatePath("/transactions");
  }
  return { inserted };
}

function isoOf(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function computeNextDue(dayOfMonth: number, today: Date): string {
  const y = today.getFullYear();
  const m = today.getMonth(); // 0-indexed
  const todayDay = today.getDate();
  // 이번달 day_of_month 가 아직 안 지났으면 이번달, 지났으면 다음달
  if (dayOfMonth >= todayDay) {
    const d = new Date(y, m, dayOfMonth);
    return isoOf(d);
  }
  const d = new Date(y, m + 1, dayOfMonth);
  return isoOf(d);
}

function bumpMonthly(currentIso: string, dayOfMonth: number): string {
  const [y, m] = currentIso.split("-").map(Number);
  // 다음 달의 같은 일자
  const d = new Date(y, m, dayOfMonth); // m 은 1-indexed → next month
  return isoOf(d);
}
