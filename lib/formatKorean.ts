/**
 * 한국식 금액 표기 유틸
 *
 * 표기 규칙
 * - < 10,000           → "3,900원"
 * - 1만 ~ 9,999만      → "62만 8천원" / "184만 7,200원" / "41만원"
 * - 1억 이상           → "3억 1,052만원" / "4억 305만원"
 *
 * 옵션:
 *   precision:
 *     'man'           만 단위까지만 반올림 (예: 62만원)
 *     'man+thousand'  만 + 천 단위 (예: 62만 8천원) [기본]
 *     'exact'         만 단위 + 남는 원 정확히 (예: 184만 7,200원)
 *   sign:
 *     true            +/- 부호 강제 표시
 *     false           - 만 표시 (기본)
 *   suffix:
 *     '원' (기본) | '' (단위 없이)
 */

export type FormatPrecision = "man" | "man+thousand" | "exact";

export interface FormatOptions {
  precision?: FormatPrecision;
  sign?: boolean;
  suffix?: string;
}

const EOK = 100_000_000;
const MAN = 10_000;
const CHEON = 1_000;

export function formatKRW(amount: number, options: FormatOptions = {}): string {
  const { precision = "man+thousand", sign = false, suffix = "원" } = options;
  const isNegative = amount < 0;
  const abs = Math.abs(Math.trunc(amount));
  const signStr = isNegative ? "-" : sign ? "+" : "";

  // < 1만 : 그대로 콤마
  if (abs < MAN) {
    return `${signStr}${abs.toLocaleString("ko-KR")}${suffix}`;
  }

  // 1만 ~ 9,999만
  if (abs < EOK) {
    return `${signStr}${formatManScope(abs, precision)}${suffix}`;
  }

  // 1억 이상
  const eok = Math.floor(abs / EOK);
  const rest = abs - eok * EOK;
  const restMan = Math.floor(rest / MAN);

  if (restMan === 0 && rest === 0) {
    return `${signStr}${eok.toLocaleString("ko-KR")}억${suffix}`;
  }

  if (precision === "man" || rest % MAN === 0) {
    return `${signStr}${eok.toLocaleString("ko-KR")}억 ${restMan.toLocaleString("ko-KR")}만${suffix}`;
  }

  return `${signStr}${eok.toLocaleString("ko-KR")}억 ${formatManScope(rest, precision)}${suffix}`;
}

function formatManScope(value: number, precision: FormatPrecision): string {
  const man = Math.floor(value / MAN);
  const rest = value - man * MAN;

  if (rest === 0 || precision === "man") {
    return `${man.toLocaleString("ko-KR")}만`;
  }

  if (precision === "man+thousand") {
    // 천 단위로 반올림 (대시보드 가독성 우선)
    const cheon = Math.round(rest / CHEON);
    if (cheon === 0) {
      return `${man.toLocaleString("ko-KR")}만`;
    }
    if (cheon === 10) {
      return `${(man + 1).toLocaleString("ko-KR")}만`;
    }
    return `${man.toLocaleString("ko-KR")}만 ${cheon}천`;
  }

  // exact: 만 단위 + 그 아래 원 단위까지 정확히
  return `${man.toLocaleString("ko-KR")}만 ${rest.toLocaleString("ko-KR")}`;
}

/** 입력 화면 등에서 정확한 콤마 숫자 (예: 13,000) */
export function formatExactKRW(amount: number, withSuffix = true): string {
  const abs = Math.abs(Math.trunc(amount));
  return `${amount < 0 ? "-" : ""}${abs.toLocaleString("ko-KR")}${withSuffix ? "원" : ""}`;
}

/** 입력 화면 보조 표기 (예: "1만 3,000원") */
export function toKoreanReading(amount: number): string {
  return formatKRW(amount, { precision: "exact" });
}
