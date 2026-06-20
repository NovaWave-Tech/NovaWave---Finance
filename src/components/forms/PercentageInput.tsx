import {
  Input,
  InputGroup,
  InputRightElement,
  type InputProps,
} from "@chakra-ui/react";
export function PercentageInput({
  value = 0,
  onValueChange,
  ...props
}: Omit<InputProps, "value" | "onChange" | "type"> & {
  value?: number;
  onValueChange: (value: number) => void;
}) {
  return (
    <InputGroup>
      <Input
        inputMode="decimal"
        value={Number.isFinite(value) ? String(value).replace(".", ",") : ""}
        onChange={(event) => {
          const parsed = Number(
            event.target.value.replace(/[^\d,]/g, "").replace(",", "."),
          );
          onValueChange(Number.isFinite(parsed) ? parsed : 0);
        }}
        pr="9"
        {...props}
      />
      <InputRightElement color="muted">%</InputRightElement>
    </InputGroup>
  );
}
