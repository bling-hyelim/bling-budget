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
