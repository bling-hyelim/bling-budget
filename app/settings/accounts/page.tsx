import Link from "next/link";
import { getAccounts } from "@/lib/data";
import { AccountsEditor } from "./AccountsEditor";

export default async function AccountsSettingsPage() {
  const accounts = await getAccounts();

  return (
    <div className="px-4 pt-4 space-y-3">
      <header className="flex items-center gap-3 pt-1">
        <Link href="/settings" className="text-[17px] text-ink-soft">
          ‹
        </Link>
        <h1 className="text-[18px] font-medium flex-1">결제수단 · 계좌</h1>
      </header>
      <AccountsEditor accounts={accounts} />
    </div>
  );
}
