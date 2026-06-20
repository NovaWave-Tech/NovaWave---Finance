import { Input, type InputProps } from "@chakra-ui/react";
export function DateInputBR(props: Omit<InputProps, "type">) {
  return <Input type="date" lang="pt-BR" {...props} />;
}
