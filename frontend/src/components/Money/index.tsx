import { formatMoney } from "@/lib/format";
import { Mono } from "./styled";

interface MoneyProps {
  cents: number;
}

export function Money({ cents }: MoneyProps) {
  return <Mono>{formatMoney(cents)}</Mono>;
}
