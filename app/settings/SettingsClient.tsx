"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { signOut } from "@/app/actions";

interface Props {
  email: string | null;
  categoryCount: number;
  subcategoryCount: number;
  accountCount: number;
}

export function SettingsClient({
  email,
  categoryCount,
  subcategoryCount,
  accountCount,
}: Props) {
  const [budgetAlertOn, setBudgetAlertOn] = useState(true);
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const handleSignOut = () => {
    if (!confirm("로그아웃 할까요?")) return;
    startTransition(async () => {
      await signOut();
      router.push("/login");
    });
  };

  return (
    <div className="px-5 pt-4 pb-6 space-y-5">
      <header className="pt-2">
        <h1 className="text-[24px] font-medium">설정</h1>
      </header>

      <div className="card px-5 py-5 flex items-center gap-4" style={{ background: "#000000" }}>
        <div className="grid place-items-center w-14 h-14 rounded-full bg-white/15 text-white text-[20px] font-medium">
          {email ? email.charAt(0).toUpperCase() : "B"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[17px] font-medium text-white">
            {email ? email.split("@")[0] : "게스트"}
          </div>
          <div className="text-[13px] text-white/55 truncate mt-0.5">
            {email ?? "로그인 안 됨 (mock 모드)"}
          </div>
        </div>
      </div>

      <Group title="가계부 설정">
        <Row
          href="/settings/categories"
          icon={<IconList />}
          label="카테고리 관리"
          value={`${categoryCount}개 · ${subcategoryCount}소분류`}
        />
        <Row
          href="/settings/accounts"
          icon={<IconCard />}
          label="결제수단 · 계좌"
          value={`${accountCount}개`}
        />
        <Row
          href="/settings/fixed"
          icon={<IconRepeat />}
          label="고정 수입·지출"
          value="매월 자동 기록"
        />
        <Row
          href="/settings/budget"
          icon={<IconTrend />}
          label="월별 예산 설정"
        />
      </Group>

      <Group title="앱 설정">
        <ToggleRow
          icon={<IconBell />}
          label="예산 초과 알림"
          on={budgetAlertOn}
          onChange={() => setBudgetAlertOn((v) => !v)}
        />
        <Row icon={<IconCalendar />} label="월 시작일" value="1일" disabled />
        <Row icon={<IconSun />} label="화면 테마" value="시스템" disabled />
      </Group>

      <Group title="데이터">
        <Row icon={<IconDown />} label="CSV 내보내기" disabled />
        <button
          onClick={handleSignOut}
          disabled={pending || !email}
          className={clsx(
            "w-full px-5 py-4 flex items-center justify-between",
            !email && "opacity-50 cursor-not-allowed"
          )}
        >
          <span className="flex items-center gap-3">
            <span className="grid place-items-center w-9 h-9 rounded-[12px] bg-[var(--surface-soft)] text-coral-800">
              <IconOut />
            </span>
            <span className="text-[15px]">로그아웃</span>
          </span>
          <span className="text-[13px] text-ink-muted">{pending ? "..." : "›"}</span>
        </button>
      </Group>

      <div className="text-center text-[12px] text-ink-muted pt-2">
        블링 가계부 · v0.1.0
      </div>
    </div>
  );
}

function Group({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-[12px] text-ink-muted px-2 pb-2 tracking-wide uppercase">{title}</h2>
      <div className="card overflow-hidden divide-y divide-[var(--line)]">
        {children}
      </div>
    </section>
  );
}

function Row({
  icon,
  label,
  value,
  href,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  href?: string;
  disabled?: boolean;
}) {
  const content = (
    <div
      className={clsx(
        "px-5 py-4 flex items-center justify-between",
        disabled && "opacity-60 cursor-not-allowed"
      )}
    >
      <span className="flex items-center gap-3">
        <span className="grid place-items-center w-9 h-9 rounded-[12px] bg-[var(--surface-soft)] text-coral-800">
          {icon}
        </span>
        <span className="text-[15px]">{label}</span>
      </span>
      <span className="text-[13px] text-ink-muted flex items-center gap-1.5">
        {value && <span>{value}</span>}
        <span>›</span>
      </span>
    </div>
  );
  if (href && !disabled) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}

function ToggleRow({
  icon,
  label,
  on,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  on: boolean;
  onChange: () => void;
}) {
  return (
    <div className="px-5 py-4 flex items-center justify-between">
      <span className="flex items-center gap-3">
        <span className="grid place-items-center w-9 h-9 rounded-[12px] bg-[var(--surface-soft)] text-coral-800">
          {icon}
        </span>
        <span className="text-[15px]">{label}</span>
      </span>
      <button
        onClick={onChange}
        aria-pressed={on}
        className={clsx(
          "relative w-11 h-6 rounded-full transition-colors",
          on ? "bg-coral-600" : "bg-[var(--surface-soft)] border border-[var(--line)]"
        )}
      >
        <span
          className={clsx(
            "absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all shadow-[0_2px_4px_rgba(0,0,0,0.15)]",
            on ? "left-[22px]" : "left-0.5"
          )}
        />
      </button>
    </div>
  );
}

const ic = "w-[18px] h-[18px]";
const stroke = {
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function IconList() {
  return (
    <svg className={ic} viewBox="0 0 24 24" {...stroke}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 10h18" />
    </svg>
  );
}
function IconCard() {
  return (
    <svg className={ic} viewBox="0 0 24 24" {...stroke}>
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <path d="M2 10h20" />
    </svg>
  );
}
function IconTrend() {
  return (
    <svg className={ic} viewBox="0 0 24 24" {...stroke}>
      <path d="M3 17l6-6 4 4 8-8" />
      <path d="M14 7h7v7" />
    </svg>
  );
}
function IconBell() {
  return (
    <svg className={ic} viewBox="0 0 24 24" {...stroke}>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8" />
      <path d="M10 21a2 2 0 0 0 4 0" />
    </svg>
  );
}
function IconCalendar() {
  return (
    <svg className={ic} viewBox="0 0 24 24" {...stroke}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M3 10h18" />
      <path d="M8 2v4M16 2v4" />
    </svg>
  );
}
function IconSun() {
  return (
    <svg className={ic} viewBox="0 0 24 24" {...stroke}>
      <circle cx="12" cy="12" r="5" />
      <path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
    </svg>
  );
}
function IconDown() {
  return (
    <svg className={ic} viewBox="0 0 24 24" {...stroke}>
      <path d="M12 3v12M7 10l5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  );
}
function IconOut() {
  return (
    <svg className={ic} viewBox="0 0 24 24" {...stroke}>
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    </svg>
  );
}
function IconRepeat() {
  return (
    <svg className={ic} viewBox="0 0 24 24" {...stroke}>
      <path d="M17 1l4 4-4 4" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <path d="M7 23l-4-4 4-4" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
  );
}
