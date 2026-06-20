import { useColorMode } from "@chakra-ui/react";
export const useTheme = () => {
  const { colorMode, toggleColorMode } = useColorMode();
  return { colorMode, isDark: colorMode === "dark", toggleColorMode };
};
