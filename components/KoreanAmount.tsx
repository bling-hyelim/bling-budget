import { formatKRW, type FormatOptions } from "@/lib/formatKorean";
import clsx from "clsx";

interface Props extends FormatOptions {
  value: number;
  className?: string;
  /** "원" 부분을 더 작게/옅게 표시 */
  fadeSuffix?: boolean;
  suffixClassName?: string;
}

/**
 * 한국식 통화 표기 컴포넌트
 *
 * 사용 예:
 *   <KoreanAmount value={1352800} />              → "135만 2,800원"
 *   <KoreanAmount value={310523697} fadeSuffix /> → "3억 1,052만<원>"
 */
export function KoreanAmount({
  value,
  precision = "man+thousand",
  sign = false,
  suffix = "원",
  fadeSuffix = false,
  className,
  suffixClassName,
}: Props) {
  if (!fadeSuffix) {
    return (
      <span className={clsx("tabular", className)}>
        {formatKRW(value, { precision, sign, suffix })}
      </span>
    );
  }

  const body = formatKRW(value, { precision, sign, suffix: "" });
  return (
    <span className={clsx("tabular", className)}>
      {body}
      <span
        className={clsx(
          "ml-0.5 font-normal text-[0.65em] text-ink-muted",
          suffixClassName
        )}
      >
        {suffix}
      </span>
    </span>
  );
}
