import Link from "next/link";
import { KoreanAmount } from "@/components/KoreanAmount";
import { getAssetSummary, type AssetGroupDetail } from "@/lib/data";

const TYPE_LABELS: Record<string, string> = {
  cash: "현금",
  checking: "입출금",
  savings: "저축/투자",
  credit_card: "신용카드",
  debit_card: "체크카드",
  pay_app: "페이",
  loan: "대출",
  asset: "기타 자산",
  other: "기타",
};

export default async function AssetsPage() {
  const asset = await getAssetSummary();
  const today = new Date();
  const dateLabel = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일 기준`;

  return (
    <div className="px-5 pt-4 pb-6 space-y-5">
      <header className="flex items-center gap-3 pt-2">
        <Link
          href="/"
          aria-label="홈으로"
          className="w-10 h-10 grid place-items-center rounded-full bg-[var(--surface-soft)] text-ink-soft text-[18px]"
        >
          ‹
        </Link>
        <div className="flex-1">
          <h1 className="text-[20px] font-medium leading-tight">자산 현황</h1>
          <div className="text-[12px] text-ink-muted mt-0.5">{dateLabel}</div>
        </div>
        <Link
          href="/settings/accounts"
          className="text-[13px] text-coral-800 font-medium px-2"
        >
          관리 ›
        </Link>
      </header>

      {/* 순자산 */}
      <div className="card px-6 py-6" style={{ background: "#000000" }}>
        <div className="text-[14px] text-white/65">순자산</div>
        <div className="mt-1 mb-5 text-[40px] font-medium tracking-tight text-white tabular leading-none">
          <KoreanAmount value={asset.netWorth} precision="exact" fadeSuffix suffixClassName="text-white/40" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          {asset.groups.map((g) => (
            <div key={g.label} className="rounded-2xl bg-white/10 px-3 py-2.5">
              <div className="text-[12px] text-white/60">{g.label}</div>
              <div
                className={`mt-0.5 text-[14px] font-medium tabular ${
                  g.total < 0 ? "text-[#FF8FA6]" : "text-white"
                }`}
              >
                <KoreanAmount value={g.total} precision="man" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {asset.groups.map((g) => (
        <Group key={g.label} group={g} />
      ))}

      <p className="text-[12px] text-ink-muted text-center pt-2 leading-relaxed">
        잔액은 시작 잔액 + 모든 거래 합산으로 계산됩니다
      </p>
    </div>
  );
}

function Group({ group }: { group: AssetGroupDetail }) {
  if (group.accounts.length === 0) {
    return (
      <section>
        <div className="flex items-baseline justify-between px-1 mb-3">
          <h2 className="text-[18px] font-medium">{group.label}</h2>
          <span className="text-[13px] text-ink-muted">없음</span>
        </div>
        <div className="card px-5 py-8 text-center text-[13px] text-ink-muted">
          {group.label === "대출"
            ? "대출 계좌 없음"
            : "등록된 계좌가 없어요"}
          {group.label !== "대출" && (
            <>
              {" — "}
              <Link href="/settings/accounts" className="text-coral-800 font-medium">
                추가
              </Link>
            </>
          )}
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="flex items-baseline justify-between px-1 mb-3">
        <h2 className="text-[18px] font-medium">{group.label}</h2>
        <span className="text-[16px] font-medium tabular">
          <KoreanAmount value={group.total} precision="exact" />
        </span>
      </div>
      <ul className="card divide-y divide-[var(--line)]">
        {group.accounts.map((a) => (
          <li key={a.id}>
            <Link
              href={`/settings/accounts`}
              className="block px-5 py-4 active:bg-[var(--surface-soft)] first:rounded-t-[20px] last:rounded-b-[20px]"
            >
              <div className="flex items-center justify-between">
                <span className="text-[15px]">{a.name}</span>
                <span
                  className={`text-[16px] font-medium tabular ${
                    a.balance < 0 ? "text-coral-800" : "text-ink"
                  }`}
                >
                  <KoreanAmount value={a.balance} precision="exact" />
                </span>
              </div>
              <div className="text-[12px] text-ink-muted mt-1">
                {TYPE_LABELS[a.type] ?? a.type}
                {a.balance !== a.initial_balance && (
                  <>
                    {" · 시작 "}
                    <KoreanAmount value={a.initial_balance} precision="man" />
                  </>
                )}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
