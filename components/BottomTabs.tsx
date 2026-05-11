"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

type Tab = {
  label: string;
  href: string;
  icon: React.ReactNode;
};

const stroke = {
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const TABS: Tab[] = [
  {
    label: "홈",
    href: "/",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" {...stroke}>
        <path d="M3 12l9-8 9 8" />
        <path d="M5 10v10h14V10" />
      </svg>
    ),
  },
  {
    label: "내역",
    href: "/transactions",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" {...stroke}>
        <path d="M4 6h16M4 12h16M4 18h10" />
      </svg>
    ),
  },
  { label: "_plus_", href: "/add", icon: null },
  {
    label: "예산",
    href: "/budget",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" {...stroke}>
        <path d="M3 17l6-6 4 4 8-8" />
        <path d="M14 7h7v7" />
      </svg>
    ),
  },
  {
    label: "설정",
    href: "/settings",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" {...stroke}>
        <circle cx="12" cy="12" r="3" />
        <path d="M19 12a7 7 0 0 0-.2-1.7l2-1.5-2-3.4-2.3 1a7 7 0 0 0-3-1.7L13 2h-4l-.4 2.7a7 7 0 0 0-3 1.7l-2.3-1-2 3.4 2 1.5A7 7 0 0 0 5 12c0 .6.1 1.2.2 1.7l-2 1.5 2 3.4 2.3-1a7 7 0 0 0 3 1.7L11 22h4l.4-2.7a7 7 0 0 0 3-1.7l2.3 1 2-3.4-2-1.5c.1-.5.2-1.1.2-1.7z" />
      </svg>
    ),
  },
];

export function BottomTabs() {
  const pathname = usePathname();

  if (pathname === "/login" || pathname?.startsWith("/auth")) {
    return null;
  }

  return (
    <nav
      aria-label="기본 탐색"
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-phone z-40 pb-[env(safe-area-inset-bottom)]"
    >
      <div className="mx-3 mb-3 rounded-[24px] bg-[var(--surface)] flex items-center justify-around px-3 py-2 no-select shadow-[0_8px_28px_rgba(20,18,16,0.10)] border border-[var(--line)]">
        {TABS.map((t) => {
          if (t.label === "_plus_") {
            return (
              <Link
                key={t.href}
                href={t.href}
                aria-label="내역 추가"
                className="-mt-7 grid place-items-center w-[58px] h-[58px] rounded-full bg-black text-white text-[28px] shadow-[0_8px_24px_rgba(0,0,0,0.38)] active:scale-95 transition-transform"
              >
                ＋
              </Link>
            );
          }
          const active = pathname === t.href || (t.href !== "/" && pathname?.startsWith(t.href));
          return (
            <Link
              key={t.href}
              href={t.href}
              className={clsx(
                "flex flex-col items-center gap-1 px-3 pt-1 pb-1 text-[11px] transition-colors",
                active ? "text-ink font-medium" : "text-ink-muted"
              )}
            >
              {t.icon}
              <span>{t.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
