/**
 * 계좌 type → 역할(role) 매핑 — server/client 모두 사용 가능
 * (lib/data.ts 는 server-only 이므로 client 컴포넌트에서 import 불가능해서 분리)
 */

export type AccountRole = "checking" | "spending" | "savings" | "debt";

export function getAccountRole(type: string): AccountRole {
  switch (type) {
    case "cash":
    case "checking":
    case "pay_app":
      return "checking";
    case "credit_card":
    case "debit_card":
      return "spending";
    case "savings":
    case "asset":
      return "savings";
    case "loan":
      return "debt";
    default:
      return "checking";
  }
}
