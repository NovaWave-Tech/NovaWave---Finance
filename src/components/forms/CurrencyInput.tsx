import { Input, type InputProps } from "@chakra-ui/react";
import { formatCurrency } from "../../utils/formatters";
export function CurrencyInput({
  value = 0,
  onValueChange,
  ...props
}: Omit<InputProps, "value" | "onChange" | "type"> & {
  value?: number;
  onValueChange: (value: number) => void;
}) {
  const handle = (raw: string) => {
    const digits = raw.replace(/\D/g, "");
    onValueChange(digits ? Number(digits) / 100 : 0);
  };
  return (
    <Input
      inputMode="numeric"
      value={formatCurrency(value)}
      onChange={(event) => handle(event.target.value)}
      {...props}
    />
  );
}
