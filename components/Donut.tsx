interface Slice {
  value: number;
  color: string;
}

interface Props {
  slices: Slice[];
  size?: number;
  strokeWidth?: number;
  centerLabel?: string;
  centerValue?: string;
}

/**
 * 단순 도넛 차트 (Recharts 없이 SVG로)
 */
export function Donut({
  slices,
  size = 120,
  strokeWidth = 12,
  centerLabel,
  centerValue,
}: Props) {
  const total = slices.reduce((s, x) => s + x.value, 0);
  const radius = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * radius;

  let cumulative = 0;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="var(--surface-soft)"
          strokeWidth={strokeWidth}
        />
        {slices.map((slice, i) => {
          const portion = total > 0 ? slice.value / total : 0;
          const dash = circumference * portion;
          const gap = circumference - dash;
          const offset = -circumference * cumulative;
          cumulative += portion;
          return (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={radius}
              fill="none"
              stroke={slice.color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={`${dash} ${gap}`}
              strokeDashoffset={offset}
              transform={`rotate(-90 ${cx} ${cy})`}
            />
          );
        })}
      </svg>
      {(centerLabel || centerValue) && (
        <div className="absolute inset-0 grid place-items-center text-center pointer-events-none">
          <div>
            {centerValue && (
              <div className="text-[15px] font-medium leading-none">{centerValue}</div>
            )}
            {centerLabel && (
              <div className="mt-1 text-[12px] text-ink-muted">{centerLabel}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
