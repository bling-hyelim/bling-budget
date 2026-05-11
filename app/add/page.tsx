import { getAccounts, getCategoryTree } from "@/lib/data";
import { InputForm } from "./InputForm";

export default async function AddPage() {
  const [categories, accounts] = await Promise.all([
    getCategoryTree(),
    getAccounts(),
  ]);

  return <InputForm categories={categories} accounts={accounts} />;
}
