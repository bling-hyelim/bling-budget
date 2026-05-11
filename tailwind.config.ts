import type { Config } from "tailwindcss";

/**
 * 컬러 시스템
 * - 포인트(브랜드) : 검정 #000000 / 그레이 #666666
 * - 지출 : 핑크 #FF5F85 / 배경 #FFEAEF
 * - 수입 : 파랑 #2281E7 / 배경 #DCEBFE
 * - 이동 : 그린 #37A322 / 배경 #E2F5DD
 *
 * 기존 `coral` 클래스명은 그대로 두고 값만 핑크로 교체 (호환 유지)
 * 기존 `teal` 클래스명은 그대로 두고 값만 파랑으로 교체
 */
const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // 지출 핑크
        coral: {
          50: "#FFEAEF",
          100: "#FFD0DA",
          200: "#FF8FA6",
          400: "#FF7596",
          600: "#FF5F85",
          700: "#E0456A",
          800: "#B82654",
          900: "#7D1838",
          950: "#481021",
        },
        // 수입 파랑
        teal: {
          50: "#DCEBFE",
          200: "#A5C8F8",
          400: "#5BA1F0",
          600: "#2281E7",
          800: "#1264C0",
          900: "#0B3F7A",
        },
        // 이동 그린
        green: {
          50: "#E2F5DD",
          100: "#C0E8B5",
          200: "#9BD98A",
          400: "#5BBE46",
          600: "#37A322",
          800: "#1F6E14",
          900: "#10470A",
        },
        // 포인트(브랜드)
        ink: {
          DEFAULT: "#000000",
          soft: "#666666",
          muted: "#9A9A9A",
          line: "rgba(0, 0, 0, 0.08)",
        },
        cat: {
          food: "#FF5F85",
          home: "#37A322",
          transport: "#534AB7",
          leisure: "#2281E7",
          other: "#BA7517",
        },
      },
      fontFamily: {
        sans: [
          "Pretendard",
          "-apple-system",
          "BlinkMacSystemFont",
          "system-ui",
          "Roboto",
          "Helvetica Neue",
          "Segoe UI",
          "Apple SD Gothic Neo",
          "Noto Sans KR",
          "sans-serif",
        ],
      },
      borderRadius: {
        phone: "28px",
      },
      maxWidth: {
        phone: "440px",
      },
    },
  },
  plugins: [],
};

export default config;
