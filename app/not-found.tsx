import Link from "next/link";

export default function NotFound() {
  return (
    <div className="px-6 pt-20 text-center space-y-4">
      <div className="text-[46px] font-medium text-ink-muted">404</div>
      <p className="text-[15px] text-ink-soft">페이지를 찾을 수 없어요</p>
      <Link
        href="/"
        className="inline-block mt-4 px-5 py-2.5 rounded-full bg-black text-white text-[15px] font-medium"
      >
        홈으로
      </Link>
    </div>
  );
}
