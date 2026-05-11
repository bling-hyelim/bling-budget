import Link from "next/link";
import { getAccounts, getCategoryTree } from "@/lib/data";
import { createClient, isSupabaseConfiguredServer } from "@/lib/supabase/server";
import { SettingsClient } from "./SettingsClient";

export default async function SettingsPage() {
  const [categories, accounts] = await Promise.all([
    getCategoryTree(),
    getAccounts(),
  ]);
  const subCount = categories.reduce((s, c) => s + c.children.length, 0);

  let email: string | null = null;
  if (isSupabaseConfiguredServer()) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    email = user?.email ?? null;
  }

  return (
    <SettingsClient
      email={email}
      categoryCount={categories.length}
      subcategoryCount={subCount}
      accountCount={accounts.length}
    />
  );
}
