import Link from "next/link";
import { getCategoryTree } from "@/lib/data";
import { CategoriesEditor } from "./CategoriesEditor";

export default async function CategoriesSettingsPage() {
  const categories = await getCategoryTree();

  return (
    <div className="px-4 pt-4 space-y-3">
      <header className="flex items-center gap-3 pt-1">
        <Link href="/settings" className="text-[17px] text-ink-soft">
          ‹
        </Link>
        <h1 className="text-[18px] font-medium flex-1">카테고리 관리</h1>
      </header>
      <CategoriesEditor categories={categories} />
    </div>
  );
}
