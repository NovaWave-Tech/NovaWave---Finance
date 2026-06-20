import { Select, type SelectProps } from "@chakra-ui/react";
export function InstallmentInput({
  value = 1,
  onValueChange,
  max = 48,
  ...props
}: Omit<SelectProps, "value" | "onChange"> & {
  value?: number;
  max?: number;
  onValueChange: (value: number) => void;
}) {
  return (
    <Select
      value={value}
      onChange={(event) => onValueChange(Number(event.target.value))}
      {...props}
    >
      {Array.from({ length: max }, (_, index) => index + 1).map((number) => (
        <option key={number} value={number}>
          {number}x
        </option>
      ))}
    </Select>
  );
}
