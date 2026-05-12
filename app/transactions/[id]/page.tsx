import { notFound } from "next/navigation";
import { getAccounts, getCategoryTree, getTransaction } from "@/lib/data";
import { InputForm } from "@/app/add/InputForm";

export default async function EditTransactionPage({
  params,
}: {
  params: { id: string };
}) {
  const [tx, categories, accounts] = await Promise.all([
    getTransaction(params.id),
    getCategoryTree(),
    getAccounts(),
  ]);

  if (!tx) notFound();

  return (
    <InputForm
      categories={categories}
      accounts={accounts}
      mode="edit"
      initial={{
        id: tx.id,
        type: tx.type,
        amount: tx.amount,
        categoryId: tx.category_id,
        subcategoryId: tx.subcategory_id,
        accountId: tx.account_id,
        toAccountId: tx.to_account_id,
        memo: tx.memo ?? "",
        occurredOn: tx.occurred_on,
        isFixed: tx.is_fixed,
      }}
    />
  );
}
