import Link from "next/link";
import { KoreanAmount } from "@/components/KoreanAmount";
import { getAssetSummary } from "@/lib/data";

export async function AssetHero() {
  const asset = await getAssetSummary();

  return (
    <Link
      href="/assets"
      className="block card px-6 py-6 active:scale-[0.99] transition-transform"
      style={{ background: "#000000" }}
    >
      <div className="text-[15px] text-white/65">순자산</div>
      <div className="mt-1 mb-5 text-[40px] font-medium tracking-tight text-white tabular leading-none">
        <KoreanAmount value={asset.netWorth} precision="man" fadeSuffix suffixClassName="text-white/40" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        {asset.groups.map((g) => (
          <div key={g.label} className="rounded-2xl bg-white/10 px-3 py-2.5">
            <div className="text-[12px] text-white/60">{g.label}</div>
            <div
              className={`mt-0.5 text-[15px] font-medium tabular ${
                g.total < 0 ? "text-[#FF8FA6]" : "text-white"
              }`}
            >
              <KoreanAmount value={g.total} precision="man" />
            </div>
          </div>
        ))}
      </div>
    </Link>
  );
}

export function AssetHeroSkeleton() {
  return (
    <div className="card px-6 py-6 animate-pulse" style={{ background: "#000000" }}>
      <div className="text-[15px] text-white/40">순자산</div>
      <div className="mt-2 mb-5 h-9 w-48 bg-white/10 rounded" />
      <div className="grid grid-cols-2 gap-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl bg-white/10 px-3 py-2.5 h-14" />
        ))}
      </div>
    </div>
  );
}
