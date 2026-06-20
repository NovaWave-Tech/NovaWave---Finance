import { Input, type InputProps } from "@chakra-ui/react";
import { formatNumberBR } from "../../utils/formatters";
export function NumberInputBR({
  value = 0,
  onValueChange,
  decimals = 0,
  ...props
}: Omit<InputProps, "value" | "onChange" | "type"> & {
  value?: number;
  decimals?: number;
  onValueChange: (value: number) => void;
}) {
  return (
    <Input
      inputMode={decimals ? "decimal" : "numeric"}
      value={formatNumberBR(value, decimals)}
      onChange={(event) => {
        const parsed = Number(
          event.target.value
            .replace(/\./g, "")
            .replace(",", ".")
            .replace(/[^\d.-]/g, ""),
        );
        onValueChange(Number.isFinite(parsed) ? parsed : 0);
      }}
      {...props}
    />
  );
}
